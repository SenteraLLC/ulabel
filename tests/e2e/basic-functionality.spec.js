// End-to-end tests for basic annotation functionality
import { test, expect } from "./fixtures";
import { draw_bbox, draw_point } from "../testing-utils/drawing_utils";
import { download_annotations } from "../testing-utils/general_utils";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { get_annotation_count, get_annotation_by_index } from "../testing-utils/annotation_utils";
import { switch_to_mode } from "../testing-utils/mode_utils";
import { get_current_subtask_key, switch_to_subtask, get_subtask_count } from "../testing-utils/subtask_utils";

test.describe("ULabel Basic Functionality", () => {
    test("should load and initialize correctly", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Check that the main container is present
        await expect(page.locator("#container")).toBeVisible();

        // Check that the image loads
        const img = page.locator("#ann_image__0");
        await expect(img).toBeVisible();

        // Get the expected image URL from the browser context
        const expected_src = await page.evaluate(() => window.ulabel.config.image_data.frames[0]);
        await expect(img).toHaveAttribute("src", expected_src);

        // Check that toolbox is present
        await expect(page.locator(".toolbox_cls")).toBeVisible();
    });

    test("should switch between annotation modes", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Test switching to bbox mode
        await switch_to_mode(page, "bbox");
        await expect(page.locator("a#md-btn--bbox")).toHaveClass(/sel/);

        // Test switching to polygon mode
        await switch_to_mode(page, "polygon");
        await expect(page.locator("a#md-btn--polygon")).toHaveClass(/sel/);

        // Test switching to point mode
        await switch_to_mode(page, "point");
        await expect(page.locator("a#md-btn--point")).toHaveClass(/sel/);
    });

    test("should create bbox annotation", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const bbox = await draw_bbox(page, [100, 100], [200, 200]);

        // Check that an annotation was created
        const annotation_count = await get_annotation_count(page);
        expect(annotation_count).toBe(1);

        const annotation = await get_annotation_by_index(page, 0);

        expect(annotation.spatial_type).toBe("bbox");
        expect(annotation.spatial_payload).toEqual(bbox);
    });

    test("should create point annotation", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const point = await draw_point(page, [150, 150]);

        // Check that an annotation was created
        const annotation_count = await get_annotation_count(page);
        expect(annotation_count).toBe(1);

        const annotation = await get_annotation_by_index(page, 0);

        expect(annotation.spatial_type).toBe("point");
        expect(annotation.spatial_payload).toEqual(point);
    });

    test("should switch between subtasks", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get initial subtask
        const initial_subtask_key = await get_current_subtask_key(page);

        // Switch subtask (assuming there are multiple subtasks)
        const tab_count = await get_subtask_count(page);

        if (tab_count > 1) {
            await switch_to_subtask(page, 1);

            const new_subtask_key = await get_current_subtask_key(page);
            expect(new_subtask_key).not.toBe(initial_subtask_key);
        }
    });

    test("should handle submit button", async ({ page }) => {
        await wait_for_ulabel_init(page);

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

    test("hovered_annid tracks the annotation under the cursor", async ({ page }) => {
        await wait_for_ulabel_init(page);

        await draw_bbox(page, [200, 200], [300, 300]);
        await page.waitForTimeout(100);

        const initial_hovered = await page.evaluate(() => window.ulabel.get_current_subtask().state.hovered_annid);
        expect(initial_hovered).toBeNull();

        // Hover over the bbox
        await page.mouse.move(250, 250);
        await page.waitForTimeout(200);

        const hovered_over_bbox = await page.evaluate(() => {
            const st = window.ulabel.get_current_subtask();
            const annid = st.state.hovered_annid;
            return {
                hovered_annid: annid,
                matches_annotation: annid !== null && annid === st.annotations.ordering[0],
            };
        });
        expect(hovered_over_bbox.hovered_annid).not.toBeNull();
        expect(hovered_over_bbox.matches_annotation).toBe(true);

        // Move cursor away from the annotation
        await page.mouse.move(50, 50);
        await page.waitForTimeout(200);

        const hovered_after_leave = await page.evaluate(() => window.ulabel.get_current_subtask().state.hovered_annid);
        expect(hovered_after_leave).toBeNull();
    });

    test("confidence card shows class name and confidence value on hover", async ({ page }) => {
        await wait_for_ulabel_init(page);

        await draw_bbox(page, [200, 200], [300, 300]);
        await page.waitForTimeout(100);

        // Hover to display the confidence card
        await page.mouse.move(250, 250);
        await page.waitForTimeout(200);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const conf_id = `#global_annotation_confidence__${subtask_key}`;

        const classname = (await page.locator(`${conf_id} .annotation-confidence-classname`).textContent()).trim();
        const value = (await page.locator(`${conf_id} .annotation-confidence-value`).textContent()).trim();

        // First class in multi-class.html's car_detection subtask is "Sedan"
        expect(classname).toBe("Sedan");
        // Manually-drawn annotations get confidence 1
        expect(value).toBe("Confidence: 1.00");
    });

    test("confidence card flips below buttons when annotation is near the top of the image", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const conf_id = `#global_annotation_confidence__${subtask_key}`;

        // Annotation well away from the top -> card above the buttons (default -9.5em)
        await draw_bbox(page, [400, 400], [500, 500]);
        await page.waitForTimeout(100);
        await page.mouse.move(450, 450);
        await page.waitForTimeout(200);

        const margin_below_center = await page.locator(conf_id).evaluate((el) => el.style.marginTop);
        expect(margin_below_center).toBe("-9.5em");

        // Annotation near the top edge -> card flips below the buttons
        await draw_bbox(page, [100, 5], [200, 30]);
        await page.waitForTimeout(100);
        await page.mouse.move(150, 15);
        await page.waitForTimeout(200);

        const margin_near_top = await page.locator(conf_id).evaluate((el) => el.style.marginTop);
        expect(margin_near_top).toBe("-1em");
    });
});
