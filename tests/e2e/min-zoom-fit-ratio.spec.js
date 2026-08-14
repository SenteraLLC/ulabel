// End-to-end tests for the `min_zoom_fit_ratio` config option, which floors
// zoom_val at a multiple of the "whole image just fits" zoom so users cannot
// zoom out farther than the image bounds.
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

/**
 * Returns the current zoom_val and the current fit-to-viewport zoom
 * (the `show_whole_image` floor) for the running ULabel instance.
 * @param {import('@playwright/test').Page} page
 */
async function get_zoom_state(page) {
    return await page.evaluate(() => {
        const ul = window.ulabel;
        const annbox = document.getElementById(ul.config.annbox_id);
        const fit_zoom = Math.min(
            annbox.clientHeight / ul.config.image_height,
            annbox.clientWidth / ul.config.image_width,
        );
        return {
            zoom_val: ul.state.zoom_val,
            fit_zoom,
        };
    });
}

/**
 * Sets `min_zoom_fit_ratio` at runtime. `set_zoom_val` reads the value on every
 * call, so this is enough — no reinitialization required.
 * @param {import('@playwright/test').Page} page
 * @param {number} ratio
 */
async function set_min_zoom_fit_ratio(page, ratio) {
    await page.evaluate((r) => {
        window.ulabel.config.min_zoom_fit_ratio = r;
    }, ratio);
}

test.describe("min_zoom_fit_ratio", () => {
    test("default (0) allows zooming out past the image bounds", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Zoom out repeatedly with the wheel; without a floor, zoom_val drops
        // well below the fit zoom.
        await page.mouse.move(400, 400);
        for (let i = 0; i < 20; i++) {
            await page.mouse.wheel(0, 100);
        }
        await page.waitForTimeout(50);

        const { zoom_val, fit_zoom } = await get_zoom_state(page);
        expect(zoom_val).toBeLessThan(fit_zoom);
    });

    test("ratio of 1.0 floors wheel zoom-out at fit-to-viewport", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await set_min_zoom_fit_ratio(page, 1.0);

        // Zoom out well past the fit level
        await page.mouse.move(400, 400);
        for (let i = 0; i < 20; i++) {
            await page.mouse.wheel(0, 100);
        }
        await page.waitForTimeout(50);

        const { zoom_val, fit_zoom } = await get_zoom_state(page);
        // Allow a tiny floating-point tolerance
        expect(zoom_val).toBeGreaterThanOrEqual(fit_zoom - 1e-6);
    });

    test("ratio of 2.0 forces the image to always overflow the viewport", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await set_min_zoom_fit_ratio(page, 2.0);

        // Zoom out repeatedly
        await page.mouse.move(400, 400);
        for (let i = 0; i < 20; i++) {
            await page.mouse.wheel(0, 100);
        }
        await page.waitForTimeout(50);

        const { zoom_val, fit_zoom } = await get_zoom_state(page);
        expect(zoom_val).toBeGreaterThanOrEqual(fit_zoom * 2 - 1e-6);
    });

    test("zoom-in is unaffected by the floor", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await set_min_zoom_fit_ratio(page, 1.0);

        const before = await get_zoom_state(page);

        // Zoom in with the wheel
        await page.mouse.move(400, 400);
        for (let i = 0; i < 5; i++) {
            await page.mouse.wheel(0, -100);
        }
        await page.waitForTimeout(50);

        const after = await get_zoom_state(page);
        // Zoom in strictly increased zoom_val, unimpeded by the floor
        expect(after.zoom_val).toBeGreaterThan(before.zoom_val);
    });

    test("toolbox zoom-out button also respects the floor", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await set_min_zoom_fit_ratio(page, 1.0);

        // Click the zoom-out button many times
        const zoom_out = page.locator(".ulabel-zoom-button.ulabel-zoom-out").first();
        await expect(zoom_out).toBeVisible();
        for (let i = 0; i < 30; i++) {
            await zoom_out.click();
        }
        await page.waitForTimeout(50);

        const { zoom_val, fit_zoom } = await get_zoom_state(page);
        expect(zoom_val).toBeGreaterThanOrEqual(fit_zoom - 1e-6);
    });

    test("floor re-applies when the annbox resizes", async ({ page }) => {
        // Start small so fit_zoom is (relatively) large, then park zoom_val at
        // the floor. Growing the viewport enlarges the annbox, which raises
        // fit_zoom (larger annbox needs more zoom to still fit the image), so
        // the floor rises. The resize observer must lift zoom_val up to match
        // without a user gesture.
        await page.setViewportSize({ width: 700, height: 500 });
        await wait_for_ulabel_init(page);
        await set_min_zoom_fit_ratio(page, 1.0);

        // Zoom out to hit the floor
        await page.mouse.move(300, 300);
        for (let i = 0; i < 30; i++) {
            await page.mouse.wheel(0, 100);
        }
        await page.waitForTimeout(50);

        const before = await get_zoom_state(page);
        expect(before.zoom_val).toBeGreaterThanOrEqual(before.fit_zoom - 1e-6);

        // Grow the viewport — fit_zoom must grow, and the observer must lift
        // zoom_val to match.
        await page.setViewportSize({ width: 1400, height: 900 });
        // ResizeObserver fires asynchronously; give it a couple of frames
        await page.waitForTimeout(150);

        const after = await get_zoom_state(page);
        expect(after.fit_zoom).toBeGreaterThan(before.fit_zoom);
        expect(after.zoom_val).toBeGreaterThanOrEqual(after.fit_zoom - 1e-6);
    });

    test("resize observer is inert when min_zoom_fit_ratio is 0", async ({ page }) => {
        await page.setViewportSize({ width: 700, height: 500 });
        await wait_for_ulabel_init(page);
        // Deliberately leave min_zoom_fit_ratio at 0 (default)

        // Zoom out below where any future floor would kick in
        await page.mouse.move(300, 300);
        for (let i = 0; i < 30; i++) {
            await page.mouse.wheel(0, 100);
        }
        await page.waitForTimeout(50);

        const before = await get_zoom_state(page);
        expect(before.zoom_val).toBeLessThan(before.fit_zoom);

        // Grow the viewport — with the floor disabled, zoom_val must stay put.
        await page.setViewportSize({ width: 1400, height: 900 });
        await page.waitForTimeout(150);

        const after = await get_zoom_state(page);
        expect(Math.abs(after.zoom_val - before.zoom_val)).toBeLessThan(1e-6);
    });
});
