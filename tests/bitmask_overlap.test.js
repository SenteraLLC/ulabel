// Browser-free tests for the bitmask overlap-resolution *semantics*.
// The real resolve_bitmask_overlap lives in the ESM entry (src/index.js), which jest doesn't
// transform, so here we replicate its exact per-mask steps using the real (importable) box-limited
// ULabelMask ops. This validates that those primitives compose into correct exclude/overwrite
// behavior and a lossless undo round-trip — the integrity the Phase 1 collision refactor relies on.
// (Full cross-subtask iteration + redraw wiring is covered by tests/e2e/bitmask.spec.js in CI.)
const { ULabelMask } = require("../build/mask_utils");

const W = 64;
const H = 64;

function rect_mask(x0, y0, x1, y1) {
    const mask = ULabelMask.create_empty(W, H);
    for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
            mask.set_pixel(x, y, 1);
        }
    }
    return mask;
}

// Mirror of ULabel.intersect_boxes: overlap of two {tlx,tly,brx,bry} boxes, or null if disjoint.
function intersect_boxes(a, b) {
    if (a == null || b == null) return null;
    const tlx = Math.max(a.tlx, b.tlx);
    const tly = Math.max(a.tly, b.tly);
    const brx = Math.min(a.brx, b.brx);
    const bry = Math.min(a.bry, b.bry);
    if (brx < tlx || bry < tly) return null;
    return { tlx: tlx, tly: tly, brx: brx, bry: bry };
}

describe("bitmask overlap semantics (mask level)", () => {
    test("overwrite carves the delta out of an overlapping mask, sparing the rest", () => {
        // active/delta rect [20..40], other rect [10..30] -> overlap [20..30]x[20..30]
        const other = rect_mask(10, 10, 30, 30);
        const delta = rect_mask(20, 20, 40, 40);

        const box = intersect_boxes(delta.get_bounding_box(), other.get_bounding_box());
        expect(box).not.toBeNull();
        expect(other.intersects_in_box(delta, box)).toBe(true);

        const before_rle = other.to_rle();
        other.subtract_in_box(delta, box);

        expect(other.get_pixel(25, 25)).toBe(0); // carved
        expect(other.get_pixel(12, 12)).toBe(1); // outside overlap: preserved

        // undo contract: restoring from before_rle reproduces the original exactly
        const restored = ULabelMask.from_rle(before_rle, false);
        const original = rect_mask(10, 10, 30, 30);
        expect(Array.from(restored.data)).toEqual(Array.from(original.data));
    });

    test("the bbox pre-filter skips a disjoint mask (no carve)", () => {
        const far = rect_mask(50, 50, 60, 60);
        const delta = rect_mask(20, 20, 40, 40);

        const box = intersect_boxes(delta.get_bounding_box(), far.get_bounding_box());
        expect(box).toBeNull(); // disjoint -> resolve would `continue` before touching pixels

        // Emulate the skip: far is left untouched
        expect(far.get_pixel(55, 55)).toBe(1);
    });

    test("overwrite that fully carves a mask leaves it empty (would be deprecated)", () => {
        const other = rect_mask(10, 10, 20, 20);
        const delta = rect_mask(0, 0, 63, 63);

        const box = intersect_boxes(delta.get_bounding_box(), other.get_bounding_box());
        other.subtract_in_box(delta, box);

        expect(other.is_empty()).toBe(true);
    });

    test("exclude clips the active mask where it overlaps another, leaving the other untouched", () => {
        const active = rect_mask(20, 20, 40, 40);
        const other = rect_mask(10, 10, 30, 30);
        const delta = rect_mask(20, 20, 40, 40); // the stroke-added pixels

        const other_before = other.to_rle();
        const box = intersect_boxes(delta.get_bounding_box(), other.get_bounding_box());
        active.subtract_intersection_in_box(delta, other, box);

        expect(active.get_pixel(25, 25)).toBe(0); // clipped where it overlapped "other"
        expect(active.get_pixel(35, 35)).toBe(1); // outside overlap: kept

        // exclude must not modify the other mask at all
        expect(Array.from(ULabelMask.from_rle(other.to_rle(), false).data))
            .toEqual(Array.from(ULabelMask.from_rle(other_before, false).data));
    });
});

// The candidate-collection gate: which subtasks' masks a stroke may interact with.
describe("brush overlap subtask scoping (get_other_bitmask_ids)", () => {
    const { ULabel } = require("./testing-utils/build_loader");

    const make_annotation = (id) => ({
        id,
        spatial_type: "bitmask",
        deprecated: false,
    });

    function make_two_subtask_ulabel(extra_config = {}) {
        const subtask = (name) => ({
            display_name: name,
            classes: [{ name: "Mask", id: 1, color: "green" }],
            allowed_modes: ["bitmask"],
            resume_from: null,
        });
        const ulabel = new ULabel({
            container_id: "container",
            image_data: "test.jpg",
            username: "test_user",
            submit_buttons: [{ name: "Submit", hook: jest.fn() }],
            subtasks: { a: subtask("A"), b: subtask("B") },
            ...extra_config,
        });
        ulabel.state.current_subtask = "a"; // normally set during init
        ulabel.subtasks.a.annotations = {
            access: { active: make_annotation("active"), same_st: make_annotation("same_st") },
            ordering: ["active", "same_st"],
        };
        ulabel.subtasks.b.annotations = {
            access: { other_st: make_annotation("other_st") },
            ordering: ["other_st"],
        };
        return ulabel;
    }

    test("defaults to masks in the active subtask only", () => {
        const ulabel = make_two_subtask_ulabel();

        expect(ulabel.get_other_bitmask_ids("active")).toEqual([
            { id: "same_st", subtask: "a" },
        ]);
    });

    test("brush_overlap_across_subtasks reaches other subtasks", () => {
        const ulabel = make_two_subtask_ulabel({ brush_overlap_across_subtasks: true });

        expect(ulabel.get_other_bitmask_ids("active")).toEqual([
            { id: "same_st", subtask: "a" },
            { id: "other_st", subtask: "b" },
        ]);
    });
});
