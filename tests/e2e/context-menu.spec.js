// End-to-end tests for the right-click context menu on the canvas and the
// annotation list.
import { test, expect } from "./fixtures";
import { draw_bbox } from "../testing-utils/drawing_utils";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { get_annotation_count, get_annotation_by_index, get_annotation_class_id } from "../testing-utils/annotation_utils";

const MENU = ".ulabel-context-menu";
const ITEM = ".ulabel-context-menu-item";

async function right_click(page, position) {
    await page.mouse.move(position[0], position[1]);
    await page.waitForTimeout(100);
    await page.mouse.click(position[0], position[1], { button: "right" });
    await page.waitForTimeout(100);
}

async function click_item(page, label) {
    await page.locator(ITEM, { hasText: label }).click();
    await page.waitForTimeout(100);
}

async function expand_annotation_list(page) {
    // The list is collapsed by default; a click on its header expands it
    const list = page.locator(".annotation-list-content");
    if (!(await list.isVisible())) {
        await page.locator(".annotation-list-header").click();
    }
    await expect(list).toBeVisible();
}

test.describe("context menu", () => {
    test("right-click on a body opens the menu and Change class reclassifies via the pie", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await draw_bbox(page, [200, 200], [300, 300]);
        const before = get_annotation_class_id(await get_annotation_by_index(page, 0));

        await right_click(page, [250, 250]);
        const menu = page.locator(MENU);
        await expect(menu).toBeVisible();
        await expect(menu.locator(ITEM)).toHaveText(["Change class", "Delete", "Isolate", "Details"]);

        await click_item(page, "Change class");
        await expect(menu).toBeHidden();
        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        await expect(page.locator(`#id_dialog__${subtask_key}`)).toBeVisible();

        // Pick the second wedge through the pie's own click handler
        const target_class_id = await page.evaluate(() => {
            const u = window.ulabel;
            u.handle_id_dialog_click(null, null, 1);
            return u.get_current_subtask().class_ids[1];
        });
        await page.waitForTimeout(100);
        expect(target_class_id).not.toBe(before);
        expect(get_annotation_class_id(await get_annotation_by_index(page, 0))).toBe(target_class_id);
        await expect(page.locator(`#id_dialog__${subtask_key}`)).toBeHidden();

        await page.keyboard.press("Control+z");
        await page.waitForTimeout(100);
        expect(get_annotation_class_id(await get_annotation_by_index(page, 0))).toBe(before);
    });

    test("right-click on a list entry and Delete removes it; undo restores", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await draw_bbox(page, [200, 200], [300, 300]);
        const annotation_id = (await get_annotation_by_index(page, 0)).id;
        await expand_annotation_list(page);

        const entry = page.locator(`.annotation-list-item[data-annotation-id="${annotation_id}"]`);
        await expect(entry).toBeVisible();
        await entry.click({ button: "right" });
        await page.waitForTimeout(100);

        const menu = page.locator(MENU);
        await expect(menu).toBeVisible();
        // The right-clicked entry stays highlighted while the menu is open
        await expect(entry).toHaveClass(/highlighted/);

        await click_item(page, "Delete");
        await expect(menu).toBeHidden();
        expect((await get_annotation_by_index(page, 0)).deprecated).toBe(true);
        await expect(entry).toHaveCount(0);

        await page.keyboard.press("Control+z");
        await page.waitForTimeout(100);
        expect((await get_annotation_by_index(page, 0)).deprecated).toBe(false);
        await expect(page.locator(`.annotation-list-item[data-annotation-id="${annotation_id}"]`)).toHaveCount(1);
    });

    test("Details lists the annotation's fields", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await draw_bbox(page, [200, 200], [300, 300]);
        const annotation = await get_annotation_by_index(page, 0);

        await right_click(page, [250, 250]);
        await click_item(page, "Details");

        const menu = page.locator(MENU);
        await expect(menu).toBeVisible();
        await expect(menu.locator(ITEM)).toHaveCount(0);
        const values = menu.locator(".ulabel-context-menu-detail-value");
        await expect(values.nth(0)).toHaveText(annotation.id);
        await expect(values.nth(2)).toHaveText("bbox");
    });

    test("Escape and a click elsewhere close the menu without side effects", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await draw_bbox(page, [200, 200], [300, 300]);
        const menu = page.locator(MENU);

        await right_click(page, [250, 250]);
        await expect(menu).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();

        await right_click(page, [250, 250]);
        await expect(menu).toBeVisible();
        // The dismissing click on empty canvas must not start a new annotation
        await page.mouse.click(500, 500);
        await page.waitForTimeout(100);
        await expect(menu).toBeHidden();
        expect(await get_annotation_count(page)).toBe(1);
    });

    test("right-click on empty canvas opens nothing", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await right_click(page, [500, 500]);
        await expect(page.locator(MENU)).toHaveCount(0);
    });

    test("right-click mid-polyline finishes it and opens no menu", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await page.click("a#md-btn--polyline");
        await page.mouse.click(200, 200);
        await page.mouse.click(300, 200);
        await page.mouse.move(300, 300);
        await page.mouse.click(300, 300, { button: "right" });
        await page.waitForTimeout(150);

        await expect(page.locator(MENU)).toHaveCount(0);
        expect(await get_annotation_count(page)).toBe(1);
        const in_progress = await page.evaluate(() => window.ulabel.get_current_subtask().state.is_in_progress);
        expect(in_progress).toBe(false);
    });

    test("read-only subtask offers Isolate and Details only", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");
        const opened = await page.evaluate(() => window.ulabel.show_context_menu("ro-bbox-1", 300, 300));
        expect(opened).toBe(true);
        await expect(page.locator(MENU).locator(ITEM)).toHaveText(["Isolate", "Details"]);
    });

    test("Isolate toggles isolation and relabels to Show all", async ({ page }) => {
        await wait_for_ulabel_init(page);
        await draw_bbox(page, [200, 200], [300, 300]);
        await draw_bbox(page, [400, 200], [500, 300]);
        const annotation_id = (await get_annotation_by_index(page, 0)).id;
        const isolated_id = () => page.evaluate(() => window.ulabel.get_isolated_annotation_id());

        await right_click(page, [250, 250]);
        await click_item(page, "Isolate");
        await expect(page.locator(MENU)).toBeHidden();
        expect(await isolated_id()).toBe(annotation_id);

        await right_click(page, [250, 250]);
        await expect(page.locator(MENU).locator(ITEM, { hasText: "Show all" })).toHaveCount(1);
        await click_item(page, "Show all");
        await expect(page.locator(MENU)).toBeHidden();
        expect(await isolated_id()).toBeNull();
    });
});
