/**
 * Isolate one annotation: everything else in its subtask is hidden from the
 * canvas and from input (hover, Tab, fly-to, the list, bulk delete) until the
 * isolation clears. View-only state: nothing is recorded, `edited` is
 * untouched, and `get_annotations()` is unaffected.
 */

import type { ULabel } from "../index";
import { ULabelAnnotation } from "./annotation";
import { log_message, LogLevel } from "./error_logging";

/**
 * Whether another annotation is isolated in the subtask, hiding this one.
 * Bitmask geometry paths must not consult this: hidden annotations are still data.
 */
export function is_annotation_isolated_out(ulabel: ULabel, annotation: ULabelAnnotation, subtask_key: string): boolean {
    const subtask = ulabel.subtasks[subtask_key];
    if (subtask == null) return false;
    const isolated_annid = subtask.state.isolated_annid;
    return isolated_annid != null && annotation.id !== isolated_annid;
}

/**
 * Isolate an annotation, or pass `null` to show all again.
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
    const key = subtask_key ?? ulabel.get_current_subtask_key();
    const subtask = ulabel.subtasks[key];
    if (subtask == null) {
        log_message(`isolate_annotation: unknown subtask key ${key}`, LogLevel.WARNING, true);
        return false;
    }
    if (annotation_id != null) {
        const annotation = subtask.annotations.access[annotation_id];
        if (annotation == null || annotation.deprecated) {
            log_message(`isolate_annotation: unknown or deprecated annotation ${annotation_id}`, LogLevel.WARNING, true);
            return false;
        }
    }

    const previous = subtask.state.isolated_annid;
    if (previous === annotation_id) return true;
    subtask.state.isolated_annid = annotation_id;

    // Whatever was hovered, targeted, or mid-fly-to may have just been hidden
    subtask.state.hovered_annid = null;
    subtask.state.edit_candidate = null;
    subtask.state.move_candidate = null;
    subtask.state.fly_to_idx = null;
    ulabel.hide_context_menu();

    if (redraw) {
        ulabel.redraw_all_annotations(key);
        ulabel.toolbox?.redraw_update_items(ulabel);
    }

    ulabel.config.on_isolate_change?.(key, annotation_id);
    return true;
}
