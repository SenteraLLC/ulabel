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

    // The edit-suggestion container is 0-height and pinned to the box centre, so
    // its rect top IS the anchor. The card hugs the button ring: above the anchor
    // normally, below it when there is no room above. `ring_max` is the furthest
    // the card's near edge may sit from the anchor (half a button + gap + slack),
    // catching regressions where the card drifts away from the ring.
    const get_card_geometry = async (page, conf_id, anchor_id) => {
        return page.evaluate(({ conf, anchor }) => {
            const card = document.querySelector(conf).getBoundingClientRect();
            const es_el = document.querySelector(anchor);
            const anchor_y = es_el.getBoundingClientRect().top;
            const scale = es_el.offsetWidth > 0 ?
                es_el.getBoundingClientRect().width / es_el.offsetWidth :
                1;
            const button = es_el.querySelector("a.global_sub_suggestion");
            const button_half = (button ? button.offsetHeight : 60) / 2;
            return {
                card_top: card.top,
                card_bottom: card.bottom,
                anchor_y,
                ring_max: button_half * scale + 10 + 8,
            };
        }, { conf: conf_id, anchor: anchor_id });
    };

    test("confidence card flips below buttons when annotation is near the top of the image", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const conf_id = `#global_annotation_confidence__${subtask_key}`;
        const anchor_id = `#global_edit_suggestion__${subtask_key}`;

        // Annotation well away from the top -> card above the buttons and box
        await draw_bbox(page, [400, 400], [500, 500]);
        await page.waitForTimeout(100);
        await page.mouse.move(450, 450);
        await page.waitForTimeout(200);

        const mid = await get_card_geometry(page, conf_id, anchor_id);
        // Card hugs the button ring above the anchor regardless of box size
        expect(mid.card_bottom).toBeLessThanOrEqual(mid.anchor_y - 5);
        expect(mid.anchor_y - mid.card_bottom).toBeLessThanOrEqual(mid.ring_max);

        // Annotation near the top edge -> card flips below the buttons
        await draw_bbox(page, [100, 5], [200, 30]);
        await page.waitForTimeout(100);
        await page.mouse.move(150, 15);
        await page.waitForTimeout(200);

        const top_edge = await get_card_geometry(page, conf_id, anchor_id);
        expect(top_edge.card_top).toBeGreaterThanOrEqual(top_edge.anchor_y + 5);
        expect(top_edge.card_top - top_edge.anchor_y).toBeLessThanOrEqual(top_edge.ring_max);
    });

    test("confidence card sits in the same spot when the subtask is read-only", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const conf_id = `#global_annotation_confidence__${subtask_key}`;
        const anchor_id = `#global_edit_suggestion__${subtask_key}`;

        await draw_bbox(page, [400, 400], [500, 500]);
        await page.waitForTimeout(100);
        await page.mouse.move(450, 450);
        await page.waitForTimeout(200);
        const editable = await get_card_geometry(page, conf_id, anchor_id);

        // Leave the annotation, flip the subtask to read-only, and re-hover
        await page.mouse.move(700, 650);
        await page.waitForTimeout(200);
        await page.evaluate(() => {
            window.ulabel.get_current_subtask().read_only = true;
        });
        await page.mouse.move(450, 450);
        await page.waitForTimeout(200);
        const read_only = await get_card_geometry(page, conf_id, anchor_id);

        // Buttons are hidden with `visibility` so their flow space survives and the
        // card lands in the exact same place (sub-pixel slack only).
        const button_visibility = await page.evaluate(({ anchor }) => {
            return getComputedStyle(
                document.querySelector(anchor).querySelector("a.global_sub_suggestion"),
            ).visibility;
        }, { anchor: anchor_id });
        expect(button_visibility).toBe("hidden");
        expect(Math.abs(read_only.card_top - editable.card_top)).toBeLessThanOrEqual(1);
        expect(Math.abs(read_only.card_bottom - editable.card_bottom)).toBeLessThanOrEqual(1);
    });

    test("confidence card hugs the ring on the single-class demo (0.666 dialog scale)", async ({ page }) => {
        await wait_for_ulabel_init(page, "/single-class.html");

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const conf_id = `#global_annotation_confidence__${subtask_key}`;
        const anchor_id = `#global_edit_suggestion__${subtask_key}`;

        await draw_bbox(page, [400, 400], [500, 500]);
        await page.waitForTimeout(100);
        await page.mouse.move(450, 450);
        await page.waitForTimeout(200);

        const geom = await get_card_geometry(page, conf_id, anchor_id);
        expect(geom.card_bottom).toBeLessThanOrEqual(geom.anchor_y - 5);
        expect(geom.anchor_y - geom.card_bottom).toBeLessThanOrEqual(geom.ring_max);
    });

    test("confidence card flip check accounts for annbox scroll position", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const conf_id = `#global_annotation_confidence__${subtask_key}`;
        const anchor_id = `#global_edit_suggestion__${subtask_key}`;

        const card_and_anchor = async () => page.evaluate(({ conf, anchor }) => {
            const card = document.querySelector(conf).getBoundingClientRect();
            const anchor_y = document.querySelector(anchor).getBoundingClientRect().top;
            return { card_top: card.top, card_bottom: card.bottom, anchor_y };
        }, { conf: conf_id, anchor: anchor_id });

        // Upper-middle annotation displays with card above (no flip)
        await draw_bbox(page, [400, 200], [500, 300]);
        await page.waitForTimeout(100);
        await page.mouse.move(450, 250);
        await page.waitForTimeout(200);

        const unscrolled = await card_and_anchor();
        expect(unscrolled.card_bottom).toBeLessThanOrEqual(unscrolled.anchor_y);

        // Zoom in enough for the imwrap to overflow the annbox so scrolling is possible
        await page.mouse.move(450, 250);
        for (let i = 0; i < 10; i++) {
            await page.mouse.wheel(0, -100);
        }
        await page.waitForTimeout(300);

        // Scroll the annbox so the annotation is near the top of the visible area
        const scroll_result = await page.evaluate(() => {
            const u = window.ulabel;
            const annbox = document.getElementById(u.config.annbox_id);
            const annid = u.get_current_subtask().annotations.ordering[0];
            const cbox = u.get_current_subtask().annotations.access[annid].containing_box;
            const cbox_y_scaled = ((cbox.tly + cbox.bry) / 2) * u.state.zoom_val;
            annbox.scrollTop = cbox_y_scaled;
            u.get_current_subtask().state.edit_candidate = { annid: annid };
            u.show_global_edit_suggestion(annid);
            return { scroll_top: annbox.scrollTop, cbox_y_scaled: cbox_y_scaled };
        });
        // Sanity: scroll happened and wasn't clamped far from the target
        expect(scroll_result.scroll_top).toBeGreaterThan(0);
        expect(scroll_result.scroll_top).toBeGreaterThanOrEqual(scroll_result.cbox_y_scaled - 100);
        await page.waitForTimeout(100);

        // Near the top of the visible area, the card flips below the anchor
        const scrolled = await card_and_anchor();
        expect(scrolled.card_top).toBeGreaterThanOrEqual(scrolled.anchor_y);
    });

    test("confidence card picks a class name even when all confidences are 0", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Draw a bbox using page coordinates (draw_bbox handles image-space mapping)
        await draw_bbox(page, [200, 200], [300, 300]);
        await page.waitForTimeout(100);

        // Force a single classification payload with confidence 0 (represents an all-zero import;
        // annotation.ts pads missing classes with 0.0, so this is a realistic scenario).
        await page.evaluate(() => {
            const u = window.ulabel;
            const annid = u.get_current_subtask().annotations.ordering[0];
            const anno = u.get_current_subtask().annotations.access[annid];
            anno.classification_payloads = [{ class_id: 10, confidence: 0 }];
        });

        // Trigger the confidence display programmatically
        await page.evaluate(() => {
            const u = window.ulabel;
            const subtask = u.get_current_subtask();
            const annid = subtask.annotations.ordering[0];
            subtask.state.edit_candidate = { annid: annid };
            u.show_global_edit_suggestion(annid);
            u.update_confidence_dialog();
        });
        await page.waitForTimeout(100);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const conf_id = `#global_annotation_confidence__${subtask_key}`;
        const classname = (await page.locator(`${conf_id} .annotation-confidence-classname`).textContent()).trim();
        const value = (await page.locator(`${conf_id} .annotation-confidence-value`).textContent()).trim();

        // Pre-fix: classname would be "Unknown" because the > 0 check never matched
        expect(classname).toBe("Sedan");
        expect(value).toBe("Confidence: 0.00");
    });

    test("switching subtasks clears hovered_annid on the outgoing subtask", async ({ page }) => {
        await wait_for_ulabel_init(page);

        await draw_bbox(page, [200, 200], [300, 300]);
        await page.waitForTimeout(100);

        // Hover to set hovered_annid on the current subtask
        await page.mouse.move(250, 250);
        await page.waitForTimeout(200);

        const before = await page.evaluate(() => {
            const u = window.ulabel;
            const key = u.get_current_subtask_key();
            return {
                key: key,
                hovered_annid: u.subtasks[key].state.hovered_annid,
            };
        });
        expect(before.hovered_annid).not.toBeNull();

        // Switch to the next subtask
        await page.evaluate(() => window.ulabel.switch_to_next_subtask());
        await page.waitForTimeout(100);

        // The previous subtask's hovered_annid must be cleared so its stale outline doesn't linger
        const after = await page.evaluate((old_key) => {
            return window.ulabel.subtasks[old_key].state.hovered_annid;
        }, before.key);
        expect(after).toBeNull();
    });
});
