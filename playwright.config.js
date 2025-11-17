import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false, // Run tests sequentially for more stable results
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 3,
    reporter: "list",
    use: {
        baseURL: "http://localhost:8080",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        // Enable downloads
        acceptDownloads: true,
    },

    projects: [
        // Test with unminified build
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },
        // Test with minified build
        {
            name: "chromium-minified",
            use: {
                ...devices["Desktop Chrome"],
                // Use context option to intercept and replace ulabel.js with ulabel.min.js
                contextOptions: {
                    serviceWorkers: "block",
                },
            },
            testMatch: /.*\.spec\.js/,
        },
        {
            name: "firefox-minified",
            use: {
                ...devices["Desktop Firefox"],
                contextOptions: {
                    serviceWorkers: "block",
                },
            },
            testMatch: /.*\.spec\.js/,
        },
        {
            name: "webkit-minified",
            use: {
                ...devices["Desktop Safari"],
                contextOptions: {
                    serviceWorkers: "block",
                },
            },
            testMatch: /.*\.spec\.js/,
        },
    ],

    webServer: {
        command: "npm run demo",
        url: "http://localhost:8080/multi-class.html",
        reuseExistingServer: !process.env.CI,
    },
});
