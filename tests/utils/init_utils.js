/**
 * Utility functions for initializing ULabel in tests.
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Navigate to a page and wait for ULabel to initialize.
 * @param {Page} page - The Playwright page object
 * @param {string} url - The URL to navigate to (default: "/multi-class.html")
 * @returns {Promise<void>}
 */
export async function waitForULabelInit(page, url = "/multi-class.html") {
    await page.goto(url);
    await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);
}
