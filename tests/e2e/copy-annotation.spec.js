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

async function reclassify(page, subtask_key, annotation_id, wedge) {
    await page.evaluate(([key, annid, index]) => {
        window.ulabel.set_subtask(key);
        window.ulabel.handle_id_dialog_click(null, annid, index);
    }, [subtask_key, annotation_id, wedge]);
    await page.waitForTimeout(100);
}

function create_clipboard_driver(page, transport) {
    let clipboard_text = "";
    return async (kind, target = "body", handled = true) => {
        if (transport === "native shortcuts") {
            const keys = { copy: "c", cut: "x", paste: "v" };
            await page.keyboard.press(`ControlOrMeta+${keys[kind]}`);
            return;
        }
        const result = await page.locator(target).evaluate((element, { kind, text }) => {
            const clipboard_data = new DataTransfer();
            const event = new ClipboardEvent(kind, {
                bubbles: true,
                cancelable: true,
                clipboardData: clipboard_data,
            });
            if (kind === "paste") event.clipboardData.setData("text/plain", text);
            element.dispatchEvent(event);
            return {
                handled: event.defaultPrevented,
                text: event.clipboardData.getData("text/plain"),
            };
        }, { kind, text: clipboard_text });
        expect(result.handled).toBe(handled);
        if (kind !== "paste" && handled) {
            expect(JSON.parse(result.text).ulabel_annotation).toBe(1);
            clipboard_text = result.text;
        }
    };
}

test.describe("copy annotations between subtasks", () => {
    test("Copy to via the menu clones the annotation and keeps its class", async ({ page }) => {
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

        // The target has the same class id, so no class pie and no subtask switch
        expect(await current_subtask_key(page)).toBe("ground_truth");
        await expect(page.locator("#id_dialog__predictions")).toBeHidden();

        const predictions = await get_annotations(page, "predictions");
        expect(predictions).toHaveLength(2);
        const copy = predictions[1];
        expect(copy.id).not.toBe("gt-bbox-1");
        expect(copy.spatial_type).toBe("bbox");
        expect(copy.spatial_payload).toEqual([[100, 100], [300, 250]]);
        expect(copy.class_id).toBe(10);

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

        expect((await get_annotations(page, "ground_truth"))[1].deprecated).toBe(true);
        let predictions = await get_annotations(page, "predictions");
        expect(predictions).toHaveLength(2);
        expect(predictions[1].spatial_payload).toEqual([[400, 150], [600, 320]]);
        expect(predictions[1].class_id).toBe(11);

        // Reclassify the copy in the target
        await reclassify(page, "predictions", predictions[1].id, 2);
        predictions = await get_annotations(page, "predictions");
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

    for (const transport of ["native shortcuts", "synthetic ClipboardEvents"]) {
        test.describe(transport, () => {
            test.beforeEach(async ({ browserName }) => {
                test.skip(
                    transport === "native shortcuts" && process.platform === "linux" && browserName === "webkit",
                    "Linux WebKit automation emits key events but not native clipboard events; covered separately by synthetic ClipboardEvents.",
                );
            });

            test("copying a hovered annotation and pasting into another subtask keeps its position", async ({ page }) => {
                await wait_for_ulabel_init(page, "/submit-payload.html");
                const send_clipboard = create_clipboard_driver(page, transport);

                await page.evaluate(() => {
                    window.ulabel.get_current_subtask().state.edit_candidate = { annid: "gt-bbox-1" };
                });
                await send_clipboard("copy");
                await expect.poll(() => page.evaluate(() => window.ulabel.state.clipboard?.annotation.id)).toBe("gt-bbox-1");
                if (transport === "synthetic ClipboardEvents") {
                    await page.evaluate(() => {
                        window.ulabel.state.clipboard = null;
                    });
                }

                await page.evaluate(() => window.ulabel.set_subtask("predictions"));
                await send_clipboard("paste");
                await expect.poll(() => get_annotations(page, "predictions")).toHaveLength(2);

                const predictions = await get_annotations(page, "predictions");
                expect(predictions[1].spatial_payload).toEqual([[100, 100], [300, 250]]);
                expect(predictions[1].class_id).toBe(10);
                await expect(page.locator("#id_dialog__predictions")).toBeHidden();

                await send_clipboard("paste");
                await expect.poll(() => get_annotations(page, "predictions")).toHaveLength(3);
                expect((await get_annotations(page, "predictions"))[2].spatial_payload).toEqual([[120, 120], [320, 270]]);
            });

            test("pasting into the source subtask offsets the copy and keeps its class", async ({ page }) => {
                await wait_for_ulabel_init(page, "/submit-payload.html");
                const send_clipboard = create_clipboard_driver(page, transport);

                await page.evaluate(() => {
                    window.ulabel.isolate_annotation("gt-bbox-1");
                    window.ulabel.get_current_subtask().state.edit_candidate = { annid: "gt-bbox-1" };
                });
                await send_clipboard("copy");
                await send_clipboard("paste");
                await expect.poll(() => get_annotations(page, "ground_truth")).toHaveLength(3);

                const ground_truth = await get_annotations(page, "ground_truth");
                expect(ground_truth[2].spatial_payload).toEqual([[120, 120], [320, 270]]);
                expect(ground_truth[2].class_id).toBe(10);
                await expect(page.locator("#id_dialog__ground_truth")).toBeHidden();
                expect(await page.evaluate(() => window.ulabel.get_isolated_annotation_id())).toBeNull();

                await send_clipboard("paste");
                await expect.poll(() => get_annotations(page, "ground_truth")).toHaveLength(4);
                expect((await get_annotations(page, "ground_truth"))[3].spatial_payload).toEqual([[140, 140], [340, 290]]);
            });

            test("cut removes the source and paste restores it elsewhere", async ({ page }) => {
                await wait_for_ulabel_init(page, "/submit-payload.html");
                const send_clipboard = create_clipboard_driver(page, transport);

                await page.evaluate(() => {
                    window.ulabel.get_current_subtask().state.edit_candidate = { annid: "gt-bbox-2" };
                });
                await send_clipboard("cut");
                await expect.poll(async () => (await get_annotations(page, "ground_truth"))[1].deprecated).toBe(true);

                await page.evaluate(() => window.ulabel.set_subtask("predictions"));
                await send_clipboard("paste");
                await expect.poll(() => get_annotations(page, "predictions")).toHaveLength(2);
                const predictions = await get_annotations(page, "predictions");
                expect(predictions[1].spatial_payload).toEqual([[400, 150], [600, 320]]);
            });

            test("copy, cut and paste are ignored while typing in a text field", async ({ page }) => {
                await wait_for_ulabel_init(page, "/submit-payload.html");
                const send_clipboard = create_clipboard_driver(page, transport);

                await page.evaluate(() => {
                    window.ulabel.get_current_subtask().state.edit_candidate = { annid: "gt-bbox-1" };
                    const input = document.createElement("input");
                    input.id = "scratch-input";
                    input.value = "annotation note";
                    document.body.appendChild(input);
                });
                await send_clipboard("copy");
                const clipboard_before = await page.evaluate(() => window.ulabel.state.clipboard);
                expect(clipboard_before?.annotation.id).toBe("gt-bbox-1");
                await page.locator("#scratch-input").focus();
                await page.locator("#scratch-input").selectText();
                for (const kind of ["copy", "cut", "paste"]) {
                    await send_clipboard(kind, "#scratch-input", false);
                    expect(await page.evaluate(() => window.ulabel.state.clipboard)).toEqual(clipboard_before);
                    const ground_truth = await get_annotations(page, "ground_truth");
                    expect(ground_truth).toHaveLength(2);
                    expect(ground_truth[0].deprecated).toBe(false);
                }
            });
        });
    }

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
