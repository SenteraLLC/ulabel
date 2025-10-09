// End-to-end tests for basic annotation functionality
import { test, expect } from "@playwright/test";
import { draw_bbox, draw_point } from "../utils/drawing_utils";
import { download_annotations } from "../utils/general_utils";
import { waitForULabelInit } from "../utils/init_utils";
import { getAnnotationCount, getAnnotationByIndex } from "../utils/annotation_utils";
import { switchToMode } from "../utils/mode_utils";
import { getCurrentSubtaskKey, switchToSubtask, getSubtaskCount } from "../utils/subtask_utils";

test.describe("ULabel Basic Functionality", () => {
    test("should load and initialize correctly", async ({ page }) => {
        await waitForULabelInit(page);

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
        await waitForULabelInit(page);

        // Test switching to bbox mode
        await switchToMode(page, "bbox");
        await expect(page.locator("a#md-btn--bbox")).toHaveClass(/sel/);

        // Test switching to polygon mode
        await switchToMode(page, "polygon");
        await expect(page.locator("a#md-btn--polygon")).toHaveClass(/sel/);

        // Test switching to point mode
        await switchToMode(page, "point");
        await expect(page.locator("a#md-btn--point")).toHaveClass(/sel/);
    });

    test("should create bbox annotation", async ({ page }) => {
        await waitForULabelInit(page);

        const bbox = await draw_bbox(page, [100, 100], [200, 200]);

        // Check that an annotation was created
        const annotationCount = await getAnnotationCount(page);
        expect(annotationCount).toBe(1);

        const annotation = await getAnnotationByIndex(page, 0);

        expect(annotation.spatial_type).toBe("bbox");
        expect(annotation.spatial_payload).toEqual(bbox);
    });

    test("should create point annotation", async ({ page }) => {
        await waitForULabelInit(page);

        const point = await draw_point(page, [150, 150]);

        // Check that an annotation was created
        const annotationCount = await getAnnotationCount(page);
        expect(annotationCount).toBe(1);

        const annotation = await getAnnotationByIndex(page, 0);

        expect(annotation.spatial_type).toBe("point");
        expect(annotation.spatial_payload).toEqual(point);
    });

    test("should switch between subtasks", async ({ page }) => {
        await waitForULabelInit(page);

        // Get initial subtask
        const initialSubtaskKey = await getCurrentSubtaskKey(page);

        // Switch subtask (assuming there are multiple subtasks)
        const tabCount = await getSubtaskCount(page);

        if (tabCount > 1) {
            await switchToSubtask(page, 1);

            const newSubtaskKey = await getCurrentSubtaskKey(page);
            expect(newSubtaskKey).not.toBe(initialSubtaskKey);
        }
    });

    test("should handle submit button", async ({ page }) => {
        await waitForULabelInit(page);

        // Create an annotation first
        const point = await draw_point(page, [100, 100]);

        const annotations = await download_annotations(page, "submit");

        // Check that annotations contain expected data
        expect(annotations).toHaveProperty("annotations");
        expect(annotations.annotations).toHaveProperty("car_detection");
        const anno = annotations.annotations.car_detection[0];
        expect(anno.spatial_type).toBe("point");
        expect(anno.spatial_payload).toEqual(point);
        expect(anno.created_by).toBe("DemoUser");
    });
});
