// End-to-end tests for edit focus: the annotation list's "Edited Only" checkbox and its keybind
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { draw_bbox } from "../testing-utils/drawing_utils";
import { get_annotation_list_count } from "../testing-utils/annotation_list_utils";

test.describe("edit focus", () => {
    test.beforeEach(async ({ page }) => {
        await wait_for_ulabel_init(page);
        await page.evaluate(async () => {
            const u = window.ulabel;
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

    test("checkbox and keybind filter the list to created and modified annotations", async ({ page }) => {
        const edited_only = page.locator("#annotation-list-edited-only");
        await draw_bbox(page, [150, 150], [250, 250]);
        expect(await get_annotation_list_count(page)).toBe(2);
        await expect(edited_only).not.toBeChecked();

        await edited_only.check();
        expect(await get_annotation_list_count(page)).toBe(1);
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().focus_edited)).toBe(true);

        // Reclassifying the loaded box makes it an edit
        await page.evaluate(() => {
            const u = window.ulabel;
            const ids = u.get_current_subtask().class_ids;
            u.get_current_subtask().state.id_payload = ids.map((id, i) => ({ class_id: id, confidence: i === 1 ? 1 : 0 }));
            u.assign_annotation_id("loaded");
        });
        expect(await get_annotation_list_count(page)).toBe(2);

        await page.mouse.move(700, 500);
        await page.keyboard.press("h");
        await expect(edited_only).not.toBeChecked();
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().focus_edited)).toBe(false);
    });

    test("an unchanged annotation can't be hovered while focused", async ({ page }) => {
        await page.mouse.move(700, 500);
        await page.keyboard.press("h");
        await expect(page.locator("#annotation-list-edited-only")).toBeChecked();
        expect(await get_annotation_list_count(page)).toBe(0);

        await page.mouse.move(450, 200);
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().state.hovered_annid)).toBeNull();
    });
});
