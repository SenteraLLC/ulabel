// End-to-end tests for per-button submit payload options against demo/submit-payload.html.
// That demo has two subtasks and three buttons: "Submit All" (legacy), "Submit GT"
// (subtasks whitelist), and "Submit Edits" (edits_only). Each hook stores its payload
// on window.submitted_payloads so we can assert on exactly what the host receives.
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

async function click_submit(page, button_id, payload_key) {
    await page.locator(`#${button_id}`).click();
    await page.waitForFunction((key) => window.submitted_payloads[key] !== undefined, payload_key);
    const payload = await page.evaluate((key) => {
        const result = window.submitted_payloads[key];
        delete window.submitted_payloads[key];
        return result;
    }, payload_key);
    return payload;
}

function ids(payload, subtask_key) {
    return payload.annotations[subtask_key].map((annotation) => annotation.id);
}

test.describe("Submit payload options", () => {
    test("Submit All sends every subtask and every annotation", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        const payload = await click_submit(page, "submit-all", "all");

        expect(payload.task_meta).toEqual({ job: 7 });
        expect(Object.keys(payload.annotations)).toEqual(["ground_truth", "predictions"]);
        expect(ids(payload, "ground_truth")).toEqual(["gt-bbox-1", "gt-bbox-2"]);
        expect(ids(payload, "predictions")).toEqual(["pred-bbox-1"]);
    });

    test("Submit GT sends only the whitelisted subtask", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        const payload = await click_submit(page, "submit-gt", "gt");

        expect(Object.keys(payload.annotations)).toEqual(["ground_truth"]);
        expect(ids(payload, "ground_truth")).toEqual(["gt-bbox-1", "gt-bbox-2"]);
    });

    test("Submit Edits is empty before any edit", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        const payload = await click_submit(page, "submit-edits", "edits");

        expect(Object.keys(payload.annotations)).toEqual(["ground_truth", "predictions"]);
        expect(ids(payload, "ground_truth")).toEqual([]);
        expect(ids(payload, "predictions")).toEqual([]);
    });

    test("Submit Edits tracks create, delete, and reclassify through undo/redo", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        // Create a new bbox, delete a loaded one, reclassify another loaded one.
        await page.evaluate(() => {
            const u = window.ulabel;
            u.create_annotation("bbox", [[10, 10], [50, 50]], "fresh");
            u.delete_annotation("gt-bbox-2");
            u.get_current_subtask().state.id_payload = [{ class_id: 12, confidence: 1.0 }];
            u.assign_annotation_id("gt-bbox-1");
        });

        let payload = await click_submit(page, "submit-edits", "edits");
        expect(ids(payload, "ground_truth").sort()).toEqual(["fresh", "gt-bbox-1", "gt-bbox-2"]);
        expect(ids(payload, "predictions")).toEqual([]);
        const by_id = Object.fromEntries(payload.annotations.ground_truth.map((annotation) => [annotation.id, annotation]));
        expect(by_id["fresh"].edit_type).toBe("created");
        expect(by_id["gt-bbox-2"].edit_type).toBe("deleted");
        expect(by_id["gt-bbox-2"].deprecated).toBe(true);
        expect(by_id["gt-bbox-1"].edit_type).toBe("modified");
        expect(by_id["gt-bbox-1"].classification_payloads[0].class_id).toBe(12);

        // Undo the reclassify and the delete: only the creation remains an edit.
        await page.evaluate(() => {
            window.ulabel.undo();
            window.ulabel.undo();
        });
        payload = await click_submit(page, "submit-edits", "edits");
        expect(ids(payload, "ground_truth")).toEqual(["fresh"]);

        // Redo the delete: it is an edit again.
        await page.evaluate(() => window.ulabel.redo());
        payload = await click_submit(page, "submit-edits", "edits");
        expect(ids(payload, "ground_truth").sort()).toEqual(["fresh", "gt-bbox-2"]);

        // Submit All is unaffected by edits_only and still includes everything.
        payload = await click_submit(page, "submit-all", "all");
        expect(ids(payload, "ground_truth").sort()).toEqual(["fresh", "gt-bbox-1", "gt-bbox-2"]);
        expect(ids(payload, "predictions")).toEqual(["pred-bbox-1"]);
        for (const annotation of payload.annotations.ground_truth) {
            expect(annotation.edit_type).toBeUndefined();
        }
    });

    test("Submit Edits reports delete polygon victims, not the eraser itself", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        await page.evaluate(() => {
            const u = window.ulabel;
            // Fully encloses gt-bbox-1 ([100,100]-[300,250]) but not gt-bbox-2.
            u.create_annotation("delete_polygon", [[50, 50], [350, 50], [350, 300], [50, 300], [50, 50]], "eraser");
            u.delete_annotations_in_polygon("eraser");
        });

        let payload = await click_submit(page, "submit-edits", "edits");
        expect(ids(payload, "ground_truth")).toEqual(["gt-bbox-1"]);
        expect(payload.annotations.ground_truth[0].deprecated).toBe(true);

        await page.evaluate(() => window.ulabel.undo());
        payload = await click_submit(page, "submit-edits", "edits");
        expect(ids(payload, "ground_truth")).toEqual([]);
    });

    test("set_annotations re-baselines edits_only for the replaced subtask", async ({ page }) => {
        await wait_for_ulabel_init(page, "/submit-payload.html");

        await page.evaluate(() => window.ulabel.delete_annotation("gt-bbox-2"));
        let payload = await click_submit(page, "submit-edits", "edits");
        expect(ids(payload, "ground_truth")).toEqual(["gt-bbox-2"]);

        await page.evaluate(async () => {
            await window.ulabel.set_annotations([
                {
                    id: "gt-bbox-9",
                    spatial_type: "bbox",
                    spatial_payload: [[10, 10], [60, 60]],
                    classification_payloads: [{ class_id: 10, confidence: 1.0 }],
                    last_edited_at: "2026-02-02T00:00:00.000Z",
                    last_edited_by: "host",
                },
            ], "ground_truth");
        });

        payload = await click_submit(page, "submit-edits", "edits");
        expect(ids(payload, "ground_truth")).toEqual([]);

        payload = await click_submit(page, "submit-all", "all");
        expect(ids(payload, "ground_truth")).toEqual(["gt-bbox-9"]);
    });
});
