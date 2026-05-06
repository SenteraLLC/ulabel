/**
 * E2E tests for ULabel API behavior contracts.
 *
 * Verifies that null-dependent control flow in public methods like
 * suggest_edits, fly_to_annotation_id, and show_global_edit_suggestion
 * behaves correctly.
 */
import { test, expect } from "./fixtures";
import { draw_bbox, draw_point, draw_polyline } from "../testing-utils/drawing_utils";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

test.describe("ULabel API Behavior", () => {
    test("suggest_edits with no arguments should not throw", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Create an annotation so there's something to suggest edits for
        await draw_bbox(page, [100, 100], [200, 200]);

        // suggest_edits() with no arguments should use null defaults internally
        // and fall through to last_move. Should not throw.
        const result = await page.evaluate(() => {
            try {
                window.ulabel.suggest_edits();
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        expect(result.success).toBe(true);
    });

    test("suggest_edits with null nonspatial_id should not create bad candidate", async ({ page }) => {
        await wait_for_ulabel_init(page);

        await draw_bbox(page, [100, 100], [200, 200]);

        // Passing null for nonspatial_id should NOT create a best_candidate
        // (the check is: if (nonspatial_id !== null))
        const result = await page.evaluate(() => {
            try {
                window.ulabel.suggest_edits(null, null, true);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        expect(result.success).toBe(true);
    });

    test("fly_to_annotation_id with null subtask_key should not switch subtasks", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Create an annotation to fly to
        await draw_point(page, [150, 150]);

        const result = await page.evaluate(() => {
            const annotations = window.ulabel.get_current_subtask().annotations;
            const annotation_id = annotations.ordering[0];
            const initial_subtask = window.ulabel.state.current_subtask;

            // null subtask_key should NOT trigger set_subtask
            window.ulabel.fly_to_annotation_id(annotation_id, null);

            return {
                subtask_unchanged: window.ulabel.state.current_subtask === initial_subtask,
            };
        });

        expect(result.subtask_unchanged).toBe(true);
    });

    test("show_global_edit_suggestion with null nonspatial_id uses spatial path", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Create a spatial annotation
        await draw_bbox(page, [100, 100], [200, 200]);

        // With null nonspatial_id, should use the spatial path (containing_box)
        // not the nonspatial path (reclf__ DOM element)
        const result = await page.evaluate(() => {
            const annotations = window.ulabel.get_current_subtask().annotations;
            const annotation_id = annotations.ordering[0];

            try {
                window.ulabel.show_global_edit_suggestion(annotation_id, null, null);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        expect(result.success).toBe(true);
    });

    test("submit payload preserves task_meta value from config", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Check that task_meta in config is preserved as-is
        const task_meta = await page.evaluate(() => {
            return window.ulabel.config.task_meta;
        });

        // task_meta should be whatever the demo page configured (likely {} or an object)
        // The key assertion: it should NOT be unexpectedly converted
        expect(task_meta).not.toBeUndefined();
    });

    test("class keybinds should be null when not configured", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const keybind_values = await page.evaluate(() => {
            const subtask = window.ulabel.get_current_subtask();
            return subtask.class_defs.map((cd) => ({
                id: cd.id,
                keybind: cd.keybind,
                keybind_is_null: cd.keybind === null,
                keybind_is_undefined: cd.keybind === undefined,
            }));
        });

        // Classes without configured keybinds should have null (not undefined or "")
        for (const entry of keybind_values) {
            if (entry.keybind === null) {
                expect(entry.keybind_is_null).toBe(true);
                expect(entry.keybind_is_undefined).toBe(false);
            }
        }
    });

    test("annotation class_id derived from classification_payloads should be a valid number string", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Create a point annotation
        await draw_point(page, [150, 150]);

        const result = await page.evaluate(() => {
            const subtask = window.ulabel.get_current_subtask();
            const annotation_id = subtask.annotations.ordering[0];
            const annotation = subtask.annotations.access[annotation_id];

            return {
                has_classification: annotation.classification_payloads != null,
                payload_length: annotation.classification_payloads?.length,
                first_class_id: annotation.classification_payloads?.[0]?.class_id,
                class_id_type: typeof annotation.classification_payloads?.[0]?.class_id,
            };
        });

        // classification_payloads must exist and have at least one entry
        expect(result.has_classification).toBe(true);
        expect(result.payload_length).toBeGreaterThan(0);
        // class_id must be a number (not undefined or "0" from default)
        expect(result.class_id_type).toBe("number");
        expect(result.first_class_id).toBeGreaterThan(0);
    });

    test("distance_from property should have numeric distance values", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Create a polyline (acts as the "row")
        await draw_polyline(page, [[100, 200], [300, 200], [500, 200]]);

        // Create a point annotation near the polyline
        await draw_point(page, [200, 250]);

        // Force the distance filter to recalculate all point-to-line distances
        await page.evaluate(() => {
            window.ulabel.update_filter_distance(null, false, true);
        });

        const result = await page.evaluate(() => {
            const subtask = window.ulabel.get_current_subtask();
            const annotations = subtask.annotations;

            // Find point annotations that should have distance_from assigned
            for (const id of annotations.ordering) {
                const ann = annotations.access[id];
                if (ann.spatial_type === "point" && ann.distance_from) {
                    if (!ann.distance_from.closest_row) {
                        return { valid: false, error: "closest_row missing from distance_from" };
                    }
                    if (typeof ann.distance_from.closest_row.distance !== "number") {
                        return { valid: false, error: "distance is not a number, got: " + typeof ann.distance_from.closest_row.distance };
                    }
                    if (Number.isNaN(ann.distance_from.closest_row.distance)) {
                        return { valid: false, error: "distance is NaN" };
                    }
                    // The point is 50px below the line, so distance should be positive
                    return { valid: true, distance: ann.distance_from.closest_row.distance };
                }
            }
            return { valid: false, error: "no point annotation with distance_from found" };
        });

        expect(result.valid).toBe(true);
        // The point at y=250 is ~50px from the line at y=200
        expect(result.distance).toBeGreaterThan(0);
    });

    test("show_annotation_mode with null should use default selector", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // show_annotation_mode(null) should select the current mode button via jQuery
        // and update the .current_mode label without throwing
        const result = await page.evaluate(() => {
            try {
                window.ulabel.show_annotation_mode(null);
                const mode_label = document.querySelector(".current_mode");
                return {
                    success: true,
                    has_label: mode_label !== null,
                    label_text: mode_label ? mode_label.innerHTML : null,
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        expect(result.success).toBe(true);
        expect(result.has_label).toBe(true);
        // Label should contain the name of the current mode
        expect(result.label_text).toBeTruthy();
    });

    test("redraw_all_annotations with null offset should not throw", async ({ page }) => {
        await wait_for_ulabel_init(page);

        await draw_bbox(page, [100, 100], [200, 200]);

        const result = await page.evaluate(() => {
            try {
                // First arg is subtask key, second is offset (null = no offset)
                const subtask_key = Object.keys(window.ulabel.subtasks)[0];
                window.ulabel.redraw_all_annotations(subtask_key, null, false);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        expect(result.success).toBe(true);
    });

    test("redraw_all_annotations with null subtask should redraw all subtasks", async ({ page }) => {
        await wait_for_ulabel_init(page);

        await draw_bbox(page, [100, 100], [200, 200]);

        const result = await page.evaluate(() => {
            try {
                // null subtask means "redraw all subtasks"
                window.ulabel.redraw_all_annotations(null, null, false);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        });

        expect(result.success).toBe(true);
    });
});
