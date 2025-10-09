import fs from "fs";

/**
 * Download annotations by clicking the button with the given ID.
 * @param {*} page
 * @param {string} button_id
 * @returns {Promise<Object>} The parsed JSON annotations.
 */
export async function download_annotations(page, button_id) {
    // Set up download listener and click submit button
    const downloadPromise = page.waitForEvent("download");
    await page.click(`#${button_id}`);

    // Wait for the download to start and get the download object
    const download = await downloadPromise;

    // Get the path where the file was downloaded
    const path = await download.path();

    // Read the file content
    const jsonContent = fs.readFileSync(path, "utf-8");

    // Parse the JSON content and return
    return JSON.parse(jsonContent);
}
