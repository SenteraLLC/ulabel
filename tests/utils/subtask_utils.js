/**
 * Utility functions for working with subtasks.
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Get the current subtask key.
 * @param {Page} page - The Playwright page object
 * @returns {Promise<string>} The current subtask key
 */
export async function getCurrentSubtaskKey(page) {
    return await page.evaluate(() => window.ulabel.get_current_subtask_key());
}

/**
 * Switch to a subtask by its index.
 * @param {Page} page - The Playwright page object
 * @param {number} index - The index of the subtask tab
 * @returns {Promise<void>}
 */
export async function switchToSubtask(page, index) {
    const subtaskTabs = page.locator(".toolbox-tabs a");
    await subtaskTabs.nth(index).click();
}

/**
 * Get the count of available subtasks.
 * @param {Page} page - The Playwright page object
 * @returns {Promise<number>} The number of subtasks
 */
export async function getSubtaskCount(page) {
    const subtaskTabs = page.locator(".toolbox-tabs a");
    return await subtaskTabs.count();
}
