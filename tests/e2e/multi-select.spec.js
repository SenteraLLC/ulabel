// End-to-end tests for multi-select (CVML-358): ctrl+click / ctrl+a selection,
// the indicator, and bulk actions that undo as one step.
import { test, expect } from "./fixtures";
import { draw_bbox } from "../testing-utils/drawing_utils";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

const INDICATOR = "#annotation-selection-indicator";
const ITEM = ".ulabel-context-menu-item";

// Deleted annotations stay in the ordering as deprecated
async function get_annotation_count(page) {
    return page.evaluate(() => {
        const { access, ordering } = window.ulabel.get_current_subtask().annotations;
        return ordering.filter((id) => !access[id].deprecated).length;
    });
}

async function ctrl_click(page, position) {
    await page.mouse.move(position[0], position[1]);
    await page.waitForTimeout(100);
    await page.keyboard.down("Control");
    await page.mouse.click(position[0], position[1]);
    await page.keyboard.up("Control");
    await page.waitForTimeout(100);
}

async function selected_ids(page) {
    return page.evaluate(() => window.ulabel.get_selected_annotation_ids());
}

async function setup(page) {
    await wait_for_ulabel_init(page);
    await draw_bbox(page, [200, 200], [300, 300]);
    await draw_bbox(page, [400, 200], [500, 300]);
    expect(await get_annotation_count(page)).toBe(2);
}

test.describe("multi-select", () => {
    test("ctrl+click toggles annotations in and out of the selection", async ({ page }) => {
        await setup(page);

        await ctrl_click(page, [250, 250]);
        await ctrl_click(page, [450, 250]);
        expect(await selected_ids(page)).toHaveLength(2);
        await expect(page.locator(INDICATOR)).toHaveText("2 selected");

        await ctrl_click(page, [250, 250]);
        expect(await selected_ids(page)).toHaveLength(1);
        await expect(page.locator(INDICATOR)).toHaveText("1 selected");

        await page.keyboard.press("Escape");
        expect(await selected_ids(page)).toEqual([]);
        await expect(page.locator(INDICATOR)).toHaveCount(0);
        // Selecting never edits anything
        expect(await get_annotation_count(page)).toBe(2);
    });

    test("bulk delete from the context menu is one undo step", async ({ page }) => {
        await setup(page);
        await ctrl_click(page, [250, 250]);
        await ctrl_click(page, [450, 250]);

        await page.mouse.move(450, 250);
        await page.waitForTimeout(100);
        await page.mouse.click(450, 250, { button: "right" });
        await expect(page.locator(ITEM)).toHaveText(["Change class of 2", "Delete 2", "Clear selection"]);

        await page.locator(ITEM, { hasText: "Delete 2" }).click();
        await page.waitForTimeout(100);
        expect(await get_annotation_count(page)).toBe(0);

        await page.keyboard.press("Control+z");
        await page.waitForTimeout(100);
        expect(await get_annotation_count(page)).toBe(2);
    });

    test("ctrl+a then copy / paste duplicates everything as one undo step", async ({ page }) => {
        await setup(page);
        await page.mouse.move(700, 500);

        await page.keyboard.press("Control+a");
        expect(await selected_ids(page)).toHaveLength(2);

        await page.keyboard.press("Control+c");
        await page.keyboard.press("Control+v");
        await page.waitForTimeout(200);
        expect(await get_annotation_count(page)).toBe(4);

        await page.keyboard.press("Control+z");
        await page.waitForTimeout(100);
        expect(await get_annotation_count(page)).toBe(2);
    });
});

test.describe("multi-select in the annotation list", () => {
    async function expand_annotation_list(page) {
        const list = page.locator(".annotation-list-content");
        if (!(await list.isVisible())) {
            await page.locator(".annotation-list-header").click();
        }
        await expect(list).toBeVisible();
    }

    test("cmd+click on a row toggles its selection", async ({ page }) => {
        await setup(page);
        await expand_annotation_list(page);
        const rows = page.locator(".annotation-list-item");

        await rows.nth(0).click({ modifiers: ["Meta"] });
        await rows.nth(1).click({ modifiers: ["Meta"] });
        expect(await selected_ids(page)).toHaveLength(2);
        await expect(rows.nth(0)).toHaveClass(/selected/);

        await rows.nth(0).click({ modifiers: ["Meta"] });
        expect(await selected_ids(page)).toHaveLength(1);
    });

    test("right-clicking an unselected row clears the selection", async ({ page }) => {
        await setup(page);
        await expand_annotation_list(page);
        const rows = page.locator(".annotation-list-item");
        const first_id = await rows.nth(0).getAttribute("data-annotation-id");
        await page.evaluate((id) => window.ulabel.select_annotations([id]), first_id);

        await rows.nth(1).click({ button: "right" });
        await expect(page.locator(ITEM).first()).toBeVisible();
        expect(await selected_ids(page)).toEqual([]);
        await expect(page.locator(INDICATOR)).toHaveCount(0);
    });
});
