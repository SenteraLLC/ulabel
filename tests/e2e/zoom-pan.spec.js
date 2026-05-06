// End-to-end tests for zoom and pan interactions
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

/**
 * Returns the current zoom_val from the ULabel instance.
 * @param {import('@playwright/test').Page} page
 */
async function get_zoom_val(page) {
    return await page.evaluate(() => window.ulabel.state.zoom_val);
}

/**
 * Returns the current annbox scroll position {left, top}.
 * @param {import('@playwright/test').Page} page
 */
async function get_annbox_scroll(page) {
    return await page.evaluate(() => {
        const annbox = document.getElementById(window.ulabel.config.annbox_id);
        return { left: annbox.scrollLeft, top: annbox.scrollTop };
    });
}

/**
 * Returns the canvas element id for the current subtask.
 * @param {import('@playwright/test').Page} page
 */
async function get_canvas_fid(page) {
    return await page.evaluate(() => window.ulabel.get_current_subtask().canvas_fid);
}

/**
 * Performs a click-drag from start to end with the given mouse button and
 * optional modifier keys.
 * @param {import('@playwright/test').Page} page
 * @param {{x: number, y: number}} start
 * @param {{x: number, y: number}} end
 * @param {{button?: "left"|"middle"|"right", modifiers?: string[], steps?: number}} opts
 */
async function click_drag(page, start, end, opts = {}) {
    const button = opts.button ?? "left";
    const modifiers = opts.modifiers ?? [];
    const steps = opts.steps ?? 10;

    for (const mod of modifiers) {
        await page.keyboard.down(mod);
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down({ button });
    await page.mouse.move(end.x, end.y, { steps });
    await page.mouse.up({ button });
    for (const mod of modifiers) {
        await page.keyboard.up(mod);
    }
}

test.describe("Zoom and Pan Interactions", () => {
    test("mouse wheel up zooms in", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const initial_zoom = await get_zoom_val(page);

        // Move into the annbox before scrolling
        await page.mouse.move(400, 400);
        await page.mouse.wheel(0, -100); // negative deltaY = zoom in
        await page.waitForTimeout(50);

        const new_zoom = await get_zoom_val(page);
        expect(new_zoom).toBeGreaterThan(initial_zoom);
    });

    test("mouse wheel down zooms out", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Zoom in first so we have room to zoom out
        await page.mouse.move(400, 400);
        await page.mouse.wheel(0, -200);
        await page.waitForTimeout(50);

        const before_out = await get_zoom_val(page);

        await page.mouse.wheel(0, 100); // positive deltaY = zoom out
        await page.waitForTimeout(50);

        const after_out = await get_zoom_val(page);
        expect(after_out).toBeLessThan(before_out);
    });

    test("middle-click drag pans the annbox", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Zoom in so the image is larger than the viewport and can be panned
        await page.mouse.move(400, 400);
        await page.mouse.wheel(0, -300);
        await page.waitForTimeout(50);

        const before = await get_annbox_scroll(page);

        // Drag from (500, 400) to (300, 250) — should pan the view
        await click_drag(page, { x: 500, y: 400 }, { x: 300, y: 250 }, { button: "middle" });
        await page.waitForTimeout(50);

        const after = await get_annbox_scroll(page);
        // Pan should change at least one of the scroll positions
        expect(after.left !== before.left || after.top !== before.top).toBe(true);
    });

    test("ctrl+left-click drag on canvas pans the annbox", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Zoom in so we can pan
        await page.mouse.move(400, 400);
        await page.mouse.wheel(0, -300);
        await page.waitForTimeout(50);

        const canvas_fid = await get_canvas_fid(page);
        const canvas = page.locator(`#${canvas_fid}`);
        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const end = { x: start.x - 80, y: start.y - 60 };

        const before = await get_annbox_scroll(page);
        await click_drag(page, start, end, { button: "left", modifiers: ["Control"] });
        await page.waitForTimeout(50);
        const after = await get_annbox_scroll(page);

        expect(after.left !== before.left || after.top !== before.top).toBe(true);
    });

    test("shift+left-click drag on canvas zooms", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const canvas_fid = await get_canvas_fid(page);
        const canvas = page.locator(`#${canvas_fid}`);
        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        const before_zoom = await get_zoom_val(page);

        // Drag upward — drag_rezoom raises zoom when mouse moves up
        const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const end = { x: start.x, y: start.y - 150 };

        await click_drag(page, start, end, { button: "left", modifiers: ["Shift"] });
        await page.waitForTimeout(50);

        const after_zoom = await get_zoom_val(page);
        expect(after_zoom).toBeGreaterThan(before_zoom);
    });

    test("shift+left-click drag still zooms when subtask is vanished", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Vanish the current subtask
        await page.evaluate(() => {
            window.ulabel.get_current_subtask().state.is_vanished = true;
        });

        const canvas_fid = await get_canvas_fid(page);
        const canvas = page.locator(`#${canvas_fid}`);
        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        const before_zoom = await get_zoom_val(page);

        const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const end = { x: start.x, y: start.y - 150 };

        await click_drag(page, start, end, { button: "left", modifiers: ["Shift"] });
        await page.waitForTimeout(50);

        const after_zoom = await get_zoom_val(page);
        expect(after_zoom).toBeGreaterThan(before_zoom);
    });

    test("middle-click drag still pans when subtask is vanished and does not start an annotation drag", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Zoom in so the image overflows the viewport (otherwise scroll positions
        // cannot change anyway, which would make the assertion meaningless).
        await page.mouse.move(400, 400);
        await page.mouse.wheel(0, -300);
        await page.waitForTimeout(50);

        // Vanish the current subtask
        await page.evaluate(() => {
            window.ulabel.get_current_subtask().state.is_vanished = true;
        });

        // Record annotation count and observe drag_state.active_key during the drag
        // by patching start_drag — this lets us catch any annotation drag that may
        // start before mouseup clears active_key back to null.
        const initial_annotation_count = await page.evaluate(() => {
            const st = window.ulabel.get_current_subtask();
            return Object.keys(st.annotations.access).length;
        });
        await page.evaluate(() => {
            window.__observed_drag_keys = [];
            const ul = window.ulabel;
            const original_start_drag = ul.start_drag.bind(ul);
            ul.start_drag = function (drag_key, mouse_button, mouse_event) {
                window.__observed_drag_keys.push(drag_key);
                return original_start_drag(drag_key, mouse_button, mouse_event);
            };
        });

        const before = await get_annbox_scroll(page);
        await click_drag(page, { x: 500, y: 400 }, { x: 300, y: 250 }, { button: "middle" });
        await page.waitForTimeout(50);
        const after = await get_annbox_scroll(page);

        // Pan must have moved the annbox scroll position
        expect(after.left !== before.left || after.top !== before.top).toBe(true);

        // Only a "pan" drag should have started — no annotation drag
        const observed = await page.evaluate(() => window.__observed_drag_keys);
        expect(observed).toEqual(["pan"]);

        // No annotation should have been created
        const final_annotation_count = await page.evaluate(() => {
            const st = window.ulabel.get_current_subtask();
            return Object.keys(st.annotations.access).length;
        });
        expect(final_annotation_count).toBe(initial_annotation_count);
    });

    test("annotation drag is blocked when subtask is vanished", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Ensure bbox mode
        await page.click("a#md-btn--bbox");
        await page.waitForTimeout(50);

        // Vanish the current subtask
        await page.evaluate(() => {
            window.ulabel.get_current_subtask().state.is_vanished = true;
        });

        const initial_count = await page.evaluate(() => {
            const st = window.ulabel.get_current_subtask();
            return Object.keys(st.annotations.access).length;
        });

        // Attempt to draw a bbox via plain left-drag on the canvas
        const canvas_fid = await get_canvas_fid(page);
        const canvas = page.locator(`#${canvas_fid}`);
        const box = await canvas.boundingBox();
        const start = { x: box.x + box.width / 2 - 60, y: box.y + box.height / 2 - 40 };
        const end = { x: start.x + 120, y: start.y + 80 };
        await click_drag(page, start, end, { button: "left" });
        await page.waitForTimeout(100);

        // No annotation should have been created — annotation drags are blocked while vanished
        const final_count = await page.evaluate(() => {
            const st = window.ulabel.get_current_subtask();
            return Object.keys(st.annotations.access).length;
        });
        expect(final_count).toBe(initial_count);

        // drag_state.active_key should still be null
        const active_key = await page.evaluate(() => window.ulabel.drag_state.active_key);
        expect(active_key).toBeNull();
    });
});
