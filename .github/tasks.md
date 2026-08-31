## Tasks

Bitmask/segmentation viewer performance work, driven by the model-registry
integration. Items 1/3/4/5 touch this repo; item 2 is model-registry only.

- [x] 1. Cache the bitmask hover outline on the render object
  - `draw_bitmask` allocates a canvas and does 8 dilation blits on every draw
    while hovered. Cache on `_mask_render`, which already invalidates on mask
    version + color change.
- [x] 2. (model-registry) Drop `wrapperSize` from `viewerKey`
  - A container resize currently forces a full ULabel rebuild.
- [x] 3. Windowed `ULabelMask`
  - Store pixels for a sub-rectangle instead of the full frame, keeping the
    public API in image coordinates. Removes the `objects x width x height`
    memory bound, so model-registry can go back to one annotation per Encord
    object instead of one merged mask per class.
  - Accept an optional `box` on the raw payload so callers can hand over an
    already-cropped buffer with no copy.
  - Grow the window on paint so editing still works.
  - Verified in the browser on run #3: GT renders 99 separate objects on the
    densest item sampled (was 1 merged mask per class), item-to-item switching
    ~90 ms, heap flat around 1 GB with no OOM.
- [x] 4. Swap subtasks in place instead of rebuilding the instance
  - Add `replace_subtasks`, so a GT/Pred/Diff switch reuses the decoded image,
    listeners and toolbox rather than running `destroy()` + `init()`.
  - Only the annotation set can change: `replace_subtasks` returns `null` when
    the subtask shape (keys, allowed modes, class defs) differs, so the caller
    knows it still has to rebuild.
  - Verified in the browser on run #3: four consecutive confidence-threshold
    changes in pred mode produced zero rebuilds (previously one full
    `destroy()` + `init()` each). Mode switches on that run still rebuild
    because its GT `Row` class is a polyline while pred renders it as a
    bitmask, which is a genuine shape change.
- [x] 5. Decode RLE off the main thread
  - (model-registry) move `rleRecordToRawMask` into a worker and transfer the
    cropped buffers back.
  - Verified in the browser: GT still renders after the move, heap 193 MB on a
    fresh load, no page errors.


