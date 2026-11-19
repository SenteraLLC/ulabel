/**
 * Merge options: masks a host attaches to an annotation (under
 * `config.merge_options_meta_key`) for joining into bitmasks in another
 * subtask. Each option names its target bitmasks by
 * `config.annotation_link_meta_key` value; the first target survives as the
 * union of the mask and every target, and the other targets are deleted. An
 * option with no targets adds the mask as a new object, as Copy to would.
 */
import type {
    BrushOverlapMode,
    ULabelContainingBox,
    ULabelMergeOption,
    ULabelMergeOptionInfo,
    ULabelMergeRequest,
} from "../index";
import { ULabel } from "../src/index";
import { ULabelAnnotation } from "./annotation";
import { record_action } from "./actions";
import { get_annotation_class_id } from "./annotation_operators";
import { get_annotation_meta } from "./clipboard";
import {
    apply_counterpart_removal,
    CounterpartRemovalPayload,
    CounterpartRemovalState,
    get_link_values,
} from "./counterparts";
import { log_message, LogLevel } from "./error_logging";
import { BoundingBox, ULabelMask, ULabelMaskPayload } from "./mask_utils";

const OVERLAP_MODES: BrushOverlapMode[] = ["none", "exclude", "overwrite"];

// An option resolved against the current annotations
type MergePlan = {
    option: ULabelMergeOption;
    target_ids: string[];
    conflict_ids: string[];
    mask: ULabelMask;
    // Class for the new object when there are no targets
    class_id: number | null;
};

function is_merge_option(value: unknown): value is ULabelMergeOption {
    if (value === null || typeof value !== "object") return false;
    const option = value as Record<string, unknown>;
    const is_name = (v: unknown) => typeof v === "string" && v !== "";
    return is_name(option.id) && is_name(option.label) && is_name(option.subtask_key) &&
        Array.isArray(option.targets) && option.targets.every(is_name) &&
        option.mask !== null && typeof option.mask === "object";
}

/**
 * Plans with the same target subtask, source frame, resolved targets, new-object
 * class and mask do the same thing.
 */
function same_merge_key(source: ULabelAnnotation, plan: MergePlan): string {
    const { subtask_key, mask } = plan.option;
    return `${subtask_key}\u0000${JSON.stringify([source.frame ?? null, plan.target_ids, plan.class_id, mask.size, mask.counts])}`;
}

/** The new object a target-less option adds: the source with the mask as its bitmask. */
function new_object_template(source: ULabelAnnotation, spatial_payload: ULabelMaskPayload | null): ULabelAnnotation {
    const template = { ...source, spatial_type: "bitmask", spatial_payload } as ULabelAnnotation;
    delete template.containing_box;
    return template;
}

/** Class the new object of a target-less option gets, as Copy to would pick it (no class pie). */
function new_object_class_id(ulabel: ULabel, source_key: string, source: ULabelAnnotation, target_key: string): number | null {
    const template = new_object_template(source, null);
    if (!ulabel.can_paste_into_subtask(template, target_key)) return null;
    const source_class_name = ulabel.get_class_name(Number(get_annotation_class_id(source)), source_key);
    return ulabel.resolve_paste_class_id(template, target_key, source_class_name, true);
}

// Well-formed options under `config.merge_options_meta_key`, first of each id
function read_merge_options(ulabel: ULabel, annotation: ULabelAnnotation): ULabelMergeOption[] {
    const key = ulabel.config.merge_options_meta_key;
    if (key == null) return [];
    const value = get_annotation_meta(annotation)?.[key];
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((option): option is ULabelMergeOption => {
        if (!is_merge_option(option) || seen.has(option.id)) return false;
        seen.add(option.id);
        return true;
    });
}

function merged_key(subtask_key: string, annotation_id: string): string {
    return `${subtask_key}\u0000${annotation_id}`;
}

/** Whether two annotations' frames can be the same image (an unset frame matches any). */
function same_frame(a: number | null | undefined, b: number | null | undefined): boolean {
    return a == null || b == null || a === b;
}

/**
 * Live bitmasks in `subtask_key` on `frame` whose id is, or whose link values
 * hold, each target value, in value order. An annotation merged away earlier
 * in the same call is replaced by its survivor. Null when a value has no live
 * annotation there or names a non-bitmask.
 */
function resolve_targets(
    ulabel: ULabel,
    subtask_key: string,
    values: string[],
    frame: number | null | undefined,
    merged_into: Map<string, string>,
): string[] | null {
    const subtask = ulabel.subtasks[subtask_key];
    const access = subtask.annotations.access;
    const ids: string[] = [];
    for (const value of values) {
        let found = false;
        for (const id of subtask.annotations.ordering) {
            if (id !== value && !get_link_values(ulabel, access[id]).includes(value)) continue;
            if (!same_frame(frame, access[id].frame)) continue;
            let live_id = id;
            const seen = new Set<string>();
            while (access[live_id].deprecated && merged_into.has(merged_key(subtask_key, live_id)) && !seen.has(live_id)) {
                seen.add(live_id);
                live_id = merged_into.get(merged_key(subtask_key, live_id))!;
            }
            const live = access[live_id];
            if (live === undefined || live.deprecated) continue;
            if (live.spatial_type !== "bitmask") return null;
            found = true;
            if (!ids.includes(live_id)) ids.push(live_id);
        }
        if (!found) return null;
    }
    return ids;
}

function decode_mask(ulabel: ULabel, payload: ULabelMaskPayload): ULabelMask | null {
    try {
        const mask = ULabelMask.from_rle(payload);
        if (mask.width !== ulabel.config.image_width || mask.height !== ulabel.config.image_height) return null;
        return mask;
    } catch {
        return null;
    }
}

function boxes_overlap(a: BoundingBox, b: ULabelContainingBox | undefined): boolean {
    if (b == null) return true;
    return a.tlx <= b.brx && b.tlx <= a.brx && a.tly <= b.bry && b.tly <= a.bry;
}

/**
 * Resolve an option: its target subtask must be another writable subtask, every
 * target value must name a live bitmask there on the source's frame (no targets:
 * the target subtask must take the source as a bitmask copy), and the
 * mask must fit the image. Conflicts are the other live bitmasks there (on the
 * survivor's frame) that the mask overlaps.
 */
function plan_merge(
    ulabel: ULabel,
    source_key: string,
    source: ULabelAnnotation,
    option: ULabelMergeOption,
    merged_into: Map<string, string>,
): MergePlan | null {
    const subtask_key = option.subtask_key;
    const subtask = ulabel.subtasks[subtask_key];
    if (subtask == null || subtask_key === source_key || ulabel.is_subtask_edit_locked(subtask_key)) return null;
    const target_ids = resolve_targets(ulabel, subtask_key, option.targets, source.frame, merged_into);
    if (target_ids === null) return null;
    let class_id: number | null = null;
    if (target_ids.length === 0) {
        class_id = new_object_class_id(ulabel, source_key, source, subtask_key);
        if (class_id === null) return null;
    }
    const mask = decode_mask(ulabel, option.mask);
    if (mask === null) return null;
    const access = subtask.annotations.access;
    const frame = target_ids.length > 0 ? access[target_ids[0]].frame ?? source.frame : source.frame;
    const mask_box = mask.get_bounding_box();
    const conflict_ids: string[] = [];
    if (mask_box !== null) {
        for (const id of subtask.annotations.ordering) {
            const other = access[id];
            if (target_ids.includes(id) || other.deprecated || other.spatial_type !== "bitmask") continue;
            if (!same_frame(frame, other.frame)) continue;
            if (!boxes_overlap(mask_box, other.containing_box)) continue;
            if (ulabel.get_bitmask(other).intersects(mask)) conflict_ids.push(id);
        }
    }
    return { option, target_ids, conflict_ids, mask, class_id };
}

/**
 * The merge options an annotation offers that can apply now (see
 * `config.merge_options_meta_key`): each with its resolved targets (the first
 * survives; none adds a new object) and the other bitmasks its mask overlaps there.
 * An option doing the same as an earlier one (same target subtask, resolved
 * targets and mask) names it in `duplicate_of`.
 *
 * @param ulabel ULabel instance
 * @param annotation_id annotation carrying the options
 * @param source_key subtask the annotation lives in; defaults to the current subtask
 */
export function get_merge_options(ulabel: ULabel, annotation_id: string, source_key: string | null = null): ULabelMergeOptionInfo[] {
    source_key ??= ulabel.get_current_subtask_key();
    const source = ulabel.subtasks[source_key]?.annotations.access[annotation_id];
    if (source == null || source.deprecated) return [];
    const infos: ULabelMergeOptionInfo[] = [];
    const first_of = new Map<string, string>();
    for (const option of read_merge_options(ulabel, source)) {
        const plan = plan_merge(ulabel, source_key, source, option, new Map());
        if (plan === null) continue;
        const key = same_merge_key(source, plan);
        if (!first_of.has(key)) first_of.set(key, option.id);
        const first_id = first_of.get(key)!;
        infos.push({
            id: option.id,
            label: option.label,
            subtask_key: option.subtask_key,
            target_ids: plan.target_ids,
            conflict_ids: plan.conflict_ids,
            duplicate_of: first_id === option.id ? null : first_id,
        });
    }
    return infos;
}

/**
 * Apply merge options, each as one `apply_merge_option` action on its target
 * subtask's stream, all as one undo step per target subtask. Each merge adds the option's mask
 * and every other target into the first target and deletes the other targets.
 * An option with no targets adds the mask as a new object instead, as a
 * `paste_annotation` (class and `copied_from` link as Copy to gives them),
 * with any overwrite recorded as an `apply_merge_option` before it.
 * `overlap` resolves conflicts with other bitmasks there: "none" leaves them
 * overlapping, "exclude" drops the overlapping pixels from the mask, and
 * "overwrite" carves them out of the other bitmasks (an emptied one is
 * deleted). Repeated options (same option id, or the same resolved
 * target subtask, frame, targets, new-object class and mask) apply once, and a later
 * merge whose target was merged away goes to that merge's survivor.
 * `config.paste_switch_to_target` then switches to the last changed subtask.
 *
 * @param ulabel ULabel instance
 * @param merges annotations and the option id to apply from each
 * @param overlap how to resolve conflicts
 * @param source_key subtask the annotations live in; defaults to the current subtask
 * @param switch_to_target whether `config.paste_switch_to_target` applies
 * @returns ids of the changed annotations
 */
export function apply_merge_options(
    ulabel: ULabel,
    merges: ULabelMergeRequest[],
    overlap: BrushOverlapMode = "none",
    source_key: string | null = null,
    switch_to_target: boolean = true,
): string[] {
    if (!OVERLAP_MODES.includes(overlap)) {
        log_message(`Unknown overlap mode ${overlap}`, LogLevel.WARNING, true);
        return [];
    }
    const from_key = source_key ?? ulabel.get_current_subtask_key();
    const access = ulabel.subtasks[from_key]?.annotations.access;
    if (access == null) {
        log_message(`Subtask ${from_key} not found`, LogLevel.WARNING, true);
        return [];
    }
    const merged_into = new Map<string, string>();
    const applied = new Set<string>();
    const applied_same = new Set<string>();
    const changed = new Set<string>();
    let last_target: string | null = null;
    ulabel.run_action_batch(() => {
        for (const { annotation_id, option_id } of merges) {
            const source = access[annotation_id];
            const option = source == null || source.deprecated ?
                undefined :
                read_merge_options(ulabel, source).find((o) => o.id === option_id);
            if (option === undefined) {
                log_message(`Annotation ${annotation_id} has no merge option ${option_id}`, LogLevel.WARNING, true);
                continue;
            }
            const applied_key = merged_key(option.subtask_key, option.id);
            if (applied.has(applied_key)) continue;
            applied.add(applied_key);
            const plan = plan_merge(ulabel, from_key, source, option, merged_into);
            if (plan === null) {
                log_message(`Merge option ${option_id} cannot apply`, LogLevel.WARNING, true);
                continue;
            }
            const same_key = same_merge_key(source, plan);
            if (applied_same.has(same_key)) continue;
            applied_same.add(same_key);
            const ids = apply_merge_plan(ulabel, from_key, source, plan, overlap, merged_into);
            if (ids.length === 0) continue;
            ids.forEach((id) => changed.add(id));
            last_target = option.subtask_key;
        }
    });
    if (switch_to_target && last_target !== null && ulabel.config.paste_switch_to_target &&
        last_target !== ulabel.get_current_subtask_key()) {
        ulabel.set_subtask(last_target);
    }
    return Array.from(changed);
}

function apply_merge_plan(
    ulabel: ULabel,
    source_key: string,
    source: ULabelAnnotation,
    plan: MergePlan,
    overlap: BrushOverlapMode,
    merged_into: Map<string, string>,
): string[] {
    const annotation_id = source.id!;
    const subtask_key = plan.option.subtask_key;
    const access = ulabel.subtasks[subtask_key].annotations.access;
    const mask = plan.mask;
    const before: CounterpartRemovalState = { masks: {}, deprecated_ids: [] };
    const after: CounterpartRemovalState = { masks: {}, deprecated_ids: [] };
    for (const id of plan.conflict_ids) {
        const other_mask = ulabel.get_bitmask(access[id]);
        if (overlap === "exclude") {
            mask.subtract(other_mask);
        } else if (overlap === "overwrite") {
            const carved = other_mask.clone();
            if (!carved.subtract(mask)) continue;
            before.masks[id] = other_mask.to_rle();
            after.masks[id] = carved.to_rle();
            if (carved.is_empty()) before.deprecated_ids.push(id);
        }
    }
    if (plan.target_ids.length === 0) {
        return add_merge_object(ulabel, source_key, source, plan, before, after);
    }
    const [survivor_id, ...joined_ids] = plan.target_ids;
    const current = ulabel.get_bitmask(access[survivor_id]);
    const merged = current.clone();
    merged.add_mask(mask);
    for (const id of joined_ids) merged.add_mask(ulabel.get_bitmask(access[id]));
    const current_rle = current.to_rle();
    const merged_rle = merged.to_rle();
    if (current_rle.counts.join() !== merged_rle.counts.join()) {
        before.masks[survivor_id] = current_rle;
        after.masks[survivor_id] = merged_rle;
    }
    before.deprecated_ids.push(...joined_ids);
    after.deprecated_ids = before.deprecated_ids;
    const changed = Array.from(new Set(Object.keys(after.masks).concat(after.deprecated_ids)));
    if (changed.length === 0) {
        log_message(`Merge option ${plan.option.id} changes nothing`, LogLevel.INFO, true);
        return [];
    }
    apply_counterpart_removal(ulabel, after, subtask_key, true);
    record_apply_merge_option(ulabel, annotation_id, subtask_key, { before, after }, false);
    for (const id of joined_ids) merged_into.set(merged_key(subtask_key, id), survivor_id);
    return changed;
}

/**
 * Target-less merge: record any overwrite of other bitmasks, then paste the
 * mask as a new object (class and `copied_from` as Copy to gives them).
 */
function add_merge_object(
    ulabel: ULabel,
    source_key: string,
    source: ULabelAnnotation,
    plan: MergePlan,
    before: CounterpartRemovalState,
    after: CounterpartRemovalState,
): string[] {
    const subtask_key = plan.option.subtask_key;
    after.deprecated_ids = before.deprecated_ids;
    const changed = Array.from(new Set(Object.keys(after.masks).concat(after.deprecated_ids)));
    if (changed.length > 0) {
        apply_counterpart_removal(ulabel, after, subtask_key, true);
        record_apply_merge_option(ulabel, source.id!, subtask_key, { before, after }, false);
    }
    if (plan.mask.is_empty()) {
        log_message(`Merge option ${plan.option.id} adds nothing`, LogLevel.INFO, true);
        return changed;
    }
    const template = new_object_template(source, plan.mask.to_rle());
    const new_id = ulabel.paste_annotation(template, subtask_key, plan.class_id, [0, 0], true, source_key);
    if (new_id !== null) changed.push(new_id);
    return changed;
}

function record_apply_merge_option(
    ulabel: ULabel,
    annotation_id: string,
    subtask_key: string,
    payload: CounterpartRemovalPayload,
    is_redo: boolean,
): void {
    const ids = new Set(Object.keys(payload.after.masks).concat(payload.after.deprecated_ids));
    record_action(ulabel, {
        act_type: "apply_merge_option",
        annotation_id: annotation_id,
        frame: ulabel.state.current_frame,
        undo_payload: payload,
        redo_payload: payload,
        affected: Array.from(ids).map((id) => ({ annotation_id: id, subtask_key })),
    }, is_redo, true, subtask_key);
}

/**
 * Undo `apply_merge_option`: restore the masks and deleted annotations in the current subtask.
 *
 * @param ulabel ULabel instance
 * @param undo_payload `{ before, after }`
 */
export function apply_merge_option__undo(ulabel: ULabel, undo_payload: CounterpartRemovalPayload): void {
    apply_counterpart_removal(ulabel, undo_payload.before, ulabel.get_current_subtask_key(), false);
}

/**
 * Redo `apply_merge_option` in the current subtask.
 *
 * @param ulabel ULabel instance
 * @param annotation_id annotation the option came from
 * @param redo_payload `{ before, after }`
 */
export function apply_merge_option__redo(ulabel: ULabel, annotation_id: string, redo_payload: CounterpartRemovalPayload): void {
    const subtask_key = ulabel.get_current_subtask_key();
    apply_counterpart_removal(ulabel, redo_payload.after, subtask_key, true);
    record_apply_merge_option(ulabel, annotation_id, subtask_key, redo_payload, true);
}
