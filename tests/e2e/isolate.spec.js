// End-to-end tests for isolating one annotation from the annotation list.
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { get_annotation_count } from "../testing-utils/annotation_utils";

// 6 x 4 grid of 30px boxes in screen space; each cell's centre is a hover target
const COLS = 6;
const ROWS = 4;
const ORIGIN = [150, 150];
const STEP = 50;
const SIZE = 30;

function cell_center(index) {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    return [ORIGIN[0] + col * STEP + SIZE / 2, ORIGIN[1] + row * STEP + SIZE / 2];
}

async function load_grid(page) {
    await page.evaluate(async ({ cols, rows, origin, step, size }) => {
        const u = window.ulabel;
        const to_image = (x, y) => u.get_image_aware_mouse_x_y({ pageX: x, pageY: y });
        const class_ids = u.get_current_subtask().class_ids;
        const annotations = [];
        for (let i = 0; i < cols * rows; i++) {
            const x = origin[0] + (i % cols) * step;
            const y = origin[1] + Math.floor(i / cols) * step;
            annotations.push({
                id: `grid-${i}`,
                spatial_type: "bbox",
                spatial_payload: [to_image(x, y), to_image(x + size, y + size)],
                classification_payloads: [{ class_id: class_ids[i % class_ids.length], confidence: 1 }],
            });
        }
        await u.set_annotations(annotations, u.get_current_subtask_key(), false, false);
    }, { cols: COLS, rows: ROWS, origin: ORIGIN, step: STEP, size: SIZE });
    await page.waitForTimeout(100);
}

// Non-transparent pixels across the subtask's annotation canvases
async function painted_pixel_count(page) {
    return await page.evaluate(() => {
        const contexts = window.ulabel.get_current_subtask().state.annotation_contexts;
        let count = 0;
        for (const entry of Object.values(contexts)) {
            const canvas = entry.context.canvas;
            const data = entry.context.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] !== 0) count++;
            }
        }
        return count;
    });
}

async function isolated_id(page) {
    return await page.evaluate(() => window.ulabel.get_isolated_annotation_id());
}

async function hover_and_get_hovered(page, position) {
    await page.mouse.move(position[0], position[1]);
    await page.waitForTimeout(100);
    return await page.evaluate(() => window.ulabel.get_current_subtask().state.hovered_annid);
}

async function expand_annotation_list(page) {
    const list = page.locator(".annotation-list-content");
    if (!(await list.isVisible())) {
        await page.locator(".annotation-list-header").click();
    }
    await expect(list).toBeVisible();
}

test.describe("isolate annotation", () => {
    test.beforeEach(async ({ page }) => {
        await wait_for_ulabel_init(page);
        await load_grid(page);
        expect(await get_annotation_count(page)).toBe(COLS * ROWS);
    });

    test("list button isolates: only that annotation is drawn, hoverable, and listed", async ({ page }) => {
        await expand_annotation_list(page);
        const all_painted = await painted_pixel_count(page);
        await expect(page.locator(".annotation-list-item")).toHaveCount(COLS * ROWS);

        const entry = page.locator(".annotation-list-item[data-annotation-id=\"grid-7\"]");
        await entry.locator(".annotation-list-item-isolate").click();
        await page.waitForTimeout(100);

        expect(await isolated_id(page)).toBe("grid-7");
        // Only one of 24 equal boxes remains painted
        const isolated_painted = await painted_pixel_count(page);
        expect(isolated_painted).toBeGreaterThan(0);
        expect(isolated_painted).toBeLessThan(all_painted / 10);
        // Data is untouched
        expect(await get_annotation_count(page)).toBe(COLS * ROWS);

        // The list shows only the isolated entry, with its button active, plus Show all
        await expect(page.locator(".annotation-list-item")).toHaveCount(1);
        await expect(page.locator(".annotation-list-item .annotation-list-item-isolate")).toHaveClass(/active/);
        await expect(page.locator("#annotation-list-show-all")).toBeVisible();

        // Hover: hidden boxes are inert, the isolated one still responds
        expect(await hover_and_get_hovered(page, cell_center(0))).toBeNull();
        expect(await hover_and_get_hovered(page, cell_center(7))).toBe("grid-7");
    });

    test("the isolate button does not fly to the annotation", async ({ page }) => {
        await expand_annotation_list(page);
        const zoom_before = await page.evaluate(() => window.ulabel.state.zoom_val);

        await page.locator(".annotation-list-item[data-annotation-id=\"grid-3\"] .annotation-list-item-isolate").click();
        await page.waitForTimeout(100);

        expect(await page.evaluate(() => window.ulabel.state.zoom_val)).toBe(zoom_before);
    });

    test("Show all, the active button, and Escape each clear the isolation", async ({ page }) => {
        await expand_annotation_list(page);
        const all_painted = await painted_pixel_count(page);
        const isolate_button = (id) => page.locator(`.annotation-list-item[data-annotation-id="${id}"] .annotation-list-item-isolate`);

        await isolate_button("grid-1").click();
        await page.locator("#annotation-list-show-all").click();
        await page.waitForTimeout(100);
        expect(await isolated_id(page)).toBeNull();
        await expect(page.locator("#annotation-list-show-all")).toBeHidden();
        expect(await painted_pixel_count(page)).toBe(all_painted);

        await isolate_button("grid-1").click();
        await isolate_button("grid-1").click();
        await page.waitForTimeout(100);
        expect(await isolated_id(page)).toBeNull();

        await isolate_button("grid-1").click();
        await page.mouse.move(600, 500);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(100);
        expect(await isolated_id(page)).toBeNull();
        await expect(page.locator(".annotation-list-item")).toHaveCount(COLS * ROWS);
    });

    test("deleting the isolated annotation via the context menu clears the isolation", async ({ page }) => {
        await expand_annotation_list(page);
        const all_painted = await painted_pixel_count(page);
        await page.locator(".annotation-list-item[data-annotation-id=\"grid-9\"] .annotation-list-item-isolate").click();
        await page.waitForTimeout(100);

        const center = cell_center(9);
        await page.mouse.move(center[0], center[1]);
        await page.waitForTimeout(100);
        await page.mouse.click(center[0], center[1], { button: "right" });
        await page.locator(".ulabel-context-menu-item", { hasText: "Delete" }).click();
        await page.waitForTimeout(100);

        expect(await isolated_id(page)).toBeNull();
        const deleted = await page.evaluate(() => window.ulabel.get_current_subtask().annotations.access["grid-9"].deprecated);
        expect(deleted).toBe(true);
        await expect(page.locator(".annotation-list-item")).toHaveCount(COLS * ROWS - 1);
        // The other 23 boxes are back on the canvas
        expect(await painted_pixel_count(page)).toBeGreaterThan(all_painted / 2);
    });

    test("switching subtask clears the outgoing isolation", async ({ page }) => {
        await page.evaluate(() => window.ulabel.isolate_annotation("grid-2"));
        const key = await page.evaluate(() => window.ulabel.get_current_subtask_key());

        await page.evaluate(() => window.ulabel.set_subtask("frame_review"));
        await page.waitForTimeout(100);

        expect(await page.evaluate((k) => window.ulabel.get_isolated_annotation_id(k), key)).toBeNull();
    });

    test("set_annotations clears the isolation", async ({ page }) => {
        await page.evaluate(() => window.ulabel.isolate_annotation("grid-2"));
        await load_grid(page);

        expect(await isolated_id(page)).toBeNull();
    });

    test("on_isolate_change fires on change only, and the API rejects bad ids", async ({ page }) => {
        const calls = await page.evaluate(() => {
            const u = window.ulabel;
            const calls = [];
            u.config.on_isolate_change = (subtask_key, annotation_id) => calls.push([subtask_key, annotation_id]);
            const accepted = [
                u.isolate_annotation("grid-4"),
                u.isolate_annotation("grid-4"),
                u.isolate_annotation("no-such-id"),
                u.isolate_annotation(null),
            ];
            u.config.on_isolate_change = null;
            return { calls, accepted };
        });
        const key = await page.evaluate(() => window.ulabel.get_current_subtask_key());

        expect(calls.accepted).toEqual([true, true, false, true]);
        expect(calls.calls).toEqual([[key, "grid-4"], [key, null]]);
    });
});
