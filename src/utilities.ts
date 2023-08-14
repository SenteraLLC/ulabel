/**
 * File for storing useful utilities that are not strictly ULabel related.
 */

import { ULabel } from ".."
import { ULabelSubtask } from "./subtask"

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

    // Active class id is stored in a weird way, it can be acessed by looping through the state's id_payload and finding a payload with > 0 confidence
    for (const payload of current_subtask.state.id_payload) {
        if (payload.confidence > 0) return payload.class_id
    }
}