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
});
