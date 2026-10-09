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
- [x] R1 review: `edit_type`/`deprecated` in `edits_only` derive from
  `deprecated_by.human`, not the filter aggregate (`classify_edit`).
- [x] R2 review: a loaded annotation erased to empty geometry still yields
  a `"deleted"` record (legacy payload unchanged).
- [x] R3 review: `finish_annotation` carries `prev_timestamp`/`prev_user`
  from the collapsed `begin_brush`/`start_complex_polygon` action so undo
  restores the loaded stamp.
- [x] R4 review: shift-hover complex-layer start gated on read-only.
  Jest for R1–R3 in `tests/submit_payload.test.js`; e2e for R4 in
  `tests/e2e/read-only.spec.js`.
- [x] R5 review: nonspatial/delete-mode skip moved before geometry access
  (null `spatial_payload` crashed legacy submit). Jest legacy + edits_only
  note cases; e2e legacy Submit on read-only demo.
- [x] R6 review: `record_action` treats an explicit `prev_timestamp: null`
  as an override (null loaded baseline), only `undefined` falls through.
  Jest collapsed-layer undo now parameterized over string/null baseline.
- [x] Fix `set_id_dialog_payload_nopin` 0/0 → NaN pie radius when the
  delete class (index -1) is selected in a single-class subtask. Jest in
  `tests/class_focus.test.js`.

## Plan: copy/cut annotations between subtasks (CVML-261, ships in 0.29.0)

Decisions (agreed with the user, see the ticket for the full spec):

- Eligible target: any other subtask that is not read-only and has at
  least one class whose allowed modes include the annotation's
  `spatial_type`. Spatial annotations only. Copy from a read-only source
  is allowed; cut is not.
- Context menu: "Copy to" / "Move to" list the eligible targets. One
  target collapses to "Copy to <name>". No targets → items hidden. The
  list opens as an in-place drill-down (same pattern as Details), not a
  hover submenu.
- Keybinds: native `copy` / `cut` / `paste` DOM events (not remappable),
  ignored while focus is in an input/textarea. Copy/cut act on the hovered
  `edit_candidate`; paste goes to the current subtask. Same-subtask paste
  offsets by `PASTE_OFFSET_PX` (20 image px) so the copy is visible.
- Class: same class id if compatible, else the target's active class, else
  the first compatible class. With more than one compatible class the
  pasted annotation gets the class pie (switching to the target subtask
  first when needed). No compatible class → warn, no paste.
- Copy carries everything except `id`, `subtask_key`, class payload,
  deprecation, stamps and `edit_type`; bitmasks are re-encoded to RLE.
- Undo: cut = `delete_annotation` on the source stream; paste = new
  `paste_annotation` action recorded on the TARGET stream (undo removes
  the copy, redo re-adds it from the stored annotation). `record_action`
  gains an optional `subtask_key` for that.
- System clipboard envelope `{ ulabel_annotation: 1, image_width,
  image_height, annotation }`; paste prefers `clipboardData` when the
  dimensions match, else the in-memory clipboard; mismatch warns.

- [x] S1 core: `paste_annotation` / `copy_annotation_to_subtask` in
  `index.js`, `__undo` / `__redo`, `record_action` subtask targeting,
  `ULabelActionType` in `index.d.ts`.
- [x] S2 context menu "Copy to" / "Move to" drill-down.
- [x] S3 `copy` / `cut` / `paste` listeners + class-pie flow.
- [x] S4 public API `copy_annotation(annid, target_subtask_key, class_id?)`
  + `index.d.ts`.
- [x] S5 jest (`tests/copy_annotation.test.js`) + e2e
  (`tests/e2e/copy-annotation.spec.js`).
- [x] S6 `api_spec.md`, CHANGELOG.
- [x] R1 review: `move_annotation__undo` prunes the target's stream and
  undone stack of the copy's actions (`remove_recorded_events_for_annotation`
  takes a subtask key); `delete_annotations_in_polygon__undo` skips missing ids.
- [x] R2 review: `_insert_pasted_annotation` releases the target's isolation
  like other creation paths.
- [x] R3 review: `_discard_moved_copy` follows later `move_annotation`
  actions on the copy recursively so chained moves leave no orphan.
- [x] Repeat pastes cascade: envelope `paste_counts` per target subtask
  scales `PASTE_OFFSET_PX`; reset by a new copy/cut. Envelope `copy_id`
  keys the in-memory count cache.
- [x] Delegated click handler on `#container a[href="#"]` calls
  `preventDefault` so ULabel's anchor buttons never navigate to `#`.
- [x] Paste class: `match_paste_class_id` matches by id then name (envelope
  `source_class_name`); the class pie only opens when neither matched and no
  explicit class was given.
- [x] `assign_annotation_id` returns early (hides the pie, clears suggestions)
  when the picked payload equals the current one, so no no-op action is
  recorded.

## CVML-283: cross-subtask paste follow-ups (0.29.0)

- [x] `paste_class_choice` config (default true): off, menu copy and ctrl+v
  never open the pie; `resolve_paste_class_id` picks the class.
- [x] `paste_switch_to_target` config (default false) + `set_/get_` API:
  menu copy/move calls `set_subtask(target)` after the paste (and after a
  move is recorded on the source).
- [x] Provenance: `paste_annotation(..., source_key)` stamps
  `annotation_meta.copied_from`; `find_pasted_copy` scans the target for a
  live copy. Context menu `confirm()`s a repeat copy/move; ctrl+v is exempt.
- [x] Menu copy/move also arms the clipboard (in-memory + `navigator.clipboard`)
  with `paste_counts[target] = 1`.
- [x] Tests (jest + e2e), api_spec, index.d.ts, CHANGELOG.
- [x] Review: envelope `copied_at`; paste picks the newer of system vs
  in-memory when `copy_id`s differ (failed `writeText` left a stale system
  payload). `find_pasted_copy` skips only `deprecated_by.human`, not
  filter-hidden copies.

## CVML-286: on_annotation_change host callback (0.29.0)

Agreed deviations from ticket: single object arg (not 4 positional), one call
per action with `affected` list (no fan-out), `begin_*` suppressed on "do",
`edit_text_payload` excluded, `previous_classification_payloads` for id changes.

- [x] Config: `on_annotation_change` (null) and
  `on_annotation_change_in_progress` (false); `ULabelAnnotationChange` type.
- [x] `actions.ts`: `emit_annotation_change` at end of `record_action`
  ("do"/"redo") and after the undo listener ("undo"); try/catch →
  `log_message(WARNING)`. `continue_*` only with the flag; `begin_*`,
  `start_complex_polygon`, `begin_brush`, `create_nonspatial_annotation`
  skipped on "do" only; `edit_text_payload` never. Off-stream recordings
  (the delete inside a move) are sub-steps and skipped, except
  `finish_edit`/`finish_move`.
- [x] Jest (`tests/on_annotation_change.test.js`): do/undo/redo for
  create/delete/id-change (previous payloads oriented per kind); edit and
  move flows (begin_* silent on do, fire on undo/redo; zero-diff click
  silent); affected for paste/move/bitmask; continue_* gated;
  edit_text_payload and set_annotations silent; callback exception logged.
- [x] Docs: index.d.ts, api_spec, CHANGELOG.
- [x] Full jest + chromium e2e pass.
- [x] Review: off-stream `finish_annotation` (bbox/point/contour/tbar) is
  reported; polygon `simplify`/`merge` are silent on "do" (the collapsed
  `finish_annotation` carries the final geometry). A redone
  `begin_annotation` passes `redoing` into `finish_annotation` so its
  off-stream finish is not reported twice. Tests drive real
  begin/continue/finish flows and assert geometry seen inside the callback.

## CVML-287: runtime read-only toggle + enforcement gaps (0.29.0)

- [x] `set_subtask_read_only(subtask_key, read_only)`: unknown key warns,
  same value no-ops; going read-only on the current subtask completes an
  active drag, discards in-progress work, disables the brush, closes the
  ID dialog/context menu and clears edit/move candidates; re-renders the
  subtask's non-spatial rows. No action, no edited flag, no callbacks.
- [x] Gates: `toggle_brush_mode`/`toggle_erase_mode`, brush-circle drag key,
  user undo/redo (current subtask or any `affected` subtask read-only),
  non-spatial row change/delete/reclf handlers.
- [x] Docs: index.d.ts, api_spec, CHANGELOG.
- [x] Jest (`tests/read_only_toggle.test.js`).
- [x] Playwright: brush bypass, toggle round-trip, mid-polygon toggle,
  non-spatial rows follow the toggle. Demo gained Brush + a toggle button.
- [x] Lint + build; targeted tests; browser check via demo; full suite.

## Linked counterparts: Delete/Erase from <subtask> + duplicate warning (0.29.0)

Decisions: link by a host meta key (no geometry matching). Value is a string
or string[]; any shared value links. "Erase from" for bitmask sources,
"Delete from" otherwise; any writable target; copy warns when linked.

- [x] Config `annotation_link_meta_key` (null); `find_counterparts(annid,
  source_key, target_key)` = `copied_from` copies + shared link values,
  live (not human-deprecated) only.
- [x] Copies drop the link key from `annotation_meta`.
- [x] `delete_counterparts(annid, source_key, target_key)`: delete linked
  vector annotations, or subtract a bitmask source from linked bitmasks
  (emptied → deprecated); one action recorded on the target stream with
  `affected`; undo/redo.
- [x] Context menu "Delete from" / "Erase from" for writable targets with
  counterparts; copy/move `confirm()` when counterparts exist.
- [ ] Jest + e2e (new e2e test not yet run).
- [x] Docs: index.d.ts, api_spec, CHANGELOG.
- [ ] Lint + build; targeted tests; full jest + chromium e2e (full suites skipped for now).

## Edit highlight (0.29.0, no ticket yet)

Reuse the hover outline: drawn behind the shape when not hovered, colored by
`SubmitButtons.classify_edit()` against `loaded_edited_at` (same rule as
`edits_only` submit). Hover (white) wins. One global toggle, off by default.
Spatial annotations only.

Phase 1 — core (keybind + API):
- [x] Config: `highlight_edits` (false, initial state),
  `highlight_created_color` / `highlight_modified_color` (null → complementary
  hue of the class color; `#ffd400` for achromatic classes),
  `toggle_highlight_edits_keybind` ("h"), `on_highlight_edits_change`.
- [x] `get_annotation_outline_color(annotation, subtask)`: hovered → white;
  toggle on + spatial + created/modified → its color; else null.
  `draw_annotation` resolves it once and passes it to every `draw_*`.
- [x] Bitmask: `get_bitmask_outline(render, color)` caches per color.
- [x] `record_action` redraws `affected` annotations whose outline changed
  with the stamp (they are redrawn before it: bitmask overwrite victims,
  delete polygon victims, counterpart erase).
- [x] `set_highlight_edits(enabled)` / `get_highlight_edits()`; redraw all
  subtasks on change. Keypress handler + Keybinds toolbox entry.
- [x] Jest (`tests/highlight_edits.test.js`); e2e (`highlight-edits.spec.js`).
- [x] Docs: index.d.ts, api_spec, CHANGELOG.
- [x] Full jest + chromium e2e.

Phase 2 — optional toolbox item (`AllowedToolboxItem.HighlightEdits = 14`):
- [ ] Checkbox (mirrors toggle) + two `<input type="color">` pickers
  (precedent: `RecolorActiveItem`). `set_highlight_edit_colors({ created?,
  modified? })` setter; keybind updates the checkbox.
