/**
 * Utility functions for testing annotation list functionality
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Get the number of items in the annotation list
 * @param {Page} page - The Playwright page object
 * @returns {Promise<number>}
 */
export async function get_annotation_list_count(page) {
    return await page.locator(".annotation-list-item").count();
}

/**
 * Toggle the show deprecated checkbox
 * @param {Page} page - The Playwright page object
 * @param {boolean} checked - Whether to check or uncheck
 * @returns {Promise<void>}
 */
export async function toggle_show_deprecated(page, checked) {
    const checkbox = page.locator("#annotation-list-show-deprecated");
    if (checked) {
        await checkbox.check();
    } else {
        await checkbox.uncheck();
    }
}

/**
 * Toggle the group by class checkbox
 * @param {Page} page - The Playwright page object
 * @param {boolean} checked - Whether to check or uncheck
 * @returns {Promise<void>}
 */
export async function toggle_group_by_class(page, checked) {
    const checkbox = page.locator("#annotation-list-group-by-class");
    if (checked) {
        await checkbox.check();
    } else {
        await checkbox.uncheck();
    }
}

/**
 * Click an annotation list item by index
 * @param {Page} page - The Playwright page object
 * @param {number} index - The index of the item to click
 * @returns {Promise<void>}
 */
export async function click_annotation_list_item(page, index) {
    await page.locator(".annotation-list-item").nth(index).click();
}

/**
 * Hover over an annotation list item by index
 * @param {Page} page - The Playwright page object
 * @param {number} index - The index of the item to hover
 * @returns {Promise<void>}
 */
export async function hover_annotation_list_item(page, index) {
    await page.locator(".annotation-list-item").nth(index).hover();
}

/**
 * Check if navigation toast is visible
 * @param {Page} page - The Playwright page object
 * @returns {Promise<boolean>}
 */
export async function is_navigation_toast_visible(page) {
    const toast = page.locator(".annotation-navigation-toast");
    try {
        await toast.waitFor({ state: "visible", timeout: 1000 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the text content of the navigation toast
 * @param {Page} page - The Playwright page object
 * @returns {Promise<string>}
 */
export async function get_navigation_toast_text(page) {
    const toast = page.locator(".annotation-navigation-toast");
    return await toast.textContent();
}
