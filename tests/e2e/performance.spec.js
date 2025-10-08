// Performance tests for ULabel
import { test, expect } from "@playwright/test";

test.describe("Performance Tests", () => {
    test("should load within reasonable time", async ({ page }) => {
        const startTime = Date.now();

        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test("should handle many annotations without performance degradation", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Switch to point mode for quick annotation creation
        await page.click("a#md-btn--point");
        const canvas = page.locator("canvas.front_canvas");

        const startTime = Date.now();

        // Create 100 point annotations
        for (let i = 0; i < 100; i++) {
            await canvas.click({
                position: {
                    x: 50 + (i % 10) * 20,
                    y: 50 + Math.floor(i / 10) * 20,
                },
            });
        }

        const creationTime = Date.now() - startTime;

        // Check that all annotations were created
        const annotationCount = await page.evaluate(() => {
            const currentSubtask = window.ulabel.get_current_subtask();
            return currentSubtask.annotations.ordering.length;
        });

        expect(annotationCount).toBe(100);
        expect(creationTime).toBeLessThan(10000); // Should create 100 annotations within 10 seconds
    });

    test("should maintain responsiveness during annotation creation", async ({ page }) => {
        await page.goto("/multi-class.html");
        await page.waitForFunction(() => window.ulabel && window.ulabel.is_init);

        // Create several annotations and measure response time
        await page.click("a#md-btn--bbox");
        const canvas = page.locator("canvas.front_canvas");

        const responseTimes = [];

        for (let i = 0; i < 10; i++) {
            const startTime = Date.now();

            await canvas.click({ position: { x: 100 + i * 10, y: 100 } });
            await canvas.click({ position: { x: 150 + i * 10, y: 150 } });

            const responseTime = Date.now() - startTime;
            responseTimes.push(responseTime);
        }

        // Average response time should be reasonable
        const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        expect(averageResponseTime).toBeLessThan(500); // Should respond within 500ms on average
    });
});
