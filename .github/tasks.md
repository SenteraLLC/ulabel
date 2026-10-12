## Tasks

## Swap performance: blank frame + AnnotationList cost

- [x] `_swap_subtask_annotations`: keep old canvases on screen through the loader yield;
  remove them, rebuild and redraw synchronously after it.
- [x] AnnotationList: one cached `<img>` data URL per (spatial type, color) instead of the
  inline Inkscape SVG per row.
- [x] AnnotationList: `content-visibility: auto` on rows; id->index map in the grouped view.
- [x] Lint, build, jest 515/515.
