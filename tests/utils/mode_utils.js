/**
 * Utility functions for switching annotation modes.
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Switch to a specific annotation mode.
 * @param {Page} page - The Playwright page object
 * @param {string} mode - The mode to switch to (e.g., "bbox", "polygon", "point")
 * @returns {Promise<void>}
 */
export async function switchToMode(page, mode) {
    await page.click(`a#md-btn--${mode}`);
}
