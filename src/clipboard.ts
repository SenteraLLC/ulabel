/**
 * Copying annotations between subtasks, directly or through the clipboard:
 * class matching, pasting, and cut as one `move_annotation` action.
 */
import type {
    ULabelClipboardEnvelope,
    ULabelClipboardItem,
    ULabelMultiClipboardEnvelope,
} from "../index";
import { ULabel } from "../src/index";
import { ULabelAnnotation, DELETE_MODES, MODES_3D, NONSPATIAL_MODES } from "./annotation";
import { get_annotation_class_id, mark_deprecated } from "./annotation_operators";
import { record_action } from "./actions";
import { log_message, LogLevel } from "./error_logging";
import { get_active_class_id } from "./utilities";
import { v4 as uuidv4 } from "uuid";

// Image-space shift applied when an annotation is pasted back into the subtask it was copied from
const PASTE_OFFSET_PX = 20;

type ClipboardEnvelope = ULabelClipboardEnvelope | ULabelMultiClipboardEnvelope;

// Either envelope's fields, read loosely: a system clipboard payload is unchecked JSON
type EnvelopeFields = Partial<Omit<ULabelClipboardEnvelope, "ulabel_annotation"> & Omit<ULabelMultiClipboardEnvelope, "ulabel_annotation">> & {
    ulabel_annotation?: number;
};

// Where a pasted annotation came from (`annotation_meta.copied_from`)
export type CopiedFrom = { subtask_key: string; annotation_id: string };

/**
 * An annotation's `annotation_meta` when it is an object; it may also be a
 * string or missing.
 *
 * @param annotation the annotation
 */
export function get_annotation_meta(annotation: ULabelAnnotation | null | undefined): Record<string, unknown> | null {
    const meta = annotation?.annotation_meta;
    return typeof meta === "object" && meta !== null ? (meta as Record<string, unknown>) : null;
}

/**
 * Whether annotations of this spatial type can be copied: not non-spatial or a delete mode.
 *
 * @param spatial_type the annotation's spatial type
 */
export function is_copyable_spatial_type(spatial_type: string | undefined): boolean {
    return !NONSPATIAL_MODES.includes(spatial_type!) && !DELETE_MODES.includes(spatial_type!);
}

/**
 * Whether an annotation can be pasted into a subtask: it is spatial, the
 * subtask is not read-only, and at least one of its classes allows the
 * annotation's spatial type.
 *
 * @param ulabel ULabel instance
 * @param annotation annotation to check
 * @param subtask_key subtask the annotation(s) live in
 */
export function can_paste_into_subtask(ulabel: ULabel, annotation: ULabelAnnotation | null | undefined, subtask_key: string): boolean {
    const subtask = ulabel.subtasks[subtask_key];
    if (subtask === undefined || subtask.is_read_only()) return false;
    if (annotation == null) return false;
    if (!is_copyable_spatial_type(annotation.spatial_type)) return false;
    return ulabel._get_compatible_class_ids(annotation, subtask_key).length > 0;
}

/**
 * Keys of the other subtasks an annotation can be copied into.
 *
 * @param ulabel ULabel instance
 * @param annotation annotation to check
 * @param source_key subtask the annotation lives in; defaults to the current subtask
 */
export function get_copy_target_subtask_keys(ulabel: ULabel, annotation: ULabelAnnotation, source_key: string | null = null): string[] {
    source_key ??= ulabel.get_current_subtask_key();
    return Object.keys(ulabel.subtasks).filter(
        (key) => key !== source_key && ulabel.can_paste_into_subtask(annotation, key),
    );
}

/**
 * Compatible class in the target that matches the source class by id, or
 * failing that by name. A non-empty string under the source's
 * `annotation_meta[config.counterpart_class_meta_key]` replaces both: only
 * a class with that name matches. Null when nothing matches.
 *
 * @param ulabel ULabel instance
 * @param annotation annotation to check
 * @param target_key subtask to paste into
 * @param source_class_name name of the source class, if known
 * @param use_meta_override false ignores the meta override (a paste back into the source subtask)
 */
export function match_paste_class_id(ulabel: ULabel, annotation: ULabelAnnotation, target_key: string, source_class_name: string | null = null, use_meta_override: boolean = true): number | null {
    const compatible = ulabel._get_compatible_class_ids(annotation, target_key);
    const override_name = use_meta_override ? get_counterpart_class_name(ulabel, annotation) : null;
    if (override_name === null) {
        const source_class_id = Number(get_annotation_class_id(annotation));
        if (compatible.includes(source_class_id)) return source_class_id;
    }
    const class_name = override_name ?? source_class_name;
    if (class_name == null) return null;
    const by_name = ulabel.subtasks[target_key]["class_defs"].find(
        (def) => def["name"] === class_name && compatible.includes(def["id"]),
    );
    return by_name == null ? null : by_name["id"];
}

// Non-empty string under `config.counterpart_class_meta_key`, or null
export function get_counterpart_class_name(ulabel: ULabel, annotation: ULabelAnnotation | null | undefined): string | null {
    const key = ulabel.config["counterpart_class_meta_key"];
    if (key == null) return null;
    const value = get_annotation_meta(annotation)?.[key];
    return typeof value === "string" && value !== "" ? value : null;
}

/**
 * Class for a pasted annotation: the source class when the target has it
 * (by id, else by name), else the target's active class, else the first
 * compatible class.
 *
 * @param ulabel ULabel instance
 * @param annotation annotation to check
 * @param target_key subtask to paste into
 * @param source_class_name name of the source class, if known
 * @param use_meta_override see `match_paste_class_id`
 * @returns null when no class in the target fits
 */
export function resolve_paste_class_id(ulabel: ULabel, annotation: ULabelAnnotation, target_key: string, source_class_name: string | null = null, use_meta_override: boolean = true): number | null {
    const compatible = ulabel._get_compatible_class_ids(annotation, target_key);
    if (compatible.length === 0) return null;
    const matched = ulabel.match_paste_class_id(annotation, target_key, source_class_name, use_meta_override);
    if (matched !== null) return matched;
    const active_class_id = get_active_class_id(ulabel, target_key);
    if (active_class_id !== undefined && compatible.includes(active_class_id)) return active_class_id;
    return compatible[0];
}

/**
 * Name of a class in a subtask, or null when the subtask has no such class.
 *
 * @param ulabel ULabel instance
 * @param class_id class to look up
 * @param subtask_key subtask the annotation(s) live in
 */
export function get_class_name(ulabel: ULabel, class_id: number | null, subtask_key: string): string | null {
    const class_def = ulabel.subtasks[subtask_key]?.["class_defs"].find((def) => def["id"] === class_id);
    return class_def?.["name"] ?? null;
}

/**
 * Insert a copy of an annotation into a subtask. The copy gets a fresh id,
 * fresh stamps, no deprecation and a class payload for `class_id`; every
 * other field carries over, except the `config.annotation_link_meta_key`
 * and `config.counterpart_class_meta_key` entries of `annotation_meta`. Records a `paste_annotation` action on the
 * target subtask's stream.
 *
 * @param ulabel ULabel instance
 * @param annotation source annotation (from any subtask or a clipboard payload)
 * @param target_key subtask to paste into
 * @param class_id class for the copy; null resolves via `resolve_paste_class_id`
 * @param offset image-space shift applied to the copy
 * @param record record a `paste_annotation` action on the target stream
 * @param source_key when given, stamped as `annotation_meta.copied_from`
 * @returns id of the new annotation, or null when nothing was pasted
 */
export function paste_annotation(ulabel: ULabel, annotation: ULabelAnnotation, target_key: string, class_id: number | null = null, offset: [number, number] = [0, 0], record: boolean = true, source_key: string | null = null): string | null {
    if (!ulabel.can_paste_into_subtask(annotation, target_key)) {
        log_message(`Cannot paste a ${annotation?.["spatial_type"]} annotation into subtask ${target_key}`, LogLevel.WARNING, true);
        return null;
    }
    class_id ??= ulabel.resolve_paste_class_id(annotation, target_key, null, target_key !== source_key);
    if (class_id === null || !ulabel._get_compatible_class_ids(annotation, target_key).includes(class_id)) {
        log_message(`Class ${class_id} in subtask ${target_key} cannot take a ${annotation["spatial_type"]} annotation`, LogLevel.WARNING, true);
        return null;
    }

    const copy = JSON.parse(JSON.stringify(annotation));
    // Bitmask payloads may be raw arrays or stale; re-encode from the decoded mask
    if (copy["spatial_type"] === "bitmask") {
        copy["spatial_payload"] = ulabel.get_bitmask(annotation).to_rle();
    }
    const now = ULabel.get_time();
    delete copy["edit_type"];
    copy["id"] = ulabel.make_new_annotation_id();
    copy["created_by"] = ulabel.config.username;
    copy["created_at"] = now;
    copy["last_edited_by"] = ulabel.config.username;
    copy["last_edited_at"] = now;
    copy["deprecated"] = false;
    copy["deprecated_by"] = { human: false };
    const copy_meta = copy["annotation_meta"];
    if (typeof copy_meta === "object" && copy_meta !== null) {
        for (const key of [ulabel.config["annotation_link_meta_key"], ulabel.config["counterpart_class_meta_key"]]) {
            if (key != null) delete copy_meta[key];
        }
    }
    if (source_key !== null) {
        // Per-subtask annotation_meta may be a string; only an object can carry the stamp
        const meta = typeof copy["annotation_meta"] === "object" && copy["annotation_meta"] !== null ? copy["annotation_meta"] : {};
        copy["annotation_meta"] = { ...meta, copied_from: { subtask_key: source_key, annotation_id: annotation["id"] } };
    }
    copy["classification_payloads"] = ulabel.subtasks[target_key]["class_ids"].map((cid) => ({
        class_id: cid,
        confidence: cid === class_id ? 1.0 : 0.0,
    }));

    let new_annotation = ULabelAnnotation.from_json(copy);
    if (new_annotation === null) {
        log_message("Cannot paste an annotation with an incompatible spatial payload", LogLevel.WARNING, true);
        return null;
    }
    const [dx, dy] = offset;
    if (dx !== 0 || dy !== 0) {
        const spatial_type = new_annotation["spatial_type"];
        if (spatial_type === "bitmask") {
            ulabel.translate_bitmask(new_annotation, dx, dy);
        } else {
            // The JSON round trip broke any shared closing-point reference, so every point shifts once
            let layers = [new_annotation["spatial_payload"]];
            if (spatial_type === "polygon") {
                layers = new_annotation["spatial_payload"];
            }
            for (const layer of layers) {
                for (const point of layer) {
                    point[0] += dx;
                    point[1] += dy;
                }
            }
        }
    }
    if (!ulabel.config.allow_annotations_outside_image) {
        new_annotation = new_annotation.clamp_annotation_to_image_bounds(ulabel.config["image_width"]!, ulabel.config["image_height"]!);
    }
    insert_pasted_annotation(ulabel, new_annotation, target_key, false, record);
    return new_annotation.id!;
}

/**
 * Add an already-prepared pasted annotation to a subtask. Shared by
 * `paste_annotation`, its redo, and `move_annotation`'s redo.
 *
 * @param ulabel ULabel instance
 * @param annotation_json annotation with its final id, class and geometry
 * @param target_key subtask to paste into
 * @param is_redo whether this records a redo
 * @param record record a `paste_annotation` action on the target stream
 */
function insert_pasted_annotation(ulabel: ULabel, annotation_json: ULabelAnnotation, target_key: string, is_redo: boolean, record: boolean = true): void {
    const target = ulabel.subtasks[target_key];
    // A new annotation would be hidden by an active isolation
    ulabel.isolate_annotation(null, target_key);
    const annotation = ULabelAnnotation.from_json(annotation_json)!;
    const annotation_id = annotation.id!;
    annotation["canvas_id"] = ulabel.get_init_canvas_context_id(annotation_id, target_key);
    target["annotations"]["access"][annotation_id] = annotation;
    target["annotations"]["ordering"].push(annotation_id);
    ulabel.rebuild_containing_box(annotation_id, false, target_key);

    if (record) {
        const frame = MODES_3D.includes(annotation.spatial_type!) ? null : ulabel.state["current_frame"];
        record_action(ulabel, {
            act_type: "paste_annotation",
            annotation_id: annotation_id,
            frame: frame,
            undo_payload: {},
            redo_payload: { annotation: annotation },
        }, is_redo, true, target_key);
    }

    // No action listener: the target may not be the current subtask
    ulabel.redraw_annotation(annotation_id, target_key);
    ulabel.toolbox.redraw_update_items(ulabel);
}

/**
 * Drop a pasted annotation from a subtask entirely (it never existed
 * before the paste, so there is nothing to deprecate).
 *
 * @param ulabel ULabel instance
 * @param annotation_id the pasted copy
 * @param subtask_key subtask the annotation(s) live in
 */
function remove_pasted_annotation(ulabel: ULabel, annotation_id: string, subtask_key: string): void {
    const subtask = ulabel.subtasks[subtask_key];
    if (!(annotation_id in subtask["annotations"]["access"])) return;
    if (subtask["state"]["isolated_annid"] === annotation_id) {
        ulabel.isolate_annotation(null, subtask_key);
    }
    ulabel.destroy_annotation_context(annotation_id, subtask_key);
    delete subtask["annotations"]["access"][annotation_id];
    subtask["annotations"]["ordering"] = subtask["annotations"]["ordering"].filter((value) => value !== annotation_id);
}

/**
 * Drop a moved copy from its subtask along with everything that subtask
 * recorded about it. A copy that was itself moved on is followed first
 * so no orphaned duplicate outlives the move being undone.
 *
 * @param ulabel ULabel instance
 * @param copy_id id of the copy
 * @param subtask_key subtask the annotation(s) live in
 */
function discard_moved_copy(ulabel: ULabel, copy_id: string, subtask_key: string): void {
    for (const action of ulabel.subtasks[subtask_key]["actions"]["stream"]) {
        if (action.act_type === "move_annotation" && action.annotation_id === copy_id) {
            const payload = JSON.parse(action.undo_payload);
            discard_moved_copy(ulabel, payload.copy_id, payload.target_subtask_key);
        }
    }
    remove_pasted_annotation(ulabel, copy_id, subtask_key);
    ulabel.remove_recorded_events_for_annotation(copy_id, subtask_key);
}

/**
 * Undo a paste: remove the copy from the current subtask.
 *
 * @param ulabel ULabel instance
 * @param annotation_id the pasted copy
 */
export function paste_annotation__undo(ulabel: ULabel, annotation_id: string): void {
    remove_pasted_annotation(ulabel, annotation_id, ulabel.get_current_subtask_key());
}

/**
 * Redo a paste: re-add the stored copy to the current subtask.
 *
 * @param ulabel ULabel instance
 * @param annotation_id the pasted copy
 * @param redo_payload `{ annotation }` as recorded by the paste
 */
export function paste_annotation__redo(ulabel: ULabel, annotation_id: string, redo_payload: { annotation: ULabelAnnotation }): void {
    insert_pasted_annotation(ulabel, redo_payload.annotation, ulabel.get_current_subtask_key(), true);
}

/**
 * Copy an annotation from one subtask into another at the same image
 * coordinates. Cut turns the copy into a move: the source, which must live
 * in the current, writable subtask, is deleted and the whole move is one
 * undoable `move_annotation` action on the source's stream (nothing is
 * recorded on the target). When `choose_class` is set, no class was given
 * and the source class has no counterpart in the target (by id or name)
 * that could be chosen from several, the target becomes the current
 * subtask and the class pie opens on the copy (unless
 * `config.paste_class_choice` is off). `config.paste_switch_to_target`
 * makes the target current after any successful copy.
 *
 * @param ulabel ULabel instance
 * @param annotation_id annotation to copy
 * @param source_key subtask the annotation lives in
 * @param target_key subtask to copy into
 * @param class_id class for the copy; null resolves via `resolve_paste_class_id`
 * @param cut delete the source afterwards
 * @param choose_class open the class pie when the class is ambiguous
 * @param offset image-space shift applied to the copy
 * @returns id of the copy
 */
export function copy_annotation_to_subtask(ulabel: ULabel, annotation_id: string, source_key: string, target_key: string, class_id: number | null = null, cut: boolean = false, choose_class: boolean = false, offset: [number, number] = [0, 0]): string | null {
    const annotation = ulabel.subtasks[source_key]?.["annotations"]["access"][annotation_id];
    if (annotation == null) {
        log_message(`Annotation ${annotation_id} not found in subtask ${source_key}`, LogLevel.WARNING, true);
        return null;
    }
    let move = cut;
    if (cut && (source_key !== ulabel.get_current_subtask_key() || ulabel.is_current_subtask_read_only())) {
        log_message("Cut only removes annotations from the current, writable subtask; copied instead", LogLevel.WARNING, true);
        move = false;
    }
    let offer_choice = false;
    if (class_id === null && ulabel.can_paste_into_subtask(annotation, target_key)) {
        const source_class_name = ulabel.get_class_name(Number(get_annotation_class_id(annotation)), source_key);
        const use_override = target_key !== source_key;
        const matched = ulabel.match_paste_class_id(annotation, target_key, source_class_name, use_override);
        offer_choice = choose_class && !!ulabel.config["paste_class_choice"] && matched === null;
        class_id = ulabel.resolve_paste_class_id(annotation, target_key, source_class_name, use_override);
    }
    const new_id = ulabel.paste_annotation(annotation, target_key, class_id, offset, !move, source_key);
    if (new_id === null) return null;

    if (move) {
        record_move_annotation(ulabel, annotation_id, target_key, new_id, false);
    }

    if (ulabel.config["paste_switch_to_target"] && target_key !== ulabel.get_current_subtask_key()) {
        ulabel.set_subtask(target_key);
    }
    if (offer_choice) {
        offer_pasted_class_choice(ulabel, new_id, target_key);
    }
    return new_id;
}

/**
 * Deprecate the source of a move and record the compound action on the
 * current (source) subtask's stream. The copy must already be in place.
 *
 * @param ulabel ULabel instance
 * @param annotation_id source annotation in the current subtask
 * @param target_key subtask holding the copy
 * @param copy_id id of the copy
 * @param is_redo whether this records a redo
 */
function record_move_annotation(ulabel: ULabel, annotation_id: string, target_key: string, copy_id: string, is_redo: boolean): void {
    const spatial_type = ulabel.get_current_subtask()["annotations"]["access"][annotation_id]["spatial_type"];
    ulabel.delete_annotation(annotation_id, is_redo, false);
    const frame = MODES_3D.includes(spatial_type!) ? null : ulabel.state["current_frame"];
    const copy = ulabel.subtasks[target_key]["annotations"]["access"][copy_id];
    record_action(ulabel, {
        act_type: "move_annotation",
        annotation_id: annotation_id,
        frame: frame,
        undo_payload: { target_subtask_key: target_key, copy_id: copy_id },
        redo_payload: { target_subtask_key: target_key, annotation: copy },
        affected: [{ annotation_id: copy_id, subtask_key: target_key }],
    }, is_redo);
}

/**
 * Undo a move: restore the source in the current subtask and drop the
 * copy from the target, along with everything the target recorded about
 * the copy (its edits there can no longer be replayed) and any copies
 * made by moving it on again.
 *
 * @param ulabel ULabel instance
 * @param annotation_id the moved source annotation
 * @param undo_payload `{ target_subtask_key, copy_id }`
 */
export function move_annotation__undo(ulabel: ULabel, annotation_id: string, undo_payload: { target_subtask_key: string; copy_id: string }): void {
    mark_deprecated(ulabel.get_current_subtask()["annotations"]["access"][annotation_id], false);
    discard_moved_copy(ulabel, undo_payload.copy_id, undo_payload.target_subtask_key);
    ulabel.toolbox.redraw_update_items(ulabel);
}

/**
 * Redo a move: re-insert the copy in the target and deprecate the source
 * again.
 *
 * @param ulabel ULabel instance
 * @param annotation_id the moved source annotation
 * @param redo_payload `{ target_subtask_key, annotation }`
 */
export function move_annotation__redo(ulabel: ULabel, annotation_id: string, redo_payload: { target_subtask_key: string; annotation: ULabelAnnotation }): void {
    const target_key = redo_payload.target_subtask_key;
    insert_pasted_annotation(ulabel, redo_payload.annotation, target_key, true, false);
    record_move_annotation(ulabel, annotation_id, target_key, redo_payload.annotation.id!, true);
}

/**
 * When pasted annotations could take several classes in their subtask,
 * make that subtask current and open one class pie at the centre of them;
 * the pick applies to each that can take it.
 *
 * @param ulabel ULabel instance
 * @param annotation_ids pasted annotation(s)
 * @param target_key subtask they were pasted into
 */
function offer_pasted_class_choice(ulabel: ULabel, annotation_ids: string | string[], target_key: string): void {
    const access = ulabel.subtasks[target_key]["annotations"]["access"];
    const ids = ([] as string[]).concat(annotation_ids).filter(
        (id) => access[id] != null && ulabel._get_compatible_class_ids(access[id], target_key).length > 1,
    );
    if (ids.length === 0) return;
    if (target_key !== ulabel.get_current_subtask_key()) {
        ulabel.set_subtask(target_key);
    }
    const center = ulabel._get_annotations_center(ids, target_key);
    if (center !== null) {
        if (ids.length > 1) {
            ulabel.show_id_dialog(center[0], center[1], ids[0], false, ids.slice(1));
        } else {
            ulabel.show_id_dialog(center[0], center[1], ids[0], false);
        }
    }
}

/**
 * Centre of the union of the annotations' containing boxes.
 *
 * @param ulabel ULabel instance
 * @param annotation_ids annotations to act on
 * @param subtask_key subtask the annotation(s) live in
 * @returns null when none has a box
 */
export function get_annotations_center(ulabel: ULabel, annotation_ids: string[], subtask_key: string): [number, number] | null {
    const access = ulabel.subtasks[subtask_key]["annotations"]["access"];
    let [tlx, tly, brx, bry] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const id of annotation_ids) {
        const cbox = access[id]?.["containing_box"];
        if (cbox == null) continue;
        tlx = Math.min(tlx, cbox.tlx);
        tly = Math.min(tly, cbox.tly);
        brx = Math.max(brx, cbox.brx);
        bry = Math.max(bry, cbox.bry);
    }
    if (![tlx, tly, brx, bry].every(Number.isFinite)) return null;
    return [(tlx + brx) / 2, (tly + bry) / 2];
}

// Deep copy for the clipboard; bitmasks are re-encoded from the decoded mask
function copy_annotation_for_clipboard(ulabel: ULabel, annotation: ULabelAnnotation): ULabelAnnotation {
    const copy = JSON.parse(JSON.stringify(annotation));
    if (annotation["spatial_type"] === "bitmask") {
        copy["spatial_payload"] = ulabel.get_bitmask(annotation).to_rle();
    }
    return copy;
}

/**
 * Put the selection (when any) or else the hovered annotation (or
 * `annotation_id`) on the in-memory clipboard; cut also deletes it from
 * the current subtask. Returns the JSON envelope for the system
 * clipboard, or null when nothing was copied.
 *
 * @param ulabel ULabel instance
 * @param annotation_id defaults to the selection, then the hovered annotation
 * @param cut delete the source (current subtask must be writable)
 * @returns a single (`ulabel_annotation: 1`) or, for the selection, a multi (`ulabel_annotation: 2`) envelope
 */
export function copy_annotation_to_clipboard(ulabel: ULabel, annotation_id: string | null = null, cut: boolean = false): ClipboardEnvelope | null {
    if (annotation_id === null) {
        const selected = ulabel.get_selected_annotation_ids();
        if (selected.length > 0) return ulabel.copy_annotations_to_clipboard(selected, cut);
    }
    const subtask_key = ulabel.get_current_subtask_key();
    const subtask = ulabel.subtasks[subtask_key];
    annotation_id ??= subtask["state"]["edit_candidate"]?.["annid"] ?? null;
    if (annotation_id === null) return null;
    const annotation = subtask["annotations"]["access"][annotation_id];
    if (annotation == null || annotation["deprecated"]) return null;
    if (!is_copyable_spatial_type(annotation.spatial_type)) return null;
    if (cut && ulabel.is_current_subtask_read_only()) return null;

    const envelope: ULabelClipboardEnvelope = {
        ulabel_annotation: 1,
        copy_id: uuidv4(),
        copied_at: Date.now(),
        image_width: ulabel.config["image_width"]!,
        image_height: ulabel.config["image_height"]!,
        source_subtask_key: subtask_key,
        source_class_name: ulabel.get_class_name(Number(get_annotation_class_id(annotation)), subtask_key),
        annotation: copy_annotation_for_clipboard(ulabel, annotation),
        paste_counts: {},
    };
    ulabel.state["clipboard"] = envelope;
    if (cut) {
        ulabel.delete_annotation(annotation_id);
    }
    return envelope;
}

/**
 * Put several annotations of the current subtask on the in-memory
 * clipboard as one multi envelope; cut also deletes them as one undo step.
 * Deprecated, non-spatial and missing ids are skipped.
 *
 * @param ulabel ULabel instance
 * @param annotation_ids annotations to copy
 * @param cut delete the sources (current subtask must be writable)
 * @returns `{ ulabel_annotation: 2, ..., annotations: [{ annotation, source_class_name }] }`
 */
export function copy_annotations_to_clipboard(ulabel: ULabel, annotation_ids: string[], cut: boolean = false): ULabelMultiClipboardEnvelope | null {
    if (cut && ulabel.is_current_subtask_read_only()) return null;
    const subtask_key = ulabel.get_current_subtask_key();
    const access = ulabel.subtasks[subtask_key]["annotations"]["access"];
    const items: ULabelClipboardItem[] = [];
    for (const id of annotation_ids) {
        const annotation = access[id];
        if (annotation == null || annotation["deprecated"]) continue;
        if (!is_copyable_spatial_type(annotation.spatial_type)) continue;
        items.push({
            annotation: copy_annotation_for_clipboard(ulabel, annotation),
            source_class_name: ulabel.get_class_name(Number(get_annotation_class_id(annotation)), subtask_key),
        });
    }
    if (items.length === 0) return null;

    const envelope: ULabelMultiClipboardEnvelope = {
        ulabel_annotation: 2,
        copy_id: uuidv4(),
        copied_at: Date.now(),
        image_width: ulabel.config["image_width"]!,
        image_height: ulabel.config["image_height"]!,
        source_subtask_key: subtask_key,
        annotations: items,
        paste_counts: {},
    };
    ulabel.state["clipboard"] = envelope;
    if (cut) {
        ulabel.run_action_batch(() => items.forEach((item) => ulabel.delete_annotation(item.annotation.id!)));
    }
    return envelope;
}

// `[{ annotation, source_class_name }]` of a single or multi envelope, or null when it holds none
function get_clipboard_items(envelope: EnvelopeFields | null | undefined): ULabelClipboardItem[] | null {
    if (envelope == null) return null;
    if (Array.isArray(envelope["annotations"])) {
        const items = envelope["annotations"].filter((item) => item?.["annotation"] != null);
        return items.length > 0 ? items : null;
    }
    if (envelope["annotation"] == null) return null;
    return [{ annotation: envelope["annotation"], source_class_name: envelope["source_class_name"] ?? null }];
}

/**
 * Paste a clipboard envelope into the current subtask. Without an
 * argument the in-memory clipboard is used. The first paste into another
 * subtask keeps the coordinates; a paste back into the source subtask,
 * and every repeat paste into the same subtask, is offset by a further
 * `PASTE_OFFSET_PX` so each copy is visible. When a source class has
 * no counterpart in the target (by id or name), the class pie opens on
 * the copies whose class is ambiguous if `config.paste_class_choice` is
 * on. A multi envelope pastes as one undo step; the copies are not
 * selected.
 *
 * @param ulabel ULabel instance
 * @param envelope as produced by `copy_annotation_to_clipboard`
 * @returns id of the pasted annotation (ids, for a multi envelope)
 */
export function paste_annotation_from_clipboard(ulabel: ULabel, envelope: ClipboardEnvelope | null = null): string | string[] | null {
    const given: EnvelopeFields | null = envelope ?? ulabel.state["clipboard"];
    if (given == null || get_clipboard_items(given) === null) return null;
    let env = given;
    // The system clipboard yields a fresh parse each paste; the in-memory
    // envelope for the same copy carries the running paste counts. A
    // different, newer in-memory copy wins over a stale system payload
    // (e.g. a menu copy whose system clipboard write failed)
    const stored: EnvelopeFields | null = ulabel.state["clipboard"];
    const same_copy = env["copy_id"] != null && stored?.["copy_id"] === env["copy_id"];
    const stored_newer = (stored?.["copied_at"] ?? 0) > (env["copied_at"] ?? 0);
    if (stored != null && stored !== env && (same_copy || stored_newer)) {
        env = stored;
    }
    const items = get_clipboard_items(env);
    if (items === null) return null;
    const is_multi = Array.isArray(env["annotations"]);
    if (env["image_width"] !== ulabel.config["image_width"] || env["image_height"] !== ulabel.config["image_height"]) {
        log_message("Clipboard annotation belongs to an image of different dimensions; not pasted", LogLevel.WARNING, true);
        return null;
    }
    const target_key = ulabel.get_current_subtask_key();
    const pasteable = items.filter((item) => ulabel.can_paste_into_subtask(item["annotation"], target_key));
    if (pasteable.length === 0) {
        const what = is_multi ? "any of the copied annotations" : `a ${items[0]["annotation"]["spatial_type"]} annotation`;
        log_message(`No class in subtask ${target_key} accepts ${what}`, LogLevel.WARNING, true);
        return null;
    }
    ulabel.state["clipboard"] = env as ClipboardEnvelope;
    const paste_counts = (env["paste_counts"] ??= {});
    // A paste onto the source keeps its class and starts nudged; elsewhere
    // only repeats are nudged
    const same_subtask = env["source_subtask_key"] === target_key;
    const steps = (paste_counts[target_key] ?? 0) + (same_subtask ? 1 : 0);
    const offset: [number, number] = [PASTE_OFFSET_PX * steps, PASTE_OFFSET_PX * steps];
    const new_ids: string[] = [];
    const unmatched_ids: string[] = [];
    const paste_all = () => {
        for (const item of pasteable) {
            const source_class_name = item["source_class_name"] ?? null;
            const matched = ulabel.match_paste_class_id(item["annotation"], target_key, source_class_name, !same_subtask);
            const class_id = ulabel.resolve_paste_class_id(item["annotation"], target_key, source_class_name, !same_subtask);
            const new_id = ulabel.paste_annotation(item["annotation"], target_key, class_id, offset, true, env["source_subtask_key"] ?? null);
            if (new_id === null) continue;
            new_ids.push(new_id);
            if (matched === null) unmatched_ids.push(new_id);
        }
    };
    if (is_multi) {
        ulabel.run_action_batch(paste_all);
    } else {
        paste_all();
    }
    if (new_ids.length === 0) return null;
    paste_counts[target_key] = (paste_counts[target_key] ?? 0) + 1;
    if (unmatched_ids.length > 0 && ulabel.config["paste_class_choice"]) {
        offer_pasted_class_choice(ulabel, is_multi ? unmatched_ids : unmatched_ids[0], target_key);
    }
    return is_multi ? new_ids : new_ids[0];
}

/**
 * Copy several annotations into another subtask at the same image
 * coordinates as one undo step; cut makes it a move (see
 * `copy_annotation_to_subtask`). Annotations the target can't take are
 * skipped. With `choose_class`, one class pie opens on the copies whose
 * source class has no counterpart in the target.
 *
 * @param ulabel ULabel instance
 * @param annotation_ids annotations to copy
 * @param source_key subtask the annotations live in
 * @param target_key subtask to copy into
 * @param cut delete the sources afterwards
 * @param choose_class open the class pie when a class is ambiguous
 * @returns ids of the copies
 */
export function copy_annotations_to_subtask(ulabel: ULabel, annotation_ids: string[], source_key: string, target_key: string, cut: boolean = false, choose_class: boolean = false): string[] {
    let move = cut;
    if (cut && (source_key !== ulabel.get_current_subtask_key() || ulabel.is_current_subtask_read_only())) {
        log_message("Cut only removes annotations from the current, writable subtask; copied instead", LogLevel.WARNING, true);
        move = false;
    }
    const access = ulabel.subtasks[source_key]?.["annotations"]["access"] ?? {};
    const use_override = target_key !== source_key;
    const new_ids: string[] = [];
    const unmatched_ids: string[] = [];
    ulabel.run_action_batch(() => {
        for (const id of annotation_ids) {
            const annotation = access[id];
            if (annotation == null || annotation["deprecated"] || !ulabel.can_paste_into_subtask(annotation, target_key)) continue;
            const source_class_name = ulabel.get_class_name(Number(get_annotation_class_id(annotation)), source_key);
            const matched = ulabel.match_paste_class_id(annotation, target_key, source_class_name, use_override);
            const class_id = ulabel.resolve_paste_class_id(annotation, target_key, source_class_name, use_override);
            const new_id = ulabel.paste_annotation(annotation, target_key, class_id, [0, 0], !move, source_key);
            if (new_id === null) continue;
            if (move) {
                record_move_annotation(ulabel, id, target_key, new_id, false);
            }
            new_ids.push(new_id);
            if (matched === null) unmatched_ids.push(new_id);
        }
    });
    if (new_ids.length === 0) return new_ids;
    if (ulabel.config["paste_switch_to_target"] && target_key !== ulabel.get_current_subtask_key()) {
        ulabel.set_subtask(target_key);
    }
    if (choose_class && ulabel.config["paste_class_choice"] && unmatched_ids.length > 0) {
        offer_pasted_class_choice(ulabel, unmatched_ids, target_key);
    }
    return new_ids;
}
