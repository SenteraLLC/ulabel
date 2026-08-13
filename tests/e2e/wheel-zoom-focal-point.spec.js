// End-to-end tests for wheel-zoom / drag-zoom focal-point anchoring when the
// ULabel container is offset from the viewport origin. Guards against the
// regression described in ulabel-wheel-zoom-focal-point.md: `handle_wheel` and
// `drag_rezoom` used to pass raw viewport coords into `rezoom`, which expects
// annbox-local coords, so zoom would snap by the annbox's screen offset.
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

/**
 * Returns the imwrap element's bounding rect and the current zoom_val. The
 * imwrap wraps the image at its zoomed size, so its viewport-space rect is
 * the ground truth for mapping between image pixels and screen pixels.
 * @param {import('@playwright/test').Page} page
 */
async function get_imwrap_state(page) {
    return await page.evaluate(() => {
        const imwrap = document.getElementById(window.ulabel.config.imwrap_id);
        const rect = imwrap.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            image_width: window.ulabel.config.image_width,
            image_height: window.ulabel.config.image_height,
            zoom_val: window.ulabel.state.zoom_val,
        };
    });
}

/**
 * Given an image-pixel coordinate and an imwrap state snapshot, return the
 * corresponding viewport (client) coordinate.
 */
function image_to_viewport(image_x, image_y, imwrap_state) {
    return {
        x: imwrap_state.left + image_x * imwrap_state.width / imwrap_state.image_width,
        y: imwrap_state.top + image_y * imwrap_state.height / imwrap_state.image_height,
    };
}

/**
 * Inverse of image_to_viewport.
 */
function viewport_to_image(viewport_x, viewport_y, imwrap_state) {
    return {
        x: (viewport_x - imwrap_state.left) * imwrap_state.image_width / imwrap_state.width,
        y: (viewport_y - imwrap_state.top) * imwrap_state.image_height / imwrap_state.height,
    };
}

/**
 * Returns the annbox's viewport-space bounding rect.
 * @param {import('@playwright/test').Page} page
 */
async function get_annbox_rect(page) {
    return await page.evaluate(() => {
        const annbox = document.getElementById(window.ulabel.config.annbox_id);
        return annbox.getBoundingClientRect().toJSON();
    });
}

test.describe("Wheel-zoom focal point (offset container)", () => {
    test("wheel zoom keeps the pixel under the cursor anchored", async ({ page }) => {
        await wait_for_ulabel_init(page, "/offset-container.html");

        const annbox_rect = await get_annbox_rect(page);
        // Pick a focal point comfortably inside the annbox but off-center so the
        // annbox offset genuinely matters (a centered focal happens to survive
        // the buggy formula for symmetric layouts).
        const focal = {
            x: annbox_rect.left + annbox_rect.width * 0.35,
            y: annbox_rect.top + annbox_rect.height * 0.6,
        };

        const before = await get_imwrap_state(page);
        const image_point = viewport_to_image(focal.x, focal.y, before);

        // Move mouse to focal and wheel to zoom in
        await page.mouse.move(focal.x, focal.y);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(50);

        const after = await get_imwrap_state(page);
        // Sanity: zoom actually changed
        expect(after.zoom_val).toBeGreaterThan(before.zoom_val);

        // The same image pixel should still sit under the cursor
        const new_viewport = image_to_viewport(image_point.x, image_point.y, after);
        expect(Math.abs(new_viewport.x - focal.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(new_viewport.y - focal.y)).toBeLessThanOrEqual(2);
    });

    test("wheel zoom out keeps the pixel under the cursor anchored", async ({ page }) => {
        await wait_for_ulabel_init(page, "/offset-container.html");

        // Zoom in a bit first so there is room to zoom out meaningfully
        const annbox_rect = await get_annbox_rect(page);
        await page.mouse.move(
            annbox_rect.left + annbox_rect.width * 0.5,
            annbox_rect.top + annbox_rect.height * 0.5,
        );
        await page.mouse.wheel(0, -300);
        await page.waitForTimeout(50);

        const focal = {
            x: annbox_rect.left + annbox_rect.width * 0.7,
            y: annbox_rect.top + annbox_rect.height * 0.3,
        };

        const before = await get_imwrap_state(page);
        const image_point = viewport_to_image(focal.x, focal.y, before);

        await page.mouse.move(focal.x, focal.y);
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(50);

        const after = await get_imwrap_state(page);
        expect(after.zoom_val).toBeLessThan(before.zoom_val);

        const new_viewport = image_to_viewport(image_point.x, image_point.y, after);
        expect(Math.abs(new_viewport.x - focal.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(new_viewport.y - focal.y)).toBeLessThanOrEqual(2);
    });

    test("shift+drag zoom keeps the mousedown pixel anchored", async ({ page }) => {
        await wait_for_ulabel_init(page, "/offset-container.html");

        const annbox_rect = await get_annbox_rect(page);
        const start = {
            x: annbox_rect.left + annbox_rect.width * 0.4,
            y: annbox_rect.top + annbox_rect.height * 0.55,
        };

        const before = await get_imwrap_state(page);
        const image_point = viewport_to_image(start.x, start.y, before);

        // Shift+drag upward zooms in; drag_rezoom uses the mousedown point as
        // the focal, so the image pixel at `start` should stay under `start`.
        await page.keyboard.down("Shift");
        await page.mouse.move(start.x, start.y);
        await page.mouse.down({ button: "left" });
        await page.mouse.move(start.x, start.y - 150, { steps: 10 });
        await page.mouse.up({ button: "left" });
        await page.keyboard.up("Shift");
        await page.waitForTimeout(50);

        const after = await get_imwrap_state(page);
        expect(after.zoom_val).toBeGreaterThan(before.zoom_val);

        const new_viewport = image_to_viewport(image_point.x, image_point.y, after);
        expect(Math.abs(new_viewport.x - start.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(new_viewport.y - start.y)).toBeLessThanOrEqual(2);
    });
});

test.describe("Wheel-zoom focal point (non-offset container regression)", () => {
    test("wheel zoom still anchors correctly when container is at viewport origin", async ({ page }) => {
        // multi-class.html positions the container at (0, 0), so this exercises
        // the codepath that was already working and would not regress from the
        // fix (rect.left == 0, rect.top == 0).
        await wait_for_ulabel_init(page, "/multi-class.html");

        const annbox_rect = await get_annbox_rect(page);
        const focal = {
            x: annbox_rect.left + annbox_rect.width * 0.35,
            y: annbox_rect.top + annbox_rect.height * 0.6,
        };

        const before = await get_imwrap_state(page);
        const image_point = viewport_to_image(focal.x, focal.y, before);

        await page.mouse.move(focal.x, focal.y);
        await page.mouse.wheel(0, -100);
        await page.waitForTimeout(50);

        const after = await get_imwrap_state(page);
        expect(after.zoom_val).toBeGreaterThan(before.zoom_val);

        const new_viewport = image_to_viewport(image_point.x, image_point.y, after);
        expect(Math.abs(new_viewport.x - focal.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(new_viewport.y - focal.y)).toBeLessThanOrEqual(2);
    });
});
