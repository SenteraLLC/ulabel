/**
 * Isolate annotations: everything else in their subtask is hidden from the
 * canvas and from input (hover, Tab, fly-to, the list, bulk delete) until the
 * isolation clears. View-only state: nothing is recorded, `edited` is
 * untouched, and `get_annotations()` is unaffected.
 */

import type { ULabel } from "../index";
import { ULabelAnnotation } from "./annotation";
import { log_message, LogLevel } from "./error_logging";

/**
 * Whether other annotations are isolated in the subtask, hiding this one.
 * Bitmask geometry paths must not consult this: hidden annotations are still data.
 */
export function is_annotation_isolated_out(ulabel: ULabel, annotation: ULabelAnnotation, subtask_key: string): boolean {
    const isolated_annids = ulabel.subtasks[subtask_key]?.state.isolated_annids;
    return isolated_annids != null && !isolated_annids.includes(annotation.id!);
}

/**
 * Isolate one annotation, or pass `null` to show all again.
 *
 * @param ulabel ULabel instance
 * @param annotation_id annotation to isolate, or `null` to clear
 * @param subtask_key defaults to the current subtask
 * @param redraw whether the change repaints immediately
 * @returns whether the request was accepted
 */
export function isolate_annotation(
    ulabel: ULabel,
    annotation_id: string | null,
    subtask_key: string | null = null,
    redraw: boolean = true,
): boolean {
    return isolate_annotations(ulabel, annotation_id == null ? null : [annotation_id], subtask_key, redraw);
}

/**
 * Isolate several annotations, or pass `null` (or `[]`) to show all again.
 * Rejected as a whole when any id is unknown, or deprecated outside deprecated focus.
 *
 * @param ulabel ULabel instance
 * @param annotation_ids annotations to isolate, or `null` to clear
 * @param subtask_key defaults to the current subtask
 * @param redraw whether the change repaints immediately
 * @returns whether the request was accepted
 */
export function isolate_annotations(
    ulabel: ULabel,
    annotation_ids: string[] | null,
    subtask_key: string | null = null,
    redraw: boolean = true,
): boolean {
    const key = subtask_key ?? ulabel.get_current_subtask_key();
    const subtask = ulabel.subtasks[key];
    if (subtask == null) {
        log_message(`isolate_annotations: unknown subtask key ${key}`, LogLevel.WARNING, true);
        return false;
    }
    for (const id of annotation_ids ?? []) {
        if (!is_isolatable(ulabel, id, key)) {
            log_message(`isolate_annotations: unknown or deprecated annotation ${id}`, LogLevel.WARNING, true);
            return false;
        }
    }
    set_isolation(ulabel, key, annotation_ids, redraw);
    return true;
}

/**
 * Drop annotations from a subtask's isolation: `annotation_id`, or with
 * `null` every isolated id that is gone or deprecated outside deprecated
 * focus. The rest stay isolated; the last one leaving shows all again.
 *
 * @param ulabel ULabel instance
 * @param annotation_id annotation leaving the isolation, or `null` to drop the invalid ones
 * @param subtask_key defaults to the current subtask
 * @param redraw whether the change repaints immediately
 */
export function release_isolated_annotations(
    ulabel: ULabel,
    annotation_id: string | null,
    subtask_key: string | null = null,
    redraw: boolean = true,
): void {
    const key = subtask_key ?? ulabel.get_current_subtask_key();
    const isolated_annids = ulabel.subtasks[key]?.state.isolated_annids;
    if (isolated_annids == null) return;
    const remaining = isolated_annids.filter(
        (id) => (annotation_id === null ? is_isolatable(ulabel, id, key) : id !== annotation_id),
    );
    if (remaining.length !== isolated_annids.length) set_isolation(ulabel, key, remaining, redraw);
}

// Deprecated annotations are only visible, so only isolatable, under deprecated focus
function is_isolatable(ulabel: ULabel, annotation_id: string, subtask_key: string): boolean {
    const subtask = ulabel.subtasks[subtask_key];
    const annotation = subtask.annotations.access[annotation_id];
    return annotation != null && (!annotation.deprecated || subtask.focus_deprecated);
}

function set_isolation(ulabel: ULabel, subtask_key: string, annotation_ids: string[] | null, redraw: boolean): void {
    const subtask = ulabel.subtasks[subtask_key];
    const ids = annotation_ids == null || annotation_ids.length === 0 ? null : Array.from(new Set(annotation_ids));
    if (same_ids(subtask.state.isolated_annids, ids)) return;
    subtask.state.isolated_annids = ids;

    // Whatever was hovered, targeted, or mid-fly-to may have just been hidden
    subtask.state.hovered_annid = null;
    subtask.state.edit_candidate = null;
    subtask.state.move_candidate = null;
    subtask.state.fly_to_idx = null;
    ulabel.hide_context_menu();

    if (redraw) {
        ulabel.redraw_all_annotations(subtask_key);
        ulabel.toolbox?.redraw_update_items(ulabel);
    }

    ulabel.config.on_isolate_change?.(subtask_key, ids === null ? null : [...ids]);
}

function same_ids(a: string[] | null, b: string[] | null): boolean {
    if (a === null || b === null) return a === b;
    return a.length === b.length && a.every((id) => b.includes(id));
}
