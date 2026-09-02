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

## Architecture: subtask per data set, class as class

The viewer models GT/Pred/Diff as *per-class* subtasks whose set changes with
the view mode, so a mode switch is a subtask-shape change and forces a rebuild.
Diff goes further and replaces the class with the outcome (`FP`/`FN`/`TP`), so
class identity is destroyed and "false negatives for Crop" is inexpressible.

Target: three fixed subtasks (`groundtruth`, `prediction`, `diff`), each with
the real class defs, present in every mode with only their annotations
swapping. Outcome moves to annotation metadata. This is also what diff-driven
groundtruth editing needs, since applying a diff region to a GT mask requires
both loaded together with class identity intact.

- [x] 6. Per-annotation color resolver
  - `get_annotation_color` looks up `color_info[class_id]`. Add an optional
    per-annotation hook so the diff subtask can color by outcome while keeping
    real classes. Every draw path already funnels through this one function.
  - Added `annotation_color_resolver` to `Configuration` and the constructor
    args. Returning `null` falls back to the class color, and the confidence
    gradient still applies either way.
- [x] 7. Class-aware annotation canvases
  - `get_next_available_canvas_id` packs annotations into the first non-full
    canvas regardless of class, and per-subtask opacity/z-index is what dims
    inactive layers today. Group canvases by class so the same CSS mechanism
    gives per-class dimming and bring-to-front once classes share a subtask.
  - Canvases now nest under a `div.class_canvasses` per class, and
    `set_active_class_layer(subtask, class_id, inactive_opacity)` mirrors
    `readjust_subtask_opacities` one level down. Verified: lint clean, 161
    jest tests and 102 Chromium e2e tests pass.
- [x] 8. `hidden_by` visibility map
  - Mirror the keyed composition of `deprecated_by` for view filtering.
    Separate from `deprecated`, which means "deleted" and is about to start
    flowing back to Encord.
  - Added `mark_hidden` plus a public `filter_annotations(hidden_by_key,
    should_hide, subtask, redraw)`. Keys compose, so class/outcome/confidence
    controls can be applied in any order. `hidden` gates drawing, edit
    candidates, and annotation navigation, and also skips bulk polygon delete
    so it can't remove something the user can't see. Export is untouched.
- [x] 9. (model-registry) Rebuild subtask construction on the new model
  - Three fixed subtasks, real class defs, `match_outcome` in
    `annotation_meta`, Encord object hash carried on GT annotations, and class
    chips driving filters rather than `set_subtask`.
  - `buildViewSubtasks` replaces `buildClassSubtasks`/`buildDiffSubtasks`: all
    three subtasks share one class list and one `allowed_modes` union derived
    from the ontology, so the subtask shape no longer changes with the data.
  - Diff layers by outcome instead of class, which class-keyed canvases alone
    could not express. Added `annotation_canvas_group_resolver` to ULabel and
    generalized `set_active_class_layer`'s `inactive_opacity` to accept a
    per-key map, preserving the old fn 0.6 / fp 0.6 / tp 0.4 dim values.
  - Sharing class ids across subtasks tripped ULabel's duplicate-id warning,
    which checked the global `valid_class_ids`. Scoped the check to duplicates
    within a subtask and made `valid_class_ids` a true set. Colors are written
    idempotently and `findAllClassDefinitions` already de-duplicates by id, so
    the confidence slider still shows one entry per class.
  - Verified in browser on eval run #3: all three modes paint with no console
    warnings; `canvasses__prediction` groups by class id (`0`/`1`/`2`) and
    `canvasses__diff` by outcome (`tp`/`fp`/`fn`), with the selected layer at
    opacity 1 / z-index 76 and the rest dimmed. GT shows polyline and bitmask
    classes together in one subtask. Lint clean, 166 jest tests pass.


