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

    test("cross-subtask overlap only skips the active mask in the active subtask (same ID in another subtask is still carved)", async ({ page }) => {
        // process_resume_from only enforces ID uniqueness within a subtask, so two subtasks can
        // legitimately hold masks with the same id; the active-skip must be scoped by subtask.
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { make, rebuild, pix } = window.__mask_helpers(u);
            // Both subtasks have a mask with id "dup"; the one in "a" is active.
            await u.set_annotations([make("dup", 1, 20, 20, 40, 40)], "a");
            await u.set_annotations([make("dup", 2, 10, 10, 30, 30)], "b");
            rebuild("a", "dup");
            rebuild("b", "dup");

            u.set_subtask("a");
            u.subtasks["a"].state.active_id = "dup";
            const delta = u.get_bitmask(u.subtasks["a"].annotations.access["dup"]);
            u.resolve_bitmask_overlap("dup", delta, "overwrite");

            return {
                active_kept: pix("a", "dup", 35, 35), // active mask (subtask a) must be untouched
                other_carved: pix("b", "dup", 25, 25), // same-ID mask in subtask b must be carved
                other_kept: pix("b", "dup", 12, 12), // outside overlap: kept
            };
        });

        expect(res.active_kept).toBe(1);
        expect(res.other_carved).toBe(0);
        expect(res.other_kept).toBe(1);
    });

    test("overlap resolution skips masks that are not on the current frame", async ({ page }) => {
        // draw_annotation_from_id gates rendering by frame, so carving off-frame (invisible)
        // masks would be a user-visible inconsistency.
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { make, rebuild, pix } = window.__mask_helpers(u);
            await u.set_annotations([make("active", 1, 20, 20, 40, 40)], "a");
            await u.set_annotations([make("other", 2, 10, 10, 30, 30)], "b");
            rebuild("a", "active");
            rebuild("b", "other");
            // Move the other mask to a different frame than the stroke.
            u.subtasks["b"].annotations.access["other"].frame = 3;
            u.state.current_frame = 0;

            u.set_subtask("a");
            u.subtasks["a"].state.active_id = "active";
            const delta = u.get_bitmask(u.subtasks["a"].annotations.access["active"]);
            const edits = u.resolve_bitmask_overlap("active", delta, "overwrite");

            return {
                edits_count: edits.length,
                other_kept: pix("b", "other", 25, 25), // off-frame mask is untouched
            };
        });

        expect(res.edits_count).toBe(0);
        expect(res.other_kept).toBe(1);
    });

    test("overwrite treats read-only subtasks as barriers: they are not mutated, and the active mask is clipped around them", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { make, rebuild, pix } = window.__mask_helpers(u);
            await u.set_annotations([make("active", 1, 20, 20, 40, 40)], "a");
            await u.set_annotations([make("ro", 2, 10, 10, 30, 30)], "b");
            rebuild("a", "active");
            rebuild("b", "ro");
            u.subtasks["b"].read_only = true;

            u.set_subtask("a");
            u.subtasks["a"].state.active_id = "active";
            const delta = u.get_bitmask(u.subtasks["a"].annotations.access["active"]);
            const edits = u.resolve_bitmask_overlap("active", delta, "overwrite");

            return {
                edits_count: edits.length, // no other_edits: read-only was not mutated
                ro_kept_in_overlap: pix("b", "ro", 25, 25), // barrier: read-only mask untouched
                ro_kept_outside: pix("b", "ro", 12, 12), // outside overlap: untouched
                active_clipped_in_overlap: pix("a", "active", 25, 25), // clipped where it hit the barrier
                active_kept_outside: pix("a", "active", 35, 35), // outside overlap: kept
            };
        });

        expect(res.edits_count).toBe(0);
        expect(res.ro_kept_in_overlap).toBe(1);
        expect(res.ro_kept_outside).toBe(1);
        expect(res.active_clipped_in_overlap).toBe(0);
        expect(res.active_kept_outside).toBe(1);
    });
});

// End-to-end coverage for the bitmask move bounce-back:
//   - a move that would push any pixel outside the image is rejected (mask unchanged)
//   - the rejected move is popped off the action stream, so subsequent undo/redo is a no-op
//   - a valid move round-trips cleanly through undo and redo
test.describe("Bitmask move bounce-back", () => {
    // Simulate begin_move: push the begin_move action and prime state/drag_state/overlay.
    // A no-op object works here — finish_move only reads clientX/clientY.
    async function setup_move(page, tlx, tly, brx, bry) {
        await page.evaluate(async (box) => {
            const u = window.ulabel;
            const { make, rebuild } = window.__mask_helpers(u);
            await u.set_annotations([make("m", 1, box.tlx, box.tly, box.brx, box.bry)], "a");
            rebuild("a", "m");
            u.set_subtask("a");

            const st = u.subtasks.a;
            st.actions.stream = [];
            st.actions.undone_stack = [];
            st.state.active_id = "m";
            st.state.is_in_move = true;
            u.state.zoom_val = 1.0;
            u.state.current_frame = 0;
            u.drag_state.move.mouse_start = [100, 100, 0];

            st.actions.stream.push({
                act_type: "begin_move",
                annotation_id: "m",
                frame: 0,
                undo_payload: JSON.stringify({ diffX: 0, diffY: 0, diffZ: 0 }),
                redo_payload: JSON.stringify({ diffX: 0, diffY: 0, diffZ: 0, finished: false, move_not_allowed: false }),
                prev_timestamp: null,
                prev_user: "test",
            });
            u.begin_bitmask_move("m", "a");
        }, { tlx, tly, brx, bry });
    }

    test("out-of-bounds move is rejected: mask stays put and action is popped off the stream", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");
        // Mask hugs the left edge; a -50px shift would drop pixels off-image.
        await setup_move(page, 0, 0, 10, 10);

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { pix } = window.__mask_helpers(u);

            u.finish_move({ clientX: 50, clientY: 100 });

            const st = u.subtasks.a;
            return {
                pixel_at_5_5: pix("a", "m", 5, 5),
                cbox: JSON.parse(JSON.stringify(u.subtasks.a.annotations.access.m.containing_box)),
                is_in_move: st.state.is_in_move,
                active_id: st.state.active_id,
                stream_len: st.actions.stream.length,
                undone_len: st.actions.undone_stack.length,
                overlay_cleared: u.state.bitmask_move_overlay == null,
            };
        });

        expect(res.pixel_at_5_5).toBe(1);
        expect(res.cbox).toEqual({ tlx: 0, tly: 0, brx: 10, bry: 10 });
        expect(res.is_in_move).toBe(false);
        expect(res.active_id).toBeNull();
        expect(res.stream_len).toBe(0);
        expect(res.undone_len).toBe(1);
        expect(res.overlay_cleared).toBe(true);
    });

    test("undo after a bounce-back does not move the mask", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");
        await setup_move(page, 0, 0, 10, 10);

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { pix } = window.__mask_helpers(u);

            u.finish_move({ clientX: 50, clientY: 100 });
            u.undo();
            u.redo();

            return {
                pixel_at_5_5: pix("a", "m", 5, 5),
                pixel_at_0_0: pix("a", "m", 0, 0),
                pixel_at_10_10: pix("a", "m", 10, 10),
                cbox: JSON.parse(JSON.stringify(u.subtasks.a.annotations.access.m.containing_box)),
            };
        });

        expect(res.pixel_at_5_5).toBe(1);
        expect(res.pixel_at_0_0).toBe(1);
        expect(res.pixel_at_10_10).toBe(1);
        expect(res.cbox).toEqual({ tlx: 0, tly: 0, brx: 10, bry: 10 });
    });

    test("valid move round-trips through undo and redo", async ({ page }) => {
        await wait_for_ulabel_init(page, "/bitmask-e2e.html");
        // Mask well inside the image so a +5px shift is safe.
        await setup_move(page, 10, 10, 20, 20);

        const res = await page.evaluate(async () => {
            const u = window.ulabel;
            const { pix } = window.__mask_helpers(u);

            // +5 px in X: (10..20, 10..20) -> (15..25, 10..20)
            u.finish_move({ clientX: 105, clientY: 100 });
            const after_move = {
                orig_edge_empty: pix("a", "m", 10, 15),
                new_edge_full: pix("a", "m", 25, 15),
                cbox: JSON.parse(JSON.stringify(u.subtasks.a.annotations.access.m.containing_box)),
            };

            u.undo();
            const after_undo = {
                orig_edge_full: pix("a", "m", 10, 15),
                new_edge_empty: pix("a", "m", 25, 15),
                cbox: JSON.parse(JSON.stringify(u.subtasks.a.annotations.access.m.containing_box)),
            };

            u.redo();
            const after_redo = {
                orig_edge_empty: pix("a", "m", 10, 15),
                new_edge_full: pix("a", "m", 25, 15),
                cbox: JSON.parse(JSON.stringify(u.subtasks.a.annotations.access.m.containing_box)),
            };

            return { after_move, after_undo, after_redo };
        });

        expect(res.after_move.orig_edge_empty).toBe(0);
        expect(res.after_move.new_edge_full).toBe(1);
        expect(res.after_move.cbox).toEqual({ tlx: 15, tly: 10, brx: 25, bry: 20 });

        expect(res.after_undo.orig_edge_full).toBe(1);
        expect(res.after_undo.new_edge_empty).toBe(0);
        expect(res.after_undo.cbox).toEqual({ tlx: 10, tly: 10, brx: 20, bry: 20 });

        expect(res.after_redo.orig_edge_empty).toBe(0);
        expect(res.after_redo.new_edge_full).toBe(1);
        expect(res.after_redo.cbox).toEqual({ tlx: 15, tly: 10, brx: 25, bry: 20 });
    });
});
