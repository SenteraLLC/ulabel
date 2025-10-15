import fs from "fs";

/**
 * @typedef {import('@playwright/test').Page} Page
 */

/**
 * Download annotations by clicking the button with the given ID.
 * @param {Page} page
 * @param {string} button_id
 * @returns {Promise<Object>} The parsed JSON annotations.
 */
export async function download_annotations(page, button_id) {
    // Set up download listener and click submit button
    const download_promise = page.waitForEvent("download");
    await page.click(`#${button_id}`);

    // Wait for the download to start and get the download object
    const download = await download_promise;

    // Get the path where the file was downloaded
    const path = await download.path();

    // Read the file content
    const json_content = fs.readFileSync(path, "utf-8");

    // Parse the JSON content and return
    return JSON.parse(json_content);
}
