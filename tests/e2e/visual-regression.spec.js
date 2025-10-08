// Visual regression tests for ULabel interface
import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
    test("should match baseline screenshot of main interface", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Wait for image to load
        await page.waitForLoadState("networkidle");

        // Take screenshot of the entire interface
        await expect(page).toHaveScreenshot("main-interface.png");
    });

    test("should match toolbox appearance", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Screenshot of just the toolbox
        await expect(page.locator(".toolbox_cls")).toHaveScreenshot("toolbox.png");
    });

    test("should match bbox annotation rendering", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Switch to bbox mode and create annotation
        await page.click("a#md-btn--bbox");
        const canvas = page.locator("canvas.front_canvas");
        await canvas.click({ position: { x: 100, y: 100 } });
        await canvas.click({ position: { x: 200, y: 200 } });

        // Wait a moment for rendering
        await page.waitForTimeout(500);

        // Screenshot the canvas area
        await expect(page.locator("#container")).toHaveScreenshot("bbox-annotation.png");
    });

    test("should match polygon annotation rendering", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Switch to polygon mode and create annotation
        await page.click("a#md-btn--polygon");
        const canvas = page.locator("canvas.front_canvas");

        // Create a triangle
        await canvas.click({ position: { x: 100, y: 100 } });
        await canvas.click({ position: { x: 200, y: 100 } });
        await canvas.click({ position: { x: 150, y: 200 } });
        await canvas.click({ position: { x: 100, y: 100 } }); // Close polygon

        await page.waitForTimeout(500);

        // Screenshot the canvas area
        await expect(page.locator("#container")).toHaveScreenshot("polygon-annotation.png");
    });
});
