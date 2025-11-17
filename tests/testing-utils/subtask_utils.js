/**
 * Utility functions for working with subtasks.
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Get the current subtask key.
 * @param {Page} page - The Playwright page object
 * @returns {Promise<string>} The current subtask key
 */
export async function get_current_subtask_key(page) {
    return await page.evaluate(() => window.ulabel.get_current_subtask_key());
}

/**
 * Get the current subtask
 * @param {Page} page - The Playwright page object
 * @returns {Promise<Object>} The current subtask
 */
export async function get_current_subtask(page) {
    return await page.evaluate(() => window.ulabel.get_current_subtask());
}

/**
 * Switch to a subtask by its index.
 * @param {Page} page - The Playwright page object
 * @param {number} index - The index of the subtask tab
 * @returns {Promise<void>}
 */
export async function switch_to_subtask(page, index) {
    const subtask_tabs = page.locator(".toolbox-tabs a");
    await subtask_tabs.nth(index).click();
}

/**
 * Get the count of available subtasks.
 * @param {Page} page - The Playwright page object
 * @returns {Promise<number>} The number of subtasks
 */
export async function get_subtask_count(page) {
    const subtask_tabs = page.locator(".toolbox-tabs a");
    return await subtask_tabs.count();
}
