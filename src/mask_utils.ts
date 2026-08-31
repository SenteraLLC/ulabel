// Utilities for raster "bitmask" segmentation annotations.
//
// A bitmask annotation covers a per-pixel binary occupancy grid the size of the
// image, but pixels are only *stored* for a sub-rectangle of it -- the mask's
// "window". Everything outside the window is background by definition. The
// public API is entirely in image coordinates, so callers never see the window;
// it exists so memory scales with the area an annotation actually covers rather
// than with the image, which is what lets a frame hold hundreds of objects.
//
// Within the window the grid is a row-major Uint8Array (values 0 or 1). For
// serialization it is encoded as COCO-style, column-major run-length counts over
// the full image, so the wire format is unchanged.

// COCO-style run-length encoding of a binary mask.
// - counts: alternating run lengths (in column-major / Fortran order) that always
//   start with a background (0) run. A leading foreground pixel is represented by
//   a leading count of 0.
// - size: [height, width], matching COCO's convention.
export type ULabelMaskPayload = {
    counts: number[];
    size: [number, number];
};

// Raw pixel-buffer form of a bitmask payload. Row-major, one byte per pixel
// (non-zero = foreground). `size` is [height, width] of the *image*, to match
// ULabelMaskPayload. Accepted as an alternative to the RLE form on load; callers
// that already have the mask as a Uint8Array avoid the encode-then-decode
// round-trip.
//
// If `box` is given, `data` covers only that inclusive image-space rectangle
// (row stride `brx - tlx + 1`) rather than the whole image, and is adopted as the
// mask's window as-is. Producing a cropped payload is the cheapest way to import
// a dense frame: nothing full-size is ever allocated.
export type ULabelRawMaskPayload = {
    data: Uint8Array;
    size: [number, number];
    box?: BoundingBox;
};

// Duck-type check for a bounding box of integer bounds.
function is_bounding_box(box: unknown): box is BoundingBox {
    if (box === null || typeof box !== "object") return false;
    const b = box as Record<string, unknown>;
    for (const key of ["tlx", "tly", "brx", "bry"]) {
        if (typeof b[key] !== "number" || !Number.isInteger(b[key])) return false;
    }
    return true;
}

// Duck-type check for the raw payload shape.
export function is_raw_mask_payload(payload: unknown): payload is ULabelRawMaskPayload {
    if (payload === null || typeof payload !== "object") return false;
    const p = payload as { data?: unknown; size?: unknown; box?: unknown };
    if (!(p.data instanceof Uint8Array) && !(p.data instanceof Uint8ClampedArray)) return false;
    if (!Array.isArray(p.size) || p.size.length !== 2) return false;
    if (p.box !== undefined && !is_bounding_box(p.box)) return false;
    return Number.isInteger(p.size[0]) && Number.isInteger(p.size[1]);
}

// Axis-aligned bounding box in image pixel coordinates (inclusive bounds).
export type BoundingBox = {
    tlx: number;
    tly: number;
    brx: number;
    bry: number;
};

// Clamp a value into the inclusive integer range [min, max].
function clamp_int(value: number, min: number, max: number): number {
    const rounded = Math.round(value);
    if (rounded < min) return min;
    if (rounded > max) return max;
    return rounded;
}

export class ULabelMask {
    // Stored pixels for the window only; length is window_width * window_height.
    public data: Uint8Array;
    // Full image dimensions -- the mask's coordinate space, not its allocation.
    public readonly width: number;
    public readonly height: number;
    // Bumped by every mutating method so render caches can detect changes by comparison.
    public version: number = 0;

    // Window origin and extent, in image coordinates. A zero-area window means the
    // mask is entirely background and holds no buffer.
    private win_x: number = 0;
    private win_y: number = 0;
    private win_w: number = 0;
    private win_h: number = 0;

    // `data` without `box` is treated as a full-frame buffer, preserving the
    // original constructor contract. With `box`, `data` covers just that
    // rectangle. With neither, the mask starts empty and grows as it is painted.
    constructor(width: number, height: number, data?: Uint8Array, box?: BoundingBox) {
        this.width = width;
        this.height = height;

        if (data === undefined) {
            this.data = new Uint8Array(0);
            return;
        }

        if (box === undefined) {
            if (data.length !== width * height) {
                throw new Error(
                    `Mask data length ${data.length} does not match dimensions ${width}x${height}`,
                );
            }
            this.win_w = width;
            this.win_h = height;
            this.data = data;
            return;
        }

        const win_w = box.brx - box.tlx + 1;
        const win_h = box.bry - box.tly + 1;
        if (data.length !== win_w * win_h) {
            throw new Error(
                `Mask data length ${data.length} does not match window ${win_w}x${win_h}`,
            );
        }
        if (box.tlx < 0 || box.tly < 0 || box.brx >= width || box.bry >= height) {
            throw new Error(
                `Mask window [${box.tlx}, ${box.tly}, ${box.brx}, ${box.bry}] lies outside ${width}x${height}`,
            );
        }
        this.win_x = box.tlx;
        this.win_y = box.tly;
        this.win_w = win_w;
        this.win_h = win_h;
        this.data = data;
    }

    // Create an empty (all-background) mask. Allocates nothing until painted.
    public static create_empty(width: number, height: number): ULabelMask {
        return new ULabelMask(width, height);
    }

    public get window_x(): number {
        return this.win_x;
    }

    public get window_y(): number {
        return this.win_y;
    }

    public get window_width(): number {
        return this.win_w;
    }

    public get window_height(): number {
        return this.win_h;
    }

    // The window as an inclusive image-space box, or null if the mask is empty.
    // Renderers use this to walk `data` directly instead of probing get_pixel.
    public get_window_box(): BoundingBox | null {
        if (this.win_w === 0 || this.win_h === 0) return null;
        return {
            tlx: this.win_x,
            tly: this.win_y,
            brx: this.win_x + this.win_w - 1,
            bry: this.win_y + this.win_h - 1,
        };
    }

    // Index into `data` for an image coordinate, or -1 if outside the window.
    private idx(x: number, y: number): number {
        const lx = x - this.win_x;
        const ly = y - this.win_y;
        if (lx < 0 || ly < 0 || lx >= this.win_w || ly >= this.win_h) return -1;
        return ly * this.win_w + lx;
    }

    // Grow the window so it contains `box` (clamped to the image), reallocating and
    // copying existing rows across. No-op when already covered.
    private ensure_window(box: BoundingBox): void {
        const tlx = Math.max(0, Math.floor(box.tlx));
        const tly = Math.max(0, Math.floor(box.tly));
        const brx = Math.min(this.width - 1, Math.ceil(box.brx));
        const bry = Math.min(this.height - 1, Math.ceil(box.bry));
        if (brx < tlx || bry < tly) return;

        if (this.win_w === 0 || this.win_h === 0) {
            this.win_x = tlx;
            this.win_y = tly;
            this.win_w = brx - tlx + 1;
            this.win_h = bry - tly + 1;
            this.data = new Uint8Array(this.win_w * this.win_h);
            return;
        }

        const cur_brx = this.win_x + this.win_w - 1;
        const cur_bry = this.win_y + this.win_h - 1;
        if (tlx >= this.win_x && tly >= this.win_y && brx <= cur_brx && bry <= cur_bry) return;

        const new_x = Math.min(this.win_x, tlx);
        const new_y = Math.min(this.win_y, tly);
        const new_w = Math.max(cur_brx, brx) - new_x + 1;
        const new_h = Math.max(cur_bry, bry) - new_y + 1;
        const grown = new Uint8Array(new_w * new_h);
        const row_offset = this.win_x - new_x;
        for (let ly = 0; ly < this.win_h; ly++) {
            const src = ly * this.win_w;
            const dst = (ly + this.win_y - new_y) * new_w + row_offset;
            grown.set(this.data.subarray(src, src + this.win_w), dst);
        }
        this.win_x = new_x;
        this.win_y = new_y;
        this.win_w = new_w;
        this.win_h = new_h;
        this.data = grown;
    }

    public get_pixel(x: number, y: number): number {
        const i = this.idx(x, y);
        return i < 0 ? 0 : this.data[i];
    }

    public set_pixel(x: number, y: number, value: number): void {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return;
        }
        this.version++;
        if (value) {
            this.ensure_window({ tlx: x, tly: y, brx: x, bry: y });
        }
        const i = this.idx(x, y);
        // Erasing outside the window is already a no-op
        if (i < 0) return;
        this.data[i] = value ? 1 : 0;
    }

    // Paint (value = 1) or erase (value = 0) a filled circle into the mask.
    // Returns true if any pixel changed.
    public paint_circle(cx: number, cy: number, radius: number, value: number): boolean {
        this.version++;
        const v = value ? 1 : 0;
        const r = Math.max(0, radius);
        const min_x = clamp_int(cx - r, 0, this.width - 1);
        const max_x = clamp_int(cx + r, 0, this.width - 1);
        const min_y = clamp_int(cy - r, 0, this.height - 1);
        const max_y = clamp_int(cy + r, 0, this.height - 1);
        const circle_box = { tlx: min_x, tly: min_y, brx: max_x, bry: max_y };
        if (v === 1) {
            this.ensure_window(circle_box);
        }
        const b = this.clamp_box_to_window(circle_box);
        if (b === null) return false;
        const r_sq = r * r;
        let changed = false;
        for (let y = b.y0; y <= b.y1; y++) {
            const dy = y - cy;
            const row = (y - this.win_y) * this.win_w - this.win_x;
            for (let x = b.x0; x <= b.x1; x++) {
                const dx = x - cx;
                if (dx * dx + dy * dy <= r_sq) {
                    const idx = row + x;
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
        const b = this.clamp_box_to_window({
            tlx: clamp_int(cx - r, 0, this.width - 1),
            tly: clamp_int(cy - r, 0, this.height - 1),
            brx: clamp_int(cx + r, 0, this.width - 1),
            bry: clamp_int(cy + r, 0, this.height - 1),
        });
        if (b === null) return false;
        const r_sq = r * r;
        for (let y = b.y0; y <= b.y1; y++) {
            const dy = y - cy;
            const row = (y - this.win_y) * this.win_w - this.win_x;
            for (let x = b.x0; x <= b.x1; x++) {
                const dx = x - cx;
                if (dx * dx + dy * dy <= r_sq && this.data[row + x] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    // Axis-aligned bounding box of foreground pixels, or null if empty.
    // Returned as { tlx, tly, brx, bry } in image pixel coordinates.
    public get_bounding_box(): BoundingBox | null {
        let min_x = this.win_w;
        let min_y = this.win_h;
        let max_x = -1;
        let max_y = -1;
        for (let ly = 0; ly < this.win_h; ly++) {
            const row = ly * this.win_w;
            for (let lx = 0; lx < this.win_w; lx++) {
                if (this.data[row + lx] !== 0) {
                    if (lx < min_x) min_x = lx;
                    if (lx > max_x) max_x = lx;
                    if (ly < min_y) min_y = ly;
                    if (ly > max_y) max_y = ly;
                }
            }
        }
        if (max_x < 0) {
            return null;
        }
        return {
            tlx: min_x + this.win_x,
            tly: min_y + this.win_y,
            brx: max_x + this.win_x,
            bry: max_y + this.win_y,
        };
    }

    // Return a new mask with all foreground pixels shifted by (dx, dy) image pixels.
    // Pixels shifted outside the image are dropped.
    public translate(dx: number, dy: number): ULabelMask {
        const shifted = new ULabelMask(this.width, this.height);
        const box = this.get_window_box();
        if (box === null) return shifted;
        const idx = Math.round(dx);
        const idy = Math.round(dy);
        if (box.brx + idx < 0 || box.bry + idy < 0) return shifted;
        if (box.tlx + idx >= this.width || box.tly + idy >= this.height) return shifted;
        shifted.ensure_window({
            tlx: box.tlx + idx,
            tly: box.tly + idy,
            brx: box.brx + idx,
            bry: box.bry + idy,
        });
        for (let ly = 0; ly < this.win_h; ly++) {
            const ny = ly + this.win_y + idy;
            if (ny < 0 || ny >= this.height) continue;
            const src_row = ly * this.win_w;
            for (let lx = 0; lx < this.win_w; lx++) {
                if (this.data[src_row + lx] !== 0) {
                    const nx = lx + this.win_x + idx;
                    if (nx < 0 || nx >= this.width) continue;
                    const i = shifted.idx(nx, ny);
                    if (i >= 0) shifted.data[i] = 1;
                }
            }
        }
        return shifted;
    }

    // Return a copy of this mask, window and all.
    public clone(): ULabelMask {
        const box = this.get_window_box();
        if (box === null) return new ULabelMask(this.width, this.height);
        return new ULabelMask(this.width, this.height, this.data.slice(), box);
    }

    // Ensure another mask has the same dimensions as this one.
    private assert_same_dims(other: ULabelMask): void {
        if (other.width !== this.width || other.height !== this.height) {
            throw new Error(
                `Mask dimension mismatch: ${this.width}x${this.height} vs ${other.width}x${other.height}`,
            );
        }
    }

    // Clamp a box to the intersection of the image and this mask's window, returning
    // integer inclusive image-space bounds or null if empty.
    private clamp_box_to_window(box: BoundingBox): { x0: number; y0: number; x1: number; y1: number } | null {
        if (this.win_w === 0 || this.win_h === 0) return null;
        const x0 = Math.max(this.win_x, Math.floor(box.tlx));
        const y0 = Math.max(this.win_y, Math.floor(box.tly));
        const x1 = Math.min(this.win_x + this.win_w - 1, Math.ceil(box.brx));
        const y1 = Math.min(this.win_y + this.win_h - 1, Math.ceil(box.bry));
        if (x1 < x0 || y1 < y0) return null;
        return { x0, y0, x1, y1 };
    }

    // Inclusive image-space bounds covered by both masks' windows, or null.
    private window_overlap(other: ULabelMask): { x0: number; y0: number; x1: number; y1: number } | null {
        const box = other.get_window_box();
        if (box === null) return null;
        return this.clamp_box_to_window(box);
    }

    // Remove another mask's foreground from this one (this = this AND NOT other).
    // Returns true if any pixel changed.
    public subtract(other: ULabelMask): boolean {
        this.assert_same_dims(other);
        this.version++;
        const b = this.window_overlap(other);
        if (b === null) return false;
        let changed = false;
        for (let y = b.y0; y <= b.y1; y++) {
            const row = (y - this.win_y) * this.win_w - this.win_x;
            const other_row = (y - other.win_y) * other.win_w - other.win_x;
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.data[row + x] !== 0 && other.data[other_row + x] !== 0) {
                    this.data[row + x] = 0;
                    changed = true;
                }
            }
        }
        return changed;
    }

    // Erase (set to 0) every foreground pixel whose integer coordinate falls inside the
    // given simple polygon (a single ring of [x, y] image-space points). Uses an even-odd
    // scanline fill and only touches the polygon's vertical extent. Returns true if any
    // pixel changed. Used to apply ULabel's polygon/bbox delete modes to raster masks.
    public subtract_polygon(polygon: [number, number][]): boolean {
        if (polygon.length < 3) return false;
        if (this.win_w === 0 || this.win_h === 0) return false;
        this.version++;

        // Restrict work to the polygon's vertical extent, clamped to the window.
        let min_py = Infinity;
        let max_py = -Infinity;
        for (let i = 0; i < polygon.length; i++) {
            const py = polygon[i][1];
            if (py < min_py) min_py = py;
            if (py > max_py) max_py = py;
        }
        const y_start = Math.max(this.win_y, Math.ceil(min_py));
        const y_end = Math.min(this.win_y + this.win_h - 1, Math.floor(max_py));

        let changed = false;
        const n = polygon.length;
        const xs: number[] = [];
        for (let y = y_start; y <= y_end; y++) {
            // Collect x-intersections of polygon edges with the horizontal line at this row.
            xs.length = 0;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                const yi = polygon[i][1];
                const yj = polygon[j][1];
                if ((yi > y) !== (yj > y)) {
                    const xi = polygon[i][0];
                    const xj = polygon[j][0];
                    xs.push(xi + ((y - yi) / (yj - yi)) * (xj - xi));
                }
            }
            if (xs.length < 2) continue;
            xs.sort((a, b) => a - b);
            const row = (y - this.win_y) * this.win_w - this.win_x;
            for (let k = 0; k + 1 < xs.length; k += 2) {
                const x_start = Math.max(this.win_x, Math.ceil(xs[k]));
                const x_end = Math.min(this.win_x + this.win_w - 1, Math.floor(xs[k + 1]));
                for (let x = x_start; x <= x_end; x++) {
                    if (this.data[row + x] !== 0) {
                        this.data[row + x] = 0;
                        changed = true;
                    }
                }
            }
        }
        return changed;
    }

    // Add another mask's foreground into this one (this = this OR other).
    public add_mask(other: ULabelMask): void {
        this.assert_same_dims(other);
        this.version++;
        const other_box = other.get_window_box();
        if (other_box === null) return;
        this.ensure_window(other_box);
        const b = this.window_overlap(other);
        if (b === null) return;
        for (let y = b.y0; y <= b.y1; y++) {
            const row = (y - this.win_y) * this.win_w - this.win_x;
            const other_row = (y - other.win_y) * other.win_w - other.win_x;
            for (let x = b.x0; x <= b.x1; x++) {
                if (other.data[other_row + x] !== 0) {
                    this.data[row + x] = 1;
                }
            }
        }
    }

    // Keep only pixels present in both masks (this = this AND other).
    public intersect(other: ULabelMask): void {
        this.assert_same_dims(other);
        this.version++;
        const b = this.window_overlap(other);
        if (b === null) {
            this.data.fill(0);
            return;
        }
        const win_x1 = this.win_x + this.win_w - 1;
        for (let y = this.win_y; y <= this.win_y + this.win_h - 1; y++) {
            const row = (y - this.win_y) * this.win_w - this.win_x;
            // Rows the other mask doesn't reach are cleared wholesale.
            if (y < b.y0 || y > b.y1) {
                this.data.fill(0, row + this.win_x, row + win_x1 + 1);
                continue;
            }
            const other_row = (y - other.win_y) * other.win_w - other.win_x;
            for (let x = this.win_x; x <= win_x1; x++) {
                if (x < b.x0 || x > b.x1 || other.data[other_row + x] === 0) {
                    this.data[row + x] = 0;
                }
            }
        }
    }

    // True if this mask shares any foreground pixel with another.
    public intersects(other: ULabelMask): boolean {
        this.assert_same_dims(other);
        const b = this.window_overlap(other);
        if (b === null) return false;
        for (let y = b.y0; y <= b.y1; y++) {
            const row = (y - this.win_y) * this.win_w - this.win_x;
            const other_row = (y - other.win_y) * other.win_w - other.win_x;
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.data[row + x] !== 0 && other.data[other_row + x] !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    // Inclusive bounds covered by `box` and both masks' windows, or null.
    private overlap_in_box(other: ULabelMask, box: BoundingBox): { x0: number; y0: number; x1: number; y1: number } | null {
        const b = this.window_overlap(other);
        if (b === null) return null;
        const x0 = Math.max(b.x0, Math.floor(box.tlx));
        const y0 = Math.max(b.y0, Math.floor(box.tly));
        const x1 = Math.min(b.x1, Math.ceil(box.brx));
        const y1 = Math.min(b.y1, Math.ceil(box.bry));
        if (x1 < x0 || y1 < y0) return null;
        return { x0, y0, x1, y1 };
    }

    // True if any pixel within `box` is foreground in both masks. O(box area).
    public intersects_in_box(other: ULabelMask, box: BoundingBox): boolean {
        this.assert_same_dims(other);
        const b = this.overlap_in_box(other, box);
        if (b === null) return false;
        for (let y = b.y0; y <= b.y1; y++) {
            const row = (y - this.win_y) * this.win_w - this.win_x;
            const other_row = (y - other.win_y) * other.win_w - other.win_x;
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.data[row + x] !== 0 && other.data[other_row + x] !== 0) return true;
            }
        }
        return false;
    }

    // Remove another mask's foreground from this one within `box` (this = this AND NOT other).
    // Returns true if any pixel changed. O(box area).
    public subtract_in_box(other: ULabelMask, box: BoundingBox): boolean {
        this.assert_same_dims(other);
        const b = this.overlap_in_box(other, box);
        if (b === null) return false;
        this.version++;
        let changed = false;
        for (let y = b.y0; y <= b.y1; y++) {
            const row = (y - this.win_y) * this.win_w - this.win_x;
            const other_row = (y - other.win_y) * other.win_w - other.win_x;
            for (let x = b.x0; x <= b.x1; x++) {
                if (this.data[row + x] !== 0 && other.data[other_row + x] !== 0) {
                    this.data[row + x] = 0;
                    changed = true;
                }
            }
        }
        return changed;
    }

    // Clear pixels of this mask where both `a` and `b` are foreground, within `box`.
    // Returns true if any pixel changed. O(box area).
    public subtract_intersection_in_box(a: ULabelMask, b: ULabelMask, box: BoundingBox): boolean {
        this.assert_same_dims(a);
        this.assert_same_dims(b);
        const bounds = this.overlap_in_box(a, box);
        const b_box = b.get_window_box();
        if (bounds === null || b_box === null) return false;
        const x0 = Math.max(bounds.x0, b_box.tlx);
        const y0 = Math.max(bounds.y0, b_box.tly);
        const x1 = Math.min(bounds.x1, b_box.brx);
        const y1 = Math.min(bounds.y1, b_box.bry);
        if (x1 < x0 || y1 < y0) return false;
        this.version++;
        let changed = false;
        for (let y = y0; y <= y1; y++) {
            const row = (y - this.win_y) * this.win_w - this.win_x;
            const a_row = (y - a.win_y) * a.win_w - a.win_x;
            const b_row = (y - b.win_y) * b.win_w - b.win_x;
            for (let x = x0; x <= x1; x++) {
                if (this.data[row + x] !== 0 && a.data[a_row + x] !== 0 && b.data[b_row + x] !== 0) {
                    this.data[row + x] = 0;
                    changed = true;
                }
            }
        }
        return changed;
    }

    // Encode to COCO-style, column-major run-length counts over the full image.
    public to_rle(): ULabelMaskPayload {
        const counts: number[] = [];
        // Runs always start with background (0). Compare foreground-truthiness rather
        // than literal byte equality so raw imported payloads with any non-{0,1} values
        // (e.g. 0/255 masks, multi-valued upstream buffers) still encode correctly.
        let current_is_fg = false;
        let run = 0;
        const win_x1 = this.win_x + this.win_w;
        const win_y1 = this.win_y + this.win_h;
        for (let x = 0; x < this.width; x++) {
            // Columns outside the window are background end to end; skip the scan.
            if (x < this.win_x || x >= win_x1) {
                if (current_is_fg) {
                    counts.push(run);
                    current_is_fg = false;
                    run = this.height;
                } else {
                    run += this.height;
                }
                continue;
            }
            const col = x - this.win_x;
            for (let y = 0; y < this.height; y++) {
                const is_fg = y >= this.win_y && y < win_y1 &&
                    this.data[(y - this.win_y) * this.win_w + col] !== 0;
                if (is_fg === current_is_fg) {
                    run++;
                } else {
                    counts.push(run);
                    current_is_fg = is_fg;
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

    // Bounding box of the foreground implied by a column-major RLE, without decoding
    // it. Walks runs rather than pixels, so this is O(runs).
    private static rle_bounding_box(payload: ULabelMaskPayload): BoundingBox | null {
        const [height] = payload.size;
        if (height === 0) return null;
        let min_x = Infinity;
        let min_y = Infinity;
        let max_x = -1;
        let max_y = -1;
        let idx = 0;
        let value = 0;
        for (let c = 0; c < payload.counts.length; c++) {
            const run = payload.counts[c];
            if (value === 1 && run > 0) {
                const last = idx + run - 1;
                const first_x = Math.floor(idx / height);
                const last_x = Math.floor(last / height);
                if (first_x < min_x) min_x = first_x;
                if (last_x > max_x) max_x = last_x;
                if (last_x > first_x) {
                    // Crossing a column boundary means the run reaches the bottom of its
                    // first column and the top of its last, so it spans every row.
                    min_y = 0;
                    max_y = height - 1;
                } else {
                    const first_y = idx % height;
                    const last_y = last % height;
                    if (first_y < min_y) min_y = first_y;
                    if (last_y > max_y) max_y = last_y;
                }
            }
            idx += run;
            value = value === 0 ? 1 : 0;
        }
        if (max_x < 0) return null;
        return { tlx: min_x, tly: min_y, brx: max_x, bry: max_y };
    }

    // Decode a COCO-style RLE payload into a mask, allocating only the foreground's
    // bounding box rather than the whole frame.
    public static from_rle(payload: ULabelMaskPayload, validate: boolean = true): ULabelMask {
        if (validate) {
            ULabelMask.validate_rle(payload);
        }
        const [height, width] = payload.size;
        const box = ULabelMask.rle_bounding_box(payload);
        if (box === null) return new ULabelMask(width, height);

        const win_w = box.brx - box.tlx + 1;
        const data = new Uint8Array(win_w * (box.bry - box.tly + 1));
        const mask = new ULabelMask(width, height, data, box);
        let idx = 0; // column-major index
        let value = 0;
        for (let c = 0; c < payload.counts.length; c++) {
            const run = payload.counts[c];
            if (value === 1) {
                for (let k = 0; k < run; k++) {
                    const col_idx = idx + k;
                    const x = Math.floor(col_idx / height);
                    const y = col_idx % height;
                    data[(y - box.tly) * win_w + (x - box.tlx)] = 1;
                }
            }
            idx += run;
            value = value === 0 ? 1 : 0;
        }
        return mask;
    }

    // Validate a raw pixel-buffer payload before wrapping it in a mask.
    public static validate_raw(payload: unknown): void {
        if (!is_raw_mask_payload(payload)) {
            throw new Error("Invalid raw mask payload: expected { data: Uint8Array, size: [height, width] }");
        }
        const [height, width] = payload.size;
        if (height < 0 || width < 0) {
            throw new Error(`Invalid raw mask size: expected non-negative integers, got [${height}, ${width}]`);
        }
        if (payload.box !== undefined) {
            const box = payload.box;
            if (box.tlx < 0 || box.tly < 0 || box.brx >= width || box.bry >= height) {
                throw new Error(`Invalid raw mask box [${box.tlx}, ${box.tly}, ${box.brx}, ${box.bry}] for ${height}x${width}`);
            }
            const expected = (box.brx - box.tlx + 1) * (box.bry - box.tly + 1);
            if (payload.data.length !== expected) {
                throw new Error(`Invalid raw mask data length: expected ${expected} bytes for box, got ${payload.data.length}`);
            }
            return;
        }
        const expected = height * width;
        if (payload.data.length !== expected) {
            throw new Error(`Invalid raw mask data length: expected ${expected} bytes for ${height}x${width}, got ${payload.data.length}`);
        }
    }

    // Wrap a raw pixel-buffer payload as a ULabelMask.
    //
    // With `box`, the buffer is already cropped and is adopted as the window -- by
    // default copied so the caller can safely mutate their own array; pass
    // `copy: false` when the caller (e.g. process_resume_from) already copied.
    //
    // Without `box`, the buffer is full-frame and is cropped to its bounding box on
    // import, so the full-size allocation becomes garbage immediately instead of
    // being retained for the life of the annotation. `copy` is moot in that case;
    // the crop is always a fresh buffer.
    public static from_raw(payload: ULabelRawMaskPayload, validate: boolean = true, copy: boolean = true): ULabelMask {
        if (validate) {
            ULabelMask.validate_raw(payload);
        }
        const [height, width] = payload.size;

        if (payload.box !== undefined) {
            const data = copy ? new Uint8Array(payload.data) : payload.data;
            return new ULabelMask(width, height, data, payload.box);
        }

        const src = payload.data;
        let min_x = width;
        let min_y = height;
        let max_x = -1;
        let max_y = -1;
        for (let y = 0; y < height; y++) {
            const row = y * width;
            for (let x = 0; x < width; x++) {
                if (src[row + x] !== 0) {
                    if (x < min_x) min_x = x;
                    if (x > max_x) max_x = x;
                    if (y < min_y) min_y = y;
                    if (y > max_y) max_y = y;
                }
            }
        }
        if (max_x < 0) return new ULabelMask(width, height);

        const win_w = max_x - min_x + 1;
        const win_h = max_y - min_y + 1;
        const data = new Uint8Array(win_w * win_h);
        for (let y = 0; y < win_h; y++) {
            const src_start = (y + min_y) * width + min_x;
            data.set(src.subarray(src_start, src_start + win_w), y * win_w);
        }
        return new ULabelMask(width, height, data, {
            tlx: min_x,
            tly: min_y,
            brx: max_x,
            bry: max_y,
        });
    }
}
