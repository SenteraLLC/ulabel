// Tests for bitmask (raster segmentation) mask utilities
const { ULabelMask } = require("../build/mask_utils");

describe("ULabelMask", () => {
    describe("construction", () => {
        test("creates an empty mask of the right size", () => {
            const mask = ULabelMask.create_empty(4, 3);
            expect(mask.width).toBe(4);
            expect(mask.height).toBe(3);
            expect(mask.data.length).toBe(12);
            expect(mask.is_empty()).toBe(true);
        });

        test("throws when provided data length mismatches dimensions", () => {
            expect(() => new ULabelMask(2, 2, new Uint8Array(3))).toThrow();
        });
    });

    describe("get/set pixel", () => {
        test("sets and gets pixels", () => {
            const mask = ULabelMask.create_empty(4, 4);
            mask.set_pixel(1, 2, 1);
            expect(mask.get_pixel(1, 2)).toBe(1);
            expect(mask.get_pixel(0, 0)).toBe(0);
            expect(mask.is_empty()).toBe(false);
        });

        test("ignores out-of-bounds writes and reads", () => {
            const mask = ULabelMask.create_empty(2, 2);
            mask.set_pixel(-1, 0, 1);
            mask.set_pixel(5, 5, 1);
            expect(mask.is_empty()).toBe(true);
            expect(mask.get_pixel(-1, 0)).toBe(0);
            expect(mask.get_pixel(10, 10)).toBe(0);
        });
    });

    describe("paint_circle", () => {
        test("paints a filled circle and reports change", () => {
            const mask = ULabelMask.create_empty(11, 11);
            const changed = mask.paint_circle(5, 5, 2, 1);
            expect(changed).toBe(true);
            expect(mask.get_pixel(5, 5)).toBe(1);
            expect(mask.get_pixel(5, 7)).toBe(1);
            // Corner should be outside the radius-2 circle
            expect(mask.get_pixel(0, 0)).toBe(0);
        });

        test("erasing clears previously painted pixels", () => {
            const mask = ULabelMask.create_empty(11, 11);
            mask.paint_circle(5, 5, 3, 1);
            expect(mask.get_pixel(5, 5)).toBe(1);
            const changed = mask.paint_circle(5, 5, 3, 0);
            expect(changed).toBe(true);
            expect(mask.get_pixel(5, 5)).toBe(0);
            expect(mask.is_empty()).toBe(true);
        });

        test("returns false when nothing changes", () => {
            const mask = ULabelMask.create_empty(11, 11);
            const changed = mask.paint_circle(5, 5, 2, 0);
            expect(changed).toBe(false);
        });
    });

    describe("bounding box", () => {
        test("returns null for empty mask", () => {
            const mask = ULabelMask.create_empty(4, 4);
            expect(mask.get_bounding_box()).toBeNull();
        });

        test("returns tight box around foreground", () => {
            const mask = ULabelMask.create_empty(6, 6);
            mask.set_pixel(2, 1, 1);
            mask.set_pixel(4, 3, 1);
            expect(mask.get_bounding_box()).toEqual({ tlx: 2, tly: 1, brx: 4, bry: 3 });
        });
    });

    describe("translate", () => {
        test("shifts foreground pixels by the given offset", () => {
            const mask = ULabelMask.create_empty(6, 6);
            mask.set_pixel(1, 1, 1);
            const shifted = mask.translate(2, 3);
            expect(shifted.get_pixel(1, 1)).toBe(0);
            expect(shifted.get_pixel(3, 4)).toBe(1);
        });

        test("drops pixels shifted outside the image", () => {
            const mask = ULabelMask.create_empty(4, 4);
            mask.set_pixel(0, 0, 1);
            const shifted = mask.translate(-1, -1);
            expect(shifted.is_empty()).toBe(true);
        });

        test("rounds fractional offsets", () => {
            const mask = ULabelMask.create_empty(6, 6);
            mask.set_pixel(2, 2, 1);
            const shifted = mask.translate(1.4, -0.6);
            expect(shifted.get_pixel(3, 1)).toBe(1);
        });
    });

    describe("RLE round-trip", () => {
        test("encodes an empty mask as a single background run", () => {
            const mask = ULabelMask.create_empty(3, 2);
            const rle = mask.to_rle();
            expect(rle.size).toEqual([2, 3]);
            expect(rle.counts).toEqual([6]);
        });

        test("round-trips a mask with foreground pixels", () => {
            const mask = ULabelMask.create_empty(5, 4);
            mask.paint_circle(2, 2, 2, 1);
            mask.set_pixel(0, 0, 1);
            const rle = mask.to_rle();
            const restored = ULabelMask.from_rle(rle);
            expect(restored.width).toBe(5);
            expect(restored.height).toBe(4);
            expect(Array.from(restored.data)).toEqual(Array.from(mask.data));
        });

        test("leading foreground pixel produces a leading zero count", () => {
            const mask = ULabelMask.create_empty(2, 2);
            // Column-major order visits (0,0) first
            mask.set_pixel(0, 0, 1);
            const rle = mask.to_rle();
            expect(rle.counts[0]).toBe(0);
            const restored = ULabelMask.from_rle(rle);
            expect(Array.from(restored.data)).toEqual(Array.from(mask.data));
        });

        test("round-trips a fully-filled mask", () => {
            const mask = ULabelMask.create_empty(3, 3);
            for (let i = 0; i < mask.data.length; i++) {
                mask.data[i] = 1;
            }
            const rle = mask.to_rle();
            const restored = ULabelMask.from_rle(rle);
            expect(Array.from(restored.data)).toEqual(Array.from(mask.data));
        });

        test("survives a JSON serialization round-trip (export/import contract)", () => {
            const mask = ULabelMask.create_empty(8, 6);
            mask.paint_circle(4, 3, 2, 1);
            mask.set_pixel(0, 0, 1);
            mask.set_pixel(7, 5, 1);

            // Emulate how a bitmask annotation is serialized: spatial_payload holds the RLE
            const annotation = { spatial_type: "bitmask", spatial_payload: mask.to_rle() };
            const exported = JSON.parse(JSON.stringify(annotation));

            expect(exported.spatial_payload.size).toEqual([6, 8]);
            const restored = ULabelMask.from_rle(exported.spatial_payload);
            expect(Array.from(restored.data)).toEqual(Array.from(mask.data));
        });
    });

    describe("boolean operations", () => {
        test("clone produces an independent copy", () => {
            const mask = ULabelMask.create_empty(4, 4);
            mask.set_pixel(1, 1, 1);
            const copy = mask.clone();
            copy.set_pixel(2, 2, 1);
            expect(mask.get_pixel(2, 2)).toBe(0);
            expect(copy.get_pixel(1, 1)).toBe(1);
        });

        test("subtract removes the other mask's pixels and reports change", () => {
            const a = ULabelMask.create_empty(4, 4);
            a.set_pixel(1, 1, 1);
            a.set_pixel(2, 2, 1);
            const b = ULabelMask.create_empty(4, 4);
            b.set_pixel(2, 2, 1);
            const changed = a.subtract(b);
            expect(changed).toBe(true);
            expect(a.get_pixel(1, 1)).toBe(1);
            expect(a.get_pixel(2, 2)).toBe(0);
        });

        test("subtract returns false when nothing overlaps", () => {
            const a = ULabelMask.create_empty(4, 4);
            a.set_pixel(0, 0, 1);
            const b = ULabelMask.create_empty(4, 4);
            b.set_pixel(3, 3, 1);
            expect(a.subtract(b)).toBe(false);
            expect(a.get_pixel(0, 0)).toBe(1);
        });

        test("add_mask unions the other mask in", () => {
            const a = ULabelMask.create_empty(4, 4);
            a.set_pixel(0, 0, 1);
            const b = ULabelMask.create_empty(4, 4);
            b.set_pixel(3, 3, 1);
            a.add_mask(b);
            expect(a.get_pixel(0, 0)).toBe(1);
            expect(a.get_pixel(3, 3)).toBe(1);
        });

        test("intersect keeps only shared pixels", () => {
            const a = ULabelMask.create_empty(4, 4);
            a.set_pixel(1, 1, 1);
            a.set_pixel(2, 2, 1);
            const b = ULabelMask.create_empty(4, 4);
            b.set_pixel(2, 2, 1);
            b.set_pixel(3, 3, 1);
            a.intersect(b);
            expect(a.get_pixel(1, 1)).toBe(0);
            expect(a.get_pixel(2, 2)).toBe(1);
            expect(a.get_pixel(3, 3)).toBe(0);
        });

        test("intersects detects any shared pixel", () => {
            const a = ULabelMask.create_empty(4, 4);
            a.set_pixel(1, 1, 1);
            const b = ULabelMask.create_empty(4, 4);
            b.set_pixel(1, 1, 1);
            const c = ULabelMask.create_empty(4, 4);
            c.set_pixel(3, 3, 1);
            expect(a.intersects(b)).toBe(true);
            expect(a.intersects(c)).toBe(false);
        });

        test("boolean ops throw on dimension mismatch", () => {
            const a = ULabelMask.create_empty(4, 4);
            const b = ULabelMask.create_empty(5, 4);
            expect(() => a.subtract(b)).toThrow();
        });
    });

    describe("subtract_polygon", () => {
        test("erases foreground pixels inside a simple polygon", () => {
            const mask = ULabelMask.create_empty(10, 10);
            // Fill a 4x4 block from (2,2) to (5,5)
            for (let y = 2; y <= 5; y++) {
                for (let x = 2; x <= 5; x++) {
                    mask.set_pixel(x, y, 1);
                }
            }
            // Delete polygon covering the block's lower-right quadrant
            const polygon = [[3, 3], [6, 3], [6, 6], [3, 6], [3, 3]];
            const changed = mask.subtract_polygon(polygon);
            expect(changed).toBe(true);
            // Inside the delete polygon: erased
            expect(mask.get_pixel(4, 4)).toBe(0);
            expect(mask.get_pixel(5, 5)).toBe(0);
            // Outside the delete polygon: preserved
            expect(mask.get_pixel(2, 2)).toBe(1);
            expect(mask.get_pixel(2, 5)).toBe(1);
        });

        test("returns false when the polygon covers no foreground", () => {
            const mask = ULabelMask.create_empty(10, 10);
            mask.set_pixel(1, 1, 1);
            const polygon = [[5, 5], [8, 5], [8, 8], [5, 8], [5, 5]];
            expect(mask.subtract_polygon(polygon)).toBe(false);
            expect(mask.get_pixel(1, 1)).toBe(1);
        });

        test("can erase an entire mask", () => {
            const mask = ULabelMask.create_empty(6, 6);
            mask.set_pixel(2, 2, 1);
            mask.set_pixel(3, 3, 1);
            // Polygon covering the whole image
            const polygon = [[-1, -1], [7, -1], [7, 7], [-1, 7], [-1, -1]];
            expect(mask.subtract_polygon(polygon)).toBe(true);
            expect(mask.is_empty()).toBe(true);
        });

        test("returns false for a degenerate polygon", () => {
            const mask = ULabelMask.create_empty(6, 6);
            mask.set_pixel(2, 2, 1);
            expect(mask.subtract_polygon([[2, 2], [3, 2]])).toBe(false);
            expect(mask.get_pixel(2, 2)).toBe(1);
        });
    });

    describe("RLE validation", () => {
        // A valid 2x2 mask: one background pixel then three foreground
        const valid = { counts: [1, 3], size: [2, 2] };

        test("accepts a well-formed payload", () => {
            expect(() => ULabelMask.validate_rle(valid)).not.toThrow();
            expect(() => ULabelMask.from_rle(valid)).not.toThrow();
        });

        test("rejects a non-object payload", () => {
            expect(() => ULabelMask.validate_rle(null)).toThrow();
            expect(() => ULabelMask.validate_rle(42)).toThrow();
            expect(() => ULabelMask.from_rle(null)).toThrow();
        });

        test("rejects a malformed size", () => {
            expect(() => ULabelMask.validate_rle({ counts: [4], size: [2] })).toThrow();
            expect(() => ULabelMask.validate_rle({ counts: [4], size: [2, -2] })).toThrow();
            expect(() => ULabelMask.validate_rle({ counts: [4], size: [2, 2.5] })).toThrow();
            expect(() => ULabelMask.validate_rle({ counts: [4], size: "2x2" })).toThrow();
        });

        test("rejects non-array counts", () => {
            expect(() => ULabelMask.validate_rle({ counts: 4, size: [2, 2] })).toThrow();
        });

        test("rejects negative run lengths", () => {
            expect(() => ULabelMask.validate_rle({ counts: [-1, 5], size: [2, 2] })).toThrow();
            expect(() => ULabelMask.from_rle({ counts: [-1, 5], size: [2, 2] })).toThrow();
        });

        test("rejects non-integer run lengths", () => {
            expect(() => ULabelMask.validate_rle({ counts: [1.5, 2.5], size: [2, 2] })).toThrow();
            expect(() => ULabelMask.from_rle({ counts: [1.5, 2.5], size: [2, 2] })).toThrow();
        });

        test("rejects counts that under-run the mask size", () => {
            expect(() => ULabelMask.validate_rle({ counts: [1, 1], size: [2, 2] })).toThrow();
            expect(() => ULabelMask.from_rle({ counts: [1, 1], size: [2, 2] })).toThrow();
        });

        test("rejects counts that over-run the mask size", () => {
            expect(() => ULabelMask.validate_rle({ counts: [1, 99], size: [2, 2] })).toThrow();
            expect(() => ULabelMask.from_rle({ counts: [1, 99], size: [2, 2] })).toThrow();
        });
    });

    describe("raw payload validation and construction", () => {
        test("from_raw wraps a matching Uint8Array and copies by default", () => {
            const data = new Uint8Array([1, 0, 1, 1]);
            const mask = ULabelMask.from_raw({ data, size: [2, 2] });
            expect(mask.width).toBe(2);
            expect(mask.height).toBe(2);
            expect(Array.from(mask.data)).toEqual([1, 0, 1, 1]);

            // Default is copy: mutating the source doesn't affect the mask.
            data[0] = 0;
            expect(mask.data[0]).toBe(1);
        });

        test("from_raw with copy=false references the caller's buffer", () => {
            const data = new Uint8Array([0, 0, 0, 0]);
            const mask = ULabelMask.from_raw({ data, size: [2, 2] }, true, false);
            data[0] = 1;
            expect(mask.data[0]).toBe(1);
        });

        test("validate_raw rejects wrong-length buffers", () => {
            expect(() => ULabelMask.validate_raw({ data: new Uint8Array(3), size: [2, 2] })).toThrow();
        });

        test("validate_raw rejects non-typed-array data", () => {
            expect(() => ULabelMask.validate_raw({ data: [1, 0, 1, 0], size: [2, 2] })).toThrow();
        });

        test("validate_raw rejects a malformed size", () => {
            expect(() => ULabelMask.validate_raw({ data: new Uint8Array(4), size: [2] })).toThrow();
            expect(() => ULabelMask.validate_raw({ data: new Uint8Array(4), size: "2x2" })).toThrow();
        });
    });

    describe("box-limited boolean operations", () => {
        // Build a mask and set the given [x, y] pixels.
        const make = (w, h, pts) => {
            const m = ULabelMask.create_empty(w, h);
            for (const [x, y] of pts) m.set_pixel(x, y, 1);
            return m;
        };
        const full_box = (m) => ({ tlx: 0, tly: 0, brx: m.width - 1, bry: m.height - 1 });

        test("intersects_in_box only counts shared pixels inside the box", () => {
            const a = make(8, 8, [[1, 1], [5, 5]]);
            const b = make(8, 8, [[1, 1], [5, 5]]);
            expect(a.intersects_in_box(b, { tlx: 0, tly: 0, brx: 2, bry: 2 })).toBe(true);
            expect(a.intersects_in_box(b, { tlx: 6, tly: 6, brx: 7, bry: 7 })).toBe(false);
        });

        test("intersects_in_box ignores shared pixels outside the box", () => {
            const a = make(8, 8, [[5, 5]]);
            const b = make(8, 8, [[5, 5]]);
            expect(a.intersects_in_box(b, { tlx: 0, tly: 0, brx: 3, bry: 3 })).toBe(false);
            expect(a.intersects_in_box(b, { tlx: 4, tly: 4, brx: 6, bry: 6 })).toBe(true);
        });

        test("intersects_in_box clamps the box to the image", () => {
            const a = make(4, 4, [[3, 3]]);
            const b = make(4, 4, [[3, 3]]);
            expect(a.intersects_in_box(b, { tlx: 2, tly: 2, brx: 100, bry: 100 })).toBe(true);
        });

        test("subtract_in_box removes only pixels within the box", () => {
            const a = make(8, 8, [[1, 1], [6, 6]]);
            const b = make(8, 8, [[1, 1], [6, 6]]);
            const changed = a.subtract_in_box(b, { tlx: 0, tly: 0, brx: 3, bry: 3 });
            expect(changed).toBe(true);
            expect(a.get_pixel(1, 1)).toBe(0); // inside box: removed
            expect(a.get_pixel(6, 6)).toBe(1); // outside box: preserved
        });

        test("subtract_in_box returns false when the box has no shared pixels", () => {
            const a = make(8, 8, [[1, 1]]);
            const b = make(8, 8, [[6, 6]]);
            expect(a.subtract_in_box(b, full_box(a))).toBe(false);
            expect(a.subtract_in_box(b, { tlx: 5, tly: 5, brx: 7, bry: 7 })).toBe(false);
        });

        test("subtract_intersection_in_box clears pixels set in both a and b within the box", () => {
            const target = make(8, 8, [[1, 1], [2, 2], [6, 6]]);
            const a = make(8, 8, [[1, 1], [2, 2], [6, 6]]);
            const b = make(8, 8, [[2, 2], [6, 6]]);
            const changed = target.subtract_intersection_in_box(a, b, { tlx: 0, tly: 0, brx: 4, bry: 4 });
            expect(changed).toBe(true);
            expect(target.get_pixel(2, 2)).toBe(0); // in a AND b, inside box: cleared
            expect(target.get_pixel(1, 1)).toBe(1); // not in b: preserved
            expect(target.get_pixel(6, 6)).toBe(1); // in a AND b but outside box: preserved
        });

        test("subtract_in_box over the full image matches subtract (optimization equivalence)", () => {
            const pts_a = [[1, 1], [2, 2], [3, 4], [5, 5], [6, 2]];
            const pts_b = [[2, 2], [3, 4], [7, 7], [5, 5]];
            const a1 = make(8, 8, pts_a);
            const a2 = make(8, 8, pts_a);
            const b = make(8, 8, pts_b);
            a1.subtract(b);
            a2.subtract_in_box(b, full_box(a2));
            expect(Array.from(a2.data)).toEqual(Array.from(a1.data));
        });

        test("subtract_in_box over the overlap box matches subtract (box pre-filter equivalence)", () => {
            // subtract only affects pixels set in both, which lie inside both bounding boxes;
            // restricting to that overlap box must not change the result.
            const pts_a = [[1, 1], [2, 2], [3, 3], [5, 6]];
            const pts_b = [[2, 2], [3, 3], [6, 6]];
            const a1 = make(8, 8, pts_a);
            const a2 = make(8, 8, pts_a);
            const b = make(8, 8, pts_b);
            a1.subtract(b);
            a2.subtract_in_box(b, { tlx: 2, tly: 2, brx: 6, bry: 6 });
            expect(Array.from(a2.data)).toEqual(Array.from(a1.data));
        });

        test("subtract_intersection_in_box over the full image matches clone+intersect+subtract", () => {
            // Old exclude path: to_remove = delta ∩ other; active.subtract(to_remove).
            const pts_active = [[1, 1], [2, 2], [3, 3], [4, 4]];
            const pts_delta = [[2, 2], [3, 3], [4, 4]];
            const pts_other = [[3, 3], [4, 4], [7, 7]];
            const expected = make(8, 8, pts_active);
            const delta = make(8, 8, pts_delta);
            const other = make(8, 8, pts_other);
            const to_remove = delta.clone();
            to_remove.intersect(other);
            expected.subtract(to_remove);

            const actual = make(8, 8, pts_active);
            actual.subtract_intersection_in_box(delta, other, full_box(actual));
            expect(Array.from(actual.data)).toEqual(Array.from(expected.data));
        });

        test("box-limited ops throw on dimension mismatch", () => {
            const a = ULabelMask.create_empty(4, 4);
            const b = ULabelMask.create_empty(5, 4);
            const box = { tlx: 0, tly: 0, brx: 3, bry: 3 };
            expect(() => a.intersects_in_box(b, box)).toThrow();
            expect(() => a.subtract_in_box(b, box)).toThrow();
        });
    });

    describe("mutation version counter", () => {
        test("starts at 0 and is bumped by mutating methods", () => {
            const a = ULabelMask.create_empty(8, 8);
            expect(a.version).toBe(0);

            a.set_pixel(1, 1, 1);
            expect(a.version).toBe(1);

            a.paint_circle(4, 4, 2, 1);
            expect(a.version).toBe(2);

            const b = ULabelMask.create_empty(8, 8);
            b.set_pixel(1, 1, 1);
            a.subtract(b);
            expect(a.version).toBe(3);

            a.add_mask(b);
            expect(a.version).toBe(4);

            a.intersect(b);
            expect(a.version).toBe(5);

            a.subtract_in_box(b, { tlx: 0, tly: 0, brx: 7, bry: 7 });
            expect(a.version).toBe(6);

            a.subtract_intersection_in_box(b, b, { tlx: 0, tly: 0, brx: 7, bry: 7 });
            expect(a.version).toBe(7);
        });

        test("read-only ops and out-of-bounds writes do not bump the version", () => {
            const a = ULabelMask.create_empty(8, 8);
            a.set_pixel(2, 2, 1);
            const v = a.version;

            a.get_pixel(2, 2);
            a.is_empty();
            a.get_bounding_box();
            a.to_rle();
            a.clone();
            const b = ULabelMask.create_empty(8, 8);
            a.intersects(b);
            a.set_pixel(-1, -1, 1); // out of bounds: no write

            expect(a.version).toBe(v);
        });

        test("clone starts its own version at 0", () => {
            const a = ULabelMask.create_empty(4, 4);
            a.set_pixel(1, 1, 1);
            a.set_pixel(2, 2, 1);
            expect(a.version).toBe(2);
            expect(a.clone().version).toBe(0);
        });
    });
});
