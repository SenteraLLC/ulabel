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



- [x] 10. Show every diff outcome at once, and keep the hover card off the annotation
  - (model-registry) Dropped the TP/FP/FN layer picker: diff mode now calls
    `set_active_class_layer(key, null, 1)` so all three outcome groups stay at
    full opacity. A null active layer is also what makes them all hover
    targets, since `get_edit_candidates` skips groups that aren't active.
    Passing the opacity explicitly matters: with no active class every group
    takes the `inactive_opacity` branch, so the default would dim all of them.
    The sidebar "Diff Colors" rows are now a legend plus recolor.
  - Added `annotation_display_name_resolver` to ULabel, alongside the existing
    color and canvas-group resolvers, so the hover card can name the diff
    outcome instead of the class. Every diff annotation carries the same class,
    which made the old class name useless there.
  - The hover card was anchored at the containing box's centre, so it covered
    whatever was under the cursor. It now clears the box by half its on-screen
    height plus a gap, flipping below only when there isn't room above.
    Offsets are divided by the dialog container's CSS scale (0.5 / 0.66666
    from `.global_edit_suggestion`), which otherwise halves them.
  - Verified in browser on eval run #3 item 503: `canvasses__diff` holds `fn`,
    `fp` and `tp` all at opacity 1, each is hover-targetable, the card reads
    "True Positive" / "False Negative", and it sits a 10 px gap above the
    hovered box in every sampled position. Lint clean in both repos.

- [x] 11. Hover on the annotation boundary, not its containing box
  - `get_edit_candidates` already hit-tests exactly (`get_pixel` for bitmasks,
    point-in-polygon for polygons), so this cost nothing extra. The stray
    hovers came from the fallback underneath: when nothing contains the
    cursor, it still picked the smallest annotation whose *containing box*
    was within `dst_thresh`. That fallback exists so you can grab an
    annotation to edit it, which a read-only subtask never needs.
  - Now skipped when the subtask is read-only and the spatial type has an
    exact test. Types without one (polyline, tbar, contour) keep the box
    fallback, so they stay hoverable.
  - Verified on run #3 item 503: across six probes the hover card appeared if
    and only if the cursor was over a painted mask pixel, comparing against
    the coordinates ULabel itself received. GT polylines still hover and read
    "Row". 166 unit tests pass.
