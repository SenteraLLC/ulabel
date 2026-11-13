/**
 * Multi-selection of annotations in the current subtask, the target of bulk
 * actions. View-only state like isolation: nothing is recorded and `edited`
 * is untouched. A selection only ever holds in-focus, 2D spatial annotations
 * (live ones, or under deprecated focus deprecated ones); anything that stops
 * qualifying (deleted, deprecated, restored, dimmed, isolated out, filtered,
 * layer hidden) drops out on the next refresh, and is never drawn
 * as selected meanwhile.
 */

import type { ULabel, ULabelContainingBox } from "../index";
import { DELETE_MODES, MODES_3D, NONSPATIAL_MODES, ULabelAnnotation } from "./annotation";
import { log_message, LogLevel } from "./error_logging";
import { GeometricUtils, Point2D, ULabelSpatialPayload2D } from "./geometric_utils";

export type SelectionHow = "replace" | "add" | "remove" | "toggle";

const INDICATOR_ID = "annotation-selection-indicator";
const STYLE_ID = "annotation-selection-indicator-styles";
const ACTIVE_BODY_CLASS = "ulabel-selection-active";

// The box drag in progress per ULabel instance, so refreshes can prune its starting
// selection and notifications can update what its host last heard
const active_boxes = new WeakMap<ULabel, SelectBox>();

// A Ctrl+left drag shorter than this (screen px) is a selection click, not a selection box
export const CLICK_MOVE_TOLERANCE_PX = 4;

/**
 * Whether an annotation can be part of a selection. Deprecated annotations
 * are selectable only under deprecated focus, and then only they are (see
 * `is_annotation_defocused`).
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
    if (subtask == null || annotation == null) return false;
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
    if (!selected?.has(annotation.id!)) return false;
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
    if (!selected?.size) return [];
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
    const box = active_boxes.get(ulabel);
    for (const key of keys) {
        const subtask = ulabel.subtasks[key];
        // A box in progress would otherwise restore what was pruned when it previews or cancels
        if (box?.subtask_key === key && subtask != null) {
            box.base.forEach((id) => {
                if (!is_annotation_selectable(ulabel, subtask.annotations.access[id], key)) box.base.delete(id);
            });
        }
        const selected = subtask?.state?.selected_ids;
        if (!selected?.size) continue;
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
 * Redraw what changed, update the indicator, and (unless `notify` is false) notify the host.
 */
function commit_selection_change(ulabel: ULabel, subtask_key: string, before: Set<string>, notify: boolean = true): void {
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
    if (notify) notify_selection_change(ulabel, subtask_key);
}

function notify_selection_change(ulabel: ULabel, subtask_key: string): void {
    const subtask = ulabel.subtasks[subtask_key];
    const selected = subtask.state.selected_ids;
    const box = active_boxes.get(ulabel);
    if (box?.subtask_key === subtask_key) box.reported = new Set(selected);
    ulabel.config.on_selection_change?.(subtask_key, subtask.annotations.ordering.filter((id) => selected.has(id)));
}

/**
 * Whether any part of an annotation touches a rectangle (image coordinates, normalised).
 */
function annotation_touches_rect(ulabel: ULabel, annotation: ULabelAnnotation, rect: Pick<ULabelContainingBox, "tlx" | "tly" | "brx" | "bry">): boolean {
    const payload = annotation.spatial_payload;
    const box = annotation.containing_box;
    // A tbar's containing box covers only its stem, not the cross bar; a bitmask's lists pixel indices
    if (annotation.spatial_type !== "tbar" && annotation.spatial_type !== "bitmask" && box != null && !GeometricUtils.rects_overlap(box, rect)) {
        return false;
    }
    switch (annotation.spatial_type) {
        case "point":
            return GeometricUtils.point_is_within_rect(payload[0], rect);
        case "bbox": {
            const [[x0, y0], [x1, y1]] = payload as ULabelSpatialPayload2D;
            return GeometricUtils.rects_overlap(
                { tlx: Math.min(x0, x1), tly: Math.min(y0, y1), brx: Math.max(x0, x1), bry: Math.max(y0, y1) },
                rect,
            );
        }
        case "tbar": {
            const [sp, ep] = payload as ULabelSpatialPayload2D;
            return (
                GeometricUtils.segment_intersects_rect(sp, ep, rect) ||
                GeometricUtils.path_touches_rect(GeometricUtils.tbar_cross_segment(sp, ep), rect)
            );
        }
        case "polyline":
        case "contour":
            return GeometricUtils.path_touches_rect(payload, rect);
        case "polygon": {
            const layers = payload as ULabelSpatialPayload2D[];
            if (layers.some((layer) => GeometricUtils.path_touches_rect(layer, rect, true))) return true;
            // No edge touches: the rectangle may still sit wholly inside a filled region
            const corner: Point2D = [rect.tlx, rect.tly];
            const holes = annotation.spatial_payload_holes ?? [];
            const children = annotation.spatial_payload_child_indices ?? [];
            return layers.some((layer, i) =>
                holes[i] !== true &&
                GeometricUtils.point_is_within_ring(corner, layer) &&
                !(children[i] ?? []).some((j) => layers[j] != null && GeometricUtils.point_is_within_ring(corner, layers[j])),
            );
        }
        case "bitmask": {
            // Pixel x covers [x, x + 1), so the rectangle touches pixels floor(tlx)..floor(brx)
            const pixels = {
                tlx: Math.floor(rect.tlx),
                tly: Math.floor(rect.tly),
                brx: Math.floor(rect.brx),
                bry: Math.floor(rect.bry),
            };
            if (box != null && !GeometricUtils.rects_overlap(box, pixels)) return false;
            return ulabel.get_bitmask(annotation).has_foreground_in_box(pixels);
        }
        default:
            return false;
    }
}

/**
 * Ids of selectable annotations on the current frame that touch a rectangle, in annotation order.
 *
 * @param ulabel ULabel instance
 * @param rect rectangle in image coordinates; corners may be in any order
 * @param subtask_key defaults to the current subtask
 */
export function get_annotation_ids_in_rect(ulabel: ULabel, rect: Pick<ULabelContainingBox, "tlx" | "tly" | "brx" | "bry">, subtask_key: string | null = null): string[] {
    const key = subtask_key ?? ulabel.get_current_subtask_key();
    const subtask = ulabel.subtasks[key];
    if (subtask == null) return [];
    const norm: Pick<ULabelContainingBox, "tlx" | "tly" | "brx" | "bry"> = {
        tlx: Math.min(rect.tlx, rect.brx),
        tly: Math.min(rect.tly, rect.bry),
        brx: Math.max(rect.tlx, rect.brx),
        bry: Math.max(rect.tly, rect.bry),
    };
    const current_frame = ulabel.state.current_frame;
    const ids: string[] = [];
    for (const id of subtask.annotations.ordering) {
        const annotation = subtask.annotations.access[id];
        if (!is_annotation_selectable(ulabel, annotation, key)) continue;
        // Keep `!=` loose: frames may be null, undefined, or stringly typed
        if (annotation.frame != null && annotation.frame != current_frame) continue;
        if (annotation_touches_rect(ulabel, annotation, norm)) ids.push(id);
    }
    return ids;
}

/**
 * A Ctrl+drag selection box in progress: the selection it started from (so
 * previews can be rebuilt from it) and its on-screen state.
 */
interface SelectBox {
    subtask_key: string;
    base: Set<string>;
    // Deselect what the box touches instead of adding it
    remove: boolean;
    // The selection the host last heard of for this subtask; unlike `base`, never pruned
    reported: Set<string>;
    // Image-space corners
    start: Point2D;
    end: Point2D | null;
    // Not created until the mouse moves past the click tolerance
    element: HTMLDivElement | null;
    frame_request: number | null;
}
/**
 * Box select: show the box's `base` plus (or, when `remove`, minus) the
 * `caught` ids as the selection. Base ids that stopped being selectable during
 * the drag are dropped for good. Intermediate calls redraw without notifying
 * the host; the `final` call notifies once if the selection differs from what
 * the host last heard. Cancel with `caught` empty and `final` true.
 *
 * @param ulabel ULabel instance
 * @param box the box in progress
 * @param caught ids the box currently touches
 * @param final whether the box is done
 */
function preview_box_selection(
    ulabel: ULabel,
    box: SelectBox,
    caught: string[],
    final: boolean = false,
): void {
    const key = box.subtask_key;
    const subtask = ulabel.subtasks[key];
    if (subtask == null) return;
    const base = box.base;
    const selected = subtask.state.selected_ids;
    const before = new Set(selected);
    selected.clear();
    base.forEach((id) => {
        if (is_annotation_selectable(ulabel, subtask.annotations.access[id], key)) {
            selected.add(id);
        } else {
            base.delete(id);
        }
    });
    for (const id of caught) {
        if (box.remove) {
            selected.delete(id);
        } else if (is_annotation_selectable(ulabel, subtask.annotations.access[id], key)) {
            selected.add(id);
        }
    }
    commit_selection_change(ulabel, key, before, false);
    if (!final) return;
    const reported = box.reported;
    if (selected.size !== reported.size || Array.from(selected).some((id) => !reported.has(id))) {
        notify_selection_change(ulabel, key);
    }
}

type PointerEvent2D = JQuery.TriggeredEvent | MouseEvent;

function moved_past_click(ulabel: ULabel, mouse_event: PointerEvent2D): boolean {
    const [start_x, start_y] = ulabel.drag_state.select_box.mouse_start!;
    return Math.hypot(mouse_event.clientX! - start_x, mouse_event.clientY! - start_y) > CLICK_MOVE_TOLERANCE_PX;
}

/**
 * A Ctrl+left click: toggle the hovered annotation in the selection, or just
 * deselect it when `remove`. The hover outline is held off until the mouse
 * moves so the result shows.
 *
 * @param ulabel ULabel instance
 * @param mouse_event the click
 * @param remove deselect only
 */
export function toggle_selection_on_ctrl_click(ulabel: ULabel, mouse_event: PointerEvent2D, remove: boolean = false): void {
    if (ulabel.drag_state.release_button !== 0) return;
    // Hover resolves lazily; re-resolve under the cursor like the context menu does
    ulabel.suggest_edits(mouse_event as JQuery.TriggeredEvent);
    const edit_candidate = ulabel.get_current_subtask().state.edit_candidate;
    if (edit_candidate == null) return;
    ulabel.select_annotations([edit_candidate.annid], remove ? "remove" : "toggle");
    ulabel.suppress_hover_until_move(mouse_event);
}

/**
 * Start a Ctrl+drag selection box (Ctrl+Shift deselects; fixed at mousedown).
 * Nothing is drawn until the mouse moves past the click tolerance, so a plain
 * Ctrl+click still toggles.
 *
 * @param ulabel ULabel instance
 * @param mouse_event the mousedown
 */
export function begin_select_box(ulabel: ULabel, mouse_event: PointerEvent2D): void {
    cancel_select_box(ulabel);
    const key = ulabel.get_current_subtask_key();
    refresh_selection(ulabel, key);
    const selected = ulabel.subtasks[key]?.state.selected_ids ?? [];
    const event = mouse_event as JQuery.TriggeredEvent;
    active_boxes.set(ulabel, {
        subtask_key: key,
        base: new Set(selected),
        remove: mouse_event.shiftKey === true,
        reported: new Set(selected),
        start: [ulabel.get_global_mouse_x(event), ulabel.get_global_mouse_y(event)],
        end: null,
        element: null,
        frame_request: null,
    });
}

/**
 * Grow the box to the mouse and preview what it catches, at most once per frame.
 *
 * @param ulabel ULabel instance
 * @param mouse_event the mousemove
 */
export function continue_select_box(ulabel: ULabel, mouse_event: PointerEvent2D): void {
    const box = active_boxes.get(ulabel);
    if (box == null) return;
    if (box.element === null) {
        if (!moved_past_click(ulabel, mouse_event)) return;
        box.element = create_select_box_element(box.remove);
        document.body.appendChild(box.element);
    }
    const event = mouse_event as JQuery.TriggeredEvent;
    box.end = [ulabel.get_global_mouse_x(event), ulabel.get_global_mouse_y(event)];
    position_select_box(ulabel, box);
    if (box.frame_request === null) {
        box.frame_request = requestAnimationFrame(() => {
            box.frame_request = null;
            if (active_boxes.get(ulabel) !== box) return;
            preview_box_selection(ulabel, box, get_select_box_ids(ulabel, box), false);
        });
    }
}

/**
 * Apply the box on mouseup; a box that never moved past the click tolerance is a click.
 *
 * @param ulabel ULabel instance
 * @param mouse_event the mouseup
 */
export function finish_select_box(ulabel: ULabel, mouse_event: PointerEvent2D): void {
    const box = active_boxes.get(ulabel);
    if (box == null) return;
    if (box.element === null && !moved_past_click(ulabel, mouse_event)) {
        remove_select_box(ulabel);
        toggle_selection_on_ctrl_click(ulabel, mouse_event, box.remove);
        return;
    }
    const event = mouse_event as JQuery.TriggeredEvent;
    box.end = [ulabel.get_global_mouse_x(event), ulabel.get_global_mouse_y(event)];
    const caught = get_select_box_ids(ulabel, box);
    remove_select_box(ulabel);
    preview_box_selection(ulabel, box, caught, true);
}

/**
 * Abandon an in-progress selection box and restore the selection it started from.
 *
 * @param ulabel ULabel instance
 * @returns whether a box was cancelled
 */
export function cancel_select_box(ulabel: ULabel): boolean {
    const box = active_boxes.get(ulabel);
    if (box == null) return false;
    remove_select_box(ulabel);
    if (ulabel.subtasks[box.subtask_key] != null) {
        preview_box_selection(ulabel, box, [], true);
    }
    if (ulabel.drag_state.active_key === "select_box") {
        ulabel.drag_state.active_key = null;
        ulabel.drag_state.release_button = null;
    }
    return true;
}

/**
 * Drop the box and its element without touching the selection.
 *
 * @param ulabel ULabel instance
 */
export function remove_select_box(ulabel: ULabel): void {
    const box = active_boxes.get(ulabel);
    if (box == null) return;
    if (box.frame_request !== null) cancelAnimationFrame(box.frame_request);
    box.element?.remove();
    active_boxes.delete(ulabel);
}

export function has_select_box(ulabel: ULabel): boolean {
    return active_boxes.has(ulabel);
}

function create_select_box_element(remove: boolean): HTMLDivElement {
    const element = document.createElement("div");
    element.className = remove ? "ulabel-select-box ulabel-select-box-remove" : "ulabel-select-box";
    Object.assign(element.style, {
        position: "fixed",
        border: remove ? "1px dashed #ff6b6b" : "1px dashed white",
        boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.6)",
        background: remove ? "rgba(255, 80, 80, 0.12)" : "rgba(255, 255, 255, 0.1)",
        pointerEvents: "none",
        zIndex: "9999",
    });
    return element;
}

function get_select_box_ids(ulabel: ULabel, box: SelectBox): string[] {
    const [start, end] = [box.start, box.end!];
    return get_annotation_ids_in_rect(ulabel, { tlx: start[0], tly: start[1], brx: end[0], bry: end[1] }, box.subtask_key);
}

// Place the box from its image-space corners, so it tracks the image through scroll and zoom
function position_select_box(ulabel: ULabel, box: SelectBox): void {
    const [start, end] = [box.start, box.end!];
    const scale = ulabel.get_empirical_scale();
    const origin = ulabel.get_annbox_content_origin();
    Object.assign(box.element!.style, {
        left: `${origin.left - window.scrollX + Math.min(start[0], end[0]) * scale}px`,
        top: `${origin.top - window.scrollY + Math.min(start[1], end[1]) * scale}px`,
        width: `${Math.abs(end[0] - start[0]) * scale}px`,
        height: `${Math.abs(end[1] - start[1]) * scale}px`,
    });
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
