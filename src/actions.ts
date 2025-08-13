import {
    ULabel,
    ULabelAction,
    ULabelActionRaw,
} from "..";

/**
 * Record an action in the action stream to allow undo/redo functionality.
 *
 * @param ulabel ULabel instance
 * @param raw_action action to record
 * @param is_redo whether ulabel action is a redo or not
 */
export function record_action(ulabel: ULabel, raw_action: ULabelActionRaw, is_redo: boolean = false) {
    ulabel.set_saved(false);
    const current_subtask = ulabel.get_current_subtask();

    // After a new action, you can no longer redo old actions
    if (!is_redo) {
        current_subtask.actions.undone_stack = [];
    }

    // Stringify the undo/redo payloads
    const action: ULabelAction = {
        act_type: raw_action.act_type,
        frame: raw_action.frame,
        undo_payload: JSON.stringify(raw_action.undo_payload),
        redo_payload: JSON.stringify(raw_action.redo_payload),
    };

    // Add to stream
    current_subtask.actions.stream.push(action);
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
        case "edit_annotation":
        case "move_annotation":
            ulabel.end_drag(ulabel.state.last_move);
            break;
        default:
            break;
    }
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

    if (!current_subtask.state.idd_thumbnail) {
        ulabel.hide_id_dialog();
    }

    const undo_candidate = action_stream.pop();

    // Finish action if it is marked as unfinished
    if (JSON.parse(undo_candidate.redo_payload).finished === false) {
        finish_action(ulabel, undo_candidate);
    }

    // Set internal undo status
    undo_candidate.is_internal_undo = is_internal_undo;
    undo_action(ulabel, undo_candidate);
    undone_stack.push(undo_candidate);
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

    // If the action_steam is empty, then there are no actions to undo
    if (undone_stack.length === 0) return;

    redo_action(ulabel, undone_stack.pop());
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
            ulabel.begin_annotation__undo(undo_payload);
            break;
        case "continue_annotation":
            ulabel.continue_annotation__undo(undo_payload);
            break;
        case "finish_annotation":
            ulabel.finish_annotation__undo(undo_payload);
            break;
        case "edit_annotation":
            ulabel.edit_annotation__undo(undo_payload);
            break;
        case "move_annotation":
            ulabel.move_annotation__undo(undo_payload);
            break;
        case "delete_annotation":
            ulabel.delete_annotation__undo(undo_payload);
            break;
        case "cancel_annotation":
            ulabel.cancel_annotation__undo(undo_payload);
            break;
        case "assign_annotation_id":
            ulabel.assign_annotation_id__undo(undo_payload);
            break;
        case "create_annotation":
            ulabel.create_annotation__undo(undo_payload);
            break;
        case "create_nonspatial_annotation":
            ulabel.create_nonspatial_annotation__undo(undo_payload);
            break;
        case "start_complex_polygon":
            ulabel.start_complex_polygon__undo(undo_payload);
            break;
        case "merge_polygon_complex_layer":
            ulabel.merge_polygon_complex_layer__undo(undo_payload);
            // If the undo was triggered by the user, they
            // expect ctrl+z to undo the previous action as well
            if (!action.is_internal_undo) {
                undo(ulabel);
            }
            break;
        case "simplify_polygon_complex_layer":
            ulabel.simplify_polygon_complex_layer__undo(undo_payload);
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
            ulabel.begin_brush__undo(undo_payload);
            break;
        case "finish_modify_annotation":
            ulabel.finish_modify_annotation__undo(undo_payload);
            break;
        default:
            console.warn("Action type not recognized for undo:", action.act_type);
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
            ulabel.begin_annotation(null, redo_payload);
            break;
        case "continue_annotation":
            ulabel.continue_annotation(null, null, redo_payload);
            break;
        case "finish_annotation":
            ulabel.finish_annotation__redo(redo_payload);
            break;
        case "edit_annotation":
            ulabel.edit_annotation__redo(redo_payload);
            break;
        case "move_annotation":
            ulabel.move_annotation__redo(redo_payload);
            break;
        case "delete_annotation":
            ulabel.delete_annotation__redo(redo_payload);
            break;
        case "cancel_annotation":
            ulabel.cancel_annotation(redo_payload);
            break;
        case "assign_annotation_id":
            ulabel.assign_annotation_id(null, redo_payload);
            break;
        case "create_annotation":
            ulabel.create_annotation__redo(redo_payload);
            break;
        case "create_nonspatial_annotation":
            ulabel.create_nonspatial_annotation(redo_payload);
            break;
        case "start_complex_polygon":
            ulabel.start_complex_polygon(redo_payload);
            break;
        case "merge_polygon_complex_layer":
            ulabel.merge_polygon_complex_layer(redo_payload.actid, redo_payload.layer_idx, false, true);
            break;
        case "simplify_polygon_complex_layer":
            ulabel.simplify_polygon_complex_layer(redo_payload.actid, redo_payload.active_idx, true);
            // Since this is an internal operation, user expects redo of the next action
            ulabel.redo();
            break;
        case "delete_annotations_in_polygon":
            ulabel.delete_annotations_in_polygon(null, redo_payload);
            break;
        case "finish_modify_annotation":
            ulabel.finish_modify_annotation__redo(redo_payload);
            break;
        default:
            console.warn("Action type not recognized for redo:", action.act_type);
            break;
    }
}
