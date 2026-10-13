// End-to-end tests for embedder overlay canvases (add_overlay_canvas / remove_overlay_canvas)
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

/**
 * Adds one overlay canvas per layer and tags them with ids for lookup.
 * @param {import('@playwright/test').Page} page
 */
async function add_overlays(page) {
    await page.evaluate(() => {
        window.ulabel.add_overlay_canvas().id = "test-overlay-below";
        window.ulabel.add_overlay_canvas("above_annotations").id = "test-overlay-above";
    });
}

/**
 * Returns the rendered CSS size of an element and of the first image frame.
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
async function sizes(page, selector) {
    return await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        const frame = document.getElementById(`${window.ulabel.config.image_id_pfx}__0`);
        const r = el.getBoundingClientRect();
        const f = frame.getBoundingClientRect();
        return { el: [r.left, r.top, r.width, r.height], frame: [f.left, f.top, f.width, f.height] };
    }, selector);
}

/**
 * Asserts the overlay covers the image frame exactly.
 * @param {{el: number[], frame: number[]}} s
 */
function expect_aligned(s) {
    for (let i = 0; i < 4; i++) {
        expect(Math.abs(s.el[i] - s.frame[i])).toBeLessThanOrEqual(0.5);
    }
}

test.describe("Overlay canvases", () => {
    test("creates pointer-free canvases in the image wrapper at image resolution", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await add_overlays(page);

        const info = await page.evaluate(() => {
            const ul = window.ulabel;
            const imwrap = document.getElementById(ul.config.imwrap_id);
            return ["test-overlay-below", "test-overlay-above"].map((id) => {
                const canvas = document.getElementById(id);
                const cs = getComputedStyle(canvas);
                return {
                    in_imwrap: canvas.parentElement === imwrap,
                    width: canvas.width,
                    height: canvas.height,
                    expected_width: ul.config.image_width * ul.config.px_per_px,
                    expected_height: ul.config.image_height * ul.config.px_per_px,
                    size_class: canvas.classList.contains(ul.config.imgsz_class),
                    pointer_events: cs.pointerEvents,
                };
            });
        });

        for (const c of info) {
            expect(c.in_imwrap).toBe(true);
            expect(c.width).toBe(c.expected_width);
            expect(c.height).toBe(c.expected_height);
            expect(c.size_class).toBe(true);
            expect(c.pointer_events).toBe("none");
        }
        expect_aligned(await sizes(page, "#test-overlay-below"));
    });

    test("stacks relative to the image frames and subtask canvases", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await add_overlays(page);

        const z = await page.evaluate(() => {
            const ul = window.ulabel;
            const z_of = (el) => Number(getComputedStyle(el).zIndex);
            const groups = [...document.querySelectorAll("div.canvasses")];
            const active = document.getElementById(`canvasses__${ul.get_current_subtask_key()}`);
            return {
                frame: z_of(document.getElementById(`${ul.config.image_id_pfx}__0`)),
                lowest_subtask: Math.min(...groups.map(z_of)),
                active_subtask: z_of(active),
                n_subtasks: groups.length,
                below: z_of(document.getElementById("test-overlay-below")),
                above: z_of(document.getElementById("test-overlay-above")),
            };
        });

        expect(z.n_subtasks).toBeGreaterThan(1);
        expect(z.below).toBeGreaterThan(z.frame);
        expect(z.below).toBeLessThan(z.lowest_subtask);
        expect(z.above).toBeGreaterThan(z.active_subtask);
    });

    test("stays aligned with the image through rezoom and drag-zoom", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await add_overlays(page);

        await page.evaluate(() => {
            window.ulabel.set_zoom_val(window.ulabel.state.zoom_val * 2.5);
            window.ulabel.rezoom();
        });
        expect_aligned(await sizes(page, "#test-overlay-below"));
        expect_aligned(await sizes(page, "#test-overlay-above"));

        // Shift+drag upward zooms through drag_rezoom()
        const box = await page.locator("#test-overlay-below").boundingBox();
        const start = { x: 400, y: Math.min(500, box.y + box.height - 10) };
        const zoom_before = await page.evaluate(() => window.ulabel.state.zoom_val);
        await page.keyboard.down("Shift");
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x, start.y - 150, { steps: 10 });
        await page.mouse.up();
        await page.keyboard.up("Shift");
        expect(await page.evaluate(() => window.ulabel.state.zoom_val)).toBeGreaterThan(zoom_before);

        expect_aligned(await sizes(page, "#test-overlay-below"));
        expect_aligned(await sizes(page, "#test-overlay-above"));
    });

    test("keeps the FilterDistance overlay in sync alongside embedder overlays", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await add_overlays(page);

        await page.evaluate(() => {
            window.ulabel.set_zoom_val(window.ulabel.state.zoom_val * 1.7);
            window.ulabel.rezoom();
        });

        const filter = await page.evaluate(() => {
            const canvas = document.getElementById("ulabel-filter-distance-overlay");
            const frame = document.getElementById(`${window.ulabel.config.image_id_pfx}__0`);
            return {
                z: canvas.style.zIndex,
                width: canvas.style.width,
                frame_width: frame.style.width,
                height: canvas.style.height,
                frame_height: frame.style.height,
            };
        });
        expect(filter.z).toBe("95");
        expect(filter.width).toBe(filter.frame_width);
        expect(filter.height).toBe(filter.frame_height);
    });

    test("frame swaps leave overlay canvases and their pixels in place", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await add_overlays(page);

        const result = await page.evaluate(async () => {
            const ul = window.ulabel;
            const canvas = document.getElementById("test-overlay-below");
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "rgb(255, 0, 0)";
            ctx.fillRect(0, 0, 4, 4);
            const frame = document.getElementById(`${ul.config.image_id_pfx}__0`);
            await ul.swap_frame_image(frame.src);
            return {
                connected: canvas.isConnected,
                registered: ul.overlay_canvases.includes(canvas),
                red: ctx.getImageData(1, 1, 1, 1).data[0],
            };
        });

        expect(result).toEqual({ connected: true, registered: true, red: 255 });
    });

    test("remove_overlay_canvas and destroy clean up", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await add_overlays(page);

        const result = await page.evaluate(() => {
            const ul = window.ulabel;
            const below = document.getElementById("test-overlay-below");
            const above = document.getElementById("test-overlay-above");
            ul.remove_overlay_canvas(below);
            const after_remove = {
                below_connected: below.isConnected,
                registered: ul.overlay_canvases.includes(below),
                above_connected: above.isConnected,
            };
            ul.destroy();
            let threw = false;
            try {
                ul.add_overlay_canvas();
            } catch {
                threw = true;
            }
            return {
                after_remove,
                above_connected_after_destroy: above.isConnected,
                registered_after_destroy: ul.overlay_canvases.length,
                threw,
            };
        });

        expect(result.after_remove).toEqual({ below_connected: false, registered: false, above_connected: true });
        expect(result.above_connected_after_destroy).toBe(false);
        expect(result.registered_after_destroy).toBe(0);
        expect(result.threw).toBe(true);
    });
});
