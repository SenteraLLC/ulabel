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
 * @param is_redo whether this action is a redo or not
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
