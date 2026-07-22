// End-to-end tests for the ConfidenceSlider toolbox item.
// These exercise browser-specific behavior (DOM wiring, modes, config, coexistence warning)
// that the jest unit tests can't cover. They run against demo/multi-class.html, which enables
// both the ConfidenceSlider and the deprecated KeypointSlider and exposes window.ulabel.
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

test.describe("ConfidenceSlider", () => {
    test("logs a warning when KeypointSlider and ConfidenceSlider are both enabled", async ({ page }) => {
        const messages = [];
        page.on("console", (msg) => messages.push(msg.text()));

        await wait_for_ulabel_init(page);

        expect(
            messages.some((text) => text.includes("KeypointSlider") && text.includes("ConfidenceSlider")),
        ).toBe(true);
    });

    test("reflects the configured step_value on the slider", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // multi-class.html configures step_value: 5
        const step = await page.evaluate(() => document.querySelector("#confidence-slider-all").getAttribute("step"));
        expect(step).toBe("5");
    });

    test("deprecates annotations below the threshold when the slider is raised", async ({ page }) => {
        await wait_for_ulabel_init(page);

        const subtask_key = await page.evaluate(() => window.ulabel.get_current_subtask_key());
        const class_id = await page.evaluate(() => {
            const subtask = window.ulabel.get_current_subtask();
            return subtask.class_defs.find((cd) => cd.id >= 0).id;
        });

        // Inject two bboxes with known confidences
        await page.evaluate(({ stk, cid }) => {
            const annotations = [
                {
                    id: "conf-test-low",
                    spatial_type: "bbox",
                    spatial_payload: [[100, 100], [200, 200]],
                    classification_payloads: [{ class_id: cid, confidence: 0.2 }],
                },
                {
                    id: "conf-test-high",
                    spatial_type: "bbox",
                    spatial_payload: [[300, 300], [400, 400]],
                    classification_payloads: [{ class_id: cid, confidence: 0.9 }],
                },
            ];
            window.ulabel.set_annotations(annotations, stk);
        }, { stk: subtask_key, cid: class_id });

        // Raise the single "all" slider to 50%
        await page.evaluate(() => {
            const slider = document.querySelector("#confidence-slider-all");
            slider.value = "50";
            slider.dispatchEvent(new Event("input", { bubbles: true }));
        });

        const result = await page.evaluate((stk) => {
            const annotations = window.ulabel.get_annotations(stk);
            const low = annotations.find((a) => a.id === "conf-test-low");
            const high = annotations.find((a) => a.id === "conf-test-high");
            return { low: low.deprecated, high: high.deprecated };
        }, subtask_key);

        expect(result.low).toBe(true); // 20% < 50%
        expect(result.high).toBe(false); // 90% >= 50%
    });

    test("shows per-class sliders when Per-Class Filtering is enabled", async ({ page }) => {
        await wait_for_ulabel_init(page);

        // The per-class container starts hidden (default mode is the single "all" slider)
        const hidden_before = await page.evaluate(() =>
            document.querySelector("#confidence-slider-multi-class-mode").classList.contains("ulabel-hidden"),
        );
        expect(hidden_before).toBe(true);

        // Enable per-class filtering via the toggle checkbox
        await page.click("#confidence-slider-multi-checkbox");

        const hidden_after = await page.evaluate(() =>
            document.querySelector("#confidence-slider-multi-class-mode").classList.contains("ulabel-hidden"),
        );
        expect(hidden_after).toBe(false);

        const class_slider_count = await page.evaluate(() =>
            document.querySelectorAll("#confidence-slider-multi-class-mode .confidence-slider-input").length,
        );
        expect(class_slider_count).toBeGreaterThan(0);
    });

    test("get_confidence_slider_value includes per-class keys in per-class mode", async ({ page }) => {
        await wait_for_ulabel_init(page);

        await page.click("#confidence-slider-multi-checkbox");

        const value = await page.evaluate(() => window.ulabel.get_confidence_slider_value());

        expect(value).toHaveProperty("all");
        const class_keys = Object.keys(value).filter((key) => key !== "all");
        expect(class_keys.length).toBeGreaterThan(0);
    });
});
