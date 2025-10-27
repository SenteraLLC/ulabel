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

/**
 * Collapse the annotation list
 * @param {Page} page - The Playwright page object
 * @returns {Promise<void>}
 */
export async function collapse_annotation_list(page) {
    const header = page.locator(".annotation-list-header");
    const content = page.locator(".annotation-list-content");

    // Only click if not already collapsed
    const isVisible = await content.isVisible();
    if (isVisible) {
        await header.click();
    }
}

/**
 * Expand the annotation list
 * @param {Page} page - The Playwright page object
 * @returns {Promise<void>}
 */
export async function expand_annotation_list(page) {
    const header = page.locator(".annotation-list-header");
    const content = page.locator(".annotation-list-content");

    // Only click if not already expanded
    const isVisible = await content.isVisible();
    if (!isVisible) {
        await header.click();
    }
}

/**
 * Get all annotation list item texts
 * @param {Page} page - The Playwright page object
 * @returns {Promise<string[]>}
 */
export async function get_annotation_list_items_text(page) {
    const items = page.locator(".annotation-list-item");
    const count = await items.count();
    const texts = [];

    for (let i = 0; i < count; i++) {
        texts.push(await items.nth(i).textContent());
    }

    return texts;
}

/**
 * Check if an annotation list item is highlighted
 * @param {Page} page - The Playwright page object
 * @param {number} index - The index of the item to check
 * @returns {Promise<boolean>}
 */
export async function is_annotation_list_item_highlighted(page, index) {
    const item = page.locator(".annotation-list-item").nth(index);
    const className = await item.getAttribute("class");
    return className.includes("highlight");
}

/**
 * Check if an annotation list item is deprecated
 * @param {Page} page - The Playwright page object
 * @param {number} index - The index of the item to check
 * @returns {Promise<boolean>}
 */
export async function is_annotation_list_item_deprecated(page, index) {
    const item = page.locator(".annotation-list-item").nth(index);
    const className = await item.getAttribute("class");
    return className.includes("deprecated");
}

/**
 * Get the number of group headers in the annotation list
 * @param {Page} page - The Playwright page object
 * @returns {Promise<number>}
 */
export async function get_group_header_count(page) {
    return await page.locator(".annotation-list-group-header").count();
}

/**
 * Get the text content of a group header by index
 * @param {Page} page - The Playwright page object
 * @param {number} index - The index of the group header
 * @returns {Promise<string>}
 */
export async function get_group_header_text(page, index) {
    const header = page.locator(".annotation-list-group-header").nth(index);
    return await header.textContent();
}

/**
 * Check if the annotation list is collapsed
 * @param {Page} page - The Playwright page object
 * @returns {Promise<boolean>}
 */
export async function is_annotation_list_collapsed(page) {
    const content = page.locator(".annotation-list-content");
    return !(await content.isVisible());
}
