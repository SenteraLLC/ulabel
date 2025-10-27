/**
 * Utility functions for working with subtasks.
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Get the current subtask key.
 * @param {Page} page - The Playwright page object
 * @returns {Promise<boolean>} Whether the global dialogs are visible for the given annotation index
 */
export async function annotation_global_dialogs_are_visible(page, annotation_idx) {
    return await page.evaluate((idx) => {
        const current_subtask = window.ulabel.get_current_subtask();
        const annotation_id = current_subtask.annotations.ordering[idx].id;
        return (
            annotation_id !== null &&
            annotation_id === current_subtask.idd_associated_annotation
        );
    }, annotation_idx);
}
