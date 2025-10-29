/**
 * ULabel listener utilities.
 *
 * These primarily use JQuery, within the namespace "ulabel".
 * Selectors and `.on` calls are intentionally kept in `create_ulabel_listeners`.
 * Long handlers are broken out into separate functions.
 */

import type { ULabel } from "..";
import { NightModeCookie } from "./cookies";
import { DELETE_CLASS_ID, DELETE_MODES, NONSPATIAL_MODES } from "./annotation";
import { set_local_storage_item } from "./utilities";

const ULABEL_NAMESPACE = ".ulabel";

/**
 * Handle keypress events.
 *
 * @param keypress_event Key event to handle
 * @param ulabel ULabel instance
 */
function handle_keypress_event(
    keypress_event: JQuery.KeyPressEvent,
    ulabel: ULabel,
) {
    const current_subtask = ulabel.get_current_subtask();
    switch (keypress_event.key) {
        // Create a point annotation at the mouse's current location
        case ulabel.config.create_point_annotation_keybind:
            // Only allow keypress to create point annotations
            if (current_subtask.state.annotation_mode === "point") {
                // Create an annotation based on the last mouse position
                ulabel.create_point_annotation_at_mouse_location();
            }
            break;
        // Create a bbox annotation around the initial_crop,
        // or the whole image if inital_crop does not exist
        case ulabel.config.create_bbox_on_initial_crop:
            if (current_subtask.state.annotation_mode === "bbox") {
                // Default to an annotation with size of image
                // Create the coordinates for the bbox's spatial payload
                let bbox_top_left: [number, number] = [0, 0];
                let bbox_bottom_right: [number, number] = [
                    ulabel.config.image_width,
                    ulabel.config.image_height,
                ];

                // If an initial crop exists, use that instead
                // TODO (joshua-dean): can't this just be "if (ulabel.config.initial_crop)"?
                if (ulabel.config.initial_crop !== null && ulabel.config.initial_crop !== undefined) {
                    // Convenience
                    const initial_crop = ulabel.config.initial_crop;

                    // Create the coordinates for the bbox's spatial payload
                    bbox_top_left = [initial_crop.left, initial_crop.top];
                    bbox_bottom_right = [initial_crop.left + initial_crop.width, initial_crop.top + initial_crop.height];
                }

                // Create the annotation
                ulabel.create_annotation(
                    current_subtask.state.annotation_mode,
                    [bbox_top_left, bbox_bottom_right],
                );
            }
            break;
        // Change to brush mode (for now, polygon only)
        case ulabel.config.toggle_brush_mode_keybind:
            ulabel.toggle_brush_mode(ulabel.state["last_move"]);
            break;
        // Change to erase mode (will also set the is_in_brush_mode state)
        case ulabel.config.toggle_erase_mode_keybind:
            ulabel.toggle_erase_mode(ulabel.state["last_move"]);
            break;
        // Increase brush size by 10%
        case ulabel.config.increase_brush_size_keybind:
            ulabel.change_brush_size(1.1);
            break;
        // Decrease brush size by 10%
        case ulabel.config.decrease_brush_size_keybind:
            ulabel.change_brush_size(1 / 1.1);
            break;
        case ulabel.config.change_zoom_keybind.toLowerCase():
            ulabel.show_initial_crop();
            break;
        case ulabel.config.change_zoom_keybind.toUpperCase():
            ulabel.show_whole_image();
            break;
        default:
            // TODO (joshua-dean): break this out
            if (!DELETE_MODES.includes(current_subtask.state.spatial_type)) {
                // Check for class keybinds
                for (let i = 0; i < current_subtask.class_defs.length; i++) {
                    const class_def = current_subtask.class_defs[i];
                    if (class_def.keybind !== null && keypress_event.key === class_def.keybind) {
                        const st_key = ulabel.get_current_subtask_key();
                        const class_button = $(`#tb-id-app--${st_key} a.tbid-opt`).eq(i);
                        if (class_button.hasClass("sel")) {
                            // If the class button is already selected,
                            // check if there is an active annotation, and if so, get it
                            let target_id = null;
                            if (current_subtask.state.active_id !== null) {
                                target_id = current_subtask.state.active_id;
                            } else if (current_subtask.state.move_candidate !== null) {
                                target_id = current_subtask.state.move_candidate["annid"];
                            }
                            // Update the class of the active annotation
                            if (target_id !== null) {
                                // Set the annotation's class to the selected class
                                ulabel.handle_id_dialog_click(
                                    ulabel.state["last_move"],
                                    target_id,
                                    ulabel.get_active_class_id_idx(),
                                );
                            }
                        } else {
                            // Click the class button if not already selected
                            class_button.trigger("click");
                        }
                        return;
                    }
                }
            }
            break;
    }
}

/**
 * Handle a click on a soft ID toolbox button.
 *
 * @param click_event Click event
 * @param ulabel ULabel instance
 */
function handle_soft_id_toolbox_button_click(
    click_event: JQuery.ClickEvent,
    ulabel: ULabel,
) {
    const tgt_jq = $(click_event.currentTarget);
    const pfx = "div#tb-id-app--" + ulabel.get_current_subtask_key();
    const current_subtask = ulabel.get_current_subtask();
    if (tgt_jq.attr("href") === "#") {
        const current_id_button = $(pfx + " a.tbid-opt.sel");
        current_id_button.attr("href", "#");
        current_id_button.removeClass("sel");
        const old_id = parseInt(current_id_button.attr("id").split("_").at(-1));
        tgt_jq.addClass("sel");
        tgt_jq.removeAttr("href");
        const idarr = tgt_jq.attr("id").split("_");
        const rawid = parseInt(idarr[idarr.length - 1]);
        ulabel.set_id_dialog_payload_nopin(
            current_subtask["class_ids"].indexOf(rawid),
            1.0,
        );
        ulabel.update_id_dialog_display();

        // Update the class of the active annotation,
        // except when toggling on the delete class
        if (rawid !== DELETE_CLASS_ID) {
            // Get the active annotation, if any
            let target_id = null;
            if (current_subtask.state.active_id !== null) {
                target_id = current_subtask.state.active_id;
            } else if (current_subtask.state.move_candidate !== null) {
                target_id = current_subtask.state.move_candidate["annid"];
            }

            // Update the class of the active annotation
            if (target_id !== null) {
                // Set the annotation's class to the selected class
                ulabel.handle_id_dialog_click(
                    ulabel.state["last_move"],
                    target_id,
                    ulabel.get_active_class_id_idx(),
                );
            } else {
                // If there is not active annotation,
                // still update the brush circle if in brush mode
                ulabel.recolor_brush_circle();
            }
        }

        /*
        If toggling off a delete class while still in delete mode,
        re-toggle the delete class.
        This occurs when using a keybind to change a hovered annotation's
        class while in delete mode.
        */
        if (
            old_id === DELETE_CLASS_ID &&
            DELETE_MODES.includes(current_subtask.state.annotation_mode)
        ) {
            $("#toolbox_sel_" + DELETE_CLASS_ID).trigger("click");
        }
    }
}

/**
 * Handler for ULabel keydown events.
 *
 * @param keydown_event Event to handle
 * @param ulabel ULabel instance
 * @returns Whether the event was handled
 */
function handle_keydown_event(
    keydown_event: JQuery.KeyDownEvent,
    ulabel: ULabel,
): boolean {
    const shift = keydown_event.shiftKey;
    const ctrl = keydown_event.ctrlKey || keydown_event.metaKey;
    const key_is_z = (
        keydown_event.key === "z" ||
        keydown_event.key === "Z" ||
        keydown_event.code === "KeyZ"
    );

    if (ctrl && key_is_z) {
        keydown_event.preventDefault();
        if (shift) {
            ulabel.redo();
        } else {
            ulabel.undo();
        }
        return false;
    } else {
        const current_subtask = ulabel.get_current_subtask();
        switch (keydown_event.key.toLowerCase()) {
            case "escape":
                // If in erase or brush mode, cancel the brush
                if (current_subtask.state.is_in_erase_mode) {
                    ulabel.toggle_erase_mode();
                } else if (current_subtask.state.is_in_brush_mode) {
                    ulabel.toggle_brush_mode();
                } else if (current_subtask.state.starting_complex_polygon) {
                    // If starting a complex polygon, undo
                    ulabel.undo();
                } else if (current_subtask.state.is_in_progress) {
                    // If in the middle of drawing an annotation, cancel the annotation
                    ulabel.cancel_annotation();
                }
                break;
            case ulabel.config.fly_to_next_annotation_keybind.toLowerCase():
                // For 'tab', prevent default
                if (keydown_event.key.toLowerCase() === "tab") {
                    keydown_event.preventDefault();
                }

                if (ulabel.config.fly_to_previous_annotation_keybind === null && shift) {
                    ulabel.fly_to_next_annotation(-1, ulabel.config.fly_to_max_zoom);
                } else if (!shift) {
                    ulabel.fly_to_next_annotation(1, ulabel.config.fly_to_max_zoom);
                }
                break;
            case ulabel.config.fly_to_previous_annotation_keybind.toLowerCase():
                if (ulabel.config.fly_to_previous_annotation_keybind !== null) {
                    ulabel.fly_to_next_annotation(-1, ulabel.config.fly_to_max_zoom);
                }
                break;
        }
    }
}

/**
 * Create listeners for a ULabel instance.
 * Inline handlers must be arrow functions.
 * Consider breaking out long handlers.
 *
 * @param ulabel ULabel instance
 */
export function create_ulabel_listeners(
    ulabel: ULabel,
) {
    // ================= Mouse Events in the ID Dialog =================
    const id_dialog = $(".id_dialog");
    id_dialog.on(
        "mousemove" + ULABEL_NAMESPACE,
        (mouse_event) => {
            if (!ulabel.get_current_subtask()["state"]["idd_thumbnail"]) {
                ulabel.handle_id_dialog_hover(mouse_event);
            }
        },
    );

    // ================= Mouse Events in the Annotation Container =================
    const annbox = $("#" + ulabel.config["annbox_id"]);

    // Detect and record mousedown
    annbox.on(
        "mousedown" + ULABEL_NAMESPACE,
        (click_event) => ulabel.handle_mouse_down(click_event),
    );

    // Prevent default for auxclick
    $(document).on(
        "auxclick" + ULABEL_NAMESPACE,
        (mouse_event) => ulabel.handle_aux_click(mouse_event),
    );

    // Detect and record mouseup
    $(document).on(
        "mouseup" + ULABEL_NAMESPACE,
        (mouseup_event) => ulabel.handle_mouse_up(mouseup_event),
    );

    $(window).on(
        "click" + ULABEL_NAMESPACE,
        (click_event) => {
            if (click_event.shiftKey) {
                click_event.preventDefault();
            }
        },
    );

    // Mouse movement has meaning in certain cases
    annbox.on(
        "mousemove" + ULABEL_NAMESPACE,
        (move_event) => ulabel.handle_mouse_move(move_event),
    );

    // ================= Uncategorized =================

    $(document).on(
        "keypress" + ULABEL_NAMESPACE,
        (keypress_event: JQuery.KeyPressEvent) => {
            handle_keypress_event(keypress_event, ulabel);
        },
    );

    // This listener does not use jquery because it requires being able to prevent default
    // There are maybe some hacky ways to do this with jquery
    // https://stackoverflow.com/questions/60357083/does-not-use-passive-listeners-to-improve-scrolling-performance-lighthouse-repo
    // Detection ctrl+scroll
    document.getElementById(
        ulabel.config["annbox_id"],
    ).addEventListener(
        "wheel",
        (wheel_event) => ulabel.handle_wheel(wheel_event),
    );

    // Create a resize observer to reposition dialogs
    const dialog_resize_observer = new ResizeObserver(
        () => ulabel.reposition_dialogs(),
    );

    // Observe the changes on the imwrap_id element
    dialog_resize_observer.observe(
        document.getElementById(ulabel.config["imwrap_id"]),
    );

    // Store a reference
    ulabel.resize_observers.push(dialog_resize_observer);

    // Create a resize observer to handle toolbox overflow
    const tb_overflow_resize_observer = new ResizeObserver(
        () => ulabel.handle_toolbox_overflow(),
    );

    // Observe the changes on the ulabel container
    tb_overflow_resize_observer.observe(
        document.getElementById(ulabel.config["container_id"]),
    );

    // Store a reference
    ulabel.resize_observers.push(tb_overflow_resize_observer);

    // create_soft_id_toolbox_button_listener(ulabel);
    $(document).on(
        "click" + ULABEL_NAMESPACE,
        `#${ulabel.config["toolbox_id"]} a.tbid-opt`,
        (click_event: JQuery.ClickEvent) => {
            handle_soft_id_toolbox_button_click(click_event, ulabel);
        },
    );

    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "a.tb-st-switch[href]",
        (click_event) => {
            const switch_to = $(click_event.target).attr("id").split("--")[1];

            // Ignore if in the middle of annotation
            if (ulabel.get_current_subtask()["state"]["is_in_progress"]) return;

            ulabel.set_subtask(switch_to);
        },
    );

    // Keybind to switch active subtask
    $(document).on(
        "keypress" + ULABEL_NAMESPACE,
        (keypress_event) => {
            // Ignore if in the middle of annotation
            if (ulabel.get_current_subtask()["state"]["is_in_progress"]) return;

            // Check for the right keypress
            if (keypress_event.key === ulabel.config.switch_subtask_keybind) {
                ulabel.switch_to_next_subtask();
            }
        },
    );

    $(document).on(
        "input" + ULABEL_NAMESPACE,
        "input.frame_input",
        () => ulabel.update_frame(),
    );

    $(document).on(
        "input" + ULABEL_NAMESPACE,
        "span.tb-st-range input",
        () => ulabel.readjust_subtask_opacities(),
    );

    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "div.fad_row.add a.add-glob-button",
        () => ulabel.create_nonspatial_annotation(),
    );

    $(document).on(
        "focus" + ULABEL_NAMESPACE,
        "textarea.nonspatial_note",
        () => $("div.frame_annotation_dialog.active").addClass("permopen"),
    );

    $(document).on(
        "focusout" + ULABEL_NAMESPACE,
        "textarea.nonspatial_note",
        () => $("div.frame_annotation_dialog.permopen").removeClass("permopen"),
    );

    $(document).on(
        "input" + ULABEL_NAMESPACE,
        "textarea.nonspatial_note",
        (input_event) => {
            // Update annotation's text field
            const annos = ulabel.get_current_subtask()["annotations"]["access"];
            const text_payload_anno_id = input_event.target.id.substring("note__".length);
            annos[text_payload_anno_id]["text_payload"] = input_event.target.value;
        },
    );

    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "a.fad_button.delete",
        (click_event) => {
            ulabel.delete_annotation(click_event.target.id.substring("delete__".length));
        },
    );

    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "a.fad_button.reclf",
        (click_event) => {
            // Show idd
            ulabel.show_id_dialog(
                click_event.pageX,
                click_event.pageY,
                click_event.target.id.substring("reclf__".length),
                false,
                true,
            );
        },
    );

    $(document).on(
        "mouseenter" + ULABEL_NAMESPACE,
        "div.fad_annotation_rows div.fad_row",
        (mouse_event) => {
            // Show thumbnail for idd
            ulabel.suggest_edits(
                null,
                $(mouse_event.currentTarget).attr("id").substring("row__".length),
            );
        },
    );

    $(document).on(
        "mouseleave" + ULABEL_NAMESPACE,
        "div.fad_annotation_rows div.fad_row",
        () => {
            // Show thumbnail for idd
            if (
                ulabel.get_current_subtask()["state"]["idd_visible"] &&
                !ulabel.get_current_subtask()["state"]["idd_thumbnail"]
            ) {
                return;
            }
            ulabel.suggest_edits(null);
        },
    );

    $(document).on(
        "keypress" + ULABEL_NAMESPACE,
        (keypress_event) => {
            // Check the key pressed against the delete annotation keybind in the config
            if (keypress_event.key === ulabel.config.delete_annotation_keybind) {
                // Check the edit_candidate to make sure its not null and isn't nonspatial
                const edit_cand = ulabel.get_current_subtask().state.edit_candidate;
                if (edit_cand !== null && !NONSPATIAL_MODES.includes(edit_cand.spatial_type)) {
                    ulabel.delete_annotation(edit_cand.annid);
                }
            }
        },
    );

    // Listener for id_dialog click interactions
    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "#" + ulabel.config["container_id"] + " a.id-dialog-clickable-indicator",
        (click_event) => {
            if (!ulabel.get_current_subtask()["state"]["idd_thumbnail"]) {
                ulabel.handle_id_dialog_click(click_event);
            }
        },
    );

    $(document).on(
        "click" + ULABEL_NAMESPACE,
        ".global_edit_suggestion a.reid_suggestion",
        (click_event) => {
            const crst = ulabel.get_current_subtask();
            const annid = crst["state"]["idd_associated_annotation"];
            ulabel.hide_global_edit_suggestion();
            ulabel.show_id_dialog(
                ulabel.get_global_mouse_x(click_event),
                ulabel.get_global_mouse_y(click_event),
                annid,
                false,
            );
        },
    );

    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "#" + ulabel.config["annbox_id"] + " .delete_suggestion",
        () => {
            const crst = ulabel.get_current_subtask();
            ulabel.delete_annotation(crst["state"]["move_candidate"]["annid"]);
        },
    );

    // Button to toggle night mode
    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "#" + ulabel.config["toolbox_id"] + " a.night-button",
        () => {
            const root_container = $("#" + ulabel.config["container_id"]);
            if (root_container.hasClass("ulabel-night")) {
                root_container.removeClass("ulabel-night");
                NightModeCookie.destroy_cookie();
            } else {
                root_container.addClass("ulabel-night");
                NightModeCookie.set_cookie();
            }
        },
    );

    // Button to collapse/expand toolbox
    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "#" + ulabel.config["toolbox_id"] + " .toolbox-collapse-btn",
        (e) => {
            const toolbox = $("#" + ulabel.config["toolbox_id"]);
            const btn = $(e.currentTarget);

            if (toolbox.hasClass("collapsed")) {
                toolbox.removeClass("collapsed");
                btn.text("◀");
                btn.attr("title", "Collapse toolbox");
                set_local_storage_item("ulabel_toolbox_collapsed", "false");
            } else {
                toolbox.addClass("collapsed");
                btn.text("▶");
                btn.attr("title", "Expand toolbox");
                set_local_storage_item("ulabel_toolbox_collapsed", "true");
            }
        },
    );

    // Keyboard only events
    $(document).on(
        "keydown" + ULABEL_NAMESPACE,
        (keydown_event: JQuery.KeyDownEvent) => {
            handle_keydown_event(keydown_event, ulabel);
        },
    );

    $(window).on(
        "beforeunload" + ULABEL_NAMESPACE,
        () => {
            if (ulabel.state["edited"]) {
                // Return of anything other than `undefined`
                // will trigger the browser's confirmation dialog
                // Custom messages are not supported
                return 1;
            }
        },
    );
}

/**
 * Remove listeners from a ULabel instance.
 *
 * @param ulabel ULabel instance.
 */
export function remove_ulabel_listeners(
    ulabel: ULabel,
) {
    // Remove jquery event listeners with the ulabel namespace
    $(document).off(ULABEL_NAMESPACE);
    $(window).off(ULABEL_NAMESPACE);
    $(".id_dialog").off(ULABEL_NAMESPACE);

    // Go through each resize observer and disconnect them
    if (ulabel.resize_observers != null) {
        ulabel.resize_observers.forEach((observer) => {
            observer.disconnect();
        });
    }
}
