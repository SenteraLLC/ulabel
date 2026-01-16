// End-to-end tests for individual keybind functionality
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import { get_annotation_count, get_annotation_by_index, get_annotation_class_id } from "../testing-utils/annotation_utils";
import { draw_bbox, draw_polygon, draw_polyline } from "../testing-utils/drawing_utils";
import { get_current_subtask_key, get_current_subtask } from "../testing-utils/subtask_utils";

/**
 * Helper function to press a keybind with modifiers
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} keybind - The keybind string (e.g., "r", "shift+r", "ctrl+alt+d")
 */
async function press_keybind(page, keybind) {
    const keys = keybind.toLowerCase().split("+");

    // Helper to normalize key names for Playwright
    const normalize_key = (key) => {
        // Playwright expects "Tab" not "tab", "Space" not "space", etc.
        if (key === "tab") return "Tab";
        if (key === "space") return "Space";
        if (key === "enter") return "Enter";
        if (key === "escape") return "Escape";
        if (key === "ctrl") return "Control";
        if (key === "meta" || key === "cmd") return "Meta";
        if (key === "shift") return "Shift";
        if (key === "alt") return "Alt";
        return key;
    };

    // normalize each key and recombine
    const normalized_keys = keys.map(normalize_key);
    await page.keyboard.press(normalized_keys.join("+"));
}

/**
 * Helper function to get the current keybind value from the keybinds toolbox item
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} labelText - The label text to search for (e.g., "Reset Zoom")
 * @returns {Promise<string>} The current keybind value
 */
async function get_keybind_value(page, label_text) {
    // Ensure keybinds toolbox is expanded
    const keybinds_header = page.locator(".keybinds-header");
    const keybinds_list = page.locator(".keybinds-list");

    // Check if already expanded
    const is_expanded = await keybinds_list.isVisible().catch(() => false);
    if (!is_expanded) {
        await keybinds_header.click();
        await expect(keybinds_list).toBeVisible();
    }

    // Find the keybind item by label text
    const keybind_item = page.locator(".keybind-item").filter({ hasText: label_text });
    await expect(keybind_item).toBeVisible();

    // Get the keybind value
    const keybind_key = keybind_item.locator(".keybind-key");
    const keybind = await keybind_key.textContent();

    return keybind.trim();
}

test.describe("Keybind Functionality Tests", () => {
    test("reset_zoom_keybind should reset zoom to fit image", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get the current keybind from the toolbox
        const keybind = await get_keybind_value(page, "Reset Zoom");

        // Get initial zoom level
        const initial_zoom = await page.evaluate(() => {
            return window.ulabel.state.zoom_val;
        });

        // Zoom in to change the zoom level
        await page.mouse.move(400, 400);
        await page.mouse.wheel(0, -100); // Zoom in

        // Wait for zoom to update
        await page.waitForTimeout(100);

        // Verify zoom changed
        const zoomed_in = await page.evaluate(() => {
            return window.ulabel.state.zoom_val;
        });
        expect(zoomed_in).not.toBe(initial_zoom);

        // Press the reset zoom keybind
        await press_keybind(page, keybind);

        // Wait for zoom to update
        await page.waitForTimeout(100);

        // Verify zoom was reset
        const reset_zoom = await page.evaluate(() => {
            return window.ulabel.state.zoom_val;
        });
        expect(reset_zoom).toBe(initial_zoom);
    });

    test("show_full_image_keybind should zoom to show full image", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get the current keybind from the toolbox
        const keybind = await get_keybind_value(page, "Show Full Image");

        // Zoom in to change the view
        await page.mouse.move(400, 400);
        await page.mouse.wheel(0, -200); // Zoom in significantly

        // Wait for zoom to update
        await page.waitForTimeout(100);

        // Get the current zoom and position
        const before_zoom = await page.evaluate(() => {
            return {
                zoom: window.ulabel.state.zoom_val,
                x: window.ulabel.state.px_per_px,
                y: window.ulabel.state.py_per_px,
            };
        });

        // Press the show full image keybind
        await press_keybind(page, keybind);

        // Wait for zoom to update
        await page.waitForTimeout(100);

        // Verify view changed (zoom should be different to show full image)
        const after_zoom = await page.evaluate(() => {
            return {
                zoom: window.ulabel.state.zoom_val,
                x: window.ulabel.state.px_per_px,
                y: window.ulabel.state.py_per_px,
            };
        });

        // The zoom should have changed to show the full image
        expect(after_zoom.zoom).not.toBe(before_zoom.zoom);
    });

    test("create_point_annotation_keybind should create a point annotation at cursor", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get the current keybind from the toolbox
        const keybind = await get_keybind_value(page, "Create Point");

        // Switch to point annotation mode first
        const point_mode_button = page.locator("#md-btn--point");
        await point_mode_button.click();

        // Wait for mode to switch
        await page.waitForTimeout(100);

        // Get initial annotation count
        const initial_count = await get_annotation_count(page);

        // Move mouse to a specific location on the image
        const canvas = page.locator("#annbox");
        await canvas.hover({ position: { x: 300, y: 300 } });

        // Press the create point keybind
        await press_keybind(page, keybind);

        // Wait for annotation to be created
        await page.waitForTimeout(200);

        // Verify a new annotation was created
        const new_count = await get_annotation_count(page);
        expect(new_count).toBe(initial_count + 1);

        // Verify it's a point annotation
        const last_annotation = await get_annotation_by_index(page, new_count - 1);
        expect(last_annotation.spatial_type).toBe("point");
    });

    test("delete_annotation_keybind should delete the hovered annotation", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get the current keybind from the toolbox
        const keybind = await get_keybind_value(page, "Delete Annotation");

        // Create a bbox annotation - this leaves the mouse at the bottom right
        await draw_bbox(page, [200, 200], [400, 400]);

        // Get the annotation before deletion
        const annotation = await get_annotation_by_index(page, 0);
        expect(annotation.deprecated).toBe(false);

        // Move mouse to center of bbox to trigger hover
        await page.mouse.move(300, 300);
        await page.waitForTimeout(200);

        // Press the delete keybind
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify the annotation is now deprecated
        const annotation_after_delete = await get_annotation_by_index(page, 0);
        expect(annotation_after_delete.deprecated).toBe(true);
    });

    test("switch_subtask_keybind should switch to the next subtask", async ({ page }) => {
        // Use multi-class demo which has multiple subtasks
        await page.goto("demo/multi-class.html");
        await wait_for_ulabel_init(page);

        // Get the current keybind from the toolbox
        const keybind = await get_keybind_value(page, "Switch Subtask");

        // Get initial subtask
        const initial_subtask = await get_current_subtask_key(page);
        expect(initial_subtask).toBe("car_detection");

        // Press the switch subtask keybind
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify we switched to the next subtask
        const new_subtask = await get_current_subtask_key(page);
        expect(new_subtask).toBe("frame_review");

        // Press again to cycle back
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify we cycled back to the first subtask
        const final_subtask = await get_current_subtask_key(page);
        expect(final_subtask).toBe("car_detection");
    });

    test("toggle_annotation_mode_keybind should cycle through annotation modes", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get the current keybind from the toolbox
        const keybind = await get_keybind_value(page, "Toggle Annotation Mode");

        // Helper to get current annotation mode
        const get_current_mode = async () => {
            return await page.evaluate(() => {
                return window.ulabel.get_current_subtask().state.annotation_mode;
            });
        };

        // Get initial mode (should be bbox by default)
        const initial_mode = await get_current_mode();
        expect(initial_mode).toBe("bbox");

        // Press the keybind to toggle to next mode
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify we switched to a different mode
        const second_mode = await get_current_mode();
        expect(second_mode).not.toBe(initial_mode);

        // Press again to toggle to another mode
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify we switched again
        const third_mode = await get_current_mode();
        expect(third_mode).not.toBe(second_mode);

        // Keep pressing until we cycle back to the original mode
        let current_mode = third_mode;
        let attempts = 0;
        const max_attempts = 10; // Safety limit
        while (current_mode !== initial_mode && attempts < max_attempts) {
            await press_keybind(page, keybind);
            await page.waitForTimeout(200);
            current_mode = await get_current_mode();
            attempts++;
        }

        // Verify we cycled back to the initial mode
        expect(current_mode).toBe(initial_mode);
    });

    test("create_bbox_on_initial_crop_keybind should create a bbox covering the full image", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get the current keybind from the toolbox
        const keybind = await get_keybind_value(page, "Create BBox on Crop");

        // Ensure we're in bbox mode
        await page.click("a#md-btn--bbox");
        await page.waitForTimeout(100);

        // Get initial annotation count
        const initial_count = await get_annotation_count(page);
        expect(initial_count).toBe(0);

        // Press the keybind to create a full-image bbox
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify an annotation was created
        const new_count = await get_annotation_count(page);
        expect(new_count).toBe(1);

        // Verify the bbox covers the full image (or initial crop)
        const annotation = await get_annotation_by_index(page, 0);
        expect(annotation.spatial_type).toBe("bbox");

        // Get image dimensions to verify bbox size
        const image_dimensions = await page.evaluate(() => {
            return {
                width: window.ulabel.config.image_width,
                height: window.ulabel.config.image_height,
                initial_crop: window.ulabel.config.initial_crop,
            };
        });

        // If there's an initial crop, the bbox should match it; otherwise, match the full image
        if (image_dimensions.initial_crop) {
            const crop = image_dimensions.initial_crop;
            expect(annotation.spatial_payload).toEqual([
                [crop.left, crop.top],
                [crop.left + crop.width, crop.top + crop.height],
            ]);
        } else {
            expect(annotation.spatial_payload).toEqual([
                [0, 0],
                [image_dimensions.width, image_dimensions.height],
            ]);
        }
    });

    test("fly_to_next and fly_to_prev should zoom in and cycle through annotations", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get the current keybind from the toolbox
        const fly_to_keybind = await get_keybind_value(page, "Next Annotation");
        const fly_to_prev_keybind = await get_keybind_value(page, "Previous Annotation");

        // Create multiple annotations at different non-overlapping positions
        await draw_bbox(page, [100, 100], [180, 180]);
        await page.waitForTimeout(100);
        await draw_bbox(page, [200, 200], [280, 280]);
        await page.waitForTimeout(100);
        await draw_bbox(page, [300, 300], [380, 380]);

        // Verify we have 3 annotations
        const count = await get_annotation_count(page);
        expect(count).toBe(3);

        const initial_zoom = await page.evaluate(() => {
            return window.ulabel.state.zoom_val;
        });

        // Press the keybind to fly to next annotation - should change the view
        await press_keybind(page, fly_to_keybind);
        await page.waitForTimeout(300);

        const first_anno_zoom = await page.evaluate(() => {
            return window.ulabel.state.zoom_val;
        });
        expect(first_anno_zoom).not.toBe(initial_zoom);

        // Press the keybind to fly to next annotation again
        await press_keybind(page, fly_to_keybind);
        await page.waitForTimeout(300);

        const second_anno_zoom = await page.evaluate(() => {
            return window.ulabel.state.zoom_val;
        });
        expect(second_anno_zoom).not.toBe(first_anno_zoom);

        // Press the keybind to fly to previous annotation - should go back to first annotation
        await press_keybind(page, fly_to_prev_keybind);
        await page.waitForTimeout(300);
        const back_to_first_zoom = await page.evaluate(() => {
            return window.ulabel.state.zoom_val;
        });
        expect(back_to_first_zoom).toBe(first_anno_zoom);
    });

    test("annotation_size keybinds should control annotation display size", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get all annotation size keybinds from the toolbox
        const small_keybind = await get_keybind_value(page, "Size: Small");
        const large_keybind = await get_keybind_value(page, "Size: Large");
        const plus_keybind = await get_keybind_value(page, "Size: Increase");
        const minus_keybind = await get_keybind_value(page, "Size: Decrease");
        const vanish_keybind = await get_keybind_value(page, "Toggle Vanish All");

        // Create an annotation
        await draw_bbox(page, [200, 200], [400, 400]);

        // Test small keybind - should set size to 1.5
        await press_keybind(page, small_keybind);
        await page.waitForTimeout(200);
        let subtask = await get_current_subtask(page);
        expect(subtask.state.line_size).toBe(1.5);

        // Test large keybind - should set size to 5
        await press_keybind(page, large_keybind);
        await page.waitForTimeout(200);
        subtask = await get_current_subtask(page);
        expect(subtask.state.line_size).toBe(5);

        // Test plus keybind - should increase by 0.5
        const size_before_plus = subtask.state.line_size;
        await press_keybind(page, plus_keybind);
        await page.waitForTimeout(200);
        subtask = await get_current_subtask(page);
        expect(subtask.state.line_size).toBe(size_before_plus + 0.5);

        // Test minus keybind - should decrease by 0.5
        const size_before_minus = subtask.state.line_size;
        await press_keybind(page, minus_keybind);
        await page.waitForTimeout(200);
        subtask = await get_current_subtask(page);
        expect(subtask.state.line_size).toBe(size_before_minus - 0.5);

        // Test vanish keybind - should toggle vanish mode
        const vanish_state_before = (await get_current_subtask(page)).state.is_vanished;
        await press_keybind(page, vanish_keybind);
        await page.waitForTimeout(200);
        expect((await get_current_subtask(page)).state.is_vanished).not.toBe(vanish_state_before);

        // Press vanish again to restore - should go back to previous state
        await press_keybind(page, vanish_keybind);
        await page.waitForTimeout(200);
        expect((await get_current_subtask(page)).state.is_vanished).toBe(vanish_state_before);
    });

    test("brush mode keybinds should control brush state and size", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get brush-related keybinds from the toolbox
        const toggle_brush_keybind = await get_keybind_value(page, "Toggle Brush");
        const toggle_erase_keybind = await get_keybind_value(page, "Toggle Erase");
        const increase_brush_keybind = await get_keybind_value(page, "Increase Brush Size");
        const decrease_brush_keybind = await get_keybind_value(page, "Decrease Brush Size");

        // Switch to polygon mode (required for brush mode)
        await page.click("a#md-btn--polygon");
        await page.waitForTimeout(200);

        // Helper to get brush state
        const get_brush_state = async () => {
            return await page.evaluate(() => {
                const subtask = window.ulabel.get_current_subtask();
                return {
                    is_in_brush_mode: subtask.state.is_in_brush_mode,
                    is_in_erase_mode: subtask.state.is_in_erase_mode,
                    brush_size: window.ulabel.config.brush_size,
                };
            });
        };

        // Initial state - not in brush mode
        let brush_state = await get_brush_state();
        expect(brush_state.is_in_brush_mode).toBe(false);

        // Test toggle brush keybind - should enter brush mode
        await press_keybind(page, toggle_brush_keybind);
        await page.waitForTimeout(200);
        brush_state = await get_brush_state();
        expect(brush_state.is_in_brush_mode).toBe(true);
        expect(brush_state.is_in_erase_mode).toBe(false);

        // Test increase brush size - should multiply by 1.1
        const initial_brush_size = brush_state.brush_size;
        await press_keybind(page, increase_brush_keybind);
        await page.waitForTimeout(200);
        brush_state = await get_brush_state();
        expect(brush_state.brush_size).toBeCloseTo(initial_brush_size * 1.1, 5);

        // Test decrease brush size - should divide by 1.1
        const enlarged_brush_size = brush_state.brush_size;
        await press_keybind(page, decrease_brush_keybind);
        await page.waitForTimeout(200);
        brush_state = await get_brush_state();
        expect(brush_state.brush_size).toBeCloseTo(enlarged_brush_size / 1.1, 5);

        // Test toggle erase keybind - should enter erase mode (also sets brush mode)
        await press_keybind(page, toggle_erase_keybind);
        await page.waitForTimeout(200);
        brush_state = await get_brush_state();
        expect(brush_state.is_in_erase_mode).toBe(true);

        // Toggle erase again - should exit erase mode but stay in brush mode
        await press_keybind(page, toggle_erase_keybind);
        await page.waitForTimeout(200);
        brush_state = await get_brush_state();
        expect(brush_state.is_in_erase_mode).toBe(false);
    });

    test("undo and redo keybinds (ctrl+z and ctrl+shift+z) should undo and redo actions", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get initial annotation count
        let count = await get_annotation_count(page);
        expect(count).toBe(0);

        // Create an annotation
        await draw_bbox(page, [200, 200], [400, 400]);
        await page.waitForTimeout(200);

        // Verify annotation was created
        count = await get_annotation_count(page);
        expect(count).toBe(1);

        // Press ctrl+z to undo
        await press_keybind(page, "ctrl+z");
        await page.waitForTimeout(200);

        // Verify annotation was undone (removed from ordering)
        count = await get_annotation_count(page);
        expect(count).toBe(0);

        // Press ctrl+shift+z to redo
        await press_keybind(page, "ctrl+shift+z");
        await page.waitForTimeout(200);

        // Verify annotation was restored
        count = await get_annotation_count(page);
        expect(count).toBe(1);
    });

    test("escape keybind should cancel in-progress annotation, exit brush mode, and exit erase mode", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Switch to polygon mode
        await page.click("a#md-btn--polygon");
        await page.waitForTimeout(200);

        // Test 1: Cancel annotation in progress
        const canvas = page.locator("#annbox");

        // Start drawing a polygon by clicking first point
        await canvas.click({ position: { x: 200, y: 200 } });
        await page.waitForTimeout(100);

        // Verify annotation is in progress
        let is_in_progress = await page.evaluate(() => {
            return window.ulabel.get_current_subtask().state.is_in_progress;
        });
        expect(is_in_progress).toBe(true);

        // Press escape to cancel
        await press_keybind(page, "escape");
        await page.waitForTimeout(200);

        // Verify annotation was cancelled
        is_in_progress = await page.evaluate(() => {
            return window.ulabel.get_current_subtask().state.is_in_progress;
        });
        expect(is_in_progress).toBe(false);

        // Verify annotation is now deprecated
        const annotation = await get_annotation_by_index(page, 0);
        expect(annotation.deprecated).toBe(true);

        // Test 2: Exit brush mode
        // Enter brush mode
        const toggle_brush_keybind = await get_keybind_value(page, "Toggle Brush");
        await press_keybind(page, toggle_brush_keybind);
        await page.waitForTimeout(200);

        // Verify we're in brush mode
        let brush_state = await page.evaluate(() => {
            const subtask = window.ulabel.get_current_subtask();
            return {
                is_in_brush_mode: subtask.state.is_in_brush_mode,
                is_in_erase_mode: subtask.state.is_in_erase_mode,
            };
        });
        expect(brush_state.is_in_brush_mode).toBe(true);
        expect(brush_state.is_in_erase_mode).toBe(false);

        // Press escape to exit brush mode
        await press_keybind(page, "escape");
        await page.waitForTimeout(200);

        // Verify we exited brush mode
        brush_state = await page.evaluate(() => {
            const subtask = window.ulabel.get_current_subtask();
            return {
                is_in_brush_mode: subtask.state.is_in_brush_mode,
                is_in_erase_mode: subtask.state.is_in_erase_mode,
            };
        });
        expect(brush_state.is_in_brush_mode).toBe(false);

        // Test 3: Exit erase mode
        // Enter erase mode
        const toggle_erase_keybind = await get_keybind_value(page, "Toggle Erase");
        await press_keybind(page, toggle_erase_keybind);
        await page.waitForTimeout(300);

        // Verify we're in erase mode
        brush_state = await page.evaluate(() => {
            const subtask = window.ulabel.get_current_subtask();
            return {
                is_in_brush_mode: subtask.state.is_in_brush_mode,
                is_in_erase_mode: subtask.state.is_in_erase_mode,
            };
        });
        expect(brush_state.is_in_erase_mode).toBe(true);

        // Press escape to exit erase mode
        await press_keybind(page, "escape");
        await page.waitForTimeout(200);

        // Verify we exited erase mode
        brush_state = await page.evaluate(() => {
            const subtask = window.ulabel.get_current_subtask();
            return {
                is_in_brush_mode: subtask.state.is_in_brush_mode,
                is_in_erase_mode: subtask.state.is_in_erase_mode,
            };
        });
        expect(brush_state.is_in_erase_mode).toBe(false);
    });

    test("class keybinds should be settable, work, and reset to null/none", async ({ page }) => {
        // Use multi-class demo which has classes with and without keybinds
        await page.goto("demo/multi-class.html");
        await wait_for_ulabel_init(page);

        // Expand the keybinds toolbox
        const keybinds_header = page.locator(".keybinds-header");
        await keybinds_header.click();
        await page.waitForTimeout(200);

        // Scroll down in the keybinds list to find class keybinds
        const keybinds_list = page.locator(".keybinds-list");
        await keybinds_list.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(200);

        // Find the "Truck" class keybind item (starts with no keybind)
        const truck_keybind_item = page.locator(".keybind-item").filter({ hasText: "Truck" });
        await expect(truck_keybind_item).toBeVisible();

        // Verify initial keybind is "none" or empty
        let truck_key = truck_keybind_item.locator(".keybind-key");
        let initial_keybind = await truck_key.textContent();
        expect(initial_keybind.trim().toLowerCase()).toMatch(/none|^$/);

        // Click to set a new keybind
        await truck_key.click();
        await page.waitForTimeout(100);

        // Press a key to set the keybind
        await page.keyboard.press("3");
        await page.waitForTimeout(200);

        // Verify the keybind was set
        let new_keybind = await truck_key.textContent();
        expect(new_keybind.trim()).toBe("3");

        // Test that the keybind works - create an annotation and press the keybind
        await page.click("a#md-btn--bbox");
        await page.waitForTimeout(200);

        // Draw a bbox
        await draw_bbox(page, [200, 200], [400, 400]);
        await page.waitForTimeout(200);

        // Hover over the created annotation to select it
        await page.mouse.move(300, 300);
        await page.waitForTimeout(200);

        // Get the annotation and verify initial class
        let annotation = await get_annotation_by_index(page, 0);
        expect(get_annotation_class_id(annotation)).toBe(10); // Sedan

        // Press the keybind to select the Truck class
        await press_keybind(page, "3");
        await page.waitForTimeout(200);

        // Verify the active class changed to Truck (id: 12)
        annotation = await get_annotation_by_index(page, 0);
        expect(get_annotation_class_id(annotation)).toBe(12);

        // Hit the reset button to clear the Truck keybind
        const reset_button = truck_keybind_item.locator(".keybind-reset-btn");
        await reset_button.click();
        await page.waitForTimeout(200);

        // Verify keybind was reset to none
        const reset_keybind = await truck_key.textContent();
        expect(reset_keybind.trim().toLowerCase()).toMatch(/none|^$/);

        // Hover over the annotation and press "1" to select Sedan
        await page.mouse.move(300, 300);
        await page.waitForTimeout(200);
        await page.keyboard.press("1");
        await page.waitForTimeout(200);

        // Verify active class is now Sedan (id: 10)
        annotation = await get_annotation_by_index(page, 0);
        expect(get_annotation_class_id(annotation)).toBe(10);

        // Verify the keybind no longer works - press "3" and check active class doesn't change to Truck
        await page.keyboard.press("3");
        await page.waitForTimeout(200);
        annotation = await get_annotation_by_index(page, 0);
        expect(get_annotation_class_id(annotation)).toBe(10); // Still Sedan
    });

    test("delete_vertex_keybind should delete a vertex from a polygon when hovering", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get the delete vertex keybind from the toolbox
        const keybind = await get_keybind_value(page, "Delete Vertex");

        // Draw a polygon with 4 points (square)
        await draw_polygon(page, [
            [200, 200],
            [400, 200],
            [400, 400],
            [200, 400],
        ]);
        await page.waitForTimeout(200);

        // Get the annotation and verify it has 5 points (4 + duplicate first/last)
        let annotation = await get_annotation_by_index(page, 0);
        expect(annotation.spatial_payload[0].length).toBe(5);

        // Move mouse to hover over a vertex (point 4)
        await page.mouse.move(200, 400);
        await page.waitForTimeout(200);

        // Verify edit suggestion is showing and it's a vertex
        let edit_candidate = await page.evaluate(() => {
            return window.ulabel.get_current_subtask().state.edit_candidate;
        });
        expect(edit_candidate).not.toBeNull();
        expect(edit_candidate.is_vertex).toBe(true);

        // Press the delete vertex keybind
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify the polygon now has 4 points (3 + duplicate first/last)
        annotation = await get_annotation_by_index(page, 0);
        expect(annotation.spatial_payload[0].length).toBe(4);

        // Move mouse to hover over a segment (midpoint between two vertices)
        await page.mouse.move(300, 200); // Midpoint of top edge
        await page.waitForTimeout(200);

        // Verify edit suggestion is showing but it's NOT a vertex
        edit_candidate = await page.evaluate(() => {
            return window.ulabel.get_current_subtask().state.edit_candidate;
        });
        expect(edit_candidate).not.toBeNull();
        expect(edit_candidate.is_vertex).toBe(false);

        // Press the delete vertex keybind
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify the polygon still has the same number of points (not deleted)
        annotation = await get_annotation_by_index(page, 0);
        expect(annotation.spatial_payload[0].length).toBe(4);

        // Move mouse to hover over a vertex
        await page.mouse.move(400, 200);
        await page.waitForTimeout(200);

        // Press the delete vertex keybind
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify the polygon is now deprecated
        annotation = await get_annotation_by_index(page, 0);
        expect(annotation.deprecated).toBe(true);
    });

    test("delete_vertex_keybind should delete entire polyline when only 1 point remains", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Get the delete vertex keybind from the toolbox
        const keybind = await get_keybind_value(page, "Delete Vertex");

        // Draw a polyline with 2 points
        await draw_polyline(page, [
            [200, 200],
            [400, 400],
        ]);
        await page.waitForTimeout(200);

        // Verify polyline exists with 2 points
        let annotation = await get_annotation_by_index(page, 0);
        expect(annotation.spatial_type).toBe("polyline");
        expect(annotation.spatial_payload.length).toBe(2);
        expect(annotation.deprecated).toBe(false);

        // Move mouse to hover over a vertex
        await page.mouse.move(200, 200);
        await page.waitForTimeout(300);

        // Press the delete vertex keybind
        await press_keybind(page, keybind);
        await page.waitForTimeout(200);

        // Verify the polyline is now deprecated (deleted)
        annotation = await get_annotation_by_index(page, 0);
        expect(annotation.deprecated).toBe(true);
    });
});
