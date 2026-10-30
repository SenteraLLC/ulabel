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

## PR #263 review fixes

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

## PR #263 review: z-indices and overlay resize

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

## Review fixes (REVIEW-feature-sync-class.md)

- [x] #1 A copy/paste back into the source subtask ignores `counterpart_class_meta_key` (`use_meta_override` param).
- [x] #2 Counterpart actions' `annotation_id` is foreign: `action_owns_annotation_id` guards stamping, undo revert, fly-to boxes, `remove_recorded_events_for_annotation` and `find_stamp_before_last_action`.
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

## PR review: linked-annotation demo + local landing page

- [x] `demo/linked-subtasks.html`: Predictions (read-only) / Diff / GT with link meta key + counterpart class meta key; A/B/C direct-links case.
- [x] `demo/index.html` landing page listing every demo; `demo.js` prints the landing URL.
- [x] Lint, build; live check in browser.

## PR review: standardise subtask locks

- [x] `ULabelSubtask.is_read_only()` / `is_edit_locked()`; `is_subtask_edit_locked` / `is_current_subtask_read_only` delegate.
- [x] Route hand-written `read_only` checks through `is_read_only()`; `copy_annotation_to_clipboard(cut)` respects `read_only` only.
- [x] `api_spec.md` Subtask locks section + links are direct only; `index.d.ts`; changelog.
- [x] Tests; lint, build, jest.
