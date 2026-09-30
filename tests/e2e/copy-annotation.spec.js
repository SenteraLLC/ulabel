// End-to-end tests for copying / cutting annotations between subtasks via the
// context menu and the clipboard shortcuts, against demo/submit-payload.html
// (two writable subtasks sharing three classes).
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

const MENU = ".ulabel-context-menu";
const ITEM = ".ulabel-context-menu-item";

async function open_menu(page, annotation_id) {
    await page.evaluate((annid) => {
        window.ulabel.show_context_menu(annid, 400, 300);
    }, annotation_id);
    await expect(page.locator(MENU)).toBeVisible();
}

async function click_item(page, label) {
    await page.locator(ITEM, { hasText: label }).click();
    await page.waitForTimeout(100);
}

async function get_annotations(page, subtask_key) {
    return await page.evaluate((key) => {
        const subtask = window.ulabel.subtasks[key];
        return subtask.annotations.ordering.map((id) => {
            const annotation = subtask.annotations.access[id];
            return {
                id: annotation.id,
                deprecated: annotation.deprecated,
                spatial_type: annotation.spatial_type,
                spatial_payload: annotation.spatial_payload,
                class_id: annotation.classification_payloads.reduce((best, payload) => {
                    if (best === null || payload.confidence > best.confidence) return payload;
                    return best;
                }, null).class_id,
            };
        });
    }, subtask_key);
}

async function current_subtask_key(page) {
    return await page.evaluate(() => window.ulabel.get_current_subtask_key());
}

async function pick_pie_wedge(page, index) {
    await page.evaluate((wedge) => {
        window.ulabel.handle_id_dialog_click(null, null, wedge);
    }, index);
    await page.waitForTimeout(100);
}

test.describe("copy annotations between subtasks", () => {
    test("Copy to via the menu clones the annotation and opens the class pie in the target", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        await open_menu(page, "gt-bbox-1");
        const menu = page.locator(MENU);
        await expect(menu.locator(ITEM)).toHaveText([
            "Change class",
            "Copy to Predictions",
            "Move to Predictions",
            "Delete",
            "Isolate",
            "Details",
        ]);

        await click_item(page, "Copy to Predictions");
        await expect(menu).toBeHidden();

        // Target has three compatible classes, so the pie opens there
        expect(await current_subtask_key(page)).toBe("predictions");
        await expect(page.locator("#id_dialog__predictions")).toBeVisible();

        const predictions = await get_annotations(page, "predictions");
        expect(predictions).toHaveLength(2);
        const copy = predictions[1];
        expect(copy.id).not.toBe("gt-bbox-1");
        expect(copy.spatial_type).toBe("bbox");
        expect(copy.spatial_payload).toEqual([[100, 100], [300, 250]]);
        expect(copy.class_id).toBe(10);

        // Choosing a wedge reclassifies the copy
        await pick_pie_wedge(page, 2);
        await expect(page.locator("#id_dialog__predictions")).toBeHidden();
        expect((await get_annotations(page, "predictions"))[1].class_id).toBe(12);

        // The source is untouched
        const ground_truth = await get_annotations(page, "ground_truth");
        expect(ground_truth).toHaveLength(2);
        expect(ground_truth[0].deprecated).toBe(false);
    });

    test("Move to is one undoable action on the source subtask", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");
        const page_errors = [];
        page.on("pageerror", (error) => page_errors.push(error.message));

        await open_menu(page, "gt-bbox-2");
        await click_item(page, "Move to Predictions");
        await pick_pie_wedge(page, 2);

        expect((await get_annotations(page, "ground_truth"))[1].deprecated).toBe(true);
        let predictions = await get_annotations(page, "predictions");
        expect(predictions).toHaveLength(2);
        expect(predictions[1].spatial_payload).toEqual([[400, 150], [600, 320]]);
        expect(predictions[1].class_id).toBe(12);

        // Undo in the target (current subtask) only reverts the reclassify
        await page.keyboard.press("Control+z");
        await page.waitForTimeout(100);
        predictions = await get_annotations(page, "predictions");
        expect(predictions).toHaveLength(2);
        expect(predictions[1].class_id).toBe(11);
        await page.keyboard.press("Control+z");
        await page.waitForTimeout(100);
        expect(await get_annotations(page, "predictions")).toHaveLength(2);

        // Undo in the source restores the annotation and removes the copy
        await page.evaluate(() => window.ulabel.set_subtask("ground_truth"));
        await page.keyboard.press("Control+z");
        await page.waitForTimeout(100);
        expect((await get_annotations(page, "ground_truth"))[1].deprecated).toBe(false);
        expect(await get_annotations(page, "predictions")).toHaveLength(1);

        // The target forgot the copy's reclassify: nothing to redo there
        await page.evaluate(() => window.ulabel.set_subtask("predictions"));
        await page.keyboard.press("Control+Shift+z");
        await page.waitForTimeout(100);
        expect(await get_annotations(page, "predictions")).toHaveLength(1);
        expect(page_errors).toEqual([]);

        // Redo replays the whole move
        await page.evaluate(() => window.ulabel.set_subtask("ground_truth"));
        await page.keyboard.press("Control+Shift+z");
        await page.waitForTimeout(100);
        expect((await get_annotations(page, "ground_truth"))[1].deprecated).toBe(true);
        predictions = await get_annotations(page, "predictions");
        expect(predictions).toHaveLength(2);
        expect(predictions[1].deprecated).toBe(false);
    });

    test("Ctrl+C on a hovered annotation and Ctrl+V in another subtask pastes at the same place", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        await page.evaluate(() => {
            window.ulabel.get_current_subtask().state.edit_candidate = { annid: "gt-bbox-1" };
        });
        await page.keyboard.press("Control+c");
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => window.ulabel.state.clipboard.annotation.id)).toBe("gt-bbox-1");

        await page.evaluate(() => window.ulabel.set_subtask("predictions"));
        await page.keyboard.press("Control+v");
        await page.waitForTimeout(100);

        const predictions = await get_annotations(page, "predictions");
        expect(predictions).toHaveLength(2);
        expect(predictions[1].spatial_payload).toEqual([[100, 100], [300, 250]]);
        await expect(page.locator("#id_dialog__predictions")).toBeVisible();

        // A repeat paste here is nudged so it does not hide the first
        await page.evaluate(() => window.ulabel.hide_id_dialog());
        await page.keyboard.press("Control+v");
        await page.waitForTimeout(100);
        expect((await get_annotations(page, "predictions"))[2].spatial_payload).toEqual([[120, 120], [320, 270]]);
    });

    test("Ctrl+V in the source subtask offsets the copy and keeps its class", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        await page.evaluate(() => {
            window.ulabel.isolate_annotation("gt-bbox-1");
            window.ulabel.get_current_subtask().state.edit_candidate = { annid: "gt-bbox-1" };
        });
        await page.keyboard.press("Control+c");
        await page.keyboard.press("Control+v");
        await page.waitForTimeout(100);

        const ground_truth = await get_annotations(page, "ground_truth");
        expect(ground_truth).toHaveLength(3);
        expect(ground_truth[2].spatial_payload).toEqual([[120, 120], [320, 270]]);
        expect(ground_truth[2].class_id).toBe(10);
        await expect(page.locator("#id_dialog__ground_truth")).toBeHidden();
        // Pasting releases the isolation so the copy is visible
        expect(await page.evaluate(() => window.ulabel.get_isolated_annotation_id())).toBeNull();

        // A second paste of the same copy lands further along
        await page.keyboard.press("Control+v");
        await page.waitForTimeout(100);
        expect((await get_annotations(page, "ground_truth"))[3].spatial_payload).toEqual([[140, 140], [340, 290]]);
    });

    test("Ctrl+X removes the source and Ctrl+V restores it elsewhere", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        await page.evaluate(() => {
            window.ulabel.get_current_subtask().state.edit_candidate = { annid: "gt-bbox-2" };
        });
        await page.keyboard.press("Control+x");
        await page.waitForTimeout(100);
        expect((await get_annotations(page, "ground_truth"))[1].deprecated).toBe(true);

        await page.evaluate(() => window.ulabel.set_subtask("predictions"));
        await page.keyboard.press("Control+v");
        await page.waitForTimeout(100);
        const predictions = await get_annotations(page, "predictions");
        expect(predictions).toHaveLength(2);
        expect(predictions[1].spatial_payload).toEqual([[400, 150], [600, 320]]);
    });

    test("shortcuts are ignored while typing in a text field", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        await page.evaluate(() => {
            window.ulabel.get_current_subtask().state.edit_candidate = { annid: "gt-bbox-1" };
            const input = document.createElement("input");
            input.id = "scratch-input";
            document.body.appendChild(input);
        });
        await page.locator("#scratch-input").focus();
        await page.keyboard.press("Control+c");
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => window.ulabel.state.clipboard)).toBeNull();
    });

    test("pasting an envelope from a different image size is refused", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        const result = await page.evaluate(() => {
            const u = window.ulabel;
            const envelope = u.copy_annotation_to_clipboard("gt-bbox-1");
            envelope.image_width += 1;
            return u.paste_annotation_from_clipboard(envelope);
        });
        expect(result).toBeNull();
        expect(await get_annotations(page, "ground_truth")).toHaveLength(2);
    });
});
