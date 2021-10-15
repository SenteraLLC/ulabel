# Changelog

All notable changes to this project will be documented here.

## [unreleased]

Nothing yet.

## [0.4.18] - August 27, 2021

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
