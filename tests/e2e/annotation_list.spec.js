// E2E tests for Annotation List functionality
import { test, expect } from "./fixtures";
import { draw_bbox } from "../testing-utils/drawing_utils";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";
import {
    get_annotation_list_count,
    toggle_show_deprecated,
    toggle_group_by_class,
    click_annotation_list_item,
    is_navigation_toast_visible,
    get_navigation_toast_text,
    hover_annotation_list_item,
} from "../testing-utils/annotation_list_utils";
import {
    annotation_global_dialogs_are_visible,
} from "../testing-utils/dialog_utils";

test.describe("Annotation List UI", () => {
    test("should update list on creation/deprecation", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Check annotation list is visible
        await expect(page.locator(".annotation-list-toolbox-item")).toBeVisible();
        await expect(page.locator(".annotation-list-title")).toHaveText("Annotation List");

        // Check that show deprecated and group by class checkboxes are visible
        await expect(page.locator("#annotation-list-show-deprecated")).toBeVisible();
        await expect(page.locator("#annotation-list-group-by-class")).toBeVisible();
        // Both should be unchecked by default
        await expect(page.locator("#annotation-list-show-deprecated")).not.toBeChecked();
        await expect(page.locator("#annotation-list-group-by-class")).not.toBeChecked();

        // Start with empty list
        expect(await get_annotation_list_count(page)).toBe(0);

        // Draw two bboxes
        await draw_bbox(page, [100, 100], [200, 200]);
        await draw_bbox(page, [300, 300], [400, 400]);

        // Check list items appear
        expect(await get_annotation_list_count(page)).toBe(2);

        // Check that items disappear when deprecated
        await page.click(".annotation-list-item:first-child");
        await page.keyboard.press("d");
        expect(await get_annotation_list_count(page)).toBe(1);

        // Show deprecated annotation
        await toggle_show_deprecated(page, true);
        expect(await get_annotation_list_count(page)).toBe(2);
    });
});

test.describe("Annotation List Navigation", () => {
    test("should navigate to annotation on click", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Create annotations
        await draw_bbox(page, [100, 100], [200, 200]);
        await draw_bbox(page, [300, 300], [400, 400]);

        // Hover over the first list item
        await hover_annotation_list_item(page, 0);
        // Expect .global_edit_suggestion to be visible
        expect(await annotation_global_dialogs_are_visible(page, 0)).toBe(true);
        // Expect list item to be highlighted (has .highlighted class)
        const first_item = page.locator(".annotation-list-item").first();
        await expect(first_item).toHaveClass(/highlighted/);

        // Click the list second item
        await click_annotation_list_item(page, 1);
        expect(await annotation_global_dialogs_are_visible(page, 1)).toBe(true);
        // Check toast appears
        expect(await is_navigation_toast_visible(page)).toBe(true);
        expect(await get_navigation_toast_text(page)).toBe("2 / 2");
        // After a delay, check that toast disappears
        await page.waitForTimeout(2000);
        const toast = page.locator(".annotation-navigation-toast");
        const opacity = await toast.evaluate((el) => window.getComputedStyle(el).opacity);
        expect(parseFloat(opacity)).toBeLessThan(0.5);

        // Move mouse back over the first annotation in the canvas
        await page.keyboard.press("r");
        await page.mouse.move(150, 150);
        // Expect list item to be highlighted (has .highlighted class)
        await expect(first_item).toHaveClass(/highlighted/);
    });
});

test.describe("Annotation List Grouping", () => {
    test("should group annotations by class when toggled", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Create annotations with different classes
        await draw_bbox(page, [100, 100], [200, 200]);

        // Switch class and draw second bbox
        await page.mouse.move(300, 300);
        await page.keyboard.press("2");
        await draw_bbox(page, [300, 300], [400, 400]);

        // Should have no group headers
        const group_headers = page.locator(".annotation-list-class-group-header");
        expect(await group_headers.count()).toBe(0);

        // Toggle group by class
        await toggle_group_by_class(page, true);

        // Should have group headers
        expect(await group_headers.count()).toBeGreaterThan(0);

        // Each group header should correspond to a class
        const classes = await page.evaluate(() => {
            const subtask = window.ulabel.subtasks[window.ulabel.state.current_subtask];
            return subtask.class_defs;
        });

        // Should have the two classes that we used
        for (let i = 0; i <= 1; i++) {
            const header = page.locator(".annotation-list-class-group-header", { hasText: classes[i].name });
            expect(await header.count()).toBeGreaterThan(0);
        }
    });
});
