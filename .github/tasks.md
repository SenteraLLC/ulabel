## Tasks

## Plan: v0.29.0 - editing ergonomics for model-registry (CVML-173)

Jira: CVML-228 (body-drag move), CVML-229 (context menu), CVML-230
(isolate). CVML-236 adopts the tag in model-registry. All three land on
`release/0.29.0` as one release; order 228 -> 229 -> 230 because 228
removes the hover ring that 229's list flow and 230's acceptance depend on.

Decisions taken in review (2026-09-28), where they differ from the tickets:

- Body-move covers **every** spatial type, bitmask included: `begin_move` /
  `finish_move` already translate masks, so the ticket's exclusion was an
  unverified assumption.
- Plain left-drag on a *containing* hit moves; a configurable modifier
  (default Alt, which no mouse path uses today - only Alt+wheel for brush
  size) forces a draw at that spot. Vertex handle under the cursor still
  wins.
- The whole hover ring goes (move, reid, delete buttons) **and** the hover
  pie thumbnail. Hover leaves the white outline plus the confidence card,
  now anchored to the containing box. Reclassify and delete move to the
  context menu (plus existing keybinds).
- "Change class" reuses the id-dialog pie, which already enforces per-class
  `allowed_modes` (9.6/9.7). No list submenu.
- Context menu ships only Change class / Delete / Details. No
  `context_menu_items` host hook, no per-item disable config. Add when a
  host needs it.
- No `on_annotation_change` callback: model-registry reads the annotations
  once from the Save button.
- Details shows id, class, spatial type, `last_edited_by` / `last_edited_at`,
  and `annotation_meta` entries.
- Isolate hides the others on the **canvas** (per ticket) and ships the
  programmatic `isolate_annotation()` + `on_isolate_change` too.

Verified facts the tickets get wrong, for the record:

- "Right-drag": button 2 only matters while `active_id != null` (a polyline
  in progress), where mouseup finishes it. There is no drag to preserve;
  the rule is simply "no menu while an annotation is in progress".
- "Annotation list filters by class only": it filters deprecated +
  defocused (`focus_active_class`). Isolation composes with the defocus
  gate, not a separate class filter.
- ULabel has no annotation-change events for hosts to reuse.

### Phase 228 - body-drag move, ring removal

- [x] 228.1 `get_edit_candidates` reports whether `best` is a *containing*
  hit (exact test passed) vs the near-miss box fallback; `suggest_edits`
  carries it onto `move_candidate`. Body-move must require a containing
  hit or clicking near a polygon on empty canvas would drag it.
- [x] 228.2 `get_drag_key_start`: for button 0 on the canvas of an editable
  subtask, after the existing ctrl (pan) / shift (zoom) / read-only checks:
  Alt held -> `"annotation"`; `move_candidate` is a
  containing hit and `allow_body_move` -> `"move"`; else `"annotation"`.
  Delete the `.movable` branch. `.editable` (vertex handle) is a different
  target element, so vertex precedence is unchanged.
- [x] 228.3 Config: `allow_body_move: boolean = true`. Alt is hardcoded as
  the draw-over modifier (a `force_draw_modifier` option was dropped:
  ctrl/meta/shift are claimed by pan/zoom first, and the keybinds toolbox
  can't record a bare modifier). Listed as a non-configurable
  "Alt + Click Drag" entry in the Keybinds toolbox item when
  `allow_body_move` is on.
- [x] 228.4 Remove the ring: move/reid/delete anchors and their click
  listeners, the `mcm` / `can_reassign` toggling in
  `show_global_edit_suggestion`, the ring CSS. Keep
  `#global_edit_suggestion__{key}` as the zero-height anchor the confidence
  card is positioned against, so the Phase 0 clamp/flip code survives with
  a new clearance: half the containing box's on-screen height plus the gap
  (what item 10 did before the ring hug). Update `confidence_card.test.js`,
  the two e2e flip specs, and the `class_allowed_modes.test.js` fixture.
  Also dropped the `force_refresh` param of `suggest_edits` (its only job
  was the ring-hover guard) and the `gedit-target` class.
- [x] 228.5 Remove the hover pie thumbnail: drop the
  `show_id_dialog(..., thumbnail = true)` call and the thumbnail plumbing it
  fed (`idd_thumbnail` guards in `handle_mouse_down` / `handle_mouse_move` /
  `handle_wheel`, the annotation-list mouseleave special case). The
  clicked-open pie stays for 229's Change class. Remove `idd_thumbnail`
  state only if nothing else reads it after this.
- [x] 228.6 No-op click: `finish_move` with zero diff pops the `begin_move`
  **directly** (not via `undo(this, true)`: that would push a no-op onto the
  redo stack and, via `record_action`, had already wiped the user's redo
  stack and flipped `state.edited`). `begin_move` snapshots `edited` +
  `undone_stack` into `state.move_snapshot`; the zero-diff path restores
  them and the annotation's `last_edited_*`.
- [x] 228.7 Annotation list hover still calls `show_global_edit_suggestion`
  for the outline + card; confirm nothing there referenced the buttons.
- [x] 228.8 Tests: jest `tests/body_move.test.js` for `get_drag_key_start`
  decisions (containing hit -> move, near-miss -> annotation, modifier ->
  annotation, read-only -> null, `allow_body_move: false` -> annotation,
  delete modes -> annotation) and the zero-diff pop; e2e
  `tests/e2e/body-move.spec.js`: drag a bbox / point / polygon body and
  assert translated geometry, undo restores, vertex drag still edits one
  vertex, read-only drag is inert. `read-only.spec.js` asserts no
  `.movable` / ring elements rendered. E2E runs in CI only (local
  Playwright blocked).
- [x] 228.9 Docs: `api_spec.md` (new config, stale hover-dialog mentions;
  README has no interaction docs), CHANGELOG `[0.29.0]` breaking-change
  entries.
- [x] 228.10 Move affordance: `suggest_edits` toggles `movable_hover`
  (`cursor: move`) on the front canvas when `is_body_move_start` would
  return true for the hover; cleared in `hide_edits`.

### Phase 229 - right-click context menu

- [x] 229.1 New `src/context_menu.ts` (free functions + thin `ULabel`
  methods, like `active_class.ts`): `show_context_menu(annid, client_x,
  client_y)`, `hide_context_menu()`, `is_context_menu_open()`. One
  fixed-position `div` under the container, z-index above the dialogs.
  Built with DOM APIs / `textContent`, never `innerHTML` with annotation
  data. Open state lives in `ulabel.state.context_menu_annid`.
- [x] 229.2 Trigger: `contextmenu` listener on the annbox. When
  `active_id != null` (draw in progress) do nothing new - the existing
  `"right"` mouseup path finishes a polyline. Otherwise, if
  `edit_candidate` is set open the menu for it; else close any open menu.
  Same listener on `.annotation-list-item`, keyed off `data-annotation-id`.
  Note: the preceding mousedown already closed any open menu and cleared
  the hover, so both listeners re-resolve the target first (annbox via
  `suggest_edits(event)`, list via a new private `highlight_from_list`).
- [x] 229.3 Items and visibility: Change class (hidden when read-only or
  `_get_compatible_class_ids(ann).length < 2`), Delete (hidden when
  read-only), Details (always). On a read-only subtask only Details shows.
- [x] 229.4 Actions: Change class -> hide menu, `show_id_dialog(cx, cy,
  annid, false)` at the containing-box centre (goes through
  `handle_id_dialog_click`, so undo + the 9.6 mode gate come for free).
  Delete -> `delete_annotation(annid)`. Details -> 229.5.
- [x] 229.5 Details panel: replaces the menu content in place; rows for id,
  class name (+ id), spatial type, `last_edited_by`, `last_edited_at`, then
  one row per `annotation_meta` key (non-primitive values
  `JSON.stringify`'d). Read-only, no inputs.
- [x] 229.6 Close on: any action, Escape (first branch of the keydown
  handler), mousedown outside the menu, wheel / rezoom, `set_subtask`,
  `_swap_subtask_annotations`, `delete_annotation` of the target,
  `destroy()`. Implemented as: `handle_mouse_down` closes the menu and
  swallows that click; document `mousedown.ulabel`; `rezoom`;
  `reset_interaction_state` (covers swap + destroy); `set_subtask`;
  `delete_annotation`. Scope expansion: Escape now also closes a
  clicked-open id dialog, which previously had no dismissal path.
- [x] 229.7 Keep the target highlighted while the menu is open: the list's
  `mouseleave` and the annbox `mouseleave` currently clear
  `edit_candidate` and hide the outline; guard both on
  `is_context_menu_open()`, and clear on menu close instead. Also guarded
  the list `mouseenter` and the non-drag `handle_mouse_move` branch.
- [x] 229.8 Tests: jest for visibility rules, close conditions, delete via
  menu records an undoable action, details escapes text; e2e on a
  two-class demo: right-click -> Change class -> pie -> class changes and
  `get_annotations()` reflects it, undo reverts; right-click list entry ->
  Delete removes from canvas and list, undo restores; right-click mid
  polyline still finishes it and opens no menu.
  (`tests/context_menu.test.js`, `tests/e2e/context-menu.spec.js`; e2e
  verified locally on chromium.)
- [x] 229.9 Docs: README section, CHANGELOG, `index.d.ts` for the three
  methods. README has no interaction docs, so the shortcut and the three
  methods went into `api_spec.md` instead.

### Phase 230 - isolate one annotation from the list

- [x] 230.1 `state.isolated_annid: string | null` per subtask (type in
  `subtask.ts`, initialised alongside `focused` state).
- [x] 230.2 Public `isolate_annotation(annotation_id | null, subtask_key?)`
  + `index.d.ts`: rejects unknown / deprecated ids with a quiet warning,
  writes the state, drops `hovered_annid` and `fly_to_idx`, redraws and
  `toolbox.redraw_update_items()`, fires `config.on_isolate_change?.(
  subtask_key, annotation_id | null)` only on actual change.
  Lives in new `src/isolate.ts` (like `active_class.ts`). Also drops
  `edit_candidate` / `move_candidate` and closes the context menu; added
  `get_isolated_annotation_id(subtask_key?)` for the list UI and hosts.
- [x] 230.3 Gates: extend `is_annotation_defocused` to also return true for
  "isolated-out" (another annotation is isolated in that subtask), which
  covers hover, Tab, fly-to, the list, active-class hover and bulk delete
  in one place. Drawing must *hide* rather than dim: early-return in
  `draw_annotation` and skip in the defocused-pass collection. Explicitly
  not in the bitmask geometry paths (same carve-out as focus).
- [x] 230.4 Clears: `set_subtask` (outgoing subtask),
  `_swap_subtask_annotations`, `delete_annotation` of the isolated id,
  Escape (after the context-menu branch, before the in-progress ones).
  View-only: no `record_action`, `state.edited` untouched.
  Added: creating a new annotation (`begin_annotation`, `create_annotation`,
  `create_nonspatial_annotation`, `create_bitmask_annotation`) also clears,
  otherwise the new annotation would be drawn hidden. Escape branch sits
  after the id-dialog dismissal.
- [x] 230.5 Annotation list UI: per-entry isolate icon button
  (`stopPropagation` so click-to-fly is intact; active state styled), and a
  "Show all" button in the header while isolated. While isolated the list
  shows only that entry (falls out of the 230.3 gate). Eye SVG icon;
  clicking the active button clears.
- [x] 230.6 Tests: `tests/isolate.test.js` for state write, draw skip,
  hover skip, each clear path, callback fires only on change,
  `get_annotations()` length unchanged, isolated + defocused class draws
  nothing; e2e on a 20+ annotation demo per the ticket's acceptance list
  (isolate -> only it drawn -> delete via context menu -> isolation clears).
  `tests/e2e/isolate.spec.js` loads a 24-box grid via `set_annotations`
  on multi-class.html and checks painted-pixel counts; the `set_subtask`
  and `set_annotations` clears are covered there (need full init), the
  rest in jest. Verified locally on chromium.
- [x] 230.7 Docs: README (control, method, callback), CHANGELOG. README has
  no interaction docs; went into `api_spec.md` (AnnotationList section,
  methods, `on_isolate_change`) and CHANGELOG.

### PR review fixes (PR_REVIEW_0.29.0.md, all four findings confirmed)

- [x] F1 Zero-diff `finish_move` vs `undo()`: `undo()` pops `begin_move`,
  pushes it back, `finish_action` -> `finish_move` pops it again (zero diff)
  and swaps `actions.undone_stack`; `undo()` then pops the *previous* action
  (or `undefined` -> TypeError) into a detached redo array. Fix: have
  `finish_action` report whether the action was dropped and bail out of
  `undo()`; restore the snapshot's redo stack in place rather than by
  reference swap. Tests: Ctrl+Z mid stationary click with and without
  prior history, redo still works. Done: `undo()` bails when the
  top-of-stack action is no longer the undo candidate; `finish_move`
  restores `undone_stack` in place.
- [x] F2 Body move for `contour`, `tbar`, `bbox3`: `get_edit_candidates`
  has no exact test for them, so `containing` is never true and
  `is_body_move_start` refuses. Add: contour -> near-stroke like polyline;
  tbar -> near either segment; bbox3 -> inside x/y box. Tests in
  `tests/body_move.test.js`. Done (`GeometricUtils.tbar_cross_segment`
  shared with `draw_tbar`).
- [x] F3 Stale `isolated_annid` after undoing creation: only
  `delete_annotation` clears it; `create_annotation__undo` and
  `begin_annotation__undo` go through `remove_annotation_from_access_and_ordering`.
  Clear there (with `on_isolate_change(null)` + full redraw). Test:
  create -> isolate -> undo -> others visible, callback got null. Done
  (jest + e2e).
- [x] F4 Details panel: re-run `position_menu` after `render_details` and
  add `max-height` + `overflow-y: auto` to `.ulabel-context-menu`. Tests:
  details near the bottom edge stays in the viewport; tall metadata scrolls.
  Done (`box-sizing: border-box` needed so the border fits in `max-height`).
- [x] F5 lint + build + jest + affected e2e; CHANGELOG bullet for F2
  (contour/tbar/bbox3 move) - F1/F3/F4 are fixes to unreleased code.
  Done: lint clean, jest 341/341, context-menu + isolate e2e 17/17.
- [x] F6 (re-review) `finish_annotation__undo` deprecates rather than
  removes, so isolation outlived an undone polygon/polyline. Clear it
  there too. Tests: jest + e2e (draw polygon -> isolate -> Ctrl+Z).
- [x] F7 (re-review) `rebuild_containing_box` now includes the tbar
  crossbar endpoints so the preliminary gate no longer rejects crossbar
  hits. Tbar unit test builds the box through production code and hits
  the crossbar well outside the stem padding. jest 342/342.
- [x] F8 (re-review) Bitmask paths deprecate without `delete_annotation`
  (first-stroke undo, full erasure in `finish_bitmask`, erasure redo,
  overwrite victims incl. other subtasks). New
  `release_isolation_if_deprecated(annotation_id, subtask_key)` called at
  each `mark_deprecated(..., true)` site. Tests: 4 jest cases in
  `tests/isolate.test.js`; e2e "Bitmask isolation lifecycle" in
  `tests/e2e/bitmask.spec.js` with real brush dabs + Ctrl+Z / Ctrl+Shift+Z.
  jest 346/346, bitmask e2e 15/15.
- [x] F9 GHA e2e "shift-hover on an existing polygon starts a new complex
  layer" failed on every browser: the `handle_mouse_move` branch required
  `idd_visible`, which only the removed hover-ring thumbnail set. Now
  gated on `edit_candidate` pointing at a polygon. keybind e2e 16/16.

### Release

- [x] R1 CHANGELOG `[0.29.0]` section covering 228/229/230 plus the
  confidence-card fix already on the branch.
- [x] R2 `package.json` version bump to 0.29.0 (done by user).
- [ ] R3 lint + build + jest + e2e green; PR `release/0.29.0` -> `main`,
  tag `v0.29.0`.
- [x] R4 Update CVML-228 / 229 / 230 descriptions to match the decisions
  above (bitmask in scope, ring removed, no host hook, no change events).
  Done 2026-09-28; CVML-236 still says "details-only on read-only layers"
  and mentions the ring-less hover only implicitly - revisit when adopting.

## Plan: submit-button filtering for model-registry (CVML-248, ships in 0.29.0)

Two optional fields on `ULabelSubmitButton`, per button:

- `subtasks?: string[]` whitelist of subtask keys in the payload (mirrors
  `ClassCounterConfig.subtasks`). Default all.
- `edits_only?: boolean` reduce each subtask to what differs from what the
  host loaded: (1) new and not deprecated, (2) loaded and now deprecated,
  (3) loaded and any submitted field changed (incl. un-deprecation).

Design decisions (verified against `release/0.29.0`, audit 2026-09-29):

- "Loaded" = `resume_from` **and** `set_annotations` /
  `set_annotations_batch`; all go through `process_resume_from`.
- Modification is detected via `last_edited_at`. `record_action` stamps
  the named annotation and `undo_action` restores `prev_timestamp`; every
  single-annotation edit already routes through it. Audit found three
  mutations that bypass the stamp and must be fixed first (S0):
  1. `delete_annotations_in_polygon` / `_in_bbox` victims
     (`deprecated_ids`, `modified_annotations`); the action names the
     delete polygon, which is then removed, so redo stamps nothing.
  2. `resolve_bitmask_overlap` overwrite victims (`other_edits`), possibly
     in other subtasks, incl. `bitmask_stroke__undo/__redo`.
  3. Non-spatial note textarea writes `text_payload` directly
     (`listeners.ts`), no action, not undoable.
  Filter deprecation (confidence slider, `distance_from_row`) is not a
  human edit and stays unstamped on purpose.
- Fix shape: optional `affected: {annotation_id, subtask_key}[]` on the
  raw action. `record_action` stamps each (any subtask) and stores their
  prev edit info on the action; `undo_action` restores them. Text notes
  get an `edit_text_payload` action (old -> new) on `change`.
- `process_resume_from` records each loaded id's `last_edited_at` in a
  subtask-level `annotations.loaded_edited_at` map (a non-enumerable
  per-annotation property was rejected: undo paths replace annotation
  objects). In-session creations have no entry.
- Single inclusion rule in `SubmitButtons.build_submit_payload`:
  `loaded_at === undefined ? !deprecated : last_edited_at !== loaded_at`.
  Yields exactly the three categories; a loaded annotation left alone or
  hidden only by a filter is omitted; undone edits drop out because undo
  restores the loaded stamp.
- Open: a button-less accessor for the same payload (autosave). Not until
  model-registry asks.
- Note: non-spatial annotations are skipped from the submit payload by
  pre-existing code, so text-note edits are undoable/stamped but never
  reach the hook.

- [x] S0 timestamp audit fixes: `affected` on `record_action`/`undo_action`
  + use in `bitmask_stroke` and `delete_annotations_in_polygon` (incl.
  redo); `edit_text_payload` action; jest: victims stamped on do/redo and
  restored on undo across subtasks, text note stamped and undoable.
- [x] S1 `loaded_edited_at` in `process_resume_from`; jest: set for
  resume_from and set_annotations, absent for in-session creations.
- [x] S2 `subtasks` whitelist in `SubmitButtons` (unknown keys warn).
- [x] S3 `edits_only` inclusion rule in `SubmitButtons`.
- [x] S4 jest (`tests/submit_payload.test.js`): legacy payload, whitelist,
  none / new / delete / reclassify / undo / redo / delete-polygon carve /
  cross-subtask bitmask carve / filter-hidden / set_annotations rebaseline.
- [x] S5 e2e (`demo/submit-payload.html`, `tests/e2e/submit-payload.spec.js`):
  two subtasks, one button per option, payload asserted through the hook.
- [x] S6 `index.d.ts`, `api_spec.md` submit-button section, CHANGELOG.
- [x] Test infra: `PORT` env var for demo.js/Playwright; demo image served
  locally (`demo/cs-demo-0.png`) so e2e no longer depends on S3/Zscaler.
