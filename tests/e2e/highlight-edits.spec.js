// End-to-end tests for the edit highlight: outlines on annotations created or modified since load.
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { draw_bbox } from "../testing-utils/drawing_utils";

const CREATED = [255, 0, 255];
const MODIFIED = [0, 255, 255];

// Pixels across the current subtask's annotation canvases matching an opaque rgb color
async function count_color(page, rgb) {
    return await page.evaluate((target) => {
        const contexts = window.ulabel.get_current_subtask().state.annotation_contexts;
        let count = 0;
        for (const entry of Object.values(contexts)) {
            const canvas = entry.context.canvas;
            const data = entry.context.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 0; i < data.length; i += 4) {
                if (
                    data[i + 3] === 255 &&
                    Math.abs(data[i] - target[0]) < 8 &&
                    Math.abs(data[i + 1] - target[1]) < 8 &&
                    Math.abs(data[i + 2] - target[2]) < 8
                ) count++;
            }
        }
        return count;
    }, rgb);
}

test.describe("edit highlight", () => {
    test.beforeEach(async ({ page }) => {
        await wait_for_ulabel_init(page);
        await page.evaluate(async () => {
            const u = window.ulabel;
            u.config.highlight_created_color = "#ff00ff";
            u.config.highlight_modified_color = "#00ffff";
            const to_image = (x, y) => u.get_image_aware_mouse_x_y({ pageX: x, pageY: y });
            await u.set_annotations([{
                id: "loaded",
                spatial_type: "bbox",
                spatial_payload: [to_image(400, 150), to_image(500, 250)],
                classification_payloads: [{ class_id: u.get_current_subtask().class_ids[0], confidence: 1 }],
                last_edited_at: "2026-01-01T00:00:00.000Z",
            }], u.get_current_subtask_key(), false, false);
        });
    });

    test("keybind toggles outlines on new and modified annotations only", async ({ page }) => {
        await draw_bbox(page, [150, 150], [250, 250]);
        // Move off both boxes so hover doesn't take over the outline
        await page.mouse.move(700, 500);
        await page.waitForTimeout(100);

        await page.keyboard.press("h");
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => window.ulabel.get_highlight_edits())).toBe(true);
        expect(await count_color(page, CREATED)).toBeGreaterThan(0);
        expect(await count_color(page, MODIFIED)).toBe(0);

        // Reclassify the loaded box
        await page.evaluate(() => {
            const u = window.ulabel;
            const ids = u.get_current_subtask().class_ids;
            u.get_current_subtask().state.id_payload = ids.map((id, i) => ({ class_id: id, confidence: i === 1 ? 1 : 0 }));
            u.assign_annotation_id("loaded");
        });
        await page.waitForTimeout(100);
        expect(await count_color(page, MODIFIED)).toBeGreaterThan(0);

        await page.keyboard.press("h");
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => window.ulabel.get_highlight_edits())).toBe(false);
        expect(await count_color(page, CREATED)).toBe(0);
        expect(await count_color(page, MODIFIED)).toBe(0);
    });
});
