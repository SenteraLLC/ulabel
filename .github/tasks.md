## Tasks
- [x] Read the description in [#234](https://github.com/SenteraLLC/ulabel/issues/234)
  - [x] Write a clear summary of the requested change
  - [x] Break the requested feature down into concrete steps. Add the steps to the tasks list, and then start working on then one by one.

### Summary
Create an annotation list toolbox item that displays all annotations in a list format, similar to other annotation tools. The list should:
- Display each annotation (by ID or index)
- Allow show/hide of deprecated annotations (default: hide)
- Support grouping by class
- Enable clicking to "fly to" the annotation
- Show annotation labels/IDs (on hover or drawn on canvas)
- Display "current idx / total" when navigating through annotations
- Highlight annotations when hovering in the list

### Implementation Steps
- [x] 1. Research existing toolbox items and understand the toolbox structure
  - [x] Read `src/toolbox.ts` to understand how toolbox items work
  - [x] Review existing toolbox items in `src/toolbox_items/`
  - [x] Understand how annotation data is accessed and structured
- [x] 2. Create the basic annotation list toolbox item
  - [x] Create new file `src/toolbox_items/annotation_list.ts`
  - [x] Implement basic UI structure (container, list elements)
  - [x] Register the toolbox item in the main toolbox
- [x] 3. Implement core list functionality
  - [x] Display all annotations with their ID/index
  - [x] Add show/hide toggle for deprecated annotations (default: hide)
  - [x] Add option to group by class
- [ ] 4. Implement click-to-fly functionality
  - [x] Integrate with existing "fly to" functionality from PR #230
  - [x] Add click handlers to list items
  - [ ] Display "current idx / total" indicator
- [ ] 5. Implement hover highlighting
  - [x] Add hover handlers to list items
  - [x] Integrate with existing annotation highlighting system
  - [ ] Ensure bidirectional highlighting (list hover → canvas, canvas hover → list)
- [x] 6. Implement annotation label display
  - [x] Add option to show labels on annotations
  - [ ] Support persistent label display on canvas
