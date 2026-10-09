import type {
    Offset,
    ULabelAction,
    ULabelActionRaw,
    ULabelActionType,
    ULabelAnnotationChange,
} from "../index";
import { ULabel } from "../src/index";
import { FilterPointDistanceFromRow } from "./toolbox";
import { AllowedToolboxItem } from "./configuration";
import { filter_points_distance_from_line } from "./annotation_operators";
import { NONSPATIAL_MODES } from "./annotation";

import { log_message, LogLevel } from "./error_logging";

// ================= Record Actions =================

/**
 * Record an action in the action stream to allow undo/redo functionality.
 * Also trigger any listeners associated with the action.
 *
 * @param ulabel ULabel instance
 * @param raw_action action to record
 * @param is_redo whether ulabel action is a redo or not
 * @param add_to_action_stream whether to add the action to the action stream
 * @param subtask_key subtask whose stream receives the action; defaults to the current subtask
 */
export function record_action(
    ulabel: ULabel,
    raw_action: ULabelActionRaw,
    is_redo: boolean = false,
    add_to_action_stream: boolean = true,
    subtask_key: string | null = null,
) {
    ulabel.set_saved(false);
    const current_subtask = ulabel.subtasks[subtask_key ?? ulabel.get_current_subtask_key()];
    const annotation = current_subtask.annotations.access[raw_action.annotation_id!];

    // After a new action, you can no longer redo old actions
    if (add_to_action_stream && !is_redo) {
        current_subtask.actions.undone_stack = [];
    }

    // Stringify the undo/redo payloads
    const act_type = raw_action.act_type;
    // A collapsed action inherits the stamp of the action it replaces; null is a valid loaded baseline
    let prev_timestamp: string | null = annotation?.last_edited_at || null;
    if (raw_action.prev_timestamp !== undefined) {
        prev_timestamp = raw_action.prev_timestamp;
    }
    let prev_user: string = annotation?.last_edited_by || "unknown";
    if (raw_action.prev_user !== undefined) {
        prev_user = raw_action.prev_user;
    }
    const action: ULabelAction = {
        act_type: act_type,
        annotation_id: raw_action.annotation_id,
        frame: raw_action.frame,
        undo_payload: JSON.stringify(raw_action.undo_payload),
        redo_payload: JSON.stringify(raw_action.redo_payload),
        prev_timestamp: prev_timestamp,
        prev_user: prev_user,
    } as ULabelAction;

    const affected = raw_action.affected ?? [];
    const affected_annotations = affected.map(
        ({ annotation_id, subtask_key }) => ulabel.subtasks[subtask_key]?.annotations.access[annotation_id],
    );
    if (affected.length > 0) {
        action.affected = affected;
        action.affected_prev = affected_annotations.map((ann) => ({
            prev_timestamp: ann?.last_edited_at || null,
            prev_user: ann?.last_edited_by || "unknown",
        })) as ULabelAction["affected_prev"];
    }

    // Add to stream
    if (add_to_action_stream) {
        current_subtask.actions.stream.push(action);

        // For some redo actions the annotation may no longer exist
        const now = ULabel.get_time();
        for (const ann of [annotation, ...affected_annotations]) {
            if (ann !== undefined) {
                ann.last_edited_at = now;
                ann.last_edited_by = ulabel.config.username;
            }
        }
    }

    // Trigger any listeners for the action
    trigger_action_listeners(ulabel, action, false, is_redo);
    // Off-stream recordings are sub-steps of a compound action (the delete inside a
    // move), which reports itself; finish_* are the exception since begin_* is silent.
    // A redone begin_annotation re-runs finish_annotation itself and is already reported.
    const is_substep = !add_to_action_stream &&
        !(FINISH_OFF_STREAM.includes(action.act_type) && !is_redo) &&
        !IN_PROGRESS.includes(action.act_type);
    if (!is_substep) {
        emit_annotation_change(ulabel, action, is_redo ? "redo" : "do", subtask_key ?? ulabel.get_current_subtask_key());
    }
};

// Actions that touch nothing committed until a later action; reported only on undo/redo.
// Polygon simplify/merge only ever run inside finish_annotation, which collapses
// them off the stream and reports the final geometry itself.
const UNCOMMITTED_ON_DO: ULabelActionType[] = [
    "begin_annotation",
    "begin_edit",
    "begin_move",
    "begin_brush",
    "start_complex_polygon",
    "create_nonspatial_annotation",
    "simplify_polygon_complex_layer",
    "merge_polygon_complex_layer",
];
const IN_PROGRESS: ULabelActionType[] = [
    "continue_annotation",
    "continue_edit",
    "continue_move",
    "continue_brush",
    "continue_bitmask",
];
// bbox/point/etc. finish off-stream (the begin_annotation is what gets collapsed)
const FINISH_OFF_STREAM: ULabelActionType[] = ["finish_annotation", "finish_edit", "finish_move"];

/**
 * Notify the host's `on_annotation_change` callback of a recorded, undone, or redone action.
 *
 * @param ulabel ULabel instance
 * @param action the action
 * @param kind whether the action was done, undone, or redone
 * @param subtask_key subtask whose stream holds the action
 */
function emit_annotation_change(
    ulabel: ULabel,
    action: ULabelAction,
    kind: ULabelAnnotationChange["kind"],
    subtask_key: string,
) {
    const callback = ulabel.config.on_annotation_change;
    if (callback === null) return;
    const act_type = action.act_type;
    if (act_type === "edit_text_payload") return;
    if (IN_PROGRESS.includes(act_type) && !ulabel.config.on_annotation_change_in_progress) return;
    if (kind === "do" && UNCOMMITTED_ON_DO.includes(act_type)) return;

    let previous_classification_payloads = null;
    if (act_type === "assign_annotation_id") {
        // Undo removes the new payload; do/redo remove the old one
        previous_classification_payloads = kind === "undo" ?
            JSON.parse(action.redo_payload).new_id_payload :
            JSON.parse(action.undo_payload).old_id_payload;
    }
    const change: ULabelAnnotationChange = {
        subtask_key,
        annotation_id: action.annotation_id,
        act_type,
        kind,
        affected: action.affected ?? [],
        previous_classification_payloads,
        from_subtask_key: kind === "do" ? null : ulabel.state.undo_redo_from_subtask,
    };
    try {
        callback(change);
    } catch (err) {
        log_message(`on_annotation_change callback threw: ${err}`, LogLevel.WARNING, true);
    }
}

/**
 * Finish an action in the action stream.
 *
 * @param ulabel ULabel instance
 * @param active_id ID of the active annotation
 */
export function record_finish(ulabel: ULabel, active_id: string) {
    // Set up constants for convenience
    const current_subtask = ulabel.get_current_subtask();
    const action = current_subtask.actions.stream.pop()!;

    // Parse and complete the redo payload
    const redo_payload = JSON.parse(action.redo_payload);
    redo_payload.init_spatial = current_subtask.annotations.access[active_id].spatial_payload;
    redo_payload.finished = true;
    action.redo_payload = JSON.stringify(redo_payload);

    // Add the completed action back to the stream
    current_subtask.actions.stream.push(action);
}

/**
 * Finish an edit action in the action stream.
 *
 * @param ulabel ULabel instance
 * @param active_id ID of the active annotation
 */
export function record_finish_edit(ulabel: ULabel, active_id: string) {
    // Set up constants for convenience
    const current_subtask = ulabel.get_current_subtask();
    const stream = current_subtask.actions.stream;
    // Iterate backwards through the action stream to find the source "begin_edit" action
    let action: ULabelAction | null = null;
    for (let i = stream.length - 1; i >= 0; i--) {
        if (stream[i].act_type === "begin_edit" && stream[i].annotation_id === active_id) {
            action = stream[i];
            break;
        }
    }

    // If no action was found, log an error and return
    if (action === null) {
        log_message(`No "begin_edit" action found for annotation ID: ${active_id}`, LogLevel.ERROR, true);
        return;
    }

    // Parse and complete the redo payload
    const redo_payload = JSON.parse(action.redo_payload);
    redo_payload.annotation = current_subtask.annotations.access[active_id];
    redo_payload.finished = true;
    action.redo_payload = JSON.stringify(redo_payload);

    // Record action without adding to the action stream
    // The "begin_edit" action in the action stream is what is used to
    // undo/redo the edit
    record_action(ulabel, {
        act_type: "finish_edit",
        annotation_id: active_id,
        frame: ulabel.state.current_frame,
        undo_payload: {},
        redo_payload: {},
    }, false, false);
}

/**
 * Finish a move action in the action stream.
 *
 * @param ulabel ULabel instance
 * @param diffX x-axis translation
 * @param diffY y-axis translation
 * @param diffZ z-axis translation
 * @param move_not_allowed whether the move is not allowed (used when allow_annotations_outside_image = false)
 */
export function record_finish_move(
    ulabel: ULabel,
    diffX: number,
    diffY: number,
    diffZ: number = 0,
    move_not_allowed: boolean = false,
) {
    // Set up constants for convenience
    const current_subtask = ulabel.get_current_subtask();
    const action = current_subtask.actions.stream.pop()!;

    // Parse and complete the redo/undo payloads
    const redo_payload = JSON.parse(action.redo_payload);
    const undo_payload = JSON.parse(action.undo_payload);
    redo_payload.diffX = diffX;
    redo_payload.diffY = diffY;
    redo_payload.diffZ = diffZ;
    undo_payload.diffX = -diffX;
    undo_payload.diffY = -diffY;
    undo_payload.diffZ = -diffZ;
    redo_payload.finished = true;
    redo_payload.move_not_allowed = move_not_allowed;
    undo_payload.move_not_allowed = move_not_allowed;
    action.redo_payload = JSON.stringify(redo_payload);
    action.undo_payload = JSON.stringify(undo_payload);

    // Add the completed action back to the stream
    current_subtask.actions.stream.push(action);

    // Record action without adding to the action stream
    // The "begin_move" action in the action stream is what is used to
    // undo/redo the move
    record_action(ulabel, {
        act_type: "finish_move",
        annotation_id: action.annotation_id!,
        frame: ulabel.state.current_frame,
        undo_payload: {},
        redo_payload: {},
    }, false, false);
};

/**
 * Finish an action in the action stream.
 *
 * @param ulabel ULabel instance
 * @param action Action to finish
 */
function finish_action(ulabel: ULabel, action: ULabelAction) {
    switch (action.act_type) {
        case "begin_annotation":
        case "begin_edit":
        case "begin_move":
            ulabel.end_drag(ulabel.state.last_move);
            break;
        default:
            break;
    }
}

// ================= Action Listeners =================

function trigger_action_listeners(
    ulabel: ULabel,
    action: ULabelAction,
    is_undo: boolean = false,
    is_redo: boolean = false,
) {
    const action_map: Record<ULabelActionType, {
        action?: (ulabel: ULabel, action: ULabelAction) => void;
        undo?: (ulabel: ULabel, action: ULabelAction, is_undo?: boolean) => void;
        redo?: (ulabel: ULabel, action: ULabelAction) => void;
    }> = {
        begin_annotation: {
            action: on_start_annotation_spatial_modification,
            undo: on_annotation_deletion,
        },
        create_nonspatial_annotation: {
            action: on_start_annotation_spatial_modification,
            undo: on_annotation_deletion,
        },
        continue_edit: {
            action: on_in_progress_annotation_spatial_modification,
        },
        continue_move: {
            action: on_in_progress_annotation_spatial_modification,
        },
        continue_brush: {
            action: on_in_progress_annotation_spatial_modification,
        },
        continue_bitmask: {
            action: on_in_progress_annotation_spatial_modification,
        },
        continue_annotation: {
            action: on_in_progress_annotation_spatial_modification,
        },
        create_annotation: {
            action: on_finish_annotation_spatial_modification,
            undo: on_annotation_deletion,
        },
        finish_modify_annotation: {
            action: on_finish_annotation_spatial_modification,
            undo: on_finish_annotation_spatial_modification,
        },
        finish_edit: {
            action: on_finish_annotation_spatial_modification,
        },
        finish_move: {
            action: on_finish_annotation_spatial_modification,
        },
        finish_annotation: {
            action: on_finish_annotation_spatial_modification,
            undo: on_finish_annotation_spatial_modification,
        },
        cancel_annotation: {
            action: on_finish_annotation_spatial_modification,
            undo: on_annotation_revert,
        },
        delete_annotation: {
            action: on_annotation_deletion,
            undo: on_finish_annotation_spatial_modification,
        },
        delete_vertex: {
            action: on_finish_annotation_spatial_modification,
            undo: on_finish_annotation_spatial_modification,
        },
        assign_annotation_id: {
            action: on_annotation_id_change,
            undo: on_annotation_id_change,
        },
        edit_text_payload: {
            action: on_text_payload_change,
            undo: on_text_payload_change,
        },
        begin_edit: {
            undo: on_finish_annotation_spatial_modification,
            redo: on_finish_annotation_spatial_modification,
        },
        begin_move: {
            undo: on_finish_annotation_spatial_modification,
            redo: on_finish_annotation_spatial_modification,
        },
        start_complex_polygon: {
            undo: on_finish_annotation_spatial_modification,
        },
        merge_polygon_complex_layer: {
            undo: on_annotation_revert,
        },
        simplify_polygon_complex_layer: {
            undo: on_annotation_revert,
        },
        begin_brush: {
            undo: on_annotation_revert,
        },
        bitmask_stroke: {
            action: on_finish_annotation_spatial_modification,
            undo: on_finish_annotation_spatial_modification,
        },
        delete_annotations_in_polygon: {
            // No listener for this action.
            // It handles the re-rendering of the affected annotations itself.
        },
        paste_annotation: {
            // The paste redraws itself (its target may not be the current subtask);
            // undo always runs on the current subtask
            undo: on_annotation_deletion,
        },
        move_annotation: {
            // Deleting the source triggers the deletion listener itself; the copy is
            // drawn/removed directly in its own subtask
            undo: on_finish_annotation_spatial_modification,
        },
        delete_counterparts: {
            // Redraws its target subtask itself
        },
    };

    // Call the appropriate listener
    if (action.act_type in action_map) {
        if ((!is_undo && !is_redo && "action" in action_map[action.act_type]) ||
            // For actions without a specific "redo" listener, call the "action" listener instead
            (is_redo && !("redo" in action_map[action.act_type]) && "action" in action_map[action.act_type])
        ) {
            action_map[action.act_type].action!(ulabel, action);
        } else if (is_undo && "undo" in action_map[action.act_type]) {
            action_map[action.act_type].undo!(ulabel, action, is_undo);
        } else if (is_redo && "redo" in action_map[action.act_type]) {
            action_map[action.act_type].redo!(ulabel, action);
        }
    }
}

/**
 * Triggered when an annotation is started.
 *
 * @param ulabel ULabel instance
 * @param action ULabelAction instance
 * @param is_undo whether the action is an undo action
 */
function on_start_annotation_spatial_modification(
    ulabel: ULabel,
    action: ULabelAction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    is_undo: boolean = false,
) {
    // Draw new annotation
    ulabel.draw_annotation_from_id(action.annotation_id!);
}

/**
 * For modes like edit, move, brush, etc, in-progress changes need to be rendered.
 *
 * @param ulabel ULabel instance
 * @param action ULabelAction instance
 * @param is_undo whether the action is an undo action
 */
function on_in_progress_annotation_spatial_modification(
    ulabel: ULabel,
    action: ULabelAction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    is_undo: boolean = false,
) {
    const subtask_key = ulabel.get_current_subtask_key();
    const current_subtask = ulabel.subtasks[subtask_key];
    const offset: Offset = current_subtask.state.move_candidate?.offset || {
        id: action.annotation_id!,
        diffX: 0,
        diffY: 0,
        diffZ: 0,
    };
    // Fast path for in-progress bitmask moves: only the moving mask is redrawn (see begin_bitmask_move).
    const in_progress_ann = current_subtask.annotations.access[action.annotation_id!];
    if (action.act_type === "continue_move" && in_progress_ann?.spatial_type === "bitmask") {
        ulabel.render_bitmask_move(action.annotation_id!, subtask_key, offset);
        ulabel.suggest_edits();
        return;
    }
    // Update the toolbox filter distance
    ulabel.update_filter_distance_during_polyline_move(action.annotation_id!, true, false, offset);
    // Update the annotation rendering
    ulabel.rebuild_containing_box(action.annotation_id!, false, subtask_key);
    ulabel.redraw_annotation(action.annotation_id!, subtask_key, offset);
    // Update dialogs
    ulabel.suggest_edits();
}

/**
 * Triggered when an annotation is modified.
 *
 * @param ulabel ULabel instance
 * @param action Action that was completed
 * @param is_undo whether the action is an undo
 * @param is_redo whether the action is a redo
 */
function on_finish_annotation_spatial_modification(
    ulabel: ULabel,
    action: ULabelAction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    is_undo: boolean = false,
) {
    // Update annotation rendering
    ulabel.rebuild_containing_box(action.annotation_id!);
    ulabel.redraw_annotation(action.annotation_id!);
    // Update dialogs
    ulabel.suggest_edits(null);
    // Update the toolbox
    ulabel.update_filter_distance(action.annotation_id!);
    ulabel.toolbox.redraw_update_items(ulabel);
    // Ensure there are no lingering enders
    ulabel.destroy_polygon_ender(action.annotation_id!);
}

/**
 * Triggered when an annotation is deleted.
 *
 * @param ulabel ULabel instance
 * @param action ULabelAction instance
 * @param is_undo Whether the action is an undo
 */
function on_annotation_deletion(
    ulabel: ULabel,
    action: ULabelAction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    is_undo: boolean = false,
) {
    // Sometimes the annotation is just deprecated, and sometimes it is fully deleted
    // Check if it still exists, because if so we need to redraw
    const current_subtask = ulabel.get_current_subtask();
    const annotations = current_subtask.annotations.access;
    if (action.annotation_id! in annotations) {
        const spatial_type = annotations[action.annotation_id!]?.spatial_type;
        if (NONSPATIAL_MODES.includes(spatial_type!)) {
            // Render the change
            ulabel.clear_nonspatial_annotation(action.annotation_id!);
        } else {
            ulabel.redraw_annotation(action.annotation_id!);
            // Force filter points if necessary
            if (annotations[action.annotation_id!].spatial_type === "polyline") {
                ulabel.update_filter_distance(action.annotation_id!, false, true);
            }
        }
    }

    // Ensure there are no lingering enders
    ulabel.destroy_polygon_ender(action.annotation_id!);
    // Update dialogs
    ulabel.suggest_edits(null);
    // Update the toolbox
    ulabel.toolbox.redraw_update_items(ulabel);
}

/**
 * Triggered when a non-spatial annotation's text payload is changed.
 * Redrawing refreshes the note textarea.
 */
function on_text_payload_change(ulabel: ULabel, action: ULabelAction) {
    ulabel.redraw_annotation(action.annotation_id!);
}

/**
 * Triggered when an annotation ID is changed.
 *
 * @param ulabel ULabel instance
 * @param action ULabelAction instance
 * @param is_undo Whether the action is an undo action
 */
function on_annotation_id_change(
    ulabel: ULabel,
    action: ULabelAction,
    is_undo: boolean = false,
) {
    // Update the annotation rendering
    ulabel.redraw_annotation(action.annotation_id!);
    ulabel.recolor_active_polygon_ender();
    ulabel.recolor_brush_circle();

    // Update dialogs
    if (!is_undo) {
        // Hide the large ID dialog after the user has made a selection
        ulabel.hide_id_dialog();
    }
    ulabel.suggest_edits(null);

    // Determine if we need to update the filter distance
    // If the filter_distance_toolbox_item exists,
    // Check if the FilterDistance ToolboxItem is in this ULabel instance
    if (ulabel.config.toolbox_order.includes(AllowedToolboxItem.FilterDistance)) {
        const spatial_type = ulabel.get_current_subtask().annotations.access[action.annotation_id!].spatial_type;
        if (spatial_type === "polyline") {
            // Get the toolbox item
            const filter_distance_toolbox_item = ulabel.toolbox.items.find((item) => item.get_toolbox_item_type() === "FilterDistance") as FilterPointDistanceFromRow | undefined;
            // filter annotations if in multi_class_mode
            if (
                filter_distance_toolbox_item?.multi_class_mode
            ) {
                filter_points_distance_from_line(ulabel, true);
            }
        }
    }

    // Update toolbox
    ulabel.toolbox.redraw_update_items(ulabel);
}

/**
 * Triggered when an annotation is fully reverted as part of an undo action.
 *
 * @param ulabel ULabel instance
 * @param action ULabelAction instance
 * @param is_undo whether the action is an undo action
 */
function on_annotation_revert(
    ulabel: ULabel,
    action: ULabelAction,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    is_undo: boolean = false,
) {
    // Redraw the annotation
    ulabel.redraw_annotation(action.annotation_id!);
}

// ================= Undo / Redo =================

/**
 * Whether user undo/redo of an action would mutate a read-only subtask.
 *
 * @param ulabel ULabel instance
 * @param action action at the top of the stack
 */
function is_blocked_by_read_only(ulabel: ULabel, action: ULabelAction): boolean {
    if (ulabel.is_current_subtask_read_only()) return true;
    return (action.affected ?? []).some(({ subtask_key }) => ulabel.subtasks[subtask_key]?.read_only === true);
}

/**
 * Undo the last action in the action stream.
 *
 * @param ulabel ULabel instance
 * @param is_internal_undo whether ulabel undo is triggered by an internal action
 */
export function undo(ulabel: ULabel, is_internal_undo: boolean = false) {
    // Create constants for convenience
    const current_subtask = ulabel.get_current_subtask();
    const action_stream = current_subtask.actions.stream;
    const undone_stack = current_subtask.actions.undone_stack;

    // If the action_steam is empty, then there are no actions to undo
    if (action_stream.length === 0) return;
    if (!is_internal_undo && is_blocked_by_read_only(ulabel, action_stream[action_stream.length - 1])) return;

    ulabel.hide_id_dialog();

    let undo_candidate = action_stream.pop()!;

    // Finish action if it is marked as unfinished
    if (JSON.parse(undo_candidate.redo_payload).finished === false) {
        // Push action back to the stream, finish, then pop it again
        // TODO: better way of doing this?
        action_stream.push(undo_candidate);
        finish_action(ulabel, undo_candidate);
        // A zero-diff move drops its own begin_move on finish; there is
        // nothing left to undo
        if (action_stream[action_stream.length - 1] !== undo_candidate) return;
        undo_candidate = action_stream.pop()!;
    }

    // Set internal undo status
    undo_candidate.is_internal_undo = is_internal_undo;
    undone_stack.push(undo_candidate);
    undo_action(ulabel, undo_candidate);

    // Trigger any listeners for the action
    trigger_action_listeners(ulabel, undo_candidate, true);
    emit_annotation_change(ulabel, undo_candidate, "undo", ulabel.get_current_subtask_key());
}

/**
 * Redo the last undone action.
 *
 * @param ulabel ULabel instance
 */
export function redo(ulabel: ULabel) {
    // Create constants for convenience
    const current_subtask = ulabel.get_current_subtask();
    const undone_stack = current_subtask.actions.undone_stack;

    // If the action_steam is empty, then there are no actions to redo
    if (undone_stack.length === 0) return;
    if (is_blocked_by_read_only(ulabel, undone_stack[undone_stack.length - 1])) return;

    // Redo the action
    const redo_candidate = undone_stack.pop()!;
    redo_action(ulabel, redo_candidate);
}

/**
 * Call the appropriate undo function for the given action type.
 *
 * @param ulabel ULabel instance
 * @param action Action to undo
 */
function undo_action(ulabel: ULabel, action: ULabelAction) {
    ulabel.update_frame(undefined, action.frame);
    const undo_payload = JSON.parse(action.undo_payload);
    const annotations = ulabel.get_current_subtask().annotations.access;
    const annotation_id = action.annotation_id!;

    // For some actions like delete_annotations_in_polygon, the annotation may no longer exist
    if (annotation_id in annotations) {
        const annotation = annotations[annotation_id];

        // Revert the annotation's last edited info
        annotation.last_edited_at = action.prev_timestamp;
        annotation.last_edited_by = action.prev_user;
    }
    (action.affected ?? []).forEach(({ annotation_id: aid, subtask_key }, i) => {
        const affected = ulabel.subtasks[subtask_key]?.annotations.access[aid];
        if (affected === undefined) return;
        affected.last_edited_at = action.affected_prev![i].prev_timestamp;
        affected.last_edited_by = action.affected_prev![i].prev_user;
    });

    switch (action.act_type) {
        case "begin_annotation":
            ulabel.begin_annotation__undo(annotation_id);
            break;
        case "continue_annotation":
            ulabel.continue_annotation__undo(annotation_id);
            break;
        case "finish_annotation":
            ulabel.finish_annotation__undo(annotation_id);
            break;
        case "begin_edit":
            ulabel.begin_edit__undo(annotation_id, undo_payload);
            break;
        case "begin_move":
            ulabel.begin_move__undo(annotation_id, undo_payload);
            break;
        case "delete_annotation":
            ulabel.delete_annotation__undo(annotation_id);
            break;
        case "delete_vertex":
            ulabel.delete_vertex__undo(annotation_id, undo_payload);
            break;
        case "cancel_annotation":
            ulabel.cancel_annotation__undo(annotation_id, undo_payload);
            break;
        case "assign_annotation_id":
            ulabel.assign_annotation_id__undo(annotation_id, undo_payload);
            break;
        case "edit_text_payload":
            ulabel.edit_text_payload__undo(annotation_id, undo_payload);
            break;
        case "create_annotation":
            ulabel.create_annotation__undo(annotation_id);
            break;
        case "paste_annotation":
            ulabel.paste_annotation__undo(annotation_id);
            break;
        case "move_annotation":
            ulabel.move_annotation__undo(annotation_id, undo_payload);
            break;
        case "delete_counterparts":
            ulabel.delete_counterparts__undo(undo_payload);
            break;
        case "create_nonspatial_annotation":
            ulabel.create_nonspatial_annotation__undo(annotation_id);
            break;
        case "start_complex_polygon":
            ulabel.start_complex_polygon__undo(annotation_id);
            break;
        case "merge_polygon_complex_layer":
            ulabel.merge_polygon_complex_layer__undo(annotation_id, undo_payload);
            // If the undo was triggered by the user, they
            // expect ctrl+z to undo the previous action as well
            if (!action.is_internal_undo) {
                undo(ulabel);
            }
            break;
        case "simplify_polygon_complex_layer":
            ulabel.simplify_polygon_complex_layer__undo(annotation_id, undo_payload);
            // If the undo was triggered by the user, they
            // expect ctrl+z to undo the previous action as well
            if (!action.is_internal_undo) {
                undo(ulabel);
            }
            break;
        case "delete_annotations_in_polygon":
            ulabel.delete_annotations_in_polygon__undo(undo_payload);
            break;
        case "begin_brush":
            ulabel.begin_brush__undo(annotation_id, undo_payload);
            break;
        case "bitmask_stroke":
            ulabel.bitmask_stroke__undo(annotation_id, undo_payload);
            break;
        case "finish_modify_annotation":
            ulabel.finish_modify_annotation__undo(annotation_id, undo_payload);
            break;
        default:
            log_message(`Action type not recognized for undo: ${action.act_type}`, LogLevel.WARNING);
            break;
    }
}

/**
 * Call the appropriate redo function for the given action type.
 *
 * @param ulabel ULabel instance
 * @param action Action to redo
 */
export function redo_action(ulabel: ULabel, action: ULabelAction) {
    ulabel.update_frame(undefined, action.frame);
    const redo_payload = JSON.parse(action.redo_payload);
    const annotation_id = action.annotation_id!;
    switch (action.act_type) {
        case "begin_annotation":
            ulabel.begin_annotation(undefined, annotation_id, redo_payload);
            break;
        case "continue_annotation":
            ulabel.continue_annotation(undefined, undefined, annotation_id, redo_payload);
            break;
        case "finish_annotation":
            ulabel.finish_annotation__redo(annotation_id);
            break;
        case "begin_edit":
            ulabel.begin_edit__redo(annotation_id, redo_payload);
            break;
        case "begin_move":
            ulabel.begin_move__redo(annotation_id, redo_payload);
            break;
        case "delete_annotation":
            ulabel.delete_annotation__redo(annotation_id);
            break;
        case "delete_vertex":
            ulabel.delete_vertex__redo(annotation_id, redo_payload);
            break;
        case "cancel_annotation":
            ulabel.cancel_annotation(annotation_id);
            break;
        case "assign_annotation_id":
            ulabel.assign_annotation_id(annotation_id, redo_payload);
            break;
        case "edit_text_payload":
            ulabel.edit_text_payload__redo(annotation_id, redo_payload);
            break;
        case "create_annotation":
            ulabel.create_annotation__redo(annotation_id, redo_payload);
            break;
        case "paste_annotation":
            ulabel.paste_annotation__redo(annotation_id, redo_payload);
            break;
        case "move_annotation":
            ulabel.move_annotation__redo(annotation_id, redo_payload);
            break;
        case "delete_counterparts":
            ulabel.delete_counterparts__redo(annotation_id, redo_payload);
            break;
        case "create_nonspatial_annotation":
            ulabel.create_nonspatial_annotation(annotation_id, redo_payload);
            break;
        case "start_complex_polygon":
            ulabel.start_complex_polygon(annotation_id);
            break;
        case "merge_polygon_complex_layer":
            ulabel.merge_polygon_complex_layer(annotation_id, redo_payload.layer_idx, false, true);
            break;
        case "simplify_polygon_complex_layer":
            ulabel.simplify_polygon_complex_layer(annotation_id, redo_payload.active_idx, true);
            // Since this is an internal operation, user expects redo of the next action
            ulabel.redo();
            break;
        case "delete_annotations_in_polygon":
            ulabel.delete_annotations_in_polygon(annotation_id, redo_payload);
            break;
        case "finish_modify_annotation":
            ulabel.finish_modify_annotation__redo(annotation_id, redo_payload);
            break;
        case "bitmask_stroke":
            ulabel.bitmask_stroke__redo(annotation_id, redo_payload);
            break;
        default:
            log_message(`Action type not recognized for redo: ${action.act_type}`, LogLevel.WARNING);
            break;
    }
}
