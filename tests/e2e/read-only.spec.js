// End-to-end tests for read-only subtask behavior against demo/read-only.html.
// All subtasks in that demo are marked read_only: true, so no user-driven mutations
// should be possible; hover viewing (confidence card, hover outline) is preserved.
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { get_annotation_count } from "../testing-utils/annotation_utils";
import { switch_to_subtask } from "../testing-utils/subtask_utils";

test.describe("Read-only subtask behavior", () => {
    test("loads with every subtask marked read_only without erroring", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        const flags = await page.evaluate(() => {
            const u = window.ulabel;
            return {
                is_init: u.is_init,
                car_ro: u.subtasks.car_detection.read_only,
                fr_ro: u.subtasks.frame_review.read_only,
            };
        });
        expect(flags.is_init).toBe(true);
        expect(flags.car_ro).toBe(true);
        expect(flags.fr_ro).toBe(true);
    });

    test("global edit suggestion hides move/reid/delete buttons and skips id dialog thumbnail", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        // Trigger the edit suggestion directly for a known bbox annotation
        await page.evaluate(() => {
            const u = window.ulabel;
            const annid = "ro-bbox-1";
            u.get_current_subtask().state.edit_candidate = { annid: annid };
            u.show_global_edit_suggestion(annid);
        });
        await page.waitForTimeout(100);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const global_id = `#global_edit_suggestion__${subtask_key}`;

        // Container itself is displayed (so the confidence card can render)
        const container_display = await page.locator(global_id).evaluate((el) => el.style.display);
        expect(container_display).toBe("block");

        // All action buttons inside are display:none
        const button_displays = await page.locator(`${global_id} .global_sub_suggestion`).evaluateAll(
            (els) => els.map((el) => el.style.display),
        );
        expect(button_displays.length).toBeGreaterThan(0);
        for (const d of button_displays) expect(d).toBe("none");

        // ID dialog thumbnail is not shown
        const idd_visible = await page.evaluate(() => window.ulabel.get_current_subtask().state.idd_visible);
        expect(idd_visible).toBe(false);
    });

    test("confidence card still renders on hover in read-only mode", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        await page.evaluate(() => {
            const u = window.ulabel;
            const annid = "ro-bbox-1";
            u.get_current_subtask().state.edit_candidate = { annid: annid };
            u.show_global_edit_suggestion(annid);
            u.update_confidence_dialog();
        });
        await page.waitForTimeout(100);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const conf_id = `#global_annotation_confidence__${subtask_key}`;
        const classname = (await page.locator(`${conf_id} .annotation-confidence-classname`).textContent()).trim();
        const value = (await page.locator(`${conf_id} .annotation-confidence-value`).textContent()).trim();

        expect(classname).toBe("Sedan");
        expect(value).toBe("Confidence: 0.82");
    });

    test("vertex edit handle (show_edit_suggestion) is suppressed in read-only mode", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        // Direct invocation with a plausible vertex candidate; the method should early-return
        await page.evaluate(() => {
            const u = window.ulabel;
            u.show_edit_suggestion({ annid: "ro-polygon-1", point: [1073.79, 444.87] }, true);
        });
        await page.waitForTimeout(50);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const edit_suggestion_display = await page.locator(`#edit_suggestion__${subtask_key}`).evaluate((el) => el.style.display);
        // The default display starts empty (never shown), which is what we want
        expect(edit_suggestion_display).not.toBe("block");
    });

    test("hovered_annid still tracks the annotation for the hover outline", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        await page.evaluate(() => {
            const u = window.ulabel;
            u.get_current_subtask().state.edit_candidate = { annid: "ro-bbox-1" };
            u.show_global_edit_suggestion("ro-bbox-1");
        });
        await page.waitForTimeout(50);

        const hovered = await page.evaluate(() => window.ulabel.get_current_subtask().state.hovered_annid);
        expect(hovered).toBe("ro-bbox-1");
    });

    test("canvas mousedown does not begin a new annotation in read-only mode", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        const initial_count = await get_annotation_count(page);

        // Simulate a mousedown on the front canvas at a location with no existing annotation
        await page.evaluate(() => {
            const u = window.ulabel;
            const canvas = document.getElementById(u.get_current_subtask().canvas_fid);
            const evt = new MouseEvent("mousedown", { button: 0, clientX: 250, clientY: 250, bubbles: true });
            Object.defineProperty(evt, "target", { value: canvas });
            const drag_key = window.ULabel.get_drag_key_start(evt, u);
            return drag_key;
        });

        // No new annotation should exist
        const after_count = await get_annotation_count(page);
        expect(after_count).toBe(initial_count);

        // Drag key returned should be null for a plain canvas click in read-only
        const drag_key = await page.evaluate(() => {
            const u = window.ulabel;
            const canvas = document.getElementById(u.get_current_subtask().canvas_fid);
            const evt = new MouseEvent("mousedown", { button: 0, clientX: 250, clientY: 250, bubbles: true });
            Object.defineProperty(evt, "target", { value: canvas });
            return window.ULabel.get_drag_key_start(evt, u);
        });
        expect(drag_key).toBeNull();
    });

    test("delete_annotation call is blocked by public delete keybind path", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        // Set the hovered annotation as an edit_candidate (as suggest_edits would)
        await page.evaluate(() => {
            const u = window.ulabel;
            u.get_current_subtask().state.edit_candidate = {
                annid: "ro-bbox-1",
                spatial_type: "bbox",
            };
        });

        // Simulate the delete keybind by pressing 'd' (default per config)
        const initial_deprecated = await page.evaluate(() => {
            return window.ulabel.subtasks.car_detection.annotations.access["ro-bbox-1"].deprecated;
        });
        expect(initial_deprecated).toBe(false);

        await page.keyboard.press("d");
        await page.waitForTimeout(100);

        const still_present = await page.evaluate(() => {
            const anno = window.ulabel.subtasks.car_detection.annotations.access["ro-bbox-1"];
            return { exists: anno != null, deprecated: anno.deprecated };
        });
        expect(still_present.exists).toBe(true);
        expect(still_present.deprecated).toBe(false);
    });

    test("class keybind does not reassign a hovered annotation's class", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        // Prime hover state
        await page.evaluate(() => {
            const u = window.ulabel;
            u.get_current_subtask().state.edit_candidate = {
                annid: "ro-bbox-1",
                spatial_type: "bbox",
            };
            u.get_current_subtask().state.move_candidate = { annid: "ro-bbox-1" };
        });

        const before_class = await page.evaluate(() => {
            const anno = window.ulabel.subtasks.car_detection.annotations.access["ro-bbox-1"];
            return anno.classification_payloads.map((p) => ({ class_id: p.class_id, confidence: p.confidence }));
        });

        // Press '2' (SUV keybind) — pre-fix, this could reassign class of hovered annotation
        await page.keyboard.press("2");
        await page.waitForTimeout(100);

        const after_class = await page.evaluate(() => {
            const anno = window.ulabel.subtasks.car_detection.annotations.access["ro-bbox-1"];
            return anno.classification_payloads.map((p) => ({ class_id: p.class_id, confidence: p.confidence }));
        });
        expect(after_class).toEqual(before_class);
    });

    test("clicking a class button does not reassign a hovered annotation's class", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        // Prime hover state so the class-button click handler would target this annotation
        await page.evaluate(() => {
            const u = window.ulabel;
            u.get_current_subtask().state.edit_candidate = {
                annid: "ro-bbox-1",
                spatial_type: "bbox",
            };
            u.get_current_subtask().state.move_candidate = { annid: "ro-bbox-1" };
        });

        const before = await page.evaluate(() => {
            const anno = window.ulabel.subtasks.car_detection.annotations.access["ro-bbox-1"];
            return anno.classification_payloads.map((p) => ({ class_id: p.class_id, confidence: p.confidence }));
        });

        // Click a different class button in the toolbox (SUV, index 1)
        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        await page.locator(`#tb-id-app--${subtask_key} a.tbid-opt`).nth(1).click();
        await page.waitForTimeout(100);

        const after = await page.evaluate(() => {
            const anno = window.ulabel.subtasks.car_detection.annotations.access["ro-bbox-1"];
            return anno.classification_payloads.map((p) => ({ class_id: p.class_id, confidence: p.confidence }));
        });
        expect(after).toEqual(before);
    });

    test("nonspatial annotation row has no reclassify or delete buttons and a readonly note", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        // Second subtask (frame_review) has a whole-image annotation
        await switch_to_subtask(page, 1);
        await page.waitForTimeout(200);

        const row_state = await page.evaluate(() => {
            const annid = "ro-whole-image-1";
            const note = document.getElementById("note__" + annid);
            const reclf = document.getElementById("reclf__" + annid);
            const del = document.getElementById("delete__" + annid);
            return {
                note_exists: note != null,
                note_readonly: note != null && note.hasAttribute("readonly"),
                reclf_exists: reclf != null,
                delete_exists: del != null,
            };
        });
        expect(row_state.note_exists).toBe(true);
        expect(row_state.note_readonly).toBe(true);
        expect(row_state.reclf_exists).toBe(false);
        expect(row_state.delete_exists).toBe(false);
    });
});
