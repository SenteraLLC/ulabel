// End-to-end tests for basic annotation functionality
import { test, expect } from "@playwright/test";

test.describe("ULabel Basic Functionality", () => {
    test("should load and initialize correctly", async ({ page }) => {
        await page.goto("/multi-class.html");

        // Wait for ULabel to initialize
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Check that the main container is present
        await expect(page.locator("#container")).toBeVisible();

        // Check that the image loads
        await expect(page.locator("img")).toBeVisible();

        // Check that toolbox is present
        await expect(page.locator(".toolbox_cls")).toBeVisible();
    });

    test("should switch between annotation modes", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Test switching to bbox mode
        await page.click("a#md-btn--bbox");
        await expect(page.locator("a#md-btn--bbox")).toHaveClass(/sel/);

        // Test switching to polygon mode
        await page.click("a#md-btn--polygon");
        await expect(page.locator("a#md-btn--polygon")).toHaveClass(/sel/);

        // Test switching to point mode
        await page.click("a#md-btn--point");
        await expect(page.locator("a#md-btn--point")).toHaveClass(/sel/);
    });

    test("should create bbox annotation", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Switch to bbox mode
        await page.click("a#md-btn--bbox");

        // Get the canvas element
        const canvas = page.locator("canvas.front_canvas");

        // Create a bbox by clicking and dragging
        await canvas.click({ position: { x: 100, y: 100 } });
        await canvas.click({ position: { x: 200, y: 200 } });

        // Check that an annotation was created
        const annotationCount = await page.evaluate(() => {
            const currentSubtask = window.ulabel.get_current_subtask();
            return currentSubtask.annotations.ordering.length;
        });

        expect(annotationCount).toBe(1);
    });

    test("should create point annotation", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Switch to point mode
        await page.click("a#md-btn--point");

        // Get the canvas element
        const canvas = page.locator("canvas.front_canvas");

        // Create a point by clicking
        await canvas.click({ position: { x: 150, y: 150 } });

        // Check that an annotation was created
        const annotationCount = await page.evaluate(() => {
            const currentSubtask = window.ulabel.get_current_subtask();
            return currentSubtask.annotations.ordering.length;
        });

        expect(annotationCount).toBe(1);
    });

    test("should switch between subtasks", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Get initial subtask
        const initialSubtask = await page.evaluate(() => window.ulabel.get_current_subtask_key());

        // Switch subtask (assuming there are multiple subtasks)
        const subtaskTabs = page.locator(".toolbox-tabs a");
        const tabCount = await subtaskTabs.count();

        if (tabCount > 1) {
            await subtaskTabs.nth(1).click();

            const newSubtask = await page.evaluate(() => window.ulabel.get_current_subtask_key());
            expect(newSubtask).not.toBe(initialSubtask);
        }
    });

    test("should handle submit button", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Create an annotation first
        await page.click("a#md-btn--point");
        const canvas = page.locator("canvas.front_canvas");
        await canvas.click({ position: { x: 100, y: 100 } });

        // Mock the download functionality
        await page.evaluate(() => {
            // Override the submit function to capture the result
            window.lastSubmittedAnnotations = null;
            const originalOnSubmit = window.on_submit;
            window.on_submit = function (annotations) {
                window.lastSubmittedAnnotations = annotations;
            };
        });

        // Click submit button
        await page.click("button:has-text(\"Submit\")");

        // Check that annotations were submitted
        const submittedAnnotations = await page.evaluate(() => window.lastSubmittedAnnotations);
        expect(submittedAnnotations).toBeTruthy();
    });
});
