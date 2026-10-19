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

/**
 * Deterministically sets zoom_val to `mul` times the "whole image just fits"
 * zoom and centers the image, so the imwrap comfortably overflows the annbox
 * in both axes. Subsequent `rezoom` calls end up with scroll positions far from
 * the browser's `[0, max]` clamp boundaries, letting the focal-point anchoring
 * invariant be tested without confounds from browser scroll clamping.
 * @param {import('@playwright/test').Page} page
 * @param {number} mul
 */
async function setup_deterministic_zoom(page, mul = 4) {
    await page.evaluate((m) => {
        const ul = window.ulabel;
        const annbox = document.getElementById(ul.config.annbox_id);
        const fit_zoom = Math.min(
            annbox.clientHeight / ul.config.image_height,
            annbox.clientWidth / ul.config.image_width,
        );
        ul.state.zoom_val = fit_zoom * m;
        // Center on the image center so scroll lands near the middle of its
        // valid range (imwrap - annbox) / 2 in each axis.
        ul.rezoom(ul.config.image_width / 2, ul.config.image_height / 2, true);
    }, mul);
    await page.waitForTimeout(50);
}

test.describe("Wheel-zoom focal point (offset container)", () => {
    test("wheel zoom keeps the pixel under the cursor anchored", async ({ page }) => {
        await wait_for_ulabel_init(page, "/offset-container.html");
        await setup_deterministic_zoom(page);

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
        await setup_deterministic_zoom(page);

        const annbox_rect = await get_annbox_rect(page);
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
        await setup_deterministic_zoom(page);

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
        // Slightly looser than the 2 px used for a single wheel step: drag_rezoom runs
        // for each of the ~10 dispatched mousemove events, so small per-iteration
        // rounding is expected to accumulate a few pixels.
        expect(Math.abs(new_viewport.x - start.x)).toBeLessThanOrEqual(5);
        expect(Math.abs(new_viewport.y - start.y)).toBeLessThanOrEqual(5);
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

test.describe("Wheel-zoom focal point (scaled ancestor)", () => {
    test("wheel zoom anchors correctly under a CSS-scaled ancestor", async ({ page }) => {
        // The offset demo already has an ancestor wrapper (#offset-wrapper) we can
        // scale from the origin. Use scale(0.5) so the annbox's rendered size is
        // half of its layout size; this exercises the scale-aware conversion in
        // `viewport_to_annbox_local`.
        await wait_for_ulabel_init(page, "/offset-container.html");
        await page.evaluate(() => {
            const wrap = document.getElementById("offset-wrapper");
            wrap.style.transformOrigin = "0 0";
            wrap.style.transform = "scale(0.5)";
        });
        // Give the layout a frame to settle after transform
        await page.waitForTimeout(50);
        await setup_deterministic_zoom(page);

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

        // Under scale(0.5) the annbox is half its layout size on screen, so a
        // 1-layout-pixel drift is 0.5 rendered pixels. Keep tolerance loose in
        // case cross-browser rounding differs.
        const new_viewport = image_to_viewport(image_point.x, image_point.y, after);
        expect(Math.abs(new_viewport.x - focal.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(new_viewport.y - focal.y)).toBeLessThanOrEqual(2);
    });
});
