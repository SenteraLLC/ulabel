/**
 * File for storing useful utilities that are not strictly ULabel related.
 */

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
        if (log_all || total_time > 2) console.log(`${original_function.name} ${function_name} took ${total_time}ms to complete.`)
        return result
    }
    return replacement_method
}