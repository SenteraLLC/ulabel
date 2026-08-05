// Utilities for raster "bitmask" segmentation annotations.
//
// A bitmask annotation stores a per-pixel binary occupancy grid the size of the
// image. At runtime the grid is held as a row-major Uint8Array (values 0 or 1).
// For serialization it is encoded as COCO-style, column-major run-length counts.

// COCO-style run-length encoding of a binary mask.
// - counts: alternating run lengths (in column-major / Fortran order) that always
//   start with a background (0) run. A leading foreground pixel is represented by
//   a leading count of 0.
// - size: [height, width], matching COCO's convention.
export type ULabelMaskPayload = {
    counts: number[];
    size: [number, number];
};

// Clamp a value into the inclusive integer range [min, max].
function clamp_int(value: number, min: number, max: number): number {
    const rounded = Math.round(value);
    if (rounded < min) return min;
    if (rounded > max) return max;
    return rounded;
}

export class ULabelMask {
    public data: Uint8Array;
    public readonly width: number;
    public readonly height: number;

    constructor(width: number, height: number, data?: Uint8Array) {
        this.width = width;
        this.height = height;
        if (data !== undefined) {
            if (data.length !== width * height) {
                throw new Error(
                    `Mask data length ${data.length} does not match dimensions ${width}x${height}`,
                );
            }
            this.data = data;
        } else {
            this.data = new Uint8Array(width * height);
        }
    }

    // Create an empty (all-background) mask.
    public static create_empty(width: number, height: number): ULabelMask {
        return new ULabelMask(width, height);
    }

    public get_pixel(x: number, y: number): number {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return 0;
        }
        return this.data[y * this.width + x];
    }

    public set_pixel(x: number, y: number, value: number): void {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return;
        }
        this.data[y * this.width + x] = value ? 1 : 0;
    }

    // Paint (value = 1) or erase (value = 0) a filled circle into the mask.
    // Returns true if any pixel changed.
    public paint_circle(cx: number, cy: number, radius: number, value: number): boolean {
        const v = value ? 1 : 0;
        const r = Math.max(0, radius);
        const min_x = clamp_int(cx - r, 0, this.width - 1);
        const max_x = clamp_int(cx + r, 0, this.width - 1);
        const min_y = clamp_int(cy - r, 0, this.height - 1);
        const max_y = clamp_int(cy + r, 0, this.height - 1);
        const r_sq = r * r;
        let changed = false;
        for (let y = min_y; y <= max_y; y++) {
            const dy = y - cy;
            for (let x = min_x; x <= max_x; x++) {
                const dx = x - cx;
                if (dx * dx + dy * dy <= r_sq) {
                    const idx = y * this.width + x;
                    if (this.data[idx] !== v) {
                        this.data[idx] = v;
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }

    // True if the mask contains no foreground pixels.
    public is_empty(): boolean {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i] !== 0) return false;
        }
        return true;
    }

    // True if any foreground pixel lies within the given circle.
    public has_foreground_in_circle(cx: number, cy: number, radius: number): boolean {
        const r = Math.max(0, radius);
        const min_x = clamp_int(cx - r, 0, this.width - 1);
        const max_x = clamp_int(cx + r, 0, this.width - 1);
        const min_y = clamp_int(cy - r, 0, this.height - 1);
        const max_y = clamp_int(cy + r, 0, this.height - 1);
        const r_sq = r * r;
        for (let y = min_y; y <= max_y; y++) {
            const dy = y - cy;
            for (let x = min_x; x <= max_x; x++) {
                const dx = x - cx;
                if (dx * dx + dy * dy <= r_sq && this.data[y * this.width + x] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    // Axis-aligned bounding box of foreground pixels, or null if empty.
    // Returned as { tlx, tly, brx, bry } in image pixel coordinates.
    public get_bounding_box(): { tlx: number; tly: number; brx: number; bry: number } | null {
        let min_x = this.width;
        let min_y = this.height;
        let max_x = -1;
        let max_y = -1;
        for (let y = 0; y < this.height; y++) {
            const row = y * this.width;
            for (let x = 0; x < this.width; x++) {
                if (this.data[row + x] !== 0) {
                    if (x < min_x) min_x = x;
                    if (x > max_x) max_x = x;
                    if (y < min_y) min_y = y;
                    if (y > max_y) max_y = y;
                }
            }
        }
        if (max_x < 0) {
            return null;
        }
        return { tlx: min_x, tly: min_y, brx: max_x, bry: max_y };
    }

    // Return a new mask with all foreground pixels shifted by (dx, dy) image pixels.
    // Pixels shifted outside the image are dropped.
    public translate(dx: number, dy: number): ULabelMask {
        const shifted = new ULabelMask(this.width, this.height);
        const idx = Math.round(dx);
        const idy = Math.round(dy);
        for (let y = 0; y < this.height; y++) {
            const ny = y + idy;
            if (ny < 0 || ny >= this.height) continue;
            const src_row = y * this.width;
            const dst_row = ny * this.width;
            for (let x = 0; x < this.width; x++) {
                if (this.data[src_row + x] !== 0) {
                    const nx = x + idx;
                    if (nx < 0 || nx >= this.width) continue;
                    shifted.data[dst_row + nx] = 1;
                }
            }
        }
        return shifted;
    }

    // Return a copy of this mask.
    public clone(): ULabelMask {
        return new ULabelMask(this.width, this.height, this.data.slice());
    }

    // Ensure another mask has the same dimensions as this one.
    private assert_same_dims(other: ULabelMask): void {
        if (other.width !== this.width || other.height !== this.height) {
            throw new Error(
                `Mask dimension mismatch: ${this.width}x${this.height} vs ${other.width}x${other.height}`,
            );
        }
    }

    // Remove another mask's foreground from this one (this = this AND NOT other).
    // Returns true if any pixel changed.
    public subtract(other: ULabelMask): boolean {
        this.assert_same_dims(other);
        let changed = false;
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i] !== 0 && other.data[i] !== 0) {
                this.data[i] = 0;
                changed = true;
            }
        }
        return changed;
    }

    // Add another mask's foreground into this one (this = this OR other).
    public add_mask(other: ULabelMask): void {
        this.assert_same_dims(other);
        for (let i = 0; i < this.data.length; i++) {
            if (other.data[i] !== 0) {
                this.data[i] = 1;
            }
        }
    }

    // Keep only pixels present in both masks (this = this AND other).
    public intersect(other: ULabelMask): void {
        this.assert_same_dims(other);
        for (let i = 0; i < this.data.length; i++) {
            if (other.data[i] === 0) {
                this.data[i] = 0;
            }
        }
    }

    // True if this mask shares any foreground pixel with another.
    public intersects(other: ULabelMask): boolean {
        this.assert_same_dims(other);
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i] !== 0 && other.data[i] !== 0) {
                return true;
            }
        }
        return false;
    }

    // Encode to COCO-style, column-major run-length counts.
    public to_rle(): ULabelMaskPayload {
        const counts: number[] = [];
        let current = 0; // runs always start with background
        let run = 0;
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const value = this.data[y * this.width + x];
                if (value === current) {
                    run++;
                } else {
                    counts.push(run);
                    current = value;
                    run = 1;
                }
            }
        }
        counts.push(run);
        return {
            counts: counts,
            size: [this.height, this.width],
        };
    }

    // Validate a run-length payload before decoding. Throws with a descriptive
    // message on any malformed shape. Used to guard against corrupt/untrusted
    // imported (`resume_from`) data producing a silently partial mask.
    public static validate_rle(payload: unknown): void {
        if (payload === null || typeof payload !== "object") {
            throw new Error("Invalid RLE payload: expected an object with `counts` and `size`");
        }
        const p = payload as { size?: unknown; counts?: unknown };
        const size = p.size;
        if (
            !Array.isArray(size) ||
            size.length !== 2 ||
            !Number.isInteger(size[0]) ||
            !Number.isInteger(size[1]) ||
            size[0] < 0 ||
            size[1] < 0
        ) {
            throw new Error(`Invalid RLE size: expected [height, width] of non-negative integers, got ${JSON.stringify(size)}`);
        }
        const counts = p.counts;
        if (!Array.isArray(counts)) {
            throw new Error("Invalid RLE counts: expected an array of run lengths");
        }
        const total = size[0] * size[1];
        let sum = 0;
        for (let i = 0; i < counts.length; i++) {
            const run = counts[i];
            if (typeof run !== "number" || !Number.isInteger(run) || run < 0) {
                throw new Error(`Invalid RLE run length at index ${i}: expected a non-negative integer, got ${run}`);
            }
            sum += run;
        }
        if (sum !== total) {
            throw new Error(`Invalid RLE: run lengths sum to ${sum} but mask has ${total} pixels (${size[0]}x${size[1]})`);
        }
    }

    // Decode a COCO-style RLE payload into a mask.
    public static from_rle(payload: ULabelMaskPayload, validate: boolean = true): ULabelMask {
        if (validate) {
            ULabelMask.validate_rle(payload);
        }
        const [height, width] = payload.size;
        const mask = new ULabelMask(width, height);
        let idx = 0; // column-major index
        let value = 0;
        for (let c = 0; c < payload.counts.length; c++) {
            const run = payload.counts[c];
            if (value === 1) {
                for (let k = 0; k < run; k++) {
                    const col_idx = idx + k;
                    const x = Math.floor(col_idx / height);
                    const y = col_idx % height;
                    mask.data[y * width + x] = 1;
                }
            }
            idx += run;
            value = value === 0 ? 1 : 0;
        }
        return mask;
    }
}
