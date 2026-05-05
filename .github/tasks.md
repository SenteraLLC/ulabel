## Tasks: Fix Type Declarations for npm Consumers

### Phase 1: Enable Declaration Generation
- [x] Add `declaration: true` and `declarationMap: true` to `tsconfig.json`
- [x] Add `"files"` field to `package.json` to include `dist/`, `build/`, `src/`, `index.d.ts`

### Phase 2: Fix Incorrect Types in `index.d.ts`
- [x] Fix `get_allowed_toolbox_item_enum()` return type → `typeof AllowedToolboxItem`
- [x] Fix `get_resize_toolbox_item()` return type → `typeof AnnotationResizeItem`
- [x] Fix `get_annotations` / `set_annotations` parameter type → `string` (subtask key)
- [x] Update constructor to accept kwargs object with deprecated overload

### Phase 3: Add Missing Declarations
- [x] Add `static version(): string` and instance `version(): string`
- [x] Re-export `AllowedToolboxItem`, `ULabelAnnotation`, `ULabelSubtask` from `index.d.ts`

### Phase 4: Verify
- [x] Run `npm run build` successfully
- [x] Run `npm run lint` successfully

### Phase 5: Fix Behavioral Changes from Strict TypeScript Migration
- [x] Revert null→undefined changes in `suggest_edits`, `fly_to_annotation_id`, `show_global_edit_suggestion`
- [x] Preserve `task_meta` null value in submit payload
- [x] Preserve `class_def.keybind` null value in `original_class_keybinds`
- [x] Widen `index.d.ts` types to accept null where runtime uses null
- [x] Unit tests for keybind storage and configuration defaults
- [x] E2E tests for API behavior contracts (api-behavior.spec.js)
- [x] Assess `annotation_operators.ts` default value changes (id=0, distance=Infinity, distances={distance:0})
- [x] Add annotation classification unit test
- [x] Add distance_from property e2e test
- [x] Revert `show_annotation_mode(undefined)` → `null` in html_builder.ts
- [x] Revert `redraw_all_annotations(key, undefined, false)` → `null` in toolbox.ts (2 sites)
- [x] Widen `index.d.ts` types for `redraw_all_annotations` offset and `show_annotation_mode` el
- [x] Unit tests for `replaceLowerConcat` (split/join behavior)
- [x] E2E tests for `show_annotation_mode(null)`, `redraw_all_annotations` with null offset/subtask
- [x] Run full lint + build + test validation
- [ ] Run full lint + build + test validation

