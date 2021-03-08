# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

- Added a function to swap background color for the annotation box
- Added generic callback support

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
