/**
 * Counterparts: annotations in another subtask linked to a source annotation
 * by `copied_from` or a shared link meta value, and the bulk delete and
 * class changes applied to them.
 */
import type { ULabelClassificationPayload } from "../index";
import { ULabel } from "../src/index";
import { ULabelAnnotation } from "./annotation";
import { get_annotation_class_id, mark_deprecated } from "./annotation_operators";
import { record_action } from "./actions";
import { CopiedFrom, get_annotation_meta, get_counterpart_class_name, is_copyable_spatial_type } from "./clipboard";
import { log_message, LogLevel } from "./error_logging";
import { ULabelMaskPayload } from "./mask_utils";

// One half of a `delete_counterparts` payload: masks to set and ids to (un)deprecate
type CounterpartRemovalState = { masks: Record<string, ULabelMaskPayload>; deprecated_ids: string[] };
type CounterpartRemovalPayload = { before: CounterpartRemovalState; after: CounterpartRemovalState };
type CounterpartClassPayload = {
    before: Record<string, ULabelClassificationPayload[]>;
    after: Record<string, ULabelClassificationPayload[]>;
};

/**
 * Find an annotation in `target_key` that was pasted from
 * `annotation_id` in `source_key` (via `annotation_meta.copied_from`) and
 * has not been deleted by a human (filter-hidden copies count).
 *
 * @param ulabel ULabel instance
 * @param annotation_id source annotation
 * @param source_key subtask the source lives in
 * @param target_key subtask to search
 * @returns id of the copy, or null when there is none
 */
export function find_pasted_copy(ulabel: ULabel, annotation_id: string, source_key: string, target_key: string): string | null {
    const target = ulabel.subtasks[target_key];
    if (target == null) return null;
    for (const copy_id of target["annotations"]["ordering"]) {
        const copy = target["annotations"]["access"][copy_id];
        // Filter-hidden copies still count; only a human deletion clears the guard
        if (copy["deprecated_by"]?.["human"]) continue;
        const from = get_annotation_meta(copy)?.["copied_from"] as CopiedFrom | undefined;
        if (from?.["subtask_key"] === source_key && from?.["annotation_id"] === annotation_id) {
            return copy_id;
        }
    }
    return null;
}

/**
 * Spatial annotations in `target_key` linked to `annotation_id` in
 * `source_key`: its copies, the annotation it was copied from, and those
 * sharing a value under `config.annotation_link_meta_key`. Human-deleted
 * annotations are skipped; filter-hidden ones count.
 *
 * @param ulabel ULabel instance
 * @param annotation_id source annotation
 * @param source_key subtask the annotation lives in
 * @param target_key subtask to search
 */
export function find_counterparts(ulabel: ULabel, annotation_id: string, source_key: string, target_key: string): string[] {
    const source = ulabel.subtasks[source_key]?.["annotations"]["access"][annotation_id];
    const target = ulabel.subtasks[target_key];
    if (source == null || target == null || source_key === target_key) return [];
    const link_values = new Set(get_link_values(ulabel, source));
    const source_from = get_annotation_meta(source)?.["copied_from"] as CopiedFrom | undefined;
    const ids: string[] = [];
    for (const candidate_id of target["annotations"]["ordering"]) {
        const candidate = target["annotations"]["access"][candidate_id];
        if (candidate["deprecated_by"]?.["human"]) continue;
        if (!is_copyable_spatial_type(candidate.spatial_type)) continue;
        const from = get_annotation_meta(candidate)?.["copied_from"] as CopiedFrom | undefined;
        if (
            (from?.["subtask_key"] === source_key && from?.["annotation_id"] === annotation_id) ||
            (source_from?.["subtask_key"] === target_key && source_from?.["annotation_id"] === candidate_id) ||
            get_link_values(ulabel, candidate).some((value) => link_values.has(value))
        ) {
            ids.push(candidate_id);
        }
    }
    return ids;
}

// Non-empty strings under `config.annotation_link_meta_key` (a string or string[])
function get_link_values(ulabel: ULabel, annotation: ULabelAnnotation): string[] {
    const key = ulabel.config["annotation_link_meta_key"];
    if (key == null) return [];
    const value = get_annotation_meta(annotation)?.[key];
    return (Array.isArray(value) ? value : [value]).filter((v): v is string => typeof v === "string" && v !== "");
}

/**
 * Remove an annotation's counterparts (see `find_counterparts`) from a
 * writable subtask. Erasing (bitmask sources only) subtracts the source
 * from its bitmask counterparts (a mask erased to nothing is deleted;
 * other counterparts are left alone); otherwise every counterpart is
 * deleted. Recorded as one `delete_counterparts` action on the target's stream.
 * `config.paste_switch_to_target` then switches to the target.
 *
 * @param ulabel ULabel instance
 * @param annotation_id source annotation
 * @param source_key subtask the annotation lives in
 * @param target_key subtask to remove counterparts from
 * @param erase default: whether the source is a bitmask
 * @param switch_to_target whether `config.paste_switch_to_target` applies (bulk callers switch once at the end)
 * @returns ids of the changed counterparts
 */
export function delete_counterparts(
    ulabel: ULabel,
    annotation_id: string,
    source_key: string,
    target_key: string,
    erase: boolean | null = null,
    switch_to_target: boolean = true,
): string[] {
    const source = ulabel.subtasks[source_key]?.["annotations"]["access"][annotation_id];
    const target = ulabel.subtasks[target_key];
    if (source == null || target == null) {
        log_message(`Annotation ${annotation_id} or subtask ${target_key} not found`, LogLevel.WARNING, true);
        return [];
    }
    if (target.is_read_only()) {
        log_message(`Subtask ${target_key} is read-only; nothing removed`, LogLevel.WARNING, true);
        return [];
    }
    const is_bitmask = source["spatial_type"] === "bitmask";
    erase ??= is_bitmask;
    if (erase && !is_bitmask) {
        log_message(`Only a bitmask can be erased from subtask ${target_key}`, LogLevel.WARNING, true);
        return [];
    }
    const source_mask = erase ? ulabel.get_bitmask(source) : null;
    const before: CounterpartRemovalState = { masks: {}, deprecated_ids: [] };
    const after: CounterpartRemovalState = { masks: {}, deprecated_ids: [] };
    for (const id of ulabel.find_counterparts(annotation_id, source_key, target_key)) {
        const counterpart = target["annotations"]["access"][id];
        if (!erase) {
            before.deprecated_ids.push(id);
            continue;
        }
        if (counterpart["spatial_type"] !== "bitmask") continue;
        const current_mask = ulabel.get_bitmask(counterpart);
        const mask = current_mask.clone();
        if (!mask.subtract(source_mask!)) continue;
        before.masks[id] = current_mask.to_rle();
        after.masks[id] = mask.to_rle();
        if (mask.is_empty()) before.deprecated_ids.push(id);
    }
    after.deprecated_ids = before.deprecated_ids;
    const changed_ids = Array.from(new Set(Object.keys(after.masks).concat(after.deprecated_ids)));
    if (changed_ids.length === 0) {
        log_message(`Nothing to remove from subtask ${target_key}`, LogLevel.INFO, true);
        return [];
    }
    apply_counterpart_removal(ulabel, after, target_key, true);
    record_delete_counterparts(ulabel, annotation_id, target_key, { before, after }, false);
    if (switch_to_target) switch_to_counterpart_target(ulabel, target_key);
    return changed_ids;
}

function record_delete_counterparts(ulabel: ULabel, annotation_id: string, target_key: string, payload: CounterpartRemovalPayload, is_redo: boolean): void {
    const ids = new Set(Object.keys(payload.after.masks).concat(payload.after.deprecated_ids));
    record_action(ulabel, {
        act_type: "delete_counterparts",
        annotation_id: annotation_id,
        frame: ulabel.state["current_frame"],
        undo_payload: payload,
        redo_payload: payload,
        affected: Array.from(ids).map((id) => ({ annotation_id: id, subtask_key: target_key })),
    }, is_redo, true, target_key);
}

// Set masks and deprecation from a `delete_counterparts` payload half, then redraw
function apply_counterpart_removal(ulabel: ULabel, state: CounterpartRemovalState, subtask_key: string, deprecated: boolean): void {
    const access = ulabel.subtasks[subtask_key]["annotations"]["access"];
    const ids = new Set<string>();
    for (const [id, rle] of Object.entries(state.masks)) {
        const annotation = access[id];
        if (annotation === undefined) continue;
        annotation["spatial_payload"] = rle;
        ulabel.set_bitmask_from_rle(annotation, rle);
        ulabel.rebuild_bitmask_containing_box(annotation);
        ids.add(id);
    }
    for (const id of state.deprecated_ids) {
        if (access[id] === undefined) continue;
        mark_deprecated(access[id], deprecated);
        if (deprecated) ulabel.release_isolation_if_deprecated(id, subtask_key);
        ids.add(id);
    }
    const changed = Array.from(ids);
    ulabel.redraw_multiple_spatial_annotations(changed, subtask_key);
    if (changed.some((id) => access[id]["spatial_type"] === "polyline")) {
        ulabel.update_filter_distance(null, false, true);
    }
    ulabel.toolbox.redraw_update_items(ulabel);
}

/**
 * Undo `delete_counterparts`: restore the masks and deletions in the current subtask.
 *
 * @param ulabel ULabel instance
 * @param undo_payload `{ before, after }`
 */
export function delete_counterparts__undo(ulabel: ULabel, undo_payload: CounterpartRemovalPayload): void {
    apply_counterpart_removal(ulabel, undo_payload.before, ulabel.get_current_subtask_key(), false);
}

/**
 * Redo `delete_counterparts` in the current subtask.
 *
 * @param ulabel ULabel instance
 * @param annotation_id source annotation
 * @param redo_payload `{ before, after }`
 */
export function delete_counterparts__redo(ulabel: ULabel, annotation_id: string, redo_payload: CounterpartRemovalPayload): void {
    const subtask_key = ulabel.get_current_subtask_key();
    apply_counterpart_removal(ulabel, redo_payload.after, subtask_key, true);
    record_delete_counterparts(ulabel, annotation_id, subtask_key, redo_payload, true);
}

/**
 * Counterparts (see `find_counterparts`) in `target_key` that can take the
 * source annotation's class (matched by id, else by name; a
 * `config.counterpart_class_meta_key` value on the source replaces both,
 * matching by that name only) and don't already have it, with the class
 * each would take.
 *
 * @param ulabel ULabel instance
 * @param annotation_id source annotation
 * @param source_key subtask the annotation lives in
 * @param target_key subtask to search
 * @returns counterpart id -> class id
 */
export function get_counterpart_class_changes(ulabel: ULabel, annotation_id: string, source_key: string, target_key: string): Record<string, number> {
    const source = ulabel.subtasks[source_key]?.["annotations"]["access"][annotation_id];
    const target = ulabel.subtasks[target_key];
    if (source == null || target == null) return {};
    const override_name = get_counterpart_class_name(ulabel, source);
    const source_class_id = override_name === null ? Number(get_annotation_class_id(source)) : null;
    const source_class_name = override_name ?? ulabel.get_class_name(source_class_id, source_key);
    const changes: Record<string, number> = {};
    for (const id of ulabel.find_counterparts(annotation_id, source_key, target_key)) {
        const counterpart = target["annotations"]["access"][id];
        const compatible = ulabel._get_compatible_class_ids(counterpart, target_key);
        let class_id = source_class_id !== null && compatible.includes(source_class_id) ? source_class_id : null;
        class_id ??= target["class_defs"].find(
            (def) => def["name"] === source_class_name && compatible.includes(def["id"]),
        )?.["id"] ?? null;
        if (class_id === null || Number(get_annotation_class_id(counterpart)) === class_id) continue;
        changes[id] = class_id;
    }
    return changes;
}

/**
 * Set the class of an annotation's counterparts in a writable subtask to
 * the source's class (see `get_counterpart_class_changes`; counterparts
 * that can't take it are left alone). Recorded as one
 * `set_counterparts_class` action on the target's stream.
 * `config.paste_switch_to_target` then switches to the target.
 *
 * @param ulabel ULabel instance
 * @param annotation_id source annotation
 * @param source_key subtask the annotation lives in
 * @param target_key subtask whose counterparts change
 * @param switch_to_target whether `config.paste_switch_to_target` applies (bulk callers switch once at the end)
 * @returns ids of the changed counterparts
 */
export function set_counterparts_class(
    ulabel: ULabel,
    annotation_id: string,
    source_key: string,
    target_key: string,
    switch_to_target: boolean = true,
): string[] {
    const target = ulabel.subtasks[target_key];
    if (ulabel.subtasks[source_key]?.["annotations"]["access"][annotation_id] == null || target == null) {
        log_message(`Annotation ${annotation_id} or subtask ${target_key} not found`, LogLevel.WARNING, true);
        return [];
    }
    if (target.is_read_only()) {
        log_message(`Subtask ${target_key} is read-only; nothing changed`, LogLevel.WARNING, true);
        return [];
    }
    const changes = ulabel.get_counterpart_class_changes(annotation_id, source_key, target_key);
    const changed_ids = Object.keys(changes);
    if (changed_ids.length === 0) {
        log_message(`No class to change in subtask ${target_key}`, LogLevel.INFO, true);
        return [];
    }
    const before: Record<string, ULabelClassificationPayload[]> = {};
    const after: Record<string, ULabelClassificationPayload[]> = {};
    for (const id of changed_ids) {
        before[id] = target["annotations"]["access"][id]["classification_payloads"]!;
        after[id] = target["class_ids"].map((cid) => ({
            class_id: cid,
            confidence: cid === changes[id] ? 1.0 : 0.0,
        }));
    }
    apply_counterpart_classes(ulabel, after, target_key);
    record_set_counterparts_class(ulabel, annotation_id, target_key, { before, after }, false);
    if (switch_to_target) switch_to_counterpart_target(ulabel, target_key);
    return changed_ids;
}

// Make `target_key` current when `config.paste_switch_to_target` is set
function switch_to_counterpart_target(ulabel: ULabel, target_key: string): void {
    if (ulabel.config["paste_switch_to_target"] && target_key !== ulabel.get_current_subtask_key()) {
        ulabel.set_subtask(target_key);
    }
}

function record_set_counterparts_class(ulabel: ULabel, annotation_id: string, target_key: string, payload: CounterpartClassPayload, is_redo: boolean): void {
    record_action(ulabel, {
        act_type: "set_counterparts_class",
        annotation_id: annotation_id,
        frame: ulabel.state["current_frame"],
        undo_payload: payload,
        redo_payload: payload,
        affected: Object.keys(payload.after).map((id) => ({ annotation_id: id, subtask_key: target_key })),
    }, is_redo, true, target_key);
}

// Set classification payloads from a `set_counterparts_class` payload half, then redraw
function apply_counterpart_classes(ulabel: ULabel, payloads: Record<string, ULabelClassificationPayload[]>, subtask_key: string): void {
    const access = ulabel.subtasks[subtask_key]["annotations"]["access"];
    const ids = Object.keys(payloads).filter((id) => access[id] !== undefined);
    for (const id of ids) {
        access[id]["classification_payloads"] = JSON.parse(JSON.stringify(payloads[id]));
    }
    ulabel.redraw_multiple_spatial_annotations(ids, subtask_key);
    if (ids.some((id) => access[id]["spatial_type"] === "polyline")) {
        ulabel.update_filter_distance(null, false, true);
    }
    ulabel.toolbox.redraw_update_items(ulabel);
}

/**
 * Undo `set_counterparts_class`: restore the classes in the current subtask.
 *
 * @param ulabel ULabel instance
 * @param undo_payload `{ before, after }`
 */
export function set_counterparts_class__undo(ulabel: ULabel, undo_payload: CounterpartClassPayload): void {
    apply_counterpart_classes(ulabel, undo_payload.before, ulabel.get_current_subtask_key());
}

/**
 * Redo `set_counterparts_class` in the current subtask.
 *
 * @param ulabel ULabel instance
 * @param annotation_id source annotation
 * @param redo_payload `{ before, after }`
 */
export function set_counterparts_class__redo(ulabel: ULabel, annotation_id: string, redo_payload: CounterpartClassPayload): void {
    const subtask_key = ulabel.get_current_subtask_key();
    apply_counterpart_classes(ulabel, redo_payload.after, subtask_key);
    record_set_counterparts_class(ulabel, annotation_id, subtask_key, redo_payload, true);
}
