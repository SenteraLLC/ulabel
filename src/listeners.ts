/**
 * ULabel listener utilities.
 *
 * These primarily use JQuery, within the namespace "ulabel".
 */

import { ULabel } from "..";
import { DELETE_CLASS_ID, DELETE_MODES } from "./annotation";

const ULABEL_NAMESPACE = ".ulabel";

/**
 * Create the handler for keypress events.
 * @param ulabel ULabel instance
 */
function create_keypress_handler(
    ulabel: ULabel,
) {
    $(document).on(
        "keypress" + ULABEL_NAMESPACE,
        function (key_event) {
            const current_subtask = ulabel.get_current_subtask();
            switch (key_event.key) {
                // Create a point annotation at the mouse's current location
                case ulabel.config.create_point_annotation_keybind:
                    // Only allow keypress to create point annotations
                    if (current_subtask.state.annotation_mode === "point") {
                        // Create an annotation based on the last mouse position
                        ulabel.begin_annotation(ulabel.state["last_move"]);
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
                            if (class_def.keybind !== null && key_event.key === class_def.keybind) {
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
        },
    );
}

/**
 * Create a listener for the soft ID toolbox button.
 * @param ulabel ULabel instance
 */
function create_soft_id_toolbox_button_listener(
    ulabel: ULabel,
) {
    $(document).on(
        "click" + ULABEL_NAMESPACE,
        `#${ulabel.config["toolbox_id"]} a.tbid-opt`,
        function (click_event) {
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
        },
    );
}

/**
 * Create listeners for a ULabel instance.
 * Consider breaking out anything longer than 10 lines.
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
        function (mouse_event) {
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
        function (click_event) {
            ulabel.handle_mouse_down(click_event);
        },
    );

    // Prevent default for auxclick
    $(document).on(
        "auxclick" + ULABEL_NAMESPACE,
        ulabel.handle_aux_click,
    );

    // Detect and record mouseup
    $(document).on(
        "mouseup" + ULABEL_NAMESPACE,
        ulabel.handle_mouse_up.bind(ulabel),
    );

    $(window).on(
        "click" + ULABEL_NAMESPACE,
        function (click_event) {
            if (click_event.shiftKey) {
                click_event.preventDefault();
            }
        },
    );

    // Mouse movement has meaning in certain cases
    annbox.on(
        "mousemove" + ULABEL_NAMESPACE,
        function (move_event) {
            ulabel.handle_mouse_move(move_event);
        },
    );

    // ================= Uncategorized =================

    create_keypress_handler(ulabel);

    // This listener does not use jquery because it requires being able to prevent default
    // There are maybe some hacky ways to do this with jquery
    // https://stackoverflow.com/questions/60357083/does-not-use-passive-listeners-to-improve-scrolling-performance-lighthouse-repo
    // Detection ctrl+scroll
    document.getElementById(
        ulabel.config["annbox_id"],
    ).addEventListener(
        "wheel",
        ulabel.handle_wheel.bind(ulabel),
    );

    // Create a resize observer to reposition dialogs
    const dialog_resize_observer = new ResizeObserver(function () {
        ulabel.reposition_dialogs();
    });

    // Observe the changes on the imwrap_id element
    dialog_resize_observer.observe(
        document.getElementById(ulabel.config["imwrap_id"]),
    );

    // Store a reference
    ulabel.resize_observers.push(dialog_resize_observer);

    // Create a resize observer to handle toolbox overflow
    const tb_overflow_resize_observer = new ResizeObserver(function () {
        ulabel.handle_toolbox_overflow();
    });

    // Observe the changes on the ulabel container
    tb_overflow_resize_observer.observe(
        document.getElementById(ulabel.config["container_id"]),
    );

    // Store a reference
    ulabel.resize_observers.push(tb_overflow_resize_observer);

    create_soft_id_toolbox_button_listener(ulabel);

    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "a.tb-st-switch[href]",
        function (click_event) {
            const switch_to = $(click_event.target).attr("id").split("--")[1];

            // Ignore if in the middle of annotation
            if (ulabel.get_current_subtask()["state"]["is_in_progress"]) return;

            ulabel.set_subtask(switch_to);
        },
    );

    // Keybind to switch active subtask
    $(document).on(
        "keypress" + ULABEL_NAMESPACE,
        function (e) {
            // Ignore if in the middle of annotation
            if (ulabel.get_current_subtask()["state"]["is_in_progress"]) return;

            // Check for the right keypress
            if (e.key === ulabel.config.switch_subtask_keybind) {
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
        function (input_event) {
            // Update annotation's text field
            const annos = ulabel.get_current_subtask()["annotations"]["access"];
            const text_payload_anno_id = input_event.target.id.substring("note__".length);
            annos[text_payload_anno_id]["text_payload"] = input_event.target.value;
        },
    );

    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "a.fad_button.delete",
        function (click_event) {
            ulabel.delete_annotation(click_event.target.id.substring("delete__".length));
        },
    );

    $(document).on(
        "click" + ULABEL_NAMESPACE,
        "a.fad_button.reclf",
        function (click_event) {
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
}
