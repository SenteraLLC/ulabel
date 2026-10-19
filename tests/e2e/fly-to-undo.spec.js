// End-to-end tests for fly_to_on_undo: undo/redo centers the view only when nothing it changed is in view
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

test.describe("fly to undo", () => {
    test.beforeEach(async ({ page }) => {
        await wait_for_ulabel_init(page);
    });

    const view = (page) => page.evaluate(() => {
        const u = window.ulabel;
        const annbox = document.getElementById(u.config.annbox_id);
        const scale = u.get_empirical_scale();
        return {
            zoom: u.state.zoom_val,
            cx: (annbox.scrollLeft + annbox.clientWidth / 2) / scale,
            cy: (annbox.scrollTop + annbox.clientHeight / 2) / scale,
        };
    });

    test("undo off screen centers on the change; undo in view leaves the view alone", async ({ page }) => {
        // A box near the bottom-right corner, then zoom into the top-left corner
        const box = await page.evaluate(() => {
            const u = window.ulabel;
            const w = u.config.image_width;
            const h = u.config.image_height;
            const box = [[w * 0.85, h * 0.85], [w * 0.95, h * 0.95]];
            u.create_annotation("bbox", box, "far");
            u.set_zoom_val(u.state.zoom_val * 8);
            u.rezoom(w * 0.05, h * 0.05, true);
            return box;
        });
        const zoomed = await view(page);

        await page.evaluate(() => window.ulabel.undo());
        const after_undo = await view(page);
        expect(after_undo.zoom).toBeCloseTo(zoomed.zoom);
        expect(after_undo.cx).toBeCloseTo((box[0][0] + box[1][0]) / 2, -1);
        expect(after_undo.cy).toBeCloseTo((box[0][1] + box[1][1]) / 2, -1);

        // The box is now in view: redo does not move the view
        await page.evaluate(() => window.ulabel.redo());
        expect(await view(page)).toEqual(after_undo);
    });

    test("does nothing with fly_to_on_undo off", async ({ page }) => {
        await page.evaluate(() => {
            const u = window.ulabel;
            u.config.fly_to_on_undo = false;
            const w = u.config.image_width;
            const h = u.config.image_height;
            u.create_annotation("bbox", [[w * 0.85, h * 0.85], [w * 0.95, h * 0.95]], "far");
            u.set_zoom_val(u.state.zoom_val * 8);
            u.rezoom(w * 0.05, h * 0.05, true);
        });
        const zoomed = await view(page);
        await page.evaluate(() => window.ulabel.undo());
        expect(await view(page)).toEqual(zoomed);
    });
});
