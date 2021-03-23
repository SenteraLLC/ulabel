# Changelog

All notable changes to this project will be documented here.

## [unreleased]

<nothing_yet>

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
