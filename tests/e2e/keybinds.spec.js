// End-to-end tests for keybind toolbox item
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

test.describe("Keybinds Toolbox Item", () => {
    test("should display keybinds, allow editing with chords, reset keybinds, and set class keybinds", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Expand the keybinds toolbox item
        const keybindsHeader = page.locator(".keybinds-header");
        await expect(keybindsHeader).toBeVisible();
        await keybindsHeader.click();

        // Check that keybinds list is visible
        const keybindsList = page.locator(".keybinds-list");
        await expect(keybindsList).toBeVisible();

        // Check that some keybinds are present
        const keybindItems = page.locator(".keybind-item");
        const count = await keybindItems.count();
        expect(count).toBeGreaterThan(0);

        // Find a configurable keybind (e.g., "Delete Annotation")
        const deleteKeybindItem = page.locator(".keybind-item").filter({ hasText: "Delete Annotation" });
        await expect(deleteKeybindItem).toBeVisible();

        // Get the original keybind value
        const deleteKeybindKey = deleteKeybindItem.locator(".keybind-key");
        const originalValue = await deleteKeybindKey.textContent();

        // --- Test: Set keybind to a chord ---

        // Click to start editing
        await deleteKeybindKey.click();
        await expect(deleteKeybindKey).toHaveClass(/editing/);
        await expect(deleteKeybindKey).toHaveText("Press key...");

        // Press a chord (shift+x)
        await page.keyboard.press("Shift+X");

        // Check that the keybind was updated
        await expect(deleteKeybindKey).toHaveText("shift+x");
        await expect(deleteKeybindKey).not.toHaveClass(/editing/);

        // Check that the keybind is marked as customized (yellow highlight)
        await expect(deleteKeybindKey).toHaveClass(/customized/);

        // Check that reset button is now visible
        const resetButton = deleteKeybindItem.locator(".keybind-reset-btn");
        await expect(resetButton).toBeVisible();

        // Verify the keybind works by checking localStorage
        const customKeybinds = await page.evaluate(() => {
            const stored = localStorage.getItem("ulabel_custom_keybinds");
            return stored ? JSON.parse(stored) : {};
        });
        expect(customKeybinds).toHaveProperty("delete_annotation_keybind", "shift+x");

        // --- Test: Reset keybind to default ---

        // Click the reset button
        await resetButton.click();

        // Check that the keybind was reset to original value
        await expect(deleteKeybindKey).toHaveText(originalValue);
        await expect(deleteKeybindKey).not.toHaveClass(/customized/);

        // Check that reset button is no longer visible
        await expect(resetButton).not.toBeVisible();

        // Verify it was removed from localStorage
        const customKeybindsAfterReset = await page.evaluate(() => {
            const stored = localStorage.getItem("ulabel_custom_keybinds");
            return stored ? JSON.parse(stored) : {};
        });
        expect(customKeybindsAfterReset).not.toHaveProperty("delete_annotation_keybind");

        // --- Test: Set a class keybind ---

        // Expand the class keybinds section
        const classSection = page.locator(".keybind-category").filter({ hasText: "Class Keybinds" });
        await expect(classSection).toBeVisible();
        await classSection.click();

        // Find the first class keybind
        const classKeybindItems = page.locator(".keybind-section-items[data-section='class'] .keybind-item");
        const classCount = await classKeybindItems.count();

        if (classCount > 0) {
            const firstClassKeybind = classKeybindItems.first();
            const classKeybindKey = firstClassKeybind.locator(".keybind-key");
            const originalClassValue = await classKeybindKey.textContent();

            // Click to start editing
            await classKeybindKey.click();
            await expect(classKeybindKey).toHaveClass(/editing/);

            // Press a simple key
            await page.keyboard.press("q");

            // Check that the class keybind was updated
            await expect(classKeybindKey).toHaveText("q");
            await expect(classKeybindKey).not.toHaveClass(/editing/);
            await expect(classKeybindKey).toHaveClass(/customized/);

            // Get the class ID and verify it was saved
            const classId = await classKeybindKey.getAttribute("data-class-id");
            const customClassKeybinds = await page.evaluate(() => {
                const stored = localStorage.getItem("ulabel_custom_class_keybinds");
                return stored ? JSON.parse(stored) : {};
            });
            expect(customClassKeybinds).toHaveProperty(classId, "q");

            // Reset the class keybind
            const classResetButton = firstClassKeybind.locator(".keybind-reset-btn");
            await classResetButton.click();

            // Verify it was reset
            await expect(classKeybindKey).toHaveText(originalClassValue);
            await expect(classKeybindKey).not.toHaveClass(/customized/);
        }

        // --- Test: Cancel editing with Escape ---

        // Try editing again but cancel with Escape
        await deleteKeybindKey.click();
        await expect(deleteKeybindKey).toHaveClass(/editing/);
        await page.keyboard.press("Escape");

        // Should return to original value
        await expect(deleteKeybindKey).toHaveText(originalValue);
        await expect(deleteKeybindKey).not.toHaveClass(/editing/);

        // --- Test: Reset All to Default ---

        // Set a few keybinds to custom values
        const createPointItem = page.locator(".keybind-item").filter({ hasText: "Create Point" });
        const createPointKey = createPointItem.locator(".keybind-key");
        await createPointKey.click();
        await page.keyboard.press("p");

        const switchSubtaskItem = page.locator(".keybind-item").filter({ hasText: "Switch Subtask" });
        const switchSubtaskKey = switchSubtaskItem.locator(".keybind-key");
        await switchSubtaskKey.click();
        await page.keyboard.press("ctrl+s");

        // Verify both have custom values
        await expect(createPointKey).toHaveClass(/customized/);
        await expect(switchSubtaskKey).toHaveClass(/customized/);

        // Click "Reset All to Default" button
        const resetAllButton = page.locator(".keybinds-reset-all-btn");
        await expect(resetAllButton).toBeVisible();

        // Accept the confirmation dialog
        page.on("dialog", (dialog) => dialog.accept());
        await resetAllButton.click();

        // Verify all keybinds are no longer customized
        await expect(createPointKey).not.toHaveClass(/customized/);
        await expect(switchSubtaskKey).not.toHaveClass(/customized/);
        await expect(deleteKeybindKey).not.toHaveClass(/customized/);

        // Verify localStorage is cleared
        const finalCustomKeybinds = await page.evaluate(() => {
            return localStorage.getItem("ulabel_custom_keybinds");
        });
        expect(finalCustomKeybinds).toBeNull();
    });

    test("should detect and highlight keybind collisions", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Expand the keybinds toolbox item
        await page.locator(".keybinds-header").click();

        // Get two different keybinds
        const deleteKeybindItem = page.locator(".keybind-item").filter({ hasText: "Delete Annotation" });
        const deleteKeybindKey = deleteKeybindItem.locator(".keybind-key");
        const originalDeleteValue = await deleteKeybindKey.textContent();

        const createPointItem = page.locator(".keybind-item").filter({ hasText: "Create Point" });
        const createPointKey = createPointItem.locator(".keybind-key");
        const createPointValue = await createPointKey.textContent();

        // Set delete keybind to the same value as create point keybind
        await deleteKeybindKey.click();
        await page.keyboard.press(createPointValue);

        // Both should now have the collision class
        await expect(deleteKeybindKey).toHaveClass(/collision/);
        await expect(createPointKey).toHaveClass(/collision/);

        // Reset to remove collision
        const resetButton = deleteKeybindItem.locator(".keybind-reset-btn");
        await resetButton.click();

        // Neither should have collision class now
        await expect(deleteKeybindKey).not.toHaveClass(/collision/);
        await expect(createPointKey).not.toHaveClass(/collision/);
    });

    test("should collapse and expand sections with state persistence", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // Expand the keybinds toolbox item
        await page.locator(".keybinds-header").click();

        // Find the "Configurable Keybinds" section
        const configurableSection = page.locator(".keybind-category").filter({ hasText: "Configurable Keybinds" });
        const configurableItems = page.locator(".keybind-section-items[data-section='configurable']");

        // Should be expanded by default (check localStorage is "false" or null)
        await expect(configurableItems).not.toHaveClass(/collapsed/);

        // Click to collapse
        await configurableSection.click();
        await expect(configurableItems).toHaveClass(/collapsed/);

        // Verify localStorage
        const collapsed = await page.evaluate(() => {
            return localStorage.getItem("ulabel_keybind_section_configurable_collapsed");
        });
        expect(collapsed).toBe("true");

        // Click to expand again
        await configurableSection.click();
        await expect(configurableItems).not.toHaveClass(/collapsed/);

        // Verify localStorage
        const expanded = await page.evaluate(() => {
            return localStorage.getItem("ulabel_keybind_section_configurable_collapsed");
        });
        expect(expanded).toBe("false");
    });
});
