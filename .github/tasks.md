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

