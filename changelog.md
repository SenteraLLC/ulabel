# Changelog

All notable changes to this project will be documented here.

## [unreleased]

Nothing yet.

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
