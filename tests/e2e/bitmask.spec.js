// End-to-end tests for bitmask overlap resolution and the move overlay.
// These cover the Phase 1 performance changes at the integration level (real ULabel + canvas):
//   - resolve_bitmask_overlap with the bbox pre-filter and cross-subtask reach
//   - exclude vs overwrite semantics
//   - cross-subtask undo restore of carved masks
//   - the bitmask move overlay lifecycle
// They run against demo/bitmask-e2e.html, a two-subtask bitmask fixture exposing window.ulabel.
import { test, expect } from "./fixtures";
import { wait_for_ulabel_init } from "../testing-utils/init_utils";

// Inject browser-side mask test helpers before any page script runs. `__mask_helpers(ulabel)`
// returns small builders scoped to the given ULabel instance.
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        window.__mask_helpers = (u) => {
            const W = u.config.image_width;
            const H = u.config.image_height;
            // COCO column-major RLE for a filled rectangle (matches ULabelMask.to_rle).
            const rect_rle = (x0, y0, x1, y1) => {
                const counts = [];
                let cur = 0;
                let run = 0;
                for (let x = 0; x < W; x++) {
                    for (let y = 0; y < H; y++) {
                        const v = (x >= x0 && x <= x1 && y >= y0 && y <= y1) ? 1 : 0;
                        if (v === cur) {
                            run++;
                        } else {
                            counts.push(run);
                            cur = v;
                            run = 1;
                        }
                    }
                }
                counts.push(run);
                return { counts: counts, size: [H, W] };
            };
            const make = (id, cid, x0, y0, x1, y1) => ({
                id: id,
                spatial_type: "bitmask",
                spatial_payload: rect_rle(x0, y0, x1, y1),
                classification_payloads: [{ class_id: cid, confidence: 1 }],
            });
            const rebuild = (st, id) => u.rebuild_bitmask_containing_box(u.subtasks[st].annotations.access[id]);
            const pix = (st, id, x, y) => u.get_bitmask(u.subtasks[st].annotations.access[id]).get_pixel(x, y);
            return { rect_rle: rect_rle, make: make, rebuild: rebuild, pix: pix };
        };
    });
});

test.describe("Bitmask overlap + move", () => {
    test("overwrite carves overlapping pixels from masks in other subtasks, sparing disjoint ones", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { make, rebuild, pix } = window.__mask_helpers(u);
            // active (subtask a) overlaps other (subtask b) in [20..30]x[20..30]; far is disjoint.
            await u.set_annotations([make("active", 1, 20, 20, 40, 40), make("far", 1, 50, 50, 60, 60)], "a");
            await u.set_annotations([make("other", 2, 10, 10, 30, 30)], "b");
            ["active", "far"].forEach((id) => rebuild("a", id));
            rebuild("b", "other");

            u.set_subtask("a");
            u.subtasks["a"].state.active_id = "active";
            const delta = u.get_bitmask(u.subtasks["a"].annotations.access["active"]);
            u.resolve_bitmask_overlap("active", delta, "overwrite");

            return {
                other_overlap: pix("b", "other", 25, 25), // carved -> 0
                other_kept: pix("b", "other", 12, 12), // outside overlap -> 1
                far_kept: pix("a", "far", 55, 55), // disjoint (bbox pre-filter) -> 1
                active_kept: pix("a", "active", 35, 35), // overwrite never touches active -> 1
            };
        });

        expect(res.other_overlap).toBe(0);
        expect(res.other_kept).toBe(1);
        expect(res.far_kept).toBe(1);
        expect(res.active_kept).toBe(1);
    });

    test("exclude clips the active mask and leaves other masks untouched", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { make, rebuild, pix } = window.__mask_helpers(u);
            await u.set_annotations([make("active", 1, 20, 20, 40, 40)], "a");
            await u.set_annotations([make("other", 2, 10, 10, 30, 30)], "b");
            rebuild("a", "active");
            rebuild("b", "other");

            u.set_subtask("a");
            u.subtasks["a"].state.active_id = "active";
            const delta = u.get_bitmask(u.subtasks["a"].annotations.access["active"]);
            u.resolve_bitmask_overlap("active", delta, "exclude");

            return {
                active_overlap: pix("a", "active", 25, 25), // clipped -> 0
                active_kept: pix("a", "active", 35, 35), // outside overlap -> 1
                other_untouched: pix("b", "other", 25, 25), // exclude never modifies others -> 1
            };
        });

        expect(res.active_overlap).toBe(0);
        expect(res.active_kept).toBe(1);
        expect(res.other_untouched).toBe(1);
    });

    test("undo restores a mask carved across subtasks", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { make, rebuild, pix } = window.__mask_helpers(u);
            await u.set_annotations([make("active", 1, 20, 20, 40, 40)], "a");
            await u.set_annotations([make("other", 2, 10, 10, 30, 30)], "b");
            rebuild("a", "active");
            rebuild("b", "other");

            u.set_subtask("a");
            u.subtasks["a"].state.active_id = "active";
            const active_ann = u.subtasks["a"].annotations.access["active"];
            const active_before = active_ann.spatial_payload;
            const delta = u.get_bitmask(active_ann);
            const other_edits = u.resolve_bitmask_overlap("active", delta, "overwrite");
            const carved = pix("b", "other", 25, 25); // 0

            // Reconstruct the stroke payload and undo it (cross-subtask restore path)
            u.bitmask_stroke__undo("active", {
                was_new: false,
                before_rle: active_before,
                after_rle: active_ann.spatial_payload,
                after_empty: false,
                other_edits: other_edits,
            });
            const restored = pix("b", "other", 25, 25); // 1

            return { carved: carved, restored: restored };
        });

        expect(res.carved).toBe(0);
        expect(res.restored).toBe(1);
    });

    test("bitmask move overlay snapshots and clears without corrupting state", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { make, rebuild, pix } = window.__mask_helpers(u);
            await u.set_annotations([make("m", 1, 10, 10, 30, 30)], "a");
            rebuild("a", "m");
            u.set_subtask("a");

            u.begin_bitmask_move("m", "a");
            const has_overlay = u.state.bitmask_move_overlay != null &&
                u.state.bitmask_move_overlay.snapshot != null;

            // Should render a frame without throwing
            u.render_bitmask_move("m", "a", { id: "m", diffX: 5, diffY: 5, diffZ: 0 });

            u.end_bitmask_move();
            const cleared = u.state.bitmask_move_overlay == null;

            // The mask data itself must be unchanged by the (rendering-only) overlay
            const still_present = pix("a", "m", 20, 20);

            return { has_overlay: has_overlay, cleared: cleared, still_present: still_present };
        });

        expect(res.has_overlay).toBe(true);
        expect(res.cleared).toBe(true);
        expect(res.still_present).toBe(1);
    });

    test("render cache is reused across redraws and rebuilt on edit / color change, but not on move offset", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { make, rebuild } = window.__mask_helpers(u);
            await u.set_annotations([make("m", 1, 10, 10, 30, 30)], "a");
            rebuild("a", "m");
            u.set_subtask("a");
            const ann = u.subtasks["a"].annotations.access["m"];

            // First draw builds the cache
            u.redraw_annotation("m", "a");
            const r1 = ann._mask_render;
            const created = r1 != null && r1.canvas != null;

            // Redraw with no changes reuses the same cached render object
            u.redraw_annotation("m", "a");
            const reused = ann._mask_render === r1;

            // Editing the mask bumps its version, which must rebuild the cache
            u.get_bitmask(ann).paint_circle(20, 20, 3, 1);
            rebuild("a", "m");
            u.redraw_annotation("m", "a");
            const r2 = ann._mask_render;
            const rebuilt_on_edit = r2 !== r1 && r2 != null && r2.version === u.get_bitmask(ann).version;

            // A color mismatch must rebuild the cache
            r2.color = "__stale__";
            u.redraw_annotation("m", "a");
            const rebuilt_on_color = ann._mask_render !== r2;

            // A move offset is applied at blit time and must NOT rebuild the cache
            const r3 = ann._mask_render;
            u.redraw_annotation("m", "a", { id: "m", diffX: 5, diffY: 5, diffZ: 0 });
            const reused_on_offset = ann._mask_render === r3;

            return {
                created: created,
                reused: reused,
                rebuilt_on_edit: rebuilt_on_edit,
                rebuilt_on_color: rebuilt_on_color,
                reused_on_offset: reused_on_offset,
            };
        });

        expect(res.created).toBe(true);
        expect(res.reused).toBe(true);
        expect(res.rebuilt_on_edit).toBe(true);
        expect(res.rebuilt_on_color).toBe(true);
        expect(res.reused_on_offset).toBe(true);
    });

    test("replacing a mask (undo/translate path) invalidates the render cache", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { make, rebuild } = window.__mask_helpers(u);
            await u.set_annotations([make("m", 1, 10, 10, 30, 30)], "a");
            rebuild("a", "m");
            u.set_subtask("a");
            const ann = u.subtasks["a"].annotations.access["m"];

            u.redraw_annotation("m", "a");
            const r1 = ann._mask_render;

            // set_bitmask_from_rle swaps the mask object (as undo/redo do) and must clear the cache
            u.set_bitmask_from_rle(ann, ann.spatial_payload);
            const cleared = ann._mask_render == null;

            rebuild("a", "m");
            u.redraw_annotation("m", "a");
            const rebuilt = ann._mask_render != null && ann._mask_render !== r1;

            return { cleared: cleared, rebuilt: rebuilt };
        });

        expect(res.cleared).toBe(true);
        expect(res.rebuilt).toBe(true);
    });
});
