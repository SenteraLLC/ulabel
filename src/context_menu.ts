/**
 * Right-click context menu for annotations.
 *
 * One fixed-position element per ULabel instance, mounted under the container
 * and rebuilt on every open. Actions route through the same `ULabel` methods
 * the keybinds use (`show_id_dialog`, `delete_annotation`) so undo and the
 * per-class mode gate are unchanged. While the menu is open the target stays
 * the hover candidate; closing clears it.
 */

import type { ULabel } from "../index";
import { ULabelAnnotation } from "./annotation";
import { get_annotation_class_id } from "./annotation_operators";

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

function add_item(menu: HTMLDivElement, label: string, icon_svg: string, on_click: () => void): void {
    const item = document.createElement("div");
    item.className = `${MENU_CLASS}-item`;
    const icon = document.createElement("span");
    icon.className = `${MENU_CLASS}-item-icon`;
    icon.innerHTML = icon_svg;
    const text = document.createElement("span");
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
    add_detail_row(menu, "type", annotation.spatial_type);
    add_detail_row(menu, "edited by", annotation.last_edited_by);
    add_detail_row(menu, "edited at", annotation.last_edited_at);
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
 * "Copy to" / "Move to" / "Delete from" entry. One eligible subtask collapses to a flat
 * "<label> <name>" item; several open an in-place list of subtask names. A `count_of`
 * above 1 is shown as "<verb> <n> <rest> <name>" or "<name> (<n>)".
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
): void {
    const name_of = (key: string) => ulabel.subtasks[key].display_name;
    if (target_keys.length === 1) {
        const key = target_keys[0];
        const count = count_of(key);
        const [verb, ...rest] = label.split(" ");
        const text = count > 1 ? `${verb} ${count} ${rest.join(" ")}` : label;
        add_item(menu, `${text} ${name_of(key)}`, icon_svg, () => on_pick(key));
        return;
    }
    add_item(menu, `${label}\u2026`, icon_svg, () => {
        menu.replaceChildren();
        for (const key of target_keys) {
            const count = count_of(key);
            add_item(menu, count > 1 ? `${name_of(key)} (${count})` : name_of(key), icon_svg, () => on_pick(key));
        }
        position_menu(menu, client_x, client_y);
    });
}

/**
 * Open the menu for an annotation in the current subtask at a viewport
 * position. Items: Change class (editable subtask with at least two
 * compatible classes), Copy to / Move to (another writable subtask has a
 * compatible class; Move to only on an editable subtask), Erase from (a
 * bitmask, where another writable subtask holds bitmask counterparts, see
 * `find_counterparts`), Delete from (another writable subtask holds
 * counterparts; the count shows when above 1), Delete (editable
 * subtask), Isolate / Show all (always; view-only), Details (always).
 *
 * @returns whether the menu was shown
 */
export function show_context_menu(ulabel: ULabel, annid: string, client_x: number, client_y: number): boolean {
    const subtask = ulabel.get_current_subtask();
    const annotation = subtask.annotations.access[annid];
    if (annotation == null || annotation.deprecated) {
        hide_context_menu(ulabel);
        return false;
    }
    const menu = ensure_menu_element(ulabel);
    if (menu == null) return false;
    menu.replaceChildren();

    const read_only = ulabel.is_current_subtask_read_only();
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
        if (key === source_key || ulabel.subtasks[key].read_only === true) continue;
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
    const remove = (target_key: string, erase: boolean) => {
        hide_context_menu(ulabel);
        ulabel.delete_counterparts(annid, source_key, target_key, erase);
    };
    if (annotation.spatial_type === "bitmask") {
        const erase_targets = Object.keys(counterparts).filter((key) => counterparts[key].some(
            (id) => ulabel.subtasks[key].annotations.access[id].spatial_type === "bitmask",
        ));
        if (erase_targets.length > 0) {
            add_subtask_picker(ulabel, menu, "Erase from", ICON_DELETE, erase_targets, client_x, client_y, (key) => remove(key, true));
        }
    }
    const delete_targets = Object.keys(counterparts);
    if (delete_targets.length > 0) {
        const count_of = (key: string) => counterparts[key].length;
        add_subtask_picker(ulabel, menu, "Delete from", ICON_DELETE, delete_targets, client_x, client_y, (key) => remove(key, false), count_of);
    }
    if (!read_only) {
        add_item(menu, "Delete", ICON_DELETE, () => {
            hide_context_menu(ulabel);
            ulabel.delete_annotation(annid);
        });
    }
    // isolate_annotation closes the menu itself
    const is_isolated = subtask.state.isolated_annid === annid;
    add_item(menu, is_isolated ? "Show all" : "Isolate", ICON_ISOLATE, () => {
        ulabel.isolate_annotation(is_isolated ? null : annid);
    });
    add_item(menu, "Details", ICON_DETAILS, () => render_details(ulabel, menu, annotation, client_x, client_y));

    ulabel.state.context_menu_annid = annid;
    position_menu(menu, client_x, client_y);
    return true;
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
