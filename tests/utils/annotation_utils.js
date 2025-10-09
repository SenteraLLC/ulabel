/**
 * Utility functions for working with annotations in tests.
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Get the count of annotations in the current subtask.
 * @param {Page} page - The Playwright page object
 * @returns {Promise<number>} The number of annotations
 */
export async function getAnnotationCount(page) {
    return await page.evaluate(() => {
        const currentSubtask = window.ulabel.get_current_subtask();
        return currentSubtask.annotations.ordering.length;
    });
}

/**
 * Get an annotation by its index in the ordering array.
 * @param {Page} page - The Playwright page object
 * @param {number} index - The index of the annotation (default: 0)
 * @returns {Promise<Object>} The annotation object
 */
export async function getAnnotationByIndex(page, index = 0) {
    return await page.evaluate((idx) => {
        const currentSubtask = window.ulabel.get_current_subtask();
        const annotationId = currentSubtask.annotations.ordering[idx];
        return currentSubtask.annotations.access[annotationId];
    }, index);
}

/**
 * Get all annotations in the current subtask.
 * @param {Page} page - The Playwright page object
 * @returns {Promise<Array<Object>>} Array of all annotations
 */
export async function getAllAnnotations(page) {
    return await page.evaluate(() => {
        const currentSubtask = window.ulabel.get_current_subtask();
        return currentSubtask.annotations.ordering.map(
            (id) => currentSubtask.annotations.access[id],
        );
    });
}
