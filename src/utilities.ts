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