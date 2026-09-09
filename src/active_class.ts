/**
 * Active-class selection.
 *
 * The active class is per-subtask state: `state.id_payload` drives what new
 * annotations get, and `state.selected_class_id` remembers the last *real*
 * class selected (delete-mode toggles clobber `id_payload`, so the memory is
 * what class focus reads — it freezes at the real selection while a delete
 * mode is active). The toolbox buttons are one consumer of this API rather
 * than the mechanism itself.
 */

import type { ULabel } from "../index";
import { DELETE_CLASS_ID, DELETE_MODES } from "./annotation";
import { ULabelSubtask } from "./subtask";
import { log_message, LogLevel } from "./error_logging";

/**
 * The last non-delete class selected on a subtask, or null for an unknown
 * subtask.
 */
export function get_selected_class_id(ulabel: ULabel, subtask_key: string): number | null {
    const subtask = ulabel.subtasks[subtask_key];
    if (subtask == null) return null;
    return subtask.state.selected_class_id ?? null;
}

/**
 * Set a subtask's active class: id payload, toolbox selection, id-dialog
 * display, per-class mode sync, and — on subtasks with `focus_active_class` —
 * the class focus. Selecting a class while an annotation is active/hovered
 * reassigns that annotation, matching the toolbox-button behaviour this
 * replaces. For a non-current subtask only state is written; `set_subtask`
 * reconciles the DOM on activation.
 *
 * @param ulabel ULabel instance
 * @param class_id class to select (the reserved delete class is accepted but
 *     never becomes the remembered selection, so focus freezes across it)
 * @param subtask_key defaults to the current subtask
 * @param redraw whether a focus change repaints immediately
 * @returns whether the class was accepted
 */
export function set_active_class(
    ulabel: ULabel,
    class_id: number,
    subtask_key: string | null = null,
    redraw: boolean = true,
): boolean {
    subtask_key ??= ulabel.get_current_subtask_key();
    const subtask = ulabel.subtasks[subtask_key];
    if (subtask === undefined) {
        log_message(`set_active_class: unknown subtask key ${subtask_key}`, LogLevel.WARNING, true);
        return false;
    }
    // class_defs rather than class_ids so the reserved delete class validates
    if (!subtask.class_defs.some((class_def) => class_def.id === class_id)) {
        log_message(
            `set_active_class: class id ${class_id} is not in subtask ${subtask_key}`,
            LogLevel.WARNING,
            true,
        );
        return false;
    }

    const previous_selected = subtask.state.selected_class_id ?? null;
    if (class_id !== DELETE_CLASS_ID) {
        subtask.state.selected_class_id = class_id;
    }

    if (subtask_key === ulabel.get_current_subtask_key()) {
        apply_active_class_to_dom(ulabel, subtask_key, class_id);
    } else {
        // Non-current (or pre-init) subtask: write the payload state now so the
        // selection can't drift from what new annotations would get; the DOM
        // reconciles when the subtask becomes current.
        write_id_payload(subtask, class_id);
    }

    // Focus follows the selection; whatever was hovered or mid-fly-to may no
    // longer be interactive.
    if (
        subtask.focus_active_class &&
        class_id !== DELETE_CLASS_ID &&
        previous_selected !== class_id
    ) {
        subtask.state.hovered_annid = null;
        subtask.state.fly_to_idx = null;
        if (redraw) {
            ulabel.redraw_all_annotations(subtask_key);
            // Toolbox items filter on the focus, so they go stale otherwise.
            ulabel.toolbox?.redraw_update_items(ulabel);
        }
    }
    return true;
}

/**
 * Turn focus-follows-active-class on or off for a subtask at runtime.
 *
 * @param ulabel ULabel instance
 * @param subtask_key subtask to toggle
 * @param enabled whether the selected class should also be the focused class
 * @param redraw whether the change repaints immediately
 */
export function set_focus_active_class(
    ulabel: ULabel,
    subtask_key: string,
    enabled: boolean,
    redraw: boolean = true,
): void {
    const subtask = ulabel.subtasks[subtask_key];
    if (subtask === undefined) {
        log_message(`set_focus_active_class: unknown subtask key ${subtask_key}`, LogLevel.WARNING, true);
        return;
    }
    subtask.focus_active_class = enabled === true;

    // What's hovered or mid-fly-to may have just gained or lost interactivity
    subtask.state.hovered_annid = null;
    subtask.state.fly_to_idx = null;

    if (redraw) {
        ulabel.redraw_all_annotations(subtask_key);
        ulabel.toolbox?.redraw_update_items(ulabel);
    }
}

/**
 * Opacity for annotations outside the focused class. 0 skips drawing them
 * entirely, which is cheaper but loses them as visual context.
 *
 * @param ulabel ULabel instance
 * @param subtask_key subtask to adjust
 * @param opacity clamped to 0..1
 * @param redraw whether the change repaints immediately
 */
export function set_defocused_opacity(
    ulabel: ULabel,
    subtask_key: string,
    opacity: number,
    redraw: boolean = true,
): void {
    const subtask = ulabel.subtasks[subtask_key];
    if (subtask === undefined) {
        log_message(`set_defocused_opacity: unknown subtask key ${subtask_key}`, LogLevel.WARNING, true);
        return;
    }
    subtask.state.defocused_opacity = Math.min(Math.max(opacity, 0), 1);
    if (redraw) {
        ulabel.redraw_all_annotations(subtask_key);
    }
}

/**
 * Point a subtask's id payload at one class (full confidence, others zero).
 * Equivalent to `set_id_dialog_payload_nopin(idx, 1.0)` but subtask-scoped.
 */
function write_id_payload(subtask: ULabelSubtask, class_id: number): void {
    const class_ids = subtask.class_ids;
    const selected_index = class_ids.indexOf(class_id);
    for (let i = 0; i < class_ids.length; i++) {
        subtask.state.id_payload[i] = {
            class_id: class_ids[i],
            confidence: i === selected_index ? 1.0 : 0.0,
        };
    }
}

/**
 * The DOM half of a selection change on the current subtask: toolbox `sel`
 * swap, id payload, dialog display, active-annotation reclass, delete
 * re-toggle, and mode sync. Extracted from the toolbox button click handler.
 */
function apply_active_class_to_dom(ulabel: ULabel, subtask_key: string, class_id: number): void {
    const subtask = ulabel.subtasks[subtask_key];
    const pfx = "div#tb-id-app--" + subtask_key;
    const current_id_button = $(pfx + " a.tbid-opt.sel");
    const old_id_attr = current_id_button.attr("id");
    const old_id = old_id_attr === undefined ? null : parseInt(old_id_attr.split("_").at(-1)!);
    // Re-selecting the current class is a no-op, matching the old handler's
    // href gate; notably it leaves a caller-written `id_payload` intact.
    if (old_id === class_id) return;

    current_id_button.attr("href", "#");
    current_id_button.removeClass("sel");
    const target_button = $(pfx + ` a#toolbox_sel_${class_id}`);
    target_button.addClass("sel");
    target_button.removeAttr("href");

    ulabel.set_id_dialog_payload_nopin(subtask.class_ids.indexOf(class_id), 1.0);
    ulabel.update_id_dialog_display();

    // Update the class of the active annotation,
    // except when toggling on the delete class or in a read-only subtask
    if (class_id !== DELETE_CLASS_ID && !ulabel.is_current_subtask_read_only()) {
        let target_id: string | null = null;
        if (subtask.state.active_id !== null) {
            target_id = subtask.state.active_id;
        } else if (subtask.state.move_candidate !== null) {
            target_id = subtask.state.move_candidate["annid"];
        }
        if (target_id !== null) {
            // Set the annotation's class to the selected class
            ulabel.handle_id_dialog_click(
                ulabel.state["last_move"],
                target_id,
                ulabel.get_active_class_id_idx(),
            );
        } else {
            // No active annotation; still update the brush circle if in brush mode
            ulabel.recolor_brush_circle();
        }
    }

    /*
    If switching off the delete class while still in delete mode, re-select the
    delete class. This occurs when a keybind changes a hovered annotation's
    class while in delete mode.
    */
    if (
        old_id === DELETE_CLASS_ID &&
        DELETE_MODES.includes(subtask.state.annotation_mode)
    ) {
        set_active_class(ulabel, DELETE_CLASS_ID, subtask_key);
    }

    ulabel.sync_annotation_modes_to_active_class();
}
