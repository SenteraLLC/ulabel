// End-to-end tests for body-drag move: hover an annotation, left-drag its body
import { test, expect } from "./fixtures";
import { draw_bbox, draw_point, draw_polygon } from "../testing-utils/drawing_utils";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { get_annotation_count, get_annotation_by_index } from "../testing-utils/annotation_utils";

// Drag from `from` to `to` with the left button, hovering first so the move
// candidate is populated like a real interaction.
async function drag(page, from, to, options = {}) {
    await page.mouse.move(from[0], from[1]);
    await page.waitForTimeout(100);
    if (options.modifier) await page.keyboard.down(options.modifier);
    await page.mouse.down();
    await page.mouse.move(from[0] + (to[0] - from[0]) / 2, from[1] + (to[1] - from[1]) / 2);
    await page.mouse.move(to[0], to[1]);
    await page.mouse.up();
    if (options.modifier) await page.keyboard.up(options.modifier);
    await page.waitForTimeout(100);
}

// Translate every point of a spatial payload (any nesting) by a screen delta
// expressed in image space.
async function translated(page, payload, screen_delta) {
    const zoom = await page.evaluate(() => window.ulabel.state.zoom_val);
    const shift = (pt) => [pt[0] + screen_delta[0] / zoom, pt[1] + screen_delta[1] / zoom];
    const walk = (node) => (typeof node[0] === "number" ? shift(node) : node.map(walk));
    return walk(payload);
}

function expect_payload_close(actual, expected) {
    const flat = (node) => (typeof node[0] === "number" ? [node] : node.flatMap(flat));
    const a = flat(actual);
    const e = flat(expected);
    expect(a.length).toBe(e.length);
    for (let i = 0; i < a.length; i++) {
        expect(a[i][0]).toBeCloseTo(e[i][0], 0);
        expect(a[i][1]).toBeCloseTo(e[i][1], 0);
    }
}

test.describe("body-drag move", () => {
    test("dragging a bbox body moves it and undo restores it", async ({ page }) => {
        await wait_for_ulabel_init(page);
        const bbox = await draw_bbox(page, [200, 200], [300, 300]);

        await drag(page, [250, 250], [290, 270]);

        expect(await get_annotation_count(page)).toBe(1);
        const moved = await get_annotation_by_index(page, 0);
        expect_payload_close(moved.spatial_payload, await translated(page, bbox, [40, 20]));
        // Hover ring is gone: nothing draggable was rendered for it
        await expect(page.locator(".movable")).toHaveCount(0);

        await page.keyboard.press("Control+z");
        await page.waitForTimeout(100);
        const restored = await get_annotation_by_index(page, 0);
        expect_payload_close(restored.spatial_payload, bbox);
    });

    test("dragging a point body moves it", async ({ page }) => {
        await wait_for_ulabel_init(page);
        const point = await draw_point(page, [300, 300]);

        await drag(page, [300, 300], [330, 340]);

        expect(await get_annotation_count(page)).toBe(1);
        const moved = await get_annotation_by_index(page, 0);
        expect_payload_close(moved.spatial_payload, await translated(page, point, [30, 40]));
    });

    test("dragging a polygon body moves it", async ({ page }) => {
        await wait_for_ulabel_init(page);
        const polygon = await draw_polygon(page, [[200, 200], [320, 200], [320, 320], [200, 320]]);

        await drag(page, [260, 260], [300, 280]);

        expect(await get_annotation_count(page)).toBe(1);
        const moved = await get_annotation_by_index(page, 0);
        expect_payload_close(moved.spatial_payload, await translated(page, polygon, [40, 20]));
    });

    test("dragging a vertex handle edits that vertex only", async ({ page }) => {
        await wait_for_ulabel_init(page);
        const bbox = await draw_bbox(page, [200, 200], [300, 300]);

        // Hover the corner so the edit handle appears, then drag the handle itself
        await page.mouse.move(300, 300);
        await page.waitForTimeout(150);
        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const handle = page.locator(`#edit_suggestion__${subtask_key}`);
        await expect(handle).toBeVisible();
        const box = await handle.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(330, 340);
        await page.mouse.up();
        await page.waitForTimeout(100);

        const edited = await get_annotation_by_index(page, 0);
        const [[x0, y0], [x1, y1]] = edited.spatial_payload;
        expect(Math.min(x0, x1)).toBeCloseTo(bbox[0][0], 0);
        expect(Math.min(y0, y1)).toBeCloseTo(bbox[0][1], 0);
        expect(Math.max(x0, x1)).toBeGreaterThan(bbox[1][0]);
        expect(Math.max(y0, y1)).toBeGreaterThan(bbox[1][1]);
    });

    test("holding the force-draw modifier draws a new annotation over a body", async ({ page }) => {
        await wait_for_ulabel_init(page);
        const bbox = await draw_bbox(page, [200, 200], [300, 300]);

        await drag(page, [220, 220], [280, 280], { modifier: "Alt" });

        expect(await get_annotation_count(page)).toBe(2);
        const first = await get_annotation_by_index(page, 0);
        expect_payload_close(first.spatial_payload, bbox);
    });

    test("a plain click on a body leaves no undo entry", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await draw_bbox(page, [200, 200], [300, 300]);
        const before = await page.evaluate(() => window.ulabel.get_current_subtask().actions.stream.length);

        await page.mouse.move(250, 250);
        await page.waitForTimeout(100);
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(100);

        const after = await page.evaluate(() => window.ulabel.get_current_subtask().actions.stream.length);
        expect(after).toBe(before);
        expect(await get_annotation_count(page)).toBe(1);
    });

    test("read-only subtasks ignore body drags", async ({ page }) => {
        await wait_for_ulabel_init(page);
        const bbox = await draw_bbox(page, [200, 200], [300, 300]);
        await page.evaluate(() => {
            window.ulabel.get_current_subtask().read_only = true;
        });

        await drag(page, [250, 250], [290, 270]);

        expect(await get_annotation_count(page)).toBe(1);
        const unchanged = await get_annotation_by_index(page, 0);
        expect_payload_close(unchanged.spatial_payload, bbox);
    });
});
