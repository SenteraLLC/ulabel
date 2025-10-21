## Tasks
- [x] Read the description in [#128](https://github.com/SenteraLLC/ulabel/issues/128)
  - [x] Update this checklist with steps to take in order to implement the requested functionality

### Implementation Steps
- [x] Design and implement UI for image filters
  - [x] Create a collapsible/popup menu component for filter controls
  - [x] Add sliders for each CSS filter property:
    - [x] Brightness (0-200%, default 100%)
    - [x] Contrast (0-200%, default 100%)
    - [x] Hue-rotate (0-360deg, default 0)
    - [x] Invert (0-100%, default 0%)
    - [x] Saturate (0-200%, default 100%)
  - [x] Add reset button to restore default values
  
- [x] Implement filter state management
  - [x] Add filter state to configuration/state management
  - [x] Make default filter values configurable
  - [x] Add getter/setter methods for filter values

- [x] Apply CSS filters to canvas/image
  - [x] Apply CSS filter property to the image canvas element only (not whole screen)
  - [x] Update filter values dynamically as sliders change
  - [x] Ensure filters don't affect UI elements (text, buttons, etc.)

- [x] Testing
  - [x] Test all filter controls work correctly
  - [x] Verify filters only apply to image, not UI
  - [x] Test filter combinations
  - [x] Run linting: `npm run lint`
  - [x] Run build: `npm run build`
  
- [x] Documentation
  - [x] Update API documentation with new filter methods
  - [x] Tested on demo page (multi-class demo works great!)
