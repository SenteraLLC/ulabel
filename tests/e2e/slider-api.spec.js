// End-to-end tests for slider public API methods
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

test.describe("Slider Public API", () => {
    test.describe("get_keypoint_slider_value", () => {
        test("should return default keypoint slider value after init", async ({ page }) => {
            await wait_for_ulabel_init(page);

            const value = await page.evaluate(() => window.ulabel.get_keypoint_slider_value());

            // Default keypoint_slider_default_value is 0, so the slider should be at 0
            expect(value).toBe(0);
        });

        test("should reflect value after moving the slider", async ({ page }) => {
            await wait_for_ulabel_init(page);

            // Set the slider to 75 (out of 100) via the DOM
            await page.evaluate(() => {
                const slider = document.querySelector("#keypoint-slider");
                slider.value = "75";
                slider.dispatchEvent(new Event("input", { bubbles: true }));
            });

            const value = await page.evaluate(() => window.ulabel.get_keypoint_slider_value());

            // Value should be 0.75 (75 / 100)
            expect(value).toBe(0.75);
        });

        test("should return a number between 0 and 1", async ({ page }) => {
            await wait_for_ulabel_init(page);

            const value = await page.evaluate(() => window.ulabel.get_keypoint_slider_value());

            expect(typeof value).toBe("number");
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        });
    });

    test.describe("get_distance_filter_value", () => {
        test("should return default distance filter value after init", async ({ page }) => {
            await wait_for_ulabel_init(page);

            const value = await page.evaluate(() => window.ulabel.get_distance_filter_value());

            // Should have at least the closest_row key with the default distance of 40
            expect(value).not.toBeNull();
            expect(value.closest_row).toBeDefined();
            expect(value.closest_row.distance).toBe(40);
        });

        test("should reflect value after moving the slider", async ({ page }) => {
            await wait_for_ulabel_init(page);

            // Set the distance filter slider to 200
            await page.evaluate(() => {
                const slider = document.querySelector("#filter-row-distance-closest_row");
                slider.value = "200";
                slider.dispatchEvent(new Event("input", { bubbles: true }));
            });

            const value = await page.evaluate(() => window.ulabel.get_distance_filter_value());

            expect(value.closest_row.distance).toBe(200);
        });

        test("should return an object with closest_row key", async ({ page }) => {
            await wait_for_ulabel_init(page);

            const value = await page.evaluate(() => window.ulabel.get_distance_filter_value());

            expect(typeof value).toBe("object");
            expect(value).toHaveProperty("closest_row");
            expect(typeof value.closest_row.distance).toBe("number");
        });
    });

    test.describe("get_confidence_slider_value", () => {
        test("should return default confidence slider value after init", async ({ page }) => {
            await wait_for_ulabel_init(page);

            const value = await page.evaluate(() => window.ulabel.get_confidence_slider_value());

            // Should have the "all" key with the default threshold of 0
            expect(value).not.toBeNull();
            expect(value.all).toBe(0);
        });

        test("should reflect value after moving the slider", async ({ page }) => {
            await wait_for_ulabel_init(page);

            // Set the single-class confidence slider to 60
            await page.evaluate(() => {
                const slider = document.querySelector("#confidence-slider-all");
                slider.value = "60";
                slider.dispatchEvent(new Event("input", { bubbles: true }));
            });

            const value = await page.evaluate(() => window.ulabel.get_confidence_slider_value());

            expect(value.all).toBe(60);
        });

        test("should return an object with an all key", async ({ page }) => {
            await wait_for_ulabel_init(page);

            const value = await page.evaluate(() => window.ulabel.get_confidence_slider_value());

            expect(typeof value).toBe("object");
            expect(value).toHaveProperty("all");
            expect(typeof value.all).toBe("number");
        });
    });
});
