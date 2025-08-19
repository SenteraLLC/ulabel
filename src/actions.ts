import {
    Offset,
    ULabel,
    ULabelAction,
    ULabelActionRaw,
    ULabelActionType,
} from "..";
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
 */
export function record_action(ulabel: ULabel, raw_action: ULabelActionRaw, is_redo: boolean = false, add_to_action_stream: boolean = true) {
    ulabel.set_saved(false);
    const current_subtask = ulabel.get_current_subtask();

    // After a new action, you can no longer redo old actions
    if (add_to_action_stream && !is_redo) {
        current_subtask.actions.undone_stack = [];
    }

    // Stringify the undo/redo payloads
    const act_type = raw_action.act_type;
    const action: ULabelAction = {
        act_type: act_type,
        annotation_id: raw_action.annotation_id,
        frame: raw_action.frame,
        undo_payload: JSON.stringify(raw_action.undo_payload),
        redo_payload: JSON.stringify(raw_action.redo_payload),
    };

    // Add to stream
    if (add_to_action_stream) {
        current_subtask.actions.stream.push(action);
    }

    // Trigger any listeners for the action
    on_start_annotation_spatial_modification(
        ulabel,
        action,
    );
    on_in_progress_annotation_spatial_modification(
        ulabel,
        action,
    );
    on_finish_annotation_spatial_modification(
        ulabel,
        action,
        false,
        is_redo,
    );
    on_annotation_deletion(
        ulabel,
        action,
    );
    on_annotation_id_change(
        ulabel,
        action,
    );
    on_annotation_revert(
        ulabel,
        action,
    );
};

/**
 * Finish an action in the action stream.
 *
 * @param ulabel ULabel instance
 * @param active_id ID of the active annotation
 */
export function record_finish(ulabel: ULabel, active_id: string) {
    // Set up constants for convenience
    const current_subtask = ulabel.get_current_subtask();
    const action = current_subtask.actions.stream.pop();

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
    const action = current_subtask.actions.stream.pop();

    // Parse and complete the redo payload
    const redo_payload = JSON.parse(action.redo_payload);
    const fin_pt = ulabel.get_with_access_string(
        active_id,
        redo_payload.edit_candidate.access,
        true,
    );
    redo_payload.ending_x = fin_pt[0];
    redo_payload.ending_y = fin_pt[1];
    redo_payload.ending_frame = ulabel.state.current_frame;
    redo_payload.finished = true;
    action.redo_payload = JSON.stringify(redo_payload);

    // Add the completed action back to the stream
    current_subtask.actions.stream.push(action);

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
    const action = current_subtask.actions.stream.pop();

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
    action.redo_payload = JSON.stringify(redo_payload);
    action.undo_payload = JSON.stringify(undo_payload);

    // Add the completed action back to the stream
    current_subtask.actions.stream.push(action);

    // Record action without adding to the action stream
    // The "begin_move" action in the action stream is what is used to
    // undo/redo the move
    record_action(ulabel, {
        act_type: "finish_move",
        annotation_id: action.annotation_id,
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
    is_undo: boolean = false,
) {
    const actions: ULabelActionType[] = [
        "begin_annotation", // triggered when an annotation is started
        "create_annotation", // triggered when an annotation is explicitly created
        "create_nonspatial_annotation", // triggered when a non-spatial annotation is created
    ];

    if (!is_undo && actions.includes(action.act_type)) {
        // Draw new annotation
        ulabel.draw_annotation_from_id(action.annotation_id);
    }
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
    is_undo: boolean = false,
) {
    const actions: ULabelActionType[] = [
        "continue_edit", // no undo/redo for this action
        "continue_move", // no undo/redo for this action
        "continue_brush", // no undo/redo for this action
        "continue_annotation", // polygons/polylines can undo/redo this action
    ];

    if (!is_undo && actions.includes(action.act_type)) {
        const subtask_key = ulabel.get_current_subtask_key();
        const current_subtask = ulabel.subtasks[subtask_key];
        const offset: Offset = current_subtask.state.move_candidate?.offset || {
            id: action.annotation_id,
            diffX: 0,
            diffY: 0,
            diffZ: 0,
        };

        // Update the annotation rendering
        ulabel.rebuild_containing_box(action.annotation_id, false, subtask_key);
        ulabel.redraw_annotation(action.annotation_id, subtask_key, offset);
        // Update dialogs
        ulabel.suggest_edits();
        // Update the toolbox filter distance
        ulabel.update_filter_distance_during_polyline_move(action.annotation_id, true, false, offset);
    }
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
    is_undo: boolean = false,
    is_redo: boolean = false,
) {
    // Triggered on action completion as well as redo
    const action_completion: ULabelActionType[] = [
        "create_annotation", // triggered when an annotation is explicitly created
        "finish_modify_annotation", // triggered when brush edit ends
        "finish_edit", // triggered when edit ends
        "finish_move", // triggered when move ends
        "finish_annotation", // triggered when most annotations end (except for brush/complex polygons),
        "cancel_annotation", // triggered when an annotation is canceled
    ];

    // Triggered on undo only
    const action_undo: ULabelActionType[] = [
        "finish_modify_annotation",
        "finish_annotation",
        "delete_annotation",
        "start_complex_polygon", // triggered when complex polygon is started
        "begin_edit", // triggered when edit begins, updated when edit ends
        "begin_move", // triggered when move begins, updated when move ends
    ];

    // Triggered on redo only
    // These actions need rendering on undo/redo only. When initially triggered,
    // they signal the start of an action. On undo/redo, the  payload
    // will contain information to fully render the annotation.
    const action_redo: ULabelActionType[] = [
        "begin_edit",
        "begin_move",
    ];

    // Trigger updates on action completion or on undo/redo
    if (
        (!is_undo && action_completion.includes(action.act_type)) ||
        (is_undo && action_undo.includes(action.act_type)) ||
        (is_redo && action_redo.includes(action.act_type))
    ) {
        // create_annotation will have already handled drawing the annotation from scratch
        if (action.act_type !== "create_annotation") {
            // Update annotation rendering
            ulabel.rebuild_containing_box(action.annotation_id);
            ulabel.redraw_annotation(action.annotation_id);
        }
        // Update dialogs
        ulabel.suggest_edits(null, null, true);
        // Update the toolbox
        ulabel.update_filter_distance(action.annotation_id);
        ulabel.toolbox.redraw_update_items(ulabel);
        // Ensure there are no lingering enders
        ulabel.destroy_polygon_ender(action.annotation_id);

        // TODO: reset state variables?
    }
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
    is_undo: boolean = false,
) {
    const actions: ULabelActionType[] = [
        "delete_annotation", // Deprecates the annotation
    ];

    const action_undo: ULabelActionType[] = [
        "begin_annotation", // When undone, the annotation is deleted
        "create_annotation", // When undone, the annotation is deleted
        "create_nonspatial_annotation", // When undone, the annotation is deleted
    ];

    // Trigger updates on action completion or on undo/redo
    if (
        (!is_undo && actions.includes(action.act_type)) ||
        (is_undo && action_undo.includes(action.act_type))
    ) {
        // Sometimes the annotation is just deprecated, and sometimes it is fully deleted
        // Check if it still exists, because if so we need to redraw
        const current_subtask = ulabel.get_current_subtask();
        const annotations = current_subtask.annotations.access;
        if (action.annotation_id in annotations) {
            const spatial_type = annotations[action.annotation_id]?.spatial_type;
            if (NONSPATIAL_MODES.includes(spatial_type)) {
                // Render the change
                ulabel.clear_nonspatial_annotation(action.annotation_id);
            } else {
                ulabel.redraw_annotation(action.annotation_id);
                // Force filter points if necessary
                if (annotations[action.annotation_id].spatial_type === "polyline") {
                    ulabel.update_filter_distance(action.annotation_id, false, true);
                }
            }
        }

        // Ensure there are no lingering enders
        ulabel.destroy_polygon_ender(action.annotation_id);
        // Update dialogs
        ulabel.suggest_edits(null, null, true);
        // Update the toolbox
        ulabel.toolbox.redraw_update_items(ulabel);
    }
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
    const actions: ULabelActionType[] = [
        "assign_annotation_id", // triggered when an annotation ID is assigned
    ];

    if (actions.includes(action.act_type)) {
        // Update the annotation rendering
        ulabel.redraw_annotation(action.annotation_id);
        ulabel.recolor_active_polygon_ender();
        ulabel.recolor_brush_circle();

        // Update dialogs
        if (!is_undo) {
            // Hide the large ID dialog after the user has made a selection
            ulabel.hide_id_dialog();
        }
        ulabel.suggest_edits(null, null, true);

        // Determine if we need to update the filter distance
        // If the filter_distance_toolbox_item exists,
        // Check if the FilterDistance ToolboxItem is in this ULabel instance
        if (ulabel.config.toolbox_order.includes(AllowedToolboxItem.FilterDistance)) {
            const spatial_type = ulabel.get_current_subtask().annotations.access[action.annotation_id].spatial_type;
            if (spatial_type === "polyline") {
                // Get the toolbox item
                // @ts-expect-error TS2740
                const filter_distance_toolbox_item: FilterPointDistanceFromRow = ulabel.toolbox.items.filter((item) => item.get_toolbox_item_type() === "FilterDistance")[0];
                // filter annotations if in multi_class_mode
                if (
                    filter_distance_toolbox_item.multi_class_mode
                ) {
                    filter_points_distance_from_line(ulabel, true);
                }
            }
        }

        // Update toolbox
        ulabel.toolbox.redraw_update_items(ulabel);
    }
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
    is_undo: boolean = false,
) {
    const actions_undo: ULabelActionType[] = [
        "begin_brush", // triggered when a brush is started
        "cancel_annotation", // triggered when an annotation is canceled
    ];

    if (is_undo && actions_undo.includes(action.act_type)) {
        // Redraw the annotation
        ulabel.redraw_annotation(action.annotation_id);
    }
}

/*

DELETE IN POLYGON
destroy_annotation_context(delete_annid);
this.destroy_polygon_ender(delete_annid);
remove from ordering and annotation lists
this.remove_recorded_events_for_annotation(delete_annid);
*UNDO*
redraw_multiple_spatial_annotations
this.update_filter_distance(null, false, true);
this.toolbox.redraw_update_items(this);

MERGE POLYGON COMPLEX LAYER
rebuild_containing_box(annotation_id);
redraw_annotation(annotation_id);
*UNDO*:
rebuild_containing_box(annotation_id);
redraw_annotation(annotation_id);

SIMPLIFY POLYGON COMPLEX LAYER
*UNDO*:
rebuild_containing_box(undo_payload["actid"]);
redraw_annotation(undo_payload["actid"]);

*/

// ================= Undo / Redo =================

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

    if (!current_subtask.state.idd_thumbnail) {
        ulabel.hide_id_dialog();
    }

    let undo_candidate = action_stream.pop();

    log_message(
        `Undoing action: ${undo_candidate.act_type} for annotation ID: ${undo_candidate.annotation_id}`,
        LogLevel.INFO,
    );

    // Finish action if it is marked as unfinished
    if (JSON.parse(undo_candidate.redo_payload).finished === false) {
        // Push action back to the stream, finish, then pop it again
        // TODO: better way of doing this?
        action_stream.push(undo_candidate);
        finish_action(ulabel, undo_candidate);
        undo_candidate = action_stream.pop();
    }

    // Set internal undo status
    undo_candidate.is_internal_undo = is_internal_undo;
    undo_action(ulabel, undo_candidate);
    undone_stack.push(undo_candidate);

    // Trigger any listeners for the action
    on_start_annotation_spatial_modification(
        ulabel,
        undo_candidate,
        true,
    );
    on_finish_annotation_spatial_modification(
        ulabel,
        undo_candidate,
        true,
    );
    on_in_progress_annotation_spatial_modification(
        ulabel,
        undo_candidate,
        true,
    );
    on_annotation_deletion(
        ulabel,
        undo_candidate,
        true,
    );
    on_annotation_id_change(
        ulabel,
        undo_candidate,
        true,
    );
    on_annotation_revert(
        ulabel,
        undo_candidate,
        true,
    );
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

    // Redo the action
    const redo_candidate = undone_stack.pop();
    log_message(
        `Redoing action: ${redo_candidate.act_type} for annotation ID: ${redo_candidate.annotation_id}`,
        LogLevel.INFO,
    );
    redo_action(ulabel, redo_candidate);
}

/**
 * Call the appropriate undo function for the given action type.
 *
 * @param ulabel ULabel instance
 * @param action Action to undo
 */
function undo_action(ulabel: ULabel, action: ULabelAction) {
    ulabel.update_frame(null, action.frame);
    const undo_payload = JSON.parse(action.undo_payload);
    switch (action.act_type) {
        case "begin_annotation":
            ulabel.begin_annotation__undo(action.annotation_id);
            break;
        case "continue_annotation":
            ulabel.continue_annotation__undo(action.annotation_id);
            break;
        case "finish_annotation":
            ulabel.finish_annotation__undo(action.annotation_id);
            break;
        case "begin_edit":
            ulabel.begin_edit__undo(action.annotation_id, undo_payload);
            break;
        case "begin_move":
            ulabel.begin_move__undo(action.annotation_id, undo_payload);
            break;
        case "delete_annotation":
            ulabel.delete_annotation__undo(action.annotation_id);
            break;
        case "cancel_annotation":
            ulabel.cancel_annotation__undo(action.annotation_id, undo_payload);
            break;
        case "assign_annotation_id":
            ulabel.assign_annotation_id__undo(action.annotation_id, undo_payload);
            break;
        case "create_annotation":
            ulabel.create_annotation__undo(action.annotation_id);
            break;
        case "create_nonspatial_annotation":
            ulabel.create_nonspatial_annotation__undo(action.annotation_id);
            break;
        case "start_complex_polygon":
            ulabel.start_complex_polygon__undo(action.annotation_id);
            break;
        case "merge_polygon_complex_layer":
            ulabel.merge_polygon_complex_layer__undo(action.annotation_id, undo_payload);
            // If the undo was triggered by the user, they
            // expect ctrl+z to undo the previous action as well
            if (!action.is_internal_undo) {
                undo(ulabel);
            }
            break;
        case "simplify_polygon_complex_layer":
            ulabel.simplify_polygon_complex_layer__undo(action.annotation_id, undo_payload);
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
            ulabel.begin_brush__undo(action.annotation_id, undo_payload);
            break;
        case "finish_modify_annotation":
            ulabel.finish_modify_annotation__undo(action.annotation_id, undo_payload);
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
    ulabel.update_frame(null, action.frame);
    const redo_payload = JSON.parse(action.redo_payload);
    switch (action.act_type) {
        case "begin_annotation":
            ulabel.begin_annotation(null, action.annotation_id, redo_payload);
            break;
        case "continue_annotation":
            ulabel.continue_annotation(null, null, action.annotation_id, redo_payload);
            break;
        case "finish_annotation":
            ulabel.finish_annotation__redo(action.annotation_id);
            break;
        case "begin_edit":
            ulabel.begin_edit__redo(action.annotation_id, redo_payload);
            break;
        case "begin_move":
            ulabel.begin_move__redo(action.annotation_id, redo_payload);
            break;
        case "delete_annotation":
            ulabel.delete_annotation__redo(action.annotation_id);
            break;
        case "cancel_annotation":
            ulabel.cancel_annotation(action.annotation_id);
            break;
        case "assign_annotation_id":
            ulabel.assign_annotation_id(action.annotation_id, redo_payload);
            break;
        case "create_annotation":
            ulabel.create_annotation__redo(action.annotation_id, redo_payload);
            break;
        case "create_nonspatial_annotation":
            ulabel.create_nonspatial_annotation(action.annotation_id, redo_payload);
            break;
        case "start_complex_polygon":
            ulabel.start_complex_polygon(action.annotation_id);
            break;
        case "merge_polygon_complex_layer":
            ulabel.merge_polygon_complex_layer(action.annotation_id, redo_payload.layer_idx, false, true);
            break;
        case "simplify_polygon_complex_layer":
            ulabel.simplify_polygon_complex_layer(action.annotation_id, redo_payload.active_idx, true);
            // Since this is an internal operation, user expects redo of the next action
            ulabel.redo();
            break;
        case "delete_annotations_in_polygon":
            ulabel.delete_annotations_in_polygon(action.annotation_id, redo_payload);
            break;
        case "finish_modify_annotation":
            ulabel.finish_modify_annotation__redo(action.annotation_id, redo_payload);
            break;
        default:
            log_message(`Action type not recognized for redo: ${action.act_type}`, LogLevel.WARNING);
            break;
    }
}
