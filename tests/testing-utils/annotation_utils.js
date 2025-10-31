/**
 * Utility functions for working with annotations in tests.
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Get the count of annotations in the current subtask.
 * @param {Page} page - The Playwright page object
 * @returns {Promise<number>} The number of annotations
 */
export async function get_annotation_count(page) {
    return await page.evaluate(() => {
        const current_subtask = window.ulabel.get_current_subtask();
        return current_subtask.annotations.ordering.length;
    });
}

/**
 * Get an annotation by its index in the ordering array.
 * @param {Page} page - The Playwright page object
 * @param {number} index - The index of the annotation (default: 0)
 * @returns {Promise<Object>} The annotation object
 */
export async function get_annotation_by_index(page, index = 0) {
    return await page.evaluate((idx) => {
        const current_subtask = window.ulabel.get_current_subtask();
        const annotation_id = current_subtask.annotations.ordering[idx];
        return current_subtask.annotations.access[annotation_id];
    }, index);
}

/**
 * Get all annotations in the current subtask.
 * @param {Page} page - The Playwright page object
 * @returns {Promise<Array<Object>>} Array of all annotations
 */
export async function get_all_annotations(page) {
    return await page.evaluate(() => {
        const current_subtask = window.ulabel.get_current_subtask();
        return current_subtask.annotations.ordering.map(
            (id) => current_subtask.annotations.access[id],
        );
    });
}

/**
 * Get the class ID of an annotation based on highest confidence.
 * @param {Object} annotation - The annotation object
 * @returns {number|null} The class ID with highest confidence or null
 */
export function get_annotation_class_id(annotation) {
    // Classification with highest confidence
    if (
        annotation.classification_payloads &&
        annotation.classification_payloads.length > 0
    ) {
        const sorted = annotation.classification_payloads.sort(
            (a, b) => b.confidence - a.confidence,
        );
        return sorted[0].class_id;
    }
    return null;
}
