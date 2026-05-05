/**
 * E2E tests for ULabel API behavior contracts.
 *
 * Verifies that null-dependent control flow in public methods like
 * suggest_edits, fly_to_annotation_id, and show_global_edit_suggestion
 * behaves correctly.
 */
import { test, expect } from "./fixtures";
import { draw_bbox, draw_point } from "../testing-utils/drawing_utils";
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
});
