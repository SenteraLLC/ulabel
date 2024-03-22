/**
 * File for storing useful utilities that are not strictly ULabel related.
 */

import { ULabel } from ".."
import { ULabelSubtask } from "./subtask"
import { DELETE_CLASS_ID, DELETE_MODES } from "./annotation"

/**
 * Checks if something is an object, not an array, and not null
 * 
 * @param object 
 * @returns {boolean} Whether or not the passed in value is an object that is neither null or an array
 */
export function is_object_and_not_array(object: unknown): boolean {
    return (
        typeof object === "object"  && // Make sure the object is indeed an object
        !Array.isArray(object) && // Ensure the object is not an array
        object !== null // null is an object, so make sure the object isn't null
    )
}

/**
 * Wraps a function and logs how long the function takes to run.
 * 
 * @param original_function 
 * @param function_name String to be added to the beginning of the log. Useful for stating which function was wrapped.
 * @returns 
 */
export function time_function(original_function: Function, function_name: string = "", log_all: boolean = false): Function {
    function replacement_method(...args: any[]) {
        const time_before: number = Date.now()
        const result = original_function(...args)
        const total_time: number = Date.now() - time_before
        if (log_all || total_time > 2) console.log(`${function_name} took ${total_time}ms to complete.`)
        return result
    }
    return replacement_method
}

export function get_active_class_id(ulabel: ULabel): number {
    // Grab the current subtask from the ulabel object
    const current_subtask_key: string = ulabel.state.current_subtask
    const current_subtask: ULabelSubtask = ulabel.subtasks[current_subtask_key]

    // If in single_class_mode return the only valid class id
    if (current_subtask.single_class_mode) return current_subtask.class_ids[0]

    // If currently in a delete mode, return the DELETE_CLASS_ID
    if (DELETE_MODES.includes(current_subtask.state.annotation_mode)) return DELETE_CLASS_ID

    // If the current subtask has more than one valid class id, loop through the id_payloads
    for (const payload of current_subtask.state.id_payload) {
        // If the payload is a number then the user hasn't selected a class yet, so the first class id is the current one
        if (typeof payload === "number") return current_subtask.class_ids[0]

        // If the payload is an object then return its id if its confidence is > 0
        if (payload.confidence > 0) {
            console.log(`payload: ${payload}`)
            return payload.class_id
        }
    }
    console.error(`get_active_class_id was unable to determine an active class id.
    current_subtask: ${JSON.stringify(current_subtask)}`)
}