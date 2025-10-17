/**
 * Playwright fixtures for e2e tests.
 * Provides custom test setup including build selection (minified vs unminified).
 */
import { test as base } from "@playwright/test";

/**
 * Extended test fixture that automatically routes ulabel.js to the correct build
 * based on the project name.
 */
export const test = base.extend({
    page: async ({ page, browserName }, use, testInfo) => {
        const isMinified = testInfo.project.name.includes("minified");

        if (isMinified) {
            // Intercept requests for ulabel.js and serve ulabel.min.js instead
            await page.route("**/ulabel.js", (route) => {
                const url = route.request().url();
                const minUrl = url.replace("/ulabel.js", "/ulabel.min.js");
                route.continue({ url: minUrl });
            });
            console.log(`[${testInfo.project.name}] Using minified build (ulabel.min.js)`);
        } else {
            console.log(`[${testInfo.project.name}] Using unminified build (ulabel.js)`);
        }

        // Use the page as normal
        await use(page);
    },
});

export { expect } from "@playwright/test";
