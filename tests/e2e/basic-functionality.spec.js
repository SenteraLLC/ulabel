// End-to-end tests for basic annotation functionality
import { test, expect } from "@playwright/test";
import { draw_bbox, draw_point } from "../utils/drawing_utils";

test.describe("ULabel Basic Functionality", () => {
    test("should load and initialize correctly", async ({ page }) => {
        await page.goto("/multi-class.html");

        // Wait for ULabel to initialize
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Check that the main container is present
        await expect(page.locator("#container")).toBeVisible();

        // Check that the image loads
        const img = page.locator("#ann_image__0");
        await expect(img).toBeVisible();

        // Get the expected image URL from the browser context
        const expectedSrc = await page.evaluate(() => window.ulabel.config.image_data.frames[0]);
        await expect(img).toHaveAttribute("src", expectedSrc);

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

        const bbox = await draw_bbox(page, [100, 100], [200, 200]);

        // Check that an annotation was created
        const annotationCount = await page.evaluate(() => {
            const currentSubtask = window.ulabel.get_current_subtask();
            return currentSubtask.annotations.ordering.length;
        });
        expect(annotationCount).toBe(1);

        const annotation = await page.evaluate(() => {
            const currentSubtask = window.ulabel.get_current_subtask();
            const annotationId = currentSubtask.annotations.ordering[0];
            return currentSubtask.annotations.access[annotationId];
        });

        expect(annotation.spatial_type).toBe("bbox");
        expect(annotation.spatial_payload).toEqual(bbox);
    });

    test("should create point annotation", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        const point = await draw_point(page, [150, 150]);

        // Check that an annotation was created
        const annotationCount = await page.evaluate(() => {
            const currentSubtask = window.ulabel.get_current_subtask();
            return currentSubtask.annotations.ordering.length;
        });

        expect(annotationCount).toBe(1);

        const annotation = await page.evaluate(() => {
            const currentSubtask = window.ulabel.get_current_subtask();
            const annotationId = currentSubtask.annotations.ordering[0];
            return currentSubtask.annotations.access[annotationId];
        });

        expect(annotation.spatial_type).toBe("point");
        expect(annotation.spatial_payload).toEqual(point);
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
        const canvas_id = await page.evaluate(() => window.ulabel.get_current_subtask().canvas_fid);
        const canvas = page.locator(`#${canvas_id}`);
        await canvas.click({ position: { x: 100, y: 100 } });

        // Click the submit button
        // The annotations will be downloaded as a JSON file
        // Load and parse the downloaded file to verify contents

        // Check that annotations contain expected data
        expect(annotations).toHaveProperty("annotations");
        expect(annotations.annotations).toHaveProperty("car_detection");
        const anno = annotations.annotations.car_detection[0];
        expect(anno.spatial_type).toBe("point");
        expect(anno.spatial_payload).toEqual([[100, 100]]);
        expect(anno.created_by).toBe("Demo User");
    });
});
