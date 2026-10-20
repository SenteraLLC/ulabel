## Tasks

## Swap performance: blank frame + AnnotationList cost

- [x] `_swap_subtask_annotations`: keep old canvases on screen through the loader yield;
  remove them, rebuild and redraw synchronously after it.
- [x] AnnotationList: one cached `<img>` data URL per (spatial type, color) instead of the
  inline Inkscape SVG per row.
- [x] AnnotationList: `content-visibility: auto` on rows; id->index map in the grouped view.
- [x] Lint, build, jest 515/515.

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
