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

## Plan: subtask-per-class + subtask-per-outcome architecture

Supersedes the "three fixed subtasks" model (items 4/6/7/8/9 above). For a job
with classes {crop, weed, row}: subtasks `crop`/`weed`/`row` hold GT *or* pred
annotations (swapped on mode change), plus fixed `tp`/`fp`/`fn` subtasks for
diff whose class defs are the *real* classes. Rationale (from design review):

- Per-class fly-to in gt/pred and per-outcome fly-to in diff fall out of
  ULabel's existing subtask-scoped `fly_to_next_annotation` — no new nav code.
- "FN for crop" = crop class inside the `fn` subtask; `ClassCounter` on `fn`
  shows per-class FN counts natively. No `match_outcome` metadata.
- Subtask keys are stable across items/modes/thresholds (they change only with
  the ontology), so annotation swaps never hit a shape change.
- `viewerKey` in model-registry already encodes the shape, making ULabel-side
  shape checking redundant; per-subtask memos + reference equality in the
  frontend make ULabel-side staleness diffing redundant.

Sequencing: 1.1 and 1.4 remove API the current frontend still calls, so those
removals ship in a ULabel version that model-registry adopts in the same PR as
its Phase 3 migration (frontend stays pinned until then).

### Phase 0 - confidence card positioning (in progress)

- [x] 0.1 Fix card geometry: include the card's natural flow offset
  (`offsetTop - margin`) and hug the button ring (`button_half + gap`) in
  both modes; read-only keeps ring flow space via `visibility: hidden`, so
  the card lands in the same spot with or without buttons.
- [x] 0.2 Rewrite the two failing e2e specs to assert flip geometry (card vs
  anchor) instead of the old literal `-9.5em`/`-1em` margins.
- [ ] 0.3 Missing card tests (gaps found in audit):
  - read-only parity: same annotation, `read_only` toggled, card rect equal
    (protects the visibility-preserves-flow invariant)
  - ring proximity upper bound: card bottom within
    `button_half * scale + gap + slack` of the anchor (the "too high" bug
    passes the current >=5px assertions)
  - single-class demo variant: card position at the 0.666 dialog scale
    (only the 0.5 mcm path is exercised today)

### Phase 1 - ULabel removals (this repo)

- [x] 1.1 Remove `replace_subtasks`, `_subtask_shape_matches`,
  `_subtask_annotations_unchanged` and their `index.d.ts` entries.
  `set_annotations` becomes the single swap path. (Also moots the mid-yield
  destroy return-value bug and the `config.subtasks` retention concern from
  the branch review.) No tests to delete (browser-verified only); add a
  regression test for the frontend's pattern: N sequential per-subtask
  `set_annotations` swaps on a live instance.
- [x] 1.2 Add `skip_toolbox_update = false` param to `set_annotations` so the
  frontend can batch N per-subtask swaps with one `update_filter_distance` +
  toolbox redraw at the end (expose a small `refresh_toolbox()` if needed).
  Unit tests: flag suppresses toolbox/filter updates; `refresh_toolbox()`
  triggers them once.
- [x] 1.3 Remove the dead `hidden` machinery: `hidden`/`hidden_by` fields,
  `mark_hidden`, `filter_annotations`, `HiddenBy`/`ValidHiddenBy` types, and
  the gates in draw / suggest_edits / fly_to / nav toast / bulk delete.
  No consumer exists (verified in model-registry) and the new architecture
  covers visibility with subtask structure + vanish + layer dimming.
- [x] 1.4 Remove all three resolvers (`annotation_color_resolver`,
  `annotation_canvas_group_resolver`, `annotation_display_name_resolver`).
  Every subtask is single-class with its own id, color, and name (outcome
  subtasks are literally named "True Positive" etc., so the hover card reads
  the same through the plain class-name path). (Class-grouped canvases +
  `set_active_class_layer` were initially kept, then removed in 2.3.)
- [x] 1.5 Remove the per-subtask back canvas. VERIFIED vestigial: write-only
  since the first commit (Nov 2020) - assigned at init, nulled in destroy,
  zero draw calls ever; all rendering targets front/annotation/demo contexts
  and the image is an `<img>`. Not in README/api_spec/index.d.ts; no id
  references in tests, demos, or model-registry; all src selectors touching
  it are class-based (no positional/stacking assumptions).
  IMPLEMENTED: element creation, `canvas_bid_pfx`,
  `subtask.canvas_bid`, `state.back_context` (init/destroy/types), test
  fixtures, and stale comments removed; breaking-change CHANGELOG entry added.
  - [x] Local validation: lint + build + 166 jest pass

### Phase 2 - ULabel changes (this repo)

- [x] 2.1 `ClassCounter` options (config `class_counter_toolbox_item` + a
  runtime setter, since view mode lives in the host):
  - `subtasks: string[] | "current"` - which subtasks to count
  - `layout: "current" | "grouped" | "flat"`
  ClassCounter has zero tests today - backfill current behavior (per-class
  counts, deprecated skipped) alongside the new options.
- [x] 2.2 Public `set_class_color(class_id, color, redraw = true)`: writes
  `color_info`, syncs the toolbox swatch + id-dialog pie, optional redraw.
  Refactor `RecolorActive.update_color` (private, does the same steps by
  hand) to call it; add to `index.d.ts`. Replaces raw `color_info` mutation
  in model-registry's recolor effect, which currently skips the pie sync.
  Unit tests: color_info write, swatch/pie sync, redraw flag both ways.
- [x] 2.3 Remove `set_active_class_layer` and class-grouped canvases entirely
  (supersedes the 1.4 "keep" decision). With every subtask single-class
  (3.4), a subtask has exactly one canvas group, so within-subtask layer
  dimming has nothing to act on; class visibility is expressed with subtasks
  (vanish / `readjust_subtask_opacities`). Removes: the method + 
  `active_class_layer` state and its `get_edit_candidates` gate, the
  `div.class_canvasses` wrappers + CSS, `class_key` bookkeeping in
  `annotation_contexts`, `get_canvas_class_key` / `get_class_canvasses_id` /
  `get_annotation_canvas_group`, the class_id params on the canvas-creation
  path, and the `index.d.ts` entries. Recoverable from git history if a
  multi-class subtask ever returns.

### Phase 3 - model-registry

- [x] 3.1 `buildViewSubtasks` -> per-class specs (single real class each,
  narrow allowed_modes) + `tp`/`fp`/`fn` specs (single outcome class each,
  per 3.4). Keys derived from the run-selection label union via
  `classSubtaskKeys` (slugified, deduped, never colliding with outcome keys).
- [x] 3.2 Replace the monolithic `subtasks` memo with per-subtask annotation
  memos; push changes via `set_annotations(annos, key, skip_toolbox_update)`
  per changed subtask (annotation-id signature diff in `UlabelCanvas`, since
  ids are content-derived), final `refresh_toolbox()`.
- [x] 3.3 Mode switch: gt<->pred swaps class-subtask annotations; diff mode
  swaps outcome-subtask annotations. Explicit vanish proved unnecessary:
  fetching is mode-gated, so the non-active mode's subtasks are swapped to
  empty and render nothing. Inactive-subtask dimming keeps the old 0.4 for
  class subtasks; outcome subtasks carry `inactive_opacity: 1` so all three
  outcomes stay at full opacity (preserves item 10's behavior).
- [x] 3.4 Outcome subtasks are single-class (TP=0, FP=1, FN=2 fixed ids
  first; real classes at 3..N+2), colors from `useDiffColors`. Dropped
  `match_outcome` metadata, `outcomeOf`, and all resolver usage; the hover
  card names outcomes through the plain class-name path.
- [x] 3.5 Dropped `color` from the `viewerKey` shape (keys/ids/names/modes
  kept). Recolor effect rewritten on `set_class_color` (2.2): registry
  classes by name, outcome classes by fixed id -> `useDiffColors`; batched
  with `redraw = false` + one final `redraw_all_annotations()`.
- [x] 3.6 Class chips: gt/pred -> `set_subtask(class_key)`; diff -> chip-driven
  annotation swap (only the active class's outcomes are loaded, per 3.4).
  The Diff Colors legend rows additionally select the current *outcome*
  subtask, scoping hover + Tab navigation (hover is subtask-scoped now).
  ClassCounter runs `layout: "flat"` over class subtasks in gt/pred and over
  outcome subtasks in diff via `set_class_counter_options`.
- [x] 3.7 Kept: ConfidenceSlider flow as-is (hidden DOM sliders driven from
  the sidebar; latent-FN filter override untouched; per-class slider ids and
  `default_values` moved to the 3..N+2 range with `target_class_ids` so
  outcome classes never get sliders), segmentation threshold scrubs as
  per-subtask swaps (only stale subtasks re-import via the signature diff).

### Verification

- [ ] V1 ULabel: lint + jest + e2e green after each phase; each item above
  carries its own test additions (0.3, 1.1, 1.2, 2.1-2.3).
- [ ] V2 model-registry on eval run #3: mode switches produce zero rebuilds;
  threshold scrub swaps only affected subtasks; Tab cycles within
  class (gt/pred) and outcome (diff); FN-per-class counts visible; heap
  comparable to the 3-subtask baseline after back-canvas removal.



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

## Plan: three fixed subtasks, outcome as class, filter as subtask state

Supersedes the subtask-per-class + subtask-per-outcome plan (phases 0-3).
Branch `three-fixed-subtasks`, cut from `cropped-bitmasks-prepare`.

The viewer slices three ways - source (GT / a run's predictions), class, and
diff outcome - but ULabel has two structural slots (subtask, class within
subtask). Every layout so far is a different way of cramming three into two:

- Per-class subtasks whose set changed with the mode (pre-256), so every mode
  switch was a `destroy()` + `init()`: flicker, and zoom lost.
- Three fixed subtasks with outcome in `annotation_meta` (256). The diff
  subtask told ULabel its annotations were crops and used resolvers to draw
  them as FPs, so `ClassCounter`, the confidence slider, the colour swatch and
  the id dialog all disagreed with the canvas.
- One subtask per class plus `tp`/`fp`/`fn` (257). Every subtask is
  single-class, so `single_class_mode` disables the reclassify pie, force-
  overwrites `classification_payloads` after edits, fragments undo into N
  stacks, and scopes hover to the pre-selected class. Subtask count grows
  with the ontology.

Target - three subtasks, fixed at construction, never rebuilt:

| key | classes | ids | read_only | contents |
| --- | --- | --- | --- | --- |
| `groundtruth` | all real classes | 3..N+2 | no | GT; never swapped |
| `prediction` | all real classes | 3..N+2 | yes | selected run's predictions |
| `diff` | TP / FP / FN | 0/1/2 | yes | diff(GT, run), filtered class |

Why this shape:

- `groundtruth` is multi-class, so `single_class_mode` stays false: the
  reclassify pie works, undo is one stream, and any annotation is grabbable
  without first selecting its class. Every layout except 256 failed this, and
  it is the whole point of editing in ULabel rather than a viewer.
- `diff`'s classes *are* the outcomes, so colour, `ClassCounter`, the id
  dialog and the hover card agree with the canvas through the plain class
  path. No resolvers, no `match_outcome`.
- `groundtruth` is never swapped, because `actions.stream` points into it.
  Everything else is read-only, so swapping there costs nothing.
- Diff is always GT vs one run, never run vs run, so one `prediction` and one
  `diff` slot suffice. Switching runs swaps their contents at fixed zoom - a
  blink comparator, which beats side-by-side for spotting differences.
- Three image-sized front canvases regardless of ontology size, which settles
  the V2 memory question instead of leaving it assumed.

Class focus becomes subtask *state*, not structure and not a per-annotation
flag. State survives `set_annotations`, so swapped-in annotations are filtered
the moment they land - the bug `layerEpoch` existed to paper over - and
changing the filter is a field write rather than a pass over every annotation.
Do not call it "active class": `get_active_class_id` already means the class
assigned to newly drawn annotations.

### Phase 4 - ULabel: filtering and layer control

- [x] 4.1 `state.class_filter: number | null` plus
  `set_class_filter(subtask_key, class_id | null)`. Gate on it in
  `draw_annotation`, `get_edit_candidates`, `fly_to_annotation`, the
  visible-count loop, and `annotation_list`. Explicitly *not* in the bitmask
  geometry paths (`merge/join`, `resolve_bitmask_overlap`): a filtered mask is
  still real data and must keep acting as a stroke barrier, or painting over
  hidden pixels silently breaks the no-overlap invariant.
  - **Superseded by 4.5**: renamed to `set_class_focus` / `focused_class` /
    `is_annotation_defocused`, and the draw gate dims instead of hiding. The
    five gate sites and the geometry carve-out are unchanged.
  - Added `is_annotation_filtered(annotation, subtask_key)` as the single
    gate, and both methods to `index.d.ts`. Setting a filter drops
    `hovered_annid` and `fly_to_idx`, which may now point off screen.
  - Rejects a class id the subtask doesn't declare, so a stale host-side id
    can't silently blank a layer.
  - Tests in `tests/class_focus.test.js`, including the property that
    motivated state over a per-annotation flag: annotations swapped in after
    the focus is set are scoped on arrival, with no re-application step.
  - Local validation: lint + build + 196 jest pass.
- [x] 4.2 `set_subtask_opacity(subtask_key, value)` wrapping
  `readjust_subtask_opacities`, which already drives `div#canvasses__{key}`
  from the toolbox slider. Lets the host dim backing layers at runtime and
  retires the `inactive_opacity: 1` construction hack from 3.3.
  - Writes `inactive_opacity` as well as the DOM, because `set_subtask`
    resets every non-current slider from that field; without it a host-set
    opacity silently reverts on the next subtask switch. 6 tests in
    `tests/set_subtask_opacity.test.js`, one of which is exactly that.
- [x] 4.3 `set_annotations_batch(Record<subtask_key, annotations>)` - one
  loader show/hide, one filter + opacity pass, one toolbox update. Today N
  subtasks means N spinner cycles and 2N awaits; a run switch swaps
  `prediction` and `diff` and has to be one atomic, flicker-free update for
  the blink comparator to work. Removes the host's `pushChainRef`.
  - Extracted the per-subtask swap body into `_swap_subtask_annotations` so
    `set_annotations` and the batch share it; `set_annotations` keeps its
    signature and behaviour.
  - Unknown subtask keys are dropped with a warning rather than aborting, so
    one stale key can't lose the whole swap. An all-unknown map does not
    cycle the loader.
  - 8 tests in `tests/set_annotations_batch.test.js` covering the batching
    contract (one loader, one `refresh_toolbox`, destroyed-mid-swap
    unwinding). The swap body itself stays covered by the bitmask e2e specs.
- [x] 4.4 `set_class_colors(Record<class_id, color>)` - one
  `rebuild_id_dialog_pies()` for the whole map. `set_class_color` rebuilds
  every subtask's pies on each call even with `redraw = false`, so the host's
  batched recolor loop is O(N^2) DOM churn.
  - Split the cheap half (`color_info` + toolbox swatch) into
    `_apply_class_color`; both entry points share it and `set_class_color` is
    unchanged externally.
  - Also fixed the same quadratic loop *inside* ULabel:
    `RecolorActiveItem.read_local_storage` called `set_class_color` per class
    at construction, rebuilding every subtask's pies once per class.
  - 5 tests added to `tests/set_class_color.test.js`.
- [x] 4.5 Class focus dims rather than hides. 4.1 skipped non-focused
  annotations outright, which was a behaviour regression: the N+3 layout drew
  every class and only dimmed the inactive ones. Renamed `class_filter` ->
  `focused_class`, `set_class_filter` -> `set_class_focus`,
  `is_annotation_filtered` -> `is_annotation_defocused`. Only the
  `draw_annotation` gate changed meaning; the four input/navigation gates
  still skip, so hover, Tab and the annotation list stay scoped to one class
  while the rest remain visible.
  - `state.defocused_opacity` (default 0.4, settable per subtask at
    construction or via `set_defocused_opacity`). **0 restores 4.1's skip**,
    so a wide segmentation ontology can still opt out of the extra draws.
  - Defocused annotations render to one shared scratch canvas and are blitted
    back as a single layer. Two reasons, both load-bearing: canvases pack
    annotations by fill order rather than by class, so a defocused annotation
    can otherwise composite *over* a focused one; and blitting once means
    overlapping defocused annotations dim as a group instead of compounding
    alpha. It also avoids threading an alpha argument through every
    `draw_*` primitive - several of them assign and reset `globalAlpha`
    themselves (`draw_bounding_box`, `draw_polygon`, `draw_bitmask`) and
    would each have had to multiply instead.
  - `draw_annotation` only draws a defocused annotation inside that pass, so
    the direct-draw callers (undo/redo, in-progress edits) can't leak one at
    full alpha.
  - 9 more tests in `tests/class_focus.test.js` (20 total) covering pass
    ordering, the blit alpha, the 0 opacity skip, and live-context restore on
    a throwing draw.

### Phase 5 - ULabel: class to spatial type binding

Motivation: a merged `groundtruth` allows the union of the ontology's modes,
so nothing stops a user drawing a polyline "Crop". Per-class subtasks enforced
this structurally - the pre-256 `buildClassSubtasks` even threaded a `modeFor`
callback - and collapsing to three subtasks gives that up unless ULabel can
express it. A polyline crop is a data-corruption bug better caught at draw
time than at save time.

- [x] 5.1 Optional `allowed_modes?: ULabelSpatialType[]` on
  `ClassDefinition`. Undefined inherits the subtask's list, so every existing
  consumer is unaffected.
  - A class can only *narrow*: a mode the subtask doesn't allow is dropped
    with a warning, and a class whose every declared mode is invalid falls
    back to the subtask's list rather than being undrawable.
  - The key is only attached when the class actually narrows, so `class_defs`
    keeps its existing shape for the common case.
  - `get_class_allowed_modes(class_id, subtask_key?)` is the single resolver.
- [x] 5.2 Enforce it both ways: changing class auto-switches to that class's
  mode, and the modes it disallows are disabled in the toolbox.
  `set_and_update_annotation_mode` rejects a disallowed mode for callers that
  bypass the buttons.
  - `sync_annotation_modes_to_active_class()` does both, called from
    `set_subtask`, `after_init` (the configured initial mode may not suit the
    initial class) and the class-button handler.
  - Delete modes are exempt in both places: they can't create a wrong-typed
    annotation, and hiding them would make the delete class unreachable.
  - Re-entrancy guarded, because switching mode can trigger the delete-class
    toggle, which clicks a class button, which re-enters the sync.
  - 13 tests in `tests/class_allowed_modes.test.js`.
- [x] 5.3 Narrow `findAllClassDefinitions`, which filters class defs by
  *subtask* modes today only because per-class modes were not expressible.
  - Now asks each class first, falling back to its subtask. The subtask-level
    early-out is gone: it would have masked the per-class check.

### Phase 6 - ULabel: defects found in review

- [x] 6.1 Unterminated `/**` block in `annotation_operators.ts`, left behind
  by the 1.3 `mark_hidden` removal.
- [ ] 6.2 Mask barrier escape hatch. Read-only bitmasks still participate in
  `resolve_bitmask_overlap`, so a `prediction` or `diff` mask invisibly clips
  a GT brush stroke. Needed before segmentation editing ships.
- [ ] 6.3 (only if live GT editing during diff review is required) Apply an
  edit to a non-current subtask and record it in that subtask's undo stream.
  `set_subtask` clears hover and `fly_to_idx`, so a review queue cannot
  resolve into GT without losing its place. Prefer 7.9 and skip this.
  - Why it is needed at all: currency does triple duty. `record_action` and
    `undo` both resolve through `get_current_subtask()`, and
    `get_edit_candidates` and Tab only search the current subtask. So
    "Tab walks FNs in `diff`" and "my correction lands on `groundtruth`'s
    undo stream" are not simultaneously expressible - review and edit are
    separate modes unless this ships.
  - Note the undo stream is *not* the fragile part: `class_filter` changes
    swap nothing, and a run switch leaves `groundtruth` untouched, so GT's
    stream is continuous across both. The fragile part is that `diff` is
    derived from (GT, run) and goes stale the moment GT is edited - the
    resolved FN keeps rendering as an FN. That is a repaint problem, which
    is what 7.9 solves without client-side rematching.
- [ ] 6.4 Two different `get_active_class_id` implementations disagree. The
  `ULabel` *method* (`index.js`) parses the selected toolbox anchor's id out
  of the DOM; the *utility* of the same name (`utilities.ts`) reads
  `state.id_payload`. The method throws outright before the toolbox has
  rendered, and the two can diverge whenever state changes without a DOM
  sync. Phase 5 uses the state-based one; the method's four remaining call
  sites should follow, and one of the two names should go.

### Phase 7 - model-registry (branch `three-fixed-subtasks` off `cropped-bitmasks-trevor`)

- [x] 7.1 `buildViewSubtasks` back to three specs. Deleted `classSubtaskKeys`
  and its slug/dedup path, and the `classKeys[i]` threading through
  `ImageViewer`'s call sites. `classAllowedModesFor` **kept**: it is now fed
  to ULabel as per-class `allowed_modes` (5.1) so a class still narrows the
  subtask's union to its own geometry. Keys are `groundtruth` / `prediction` /
  `diff` (`VIEW_SUBTASK_KEYS`), with `SUBTASK_FOR_MODE` mapping the view mode
  onto the layer.
- [x] 7.2 `diff` declares TP/FP/FN at ids 0/1/2; real classes keep
  `REAL_CLASS_ID_OFFSET = 3`, since `color_info` is instance-wide. Real class
  travels as `annotation_meta.diff_class` on both diff paths (segmentation
  and matches-doc), which are already scoped to one class.
- [x] 7.3 Class chips drive `set_class_focus` on `groundtruth` / `prediction`;
  Diff Colors legend rows drive `set_class_focus("diff", ...)`. One
  `set_subtask` per *mode*, not per chip. Non-focused classes dim rather than
  disappear (see 4.5), so this keeps the old layout's visual context while
  still scoping hover and Tab to one class.
- [x] 7.4 Run switch swaps `prediction` + `diff` in one
  `set_annotations_batch`; `groundtruth` is untouched. **Not yet verified in
  a browser** - zoom/scroll survival and the single-frame read still need a
  manual pass.
- [ ] 7.5 **Deliberately not done.** `pushChainRef` is kept. Batching makes a
  swap one call, but `set_annotations_batch` still yields internally (loader
  paint + `setTimeout`), so two overlapping batches touching the same subtask
  can still interleave clear/init and leave duplicate stacked canvases.
  Batching shrinks the window; it does not close it. Dropping the chain needs
  a re-entrancy guard inside ULabel, not just fewer calls. `subtaskSig` /
  `contentKey` re-checked and unchanged - both are per-key and three stable
  keys only make them cheaper.
- [x] 7.6 Recolor through one `set_class_colors` call; the per-class
  `set_class_color` + trailing `redraw_all_annotations` loop is gone.
- [x] 7.7 `viewerKey` falls back to `[null, annoEvalItemId]` when
  `effectiveImgDims` is null, so two differently-sized items can no longer
  share a key.
- [x] 7.8 `ClassCounter` back to `subtasks: "current"` - the current subtask
  already carries the right classes in every mode.
- [ ] 7.9 Resolution overlay for the review queue: record accept / reject /
  confirm per item app-side and reconcile on save, letting the server
  recompute the diff. Task-type agnostic, so it removes the segmentation
  (derived client-side) vs keypoint (fetched per threshold) asymmetry, avoids
  reimplementing bipartite matching in the worker, and makes 6.3 unnecessary.
- [ ] 7.10 Unpin the ulabel git SHA to a published `^0.28.x` before merge.
  Now pinned to `#275509f` on the pushed `three-fixed-subtasks` branch, so a
  fresh `npm ci` resolves correctly. Still a branch SHA, not a release.
- [ ] 7.11 `groundtruth` ships `read_only: true` behind an
  `editableGroundtruth` flag (default off). The shape supports editing - it is
  multi-class, never swapped on a run switch, and owns its own undo stream -
  but there is no save path yet, so an editable layer would be a data-loss
  footgun. Flip the flag when 7.9 lands.
- [x] 7.12 `classAllowedModesFor` short-circuited to `["bitmask"]` for every
  class on a segmentation run, discarding the backend's
  `class_spatial_types`. Weeds-Soybean declares `Row: polyline` and the GT for
  an item really does load 10 Row polylines alongside 89 Crop bitmasks, so
  focusing Row would have forced bitmask mode and made those polylines
  uneditable. Dropped the short-circuit; the general path already unions the
  class's own geometry with the fallback its diff artifacts render as.

### Phase 8 - history

- [ ] 8.1 At merge, retarget rather than stack: `gh pr edit 257 --base main`
  and close 256, likewise 12 and 10. Both branches are linear descendants of
  main with zero divergence, so retargeting needs no rebase and cancels the
  add-then-delete churn (resolvers, `hidden`, `replace_subtasks`,
  class-grouped canvases) out of main's history and `git blame`.
- [ ] 8.2 Optional, only if the combined diff is too large to review well:
  re-slice by nature rather than chronology - bitmask perf (items 1/3/5 plus
  the back-canvas removal) as a PR that can land immediately, architecture as
  another. Manual work, since `cropped-bitmasks`'s three commits mix both.

### Verification

- [ ] V3 ULabel: lint + jest + e2e green after each phase; 4.1-4.4 and
  5.1-5.3 carry their own tests.
- [ ] V4 model-registry on eval run #3: run and mode switches produce zero
  rebuilds and preserve zoom with no visible flicker; Tab in `diff` walks
  only the filtered outcome; `ClassCounter` reads TP/FP/FN in diff; three
  front canvases, heap at or below the N+3 baseline.
- [ ] V5 The edit test, which every layout except 256 failed: a misclassified
  GT annotation is corrected *in place* by the reclassify pie, keeping its
  id, `encord_object_hash` and undo coherence - no delete-and-recreate across
  subtasks. Must pass before the edit path ships.
