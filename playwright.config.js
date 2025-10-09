import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false, // Run tests sequentially for more stable results
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 2,
    reporter: "list",
    use: {
        baseURL: "http://localhost:8080",
        trace: "on-first-retry",
        screenshot: "on",
        video: "retain-on-failure",
        // Enable downloads
        acceptDownloads: true,
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        // Commenting out other browsers for now to simplify testing
        // {
        //     name: "firefox",
        //     use: { ...devices["Desktop Firefox"] },
        // },
        // {
        //     name: "webkit",
        //     use: { ...devices["Desktop Safari"] },
        // },
    ],

    webServer: {
        command: "npm run build-and-demo",
        url: "http://localhost:8080/multi-class.html",
        reuseExistingServer: !process.env.CI,
    },
});
