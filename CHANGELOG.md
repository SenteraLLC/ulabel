# Changelog

All notable changes to this project will be documented here.

## [unreleased]

## [0.22.1] - Jan 13th, 2026
- Don't draw annotations when a subtask is vanished
- Add configurable `annotation_vanish_all_keybind`
- Track annotation size per subtask
  - Remove annotation size cookie, since it was tracking just one size per annotation session
- Deprecated the `default_annotation_size` argument in the configuration object. Use the `initial_line_size` argument instead. See api_spec.md for details.
- Fix toolbox collapse arrow positioning, and make frame annotation dialogs disappear on collapse
- Removed the `line_size` property from annotation objects. `subtask.state.line_size` determined the size of drawn annotations within a subtask.

## [0.22.0] - Oct 30th, 2025
- Add collapsible toolbox with arrow button at top
  - Toolbox collapse state persists in browser
  - Annotation canvas expands to fill space when toolbox is collapsed
- Add `Keybinds` toolbox item for viewing and customizing keybinds
  - Display all configurable keybinds with labels and descriptions
  - Edit keybinds by clicking and pressing new key combination
  - Support for modifier key chords (shift, ctrl, alt, meta)
  - Collision detection with red highlighting for duplicate keybinds
  - Reset individual keybinds or all keybinds to defaults
  - Visual indicator (yellow highlight) for user-customized keybinds
  - User keybind settings persist in browser
- Rename `create_bbox_on_initial_crop` to `create_bbox_on_initial_crop_keybind` for consistency
- Split `change_zoom_keybind` into two separate keybinds:
  - `reset_zoom_keybind` (default: `r`) - Reset zoom to fit image
  - `show_full_image_keybind` (default: `shift+r`) - Zoom to show full image
- Store collapse/expand state for Keybinds, Annotation List, and Image Filters toolbox items
- Add comprehensive e2e tests for keybind functionality and keybind toolbox item

## [0.21.0] - Oct 27th, 2025
- Add toast notification that shows on `fly_to` calls and shows annotation position in the ordering (e.g., "3 / 10")
- Add `AnnotationList` toolbox item for managing and navigating annotations
  - Displays all annotations in a scrollable list with spatial type icons and class names
  - Bidirectional hover highlighting between list and canvas
  - Filter options:
    - Toggle show/hide deprecated annotations (default: hidden)
    - Group annotations by class
  - Collapsible interface to maximize toolbox space
- Add automated package deployment via GHA

## [0.20.0] - Oct 15th, 2025
- Add `fly-to` functions, which sets the zoom and focus to a specific annotation
  - `fly_to_next_annotation()`
  - `fly_to_annotation_id()`
  - `fly_to_annotation()`
- Add `Tab` and `Tab+Shift` default keybinds to fly-to the next/previous annotation, respectively
  - Keybinds are configurable:
    - `fly_to_next_annotation_keybind`
    - `fly_to_previous_annotation_keybind` 
- Add `ImageFilters` toolbox item to expose sliders for the following image css filters:
  - brightness
  - contrast
  - hue rotate
  - invert
  - saturate
- Removed redundant dependencies that were being unnecessarily installed by users using npm to install ulabel
- Updated webpack build process to properly provide both a minified (default) and unminified build (for better debugging)
  - Added package `exports` field with options: `.` (minified), `./min` (minified), `./debug` (unminified)
- Add test coverage for both minified and unminified builds
- Update dependencies and fix 12 security vulnerabilities

## [0.19.1] - Oct 9th, 2025
- Add automated testing to the repo
- Fix circular webpack builds by forcibly cleaning the `dist/` directory before each build
  - Also use `import type... from ".."` instead of just `import` to fix ts not properly resolving imports to js
  - Reduced bundle size from ~20 MB -> 1 MB
- Refactor some more `console.warn` and `console.error` instances to use `log_message`
- Remove deprecated `parent_id` field from `ULabelAnnotation`

## [0.19.0] - Aug 19th, 2025

- Add minimal lineage tracking via `last_edited_by` and `last_edited_at` annotation fields
- Prevent creation of zero-length polylines
- Fixed `process_resume_from` not actually populating missing annotation fields on load
- Misc bug/QOL fixes
  - Simplified/fixed non-spatial annotation creation/deletion
  - Replaced `alert`, `throw`, and `console` calls with `log_message()`
  - Cleanup of `suggest_edits()` and other functions related to toggling dialogs
  - Refactor action stream management and undo/redo flow into `actions.ts`
    - Move a lot of repeated rendering/cleanup steps after actions into general action listeners that trigger on similar actions
    - Move `annotation_id` out of undo/redo payloads and into the action itself 

## [0.18.2] - July 28th, 2025

- Fix special characters in submit buttons breaking tool

## [0.18.1] - July 22nd, 2025

- Fix "Annotation ID" text color in night mode

## [0.18.0] - July 21st, 2025
- add `allow_annotations_outside_image` arg to the `ULabel` constructor, which defaults to `true`.
  - when set to `false`, new annotations will be limited to points within the image, and attempts to move annotations outside the image will bounce back. 

## [0.17.0] - May 30th, 2025
- Add `anno_scaling_mode` argument to the `ULabel` constructor, which allows users to specify how the size of annotations should be scaled when the zoom level is changed.
  - Options are `fixed`, `match-zoom`, and `inverse-zoom`.
  - When set to `fixed`, the line size of annotations will remain constant regardless of zoom level.
  - When set to `match-zoom`, the line size of annotations will increase with increased zoom level.
  - When set to `inverse-zoom`, the line size of annotations will decrease with increased zoom level.
- Prior behavior is equivalent to `anno_scaling_mode = "fixed"`.
- Fix bug where fully erased polygon annotations would cause the an error upon submit.

## [0.16.4] - May 2nd, 2025
- Fix bug where empty polygon layers could be included in a `submit_button` hook payload.

## [0.16.3] - Apr 25th, 2025
- Fix bug where the `Vanish` button wouldn't update its `locked` state when switching between subtasks.
- Fix bug where clicking the `Vanish` button would unexpectedly set the size cookie, causing future annotations in the same subtask to be loaded in a very small size on subsequent sessions, with the only way to recover being to increase the annotation size.

## [0.16.2] - Apr 2nd, 2025
- Fixed bug introduced in v0.15.0 where using the erase tool such that a polygon was separated into multiple disjoint regions would cause an unrecoverable error.

## [0.16.1] - Jan 13th, 2025
-  Added `click_and_drag_poly_annotations` flag to the configuration object, that when set to false prevents continuous points from being added to a polyline or polygon annotations when clicking and dragging.

## [0.16.0] - Nov 8th, 2024
- Added loading overlay with spinning icon while ULabel is initializing
- Moved several existing utilties (mostly static methods) to isolated files:
    - Event listener management to `listeners.ts`
    - Night mode cookie to `cookies.ts`
    - Logging to `error_logging.ts`
    - Canvas initialization to `canvas_utils.ts`
    - Initialization logic (vastly simplified) to `initializer.ts`
- Changed `after_init` to be an instance function
- Removed `load_image_promise` in favor of `.decode()`
- Added many new entries in `index.d.ts`

## [0.15.3] - Oct 4th, 2024
- Fix issue where legacy submit button functionality would break loading

## [0.15.2] - Oct 4th, 2024
- Change `set_saved` on submit buttons to be a true boolean,
rather than an optional boolean that could needlessly force a reload prompt

## [0.15.1] - Oct 4th, 2024
- Change deprecation cases to use dedicated `mark_deprecated` function

## [0.15.0] - Oct 3rd, 2024
- Added [ESLint](https://eslint.org/) to enforce code quality and consistency

## [0.14.1] - Oct 2nd, 2024
- Add a `brush-button-active` CSS class to the "brush" and "erase" buttons
that visually depicts when the brush or erase tool is active

## [0.14.0] - Oct 1st, 2024
- Add `.get_current_subtask_key()` and `.get_current_subtask()` utility methods
    - Updated almost all internal methods to use these utility methods

## [0.13.1] - Sept 30th, 2024
- Remove unecessary and confusing default in global edit dialog
- Squash `active_annotation` into `edit_candidate` in subtask state
- Fix missing fields in `ULabelSubtask.state.edit_candidate`

## [0.13.0] - Sept 26th, 2024
- Fix bug where the `filter_annotations_on_load = true` option would not work as expected. 
  - The `keypoint_slider_default_value` option was not being properly multiplied by 100 internally.
- Move several config argument defaults into the configuration class instead of in the ULabel constructor.
- Add `get_allowed_toolbox_item_enum()` static method to ULabel.
#### Breaking Changes
- Changed default for `filter_annotations_on_load` from `false` to `true`.
- Deprecated the `default_toolbox_item_order` argument in the ULabel constructor. Use `toolbox_order` instead.
- Deprecated `config_data` argument in the ULabel constructor. Instead, pass all configuration options as keyword arguments directly to the ULabel constructor.
  - For now, the `config_data` argument will still work, but may be removed in a future release.

## [0.12.5] - Sept 26th, 2024
- Fix release workflow using actions on `node` 16, which is now deprecated.

## [0.12.1 - 0.12.4] - Sept 26th, 2024
- Prevent default mouseup event when listening for the end to a drag event.
- Multiple publishes are from testing in a netlify app.

## [0.12.0] - Sept 20th, 2024
- Improvements to performance of the `FilterDistance` Toolbox item:
  - Switch to new redrawing util functions and only redraw annotations when necessary
  - Greatly reduce the number of distance calculations by only calculating distances for the newly modified annotation (polyline or point), 
    rather than recalculating all distances for all annotations everytime.
  - Each point now tracks the `id` of the closest line in each class to further reduce the number of redundant calculations.
- Improvements to performance of the `KeypointSlider` Toolbox item:
  - Switch to new redrawing util functions and only redraw annotations when necessary
- Fix bug where `delete` modes and the `FilterDistance` toolbox item would clash.
- Expose `n_annos_per_canvas` arg to `config_data` as an advanced feature for performance tuning.
  - Also added some dynamic scaling of this value based on the max number of annotations in a single subtask if no value is provided by the user.
- Added `disable_multi_class_mode` flag to `FilterDistanceConfig`, which defaults to `false`. When `true`, the multi-class mode will be disabled and the checkbox will not be shown.
- Added `filter_during_polyline_move` flag to `FilterDistanceConfig`, which defaults to `true`. When `false`, the filter/overlay will not be updated until polyline moves/edits are completed. This can be useful for boosting performance when working with many annotations.
  - This option is also present as a checkbox option in the `FilterDistance` toolbox item.
#### Breaking Changes
- Renamed `FilterDistanceConfig` arg `show_overlay_on_load` -> `show_overlay` for internal consistency.
- Changed format of `default_values` arg in `FilterDistanceConfig`. The name for the single class mode default has changed from `"single"` -> `"closest_row"`, and each entry in the object should be a `DistanceFromPolyline` object (`{distance: <number>}`), rather than a single number. See the updated `api_spec.md` for more details.
- `KeypointSlider` now works on all points in every subtask, even when the subtask is not active.
- Deprecated the `new` and `is_new` fields in `ULabelAnnotation`. There was internal inconsistency in their use, and some internal logic that depended on them was buggy and was sometimes preventing the `FilterDistance` slider from working as expected.

## [0.11.0] - Sept 19th, 2024
- Fix bug where class counts wouldn't update when changing subtasks.
- Add `size_factor` arg to submit buttons to allow for custom sizing.
- Add `row_number` arg to submit buttons to allow for grouping buttons into rows.

## [0.10.17] - Sept 18th, 2024
- Update `api_spec.md` indicating that `polyline` is no longer "under construction"
- Correct a few typos where `init_crop` should be `initial_crop`
- Correct typo where `filter_low_confidence_default_value` should be `keypoint_slider_default_value`

## [0.10.16] - Sept 17th, 2024
- Catch a couple event listeners that were not being removed by `remove_listeners()`.
- Suppress rare error from `handle_toolbox_overflow()`.

## [0.10.15] - June 13th, 2024
- Correctly update class counter after calling `set_annotations()`.

## [0.10.14] - June 12th, 2024
- Fix bug where very rarely, certain polygon annotations created outside of ULabel would cause ULabel to fail when processing resume_from.

## [0.10.13] - June 7th, 2024
- Fix various bugs relating to the annotation count not updating as expected.

## [0.10.12] - May 24th, 2024
- Fix broken undo/redo behavior for polygons.
- General improvements aimed at reducing memory usage and improving performance.

## [0.10.11] - May 16th, 2024
- Fix bug where using the `toggle_annotation_mode_keybind` to switch to/from a delete mode would unexpectedly change the class of the hovered annotation.
- Fix bug where pressing a class keybind when using a delete mode would deselect the delete class.
- Fix bug where using `set_annotations()` with multiple subtasks would fail.

## [0.10.10] - May 9th, 2024
- Fix bug where using `Escape` to cancel delete modes would sometimes create unexpected annotations
- Fix bug where undoing a cancelation of a delete mode did not allow for continuing with the delete mode annotation

## [0.10.9] - May 8th, 2024
- Fix bug where confidence dialog didn't update properly.
- Fix bug introduced in 0.10.3 where dialogs don't show up for points annotations.

## [0.10.8] - May 2nd, 2024
- Create method to remove all ULabel event listeners. This is handy for single page applications when the page is not reloaded after navigating away from a ULabel page.
- Fix bug where hovering over an id dialog would set the class, instead of waiting for a click.
- Fix bug where using the brush tool on an existing annotation would unexpectedly change its class.
- Fix bug where clicking a class' keybind when hovering over an annotation would not update the annotation's class if the new class was already selected in the toolbox.
- Fix very rare case where `delete` modes were being exported on submit.
- Changing id of a hovered annotation via the id dialog will no longer also change the active toolbox class id.

## [0.10.7] - April 29th, 2024
- Enable the `"change_zoom_keybind"` to function even when the `ZoomPanToolboxItem` isn't present.
- Fix bug where using "`set_annotations`" would cause some loaded annotations to not generate edit dialogs.
- Fix bug where clicking the `Annotation ID` toolbox item would not update the brush color.

## [0.10.6] - April 18th, 2024
- Fix bug introduced in 0.10.5 that caused non-polygon annotations not to load. 

## [0.10.5] - April 18th, 2024
- Fix bug where annotations could be saved with empty spatial payloads, which would cause an error when loading the annotations. 

## [0.10.4] - April 15th, 2024
- Change polygon ender icon to be smaller, partially transparent, and scaled with zoom.
- Color polygon ender and the brush circle based on the active class color.
- Fix bug where hitting the middle mouse button would sometimes open a new tab.

## [0.10.3] - April 11th, 2024
- Improvements to hitboxes for polygons, points, and bboxes. The cursor must now actually be inside the annotation before showing the edit dialogs.
- Fix duplicate keybinds for increase/decrease of line size and brush size
  - `[` and `]` now decrement/increment brush size
  - `alt+scroll` still decrements/increments brush size
  - `-` and `=` still decrements/increments line size

## [0.10.2] - April 10th, 2024
- Fix bug where using the erase tool to completely erase a polygon would sometimes cause an error.
- Fix npm publishing error from 0.10.1

## [0.10.0] - April 9th, 2024
- Add optional `keybind` argument for each class in the `classes` array to allow for custom keybinds for each class.
- Double the zoom sensitivity
- Change the default scroll wheel behavior to zoom in/out on the cursor location instead of scroll up/down.
  - When frames are present, `ctrl+scroll` or `shift+scroll` or `cmd+scroll` will now scroll through the frames.
- Fix `create_bbox_on_initial_crop` to only work when in `bbox` mode, and make it start as the active class.
- Fix longstanding bug where the `Annotation ID` toolbox item would not update the annotation ID unless explicitly clicked.
- Fix bug where panning during brush mode would open a new tab.
- Fix bug where panning was disabled when actively drawing an annotation
- Fix rare bug where undoing an annotation would cause future annotations to never finish.

## [0.9.4] - April 4th, 2024
- Fix bug where vanish mode was disabled during brush/erase mode
- Align `undo` behavior for polygons and polylines with that of other annotations (once complete, the undo will delete the entire annotation rather than undoing only the last point)
- `Escape` keybind to cancel an in-progress annotation

## [0.9.3] - March 22nd, 2024
- Fix bug where erase mode could perist when changing annotation mode
- When user provides an `initial_line_size`, use that as the default size for new annotations, independent of zoom
  - When this argument is not provided, the behavior is unchanged from before (the size of new annotations will still scale with the zoom level).
- Fix bug where the `DELETE_CLASS_ID` would show up as an option in the id dialog for polygons and bounding boxes

## [0.9.2] - March 21st, 2024
- Small fixes to `submit_buttons` in the toolbox. 
  - Added optional `set_saved` argument for each `submit_button` to allow for the page to unload without warning if the button is clicked.
  - Changed default button css to better center the text.

## [0.9.1] - March 12th, 2024

- Refactor of how annotations are drawn on the canvas. This change should make the drawing of annotations more efficient and less prone to lagging, especially when working with a large number of annotations or annotations with many vertices.
- Minor improvements to how `resume_from` errors are handled in the case of incorreclty formatted `polygon` annotations.


## [0.9.0] - February 23th, 2024

Added `DELETE_MODES = ["delete_polygon", "delete_bbox"]`, additional annotation modes for deleting annotations by drawing a polygon or bounding box around them.
- `"delete_polygon"`: Allows drawing a polygon around an area, and all annotations within that area will be deleted
- `"delete_bbox"`: Allows drawing a bounding box around an area, and all annotations within that area will be deleted

## [0.8.0] - February 15th, 2024

Added a brush/erase tool for working with polygon annotations.
- Press `g` to toggle brush mode. This refers to a state in which click-dragging will place (or erase, if in erase mode) a circle at the cursor location to either augment an existing polygon or create a new one.
- Press `e` to toggle erase mode (indicated by the color of the brush circle: red for erase). When click-dragging in erase mode, the area in a circle around the cursor will be removed from an existing polygon. Can be used to create holes, isolated fills, or even delete annotations.
- Press `=` while in brush mode to increment the brush circle size by 10%
- Press `-` while in brush mode to decrement the brush circle size by 10%
- Hold `Alt` and scroll while in brush mode to increment/decrement the brush circle size
- Press `Escape` while in brush mode to exit brush mode and return to normal annotation mode
- Also added a `BrushToolboxItem` with buttons to perform the same function as the configurable keybinds listed above. 

## [0.7.0] - January 31st, 2024

- Added click-and-drag functionality when drawing polygons or polylines.
- Changed polygon representation from that of a simple polygon to a complex polygon. This allows for polygons to contain holes and/or multiple disjoint regions.
- Hold `shift` when closing a polygon to continue annotating a new region or hole.
- Hold `shift` when moving the cursor inside a polygon to begin annotating a new region or hole.
- Press `Escape` or `crtl+z` to cancel the start of a new region or hole.
- Added fill to polygons by default, excluding any holes in the polygon.
- Added check to ensure that deprecated simple polygons are auto converted to complex polygons when loaded by ULabel.

## [0.6.14] - August 31st, 2023

- Fix class ID sort order requirement.

## [0.6.13] - July 27th, 2023

- Added the "Tag It" github job which will automatically tag the git version after a pr into main.

## [0.6.12] - July 19th, 2023

- Fixed the package entrypoints in `package.json` to point to the correct files. This should fix the issue where the package was not being imported correctly.

## [0.6.11] - July 19th, 2023

- Fixed a bug that prevented custom submit buttons from being used with the legacy constructor arguments.

## [0.6.10] - July 7th, 2023

- Reworked the overlay rendering logic.
  - Results in no longer having "infinite" zoom, but zooming should take no longer than ~2ms per operation instead of the >600ms it was previously taking.
- Also fixed a bug that caused ULabel to rerender the page on any keypress.

## [0.6.9] - June 28th, 2023

- Updated ULabel's constructor to use keyword arguments instead of 11 arguments that must be passed in in the correct order.
  - This was frustrating because most default arguments use their default option and JavaScript doesn't allow you to ommit 
    optional arguments if you want to modify a later argument.

## [0.6.8] - June 26th, 2023

- Added `utilities.ts` to contain miscellaneous helper functions.
- Added `is_object_and_not_array` to `utilities.ts` to help check if something is an object and neither null nor an array.

## [0.6.7] - May 26th, 2023

- Added multi-class support for the `FilterPointDistanceFromRow` `ToolboxItem`.
- Added an overlay for the `FilterPointDistanceFromRow` `ToolboxItem` that shows the range of the filter.
- Added a helper class `SliderHandler` to help with creation of new sliders and their event listeners.

## [0.6.6] - June 7th, 2023

- Added helper function `apply_gradient_math` that reduces duplicated code from `apply_gradient`.

## [0.6.1] - April 21st, 2023

- Added the `FilterPointDistanceFromRow` `ToolboxItem`.

## [0.6.0] - Febuary 1st, 2023

- Massive update with lots of under the hood changes.
- Added a toolbox item for changing annotation color.
- Added a toolbox item for changing annotation size.
- Added a toolbox item for filtering out annotations based on annotation confidence.
- Added support for adding diffrent Submit buttons, such as a Reject button or Failure button.
- Added a display for annotation's confidence on hover.
- Added keybinds for most operations.

## [0.4.21] - January 16th, 2022

- Fixed an issue with setting annotations at the frame/global level.

## [0.4.20]

- bugfix in `resume_from` processing

## [0.4.19] - October 15, 2021

- bugfix in `resume_from` processing

## [0.4.18] - October 15, 2021

- added checks to ensure `resume_from` object is compatible


## [0.4.16] - August 27, 2021

- Provides an example of how users can be requested to annotate just a window within an image
- Has better support for zooming into that region in the image
- Added a button to "re-center" on the initial crop that was provided

## [0.4.15] - August 16, 2021

- Fixed security vulnerability

## [0.4.14] - June 15, 2021

- Fixed security vulnerability

## [0.4.13] - May 24, 2021

- ULabel now allows for classification payloads without items for certain classes, and just assumes that omitted classes have a confidence of zero

## [0.4.12] - May 19, 2021

- Fixed issue with detecting undo/redo on Firefox and Mac
- Detected `shift+scroll` for zooming as well as `cmd/ctrl+scroll`
- Fixed small issue with `beforeunload` warning

## [0.4.11] - May 18, 2021

- Allow submission when page first loads without having to make an edit first

## [0.4.10] - April 1, 2021

- Call `on_submit` asynchronouly using await, and show loader until it finishes

## [0.4.9] - April 1, 2021

- Added support for `polyline` annotation mode
- Added basic typescript typings
- Fixed the main property in package.json so it points to a valid file. Also added the module field which points to the es6 module at the src folder
- Moved express to the dev-dependencies because users of this module do not need to install express for the frontend only component
- Exported the ULabel class in the module

## [0.4.8] - March 23, 2021

- Added the `point` annotation mode
- Added support for a link to instructions
- Added a `set_saved()` function so page can unload without warning
- Bound ulabel instance to submit callback so above function can be easily called

## [0.4.7] - March 11, 2021

- Bugfix for resuming from nonspatial annotations
- Created interface for `get` and `set` to allow for custom annotation processing
- Changed to more inclusive keyboard event handling

## [0.4.6] - March 9, 2021

- Added a function to swap background color for the annotation box
- Added generic callback support
- Added initial line size to the constructor
- Made cursor represent line size and color to be drawn
- Fixed incorrect links to repo from within package.json
- Now keeping track of whether edited since last save, and shows warning before unload if so
  - Callback is to return `false` if save is unsuccessful

## [0.4.5] - March 7, 2021

- Removed a console debugging message that I forgot to remove for 0.4.4
- Fixed bug with "resuming from" in sessions with a single frame
- Fixed bug with `init` callback not getting called

## [0.4.4] - March 7, 2021

- Added a changelog :)
- Added changelog entry to pull request checklist
- Fixed silent errors in src found by eslint
- Fixed shortcut suggestion for switching frames
- Fixed link to ulabel repo
- Added ctrl+s listener and attached it to the submit button
- Added option for inactive opacity to be configured for each subtask
- Added contructor parameter to start annotation session with image cropped to a specific bounding box
- Updated CSS rules to prevent unintuitive occlusion by global edit suggestion
