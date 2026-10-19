// End-to-end tests for read-only subtask behavior against demo/read-only.html.
// All subtasks in that demo are marked read_only: true, so no user-driven mutations
// should be possible; hover viewing (confidence card, hover outline) is preserved.
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { get_annotation_count } from "../testing-utils/annotation_utils";
import { switch_to_subtask } from "../testing-utils/subtask_utils";
import { switch_to_mode } from "../testing-utils/mode_utils";

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

    test("global edit suggestion renders no action buttons and no id dialog", async ({ page }) => {
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

        // The hover ring is gone: no move/reid/delete anchors anywhere
        await expect(page.locator(`${global_id} a`)).toHaveCount(0);
        await expect(page.locator(".movable")).toHaveCount(0);

        // ID dialog is not shown on hover
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

    test("shift-hover over a polygon does not start a complex layer", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");
        await switch_to_mode(page, "polygon");

        // Prime the hover candidate as suggest_edits would, then shift-move the mouse
        await page.mouse.move(300, 300);
        await page.evaluate(() => {
            window.ulabel.get_current_subtask().state.edit_candidate = {
                annid: "ro-polygon-1",
                spatial_type: "polygon",
            };
        });
        await page.keyboard.down("Shift");
        await page.mouse.move(301, 301);
        await page.waitForTimeout(100);
        await page.keyboard.up("Shift");

        const after = await page.evaluate(() => {
            const st = window.ulabel.get_current_subtask();
            const anno = st.annotations.access["ro-polygon-1"];
            return {
                layers: anno.spatial_payload.length,
                last_edited_at: anno.last_edited_at,
                starting_complex_polygon: st.state.starting_complex_polygon,
                is_in_progress: st.state.is_in_progress,
                active_id: st.state.active_id,
                act_types: st.actions.stream.map((a) => a.act_type),
            };
        });
        expect(after.layers).toBe(1);
        expect(after.last_edited_at).toBeNull();
        expect(after.starting_complex_polygon).toBe(false);
        expect(after.is_in_progress).toBe(false);
        expect(after.active_id).toBeNull();
        expect(after.act_types).not.toContain("start_complex_polygon");
    });

    test("legacy submit tolerates a nonspatial annotation with a null payload", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");

        // Capture the payload instead of letting the demo hook trigger a download
        await page.evaluate(() => {
            const item = window.ulabel.toolbox.items.find((i) => i.get_toolbox_item_type() === "SubmitButtons");
            item.submit_buttons[0].hook = (payload) => {
                window.submitted_payload = payload;
            };
        });
        const whole_image_payload = await page.evaluate(
            () => window.ulabel.subtasks.frame_review.annotations.access["ro-whole-image-1"].spatial_payload,
        );
        expect(whole_image_payload).toBeNull();

        await page.locator(".submit-button").first().click();
        await page.waitForFunction(() => window.submitted_payload !== undefined);

        const result = await page.evaluate(() => ({
            car_ids: window.submitted_payload.annotations.car_detection.map((a) => a.id),
            frame_review_ids: window.submitted_payload.annotations.frame_review.map((a) => a.id),
            button_disabled: document.querySelector(".submit-button").disabled,
        }));
        expect(result.car_ids).toContain("ro-polygon-1");
        expect(result.frame_review_ids).toEqual([]);
        expect(result.button_disabled).toBe(false);
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

// Runtime toggling via set_subtask_read_only (CVML-287). The demo's banner button
// toggles the current subtask.
test.describe("Read-only toggle", () => {
    // Page points over empty image area near the canvas's top-left corner
    async function empty_points(page) {
        const box = await page.evaluate(() => {
            const r = document.getElementById(window.ulabel.get_current_subtask().canvas_fid).getBoundingClientRect();
            return { x: r.left, y: r.top };
        });
        return [[box.x + 40, box.y + 40], [box.x + 120, box.y + 40], [box.x + 120, box.y + 110], [box.x + 40, box.y + 110]];
    }

    async function live_ids(page) {
        return await page.evaluate(() => {
            const st = window.ulabel.get_current_subtask();
            return st.annotations.ordering.filter((id) => !st.annotations.access[id].deprecated);
        });
    }

    async function drag(page, from, to) {
        await page.mouse.move(from[0], from[1]);
        await page.mouse.down();
        await page.mouse.move((from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
        await page.mouse.move(to[0], to[1]);
        await page.mouse.up();
    }

    test("brush toolbox button and a canvas drag paint nothing while read-only", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");
        await switch_to_mode(page, "polygon");
        const before = await live_ids(page);

        await page.click("#brush-mode");
        const state = await page.evaluate(() => window.ulabel.get_current_subtask().state.is_in_brush_mode);
        expect(state).toBe(false);
        await expect(page.locator("#brush_circle")).toHaveCount(0);

        const [a, , c] = await empty_points(page);
        await drag(page, a, c);
        expect(await live_ids(page)).toEqual(before);
    });

    test("read-only, editable, read-only blocks, allows, then blocks again", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");
        const before = await live_ids(page);
        const [a, , c] = await empty_points(page);

        await page.click("#toggle-read-only");
        expect(await page.evaluate(() => window.ulabel.is_current_subtask_read_only())).toBe(false);
        await switch_to_mode(page, "bbox");
        await drag(page, a, c);
        const after_create = await live_ids(page);
        expect(after_create).toHaveLength(before.length + 1);

        // Brush turns on while editable and off on the way back to read-only
        await switch_to_mode(page, "polygon");
        await page.click("#brush-mode");
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().state.is_in_brush_mode)).toBe(true);

        await page.click("#toggle-read-only");
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().state.is_in_brush_mode)).toBe(false);

        await switch_to_mode(page, "bbox");
        await drag(page, a, c);
        expect(await live_ids(page)).toEqual(after_create);

        // User undo is blocked while read-only and works again once editable
        await page.keyboard.press("Control+z");
        expect(await live_ids(page)).toEqual(after_create);

        await page.click("#toggle-read-only");
        await page.keyboard.press("Control+z");
        expect(await live_ids(page)).toEqual(before);
    });

    test("going read-only mid-polygon discards the polygon", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");
        const before = await live_ids(page);
        const [a, b, c] = await empty_points(page);

        await page.click("#toggle-read-only");
        await switch_to_mode(page, "polygon");
        for (const pt of [a, b, c]) {
            await page.mouse.click(pt[0], pt[1]);
        }
        expect(await page.evaluate(() => window.ulabel.get_current_subtask().state.is_in_progress)).toBe(true);

        await page.click("#toggle-read-only");
        const state = await page.evaluate(() => {
            const st = window.ulabel.get_current_subtask();
            return { read_only: st.read_only, is_in_progress: st.state.is_in_progress, active_id: st.state.active_id };
        });
        expect(state).toEqual({ read_only: true, is_in_progress: false, active_id: null });
        expect(await live_ids(page)).toEqual(before);
    });

    test("non-spatial rows follow the toggle", async ({ page }) => {
        await wait_for_ulabel_init(page, "/read-only.html");
        await switch_to_subtask(page, 1);

        const row = () => page.evaluate(() => ({
            note_readonly: document.getElementById("note__ro-whole-image-1").hasAttribute("readonly"),
            reclf: document.getElementById("reclf__ro-whole-image-1") != null,
            del: document.getElementById("delete__ro-whole-image-1") != null,
        }));

        await page.click("#toggle-read-only");
        expect(await row()).toEqual({ note_readonly: false, reclf: true, del: true });

        await page.click("#toggle-read-only");
        expect(await row()).toEqual({ note_readonly: true, reclf: false, del: false });
    });
});
