// End-to-end tests for deprecated focus: the annotation list's "Show Deprecated" checkbox and Restore
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { get_annotation_list_count } from "../testing-utils/annotation_list_utils";

const LOADED_AT = "2026-01-01T00:00:00.000Z";

test.describe("deprecated focus", () => {
    test.beforeEach(async ({ page }) => {
        await wait_for_ulabel_init(page);
        await page.evaluate(async (loaded_at) => {
            const u = window.ulabel;
            const to_image = (x, y) => u.get_image_aware_mouse_x_y({ pageX: x, pageY: y });
            await u.set_annotations([{
                id: "loaded",
                spatial_type: "bbox",
                spatial_payload: [to_image(400, 150), to_image(500, 250)],
                classification_payloads: [{ class_id: u.get_current_subtask().class_ids[0], confidence: 1 }],
                last_edited_at: loaded_at,
            }], u.get_current_subtask_key(), false, false);
        }, LOADED_AT);
    });

    test("a deleted annotation is hoverable but not editable, and Restore brings it back", async ({ page }) => {
        const loaded = () => page.evaluate(() => {
            const a = window.ulabel.get_current_subtask().annotations.access.loaded;
            return { deprecated: a.deprecated, last_edited_at: a.last_edited_at };
        });
        await page.mouse.move(450, 200);
        await page.keyboard.press("d");
        expect((await loaded()).deprecated).toBe(true);
        expect(await get_annotation_list_count(page)).toBe(0);

        await page.locator("#annotation-list-show-deprecated").check();
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().focus_deprecated)).toBe(true);
        expect(await get_annotation_list_count(page)).toBe(1);
        await expect(page.locator(".annotation-list-item-deprecated")).toHaveCount(1);

        // Hover shows the card but offers no grab; the delete keybind does nothing
        await page.mouse.move(700, 500);
        await page.mouse.move(450, 200);
        await expect.poll(() => page.evaluate(() => window.ulabel.get_current_subtask().state.hovered_annid)).toBe("loaded");
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().state.move_candidate)).toBeNull();
        const stream_length = await page.evaluate(() => window.ulabel.get_current_subtask().actions.stream.length);
        await page.keyboard.press("d");
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().actions.stream.length)).toBe(stream_length);

        await page.mouse.click(450, 200, { button: "right" });
        const items = page.locator(".ulabel-context-menu-item");
        await expect(items).toHaveText(["Restore", "Isolate", "Details"]);
        await items.filter({ hasText: "Restore" }).click();

        expect(await loaded()).toEqual({ deprecated: false, last_edited_at: LOADED_AT });
        // Restored, so out of deprecated focus
        expect(await get_annotation_list_count(page)).toBe(0);

        await page.locator("#annotation-list-show-deprecated").uncheck();
        expect(await get_annotation_list_count(page)).toBe(1);
    });

    test("drawing is blocked and signalled; the banner's Exit leaves the mode", async ({ page }) => {
        const canvas_fid = await page.evaluate(() => window.ulabel.get_current_subtask().canvas_fid);
        const banner = page.locator(".deprecated-focus-banner");
        await expect(banner).toBeHidden();

        await page.locator("#annotation-list-show-deprecated").check();
        await expect(banner).toBeVisible();
        await expect(page.locator(`#${canvas_fid}`)).toHaveClass(/edit_locked/);

        const count = () => page.evaluate(() => window.ulabel.get_current_subtask().annotations.ordering.length);
        const before = await count();
        await page.mouse.move(200, 400);
        await page.mouse.down();
        await page.mouse.move(300, 500);
        await page.mouse.up();
        expect(await count()).toBe(before);

        await banner.locator("a.deprecated-focus-exit").click();
        await expect(banner).toBeHidden();
        await expect(page.locator(`#${canvas_fid}`)).not.toHaveClass(/edit_locked/);
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().focus_deprecated)).toBe(false);
        await expect(page.locator("#annotation-list-show-deprecated")).not.toBeChecked();

        await page.keyboard.press("Shift+D");
        await expect(banner).toBeVisible();
        await expect(page.locator("#annotation-list-show-deprecated")).toBeChecked();
        await page.keyboard.press("Shift+D");
        await expect(banner).toBeHidden();
    });
});
