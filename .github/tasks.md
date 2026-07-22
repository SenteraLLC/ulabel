## Tasks

### Generalize Confidence Slider

- [x] Add helpers to `src/annotation_operators.ts` (`get_spatial_annotations_with_confidence`, `get_annotation_confidence_for_class`, `findAllClassDefinitions`)
- [x] Add `ConfidenceFilterItem` to `src/toolbox.ts` and refactor `KeypointSliderItem` into a deprecated subclass
- [x] Add `AllowedToolboxItem.ConfidenceFilter`, `toolbox_map` entry, `DEFAULT_CONFIDENCE_FILTER_CONFIG`, and `confidence_filter_toolbox_item` field to `src/configuration.ts`
- [x] Add `ConfidenceFilterConfig` / `ConfidenceFilterClasses` types and `spatial_confidence_filter` deprecated key to `index.d.ts`
- [x] Add `get_confidence_filter_value()` public API to `src/index.js`
- [x] Update `api_spec.md` documentation
- [x] Add/extend tests
- [x] Run `npm run lint` and `npm run build`

