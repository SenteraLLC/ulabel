## Tasks

## Embedder overlay canvases (CVML-194)

- [x] Named overlay z-index constants in `src/blobs.js`.
- [x] `add_overlay_canvas(layer?)` / `remove_overlay_canvas(canvas)` on `ULabel`; overlay list
  resized by `rezoom()` / `drag_rezoom()`; FilterDistance overlay unchanged.
- [x] `destroy()` removes remaining overlay canvases.
- [x] Types in `index.d.ts`, docs in `api_spec.md`, changelog entry.
- [x] Jest + Playwright tests.
- [x] Lint, build, jest.

## Swap performance: blank frame + AnnotationList cost

- [x] `_swap_subtask_annotations`: keep old canvases on screen through the loader yield;
  remove them, rebuild and redraw synchronously after it.
- [x] AnnotationList: one cached `<img>` data URL per (spatial type, color) instead of the
  inline Inkscape SVG per row.
- [x] AnnotationList: `content-visibility: auto` on rows; id->index map in the grouped view.
- [x] Lint, build, jest 515/515.

## Release version and public API documentation

- [x] Run baseline lint, build, and unit tests.
- [x] Bump package/type versions and release changelog heading to 0.30.0.
- [x] Mark internal canvas members in TypeScript docs and verify the public API spec does not advertise them.
- [x] Run post-change lint, build, and unit tests; commit locally.

## Fix GitHub Pages demo (blank page)

- [x] `live_demo.html`: load `./cs-demo-0.png` (relative) so it resolves under `/ulabel/`.
- [x] `deploy-demo.yml`: copy `demo/cs-demo-0.png` into `_site`.
- [x] Verified with Playwright against a simulated `/ulabel/` Pages layout.

## Fix flaky Firefox isolate e2e test

- [x] AnnotationList: `contain-intrinsic-size` 37px -> 24px. It sizes the content box, so
  unrendered rows were 54px vs 41px rendered; the list shifted as rows rendered and the
  test's click hit the row instead of the isolate button.
- [x] Test: move the mouse off the list before counting pixels (Firefox hovers the
  re-rendered row, drawing a thicker outline).
- [x] Verified: Firefox 50/50 with no settle wait; list-related e2e 156/156; lint; jest 515/515.

## Merge main for PR #263

- [x] Merge `origin/main` (0.30.0 and 0.30.1 already released there); resolve version conflicts.
- [x] Re-bump package/version.js to 0.31.0; move the overlay API changelog entry under 0.31.0.
- [x] Run lint, build, and unit tests.

## Overlay z-indices and resize

- [x] Name the image frame (50), FilterDistance overlay (95), and loader z-indices in `src/blobs.js`; loader sits above `"above_annotations"` overlays.
- [x] Drop `resize_overlay_canvases()`: overlays carry `imgsz_class`, so rezoom already resizes them. Restore the FilterDistance resize call; `overlay_canvases` holds embedder canvases only.
- [x] Lint, build, jest 521/521 (both builds), Chromium e2e 94/94.

## Set class in <subtask> (context menu)

- [x] `set_counterparts_class()` in `src/index.js` + undo/redo (`set_counterparts_class` action).
- [x] Context menu item `Set class in` (only counterparts that can take the source class and differ).
- [x] Types (`index.d.ts`), `api_spec.md`, changelog.
- [x] Jest tests; lint, build, jest.

## counterpart_class_meta_key config option

- [x] `_get_counterpart_class_name` helper; override in `get_counterpart_class_changes` and `match_paste_class_id` (Copy to / Move to / paste).
- [x] Config default, `index.d.ts`, `api_spec.md`, changelog.
- [x] Jest tests; lint, build, jest.
- [x] Copies drop the `counterpart_class_meta_key` entry (like the link key).

## Copy/paste and counterpart action fixes

- [x] A copy/paste back into the source subtask ignores `counterpart_class_meta_key` (`use_meta_override` param).
- [x] Counterpart actions' `annotation_id` is foreign: `action_owns_annotation_id` guards stamping, undo revert, fly-to boxes, `remove_recorded_events_for_annotation` and `find_stamp_before_last_action`.
- [x] Regression tests; docs; lint, build, jest.

## Class confidence display

- [x] Details menu lists non-zero class confidences (sorted; only when more than one is non-zero).
- [x] `confidence_card_classes` config (default 1): confidence card shows the top N non-zero classes.
- [x] Class pie shows the class name on slice hover.
- [x] Types, `api_spec.md`, changelog; tests; lint, build, jest; live check in browser.
- [x] Demo: mixed confidences + `confidence_card_classes: 2` in `demo/live_demo.html`.
- [x] Pie centre label: wrap only between words, shrink font to fit the circle.
- [x] Pie centre label: 8px floor, then truncate with an ellipsis.

## hover_card_text config callback

- [x] `hover_card_text(annotation, subtask_key) => string | string[] | null`: extra plain-text lines in the confidence card.
- [x] Called once per hovered annotation (cached), errors caught and logged, capped at 5 lines.
- [x] Card shows host text for every hovered spatial annotation; card toggle still wins.
- [x] Types, `api_spec.md`, changelog, demo; tests; lint, build, jest; live check.

## Linked-annotation demo + local landing page

- [x] `demo/linked-subtasks.html`: Predictions (read-only) / Diff / GT with link meta key + counterpart class meta key; A/B/C direct-links case.
- [x] `demo/index.html` landing page listing every demo; `demo.js` prints the landing URL.
- [x] Lint, build; live check in browser.

## Standardise subtask locks

- [x] `ULabelSubtask.is_read_only()` / `is_edit_locked()`; `is_subtask_edit_locked` / `is_current_subtask_read_only` delegate.
- [x] Route hand-written `read_only` checks through `is_read_only()`; `copy_annotation_to_clipboard(cut)` respects `read_only` only.
- [x] `api_spec.md` Subtask locks section + links are direct only; `index.d.ts`; changelog.
- [x] Tests; lint, build, jest.

## Fix: Class Counter counts first non-zero class

- [x] `count_subtask` uses `get_annotation_class_id` (top class, same as the canvas colour); all-zero annotations stay uncounted.
- [x] Regression test, changelog; lint, build, jest.

## Fix #271: hover card off-screen for boxes taller than the view

- [x] Card placement: above, else below, else pinned inside the visible area.
- [x] Playwright test (whole-image box, zoomed-in box); changelog; lint, build, jest, e2e.

## Multi-select + bulk actions (CVML-358), phase 1: direct selection only

No box/lasso select modes and no group drag (follow-ups).

- [x] Selection core: `selected_ids` per-subtask state; `src/selection.ts` (set/add/toggle, clear, prune, get);
  only live, non-deprecated, visible, spatial, non-3D ids; not undoable. Cleared on subtask switch / `set_annotations`;
  pruned on delete, undo/redo, filter/focus changes.
- [x] Drawing: selected annotations get the hover white border.
- [x] Persistent `N selected` indicator, styled and placed like the fly-to toast (which moves below it).
- [x] Input: Ctrl+click (no drag, canvas or annotation list) toggles; Ctrl+A selects all visible; Esc clears (after cancelling an in-progress
  annotation, before exiting isolation); right-click on an unselected annotation clears the selection and acts on it.
- [x] Public API: `get_selected_annotation_ids()`, `select_annotations(ids, how)`, `select_all_annotations()`, `clear_selection()`, `on_selection_change` config callback.
- [x] Bulk clipboard: Ctrl+C/X/V act on the selection first; v2 envelope (`annotations: [...]`), v1 still pasteable;
  one undo step; one class pie for the batch.
- [x] Bulk context menu on a selected annotation: Copy to / Move to / Delete / Change class, each one undo step.
  Delete key acts on the selection first.
- [x] Types, `api_spec.md`, changelog, demo; Jest + Playwright tests; lint, build, jest.
  (Jest: `tests/bulk_actions.test.js`, `tests/selection.test.js`, `tests/context_menu.test.js`;
  e2e: `tests/e2e/multi-select.spec.js`. Existing demos already exercise it, so no demo change.)
- [x] Review fixes (`REVIEW-feature-multi-select.md`): hidden layers not selectable, confidence/keypoint filters
  prune the selection, Cmd+click on list rows, right-click on an unselected list row clears the selection.

## Multi-select (CVML-358): box select

Ctrl+drag on the canvas draws a box (replaces Ctrl+drag pan; middle-drag still pans). Catches anything it touches
in the current subtask; adds to the selection.

- [x] `get_annotation_ids_in_rect` in `src/selection.ts` (containing-box prefilter + per-type geometry); Jest tests.
- [x] `select_box` drag key: overlay div, click-vs-drag threshold (Ctrl+click still toggles), Esc cancels; Jest tests.
- [x] Live preview while dragging (rAF-throttled, diff-only redraw); perf check, fall back to count-only if slow.
  (4000 annotations: hit-test ~1ms, preview JS ~6ms/frame; browser repaint of changed canvases ~75ms long tasks,
  below an existing vertex-edit drag's ~200ms, so kept. Ctrl also wins over edit handles so dense scenes box-select.)
- [x] Docs (`api_spec.md`), changelog, e2e; lint, build, jest, e2e.
- [x] `ctrl+shift+drag` deselect box (mode fixed at mousedown, red box), `ctrl+shift+click` deselects only; Jest + e2e.

## Multi-select: review fixes (box select)

- [x] Bitmask hit-test checks foreground pixels in the overlap, not just the containing box.
- [x] Cancel an in-progress selection box when the subtask changes.
- [x] Box preview/cancel drops base ids that stopped being selectable during the drag.
- [x] Jest regression tests; lint, build, jest, e2e.

- [x] Final box notification compares against the host's last-heard selection (independent of base pruning).
- [x] Track that per ULabel instance and subtask, not via a module-global counter; Jest regressions.

## Multi-select: selection click feedback
- [x] Hide the hover outline after a ctrl/ctrl+shift click (canvas and annotation list) until the mouse moves past the click tolerance, so deselects are visible; e2e coverage.
- [x] Review: right-click right after a selection click highlights the menu target (clear suppression before resolving it, canvas and list); e2e regressions.

## Multi-select: move selection logic out of index.js
- [x] Move box-select drag handling and `toggle_selection_on_ctrl_click` into `selection.ts`; one per-instance box state (merge `select_box_state` into the `active_boxes` entry).
- [x] Move `run_action_batch` body into `actions.ts`; keep the `ULabel` wrapper.
- [x] Lint, build, Jest, e2e.
- [x] Review fix: module code calls public methods through the ULabel instance so `ulabel.on(...)` callbacks still fire (regression test in copy_annotation.test.js).

## Multi-select: move clipboard/paste/counterpart logic out of index.js

- [x] Move clipboard, paste and counterpart logic into new TS modules; keep thin ULabel wrappers for the public API and `__undo`/`__redo` handlers.
- [x] Lint, build, Jest, e2e.
- [x] Review fix: module code calls public methods through the ULabel instance so `ulabel.on(...)` callbacks still fire (regression test in copy_annotation.test.js).

## Multi-select: remaining bulk context-menu items (plan)

Bulk menu gets the single-annotation items it lacks (not Details). Each is one undo step via `run_action_batch`.

- [x] Counterpart helpers take a `switch_subtask` flag (default true) so bulk loops switch to the target once, after the batch (a mid-loop `set_subtask` clears the selection).
- [x] `Set class in <subtask>` (N): targets where any selected annotation has a counterpart change; count = annotations that would change; loop `set_counterparts_class`.
- [x] `Delete from <subtask>` (N): targets holding counterparts of any selected annotation; count = counterparts; loop `delete_counterparts(.., false)`.
- [x] `Erase from <subtask>` (N): selected bitmasks with bitmask counterparts; loop `delete_counterparts(.., true)`.
- [x] No new public bulk API (menu only); no confirm dialogs. Delete/Erase from count = distinct counterparts changed.
  Release as 0.34.0; `on_isolate_change` now always gets an array of ids or null (breaking, note in changelog).
- [x] Isolate N / Show all: `isolated_annid` becomes a set of ids (`isolated_annids`); `isolate_annotation(id)` keeps working,
  new `isolate_annotations(ids)`; `on_isolate_change` receives an array; update every `isolated_annid` reader
  (`isolate.ts`, `active_class.ts`, `clipboard.ts`, `listeners.ts`, `index.js` delete/restore paths).
- [x] Restore N: under Show Deprecated focus, only deprecated annotations are selectable (live ones aren't);
  bulk menu then offers Restore N (ids passing `can_restore_annotation`) and Isolate N, not the edit items.
- [x] Docs, changelog; Jest (`tests/bulk_actions.test.js`, `tests/context_menu.test.js`) + e2e; lint, build, jest.
