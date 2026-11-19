/**
 * Right-click context menu for annotations.
 *
 * One fixed-position element per ULabel instance, mounted under the container
 * and rebuilt on every open. Actions route through the same `ULabel` methods
 * the keybinds use (`show_id_dialog`, `delete_annotation`) so undo and the
 * per-class mode gate are unchanged. While the menu is open the target stays
 * the hover candidate; closing clears it.
 */

import type { BrushOverlapMode, ULabel, ULabelMergeRequest } from "../index";
import { ULabelAnnotation } from "./annotation";
import { get_annotation_class_id, get_class_confidences } from "./annotation_operators";

const MENU_CLASS = "ulabel-context-menu";
const VIEWPORT_MARGIN = 4;

// Static 16x16 stroke icons; `currentColor` follows the menu's text color
const SVG_ATTRS = `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;
const ICON_CHANGE_CLASS = `<svg ${SVG_ATTRS}><path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5z"/><circle cx="5" cy="5" r="1"/></svg>`;
const ICON_DELETE = `<svg ${SVG_ATTRS}><path d="M2.5 4h11M6 4V2.5h4V4M3.5 4l.8 9.5h7.4l.8-9.5M6.5 7v4M9.5 7v4"/></svg>`;
const ICON_DETAILS = `<svg ${SVG_ATTRS}><circle cx="8" cy="8" r="6"/><path d="M8 7.5v4M8 5v.01"/></svg>`;
const ICON_ISOLATE = `<svg ${SVG_ATTRS}><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>`;
const ICON_COPY = `<svg ${SVG_ATTRS}><rect x="5.5" y="5.5" width="8" height="8" rx="1"/><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/></svg>`;
const ICON_CUT = `<svg ${SVG_ATTRS}><circle cx="4.5" cy="11.5" r="2"/><circle cx="11.5" cy="11.5" r="2"/><path d="M6 10l7-8M10 10L3 2"/></svg>`;
const ICON_RESTORE = `<svg ${SVG_ATTRS}><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v3h3"/></svg>`;
const ICON_CLEAR = `<svg ${SVG_ATTRS}><path d="M4 4l8 8M12 4l-8 8"/></svg>`;
const ICON_MERGE = `<svg ${SVG_ATTRS}><path d="M3 2v3c0 3 5 3 5 6v3M13 2v3c0 3-5 3-5 6M6 11.5l2 2.5 2-2.5"/></svg>`;

function get_menu_element(ulabel: ULabel): HTMLDivElement | null {
    return document.getElementById(`${MENU_CLASS}__${ulabel.config.container_id}`) as HTMLDivElement | null;
}

function ensure_menu_element(ulabel: ULabel): HTMLDivElement | null {
    let menu = get_menu_element(ulabel);
    if (menu != null) return menu;
    const container = document.getElementById(ulabel.config.container_id);
    if (container == null) return null;
    menu = document.createElement("div");
    menu.id = `${MENU_CLASS}__${ulabel.config.container_id}`;
    menu.className = MENU_CLASS;
    // A mousedown inside the menu must not reach the annbox/document handlers
    menu.addEventListener("mousedown", (mouse_event) => mouse_event.stopPropagation());
    menu.addEventListener("contextmenu", (mouse_event) => mouse_event.preventDefault());
    container.appendChild(menu);
    return menu;
}

function add_item(menu: HTMLDivElement, label: string, icon_svg: string, on_click: () => void, tooltip: string | null = null): void {
    const item = document.createElement("div");
    item.className = `${MENU_CLASS}-item`;
    if (tooltip !== null) item.title = tooltip;
    const icon = document.createElement("span");
    icon.className = `${MENU_CLASS}-item-icon`;
    icon.innerHTML = icon_svg;
    const text = document.createElement("span");
    text.className = `${MENU_CLASS}-item-text`;
    text.textContent = label;
    item.appendChild(icon);
    item.appendChild(text);
    item.addEventListener("click", (click_event) => {
        click_event.stopPropagation();
        on_click();
    });
    menu.appendChild(item);
}

function add_detail_row(menu: HTMLDivElement, label: string, value: unknown): void {
    const row = document.createElement("div");
    row.className = `${MENU_CLASS}-detail`;
    const key = document.createElement("span");
    key.className = `${MENU_CLASS}-detail-key`;
    key.textContent = label;
    const val = document.createElement("span");
    val.className = `${MENU_CLASS}-detail-value`;
    val.textContent = format_detail_value(value);
    row.appendChild(key);
    row.appendChild(val);
    menu.appendChild(row);
}

function format_detail_value(value: unknown): string {
    if (value == null) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

/** Keep the menu inside the viewport, preferring to hang right/below the cursor. */
function position_menu(menu: HTMLDivElement, client_x: number, client_y: number): void {
    menu.style.display = "block";
    menu.style.left = `${client_x}px`;
    menu.style.top = `${client_y}px`;
    const rect = menu.getBoundingClientRect();
    const max_left = window.innerWidth - rect.width - VIEWPORT_MARGIN;
    const max_top = window.innerHeight - rect.height - VIEWPORT_MARGIN;
    if (rect.left > max_left) menu.style.left = `${Math.max(VIEWPORT_MARGIN, max_left)}px`;
    if (rect.top > max_top) menu.style.top = `${Math.max(VIEWPORT_MARGIN, max_top)}px`;
}

function render_details(
    ulabel: ULabel,
    menu: HTMLDivElement,
    annotation: ULabelAnnotation,
    client_x: number,
    client_y: number,
): void {
    menu.replaceChildren();
    const subtask = ulabel.get_current_subtask();
    const class_id = Number(get_annotation_class_id(annotation));
    const class_def = subtask.class_defs.find((cd) => cd.id === class_id);
    add_detail_row(menu, "id", annotation.id);
    add_detail_row(menu, "class", class_def != null ? `${class_def.name} (${class_id})` : String(class_id));
    const confidences = get_class_confidences(annotation, subtask.class_defs);
    if (confidences.length > 1) {
        add_detail_row(menu, "confidences", confidences.map((c) => `${c.name} ${c.confidence.toFixed(2)}`).join(", "));
    }
    add_detail_row(menu, "type", annotation.spatial_type);
    add_detail_row(menu, "edited by", annotation.last_edited_by);
    add_detail_row(menu, "edited at", annotation.last_edited_at);
    if (annotation.deprecated) {
        const sources = Object.entries(annotation.deprecated_by ?? {}).filter(([, value]) => value).map(([key]) => key);
        add_detail_row(menu, "deprecated by", sources.join(", "));
    }
    const meta = annotation.annotation_meta;
    if (meta != null && typeof meta === "object") {
        for (const [key, value] of Object.entries(meta)) {
            add_detail_row(menu, key, value);
        }
    }
    // The panel is taller than the item list; re-clamp from the original anchor
    position_menu(menu, client_x, client_y);
}

/**
 * "Copy to" / "Move to" / "Set class in" / "Erase pixels from" / "Delete annotations from" entry. One eligible subtask collapses to a flat
 * "<label> <name>" item; several open an in-place list of subtask names. A `count_of`
 * above 1 is shown as "<verb> <n> <rest> <name>" or "<name> (<n>)". A `noun` ([singular, plural])
 * always follows the verb: "<verb> <singular> <rest>", "<verb> <n> <plural> <rest>", or "<verb> <plural> <rest>…".
 */
function add_subtask_picker(
    ulabel: ULabel,
    menu: HTMLDivElement,
    label: string,
    icon_svg: string,
    target_keys: string[],
    client_x: number,
    client_y: number,
    on_pick: (target_key: string) => void,
    count_of: (target_key: string) => number = () => 1,
    noun: [string, string] | null = null,
    tooltip_of: ((target_key: string) => string) | null = null,
): void {
    const name_of = (key: string) => ulabel.subtasks[key].display_name;
    const tip = (key: string) => (tooltip_of === null ? null : tooltip_of(key));
    const [verb, ...rest] = label.split(" ");
    if (target_keys.length === 1) {
        const key = target_keys[0];
        const count = count_of(key);
        let text = label;
        if (noun !== null) {
            text = `${verb} ${count > 1 ? `${count} ${noun[1]}` : noun[0]} ${rest.join(" ")}`;
        } else if (count > 1) {
            text = `${verb} ${count} ${rest.join(" ")}`;
        }
        add_item(menu, `${text} ${name_of(key)}`, icon_svg, () => on_pick(key), tip(key));
        return;
    }
    const picker_label = noun === null ? label : `${verb} ${noun[1]} ${rest.join(" ")}`;
    add_item(menu, `${picker_label}\u2026`, icon_svg, () => {
        menu.replaceChildren();
        for (const key of target_keys) {
            const count = count_of(key);
            add_item(menu, count > 1 ? `${name_of(key)} (${count})` : name_of(key), icon_svg, () => on_pick(key), tip(key));
        }
        position_menu(menu, client_x, client_y);
    });
}

const ANNOTATION_NOUN: [string, string] = ["annotation", "annotations"];

function linked_phrase(count: number): string {
    return count === 1 ? "the linked annotation" : `${count} linked annotations`;
}

/** Erase pixels from: trims the linked bitmasks, keeping the rest of each. */
function erase_tooltip(ulabel: ULabel, target_key: string, count: number): string {
    const name = ulabel.subtasks[target_key].display_name;
    const rest = count === 1 ? "the rest of it stays" : "the rest of each stays";
    return `Erase the overlapping pixels from ${linked_phrase(count)} in ${name}; ${rest}.`;
}

/** Delete annotations from: removes the linked annotations whole. */
function delete_tooltip(ulabel: ULabel, target_key: string, count: number): string {
    return `Delete ${linked_phrase(count)} from ${ulabel.subtasks[target_key].display_name} entirely.`;
}

/** "<n> <name>" counts per class name, largest first, e.g. "2 Crop, 1 Soil". */
function format_class_counts(counts: Map<string, number>): string {
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, n]) => `${n} ${name}`)
        .join(", ");
}

/**
 * Merge items (see `get_merge_options`) for the given annotations. A single
 * annotation gets one item per option. For a selection, options are grouped by
 * label and target subtask (so each item undoes in one step from that subtask):
 * each annotation contributes its first option with that label there, and each
 * distinct option applies once. A label offered for several target subtasks
 * names the subtask (`<label> in <subtask>`). The text notes
 * the option count above 1, a merge that joins objects (with their class when
 * they share one), and the objects the mask overlaps per class, with a fuller
 * tooltip. When a mask overlaps other bitmasks the item opens Allow overlap /
 * Exclude other objects / Overwrite other objects (the brush overlap modes) instead.
 */
function add_merge_items(ulabel: ULabel, menu: HTMLDivElement, ids: string[], client_x: number, client_y: number): void {
    type MergeGroup = {
        label: string;
        subtask_key: string;
        merges: ULabelMergeRequest[];
        option_keys: Set<string>;
        sources: Set<string>;
        joins: number;
        join_classes: Set<string | null>;
        conflict_keys: Set<string>;
        conflict_classes: Map<string, number>;
    };
    const class_name_of = (subtask_key: string, annotation_id: string): string | null => {
        const annotation = ulabel.subtasks[subtask_key]?.annotations?.access[annotation_id];
        if (annotation == null) return null;
        return ulabel.get_class_name(Number(get_annotation_class_id(annotation)), subtask_key);
    };
    const bulk = ids.length > 1;
    const groups = new Map<string, MergeGroup>();
    for (const id of ids) {
        for (const info of ulabel.get_merge_options(id)) {
            const option_key = `${info.subtask_key}\u0000${info.id}`;
            const group_key = bulk ? `${info.subtask_key}\u0000${info.label}` : option_key;
            let group = groups.get(group_key);
            if (group === undefined) {
                group = {
                    label: info.label,
                    subtask_key: info.subtask_key,
                    merges: [],
                    option_keys: new Set(),
                    sources: new Set(),
                    joins: 0,
                    join_classes: new Set(),
                    conflict_keys: new Set(),
                    conflict_classes: new Map(),
                };
                groups.set(group_key, group);
            }
            // Each annotation offers its first option per label and target; a shared option applies once
            if (group.sources.has(id)) continue;
            group.sources.add(id);
            if (group.option_keys.has(option_key)) continue;
            group.option_keys.add(option_key);
            group.merges.push({ annotation_id: id, option_id: info.id });
            group.joins = Math.max(group.joins, info.target_ids.length);
            if (info.target_ids.length > 1) {
                for (const target_id of info.target_ids) group.join_classes.add(class_name_of(info.subtask_key, target_id));
            }
            for (const conflict_id of info.conflict_ids) {
                const conflict_key = `${info.subtask_key}\u0000${conflict_id}`;
                if (group.conflict_keys.has(conflict_key)) continue;
                group.conflict_keys.add(conflict_key);
                const name = class_name_of(info.subtask_key, conflict_id) ?? "unclassified";
                group.conflict_classes.set(name, (group.conflict_classes.get(name) ?? 0) + 1);
            }
        }
    }
    const all_groups = Array.from(groups.values());
    const targets_per_label = new Map<string, Set<string>>();
    for (const group of all_groups) {
        if (!targets_per_label.has(group.label)) targets_per_label.set(group.label, new Set());
        targets_per_label.get(group.label)!.add(group.subtask_key);
    }
    for (const group of all_groups) {
        const target_name = ulabel.subtasks[group.subtask_key]?.display_name ?? group.subtask_key;
        const label = bulk && targets_per_label.get(group.label)!.size > 1 ? `${group.label} in ${target_name}` : group.label;
        const count = group.merges.length;
        const conflict = group.conflict_keys.size > 0;
        const [only_join_class] = Array.from(group.join_classes);
        const join_class = group.join_classes.size === 1 && only_join_class != null ? `${only_join_class} ` : "";
        const notes: string[] = [];
        const tips: string[] = [];
        if (count > 1) {
            notes.push(String(count));
            tips.push(`Applies ${count} merges.`);
        }
        if (group.joins > 1) {
            notes.push(count > 1 ? `joins ${join_class}objects` : `joins ${group.joins} ${join_class}objects`);
            tips.push(count > 1 ? `Joins the touched ${join_class}objects into one.` : `Joins ${group.joins} ${join_class}objects into one.`);
        }
        if (conflict) {
            const overlaps = format_class_counts(group.conflict_classes);
            notes.push(`overlaps ${overlaps}`);
            tips.push(`Overlaps other objects (${overlaps}); choose how to resolve.`);
        }
        const text = notes.length > 0 ? `${label} (${notes.join(", ")})` : label;
        const apply = (overlap: BrushOverlapMode) => {
            hide_context_menu(ulabel);
            ulabel.apply_merge_options(group.merges, overlap);
        };
        add_item(menu, conflict ? `${text}\u2026` : text, ICON_MERGE, () => {
            if (!conflict) {
                apply("none");
                return;
            }
            menu.replaceChildren();
            const allow_tip = "Merge into the target, leaving other objects alone";
            const exclude_tip = "Merge into the target, except for pixels that already belong to another object";
            const overwrite_tip = "Merge into the target, overwriting pixels that belong to any other object";
            add_item(menu, "Allow overlap", ICON_MERGE, () => apply("none"), allow_tip);
            add_item(menu, "Exclude other objects", ICON_MERGE, () => apply("exclude"), exclude_tip);
            add_item(menu, "Overwrite other objects", ICON_MERGE, () => apply("overwrite"), overwrite_tip);
            position_menu(menu, client_x, client_y);
        }, tips.length > 0 ? tips.join(" ") : null);
    }
}

/**
 * Open the menu for an annotation in the current subtask at a viewport
 * position. Items: Change class (editable subtask with at least two
 * compatible classes), Copy to / Move to (another writable subtask has a
 * compatible class; Move to only on an editable subtask), merge options (see
 * `add_merge_items`), Set class in
 * (another writable subtask holds counterparts that can take the source's
 * class and don't have it, see `get_counterpart_class_changes`), Erase pixels from (a
 * bitmask, where another writable subtask holds bitmask counterparts, see
 * `find_counterparts`), Delete annotation(s) from (another writable subtask holds
 * counterparts; the count shows when above 1), Delete (editable
 * subtask), Isolate / Show all (always; view-only), Details (always).
 * A deprecated annotation (only reachable under deprecated focus) gets
 * Restore (see `can_restore_annotation`), Isolate / Show all, and Details.
 * A selected annotation, while more than one is selected, gets the bulk
 * items instead (see `add_selection_items`).
 *
 * @returns whether the menu was shown
 */
export function show_context_menu(ulabel: ULabel, annid: string, client_x: number, client_y: number): boolean {
    const subtask = ulabel.get_current_subtask();
    const annotation = subtask.annotations.access[annid];
    if (
        annotation == null ||
        (annotation.deprecated && ulabel.is_annotation_defocused(annotation, ulabel.get_current_subtask_key()))
    ) {
        hide_context_menu(ulabel);
        return false;
    }
    const menu = ensure_menu_element(ulabel);
    if (menu == null) return false;
    menu.replaceChildren();

    const raw_selected = ulabel.get_current_subtask().state.selected_ids;
    // The menu on an unselected annotation acts on it alone, from the canvas or the list
    if (raw_selected?.size && !raw_selected.has(annid)) ulabel.clear_selection();
    const selected = raw_selected?.has(annid) && raw_selected.size > 1 ? ulabel.get_selected_annotation_ids() : [];
    if (selected.length > 1 && selected.includes(annid)) {
        add_selection_items(ulabel, menu, annid, selected, client_x, client_y);
        ulabel.state.context_menu_annid = annid;
        position_menu(menu, client_x, client_y);
        return true;
    }

    if (annotation.deprecated) {
        if (ulabel.can_restore_annotation(annid)) {
            add_item(menu, "Restore", ICON_RESTORE, () => {
                hide_context_menu(ulabel);
                ulabel.restore_annotation(annid);
            });
        }
    } else {
        add_edit_items(ulabel, menu, annotation, annid, client_x, client_y);
    }
    // isolate_annotation closes the menu itself
    const is_isolated = subtask.state.isolated_annids?.includes(annid) ?? false;
    add_item(menu, is_isolated ? "Show all" : "Isolate", ICON_ISOLATE, () => {
        ulabel.isolate_annotation(is_isolated ? null : annid);
    });
    add_item(menu, "Details", ICON_DETAILS, () => render_details(ulabel, menu, annotation, client_x, client_y));

    ulabel.state.context_menu_annid = annid;
    position_menu(menu, client_x, client_y);
    return true;
}

/** Change class, Copy/Move to, merge options, Set class in, Erase pixels / Delete annotations from, and Delete for a live annotation. */
function add_edit_items(
    ulabel: ULabel,
    menu: HTMLDivElement,
    annotation: ULabelAnnotation,
    annid: string,
    client_x: number,
    client_y: number,
): void {
    const read_only = ulabel.is_subtask_edit_locked();
    if (!read_only && ulabel._get_compatible_class_ids(annotation).length >= 2) {
        add_item(menu, "Change class", ICON_CHANGE_CLASS, () => {
            hide_context_menu(ulabel);
            const cbox = annotation.containing_box;
            if (cbox != null) {
                ulabel.show_id_dialog((cbox.tlx + cbox.brx) / 2, (cbox.tly + cbox.bry) / 2, annid, false);
            } else {
                ulabel.show_id_dialog(0, 0, annid, true);
            }
        });
    }
    const source_key = ulabel.get_current_subtask_key();
    const counterparts: Record<string, string[]> = {};
    for (const key of Object.keys(ulabel.subtasks)) {
        if (key === source_key || ulabel.is_subtask_edit_locked(key)) continue;
        const ids = ulabel.find_counterparts(annid, source_key, key);
        if (ids.length > 0) counterparts[key] = ids;
    }
    const copy_targets = ulabel.get_copy_target_subtask_keys(annotation, source_key).filter(
        (key) => !(ulabel.config.hide_copy_to_linked && key in counterparts),
    );
    if (copy_targets.length > 0) {
        const transfer = (target_key: string, cut: boolean) => {
            hide_context_menu(ulabel);
            if (ulabel.find_counterparts(annid, source_key, target_key).length > 0) {
                const target_name = ulabel.subtasks[target_key].display_name ?? target_key;
                if (!confirm(`${target_name} already has this annotation. ${cut ? "Move" : "Copy"} it there anyway?`)) return;
            }
            // Also arm ctrl+v, counting this as the first paste into the target
            const envelope = ulabel.copy_annotation_to_clipboard(annid);
            const new_id = ulabel.copy_annotation_to_subtask(annid, source_key, target_key, null, cut, true);
            if (envelope !== null && new_id !== null) {
                (envelope.paste_counts ??= {})[target_key] = 1;
                navigator.clipboard?.writeText(JSON.stringify(envelope)).catch(() => {});
            }
        };
        add_subtask_picker(ulabel, menu, "Copy to", ICON_COPY, copy_targets, client_x, client_y, (key) => transfer(key, false));
        if (!read_only) {
            add_subtask_picker(ulabel, menu, "Move to", ICON_CUT, copy_targets, client_x, client_y, (key) => transfer(key, true));
        }
    }
    add_merge_items(ulabel, menu, [annid], client_x, client_y);
    const class_targets = Object.keys(counterparts).filter(
        (key) => Object.keys(ulabel.get_counterpart_class_changes(annid, source_key, key)).length > 0,
    );
    if (class_targets.length > 0) {
        add_subtask_picker(ulabel, menu, "Set class in", ICON_CHANGE_CLASS, class_targets, client_x, client_y, (key) => {
            hide_context_menu(ulabel);
            ulabel.set_counterparts_class(annid, source_key, key);
        });
    }
    const remove = (target_key: string, erase: boolean) => {
        hide_context_menu(ulabel);
        ulabel.delete_counterparts(annid, source_key, target_key, erase);
    };
    if (annotation.spatial_type === "bitmask") {
        const erased_of = (key: string) => counterparts[key].filter(
            (id) => ulabel.subtasks[key].annotations.access[id].spatial_type === "bitmask",
        ).length;
        const erase_targets = Object.keys(counterparts).filter((key) => erased_of(key) > 0);
        if (erase_targets.length > 0) {
            const erase_tip = (key: string) => erase_tooltip(ulabel, key, erased_of(key));
            add_subtask_picker(ulabel, menu, "Erase pixels from", ICON_DELETE, erase_targets, client_x, client_y, (key) => {
                remove(key, true);
            }, undefined, null, erase_tip);
        }
    }
    const delete_targets = Object.keys(counterparts);
    if (delete_targets.length > 0) {
        const count_of = (key: string) => counterparts[key].length;
        const delete_tip = (key: string) => delete_tooltip(ulabel, key, count_of(key));
        add_subtask_picker(ulabel, menu, "Delete from", ICON_DELETE, delete_targets, client_x, client_y, (key) => {
            remove(key, false);
        }, count_of, ANNOTATION_NOUN, delete_tip);
    }
    if (!read_only) {
        add_item(menu, "Delete", ICON_DELETE, () => {
            hide_context_menu(ulabel);
            ulabel.delete_annotation(annid);
        });
    }
}

/**
 * Bulk items for the selection, each one undo step: Change class of N (editable
 * subtask; the pie lists the clicked annotation's compatible classes and the
 * pick applies to each selected annotation that can take it), Copy N to / Move
 * N to (per target, the selected annotations it can take; Move only on an
 * editable subtask; `hide_copy_to_linked` drops ones already linked there),
 * merge options (see `add_merge_items`), Set class in / Erase pixels from / Delete annotations from (see `add_counterpart_selection_items`),
 * Delete N (editable subtask), Isolate N / Show all, and Clear selection.
 * Under deprecated focus: Restore N (the restorable ones), Isolate N / Show all, and Clear selection.
 */
function add_selection_items(
    ulabel: ULabel,
    menu: HTMLDivElement,
    annid: string,
    ids: string[],
    client_x: number,
    client_y: number,
): void {
    const read_only = ulabel.is_subtask_edit_locked();
    const source_key = ulabel.get_current_subtask_key();
    const access = ulabel.get_current_subtask().annotations.access;
    // Under deprecated focus the selection is deprecated annotations: only Restore applies
    if (ulabel.get_current_subtask().focus_deprecated) {
        const restorable = ids.filter((id) => ulabel.can_restore_annotation(id));
        if (restorable.length > 0) {
            add_item(menu, `Restore ${restorable.length}`, ICON_RESTORE, () => {
                hide_context_menu(ulabel);
                ulabel.run_action_batch(() => restorable.forEach((id) => ulabel.restore_annotation(id)));
            });
        }
        add_isolate_and_clear_items(ulabel, menu, ids);
        return;
    }
    if (!read_only && ulabel._get_compatible_class_ids(access[annid]).length >= 2) {
        add_item(menu, `Change class of ${ids.length}`, ICON_CHANGE_CLASS, () => {
            hide_context_menu(ulabel);
            const center = ulabel._get_annotations_center(ids, source_key);
            if (center !== null) ulabel.show_id_dialog(center[0], center[1], annid, false, ids);
        });
    }

    const eligible: Record<string, string[]> = {};
    const linked: Record<string, number> = {};
    for (const id of ids) {
        for (const key of ulabel.get_copy_target_subtask_keys(access[id], source_key)) {
            const is_linked = ulabel.find_counterparts(id, source_key, key).length > 0;
            if (is_linked && ulabel.config.hide_copy_to_linked) continue;
            (eligible[key] ??= []).push(id);
            if (is_linked) linked[key] = (linked[key] ?? 0) + 1;
        }
    }
    const copy_targets = Object.keys(ulabel.subtasks).filter((key) => key in eligible);
    if (copy_targets.length > 0) {
        const transfer = (target_key: string, cut: boolean) => {
            hide_context_menu(ulabel);
            const linked_count = linked[target_key] ?? 0;
            if (linked_count > 0) {
                const target_name = ulabel.subtasks[target_key].display_name ?? target_key;
                const verb = cut ? "Move" : "Copy";
                if (!confirm(`${target_name} already has ${linked_count} of these annotations. ${verb} them there anyway?`)) return;
            }
            // Also arm ctrl+v, counting this as the first paste into the target
            const envelope = ulabel.copy_annotations_to_clipboard(eligible[target_key]);
            const new_ids = ulabel.copy_annotations_to_subtask(eligible[target_key], source_key, target_key, cut, true);
            if (envelope !== null && new_ids.length > 0) {
                (envelope.paste_counts ??= {})[target_key] = 1;
                navigator.clipboard?.writeText(JSON.stringify(envelope)).catch(() => {});
            }
        };
        const count_of = (key: string) => eligible[key].length;
        add_subtask_picker(ulabel, menu, "Copy to", ICON_COPY, copy_targets, client_x, client_y, (key) => transfer(key, false), count_of);
        if (!read_only) {
            add_subtask_picker(ulabel, menu, "Move to", ICON_CUT, copy_targets, client_x, client_y, (key) => transfer(key, true), count_of);
        }
    }
    add_merge_items(ulabel, menu, ids, client_x, client_y);
    add_counterpart_selection_items(ulabel, menu, ids, client_x, client_y);
    if (!read_only) {
        add_item(menu, `Delete ${ids.length}`, ICON_DELETE, () => {
            hide_context_menu(ulabel);
            ulabel.delete_selected_annotations();
        });
    }
    add_isolate_and_clear_items(ulabel, menu, ids);
}

/** Isolate N (Show all while exactly the selection is isolated) and Clear selection. */
function add_isolate_and_clear_items(ulabel: ULabel, menu: HTMLDivElement, ids: string[]): void {
    const isolated = ulabel.get_current_subtask().state.isolated_annids ?? [];
    const is_isolated = isolated.length === ids.length && ids.every((id) => isolated.includes(id));
    add_item(menu, is_isolated ? "Show all" : `Isolate ${ids.length}`, ICON_ISOLATE, () => {
        hide_context_menu(ulabel);
        ulabel.isolate_annotations(is_isolated ? null : ids);
    });
    add_item(menu, "Clear selection", ICON_CLEAR, () => {
        hide_context_menu(ulabel);
        ulabel.clear_selection();
    });
}

/**
 * Bulk Set class in / Erase pixels from / Delete annotations from for the selection, each one
 * undo step across the selected annotations with counterparts in the target
 * (writable subtasks only). Delete shows the number of distinct counterparts it
 * removes; Erase's tooltip, the number it trims. `config.paste_switch_to_target` switches once, after the batch.
 */
function add_counterpart_selection_items(
    ulabel: ULabel,
    menu: HTMLDivElement,
    ids: string[],
    client_x: number,
    client_y: number,
): void {
    const source_key = ulabel.get_current_subtask_key();
    const access = ulabel.get_current_subtask().annotations.access;
    // Target subtask -> (selected id -> its counterparts there)
    const counterparts: Record<string, Record<string, string[]>> = {};
    for (const key of Object.keys(ulabel.subtasks)) {
        if (key === source_key || ulabel.is_subtask_edit_locked(key)) continue;
        for (const id of ids) {
            const found = ulabel.find_counterparts(id, source_key, key);
            if (found.length > 0) (counterparts[key] ??= {})[id] = found;
        }
    }
    const run_batch = (target_key: string, source_ids: string[], fn: (id: string) => string[]) => {
        hide_context_menu(ulabel);
        let changed = false;
        ulabel.run_action_batch(() => {
            for (const id of source_ids) {
                if (fn(id).length > 0) changed = true;
            }
        });
        if (changed && ulabel.config.paste_switch_to_target && target_key !== ulabel.get_current_subtask_key()) {
            ulabel.set_subtask(target_key);
        }
    };

    const class_sources: Record<string, string[]> = {};
    for (const [key, by_id] of Object.entries(counterparts)) {
        const changing = Object.keys(by_id).filter(
            (id) => Object.keys(ulabel.get_counterpart_class_changes(id, source_key, key)).length > 0,
        );
        if (changing.length > 0) class_sources[key] = changing;
    }
    if (Object.keys(class_sources).length > 0) {
        add_subtask_picker(ulabel, menu, "Set class in", ICON_CHANGE_CLASS, Object.keys(class_sources), client_x, client_y, (key) => {
            run_batch(key, class_sources[key], (id) => ulabel.set_counterparts_class(id, source_key, key, false));
        });
    }

    const erase_sources: Record<string, string[]> = {};
    for (const [key, by_id] of Object.entries(counterparts)) {
        const erasing = Object.keys(by_id).filter((id) => access[id].spatial_type === "bitmask" && by_id[id].some(
            (cid) => ulabel.subtasks[key].annotations.access[cid].spatial_type === "bitmask",
        ));
        if (erasing.length > 0) erase_sources[key] = erasing;
    }
    if (Object.keys(erase_sources).length > 0) {
        // Distinct bitmask counterparts the erase trims, for the tooltip
        const erased_of = (key: string) => new Set(erase_sources[key].flatMap((id) => counterparts[key][id].filter(
            (cid) => ulabel.subtasks[key].annotations.access[cid].spatial_type === "bitmask",
        ))).size;
        add_subtask_picker(ulabel, menu, "Erase pixels from", ICON_DELETE, Object.keys(erase_sources), client_x, client_y, (key) => {
            run_batch(key, erase_sources[key], (id) => ulabel.delete_counterparts(id, source_key, key, true, false));
        }, undefined, null, (key) => erase_tooltip(ulabel, key, erased_of(key)));
    }

    const delete_targets = Object.keys(counterparts);
    if (delete_targets.length > 0) {
        const count_of = (key: string) => new Set(Object.values(counterparts[key]).flat()).size;
        add_subtask_picker(ulabel, menu, "Delete from", ICON_DELETE, delete_targets, client_x, client_y, (key) => {
            run_batch(key, Object.keys(counterparts[key]), (id) => ulabel.delete_counterparts(id, source_key, key, false, false));
        }, count_of, ANNOTATION_NOUN, (key) => delete_tooltip(ulabel, key, count_of(key)));
    }
}

/** Close the menu and drop the hover it was holding. No-op when closed. */
export function hide_context_menu(ulabel: ULabel): void {
    if (ulabel.state.context_menu_annid == null) return;
    ulabel.state.context_menu_annid = null;
    const menu = get_menu_element(ulabel);
    if (menu != null) {
        menu.style.display = "none";
        menu.replaceChildren();
    }
    $(".annotation-list-item").removeClass("highlighted");
    ulabel.hide_and_clear_action_candidates();
}

export function is_context_menu_open(ulabel: ULabel): boolean {
    return ulabel.state.context_menu_annid != null;
}
