/**
 * Multi-selection of annotations in the current subtask, the target of bulk
 * actions. View-only state like isolation: nothing is recorded and `edited`
 * is untouched. A selection only ever holds live, in-focus, 2D spatial
 * annotations; anything that stops qualifying (deleted, deprecated, dimmed,
 * isolated out, filtered, layer hidden) drops out on the next refresh, and is never drawn
 * as selected meanwhile.
 */

import type { ULabel } from "../index";
import { DELETE_MODES, MODES_3D, NONSPATIAL_MODES, ULabelAnnotation } from "./annotation";
import { log_message, LogLevel } from "./error_logging";

export type SelectionHow = "replace" | "add" | "remove" | "toggle";

const INDICATOR_ID = "annotation-selection-indicator";
const STYLE_ID = "annotation-selection-indicator-styles";
const ACTIVE_BODY_CLASS = "ulabel-selection-active";

/**
 * Whether an annotation can be part of a selection.
 *
 * @param ulabel ULabel instance
 * @param annotation the annotation
 * @param subtask_key its subtask
 */
export function is_annotation_selectable(
    ulabel: ULabel,
    annotation: ULabelAnnotation | null | undefined,
    subtask_key: string,
): boolean {
    const subtask = ulabel.subtasks[subtask_key];
    if (subtask == null || annotation == null || annotation.deprecated) return false;
    if (ulabel.is_subtask_hidden(subtask_key)) return false;
    const spatial_type = annotation.spatial_type!;
    if (NONSPATIAL_MODES.includes(spatial_type) || MODES_3D.includes(spatial_type) || DELETE_MODES.includes(spatial_type)) {
        return false;
    }
    if (subtask.state.active_id === annotation.id) return false;
    return !ulabel.is_annotation_defocused(annotation, subtask_key);
}

/**
 * Whether an annotation is selected (and still selectable) in its subtask.
 *
 * @param ulabel ULabel instance
 * @param annotation the annotation
 * @param subtask_key defaults to the current subtask
 */
export function is_annotation_selected(
    ulabel: ULabel,
    annotation: ULabelAnnotation,
    subtask_key: string | null = null,
): boolean {
    const key = subtask_key ?? ulabel.get_current_subtask_key();
    const selected = ulabel.subtasks[key]?.state.selected_ids;
    if (selected == null || selected.size === 0 || !selected.has(annotation.id!)) return false;
    return is_annotation_selectable(ulabel, annotation, key);
}

/**
 * Ids of the selected annotations, in the subtask's annotation order.
 *
 * @param ulabel ULabel instance
 * @param subtask_key defaults to the current subtask
 */
export function get_selected_annotation_ids(ulabel: ULabel, subtask_key: string | null = null): string[] {
    const key = subtask_key ?? ulabel.get_current_subtask_key();
    refresh_selection(ulabel, key);
    const subtask = ulabel.subtasks[key];
    const selected = subtask?.state.selected_ids;
    if (selected == null || selected.size === 0) return [];
    return subtask.annotations.ordering.filter((id) => selected.has(id));
}

/**
 * Change the selection. Ids that can't be selected are ignored.
 *
 * @param ulabel ULabel instance
 * @param annotation_ids ids to apply
 * @param how replace the selection, add to it, remove from it, or toggle each id
 * @param subtask_key defaults to the current subtask
 * @returns the selected ids afterwards
 */
export function select_annotations(
    ulabel: ULabel,
    annotation_ids: string[],
    how: SelectionHow = "replace",
    subtask_key: string | null = null,
): string[] {
    const key = subtask_key ?? ulabel.get_current_subtask_key();
    const subtask = ulabel.subtasks[key];
    if (subtask == null) {
        log_message(`select_annotations: unknown subtask key ${key}`, LogLevel.WARNING, true);
        return [];
    }
    const selected = subtask.state.selected_ids;
    const before = new Set(selected);
    if (how === "replace") selected.clear();
    for (const id of annotation_ids) {
        if (how === "remove") {
            selected.delete(id);
        } else if (how === "toggle" && selected.has(id)) {
            selected.delete(id);
        } else if (is_annotation_selectable(ulabel, subtask.annotations.access[id], key)) {
            selected.add(id);
        }
    }
    commit_selection_change(ulabel, key, before);
    return get_selected_annotation_ids(ulabel, key);
}

/**
 * Select every selectable annotation in a subtask.
 *
 * @param ulabel ULabel instance
 * @param subtask_key defaults to the current subtask
 * @returns the selected ids
 */
export function select_all_annotations(ulabel: ULabel, subtask_key: string | null = null): string[] {
    const key = subtask_key ?? ulabel.get_current_subtask_key();
    const subtask = ulabel.subtasks[key];
    if (subtask == null) return [];
    return select_annotations(ulabel, subtask.annotations.ordering, "replace", key);
}

/**
 * Empty a subtask's selection.
 *
 * @param ulabel ULabel instance
 * @param subtask_key defaults to the current subtask
 */
export function clear_selection(ulabel: ULabel, subtask_key: string | null = null): void {
    const key = subtask_key ?? ulabel.get_current_subtask_key();
    if ((ulabel.subtasks[key]?.state.selected_ids.size ?? 0) === 0) return;
    select_annotations(ulabel, [], "replace", key);
}

/**
 * Drop ids that are no longer selectable, then update the indicator.
 *
 * @param ulabel ULabel instance
 * @param subtask_key defaults to every subtask
 */
export function refresh_selection(ulabel: ULabel, subtask_key: string | null = null): void {
    const keys = subtask_key === null ? Object.keys(ulabel.subtasks) : [subtask_key];
    for (const key of keys) {
        const subtask = ulabel.subtasks[key];
        const selected = subtask?.state?.selected_ids;
        if (selected == null || selected.size === 0) continue;
        const before = new Set(selected);
        for (const id of Array.from(before)) {
            if (!is_annotation_selectable(ulabel, subtask.annotations.access[id], key)) {
                selected.delete(id);
            }
        }
        commit_selection_change(ulabel, key, before);
    }
}

/**
 * Redraw what changed, update the indicator, and notify the host.
 */
function commit_selection_change(ulabel: ULabel, subtask_key: string, before: Set<string>): void {
    const subtask = ulabel.subtasks[subtask_key];
    const after = subtask.state.selected_ids;
    const changed = Array.from(before).filter((id) => !after.has(id))
        .concat(Array.from(after).filter((id) => !before.has(id)));
    if (changed.length === 0) return;

    // One redraw per canvas: redraw_annotation repaints the annotation's whole canvas
    const canvases = new Map<string, string>();
    for (const id of changed) {
        const annotation = subtask.annotations.access[id];
        if (annotation?.canvas_id != null && !canvases.has(annotation.canvas_id)) {
            canvases.set(annotation.canvas_id, id);
        }
    }
    canvases.forEach((id) => ulabel.redraw_annotation(id, subtask_key));

    sync_annotation_list_selection(ulabel, subtask_key);
    update_selection_indicator(ulabel);
    ulabel.config.on_selection_change?.(subtask_key, subtask.annotations.ordering.filter((id) => after.has(id)));
}

/**
 * Toggle the `selected` class on rendered annotation list rows in place, so the list isn't rebuilt.
 */
function sync_annotation_list_selection(ulabel: ULabel, subtask_key: string): void {
    if (subtask_key !== ulabel.get_current_subtask_key()) return;
    const selected = ulabel.subtasks[subtask_key].state.selected_ids;
    document.querySelectorAll<HTMLElement>(".annotation-list-item").forEach((row) => {
        row.classList.toggle("selected", selected.has(row.dataset.annotationId ?? ""));
    });
}

function ensure_indicator_styles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    // Same look and spot as the fly-to toast, which moves below it while a selection exists
    style.textContent = `
        .${ACTIVE_BODY_CLASS} .annotation-navigation-toast {
            top: 76px;
        }

        .annotation-selection-indicator {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            pointer-events: none;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            white-space: nowrap;
        }

        .ulabel-night .annotation-selection-indicator {
            background-color: rgba(255, 255, 255, 0.9);
            color: black;
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
        }
    `;
    document.head.appendChild(style);
}

/**
 * Show `N selected` for the current subtask while its
 * selection is non-empty; hide it otherwise.
 *
 * @param ulabel ULabel instance
 */
export function update_selection_indicator(ulabel: ULabel): void {
    const key = ulabel.get_current_subtask_key();
    const subtask = ulabel.subtasks[key];
    const count = subtask?.state?.selected_ids?.size ?? 0;
    let indicator = document.getElementById(INDICATOR_ID);
    if (count === 0) {
        remove_selection_indicator();
        return;
    }
    if (indicator == null) {
        ensure_indicator_styles();
        indicator = document.createElement("div");
        indicator.id = INDICATOR_ID;
        indicator.className = "annotation-selection-indicator";
        document.body.appendChild(indicator);
    }
    document.body.classList.add(ACTIVE_BODY_CLASS);
    indicator.textContent = `${count} selected`;
}

/**
 * Remove the indicator and let the fly-to toast return to its spot.
 */
export function remove_selection_indicator(): void {
    document.getElementById(INDICATOR_ID)?.remove();
    document.body.classList.remove(ACTIVE_BODY_CLASS);
}
