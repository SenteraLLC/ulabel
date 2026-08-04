## Tasks

### Bitmask segmentation annotation mode
Per-annotation binary masks, COCO-style RLE serialization, brush + erase interaction.

- [x] Phase 1: Data model + RLE utils + tests (`src/mask_utils.ts`, `ULabelSpatialType`, `SPATIAL_TYPE_SET`)
- [x] Phase 2: Bitmask rendering layer (`draw_bitmask`, dispatch, redraw/clear)
- [x] Phase 3: Brush/erase paints pixels (begin/continue/finish for bitmask)
- [x] Phase 4: Undo/redo patch diffs for brush strokes (single-stroke `bitmask_stroke` action)
- [x] Phase 5: Toolbox + mode registration (mode button, brush enable/disable, keybinds)
- [ ] Phase 6: Export/import round-trip + tests + demo page

