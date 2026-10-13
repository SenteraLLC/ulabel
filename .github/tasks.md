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
