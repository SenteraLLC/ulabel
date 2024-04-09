/*
Uncertain Labeling Tool
Sentera Inc.
*/
import { ULabelAnnotation, DELETE_CLASS_ID, DELETE_MODES } from '../build/annotation';
import { ULabelSubtask } from '../build/subtask';
import { GeometricUtils } from '../build/geometric_utils';
import { Configuration, AllowedToolboxItem } from '../build/configuration';
import { get_gradient } from '../build/drawing_utilities'
import {
    filter_points_distance_from_line,
    get_annotation_class_id,
    get_annotation_confidence,
    mark_deprecated
} from '../build/annotation_operators';
import {
    add_style_to_document,
    prep_window_html,
    build_id_dialogs,
    build_edit_suggestion,
    build_confidence_dialog 
} from '../build/html_builder';

import $ from 'jquery';
const jQuery = $;
window.$ = window.jQuery = require('jquery');

const { v4: uuidv4 } = require('uuid');

import {
    COLORS,
    WHOLE_IMAGE_SVG,
    GLOBAL_SVG,
    FRONT_Z_INDEX,
    BACK_Z_INDEX,
} from './blobs';
import { ULABEL_VERSION } from './version';

jQuery.fn.outer_html = function () {
    return jQuery('<div />').append(this.eq(0).clone()).html();
};

const MODES_3D = ["global", "bbox3"];
const NONSPATIAL_MODES = ["whole-image", "global"];

export class ULabel {

    // ================= Internal constants =================

    static get elvl_info() { return 0; }
    static get elvl_standard() { return 1; }
    static get elvl_fatal() { return 2; }
    static version() { return ULABEL_VERSION; }

    // ================= Static Utilities =================

    // Returns current epoch time in milliseconds
    static get_time() {
        return (new Date()).toISOString();
    }

    // =========================== NIGHT MODE COOKIES =======================================

    static has_night_mode_cookie() {
        if (document.cookie.split(";").find(row => row.trim().startsWith("nightmode=true"))) {
            return true;
        }
        return false;
    }

    static set_night_mode_cookie() {
        let d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));
        document.cookie = "nightmode=true;expires=" + d.toUTCString() + ";path=/";
    }

    static destroy_night_mode_cookie() {
        document.cookie = "nightmode=true;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }

    /*
    Types of drags
        - annotation
            - Bare canvas left mousedown 
        - edit
            - Editable left mousedown
        - pan
            - Ctrl-left mousedown
            - Center mousedown
        - zoom
            - Right mousedown
            - Shift-left mousedown
    */
    static get_drag_key_start(mouse_event, ul) {
        if (ul.subtasks[ul.state["current_subtask"]]["state"]["active_id"] != null) {
            if (mouse_event.button === 2) {
                return "right";
            }
            return "annotation";
        }
        switch (mouse_event.button) {
            case 0:
                if (mouse_event.target.id === ul.subtasks[ul.state["current_subtask"]]["canvas_fid"]) {
                    if (mouse_event.ctrlKey || mouse_event.metaKey) {
                        return "pan";
                    }
                    if (mouse_event.shiftKey) {
                        return "zoom";
                    }
                    return "annotation";
                } else if (mouse_event.target.id === "brush_circle") {
                    return "brush";
                } else if ($(mouse_event.target).hasClass("editable")) {
                    return "edit";
                } else if ($(mouse_event.target).hasClass("movable")) {
                    mouse_event.preventDefault();
                    return "move";
                } else {
                    console.log("Unable to assign a drag key to click target:", mouse_event.target.id);
                    return null;
                }
            case 1:
                return "pan";
            case 2:
                return null;
        }
    }

    static create_listeners(ul) {

        // ================= Mouse Events in the ID Dialog ================= 

        var iddg = $(".id_dialog");

        // Hover interactions

        iddg.on("mousemove", function (mouse_event) {
            let crst = ul.state["current_subtask"];
            if (!ul.subtasks[crst]["state"]["idd_thumbnail"]) {
                ul.handle_id_dialog_hover(mouse_event);
            }
        });


        // ================= Mouse Events in the Annotation Container ================= 

        var annbox = $("#" + ul.config["annbox_id"]);

        // Detect and record mousedown
        annbox.mousedown(function (mouse_event) {
            ul.handle_mouse_down(mouse_event);
        });

        // Detect and record mouseup
        $(window).mouseup(function (mouse_event) {
            ul.handle_mouse_up(mouse_event);
        });

        $(window).on("click", (e) => {
            if (e.shiftKey) {
                e.preventDefault();
            }
        })

        // Mouse movement has meaning in certain cases
        annbox.mousemove(function (mouse_event) {
            ul.handle_mouse_move(mouse_event);
        });

        $(document).on("keypress", (e) => {
            // Check for the correct keypress
            // Grab current subtask
            const current_subtask = ul.subtasks[ul.state["current_subtask"]]
            switch (e.key) {
                // Create a point annotation at the mouse's current location
                case ul.config.create_point_annotation_keybind:
                    // Only allow keypress to create point annotations
                    if (current_subtask.state.annotation_mode === "point") {
                        // Create an annotation based on the last mouse position
                        ul.begin_annotation(ul.state["last_move"])
                    }
                    break;
                // Create a bbox annotation around the initial_crop. Or the whole image if inital_crop does not exist
                case ul.config.create_bbox_on_initial_crop:
                    if (current_subtask.state.annotation_mode === "bbox") {
                        // Default to an annotation with size of image
                        // Create the coordinates for the bbox's spatial payload
                        let bbox_top_left = [0, 0];
                        let bbox_bottom_right = [ul.config.image_width, ul.config.image_height]; 

                        // If an initial crop exists, use that instead
                        if (ul.config.initial_crop !== null && ul.config.initial_crop !== undefined) {
                            // Convenience
                            const initial_crop = ul.config.initial_crop

                            // Create the coordinates for the bbox's spatial payload
                            bbox_top_left = [initial_crop.left, initial_crop.top]
                            bbox_bottom_right = [initial_crop.left + initial_crop.width, initial_crop.top + initial_crop.height]
                        }

                        // Create the annotation
                        ul.create_annotation(current_subtask.state.annotation_mode, [bbox_top_left, bbox_bottom_right])
                    }
                    break; 
                // Change to brush mode (for now, polygon only)
                case ul.config.toggle_brush_mode_keybind:
                    ul.toggle_brush_mode(ul.state["last_move"]);
                    break;
                // Change to erase mode (will also set the is_in_brush_mode state)
                case ul.config.toggle_erase_mode_keybind:
                    ul.toggle_erase_mode(ul.state["last_move"]);
                    break;
                // Increase brush size by 10%
                case ul.config.increase_brush_size_keybind:
                    ul.change_brush_size(1.1);
                    break;
                // Decrease brush size by 10%
                case ul.config.decrease_brush_size_keybind:
                    ul.change_brush_size(1/1.1);
                    break;
                default:
                    // When hovering an annotation, check if the key pressed is a keybind for a class
                    if (current_subtask.state.move_candidate !== null && current_subtask.state.move_candidate !== undefined) {
                        for (const class_def of current_subtask.class_defs) {
                            if (class_def.keybind !== null && e.key === class_def.keybind) {
                                // Set the active class to the class with the matching keybind
                                ul.state["idd_associated_annotation"] = JSON.parse(JSON.stringify(current_subtask.state.move_candidate["annid"]));
                                ul.handle_id_dialog_click(ul.state["last_move"], class_def.id)
                            }
                        }
                    }
                    break;
            }
        })

        // Detection ctrl+scroll
        document.getElementById(ul.config["annbox_id"]).onwheel = function (wheel_event) {
            // Prevent scroll-zoom
            wheel_event.preventDefault();
            let fms = ul.config["image_data"].frames.length > 1;
            if (wheel_event.altKey) {
                // When in brush mode, change the brush size
                if (ul.subtasks[ul.state["current_subtask"]]["state"]["is_in_brush_mode"]) {
                    ul.change_brush_size(wheel_event.deltaY < 0 ? 1.1 : 1 / 1.1);
                }
            } else if (fms && (wheel_event.ctrlKey || wheel_event.shiftKey || wheel_event.metaKey)) {
                // Get direction of wheel
                const dlta = Math.sign(wheel_event.deltaY);
                ul.update_frame(dlta);
            } else {
                // Don't scroll if id dialog is visible
                if (ul.subtasks[ul.state["current_subtask"]]["state"]["idd_visible"] && !ul.subtasks[ul.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                    return;
                }

                // Get direction of wheel
                const dlta = Math.sign(wheel_event.deltaY);

                // Apply new zoom
                ul.state["zoom_val"] *= (1 - dlta / 5);
                ul.rezoom(wheel_event.clientX, wheel_event.clientY);

                // Only try to update the overlay if it exists
                ul.filter_distance_overlay?.draw_overlay()
            }
        };

        // TODO better understand which browsers support this (new Chrome does)
        new ResizeObserver(function () {
            ul.reposition_dialogs();
        }).observe(document.getElementById(ul.config["imwrap_id"]));
        new ResizeObserver(function () {
            ul.handle_toolbox_overflow();
        }).observe(document.getElementById(ul.config["container_id"]));

        // Listener for soft id toolbox buttons
        $(document).on("click", "#" + ul.config["toolbox_id"] + ' a.tbid-opt', (e) => {
            let tgt_jq = $(e.currentTarget);
            let pfx = "div#tb-id-app--" + ul.state["current_subtask"];
            let crst = ul.state["current_subtask"];
            if (tgt_jq.attr("href") === "#") {
                $(pfx + " a.tbid-opt.sel").attr("href", "#");
                $(pfx + " a.tbid-opt.sel").removeClass("sel");
                tgt_jq.addClass("sel");
                tgt_jq.removeAttr("href");
                let idarr = tgt_jq.attr("id").split("_");
                let rawid = parseInt(idarr[idarr.length - 1]);
                ul.set_id_dialog_payload_nopin(ul.subtasks[crst]["class_ids"].indexOf(rawid), 1.0);
                ul.update_id_dialog_display();
            }
        });

        $(document).on("click", "a.tb-st-switch[href]", (e) => {
            let switch_to = $(e.target).attr("id").split("--")[1];

            // Ignore if in the middle of annotation
            if (ul.subtasks[ul.state["current_subtask"]]["state"]["is_in_progress"]) {
                return;
            }

            ul.set_subtask(switch_to);
        });

        // Keybind to switch active subtask
        $(document).on("keypress", (e) => {

            // Ignore if in the middle of annotation
            if (ul.subtasks[ul.state["current_subtask"]]["state"]["is_in_progress"]) {
                return;
            }

            // Check for the right keypress
            if (e.key === ul.config.switch_subtask_keybind) {

                let current_subtask = ul.state["current_subtask"];
                let toolbox_tab_keys = [];

                // Put all of the toolbox tab keys in a list
                for (let idx in ul.toolbox.tabs) {
                    toolbox_tab_keys.push(ul.toolbox.tabs[idx].subtask_key);
                }

                // Get the index of the next subtask in line
                let new_subtask_index = toolbox_tab_keys.indexOf(current_subtask) + 1;  // +1 gets the next subtask

                // If the current subtask was the last one in the array, then
                // loop around to the first subtask
                if (new_subtask_index === toolbox_tab_keys.length) {
                    new_subtask_index = 0;
                }

                let new_subtask = toolbox_tab_keys[new_subtask_index];

                ul.set_subtask(new_subtask);
            }
        })

        $(document).on("input", "input.frame_input", () => {
            ul.update_frame();
        });


        $(document).on("input", "span.tb-st-range input", () => {
            ul.readjust_subtask_opacities();
        });

        $(document).on("click", "div.fad_row.add a.add-glob-button", () => {
            ul.create_nonspatial_annotation();
        });
        $(document).on("focus", "textarea.nonspatial_note", () => {
            $("div.frame_annotation_dialog.active").addClass("permopen");
        });
        $(document).on("focusout", "textarea.nonspatial_note", () => {
            $("div.frame_annotation_dialog.permopen").removeClass("permopen");
        });
        $(document).on("input", "textarea.nonspatial_note", (e) => {
            // Update annotation's text field
            ul.subtasks[ul.state["current_subtask"]]["annotations"]["access"][e.target.id.substring("note__".length)]["text_payload"] = e.target.value;
        });
        $(document).on("click", "a.fad_button.delete", (e) => {
            ul.delete_annotation(e.target.id.substring("delete__".length));
        });
        $(document).on("click", "a.fad_button.reclf", (e) => {
            // Show idd
            ul.show_id_dialog(e.pageX, e.pageY, e.target.id.substring("reclf__".length), false, true);
        });

        //Whenever the mouse makes the dialogs show up, update the displayed annotation confidence.
        $(document).on("mouseenter", "div.global_edit_suggestion", () => {
            //Grab the currently active annotation
            let active_annotation = ul.subtasks[ul.state["current_subtask"]]["active_annotation"]

            //Loop through the classification payload to get the active annotation's confidence
            let confidence = 0;
            for (let idx in ul.subtasks[ul.state["current_subtask"]].annotations.access[active_annotation].classification_payloads) {
                let loop_confidence = ul.subtasks[ul.state["current_subtask"]].annotations.access[active_annotation].classification_payloads[idx].confidence
                if (loop_confidence > confidence) {
                    confidence = loop_confidence
                }
            }

            //Update the display dialog with the annotation's confidence
            $(".annotation-confidence-value").text(confidence)
        })
        $(document).on("mouseenter", "div.fad_annotation_rows div.fad_row", (e) => {
            // Show thumbnail for idd
            ul.suggest_edits(null, $(e.currentTarget).attr("id").substring("row__".length));
        });
        $(document).on("mouseleave", "div.fad_annotation_rows div.fad_row", () => {
            // Show thumbnail for idd
            if (ul.subtasks[ul.state["current_subtask"]]["state"]["idd_visible"] && !ul.subtasks[ul.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                return;
            }
            ul.suggest_edits(null);
        });
        $(document).on("keypress", (e) => {

            // Check the key pressed against the delete annotation keybind in the config
            if (e.key === ul.config.delete_annotation_keybind) {

                // Check the active_annotation to make sure its not null and isn't nonspatial
                if (
                    ul.subtasks[ul.state["current_subtask"]]["active_annotation"] != null &&
                    !NONSPATIAL_MODES.includes(ul.subtasks[ul.state["current_subtask"]]["state"]["annotation_mode"])
                ) {

                    // Delete the active annotation
                    ul.delete_annotation(ul.subtasks[ul.state["current_subtask"]]["active_annotation"])
                }
            }
        })

        // Listener for id_dialog click interactions
        $(document).on("click", "#" + ul.config["container_id"] + " a.id-dialog-clickable-indicator", (e) => {
            let crst = ul.state["current_subtask"];
            if (!ul.subtasks[crst]["state"]["idd_thumbnail"]) {
                ul.handle_id_dialog_click(e);
            }
            else {
                // It's always covered up as a thumbnail. See below
            }
        });
        $(document).on("click", ".global_edit_suggestion a.reid_suggestion", (e) => {
            let crst = ul.state["current_subtask"];
            let annid = ul.subtasks[crst]["state"]["idd_associated_annotation"];
            ul.hide_global_edit_suggestion();
            ul.show_id_dialog(
                ul.get_global_mouse_x(e),
                ul.get_global_mouse_y(e),
                annid,
                false
            );
        });

        $(document).on("click", "#" + ul.config["annbox_id"] + " .delete_suggestion", () => {
            let crst = ul.state["current_subtask"];
            ul.delete_annotation(ul.subtasks[crst]["state"]["move_candidate"]["annid"]);
        })

        // Button to save annotations
        $(document).on("click", "#" + ul.config["toolbox_id"] + " a.night-button", function () {
            if ($("#" + ul.config["container_id"]).hasClass("ulabel-night")) {
                $("#" + ul.config["container_id"]).removeClass("ulabel-night");
                // Destroy any night cookie
                ULabel.destroy_night_mode_cookie();
            }
            else {
                $("#" + ul.config["container_id"]).addClass("ulabel-night");
                // Drop a night cookie
                ULabel.set_night_mode_cookie();
            }
        })

        // Keyboard only events
        document.addEventListener("keydown", (keypress_event) => {
            const shift = keypress_event.shiftKey;
            const ctrl = keypress_event.ctrlKey || keypress_event.metaKey;
            if (ctrl &&
                (
                    keypress_event.key === "z" ||
                    keypress_event.key === "Z" ||
                    keypress_event.code === "KeyZ"
                )
            ) {
                keypress_event.preventDefault();
                if (shift) {
                    ul.redo();
                }
                else {
                    ul.undo();
                }
                return false;
            }
            else {
                const current_subtask = ul.subtasks[ul.state["current_subtask"]]
                switch (keypress_event.key) {
                    case "Escape":
                        // If in erase or brush mode, cancel the brush
                        if (current_subtask.state.is_in_erase_mode) {
                            ul.toggle_erase_mode();
                        } else if (current_subtask.state.is_in_brush_mode) {
                            ul.toggle_brush_mode();
                        } else if (current_subtask.state.starting_complex_polygon) {
                            // If starting a complex polygon, undo
                            ul.undo();
                        } else if (current_subtask.state.is_in_progress) {
                            // If in the middle of drawing an annotation, cancel the annotation
                            ul.cancel_annotation();
                        }
                        break;
                }
            }
        });

        window.addEventListener("beforeunload", function (e) {
            var confirmationMessage = '';
            if (ul.state["edited"]) {
                confirmationMessage = 'You have made unsave changes. Are you sure you would like to leave?';
                (e || window.event).returnValue = confirmationMessage; //Gecko + IE
                return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
            }
        });
    }

    static process_allowed_modes(ul, subtask_key, subtask) {
        // TODO(v1) check to make sure these are known modes
        ul.subtasks[subtask_key]["allowed_modes"] = subtask["allowed_modes"];
    }

    static create_unused_class_id(ulabel) {
        // More likely to be valid than always starting at 0, but use 0 if valid_class_ids is undefined
        let current_id = ulabel.valid_class_ids ? ulabel.valid_class_ids.length : 0

        // Loop until a valid id is found
        while (true) {
            // If the current id is not currently being used, then return it
            if (!ulabel.valid_class_ids.includes(current_id)) return current_id

            // If the id was being used, then increment the id and try again
            current_id++
        }
    }

    static process_classes(ulabel, subtask_key, raw_subtask_json) {
        // Check to make sure allowed classes were provided
        if (!("classes" in raw_subtask_json)) {
            throw new Error(`classes not specified for subtask "${subtask_key}"`);
        }
        if (typeof raw_subtask_json.classes != 'object' || raw_subtask_json.classes.length === undefined || raw_subtask_json.classes.length === 0) {
            throw new Error(`classes has an invalid value for subtask "${subtask_key}"`);
        }

        // Create a constant to hold the actual ULabelSubtask
        // The raw subtask is used for reading values that are constant inside this method, the actual subtask is for writing values
        const subtask = ulabel.subtasks[subtask_key]

        // Set to single class mode if applicable
        subtask.single_class_mode = (raw_subtask_json.classes.length === 1);

        // Populate allowed classes vars
        // TODO might be nice to recognize duplicate classes and assign same color... idk
        // TODO better handling of default class ids would definitely be a good idea
        subtask.class_defs = [];
        subtask.class_ids = [];

        // Loop through each class_definition allowed inside this subtask
        for (const class_definition of raw_subtask_json.classes) {

            // Create a class definition based on the provided class_definition that will be saved to the subtask
            let modifed_class_definition = {}
            let name, id, color, keybind;
            switch (typeof class_definition) {
                case "string":
                    modifed_class_definition = {
                        "name": class_definition, // When class_definition is a string, that string is the class name
                        "id": ULabel.create_unused_class_id(ulabel), // Create an id that's unused by another class
                        "color": COLORS[ulabel.valid_class_ids.length] // Arbitrary yet unique color
                    }
                    break
                case "object":
                    // If no name is provided, give a generic name based on the total number of currently initialized classes
                    name = class_definition.name ?? `Class ${ulabel.valid_class_ids.length}`
                    
                    // Skip classes with the reserved DELETE_CLASS_ID
                    if (class_definition.id === DELETE_CLASS_ID) {
                        console.warn(`Class id ${DELETE_CLASS_ID} is reserved for delete mode and cannot be used for class definitions`);
                        continue;
                    }

                    // Only create an id if one wasn't provided
                    id = class_definition.id ?? ULabel.create_unused_class_id(ulabel)

                    if (ulabel.valid_class_ids.includes(id)) {
                        console.warn(`Duplicate class id ${id} detected. This is not supported and may result in unintended side-effects.
                        This may be caused by mixing string and object class definitions, or by assigning the same id to two or more object class definitions.`)
                    }

                    // Use generic color only if color not provided
                    color = class_definition.color ?? COLORS[ulabel.valid_class_ids.length]

                    // Save the keybind if it exists, otherwise default to null
                    keybind = class_definition.keybind ?? null

                    modifed_class_definition = {
                        "name": name,
                        "id": id,
                        "color": color,
                        "keybind": keybind
                    }
                    break
                default:
                    console.log(raw_subtask_json.classes)
                    throw new Error(`Entry in classes not understood: ${class_definition}\n${class_definition} must either be a string or an object.`)
            }

            // Save the class definitions and ids on the subtask
            subtask.class_defs.push(modifed_class_definition)
            subtask.class_ids.push(modifed_class_definition.id)

            // Also save the id and color_info on the ULabel object
            ulabel.valid_class_ids.push(modifed_class_definition.id)
            ulabel.color_info[modifed_class_definition.id] = modifed_class_definition.color
        }

        // If the subtask has any DELETE_MODE enabled, add a class definition for it
        if (subtask.allowed_modes.some(mode => DELETE_MODES.includes(mode))) {
            subtask.class_defs.push({
                "name": "Delete",
                "id": DELETE_CLASS_ID,
                // Default to crimson
                "color": COLORS[1],
                "keybind": null
            })
            ulabel.valid_class_ids.push(DELETE_CLASS_ID)
            ulabel.color_info[DELETE_CLASS_ID] = COLORS[1]
        }
    }

    static process_resume_from(ul, subtask_key, subtask) {
        // Initialize to no annotations
        ul.subtasks[subtask_key]["annotations"] = {
            "ordering": [],
            "access": {}
        };
        if (subtask["resume_from"] != null) {
            for (var i = 0; i < subtask["resume_from"].length; i++) {
                // Get copy of annotation to import for modification before incorporation
                let cand = ULabelAnnotation.from_json(JSON.parse(JSON.stringify(subtask["resume_from"][i])));

                // Mark as not new
                cand["new"] = false;

                // Set to default line size if there is none, check for null and undefined using ==
                if (
                    (!("line_size" in cand)) || (cand["line_size"] == null)
                ) {
                    cand["line_size"] = ul.state["line_size"];
                }

                // Add created by attribute if there is none
                if (
                    !("created_by" in cand)
                ) {
                    cand["created_by"] = null;
                }

                // Add created at attribute if there is none
                if (
                    !("created_at" in cand)
                ) {
                    cand["created_at"] = ULabel.get_time();
                }

                // Add deprecated at attribute if there is none
                if (
                    !("deprecated" in cand)
                ) {
                    mark_deprecated(cand, false)
                }

                // Throw error if no spatial type is found
                if (
                    !("spatial_type" in cand)
                ) {
                    alert(`Error: Attempted to import annotation without a spatial type (id: ${cand["id"]})`);
                    throw `Error: Attempted to import annotation without a spatial type (id: ${cand["id"]})"`;
                }

                // Throw error if no spatial type is found
                if (
                    !("spatial_payload" in cand)
                ) {
                    alert(`Error: Attempted to import annotation without a spatial payload (id: ${cand["id"]})`);
                    throw `Error: Attempted to import annotation without a spatial payload (id: ${cand["id"]})"`;
                } else if (
                    cand["spatial_type"] === "polygon" && cand["spatial_payload"].length < 1
                ) {
                    console.warn(`[WARNING]: Skipping attempted import of polygon annotation without any points (id: ${cand["id"]})`);
                    continue;
                }

                // Set frame to zero if not provided
                if (
                    !("frame" in cand)
                ) {
                    cand["frame"] = 0;
                }

                // Set annotation_meta if not provided
                if (
                    !("annotation_meta" in cand)
                ) {
                    cand["annotation_meta"] = {};
                }

                // Ensure that classification payloads are compatible with config
                cand.ensure_compatible_classification_payloads(ul.subtasks[subtask_key]["class_ids"])

                cand["classification_payloads"].sort(
                    (a, b) => {
                        return (
                            ul.subtasks[subtask_key]["class_ids"].find((e) => e === a["class_id"]) -
                            ul.subtasks[subtask_key]["class_ids"].find((e) => e === b["class_id"])
                        );
                    }
                )

                // Push to ordering and add to access
                ul.subtasks[subtask_key]["annotations"]["ordering"].push(cand["id"]);
                ul.subtasks[subtask_key]["annotations"]["access"][subtask["resume_from"][i]["id"]] = JSON.parse(JSON.stringify(cand));

                if (cand["spatial_type"] === "polygon") {
                    // If missing any of `spatial_payload_holes` or `spatial_payload_child_indices`,
                    // or if they don't match the length of `spatial_payload`, then rebuild them
                    if (
                        !("spatial_payload_holes" in cand) ||
                        !("spatial_payload_child_indices" in cand) ||
                        cand["spatial_payload_holes"].length !== cand["spatial_payload"].length ||
                        cand["spatial_payload_child_indices"].length !== cand["spatial_payload"].length
                    ) {
                        ul.state.current_subtask = subtask_key;
                        // For polygons, verify all layers
                        ul.verify_all_polygon_complex_layers(cand["id"]);
                        // Clear action stream, since the above action should not be undoable
                        ul.remove_recorded_events_for_annotation(cand["id"]);
                        // update containing box
                        ul.rebuild_containing_box(cand["id"]);
                    }
                }
            }
        }
    }

    static initialize_subtasks(ul, stcs) {
        let first_non_ro = null;

        // Initialize a place on the ulabel object to hold annotation color information
        ul.color_info = {}

        // Initialize a place on the ulabel object to hold all classification ids
        ul.valid_class_ids = []

        // Perform initialization tasks on each subtask individually
        for (const subtask_key in stcs) {
            // For convenience, make a raw subtask var
            let raw_subtask = stcs[subtask_key];
            ul.subtasks[subtask_key] = ULabelSubtask.from_json(subtask_key, raw_subtask);

            if (first_non_ro === null && !ul.subtasks[subtask_key]["read_only"]) {
                first_non_ro = subtask_key;
            }

            // Process allowed_modes
            // They are placed in ul.subtasks[subtask_key]["allowed_modes"]
            ULabel.process_allowed_modes(ul, subtask_key, raw_subtask);
            // Process allowed classes
            // They are placed in ul.subtasks[subtask_key]["class_defs"]
            ULabel.process_classes(ul, subtask_key, raw_subtask);
            // Process imported annoations
            // They are placed in ul.subtasks[subtask_key]["annotations"]
            ULabel.process_resume_from(ul, subtask_key, raw_subtask);

            // Label canvasses and initialize context with null
            ul.subtasks[subtask_key]["canvas_fid"] = ul.config["canvas_fid_pfx"] + "__" + subtask_key;
            ul.subtasks[subtask_key]["canvas_bid"] = ul.config["canvas_bid_pfx"] + "__" + subtask_key;

            // Store state of ID dialog element
            // TODO much more here when full interaction is built
            let id_payload = [];
            for (var i = 0; i < ul.subtasks[subtask_key]["class_ids"].length; i++) {
                id_payload.push(1 / ul.subtasks[subtask_key]["class_ids"].length);
            }
            ul.subtasks[subtask_key]["state"] = {
                // Id dialog state
                "idd_id": "id_dialog__" + subtask_key,
                "idd_id_front": "id_dialog_front__" + subtask_key,
                "idd_visible": false,
                "idd_associated_annotation": null,
                "idd_thumbnail": false,
                "id_payload": id_payload,
                "delete_mode_id_payload": [{"class_id": -1, "confidence": 1}],
                "first_explicit_assignment": false,

                // Annotation state
                "annotation_mode": ul.subtasks[subtask_key]["allowed_modes"][0],
                "active_id": null,
                "is_in_progress": false,
                "is_in_edit": false,
                "is_in_move": false,
                "starting_complex_polygon": false, 
                "is_in_brush_mode": false,
                "is_in_erase_mode": false,
                "line_size": ul.subtasks[subtask_key]["default_line_size"],
                "edit_candidate": null,
                "move_candidate": null,

                // Rendering context
                "front_context": null,
                "back_context": null,
                "annotation_contexts": [],

                // Generic dialogs
                "visible_dialogs": {}
            };
        }
        if (first_non_ro === null) {
            ul.raise_error("You must have at least one subtask without 'read_only' set to true.", ULabel.elvl_fatal);
        }
    }

    static initialize_annotation_canvases(ul, subtask_key = null) {
        if (subtask_key === null) {
            for (const subtask_key in ul.subtasks) {
                ULabel.initialize_annotation_canvases(ul, subtask_key)
            }
            return
        }

        // Create the canvas for each annotation
        const subtask = ul.subtasks[subtask_key]
        for (const annotation_id in subtask.annotations.access) {
            let annotation = subtask.annotations.access[annotation_id]
            if (!NONSPATIAL_MODES.includes(annotation.spatial_type)) {
                annotation["canvas_id"] = ul.get_init_canvas_context_id(annotation_id, subtask_key)
            }
        }
    }

    static expand_image_data(ul, raw_img_dat) {
        if (typeof raw_img_dat === "string") {
            return {
                spacing: {
                    x: 1,
                    y: 1,
                    z: 1,
                    units: "pixels"
                },
                frames: [
                    raw_img_dat
                ]
            }
        }
        else if (Array.isArray(raw_img_dat)) {
            return {
                spacing: {
                    x: 1,
                    y: 1,
                    z: 1,
                    units: "pixels"
                },
                frames: raw_img_dat
            }
        }
        else if ("spacing" in raw_img_dat && "frames" in raw_img_dat) {
            return raw_img_dat;
        }
        else {
            ul.raise_error(`Image data object not understood. Must be of form "http://url.to/img" OR ["img1", "img2", ...] OR {spacing: {x: <num>, y: <num>, z: <num>, units: <str>}, frames: ["img1", "img2", ...]}. Provided: ${JSON.stringify(raw_img_dat)}`, ULabel.elvl_fatal);
            return null;
        }
    }

    static load_image_promise(img_el) {
        return new Promise((resolve, reject) => {
            try {
                img_el.onload = () => {
                    resolve(img_el);
                };
            }
            catch (err) {
                reject(err);
            }
        });
    }

    static handle_deprecated_arguments() {
        // Warn users that this method is deprecated
        console.warn(`
            Passing in each argument as a seperate parameter to ULabel is now deprecated \n
            Please pass in an object with keyword arguments instead
        `)

        return {
            "container_id": arguments[0],   // Required
            "image_data": arguments[1],     // Required
            "username": arguments[2],       // Required
            "submit_buttons": arguments[3], // Required
            "subtasks": arguments[4],       // Required
            "task_meta": arguments[5] ?? null,       // Use default if optional argument is undefined
            "annotation_meta": arguments[6] ?? null, // Use default if optional argument is undefined
            "px_per_px": arguments[7] ?? 1,          // Use default if optional argument is undefined
            "initial_crop": arguments[8] ?? null,    // Use default if optional argument is undefined
            "initial_line_size": arguments[9] ?? null,  // Use default if optional argument is undefined
            "config_data": arguments[10] ?? null,    // Use default if optional argument is undefined
            "toolbox_order": arguments[11] ?? null   // Use default if optional argument is undefined
        }
    }

    /** 
     * Code to be called after ULabel has finished initializing.
    */
    static after_init(ulabel) {
        // Perform the after_init method for each toolbox item
        for (const toolbox_item of ulabel.toolbox.items) {
            toolbox_item.after_init()
        }
    }

    // ================= Construction/Initialization =================

    constructor(kwargs) {
        this.begining_time = Date.now()

        // Ensure arguments were recieved
        if (arguments.length === 0) {
            console.error("ULabel was given no arguments")
        }
        // The old constructor took in up to 11 arguments, so if more than 1 argument is present convert them to the new format
        else if (arguments.length > 1) {
            kwargs = ULabel.handle_deprecated_arguments(...arguments)
        }

        // Declare a list of required properties to error check against
        const required_properties = [
            "container_id",
            "image_data",
            "username",
            "submit_buttons",
            "subtasks"
        ]
        
        // Ensure kwargs has all required properties
        for (const property of required_properties) {
            if (kwargs[property] == undefined) { // == also checks for null
                console.error(`ULabel did not receive required property ${property}`)
            }
        }

        // Assign each value to a constant. Assign defaults for optional properties
        const container_id      = kwargs["container_id"]
        const image_data        = kwargs["image_data"]
        const username          = kwargs["username"]
        const submit_buttons    = kwargs["submit_buttons"]
        const subtasks          = kwargs["subtasks"]
        const task_meta         = kwargs["task_meta"] ?? null
        const annotation_meta   = kwargs["annotation_meta"] ?? null
        const px_per_px         = kwargs["px_per_px"] ?? 1
        const initial_crop      = kwargs["initial_crop"] ?? null // {top: #, left: #, height: #, width: #,}
        const initial_line_size = kwargs["initial_line_size"] ?? null
        const instructions_url  = kwargs["instructions_url"] ?? null
        const config_data       = kwargs["config_data"] ?? null
        const toolbox_order     = kwargs["toolbox_order"] ?? null

        // TODO 
        // Allow for importing spacing data -- a measure tool would be nice too
        // Much of this is hardcoded defaults, 
        //   some might be offloaded to the constructor eventually...

        //create the config and add ulabel dependent data
        this.config = new Configuration({
            // Values useful for generating HTML for tool
            // TODO(v1) Make sure these don't conflict with other page elements
            "container_id": container_id,
            "annbox_id": "annbox",
            "imwrap_id": "imwrap",
            "canvas_fid_pfx": "front-canvas",
            "canvas_bid_pfx": "back-canvas",
            "canvas_did": "demo-canvas",
            "canvas_class": "easel",
            "image_id_pfx": "ann_image",
            "imgsz_class": "imgsz",
            "toolbox_id": "toolbox",
            "px_per_px": px_per_px,
            "initial_crop": initial_crop,

            // Configuration for the annotation task itself
            "image_data": ULabel.expand_image_data(this, image_data),
            "annotator": username,
            "allow_soft_id": false, // TODO allow soft eventually
            "default_annotation_color": "#fa9d2a",

            // Dimensions of various components of the tool
            "image_width": null,
            "image_height": null,
            "demo_width": 120,
            "demo_height": 40,
            "polygon_ender_size": 30,
            "edit_handle_size": 30,
            "brush_size": 60, // radius in pixels

            // Behavior on special interactions
            // "done_callback": fin_on_submit_hook,
            // "done_button": on_submit_unrolled.name,
            "instructions_url": instructions_url,
            "submit_buttons": submit_buttons,

            // ID Dialog config
            "cl_opacity": 0.4,
            "outer_diameter": 200,
            "inner_prop": 0.3,

            // Passthrough
            "task_meta": task_meta,
            "annotation_meta": annotation_meta,
        });

        // Update the ulabel config object with the passed in config data
        if (config_data != null) {
            this.config.modify_config(config_data)
        }

        if (toolbox_order === null) {
            this.toolbox_order = this.config.default_toolbox_item_order;
        }
        else {
            this.toolbox_order = toolbox_order;
        }

        // Useful for the efficient redraw of nonspatial annotations
        this.tmp_nonspatial_element_ids = {};

        // Create object for current ulabel state
        this.state = {
            // Viewer state
            // Add and handle a value for current image
            "zoom_val": 1.0,
            "last_move": null,
            "current_frame": 0,

            // Global annotation state (subtasks also maintain an annotation state)
            "current_subtask": null,
            "last_brush_stroke": null,
            "line_size": initial_line_size,
            "size_mode": "fixed",

            // Renderings state
            "demo_canvas_context": null,
            "edited": false
        };

        // Populate these in an external "static" function
        this.subtasks = {};
        this.color_info = {}
        ULabel.initialize_subtasks(this, subtasks);

        // Create object for dragging interaction state
        // TODO(v1)
        // There can only be one drag, yes? Maybe pare this down...
        // Would be nice to consolidate this with global state also
        this.drag_state = {
            "active_key": null,
            "release_button": null,
            "annotation": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "brush": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "edit": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "pan": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "zoom": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "move": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "right": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
        };

        for (const st in this.subtasks) {
            for (let i = 0; i < this.subtasks[st]["annotations"]["ordering"].length; i++) {
                let aid = this.subtasks[st]["annotations"]["ordering"][i];
                let amd = this.subtasks[st]["annotations"]["access"][aid]["spatial_type"];
                if (!NONSPATIAL_MODES.includes(amd)) {
                    this.rebuild_containing_box(this.subtasks[st]["annotations"]["ordering"][i], false, st);
                }
            }
        }

        // Indicate that object must be "init" before use!
        this.is_init = false;
    }

    init(callback) {
        // Add stylesheet
        add_style_to_document(this);

        let that = this;
        that.state["current_subtask"] = Object.keys(that.subtasks)[0];

        // Place image element
        prep_window_html(this, this.toolbox_order);

        // Detect night cookie
        if (ULabel.has_night_mode_cookie()) {
            $("#" + this.config["container_id"]).addClass("ulabel-night");
        }

        var images = [document.getElementById(`${this.config["image_id_pfx"]}__0`)];
        let mappable_images = [];
        for (let i = 0; i < images.length; i++) {
            mappable_images.push(images[i]);
            break;
        }
        let image_promises = mappable_images.map(ULabel.load_image_promise);
        Promise.all(image_promises).then((loaded_imgs) => {
            // Store image dimensions
            that.config["image_height"] = loaded_imgs[0].naturalHeight;
            that.config["image_width"] = loaded_imgs[0].naturalWidth;

            // Add canvasses for each subtask and get their rendering contexts
            for (const st in that.subtasks) {
                $("#" + that.config["imwrap_id"]).append(`
                <div id="canvasses__${st}" class="canvasses">
                    <canvas 
                        id="${that.subtasks[st]["canvas_bid"]}" 
                        class="${that.config["canvas_class"]} ${that.config["imgsz_class"]} canvas_cls" 
                        height=${that.config["image_height"] * this.config["px_per_px"]} 
                        width=${that.config["image_width"] * this.config["px_per_px"]}></canvas>
                    <canvas 
                        id="${that.subtasks[st]["canvas_fid"]}" 
                        class="${that.config["canvas_class"]} ${that.config["imgsz_class"]} canvas_cls" 
                        height=${that.config["image_height"] * this.config["px_per_px"]} 
                        width=${that.config["image_width"] * this.config["px_per_px"]} 
                        oncontextmenu="return false"></canvas>
                    <div id="dialogs__${st}" class="dialogs_container"></div>
                </div>
                `);
                $("#" + that.config["container_id"] + ` div#fad_st__${st}`).append(`
                    <div id="front_dialogs__${st}" class="front_dialogs"></div>
                `);

                // Get canvas contexts
                that.subtasks[st]["state"]["back_context"] = document.getElementById(
                    that.subtasks[st]["canvas_bid"]
                ).getContext("2d");
                that.subtasks[st]["state"]["front_context"] = document.getElementById(
                    that.subtasks[st]["canvas_fid"]
                ).getContext("2d");
            }

            // Get rendering context for demo canvas
            // that.state["demo_canvas_context"] = document.getElementById(
            //     that.config["canvas_did"]
            // ).getContext("2d");

            // Create the annotation canvases for the resume_from annotations
            ULabel.initialize_annotation_canvases(that);

            // Add the ID dialogs' HTML to the document
            build_id_dialogs(that);

            // Add the HTML for the edit suggestion to the window
            build_edit_suggestion(that);

            // Add dialog to show annotation confidence
            build_confidence_dialog(that);

            // Create listers to manipulate and export this object
            ULabel.create_listeners(that);

            that.handle_toolbox_overflow();

            // Set the canvas elements in the correct stacking order given current subtask
            that.set_subtask(that.state["current_subtask"]);

            that.create_overlays()

            // Indicate that the object is now init!
            that.is_init = true;
            $(`div#${this.config["container_id"]}`).css("display", "block");

            this.show_initial_crop();
            this.update_frame();

            // Draw demo annotation
            that.redraw_demo();

            // Draw resumed from annotations
            that.redraw_all_annotations();

            // Call the user-provided callback
            callback();
        }).catch((err) => {
            console.log(err);
            this.raise_error("Unable to load images: " + JSON.stringify(err), ULabel.elvl_fatal);
        });

        // Final code to be called after the object is initialized
        ULabel.after_init(this)

        console.log(`Time taken to construct and initialize: ${Date.now() - this.begining_time}`)
    }

    version() {
        return ULabel.version();
    }

    /**
     * Find all toolbox items that contain overlays, add a reference to them, and add them to the document
     * Currently only FilterDistance has an overlay to check for
     */
    create_overlays() {
        // Create an array that states which ToolboxItems want to create an overlay. Currently only one, but may be expanded
        const possible_overlays = [
            "FilterDistance"
        ]

        for (const toolbox_item of this.toolbox.items) {
            // Store current toolbox name in a constant for convenience
            const toolbox_name = toolbox_item.get_toolbox_item_type()

            // If the current toolboxitem is not included in possible_overlays then continue
            if (!possible_overlays.includes(toolbox_name)) continue

            switch(toolbox_name) {
                case "FilterDistance":
                    // Give ulabel a referance to the filter overlay for confinience
                    this.filter_distance_overlay = toolbox_item.get_overlay()
        
                    // Image width and height is undefined when the overlay is created, so update it here
                    this.filter_distance_overlay.set_canvas_size(
                        this.config.image_width * this.config.px_per_px, 
                        this.config.image_height * this.config.px_per_px
                    )
        
                    $("#" + this.config["imwrap_id"]).prepend(this.filter_distance_overlay.get_canvas())
                    
                    // Filter the points with an override
                    filter_points_distance_from_line(this, null, {
                        "should_redraw": this.config.distance_filter_toolbox_item.filter_on_load,
                        "multi_class_mode": this.config.distance_filter_toolbox_item.multi_class_mode,
                        "show_overlay": this.filter_distance_overlay.get_display_overlay(),
                        "distances": this.config.distance_filter_toolbox_item.default_values
                    })
                    break
                default:
                    console.warn(`Toolbox item ${toolbox_name} is associated with an overlay, yet no overlay logic exists.`)
            }
        }
    }

    handle_toolbox_overflow() {
        let tabs_height = $("#" + this.config["container_id"] + " div.toolbox-tabs").height();
        $("#" + this.config["container_id"] + " div.toolbox_inner_cls").css("height", `calc(100% - ${tabs_height + 38}px)`);
        let view_height = $("#" + this.config["container_id"] + " div.toolbox_cls")[0].scrollHeight - 38 - tabs_height;
        let want_height = $("#" + this.config["container_id"] + " div.toolbox_inner_cls")[0].scrollHeight;
        if (want_height <= view_height) {
            $("#" + this.config["container_id"] + " div.toolbox_inner_cls").css("overflow-y", "hidden");
        }
        else {
            $("#" + this.config["container_id"] + " div.toolbox_inner_cls").css("overflow-y", "scroll");
        }
    }

    // A ratio of viewport height to image height
    get_viewport_height_ratio(hgt) {
        return $("#" + this.config["annbox_id"]).height() / hgt;
    }

    // A ratio of viewport width to image width
    get_viewport_width_ratio(wdt) {
        return $("#" + this.config["annbox_id"]).width() / wdt;
    }

    // The zoom ratio which fixes the entire image exactly in the viewport with a predetermined crop
    show_initial_crop() {
        let initial_crop = this.config["initial_crop"];
        if (initial_crop != null) {
            if (
                "width" in initial_crop &&
                "height" in initial_crop &&
                "left" in initial_crop &&
                "top" in initial_crop
            ) {
                let width = this.config["image_width"];
                let height = this.config["image_height"];

                initial_crop["left"] = Math.max(initial_crop["left"], 0);
                initial_crop["top"] = Math.max(initial_crop["top"], 0);
                initial_crop["width"] = Math.min(initial_crop["width"], width - initial_crop["left"]);
                initial_crop["height"] = Math.min(initial_crop["height"], height - initial_crop["top"]);

                width = initial_crop["width"];
                height = initial_crop["height"];

                let lft_cntr = initial_crop["left"] + initial_crop["width"] / 2;
                let top_cntr = initial_crop["top"] + initial_crop["height"] / 2;

                this.state["zoom_val"] = Math.min(this.get_viewport_height_ratio(height), this.get_viewport_width_ratio(width));
                this.rezoom(lft_cntr, top_cntr, true);

                // Redraw the filter_distance_overlay if it exists
                this.filter_distance_overlay?.draw_overlay()
                
                return;
            }
            else {
                this.raise_error(`Initial crop must contain properties "width", "height", "left", and "top". Ignoring.`, ULabel.elvl_info);
            }
        }
        this.show_whole_image();
        return;
    }

    // Shows the whole image in the viewport
    show_whole_image() {
        // Grab values from config
        const width = this.config["image_width"];
        const height = this.config["image_height"];
        const top_left_corner_x = 0;
        const top_left_corner_y = 0;

        // Calculate minimum zoom value required to show the whole image
        this.state["zoom_val"] = Math.min(this.get_viewport_height_ratio(height), this.get_viewport_width_ratio(width));

        this.rezoom(top_left_corner_x, top_left_corner_y, true);
        
        this.filter_distance_overlay?.draw_overlay()
    }

    // ================== Cursor Helpers ====================
    /**
     * Deprecated when dynamic line size toolbox item was removed. 
     * TODO: Un-deprecated the dynamic line size toolbox item.
     */
    update_cursor() {
        // let color = this.get_non_spatial_annotation_color(null, true);
        // let thr_width = this.get_line_size() * this.state["zoom_val"]
        // let width = Math.max(Math.min(thr_width, 64), 6);
        // let cursor_svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${width}px" height="${width}px" viewBox="0 0 ${width} ${width}">
        //     <circle cx="${width / 2}" cy="${width / 2}" r="${width / 2}" opacity="0.8" stroke="white" fill="${color}" />
        // </svg>`;

        // let bk_width = Math.max(Math.min(thr_width, 32), 6);
        // let bk_cursor_svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${bk_width}px" height="${bk_width}px" viewBox="0 0 ${bk_width} ${bk_width}">
        //     <circle cx="${bk_width / 2}" cy="${bk_width / 2}" r="${bk_width / 2}" opacity="0.8" stroke="${color}" fill="${color}" />
        // </svg>`;

        // let cursor_b64 = btoa(cursor_svg);
        // let bk_cursor_b64 = btoa(bk_cursor_svg);
        // $("#" + this.config["annbox_id"]).css(
        //     "cursor",
        //     `url(data:image/svg+xml;base64,${cursor_b64}) ${width / 2} ${width / 2}, url(data:image/svg+xml;base64,${bk_cursor_b64}) ${bk_width / 2} ${bk_width / 2}, auto`
        // );
    }

    // ================== Subtask Helpers ===================

    readjust_subtask_opacities() {
        for (const st_key in this.subtasks) {
            let sliderval = $("#tb-st-range--" + st_key).val();
            $("div#canvasses__" + st_key).css("opacity", sliderval / 100);
        }
    }

    set_subtask(st_key) {
        let old_st = this.state["current_subtask"];

        // Change object state
        this.state["current_subtask"] = st_key;

        // Bring new set of canvasses out to front
        $("div.canvasses").css("z-index", BACK_Z_INDEX);
        $("div#canvasses__" + this.state["current_subtask"]).css("z-index", FRONT_Z_INDEX);

        // Show appropriate set of dialogs
        $("div.dialogs_container").css("display", "none");
        $("div#dialogs__" + this.state["current_subtask"]).css("display", "block");

        // Show appropriate set of annotation modes
        $("a.md-btn").css("display", "none");
        $("a.md-btn.md-en4--" + st_key).css("display", "inline-block");

        // Show appropriate set of class options
        $("div.tb-id-app").css("display", "none");
        $("div#tb-id-app--" + this.state["current_subtask"]).css("display", "block");

        // Hide/show delete class
        this.toggle_delete_class_id_in_toolbox();

        // Adjust tab buttons in toolbox
        $("a#tb-st-switch--" + old_st).attr("href", "#");
        $("a#tb-st-switch--" + old_st).parent().removeClass("sel");
        $("input#tb-st-range--" + old_st).val(Math.round(100 * this.subtasks[old_st]["inactive_opacity"]));
        $("a#tb-st-switch--" + st_key).removeAttr("href");
        $("a#tb-st-switch--" + st_key).parent().addClass("sel");
        $("input#tb-st-range--" + st_key).val(100);

        // Update toolbox opts
        this.update_annotation_mode();
        this.update_current_class();

        // Set transparancy for inactive layers
        this.readjust_subtask_opacities();

        // Redraw demo
        this.redraw_demo();
    }

    // ================= Toolbox Functions ==================

    set_annotation_mode(annotation_mode) {
        this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] = annotation_mode;
        this.update_annotation_mode();
    }

    update_annotation_mode() {
        $("a.md-btn.sel").attr("href", "#");
        $("a.md-btn.sel").removeClass("sel");
        $("a#md-btn--" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).addClass("sel");
        $("a#md-btn--" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).removeAttr("href");
        this.show_annotation_mode();
    }

    update_current_class() {
        this.update_id_toolbox_display();
        // $("a.tbid-opt.sel").attr("href", "#");
        // $("a.tbid-opt.sel").removeClass("sel");
        // $("a#toolbox_sel_" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).addClass("sel");
        // $("a#toolbox_sel_" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).removeAttr("href");
    }

    // Show annotation mode
    show_annotation_mode(el = null) {
        if (el === null) {
            el = $("a.md-btn.sel");
        }
        let new_name = el.attr("amdname");
        $("#" + this.config["toolbox_id"] + " .current_mode").html(new_name);
        $(`div.frame_annotation_dialog:not(.fad_st__${this.state["current_subtask"]})`).removeClass("active");
        if (["whole-image", "global"].includes(this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"])) {
            $(`div.frame_annotation_dialog.fad_st__${this.state["current_subtask"]}`).addClass("active");
        }
        else {
            $("div.frame_annotation_dialog").removeClass("active");
        }
    }

    toggle_delete_class_id_in_toolbox() {
        // Check if a DELETE_MODE is active
        let show_delete = DELETE_MODES.includes(this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]);
        if (show_delete) {
            // Show the delete class id in the toolbox
            $("a#toolbox_sel_" + DELETE_CLASS_ID).css("display", "inline-block"); 
            // Select the delete class id in the toolbox by clicking it
            $("a#toolbox_sel_" + DELETE_CLASS_ID).click();        
        } else {
            // Hide the delete class id in the toolbox
            $("a#toolbox_sel_" + DELETE_CLASS_ID).css("display", "none");
            // If the delete class id is selected, select the first class id in the toolbox
            if ($("a#toolbox_sel_" + DELETE_CLASS_ID).hasClass("sel")) {
                $("a.tbid-opt").first().click();
            }
        }

        // For all other class ids, show or hide them in the toolbox
        for (const class_id of this.subtasks[this.state["current_subtask"]]["class_ids"]) {
            // Skip the delete class id
            if (class_id === DELETE_CLASS_ID) continue;

            // Show or hide the class id in the toolbox
            if (show_delete) {
                $("a#toolbox_sel_" + class_id).css("display", "none");
            } else {
                $("a#toolbox_sel_" + class_id).css("display", "inline-block");
            }
        }
    }

    /**
     * Set a new annotation mode
     * 
     * @param {string} annotation_mode Annotation mode to set
     * @returns {boolean} - True if the annotation mode was successfully set, false otherwise
     */
    set_and_update_annotation_mode(annotation_mode) {
        // Ensure new mode is allowed
        if (!this.subtasks[this.state["current_subtask"]]["allowed_modes"].includes(annotation_mode)) {
            console.warn(`Annotation mode ${annotation_mode} is not allowed for subtask ${this.state["current_subtask"]}`);
            return false;
        }
        // Set the new mode via the toolbox
        document.getElementById("md-btn--" + annotation_mode).click();
        return true;
    }

    // Draw demo annotation in demo canvas
    redraw_demo() {
        // this.state["demo_canvas_context"].clearRect(0, 0, this.config["demo_width"] * this.config["px_per_px"], this.config["demo_height"] * this.config["px_per_px"]);
        // this.draw_annotation(DEMO_ANNOTATION, "demo_canvas_context", true, null, "demo");
        // this.update_cursor();
    }

    // ================= Instance Utilities =================

    // A robust measure of zoom
    get_empirical_scale() {
        // Simple ratio of canvas width to image x-dimension
        return $("#" + this.config["imwrap_id"]).width() / this.config["image_width"];
    }

    // Get a unique ID for new annotations
    make_new_annotation_id() {
        return uuidv4();
    }

    // Get the start of a spatial payload based on mouse event and current annotation mode
    get_init_spatial(gmx, gmy, annotation_mode) {
        switch (annotation_mode) {
            case "point":
                return [
                    [gmx, gmy]
                ];
            case "bbox":
            case "polyline":
            case "contour":
            case "tbar":
            case "delete_polygon":
            case "delete_bbox":
                return [
                    [gmx, gmy],
                    [gmx, gmy]
                ];
            case "polygon":
                // Get brush spatial payload if in brush mode
                if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_brush_mode"]) {
                    return this.get_brush_circle_spatial_payload(gmx, gmy);
                }
                return [[
                    [gmx, gmy],
                    [gmx, gmy]
                ]]
            case "bbox3":
                return [
                    [gmx, gmy, this.state["current_frame"]],
                    [gmx, gmy, this.state["current_frame"]]
                ];
            default:
                // TODO broader refactor of error handling and detecting/preventing corruption
                this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                return null;
        }
    }

    get_init_id_payload(spatial_type = null) {
        this.set_id_dialog_payload_to_init(null);
        if (DELETE_MODES.includes(spatial_type)) {
            // Use special id payload for delete modes
            return [{
                "class_id": DELETE_CLASS_ID,
                "confidence": 1.0,
            }]
        } else {
            return JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]));
        }
    }

    // Create a new canvas for an individual annotation and return its context
    get_init_canvas_context_id(annotation_id, subtask = null) {
        if (subtask === null) {
            subtask = this.state["current_subtask"];
        }
        const canvas_id = `canvas__${annotation_id}`;
        // Add canvas to the "cancasses__${subtask}" div
        $("#canvasses__" + subtask).append(`
            <canvas 
                id="${canvas_id}" 
                class="${this.config["canvas_class"]} ${this.config["imgsz_class"]} canvas_cls annotation_canvas" 
                height=${this.config["image_height"] * this.config["px_per_px"]} 
                width=${this.config["image_width"] * this.config["px_per_px"]}></canvas>
        `);
        // Adjust style of the canvas to fit the zoom
        $("#" + canvas_id).css("height", `${this.config["image_height"] * this.state["zoom_val"]}px`);
        $("#" + canvas_id).css("width", `${this.config["image_width"] * this.state["zoom_val"]}px`);
        // Make sure the front context stays in front
        $("#" + canvas_id).css("z-index", BACK_Z_INDEX);

        // Add the canvas context to the state
        this.subtasks[subtask]["state"]["annotation_contexts"][annotation_id] = document.getElementById(canvas_id).getContext("2d");

        return canvas_id;
    }

    // Remove a canvas from the document and the state
    destroy_annotation_context(annotation_id, subtask = null) {
        if (subtask === null) {
            subtask = this.state["current_subtask"];
        }
        
        // Remove the canvas context from the state
        delete this.subtasks[subtask]["state"]["annotation_contexts"][annotation_id];
        // Remove the canvas from the document
        $("#" + this.subtasks[subtask]["annotations"]["access"][annotation_id]["canvas_id"]).remove();
    }

    // ================= Access string utilities =================

    // Access a point in a spatial payload using access string
    // Optional arg at the end is for finding position of a moved splice point through its original access string
    get_with_access_string(annid, access_str, as_though_pre_splice = false) {
        // TODO(3d)
        let bbi, bbj, bbk, bbox_pts, ret, bas, dif, tbi, tbj, tbar_pts, active_index;
        const spatial_type = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"];
        let spatial_payload = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"];
        let active_spatial_payload = spatial_payload;

        switch (spatial_type) {
            case "bbox":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                bbox_pts = spatial_payload;
                return [bbox_pts[bbi][0], bbox_pts[bbj][1]];
            case "point":
                return JSON.parse(JSON.stringify(spatial_payload));
            case "bbox3":
                // TODO(3d)
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                bbox_pts = spatial_payload;
                ret = [bbox_pts[bbi][0], bbox_pts[bbj][1]];
                if (access_str.length > 2) {
                    bbk = parseInt(access_str[2], 10);
                    ret.push(bbox_pts[bbk][2]);
                }
                return ret;
            case "polygon":
            case "polyline":
                if (spatial_type === "polygon") {
                    // access_str will be an array of two indices, the first of which is the index of the polygon
                    // and the second of which is the index of the point in the polygon
                    // first parse the access string
                    active_index = parseInt(access_str[0], 10);
                    active_spatial_payload = spatial_payload.at(active_index);
                    access_str = access_str[1];
                }
                bas = parseInt(access_str, 10);
                dif = parseFloat(access_str) - bas;
                if (dif < 0.005) {
                    return active_spatial_payload[bas];
                }
                else {
                    if (as_though_pre_splice) {
                        dif = 0;
                        bas += 1;
                        return active_spatial_payload[bas];
                    }
                    else {
                        return GeometricUtils.interpolate_poly_segment(
                            active_spatial_payload,
                            bas, dif
                        );
                    }
                }
            case "tbar":
                // TODO 3 point method
                tbi = parseInt(access_str[0], 10);
                tbj = parseInt(access_str[1], 10);
                tbar_pts = spatial_payload;
                return [tbar_pts[tbi][0], tbar_pts[tbj][1]];
            default:
                this.raise_error(
                    "Unable to apply access string to annotation of type " + spatial_type,
                    ULabel.elvl_standard
                );
        }
    }

    // Set a point in a spatial payload using access string
    set_with_access_string(annid, access_str, val, undoing = null) {
        // Ensure the values are ints
        // val[0] = Math.round(val[0]);
        // val[1] = Math.round(val[1]);
        // TODO(3d)
        let bbi, bbj, bbk, active_index;
        const spatial_type = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"];
        let spatial_payload = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"];
        let active_spatial_payload = spatial_payload;

        switch (spatial_type) {
            case "bbox":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                spatial_payload[bbi][0] = val[0];
                spatial_payload[bbj][1] = val[1];
                break;
            case "point":
                spatial_payload[bbi][0] = val[0];
                spatial_payload[bbi][0] = val[0];
                break;
            case "bbox3":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                spatial_payload[bbi][0] = val[0];
                spatial_payload[bbj][1] = val[1];
                if (access_str.length > 2 && val.length > 2) {
                    bbk = parseInt(access_str[2], 10);
                    spatial_payload[bbk][2] = val[2];
                }
                break;
            case "tbar":
                // TODO 3 points
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                spatial_payload[bbi][0] = val[0];
                spatial_payload[bbj][1] = val[1];
                break;
            case "polygon":
            case "polyline":
                if (spatial_type === "polygon") {
                    // access_str will be an array of two indices, the first of which is the index of the polygon
                    // and the second of which is the index of the point in the polygon
                    // first parse the access string
                    active_index = parseInt(access_str[0], 10);
                    active_spatial_payload = spatial_payload.at(active_index);
                    access_str = access_str[1];
                }
                var bas = parseInt(access_str, 10);
                var dif = parseFloat(access_str) - bas;
                if (dif < 0.005) {
                    var acint = parseInt(access_str, 10);
                    var npts = active_spatial_payload.length;
                    if ((spatial_type === "polygon") && ((acint === 0) || (acint === (npts - 1)))) {
                        active_spatial_payload[0] = [val[0], val[1]];
                        active_spatial_payload[npts - 1] = [val[0], val[1]];
                    }
                    else {
                        active_spatial_payload[acint] = val;
                    }
                } else {
                    if (undoing === true) {
                        active_spatial_payload.splice(bas + 1, 1);
                    }
                    else if (undoing === false) {
                        active_spatial_payload.splice(bas + 1, 0, [val[0], val[1]]);
                    }
                    else {
                        var newpt = GeometricUtils.interpolate_poly_segment(
                            active_spatial_payload,
                            bas, dif
                        );
                        active_spatial_payload.splice(bas + 1, 0, newpt);
                    }
                }
                break;
            default:
                this.raise_error(
                    "Unable to apply access string to annotation of type " + spatial_type,
                    ULabel.elvl_standard
                );
        }
    }

    get_annotation_color(annotation) {
        // Use the annotation's class id to get the color of the annotation
        const class_id = get_annotation_class_id(annotation)
        const color = this.color_info[class_id]

        // Log an error and return a default color if the color is undefined
        if (color === undefined) {
            console.error(`get_annotation_color encountered error while getting annotation color with class id ${class_id}`)
            return this.config.default_annotation_color
        }

        // Return the color after applying a gradient to it based on its confidence
        // If gradients are disabled, get_gradient will return the passed in color
        return get_gradient(annotation, color, get_annotation_confidence, $("#gradient-slider").val() / 100)
    }

    get_non_spatial_annotation_color(clf_payload, demo = false, subtask = null) {
        if (this.config["allow_soft_id"]) {
            // not currently supported;
            return this.config["default_annotation_color"];
        }
        let crst = this.state["current_subtask"];
        if (subtask != null && !demo) {
            crst = subtask;
        }
        let col_payload = JSON.parse(JSON.stringify(this.subtasks[crst]["state"]["id_payload"])); // BOOG
        if (demo) {
            let dist_prop = 1.0;
            let class_ids = this.subtasks[crst]["class_ids"];
            let pfx = "div#tb-id-app--" + this.state["current_subtask"];
            let idarr = $(pfx + " a.tbid-opt.sel").attr("id").split("_");
            let class_ind = class_ids.indexOf(parseInt(idarr[idarr.length - 1]));
            // Recompute and render opaque pie slices
            for (var i = 0; i < class_ids.length; i++) {
                if (i === class_ind) {
                    col_payload[i] = {
                        "class_id": class_ids[i],
                        "confidence": dist_prop
                    };
                }
                else {
                    col_payload[i] = {
                        "class_id": class_ids[i],
                        "confidence": (1 - dist_prop) / (class_ids.length - 1)
                    };
                }
            }
        }
        else {
            if (clf_payload != null) {
                col_payload = clf_payload;
            }
        }

        for (let i = 0; i < col_payload.length; i++) {
            if (col_payload[i]["confidence"] > 0) {
                return this.subtasks[crst]["class_defs"][i]["color"];
            }
        }
        return this.config["default_annotation_color"];
    }

    // ================= Drawing Functions =================

    draw_bounding_box(annotation_object, ctx, demo = false, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }

        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object)
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";

        // Draw the box
        const sp = annotation_object["spatial_payload"][0];
        const ep = annotation_object["spatial_payload"][1];
        ctx.beginPath();
        ctx.moveTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((sp[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.closePath();
        ctx.stroke();
    }

    draw_point(annotation_object, ctx, demo = false, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        } else {
            line_size = this.get_line_size(demo);
        }

        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object)
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";

        // Draw the box
        const sp = annotation_object["spatial_payload"][0];
        ctx.beginPath();
        ctx.arc((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px, line_size * px_per_px * 0.75, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.beginPath();
        ctx.arc((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px, line_size * px_per_px * 3, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
    }

    draw_bbox3(annotation_object, ctx, demo = false, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        let diffZ = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
            if ("diffZ" in offset) {
                diffZ = offset["diffZ"];
            }
        }

        let curfrm = this.state["current_frame"];
        const sp = annotation_object["spatial_payload"][0];
        const ep = annotation_object["spatial_payload"][1];
        if (curfrm < (Math.min(sp[2], ep[2]) + diffZ) || curfrm > (Math.max(sp[2], ep[2]) + diffZ)) {
            return;
        }
        let fill = false;
        if (curfrm === (Math.min(sp[2], ep[2]) + diffZ) || curfrm === (Math.max(sp[2], ep[2]) + diffZ)) {
            fill = true;
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }

        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object)
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";

        // Draw the box
        ctx.beginPath();
        ctx.moveTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((sp[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.closePath();
        ctx.stroke();
        if (fill) {
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }

    draw_polygon(annotation_object, ctx, demo = false, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }


        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }

        // Hack to turn off fills during vanish
        let is_in_vanish_mode = line_size <= 0.01;

        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object)
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.lineCap = "round";
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";

        const spatial_type = annotation_object["spatial_type"];
        let spatial_payload = annotation_object["spatial_payload"];
        let active_spatial_payload = spatial_payload;

        // if a polygon, n_iters is the length the spatial payload
        // else n_iters is 1
        let n_iters = spatial_type === "polygon" ? spatial_payload.length : 1;

        // Draw all polygons/polylines
        for (let i = 0; i < n_iters; i++) {
            if (spatial_type === "polygon") {
                active_spatial_payload = spatial_payload[i];
            }
            // Draw the borders
            const pts = active_spatial_payload;
            if (pts.length > 0) {
                ctx.beginPath();
                ctx.moveTo((pts[0][0] + diffX) * px_per_px, (pts[0][1] + diffY) * px_per_px);
                for (let pti = 1; pti < pts.length; pti++) {
                    ctx.lineTo((pts[pti][0] + diffX) * px_per_px, (pts[pti][1] + diffY) * px_per_px);
                }
                ctx.stroke();
            }

            // If not in vanish mode and polygon is closed, fill it or draw a hole
            if (!is_in_vanish_mode && spatial_type === "polygon" && GeometricUtils.is_polygon_closed(active_spatial_payload)) {
                if (annotation_object["spatial_payload_holes"][i]) {
                    ctx.globalCompositeOperation =  'destination-out';
                } else {
                    ctx.globalAlpha = 0.2;
                }
                ctx.closePath();
                ctx.fill();
                // Reset globals
                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha = 1.0;
            }           
        }
    }

    draw_contour(annotation_object, ctx, demo = false, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }


        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object)
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.lineCap = "round";
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";

        // Draw the box
        const pts = annotation_object["spatial_payload"];
        ctx.beginPath();
        ctx.moveTo((pts[0][0] + diffX) * px_per_px, (pts[0][1] + diffY) * px_per_px);
        for (var pti = 1; pti < pts.length; pti++) {
            ctx.lineTo((pts[pti][0] + diffX) * px_per_px, (pts[pti][1] + diffY) * px_per_px);
        }
        ctx.stroke();
    }

    draw_tbar(annotation_object, ctx, demo = false, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }

        // Prep for tbar drawing
        const color = this.get_annotation_color(annotation_object)
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";

        // Draw the tall part of the tbar
        const sp = annotation_object["spatial_payload"][0];
        const ep = annotation_object["spatial_payload"][1];
        ctx.beginPath();
        ctx.moveTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.stroke();

        // Draw the cross of the tbar
        let halflen = Math.sqrt(
            (sp[0] - ep[0]) * (sp[0] - ep[0]) + (sp[1] - ep[1]) * (sp[1] - ep[1])
        ) / 2;
        let theta = Math.atan((ep[1] - sp[1]) / (ep[0] - sp[0]));
        let sb = [
            sp[0] + halflen * Math.sin(theta),
            sp[1] - halflen * Math.cos(theta)
        ];
        let eb = [
            sp[0] - halflen * Math.sin(theta),
            sp[1] + halflen * Math.cos(theta)
        ];

        ctx.lineCap = "square";
        ctx.beginPath();
        ctx.moveTo((sb[0] + diffX) * px_per_px, (sb[1] + diffY) * px_per_px);
        ctx.lineTo((eb[0] + diffX) * px_per_px, (eb[1] + diffY) * px_per_px);
        ctx.stroke();
        ctx.lineCap = "round";

    }

    register_nonspatial_redraw_start(subtask) {
        // TODO(3d)
        this.tmp_nonspatial_element_ids[subtask] = [];
        let nonsp_window = $(`div#fad_st__${subtask}`);
        if (nonsp_window.length) {
            $(`div#fad_st__${subtask} div.fad_annotation_rows div.fad_row`).each((idx, val) => {
                this.tmp_nonspatial_element_ids[subtask].push($(val).attr("id"));
            });
        }
    }

    draw_nonspatial_annotation(annotation_object, svg_obj, subtask = null) {
        if (subtask === null) {
            subtask = this.state["current_subtask"];
        }
        let found = false;
        for (let i = 0; i < this.tmp_nonspatial_element_ids[subtask].length; i++) {
            if ("row__" + annotation_object["id"] === this.tmp_nonspatial_element_ids[subtask][i]) {
                this.tmp_nonspatial_element_ids[subtask][i] = null;
                found = true;
            }
        }
        if (!found) {
            $(`div#fad_st__${subtask} div.fad_annotation_rows`).append(`
            <div id="row__${annotation_object["id"]}" class="fad_row">
                <div class="fad_buttons">
                    <div class="fad_inp_container text">
                        <textarea id="note__${annotation_object["id"]}" class="nonspatial_note" placeholder="Notes...">${annotation_object["text_payload"]}</textarea>
                    </div><!--
                    --><div class="fad_inp_container button frst">
                        <a href="#" id="reclf__${annotation_object["id"]}" class="fad_button reclf"></a>
                    </div><!--
                    --><div class="fad_inp_container button">
                        <a href="#" id="delete__${annotation_object["id"]}" class="fad_button delete">&#215;</a>
                    </div>
                </div><!--
                --><div id="icon__${annotation_object["id"]}" class="fad_type_icon invert-this-svg" style="background-color: ${this.get_non_spatial_annotation_color(annotation_object["classification_payloads"], false, subtask)};">
                    ${svg_obj}
                </div>
            </div>
            `);
        }
        else {
            $(`textarea#note__${annotation_object["id"]}`).val(annotation_object["text_payload"]);
            $(`div#icon__${annotation_object["id"]}`).css("background-color", this.get_non_spatial_annotation_color(annotation_object["classification_payloads"], false, subtask));
        }
    }

    draw_whole_image_annotation(annotation_object, subtask = null) {
        this.draw_nonspatial_annotation(annotation_object, WHOLE_IMAGE_SVG, subtask);
    }

    draw_global_annotation(annotation_object, subtask = null) {
        this.draw_nonspatial_annotation(annotation_object, GLOBAL_SVG, subtask);
    }

    handle_nonspatial_redraw_end(subtask) {
        // TODO(3d)
        for (let i = 0; i < this.tmp_nonspatial_element_ids[subtask].length; i++) {
            $(`#${this.tmp_nonspatial_element_ids[subtask][i]}`).remove();
        }
        this.tmp_nonspatial_element_ids[subtask] = [];
    }

    draw_annotation(annotation_object, demo = false, offset = null, subtask = null) {
        // DEBUG left here for refactor reference, but I don't think it's needed moving forward
        //    there may be a use case for drawing depreacted annotations 
        // Don't draw if deprecated
        if (annotation_object["deprecated"]) return;

        // Get actual context from context key and subtask
        let context = null;
        if (subtask === "demo") {
            // Must be demo
            if (annotation_object["canvas_id"] != "demo_canvas_context") {
                throw new Error("Error drawing demo annotation.")
            }
            context = this.state["demo_canvas_context"];
        }
        else if (NONSPATIAL_MODES.includes(annotation_object["spatial_type"])) {
            // Draw nonspatial annotations on the front context
            context = this.subtasks[subtask]["state"]["front_context"];
        } else {
            // Draw spatial annotations on their own canvas
            context = this.subtasks[subtask]["state"]["annotation_contexts"][annotation_object["id"]];
        }

        // Dispatch to annotation type's drawing function
        switch (annotation_object["spatial_type"]) {
            case "bbox":
            case "delete_bbox":
                this.draw_bounding_box(annotation_object, context, demo, offset);
                break;
            case "point":
                this.draw_point(annotation_object, context, demo, offset);
                break;
            case "bbox3":
                // TODO(new3d)
                this.draw_bbox3(annotation_object, context, demo, offset);
                break;
            case "polygon":
            case "polyline":
            case "delete_polygon":
                this.draw_polygon(annotation_object, context, demo, offset);
                break;
            case "contour":
                this.draw_contour(annotation_object, context, demo, offset);
                break;
            case "tbar":
                this.draw_tbar(annotation_object, context, demo, offset);
                break;
            case "whole-image":
                this.draw_whole_image_annotation(annotation_object, subtask);
                break;
            case "global":
                this.draw_global_annotation(annotation_object, subtask);
                break;
            default:
                this.raise_error("Warning: Annotation " + annotation_object["id"] + " not understood", ULabel.elvl_info);
                break;
        }
    }

    draw_annotation_from_id(id, offset = null, subtask = null) {
        if (subtask === null) {
            // Should never be here tbh
            subtask = this.state["current_subtask"];
        }
        let frame = this.subtasks[subtask]["annotations"]["access"][id]["frame"];
        // Keep `==` here, we want to catch null and undefined
        if (frame == null || frame == "undefined" || frame == this.state["current_frame"]) {
            this.draw_annotation(this.subtasks[subtask]["annotations"]["access"][id], false, offset, subtask);
        }
    }

    // Draws the first n annotations on record
    redraw_n_annotations(n, offset = null, subtask = null, nonspatial_only = false) {
        if (subtask === null) {
            subtask = this.state["current_subtask"];
        }
        
        for (var i = 0; i < n; i++) {
            let annid = this.subtasks[subtask]["annotations"]["ordering"][i];
            // Skip spatial annotations to save on time if we only need to redraw nonspatial annotations on the front context
            let is_spatial = !NONSPATIAL_MODES.includes(this.subtasks[subtask]["annotations"]["access"][annid]["spatial_type"]);
            if (nonspatial_only && is_spatial) {
                continue;
            } else if (is_spatial) {
                // Clear the annotation's canvas
                this.clear_annotation_canvas(annid, subtask);
            }
            // Draw the annotation
            if (offset != null && offset["id"] === annid) {
                this.draw_annotation_from_id(annid, offset, subtask);
            } else {
                this.draw_annotation_from_id(annid, null, subtask);
            }
        }
    }

    redraw_all_annotations_in_subtask(subtask, offset = null, nonspatial_only = false) {
        // Clear the canvas
        this.clear_front_canvas();
        this.register_nonspatial_redraw_start(subtask);
        // Handle redraw of each annotation
        this.redraw_n_annotations(this.subtasks[subtask]["annotations"]["ordering"].length, offset, subtask, nonspatial_only);
        this.handle_nonspatial_redraw_end(subtask);
    }

    redraw_all_annotations(subtask = null, offset = null, nonspatial_only = false) {
        // TODO(3d)
        if (subtask === null) {
            for (const st in this.subtasks) {
                this.redraw_all_annotations_in_subtask(st, offset, nonspatial_only);
            }
        }
        else {
            this.redraw_all_annotations_in_subtask(subtask, offset, nonspatial_only);
        }

        /*
        TODO:
        some update scheduling to make binding easier
        i.e. a batch of functions run on adding, removing annotations
        and a different batch run on redraw, a batch for subtask switch etc.
        */
        this.toolbox.redraw_update_items(this);
    }

    redraw_annotation(annotation_id, subtask = null, offset = null) {
        if (subtask === null) {
            subtask = this.state["current_subtask"];
        }
        // Check if the annotation is spatial
        let is_spatial = !NONSPATIAL_MODES.includes(this.subtasks[subtask]["annotations"]["access"][annotation_id]["spatial_type"]);
        if (is_spatial) {
            this.clear_annotation_canvas(annotation_id, subtask);
            this.draw_annotation_from_id(annotation_id, offset, subtask);
        } else {
            // Nonspatial annotations are drawn on the front context
            this.redraw_all_annotations_in_subtask(subtask, offset, true);
        }
        this.toolbox.redraw_update_items(this);
    }

    clear_annotation_canvas(annotation_id, subtask = null) {
        if (subtask === null) {
            subtask = this.state["current_subtask"];
        }
        this.subtasks[subtask]["state"]["annotation_contexts"][annotation_id].clearRect(0, 0, this.config["image_width"] * this.config["px_per_px"], this.config["image_height"] * this.config["px_per_px"]);
    }

    clear_front_canvas(subtask = null) {
        if (subtask === null) {
            subtask = this.state["current_subtask"];
        }
        this.subtasks[subtask]["state"]["front_context"].clearRect(0, 0, this.config["image_width"] * this.config["px_per_px"], this.config["image_height"] * this.config["px_per_px"]);
    }

    // ================= On-Canvas HTML Dialog Utilities =================

    // When a dialog is created or its position changes, make sure all
    // dialogs that are meant to be visible are in their correct positions
    reposition_dialogs() {
        // Get info about image wrapper
        var imwrap = $("#" + this.config["imwrap_id"]);
        const new_dimx = imwrap.width();
        const new_dimy = imwrap.height();

        // Get current subtask for convenience
        let crst = this.state["current_subtask"];

        // Iterate over all visible dialogs and apply new positions
        for (var id in this.subtasks[crst]["state"]["visible_dialogs"]) {
            let el = this.subtasks[crst]["state"]["visible_dialogs"][id];
            let jqel = $("#" + id);
            let new_left = el["left"] * new_dimx;
            let new_top = el["top"] * new_dimy;
            switch (el["pin"]) {
                case "center":
                    new_left -= jqel.width() / 2;
                    new_top -= jqel.height() / 2;
                    break;
                case "top-left":
                    // No need to adjust for a top left pin
                    break;
                default:
                    // TODO top-right, bottom-left, bottom-right
                    // top/bottom-center? center-left/right?
                    break;
            }

            // Enforce that position be on the underlying image
            // TODO

            // Apply new position
            jqel.css("left", new_left + "px");
            jqel.css("top", new_top + "px");
        }
    }

    create_polygon_ender(gmx, gmy, polygon_id) {
        // Create ender id
        const ender_id = "ender_" + polygon_id;

        // Build ender html
        const ender_html = `
        <a href="#" id="${ender_id}" class="ender_outer">
            <span id="${ender_id}_inner" class="ender_inner"></span>
        </a>
        `;
        $("#dialogs__" + this.state["current_subtask"]).append(ender_html);
        $("#" + ender_id).css({
            "width": this.config["polygon_ender_size"] + "px",
            "height": this.config["polygon_ender_size"] + "px",
            "border-radius": this.config["polygon_ender_size"] / 2 + "px"
        });
        $("#" + ender_id + "_inner").css({
            "width": this.config["polygon_ender_size"] / 5 + "px",
            "height": this.config["polygon_ender_size"] / 5 + "px",
            "border-radius": this.config["polygon_ender_size"] / 10 + "px",
            "top": 2 * this.config["polygon_ender_size"] / 5 + "px",
            "left": 2 * this.config["polygon_ender_size"] / 5 + "px"
        });

        // Add this id to the list of dialogs with managed positions
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][ender_id] = {
            "left": gmx / this.config["image_width"],
            "top": gmy / this.config["image_height"],
            "pin": "center"
        };
        this.reposition_dialogs();
    }

    destroy_polygon_ender(polygon_id) {
        // Create ender id
        const ender_id = "ender_" + polygon_id;
        $("#" + ender_id).remove();
        delete this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][ender_id];
        this.reposition_dialogs();
    }

    // Move a polygon ender to the mouse location
    move_polygon_ender(gmx, gmy, polygon_id) {
        // Create ender id
        const ender_id = "ender_" + polygon_id;

        // Create ender if it doesn't exist
        if (!($("#" + ender_id).length)) {
            this.create_polygon_ender(gmx, gmy, polygon_id);
            return;
        }
        
        // Add to list of visible dialogs
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][ender_id] = {
            "left": gmx / this.config["image_width"],
            "top": gmy / this.config["image_height"],
            "pin": "center"
        };
        this.reposition_dialogs();
    }

    toggle_brush_mode(mouse_event) {
        // Try and switch to polygon annotation if not already in it
        const current_subtask = this.state["current_subtask"];
        let is_in_polygon_mode = this.subtasks[current_subtask]["state"]["annotation_mode"] === "polygon";
        // Try and switch to polygon mode if not already in it
        if (!is_in_polygon_mode) {
            is_in_polygon_mode = this.set_and_update_annotation_mode("polygon");
        }
        // If we're in polygon mode, toggle brush mode
        if (is_in_polygon_mode) {
            // If in erase mode, turn it off
            if (this.subtasks[current_subtask]["state"]["is_in_erase_mode"]) {
                this.toggle_erase_mode();
            }
            // Toggle brush mode
            this.subtasks[current_subtask]["state"]["is_in_brush_mode"] = !this.subtasks[current_subtask]["state"]["is_in_brush_mode"];
            if (this.subtasks[current_subtask]["state"]["is_in_brush_mode"]) {
                // Hide edit/id dialogs
                this.hide_edit_suggestion();
                this.hide_global_edit_suggestion();
                this.hide_id_dialog();
                // If in starting_complex_polygon mode, end it by undoing
                if (this.subtasks[current_subtask]["state"]["starting_complex_polygon"]) {
                    this.undo(true);
                }
                // Show brush circle
                let gmx = this.get_global_mouse_x(mouse_event);
                let gmy = this.get_global_mouse_y(mouse_event);
                this.create_brush_circle(gmx, gmy);
            } else {
                this.destroy_brush_circle();
            }
        }
    }

    toggle_erase_mode(mouse_event) {
        const current_subtask = this.state["current_subtask"];
        // If not in brush mode, turn it on
        if (!this.subtasks[current_subtask]["state"]["is_in_brush_mode"]) {
            this.toggle_brush_mode(mouse_event);
        }

        // Toggle erase mode
        this.subtasks[current_subtask]["state"]["is_in_erase_mode"] = !this.subtasks[current_subtask]["state"]["is_in_erase_mode"];

        // Update brush circle color
        const brush_circle_id = "brush_circle";
        $("#" + brush_circle_id).css({
            "background-color": this.subtasks[current_subtask]["state"]["is_in_erase_mode"] ? "red" : "white",
        });

        // When turning off erase mode, also turn off brush mode
        if (this.subtasks[current_subtask]["state"]["is_in_brush_mode"] && !this.subtasks[current_subtask]["state"]["is_in_erase_mode"]) {
            this.toggle_brush_mode();
        }
    }

    // Create a brush circle at the mouse location
    create_brush_circle(gmx, gmy) {
        // Create brush circle id
        const brush_circle_id = "brush_circle";

        // Build brush circle html
        const brush_circle_html = `
        <a href="#" id="${brush_circle_id}" class="brush_circle"></a>`;
        $("#dialogs__" + this.state["current_subtask"]).append(brush_circle_html);
        $("#" + brush_circle_id).css({
            "width": (this.config["brush_size"]*this.state["zoom_val"]) + "px",
            "height": (this.config["brush_size"]*this.state["zoom_val"]) + "px",
            "border-radius": (this.config["brush_size"]*this.state["zoom_val"])*2 + "px",
            "background-color": this.subtasks[this.state["current_subtask"]]["state"]["is_in_erase_mode"] ? "red" : "white",
            "left": gmx + "px",
            "top": gmy + "px",
        });

        // Add this id to the list of dialogs with managed positions
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][brush_circle_id] = {
            "left": gmx / this.config["image_width"],
            "top": gmy / this.config["image_height"],
            "pin": "center"
        };
        this.reposition_dialogs();
    }

    // Move the brush circle to the mouse location
    move_brush_circle(gmx, gmy) {
        // Create brush circle id
        const brush_circle_id = "brush_circle";

        // Create brush circle if it doesn't exist
        if (!($("#" + brush_circle_id).length)) {
            this.create_brush_circle(gmx, gmy);
            return;
        }

        // Use this function to recalculate current zoom
        this.change_brush_size(1);

        // Add to list of visible dialogs
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][brush_circle_id] = {
            "left": gmx / this.config["image_width"],
            "top": gmy / this.config["image_height"],
            "pin": "center"
        };
        this.reposition_dialogs();
    }

    // Destroy the brush circle
    destroy_brush_circle() {
        // Get brush circle id
        const brush_circle_id = "brush_circle";
        $("#" + brush_circle_id).remove();
        delete this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][brush_circle_id];
        this.reposition_dialogs();
    }

    // Change the brush size by a scale factor
    change_brush_size(scale_factor) {
        if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_brush_mode"]) {
            this.config["brush_size"] *= scale_factor;

            // Get brush circle id
            const brush_circle_id = "brush_circle";

            // Update the brush circle
            $("#" + brush_circle_id).css({
                "width": (this.config["brush_size"]*this.state["zoom_val"]) + "px",
                "height": (this.config["brush_size"]*this.state["zoom_val"]) + "px",
                "border-radius": (this.config["brush_size"]*this.state["zoom_val"]) + "px"
            });
        }
    }

    // Create a complex polygon spatial payload at the brush circle location
    get_brush_circle_spatial_payload(gmx, gmy) {
        // Convert to image space
        let imx = gmx / this.config["px_per_px"];
        let imy = gmy / this.config["px_per_px"];

        // Create a spatial payload around the entire radius of the brush circle
        let spatial_payload = [];
        let radius = this.config["brush_size"] / 2;
        for (let i = 0; i < 360; i += 10) {
            let rad = i * Math.PI / 180;
            spatial_payload.push([imx + (radius * Math.cos(rad)), imy + (radius * Math.sin(rad))]);
        }
        // Ensure that first and last points are the same
        if (spatial_payload.length > 0) {
            spatial_payload[spatial_payload.length - 1] = spatial_payload[0];
        }
        return [spatial_payload];
    }

    // Check if the newest complex layer can merge with each previous layer.
    merge_polygon_complex_layer(annotation_id, layer_idx = null, recursive_call = false, redoing = false, redraw = true) {
        const annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annotation_id];
        if (annotation["spatial_type"] === "polygon" && annotation["spatial_payload"].length > 1) {
            let undo_annotation_payload = JSON.parse(JSON.stringify(annotation));
            if (layer_idx === null) {
                // Start with the newest layer
                layer_idx = annotation["spatial_payload"].length - 1;
            }
            let spatial_payload = annotation["spatial_payload"];
            // Array<bool> where a true is present if that index of the spatial_payload is a hole
            // Doesn't include a value for the last layer yet
            let spatial_payload_holes = annotation["spatial_payload_holes"];
            
            // Make sure that spatial_payload_child_indices is at least as long as spatial_payload - 1
            let spatial_payload_child_indices = annotation["spatial_payload_child_indices"];
            while (annotation["spatial_payload_child_indices"].length < spatial_payload.length - 1) {
                spatial_payload_child_indices.push([]);
            }

            // get the desired layer
            let layer = spatial_payload[layer_idx];
            let layer_is_hole = false;
            // After merging with a previous layer, we'll check if that layer can merge with any of its previous layers
            let next_layer_idxs = [];
            // loop through all previous layers, starting from the last
            for (let i = layer_idx - 1; i >= 0; i--) {
                let prev_layer = spatial_payload[i];
                // Try and merge the layers
                let ret = GeometricUtils.merge_polygons_at_intersection(prev_layer, layer);
                // null means the two layers don't intersect
                if (ret === null) {
                    continue;
                }
                // If they do intersect, then replace our layers with the result
                [prev_layer, layer] = ret;
                spatial_payload[i] = prev_layer;
                if (i > 0) {
                    next_layer_idxs.push(i);
                }
                // The last layer is a hole if the layer it merged into is not a hole
                layer_is_hole = !spatial_payload_holes[i];

                // if our last layer is completely inside the previous layer, then we're done
                if (GeometricUtils.simple_polygon_is_within_simple_polygon(layer, prev_layer)) {
                    // Add layer_idx as a child of i if (a) it is a hole and (b) it's not already there
                    if (layer_is_hole && !spatial_payload_child_indices[i].includes(layer_idx)) {
                        spatial_payload_child_indices[i].push(layer_idx);
                    }
                    break;
                }
            }

            // If the layer still exists, then add it back to the spatial payload
            if (layer.length > 0) {
                spatial_payload[layer_idx] = layer;
                if (layer_idx < spatial_payload_holes.length) {
                    spatial_payload_holes[layer_idx] = layer_is_hole;
                } else {
                    spatial_payload_holes.push(layer_is_hole);
                }
            } else {
                // If the layer is empty, then remove it from the spatial payload
                spatial_payload.splice(layer_idx, 1);
                if (layer_idx < spatial_payload_holes.length) {
                    spatial_payload_holes.splice(layer_idx, 1);
                }
            }

            for (let idx of next_layer_idxs) {
                this.merge_polygon_complex_layer(annotation_id, idx, true);
            }

            if (!recursive_call) {
                this.record_action({
                    act_type: "merge_polygon_complex_layer",
                    frame: this.state["current_frame"],
                    undo_payload: {
                        actid: annotation_id,
                        annotation: undo_annotation_payload,
                    },
                    redo_payload: {
                        actid: annotation_id,
                        layer_idx: layer_idx,
                    }
                }, redoing);
                
            }
        } 
        // Redraw when caller expects the annotation to be redrawn
        if (!recursive_call && redraw) {
            this.rebuild_containing_box(annotation_id);
            this.redraw_annotation(annotation_id);
        }
    }

    // Undo the merging of layers by replacing the annotation with the undo payload
    merge_polygon_complex_layer__undo(undo_payload) {
        this.replace_annotation(undo_payload["actid"], undo_payload["annotation"]);
        this.rebuild_containing_box(undo_payload["actid"]);
        this.redraw_annotation(undo_payload["actid"]);
    }

    // Call merge_polygon_complex_layer on all layers of a polygon
    verify_all_polygon_complex_layers(annotation_id, redraw = false) {
        const annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annotation_id];
        // Reset the child indices and holes
        annotation["spatial_payload_holes"] = [false];
        annotation["spatial_payload_child_indices"] = [[]];
        // merge_polygon_complex_layer will verify all layers
        // We can start at layer 1 since layer 0 is always a fill
        for (let layer_idx = 1; layer_idx < annotation["spatial_payload"].length; layer_idx++) {
            this.merge_polygon_complex_layer(annotation_id, layer_idx, false, false, redraw);
        }
    }

    // Simplify a single layer of a complex polygon. Modifies the annotation directly.
    simplify_polygon_complex_layer(annotation_id, active_idx, redoing = false) {
        // Get the annotation
        const annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annotation_id];
        // Save the annotation for undo
        let undo_annotation_payload = JSON.parse(JSON.stringify(annotation));
        // Get the layer
        let layer = annotation["spatial_payload"][active_idx];
        // layer is a list of points, so we need to wrap it in a list
        // Replace the layer with the simplified layer
        annotation["spatial_payload"][active_idx] = GeometricUtils.turf_simplify_complex_polygon([layer])[0];

        // Record the action
        this.record_action({
            act_type: "simplify_polygon_complex_layer",
            frame: this.state["current_frame"],
            undo_payload: {
                actid: annotation_id,
                annotation: undo_annotation_payload,
            },
            redo_payload: {
                actid: annotation_id,
                active_idx: active_idx,
            }
        }, redoing);
    }

    // Undo the simplification of a layer by replacing the annotation with the undo payload
    simplify_polygon_complex_layer__undo(undo_payload) {
        this.replace_annotation(undo_payload["actid"], undo_payload["annotation"]);
        this.rebuild_containing_box(undo_payload["actid"]);
        this.redraw_annotation(undo_payload["actid"]);
    }

    // Delete all annotations that are completely within a delete annotation (a simple polygon).
    delete_annotations_in_polygon(delete_annid, redo_payload = null) {
        let redoing = false;
        let delete_annotation;
        if (redo_payload !== null) {
            redoing = true;
            delete_annid = redo_payload["actid"];
            delete_annotation = redo_payload["delete_annotation"];
        } else {
            // Get the delete annotation
            delete_annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][delete_annid];
        }
        const delete_polygon = delete_annotation["spatial_payload"];
        // Deprecate the delete annotation
        delete_annotation["deprecated"] = true;
        // Get the list of annotations
        const annotations = this.subtasks[this.state["current_subtask"]]["annotations"]["access"];
        // Track the ids of deprecated annotations for undo
        let deprecated_ids = [];
        // Track id and annotation pairs of modified annotations for undo
        let modified_annotations = {};
        // Loop through all annotations
        for (let [annid, annotation] of Object.entries(annotations)) {
            // Skip deprecated annotations
            if (annotation["deprecated"]) {
                continue;
            }
            // Skip non-spatial annotations and 3D annotations
            const spatial_type = annotation["spatial_type"];
            if (NONSPATIAL_MODES.includes(spatial_type) || MODES_3D.includes(spatial_type)) {
                continue;
            }

            // Save the original annotation for easy access
            let og_annotation = JSON.parse(JSON.stringify(annotation));
            
            // Check if the annotation is within the delete polygon
            let split_polygons, new_spatial_payload, simple_polygon;
            let needs_redraw = false;
            switch (spatial_type) {
                // Check if the point is within the delete polygon
                case "point":
                    if (GeometricUtils.point_is_within_simple_polygon(annotation["spatial_payload"][0], delete_polygon)) {
                        annotation["deprecated"] = true;
                        deprecated_ids.push(annid);
                        needs_redraw = true;
                    }
                    break;
                // Subtract the delete polygon from the annotation
                case "polygon":
                case "polyline":
                case "contour":
                    new_spatial_payload  = [];
                    switch (spatial_type) {
                        case "polygon":
                            // Separate the polygon into layers
                            split_polygons = this.split_complex_polygon(annid);
                            for (let split_polygon of split_polygons) {
                                let merged_polygon;
                                // Erase the delete polygon from the annotation
                                merged_polygon = GeometricUtils.subtract_polygons(split_polygon, [delete_polygon]);
                                if (merged_polygon !== null) {
                                    // Extend the new spatial payload
                                    new_spatial_payload = new_spatial_payload.concat(merged_polygon);
                                }
                            }
                            break;
                        case "polyline":
                        case "contour":
                            new_spatial_payload = GeometricUtils.subtract_simple_polygon_from_polyline(annotation["spatial_payload"], delete_polygon);
                            break;
                    }
                    if (new_spatial_payload.length === 0) {
                        annotation["deprecated"] = true;
                        deprecated_ids.push(annid);
                        needs_redraw = true;
                    } else {
                        // First, we assume that the annotation changed
                        annotation["spatial_payload"] = new_spatial_payload;
                        if (spatial_type === "polygon") {
                            this.verify_all_polygon_complex_layers(annid);
                        }
                        // Update containing box
                        this.rebuild_containing_box(annid);

                        // TODO: need a more robust check for whether the annotation changed
                        // // Then to verify the change, we compare containing boxes
                        // if (this.containing_boxes_are_equal(og_annotation["containing_box"], annotation["containing_box"])) {
                        //     // If the containing box is the same, then we revert the change
                        //     annotation = JSON.parse(JSON.stringify(og_annotation));
                        // } else {
                        //     // save the unmodified annotation for undo
                        //     modified_annotations[annid] = JSON.parse(JSON.stringify(og_annotation));
                        //     needs_redraw = true;
                        // }
                        modified_annotations[annid] = JSON.parse(JSON.stringify(og_annotation));
                        needs_redraw = true;
                    }
                    break;
                // Convert to a simple polygon and check if it is within the delete polygon
                case "bbox":
                case "tbar":
                    // Convert to a simple polygon
                    switch (spatial_type) {
                        case "bbox":
                            simple_polygon = GeometricUtils.bbox_to_simple_polygon(annotation["spatial_payload"]);
                            break;
                        case "tbar":
                            simple_polygon = GeometricUtils.tbar_to_simple_polygon(annotation["spatial_payload"]);
                            break;
                    }
                    // Check if the polygon falls within the delete polygon or intersects it
                    if (
                        GeometricUtils.simple_polygon_is_within_simple_polygon(simple_polygon, delete_polygon) ||
                        GeometricUtils.complex_polygons_intersect([simple_polygon], [delete_polygon])
                    ) {
                        annotation["deprecated"] = true;
                        deprecated_ids.push(annid);
                        needs_redraw = true;
                    }
                    break;

                // TODO: handle other spatial types
            }
            // Redraw if needed
            if (needs_redraw) {
                this.redraw_annotation(annid);
            }
        }

        // Record the delete annotation
        this.record_action({
            act_type: "delete_annotations_in_polygon",
            frame: this.state["current_frame"],
            undo_payload: {
                ender_html: $("#ender_" + delete_annid).outer_html(),
                deprecated_ids: deprecated_ids,
                modified_annotations: modified_annotations,
            },
            redo_payload: {
                actid: delete_annid,
                delete_annotation: JSON.parse(JSON.stringify(delete_annotation)),
            }
        }, redoing);
        if (!redoing) {
            // Destroy the polygon ender
            this.destroy_polygon_ender(delete_annid);
            // Remove the delete annotation from access and ordering, and delete its canvas context
            this.destroy_annotation_context(delete_annid);
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][delete_annid];
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"] = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].filter((value) => value !== delete_annid);
        }
        this.remove_recorded_events_for_annotation(delete_annid);
    }

    // Undo the deletion of annotations by replacing the annotations with the undo payload
    delete_annotations_in_polygon__undo(undo_payload) {
        // Get the list of annotations
        const annotations = this.subtasks[this.state["current_subtask"]]["annotations"]["access"];
        // Loop through all deprecated annotations
        for (let annid of undo_payload["deprecated_ids"]) {
            // Undeprecate the annotation
            annotations[annid]["deprecated"] = false;
            // Redraw the annotation
            this.redraw_annotation(annid);
        }
        // Loop through all modified annotations
        for (let [annid, annotation] of Object.entries(undo_payload["modified_annotations"])) {
            // Replace the annotation with the undo payload
            annotations[annid] = annotation;
            // Redraw the annotation
            this.redraw_annotation(annid);
        }
    }

    // Convert bbox to polygon and then delete annotations in polygon
    delete_annotations_in_bbox(delete_annid) {
        const delete_annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][delete_annid];
        const delete_bbox = delete_annotation["spatial_payload"];
        const delete_polygon = GeometricUtils.bbox_to_simple_polygon(delete_bbox);
        delete_annotation["spatial_payload"] = delete_polygon;
        delete_annotation["spatial_type"] = "delete_polygon";
        // All the deleteion work is done in delete_annotations_in_polygon
        this.delete_annotations_in_polygon(delete_annid);
    }

    // Remove all recorded events associated with a specific annotation id
    remove_recorded_events_for_annotation(annotation_id) {
        // filter action stream
        let new_action_stream = [];
        for (let action of this.subtasks[this.state["current_subtask"]]["actions"]["stream"]) {
            // Check that action has an undo_payload
            if (action.undo_payload) {
                // Check all values in the undo_payload, and skip if any of them are the annotation_id
                let skip = false;
                for (let key in action.undo_payload) {
                    if (action.undo_payload[key] === annotation_id) {
                        skip = true;
                        break;
                    }
                }
                if (!skip) {
                    new_action_stream.push(action);
                }
            }
        }
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"] = new_action_stream;
    }

    // Replace an entire annotation with a new one. Generally used for undo/redo.
    replace_annotation(annotation_id, annotation) {
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annotation_id] = JSON.parse(JSON.stringify(annotation));
    }

    show_edit_suggestion(nearest_point, currently_exists) {
        let esid = "edit_suggestion__" + this.state["current_subtask"];
        var esjq = $("#" + esid);
        esjq.css("display", "block");
        if (currently_exists) {
            esjq.removeClass("soft");
        }
        else {
            esjq.addClass("soft");
        }
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["left"] = nearest_point["point"][0] / this.config["image_width"];
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["top"] = nearest_point["point"][1] / this.config["image_height"];
        this.reposition_dialogs();
    }

    hide_edit_suggestion() {
        $(".edit_suggestion").css("display", "none");
    }

    show_global_edit_suggestion(annid, offset = null, nonspatial_id = null) {
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let idd_x;
        let idd_y;
        if (nonspatial_id === null) {
            let esid = "global_edit_suggestion__" + this.state["current_subtask"];
            var esjq = $("#" + esid);
            esjq.css("display", "block");
            let cbox = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["containing_box"];
            let new_lft = (cbox["tlx"] + cbox["brx"] + 2 * diffX) / (2 * this.config["image_width"]);
            let new_top = (cbox["tly"] + cbox["bry"] + 2 * diffY) / (2 * this.config["image_height"]);
            this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["left"] = new_lft;
            this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["top"] = new_top;
            this.reposition_dialogs();
            idd_x = (cbox["tlx"] + cbox["brx"] + 2 * diffX) / 2;
            idd_y = (cbox["tly"] + cbox["bry"] + 2 * diffY) / 2;
        }
        else {
            // TODO(new3d)
            idd_x = $("#reclf__" + nonspatial_id).offset().left - 85;//this.get_global_element_center_x($("#reclf__" + nonspatial_id));
            idd_y = $("#reclf__" + nonspatial_id).offset().top - 85;//this.get_global_element_center_y($("#reclf__" + nonspatial_id));
        }


        // let placeholder = $("#global_edit_suggestion a.reid_suggestion");
        if (!this.subtasks[this.state["current_subtask"]]["single_class_mode"]) {
            this.show_id_dialog(idd_x, idd_y, annid, true, nonspatial_id != null);
        }
    }

    hide_global_edit_suggestion() {
        $(".global_edit_suggestion").css("display", "none");
        this.hide_id_dialog();
    }

    show_id_dialog(gbx, gby, active_ann, thumbnail = false, nonspatial = false) {
        let stkey = this.state["current_subtask"];

        // Record which annotation this dialog is associated with
        // TODO
        // am_dialog_associated_ann = active_ann;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] = true;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"] = thumbnail;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_associated_annotation"] = active_ann;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_which"] = "back";

        let idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
        let idd_niu_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
        let new_height = $(`#global_edit_suggestion__${stkey} a.reid_suggestion`)[0].getBoundingClientRect().height;

        if (nonspatial) {
            this.subtasks[this.state["current_subtask"]]["state"]["idd_which"] = "front";
            idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
            idd_niu_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
            new_height = 28;
        }
        else {
            // Add this id to the list of dialogs with managed positions
            // TODO actually only do this when calling append()
            this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][idd_id] = {
                "left": gbx / this.config["image_width"],
                "top": gby / this.config["image_height"],
                "pin": "center"
            };
        }
        let idd = $("#" + idd_id);
        let idd_niu = $("#" + idd_niu_id);
        if (nonspatial) {
            let new_home = $(`#reclf__${active_ann}`);
            let fad_st = $(`#fad_st__${stkey} div.front_dialogs`);
            let ofst = -100;
            let zidx = 2000;
            if (thumbnail) {
                zidx = -1;
                // ofst = -100;
            }
            let top_c = new_home.offset().top - fad_st.offset().top + ofst + new_height / 2;
            let left_c = new_home.offset().left - fad_st.offset().left + ofst + 1 + new_height / 2;
            idd.css({
                "display": "block",
                "position": "absolute",
                "top": (top_c) + "px",
                "left": (left_c) + "px",
                "z-index": zidx
            });
            idd.parent().css({
                "z-index": zidx
            });

        }

        // Add or remove thumbnail class if necessary
        let scale_ratio = new_height / this.config["outer_diameter"];
        if (thumbnail) {
            if (!idd.hasClass("thumb")) {
                idd.addClass("thumb");
            }
            $("#" + idd_id + ".thumb").css({
                "transform": `scale(${scale_ratio})`
            });
        }
        else {
            $("#" + idd_id + ".thumb").css({
                "transform": `scale(1.0)`
            });
            if (idd.hasClass("thumb")) {
                idd.removeClass("thumb");
            }
        }

        this.reposition_dialogs();

        // Configure the dialog to show the current information for this ann
        this.set_id_dialog_payload_to_init(active_ann);
        this.update_id_dialog_display(nonspatial);
        if (!thumbnail) {
            this.update_id_toolbox_display();
        }

        // Show the dialog
        idd.css("display", "block");
        idd_niu.css("display", "none");
        // TODO(new3d)
        // if (nonspatial) {
        //     idd.css("z-index", 2000);
        // }
    }

    hide_id_dialog() {
        let idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
        let idd_id_front = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
        this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] = false;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_associated_annotation"] = null;
        $("#" + idd_id).css("display", "none");
        $("#" + idd_id_front).css("display", "none");
    }


    // ================= Annotation Utilities =================

    undo(is_internal_undo = false) {
        // Create constants for convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const action_stream = current_subtask["actions"]["stream"]
        const undone_stack = current_subtask["actions"]["undone_stack"]

        // If the action_steam is empty, then there are no actions to undo
        if (action_stream.length === 0) return

        if (!current_subtask["state"]["idd_thumbnail"]) {
            this.hide_id_dialog();
        }

        if (action_stream[action_stream.length - 1].redo_payload.finished === false) {
            this.finish_action(action_stream[action_stream.length - 1]);
        }

        undone_stack.push(action_stream.pop());
        
        // set internal undo status
        let undo_candidate = undone_stack[undone_stack.length - 1];
        undo_candidate.is_internal_undo = is_internal_undo;
        let newact = this.undo_action(undo_candidate);
        if (newact != null) {
            undone_stack[undone_stack.length - 1] = newact
        }

        // If the FilterDistance ToolboxItem is present, filter points
        if (this.toolbox_order.includes(AllowedToolboxItem.FilterDistance)) {
            // Currently only supported by polyline
            filter_points_distance_from_line(this)
        }
    }

    redo() {
        // Create constants for convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const undone_stack = current_subtask["actions"]["undone_stack"]

        // If the action_steam is empty, then there are no actions to undo
        if (undone_stack.length === 0) return

        this.redo_action(undone_stack.pop());

        // If the FilterDistance ToolboxItem is present, filter points
        if (this.toolbox_order.includes(AllowedToolboxItem.FilterDistance)) {
            // Currently only supported by polyline
            filter_points_distance_from_line(this)
        }
    }

    /**
     * Creates an annotation based on passed in parameters. Does not use mouse positions
     * 
     * @param {string} spatial_type What type of annotation to create
     * @param {[number, number][]} spatial_payload 
     */
    create_annotation(spatial_type, spatial_payload, unique_id = null) {
        // Grab constants for convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const annotation_access = current_subtask["annotations"]["access"]
        const annotation_ordering = current_subtask["annotations"]["ordering"]

        // Create a new unique id for this annotation
        if (unique_id === null) {
            // Create a unique id if one is not provided
            unique_id = this.make_new_annotation_id()
        }

        // Get the frame
        if (MODES_3D.includes(spatial_type)) {
            this.state["current_frame"] = null;
        }

        // Create the new annotation
        let new_annotation = {
            "id": unique_id,
            "new": true,
            "parent_id": null,
            "created_by": this.config["annotator"],
            "created_at": ULabel.get_time(),
            "deprecated": false,
            "deprecated_by": { "human": false },
            "spatial_type": spatial_type,
            "spatial_payload": spatial_payload,
            "classification_payloads": this.get_init_id_payload(spatial_type),
            "text_payload": "",
            "canvas_id": this.get_init_canvas_context_id(unique_id)
        }
        if (spatial_type === "polygon") {
            new_annotation["spatial_payload_holes"] = [false];
            new_annotation["spatial_payload_child_indices"] = [[]];
        }

        // Add the new annotation to the annotation access and ordering
        annotation_access[unique_id] = new_annotation
        annotation_ordering.push(unique_id)

        // Record the action so it can be undone and redone
        this.record_action({
            "act_type": "create_annotation",
            "undo_payload": { "annotation_id": unique_id },
            "redo_payload": {
                "annotation_id": unique_id,
                "spatial_payload": spatial_payload,
                "spatial_type": spatial_type
            }
        })

        // Draw the new annotation to the canvas
        this.draw_annotation_from_id(unique_id)
    }

    /**
     * Recalls create_annotation with the information inside the undo_payload.
     * Undo_payload should be an object containing three properties.
     * undo_payload.annotation_id: string. Technically optional. Assignes the annotation id instead of creating a new one.
     * undo_payload.spatial_payload: [number, number][]
     * undo_payload.spatial_type: string
     * 
     * @param {Object} undo_payload Payload containing the properties required to recall create_annotation
     */
    create_annotation__undo(undo_payload) {
        // Get the current subtask
        const current_subtask = this.subtasks[this.state["current_subtask"]]

        // Get the id from the payload
        const annotation_id = undo_payload.annotation_id

        // Destory the canvas context
        this.destroy_annotation_context(annotation_id)

        // Delete the created annotation
        delete current_subtask.annotations.access[annotation_id]

        // Next delete the annotation id from the ordering array
        // Grab the array for convenience
        const annotation_ordering = current_subtask.annotations.ordering

        // Get the index of the annotation's id
        const annotation_index = annotation_ordering.indexOf(annotation_id)

        // Remove the annotation id from the array
        annotation_ordering.splice(annotation_index, 1) // 1 means remove only the annotation id at the annotation index
    }

    /**
     * Recalls create_annotation with the information inside the undo_payload.
     * redo_payload should be an object containing three properties.
     * redo_payload.annotation_id: string. Technically optional. Assignes the annotation id instead of creating a new one.
     * redo_payload.spatial_payload: [number, number][]
     * redo_payload.spatial_type: string
     * 
     * @param {Object} redo_payload Payload containing the properties required to recall create_annotation
     */
    create_annotation__redo(redo_payload) {
        // Recreate the annotation with the same annotation_id, spatial_type, and spatial_payload
        this.create_annotation(
            redo_payload.spatial_type,
            redo_payload.spatial_payload,
            redo_payload.annotation_id
        )
    }

    delete_annotation(annotation_id, redo_payload = null, record_action = true) {

        let old_id = annotation_id;
        let new_id = old_id;
        let redoing = false;

        // Grab constants for convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const annotations = current_subtask["annotations"]["access"]

        if (redo_payload != null) {
            redoing = true;
            annotation_id = redo_payload.annid;
            old_id = redo_payload.old_id;
        }

        let annotation_mode = annotations[old_id]["spatial_type"];
        let is_spatial = !NONSPATIAL_MODES.includes(annotation_mode);

        let deprecate_old = false;
        if (!annotations[old_id]["new"]) {
            // Make new id and record that you did
            deprecate_old = true;
            if (!redoing) {
                new_id = this.make_new_annotation_id();
            }
            else {
                new_id = redo_payload.new_id;
            }

            // Make new annotation (copy of old)
            annotations[new_id] = JSON.parse(JSON.stringify(annotations[old_id]));
            annotations[new_id]["id"] = new_id;
            annotations[new_id]["created_by"] = this.config["annotator"];
            annotations[new_id]["new"] = true;
            annotations[new_id]["parent_id"] = old_id;
            if (is_spatial) {
                annotations[new_id]["canvas_id"] = this.get_init_canvas_context_id(new_id);
            }
            current_subtask["annotations"]["ordering"].push(new_id);

            // Set parent_id and deprecated = true
            mark_deprecated(annotations[old_id], true)
            // Redraw the old annotation
            this.redraw_annotation(old_id);

            // Work with new annotation from now on
            annotation_id = new_id;
        }

        if (current_subtask["state"]["active_id"] != null) {
            current_subtask["state"]["active_id"] = null;
            current_subtask["state"]["is_in_edit"] = false;
            current_subtask["state"]["is_in_move"] = false;
            current_subtask["state"]["is_in_progress"] = false;
            current_subtask["state"]["starting_complex_polygon"] = false;
        }
        mark_deprecated(annotations[annotation_id], true)
        this.redraw_annotation(annotation_id);
        this.hide_global_edit_suggestion();

        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        if (record_action) {
            this.record_action({
                act_type: "delete_annotation",
                frame: frame,
                undo_payload: {
                    annid: annotation_id,
                    deprecate_old: deprecate_old,
                    old_id: old_id,
                    new_id: new_id,
                    suggest_edits: true,
                },
                redo_payload: {
                    annid: annotation_id,
                    deprecate_old: deprecate_old,
                    old_id: old_id,
                    new_id: new_id,
                    suggest_edits: true,
                }
            }, redoing);
        }

        // If the annotation is a polyline and the filter distance toolboxitem is present, then filter annotations on annotation deletion
        if (annotations[annotation_id].spatial_type === "polyline" && this.toolbox_order.includes(AllowedToolboxItem.FilterDistance)) {
            filter_points_distance_from_line(this)
        }

        // Ensure there are no lingering enders
        if (annotation_mode === "polygon" || annotation_mode === "polyline") {
            this.destroy_polygon_ender(annotation_id);
        }
    }

    delete_annotation__undo(undo_payload) {
        let active_id = undo_payload.annid;
        const annotations = this.subtasks[this.state["current_subtask"]]["annotations"]
        if (undo_payload.deprecate_old) {
            // Set the active id to the old id
            active_id = undo_payload.old_id;

            // Mark the active id undeprecated
            mark_deprecated(annotations["access"][active_id], false);

            // Delete the annotation with the new id that's being undone
            delete annotations["access"][undo_payload.new_id];

            // Remove deleted annotation from ordering
            const index = annotations["ordering"].indexOf(undo_payload.new_id);
            annotations["ordering"].splice(index, 1);
        }
        else {
            // Set the annotation to be undeprecated
            mark_deprecated(annotations["access"][undo_payload.annid], false);
        }

        // Handle visuals
        this.redraw_annotation(active_id);
        if (undo_payload.suggest_edits) {
            this.suggest_edits(this.state["last_move"]);
        }

        // If the filter distance toolboxitem is present,
        // And if the active annotation is a polyline,
        // Then filter annotations on annotation deletion
        if (annotations["access"][active_id]["spatial_type"] && this.toolbox_order.includes(AllowedToolboxItem.FilterDistance)) {
            filter_points_distance_from_line(this);
        }
    }

    delete_annotation__redo(redo_payload) {
        this.delete_annotation(null, redo_payload);
    }

    /**
     * Get the annotation with nearest active keypoint (e.g. corners for a bbox, endpoints for polylines) to a point
     * @param {*} global_x 
     * @param {*} global_y 
     * @param {*} max_dist Maximum distance to search
     * @param {*} candidates Candidates to search across
     * @returns 
     */
    get_nearest_active_keypoint(global_x, global_y, max_dist, candidates = null) {
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist / this.get_empirical_scale(),
            "point": null
        };
        if (candidates === null) {
            candidates = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"];
        }
        // Iterate through and find any close enough defined points
        var edid = null;
        for (var edi = 0; edi < candidates.length; edi++) {
            edid = candidates[edi];
            let npi = null;
            let curfrm, pts, n_iters, access_idx;
            const spatial_type = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_type"];
            let spatial_payload = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"];
            let active_spatial_payload = spatial_payload;
            switch (spatial_type) {
                case "bbox":
                    npi = GeometricUtils.get_nearest_point_on_bounding_box(
                        global_x, global_y,
                        spatial_payload,
                        max_dist
                    );
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "bbox3":
                    curfrm = this.state["current_frame"];
                    pts = spatial_payload;
                    if ((curfrm >= Math.min(pts[0][2], pts[1][2])) && (curfrm <= Math.max(pts[0][2], pts[1][2]))) {
                        // TODO(new3d) Make sure this function works for bbox3 too
                        npi = GeometricUtils.get_nearest_point_on_bbox3(
                            global_x, global_y, curfrm,
                            pts,
                            max_dist
                        );
                        if (npi["distance"] < ret["distance"]) {
                            ret["annid"] = edid;
                            ret["access"] = npi["access"];
                            ret["distance"] = npi["distance"];
                            ret["point"] = npi["point"];
                        }
                    }
                    break;
                case "polygon":
                case "polyline":
                    // for polygons, we'll need to loop through all points
                    n_iters = spatial_type === "polygon" ? spatial_payload.length : 1;

                    for (let i = 0; i < n_iters; i++) {
                        if (spatial_type === "polygon") {
                            active_spatial_payload = spatial_payload[i];
                        }
                        npi = GeometricUtils.get_nearest_point_on_polygon(
                            global_x, global_y,
                            active_spatial_payload,
                            max_dist, false
                        );
                        // for polygons, access index is a list of two indices
                        // for polylines, access index is a single index
                        access_idx = spatial_type === "polygon" ? [i, npi["access"]] : npi["access"];
                        if (npi["distance"] < ret["distance"]) {
                            ret["annid"] = edid;
                            ret["access"] = access_idx;
                            ret["distance"] = npi["distance"];
                            ret["point"] = npi["point"];
                        }
                    }
                    break;
                case "tbar":
                    npi = GeometricUtils.get_nearest_point_on_tbar(
                        global_x, global_y,
                        spatial_payload,
                        max_dist
                    );
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "contour":
                case "point":
                    // Not editable at the moment
                    break;
            }
        }
        // TODO(3d)
        // Iterate through 3d annotations here (e.g., bbox3)
        if (ret["annid"] === null) {
            return null;
        }
        return ret;
    }

    /**
     * Get annotation segment to a point.
     * @param {*} global_x 
     * @param {*} global_y 
     * @param {*} max_dist Maximum distance to search
     * @param {*} candidates Candidates to search across 
     * @returns 
     */
    get_nearest_segment_point(global_x, global_y, max_dist, candidates = null) {
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist / this.get_empirical_scale(),
            "point": null
        };
        if (candidates === null) {
            candidates = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"];
        }
        for (var edi = 0; edi < candidates.length; edi++) {
            var edid = candidates[edi];
            const spatial_type = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_type"]
            let spatial_payload = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"];
            let active_spatial_payload = spatial_payload;
            let n_iters, access_idx;
            switch (spatial_type) {
                case "bbox":
                case "bbox3":
                case "point":
                    // Can't propose new bounding box or keypoint points
                    break;
                case "polygon":
                case "polyline":
                    // for polygons, we'll need to loop through all points
                    n_iters = spatial_type === "polygon" ? spatial_payload.length : 1;
                    for (let i = 0; i < n_iters; i++) {
                        if (spatial_type === "polygon") {
                            active_spatial_payload = spatial_payload[i];
                        }
                        var npi = GeometricUtils.get_nearest_point_on_polygon(
                            global_x, global_y,
                            active_spatial_payload,
                            max_dist / this.get_empirical_scale(), true
                        );
                        // for polygons, access index is a list of two indices
                        // for polylines, access index is a single index
                        access_idx = spatial_type === "polygon" ? [i, npi["access"]] : npi["access"];
                        if (npi["distance"] != null && npi["distance"] < ret["distance"]) {
                            ret["annid"] = edid;
                            ret["access"] = access_idx;
                            ret["distance"] = npi["distance"];
                            ret["point"] = npi["point"];
                        }
                    }
                    break;
                case "contour":
                    // Not editable at the moment (TODO)
                    break;
                case "tbar":
                    // Can't propose new tbar points
                    break;
            }
        }
        if (ret["annid"] === null) {
            return null;
        }
        return ret;
    }

    get_line_size(demo = false) {
        // If the user did not specify an initial_line_size, then this.state["line_size"] will be null. 
        // This indicates that we will scale the line size based on the zoom level 
        if (this.state["line_size"] === null) {
            // 4 is the legacy default line size
            let line_size = 4 * this.config["px_per_px"];
            if (demo) {
                if (this.state["size_mode"] === "dynamic") {
                    line_size *= this.state["zoom_val"];
                }
                return line_size;
            } else {
                if (this.state["size_mode"] === "fixed") {
                    line_size /= this.state["zoom_val"];
                }
                return line_size;
            }
        } else {
            // Default to the user-specified line size
            return this.state["line_size"] * this.config["px_per_px"]; 
        }
    }

    // Action Stream Events

    set_saved(saved) {
        this.state["edited"] = !saved;
    }

    record_action(action, is_redo = false) {
        this.set_saved(false);

        // After a new action, you can no longer redo old actions
        if (!is_redo) {
            this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"] = [];
        }

        // Add to stream
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"].push(action);
    }

    record_finish(actid) {
        // TODO(3d) 
        let i = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.init_spatial = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.finished = true;
    }

    record_finish_edit(actid) {
        // TODO(3d) 
        let i = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1;
        let fin_pt = this.get_with_access_string(
            actid,
            this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.edit_candidate["access"],
            true
        );
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.ending_x = fin_pt[0];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.ending_y = fin_pt[1];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.ending_frame = this.state["current_frame"];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.finished = true;
    }

    record_finish_move(diffX, diffY, diffZ = 0) {
        // TODO(3d) 
        let i = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.diffX = diffX;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.diffY = diffY;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.diffZ = diffZ;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].undo_payload.diffX = -diffX;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].undo_payload.diffY = -diffY;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].undo_payload.diffZ = -diffZ;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.finished = true;
    }

    undo_action(action) {
        this.update_frame(null, action.frame);
        switch (action.act_type) {
            case "begin_annotation":
                this.begin_annotation__undo(action.undo_payload);
                break;
            case "continue_annotation":
                this.continue_annotation__undo(action.undo_payload);
                break;
            case "finish_annotation":
                this.finish_annotation__undo(action.undo_payload);
                break;
            case "edit_annotation":
                this.edit_annotation__undo(action.undo_payload);
                break;
            case "move_annotation":
                this.move_annotation__undo(action.undo_payload);
                break;
            case "delete_annotation":
                this.delete_annotation__undo(action.undo_payload);
                break;
            case "cancel_annotation":
                this.cancel_annotation__undo(action.undo_payload);
                break;
            case "assign_annotation_id":
                this.assign_annotation_id__undo(action.undo_payload);
                break;
            case "create_annotation":
                this.create_annotation__undo(action.undo_payload);
                break;
            case "create_nonspatial_annotation":
                this.create_nonspatial_annotation__undo(action.undo_payload);
                break;
            case "start_complex_polygon":
                this.start_complex_polygon__undo(action.undo_payload);
                break;
            case "merge_polygon_complex_layer":
                this.merge_polygon_complex_layer__undo(action.undo_payload);
                // If the undo was triggered by the user, they
                // expect ctrl+z to undo the previous action as well
                if (!action.is_internal_undo) {
                    this.undo();
                }
                break;
            case "simplify_polygon_complex_layer":
                this.simplify_polygon_complex_layer__undo(action.undo_payload);
                // If the undo was triggered by the user, they
                // expect ctrl+z to undo the previous action as well
                if (!action.is_internal_undo) {
                    this.undo();
                }
                break;
            case "delete_annotations_in_polygon":
                this.delete_annotations_in_polygon__undo(action.undo_payload);
                break;
            case "begin_brush":
                this.begin_brush__undo(action.undo_payload);
                break;
            case "finish_brush":
                this.finish_brush__undo();
                break;
            default:
                console.log("Undo error :(");
                break;
        }
    }

    redo_action(action) {
        this.update_frame(null, action.frame);
        console.log("redoing action", action.act_type)
        switch (action.act_type) {
            case "begin_annotation":
                this.begin_annotation(null, action.redo_payload);
                break;
            case "continue_annotation":
                this.continue_annotation(null, null, action.redo_payload);
                break;
            case "finish_annotation":
                this.finish_annotation__redo(action.redo_payload);
                break;
            case "edit_annotation":
                this.edit_annotation__redo(action.redo_payload);
                break;
            case "move_annotation":
                this.move_annotation__redo(action.redo_payload);
                break;
            case "delete_annotation":
                this.delete_annotation__redo(action.redo_payload);
                break;
            case "cancel_annotation":
                this.cancel_annotation(action.redo_payload);
                break;
            case "assign_annotation_id":
                this.assign_annotation_id(null, null, action.redo_payload);
                break;
            case "create_annotation":
                this.create_annotation__redo(action.redo_payload);
                break;
            case "create_nonspatial_annotation":
                this.create_nonspatial_annotation(action.redo_payload);
                break;
            case "start_complex_polygon":
                this.start_complex_polygon(action.redo_payload);
                break;
            case "merge_polygon_complex_layer":
                this.merge_polygon_complex_layer(action.redo_payload.actid, action.redo_payload.layer_id, false, true);
                break;
            case "simplify_polygon_complex_layer":
                this.simplify_polygon_complex_layer(action.redo_payload.actid, action.redo_payload.active_idx, true);
                break;
            case "delete_annotations_in_polygon":
                this.delete_annotations_in_polygon(null, action.redo_payload);
                break;
            default:
                console.log("Redo error :(");
                break;
        }
    }

    finish_action(action) {
        switch (action.act_type) {
            case "begin_annotation":
            case "edit_annotation":
            case "move_annotation":
                this.end_drag(this.state["last_move"]);
                break;
            default:
                console.log("Finish error :(");
                break;
        }
    }

    create_nonspatial_annotation(redo_payload = null) {
        let redoing = false;
        let unq_id = null;
        let annotation_mode = null;
        let init_idpyld = null;
        if (redo_payload === null) {
            unq_id = this.make_new_annotation_id();
            annotation_mode = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
            init_idpyld = this.get_init_id_payload();
        }
        else {
            redoing = true;
            unq_id = redo_payload.unq_id;
            annotation_mode = redo_payload.annotation_mode;
            init_idpyld = redo_payload.init_payload;
        }

        // Add this annotation to annotations object
        let annframe = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            annframe = null;
        }

        let new_annotation = {
            "id": unq_id,
            "new": true,
            "parent_id": null,
            "created_by": this.config["annotator"],
            "created_at": ULabel.get_time(),
            "deprecated": false,
            "deprecated_by": { "human": false },
            "spatial_type": annotation_mode,
            "spatial_payload": null,
            "classification_payloads": JSON.parse(JSON.stringify(init_idpyld)),
            "line_size": null,
            "containing_box": null,
            "frame": annframe,
            "text_payload": ""
        };

        let undo_frame = this.state["current_frame"];
        let ann_str;

        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id] = new_annotation;
        if (redoing) {
            this.set_id_dialog_payload_to_init(unq_id, init_idpyld);
        }
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["annotation_meta"] = this.config["annotation_meta"];
        this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(unq_id);
        ann_str = JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]);

        // Draw new annotation
        this.draw_annotation_from_id(unq_id);

        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        // Record for potential undo/redo
        this.record_action({
            act_type: "create_nonspatial_annotation",
            frame: frame,
            redo_payload: {
                unq_id: unq_id,
                annotation_mode: annotation_mode,
                init_spatial: null,
                finished: true,
                init_payload: JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]))
            },
            undo_payload: {
                ann_str: ann_str,
                frame: undo_frame
            },
        }, redoing);
        this.suggest_edits(this.state["last_move"]);
    }

    create_nonspatial_annotation__undo(undo_payload) {
        let ann = JSON.parse(undo_payload.ann_str);
        let unq_id = ann["id"];

        let end_ann;
        end_ann = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].pop();

        if (end_ann != unq_id) {
            console.log("We may have a problem... undo replication");
            console.log(end_ann, unq_id);
        }

        // Remove from access
        if (unq_id in this.subtasks[this.state["current_subtask"]]["annotations"]["access"]) {
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id];
        }
        else {
            console.log("We may have a problem... undo replication");
        }

        // Render the change (have to redraw all non-spatial since they all live on the front canvas)
        this.redraw_all_annotations(this.state["current_subtask"], null, true);
        this.suggest_edits(this.state["last_move"]);
    }

    begin_annotation(mouse_event, redo_payload = null) {
        // Give the new annotation a unique ID
        let unq_id = null;
        let line_size = null;
        let annotation_mode = null;
        let redoing = false;
        let gmx = null;
        let gmy = null;
        let init_spatial = null;
        let init_id_payload = null;

        const subtask = this.state["current_subtask"] 

        if (redo_payload === null) {
            unq_id = this.make_new_annotation_id();
            line_size = this.get_line_size();
            annotation_mode = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
            gmx = this.get_global_mouse_x(mouse_event);
            gmy = this.get_global_mouse_y(mouse_event);
            init_spatial = this.get_init_spatial(gmx, gmy, annotation_mode);
            init_id_payload = this.get_init_id_payload(annotation_mode);
            this.hide_edit_suggestion();
            this.hide_global_edit_suggestion();
        } else {
            unq_id = redo_payload.unq_id;
            line_size = redo_payload.line_size;
            mouse_event = redo_payload.mouse_event;
            annotation_mode = redo_payload.annotation_mode;
            redoing = true;
            gmx = redo_payload.gmx;
            gmy = redo_payload.gmy;
            init_spatial = redo_payload.init_spatial;
            init_id_payload = redo_payload.init_payload;
        }

        let canvas_id = this.get_init_canvas_context_id(unq_id, subtask);

        // TODO(3d) 
        let containing_box = {
            "tlx": gmx,
            "tly": gmy,
            "brx": gmx,
            "bry": gmy
        };
        if (NONSPATIAL_MODES.includes(annotation_mode)) {
            containing_box = null;
            line_size = null;
            init_spatial = null;
        }
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        // Add this annotation to annotations object
        this.subtasks[subtask]["annotations"]["access"][unq_id] = {
            "id": unq_id,
            "new": true,
            "parent_id": null,
            "created_by": this.config["annotator"],
            "created_at": ULabel.get_time(),
            "deprecated": false,
            "deprecated_by": { "human": false },
            "spatial_type": annotation_mode,
            "spatial_payload": init_spatial,
            "classification_payloads": JSON.parse(JSON.stringify(init_id_payload)),
            "line_size": line_size,
            "containing_box": containing_box,
            "frame": frame,
            "canvas_id": canvas_id,
            "text_payload": ""
        };
        if (annotation_mode === "polygon") {
            // First layer is always a fill, not a hole
            this.subtasks[subtask]["annotations"]["access"][unq_id]["spatial_payload_holes"] = [false];
            this.subtasks[subtask]["annotations"]["access"][unq_id]["spatial_payload_child_indices"] = [[]];
        }
        if (redoing) {
            this.set_id_dialog_payload_to_init(unq_id, init_id_payload);
        }

        // TODO(3d)
        // Load annotation_meta into annotation
        this.subtasks[subtask]["annotations"]["access"][unq_id]["annotation_meta"] = this.config["annotation_meta"];
        this.subtasks[subtask]["annotations"]["ordering"].push(unq_id);

        // If a polygon was just started, we need to add a clickable to end the shape
        // Don't create ender when in brush mode
        if ((annotation_mode === "polygon" || annotation_mode === "delete_polygon") && !this.subtasks[subtask]["state"]["is_in_brush_mode"]) {
            this.create_polygon_ender(gmx, gmy, unq_id);
        }
        else if (annotation_mode === "polyline") {
            // Create enders to connect to the ends of other polylines
            // TODO
        }

        // Draw annotation, and set state to annotation in progress
        this.draw_annotation_from_id(unq_id);
        this.subtasks[subtask]["state"]["active_id"] = unq_id;
        this.subtasks[subtask]["state"]["is_in_progress"] = true;

        // Record for potential undo/redo
        this.record_action({
            act_type: "begin_annotation",
            frame: frame,
            redo_payload: {
                mouse_event: mouse_event,
                unq_id: unq_id,
                line_size: line_size,
                annotation_mode: annotation_mode,
                gmx: gmx,
                gmy: gmy,
                init_spatial: JSON.parse(JSON.stringify(init_spatial)),
                finished: redoing || annotation_mode === "point",
                init_payload: JSON.parse(JSON.stringify(this.subtasks[subtask]["state"]["id_payload"]))
            },
            undo_payload: {
                // TODO(3d)
                actid: unq_id,
                ann_str: JSON.stringify(this.subtasks[subtask]["annotations"]["access"][unq_id])
            },
        }, redoing);
        if (redoing) {
            if (annotation_mode === "polygon" || annotation_mode === "polyline" || annotation_mode === "delete_polygon") {
                this.continue_annotation(this.state["last_move"]);
            }
            else {
                redo_payload.actid = redo_payload.unq_id;
                this.finish_annotation(null, redo_payload);
                this.rebuild_containing_box(unq_id);
                this.suggest_edits(this.state["last_move"]);
            }
        }
        else if (annotation_mode === "point") {
            this.finish_annotation(null);
            this.rebuild_containing_box(unq_id);
            this.suggest_edits(this.state["last_move"]);
        }
    }

    begin_annotation__undo(undo_payload) {
        // Parse necessary data
        let ann = JSON.parse(undo_payload.ann_str);
        let unq_id = ann["id"];

        // Set annotation state not in progress, nullify active id
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = false;
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;

        // Destroy ender
        // TODO(3d)
        const spatial_type = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["spatial_type"];
        if (spatial_type === "polygon" || spatial_type === "delete_polygon") {
            this.destroy_polygon_ender(unq_id);
        } else if (spatial_type === "polyline") {
            // Destroy enders/linkers for polyline
            // TODO 
        }

        // Destroy the annotation's canvas, thus removing it from the screen
        this.destroy_annotation_context(unq_id);

        // Remove from ordering
        // TODO(3d)
        let end_ann = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].pop();
        if (end_ann != unq_id) {
            console.log("We may have a problem... undo replication");
            console.log(end_ann, unq_id);
        }

        // Remove from access
        // TODO(3d)
        if (unq_id in this.subtasks[this.state["current_subtask"]]["annotations"]["access"]) {
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id];
        }
        else {
            console.log("We may have a problem... undo replication");
        }

        this.suggest_edits(this.state["last_move"]);
    }

    update_containing_box(ms_loc, actid, subtask = null) {
        if (subtask === null) {
            subtask = this.state["current_subtask"];
        }
        // TODO(3d)
        if (ms_loc[0] < this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"] = ms_loc[0];
        }
        else if (ms_loc[0] > this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"] = ms_loc[0];
        }
        if (ms_loc[1] < this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"] = ms_loc[1];
        }
        else if (ms_loc[1] > this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"] = ms_loc[1];
        }
        // console.log(ms_loc, this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]);
    }

    rebuild_containing_box(actid, ignore_final = false, subtask = null) {
        if (subtask === null) {
            subtask = this.state["current_subtask"];
        }
        // No need to rebuild containing box for image-level annotation types.
        const spatial_type = this.subtasks[subtask]["annotations"]["access"][actid]["spatial_type"];
        
        if (NONSPATIAL_MODES.includes(spatial_type)) {
            return;
        }
        let spatial_payload = [];
        if (spatial_type === "polygon") {
            // Collapse the list[list[points]] into a single list of points
            for (let active_spatial_payload of this.subtasks[subtask]["annotations"]["access"][actid]["spatial_payload"]) {
                spatial_payload = spatial_payload.concat(active_spatial_payload);   
            }
        } else {
            spatial_payload = this.subtasks[subtask]["annotations"]["access"][actid]["spatial_payload"];
        }
        
        let init_pt = spatial_payload[0];

        this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"] = {
            "tlx": init_pt[0],
            "tly": init_pt[1],
            "brx": init_pt[0],
            "bry": init_pt[1]
        }
        let npts = spatial_payload.length;
        if (ignore_final) {
            npts -= 1;
        }
        for (var pti = 1; pti < npts; pti++) {
            this.update_containing_box(spatial_payload[pti], actid, subtask);
        }
        if (spatial_type) {
            let line_size = this.subtasks[subtask]["annotations"]["access"][actid]["line_size"];
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"] -= 3 * line_size;
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"] -= 3 * line_size;
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"] += 3 * line_size;
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"] += 3 * line_size;
        }
        // TODO modification here for T-Bar would be nice too
    }

    // Check that two containing boxes are equal
    containing_boxes_are_equal(containing_box1, containing_box2) {
        return (
            containing_box1["tlx"] === containing_box2["tlx"] &&
            containing_box1["tly"] === containing_box2["tly"] &&
            containing_box1["brx"] === containing_box2["brx"] &&
            containing_box1["bry"] === containing_box2["bry"]
        )
    }

    continue_annotation(mouse_event, isclick = false, redo_payload = null) {
        // Convenience
        let actid = null;
        let redoing = false;
        let gmx = null;
        let gmy = null;
        let frm = this.state["current_frame"];
        let is_click_dragging = this.drag_state["active_key"] != null;
        if (redo_payload === null) {
            actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
            gmx = this.get_global_mouse_x(mouse_event);
            gmy = this.get_global_mouse_y(mouse_event);
        } else {
            mouse_event = redo_payload.mouse_event;
            isclick = redo_payload.isclick;
            actid = redo_payload.actid;
            redoing = true;
            gmx = redo_payload.gmx;
            gmy = redo_payload.gmy;
            frm = redo_payload.frame;
        }

        if (actid && (actid)) {
            const ms_loc = [
                gmx,
                gmy
            ];
            // Handle annotation continuation based on the annotation mode
            // TODO(3d)
            // TODO(3d--META) -- This is the farthest I got tagging places that will need to be fixed.
            let n_kpts, ender_pt, ender_dist, ender_thresh, add_keypoint;
            const spatial_type = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"];
            let spatial_payload = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"];
            let active_spatial_payload = spatial_payload;

            switch (spatial_type) {
                case "bbox":
                case "delete_bbox":
                    spatial_payload[1] = ms_loc;
                    this.rebuild_containing_box(actid);
                    break;
                case "bbox3":
                    spatial_payload[1] = [
                        ms_loc[0],
                        ms_loc[1],
                        frm
                    ];
                    this.rebuild_containing_box(actid);
                    break;
                case "polygon":
                case "polyline":
                case "delete_polygon":
                    if (spatial_type === "polygon") {
                        // for polygons, the active spatial payload is the last array of points in the spatial payload
                        active_spatial_payload = spatial_payload.at(-1);
                    }
                    // Store number of keypoints for easy access
                    n_kpts = active_spatial_payload.length;

                    if (n_kpts > 0) {
                        // If hovering over the ender, snap to its center
                        ender_pt = [
                            active_spatial_payload[0][0],
                            active_spatial_payload[0][1]
                        ];
                        ender_dist = Math.pow(Math.pow(ms_loc[0] - ender_pt[0], 2) + Math.pow(ms_loc[1] - ender_pt[1], 2), 0.5);
                        ender_thresh = $("#ender_" + actid).width() / (2 * this.get_empirical_scale());
                        if (ender_dist < ender_thresh) {
                            active_spatial_payload[n_kpts - 1] = ender_pt;
                        }
                        else { // Else, just redirect line to mouse position
                            active_spatial_payload[n_kpts - 1] = ms_loc;
                        }
                    } else if (this.subtasks[this.state["current_subtask"]]["state"]["starting_complex_polygon"]) {
                        // When waiting to start a complex polygon, move the ender to the mouse position
                        this.move_polygon_ender(gmx, gmy, actid);
                    }
                        

                    // If this mouse event is a click, add a new member to the list of keypoints 
                    //    ender clicks are filtered before they get here
                    add_keypoint = true;
                    if (isclick || is_click_dragging) {
                        if (n_kpts === 0) {
                            // If no keypoints, then we create an ender at the mouse position
                            // this.create_polygon_ender(gmx, gmy, actid);
                            // we'll need to add this point twice, once for the actual point
                            // and once for rendering future lines.
                            active_spatial_payload.push(ms_loc);
                            // mark that we've successfully started our complex polygon
                            this.subtasks[this.state["current_subtask"]]["state"]["starting_complex_polygon"] = false;
                        } else if (n_kpts > 1){
                            // the last point in the active spatial payload is the current mouse position for rendering purposes,
                            // so we check against the second to last point
                            let last_pt = active_spatial_payload[n_kpts - 2];
                            // If the last point is the same as the current point, then we are done
                            if (last_pt[0] === ms_loc[0] && last_pt[1] === ms_loc[1]) {
                                add_keypoint = false;
                            }
                        }
                        
                        // only add a new keypoint if it is different from the last one
                        if (add_keypoint) {
                            active_spatial_payload.push(ms_loc);
                            this.update_containing_box(ms_loc, actid);

                            let frame = this.state["current_frame"];

                            // Only an undoable action if placing a polygon keypoint
                            this.record_action({
                                act_type: "continue_annotation",
                                frame: frame,
                                redo_payload: {
                                    mouse_event: mouse_event,
                                    isclick: isclick || is_click_dragging,
                                    actid: actid,
                                    gmx: gmx,
                                    gmy: gmy
                                },
                                undo_payload: {
                                    actid: actid
                                }
                            }, redoing);
                            if (redoing) {
                                this.continue_annotation(this.state["last_move"]);
                            }
                        }
                    }

                    // If the FilterDistance ToolboxItem is present, filter points with this new polyline present
                    if (this.toolbox_order.includes(AllowedToolboxItem.FilterDistance)) {
                        // Currently only supported by polyline
                        filter_points_distance_from_line(this)
                    }
                    break;
                case "contour":
                    if (GeometricUtils.l2_norm(ms_loc, spatial_payload.at(-1)) * this.config["px_per_px"] > 3) {
                        spatial_payload.push(ms_loc);
                        this.update_containing_box(ms_loc, actid);
                    }
                    break;
                case "tbar":
                    spatial_payload[1] = ms_loc;
                    this.rebuild_containing_box(actid);
                    break;
                default:
                    this.raise_error(`Annotation mode is not understood: ${spatial_type}`, ULabel.elvl_info);
                    break;
            }
            this.redraw_annotation(actid);
        }
    }

    continue_annotation__undo(undo_payload) {
        // TODO(3d)
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        let spatial_payload = current_subtask["annotations"]["access"][undo_payload.actid]["spatial_payload"];
        const spatial_type = current_subtask["annotations"]["access"][undo_payload.actid]["spatial_type"];
        let active_spatial_payload = spatial_payload;
        if (spatial_type === "polygon") {
            // For polygons, the active spatial payload is the last array of points in the spatial payload
            active_spatial_payload = spatial_payload.at(-1);
        }
        // Get the last point in the active spatial payload
        active_spatial_payload.pop();
        
        // Logic for dealing with complex layers
        if (spatial_payload[0].length > 1) {
            // If the active spatial payload has *one* point remaining, delete the point and start moving the polygon ender
            if (active_spatial_payload.length === 1) {
                active_spatial_payload.pop();
                current_subtask["state"]["starting_complex_polygon"] = true;
            } else if (active_spatial_payload.length === 0) {
                // If the user has undone all points in the active spatial payload, return to the previous layer
                // Set the starting_complex_polygon state to false
                current_subtask["state"]["starting_complex_polygon"] = false
                // Remove the placeholder annotation
                spatial_payload.pop();
                active_spatial_payload = spatial_payload.at(-1);
                // move the polygon ender
                let last_pt = active_spatial_payload.at(-1);
                this.move_polygon_ender(last_pt[0], last_pt[1], current_subtask["state"]["active_id"]);
            }
        }
        this.rebuild_containing_box(undo_payload.actid, true);
        this.continue_annotation(this.state["last_move"]);
    }

    start_complex_polygon(redo_payload = null) {
        // Turn off any edit suggestions or id dialogs
        this.hide_edit_suggestion();
        this.hide_global_edit_suggestion();

        const current_subtask = this.subtasks[this.state["current_subtask"]]
        let active_id = null;
        let redoing = false;
        if (redo_payload === null) {
            active_id = current_subtask["state"]["active_id"];
        } else {
            active_id = redo_payload.actid;
            current_subtask["state"]["active_id"] = active_id;
            redoing = true;

            // Add back the ender
            let gmx = this.get_global_mouse_x(this.state["last_move"]);
            let gmy = this.get_global_mouse_y(this.state["last_move"]); 
            this.create_polygon_ender(gmx, gmy, active_id);
        }

        // Prep the next part of the polygon
        current_subtask["annotations"]["access"][active_id]["spatial_payload"].push([]);
        // mark that we are starting complex polygon
        current_subtask["state"]["starting_complex_polygon"] = true;
        // mark in progress
        current_subtask["state"]["is_in_progress"] = true;
        
        this.record_action({
            act_type: "start_complex_polygon",
            frame: this.state["current_frame"],
            undo_payload: {
                actid: active_id,
            },
            redo_payload: {
                actid: active_id
            }
        }, redoing);
    }

    start_complex_polygon__undo(undo_payload) {
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        // Set the starting_complex_polygon state to false
        current_subtask["state"]["starting_complex_polygon"] = false
        // Remove the placeholder annotation
        current_subtask["annotations"]["access"][undo_payload.actid]["spatial_payload"].pop()
        // Remove the polygon ender
        this.destroy_polygon_ender(undo_payload.actid);
        // Mark that we're done here
        current_subtask["state"]["active_id"] = null;
        current_subtask["state"]["is_in_progress"] = false;
        // Redraw the annotation
        this.rebuild_containing_box(undo_payload.actid);
        this.redraw_annotation(undo_payload.actid);
    }

    // Split a ULabel complex polygon seperate turf polygons for each fill
    split_complex_polygon(active_id) {
        this.verify_complex_polygon_child_indices(active_id);
        // Get annotation
        const annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id];
        const spatial_payload = annotation["spatial_payload"];
        const spatial_payload_holes = annotation["spatial_payload_holes"];
        const spatial_payload_child_indices = annotation["spatial_payload_child_indices"];
        let split_polygons = [];
        for (let idx = 0; idx < spatial_payload.length; idx++) {
            // Check that this is a fill and not a hole
            if (!spatial_payload_holes[idx]) {
                // Start with the fill itself
                let split_polygon = [spatial_payload[idx]];
                // Check that we track its children
                if (idx < spatial_payload_child_indices.length) {
                    // Get the child indices
                    let child_indices_arr = spatial_payload_child_indices[idx];
                    if (child_indices_arr.length > 0) {
                        for (const child_idx of child_indices_arr) {
                            // Add the holes
                            split_polygon.push(spatial_payload[child_idx]);
                        }
                    }
                }
                split_polygons.push(split_polygon);
            }
        }
        return split_polygons;
    }

    // Remove any child indices and spatial_payload_holes that are not longer in the spatial_payload
    verify_complex_polygon_child_indices(active_id) {
        // Get annotation
        const annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id];
        // Get the spatial payload
        const spatial_payload = annotation["spatial_payload"];
        // Verify length
        while (annotation["spatial_payload_child_indices"].length > spatial_payload.length) {
            annotation["spatial_payload_child_indices"].pop();
        }
        for (let child_indices of annotation["spatial_payload_child_indices"]) {
            for (let i of child_indices) {
                if (i >= spatial_payload.length) {
                    child_indices.splice(child_indices.indexOf(i), 1);
                }
            }
        }
        // Verify length of spatial_payload_holes
        while (annotation["spatial_payload_holes"].length > spatial_payload.length) {
            annotation["spatial_payload_holes"].pop();
        }
    }

    // Start annotating or erasing with the brush
    begin_brush(mouse_event) {  
        // First, we check if there is an annotation touching the brush      
        let brush_cand_active_id = null;
        const global_x = this.get_global_mouse_x(mouse_event);
        const global_y = this.get_global_mouse_y(mouse_event);
        let brush_polygon = this.get_brush_circle_spatial_payload(global_x, global_y);
        // Loop through all annotations in the ordering until we find a polygon that intersects with the brush
        for (let i = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].length - 1; i >= 0; i--) {
            let active_id = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"][i];
            let annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id];
            // Only undeprecated polygons
            if (!annotation["deprecated"] && annotation["spatial_type"] === "polygon") {
                // Split into fills + their associated holes
                let split_polygons = this.split_complex_polygon(active_id);
                // Check if the brush intersects with or is within any layer
                for (let split_polygon of split_polygons) {
                    if (
                        GeometricUtils.complex_polygons_intersect(split_polygon, brush_polygon) ||
                        GeometricUtils.complex_polygon_is_within_complex_polygon(brush_polygon, split_polygon)
                    ) {
                        brush_cand_active_id = active_id;
                        break;
                    }
                }
            }
            if (brush_cand_active_id !== null) {
                break;
            }
        }
        
        if (brush_cand_active_id !== null) {
            // Set annotation as in progress
            this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = brush_cand_active_id;
            this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = true;
            // Record for potential undo/redo
            this.record_action({
                act_type: "begin_brush",
                frame: this.state["current_frame"],
                undo_payload: {
                    actid: brush_cand_active_id,
                    annotation: JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][brush_cand_active_id])),
                },
                redo_payload: {
                    actid: brush_cand_active_id,
                    mouse_event: mouse_event
                }
            });
            this.continue_brush(mouse_event);
        } else if (!this.subtasks[this.state["current_subtask"]]["state"]["is_in_erase_mode"]) {
            // Start a new annotation if not in erase mode
            this.begin_annotation(mouse_event);
        } else {
            // Move the brush
            this.move_brush_circle(global_x, global_y);
        }
    }

    // Reset the annotation
    begin_brush__undo(undo_payload) {
        if (undo_payload.actid !== null) {
            // Reset the annotation
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid] = undo_payload.annotation;
            // Redraw annotation
            this.redraw_annotation(undo_payload.actid);
        }
    }

    continue_brush(mouse_event) {
        // Get global mouse position
        const gmx = this.get_global_mouse_x(mouse_event);
        const gmy = this.get_global_mouse_y(mouse_event);

        // Move the brush
        this.move_brush_circle(gmx, gmy);

        // Check if current mouse is far enough from last brush point
        let continue_brush = true;
        const min_brush_distance = this.config["brush_size"] / 8;
        if (this.state["last_brush_stroke"] !== null) {
            let [last_gmx, last_gmy] = this.state["last_brush_stroke"]
            if (Math.abs(gmx - last_gmx) < min_brush_distance && Math.abs(gmy - last_gmy) < min_brush_distance) {
                continue_brush = false;
            }
        }
        if (continue_brush) {
            // Save the last brush stroke
            this.state["last_brush_stroke"] = [gmx, gmy];
            const current_subtask = this.subtasks[this.state["current_subtask"]];
            const active_id = current_subtask["state"]["active_id"];
            if (active_id !== null) {
                // Merge the brush with the annotation
                let brush_polygon = this.get_brush_circle_spatial_payload(gmx, gmy);

                // Get the current annotation
                const annotation = current_subtask["annotations"]["access"][active_id];
                // Split the annotation into separate polygons for each fill
                let split_polygons = this.split_complex_polygon(active_id);
                let new_spatial_payload = [];

                if (current_subtask["state"]["is_in_erase_mode"]) {
                    for (let split_polygon of split_polygons) {
                        let merged_polygon;
                        // Erase the brush from the annotation
                        merged_polygon = GeometricUtils.subtract_polygons(split_polygon, brush_polygon);
                        if (merged_polygon !== null) {
                            // Extend the new spatial payload
                            new_spatial_payload = new_spatial_payload.concat(merged_polygon);
                        }
                    }
                } else {
                    // Merge the brush with all intersecting layers
                    let merged_polygon = brush_polygon;
                    let n_merges = 0;
                    for (let split_polygon of split_polygons) {
                        // Check that the fill (first layer) of the split polygon intersects with our merged polygon
                        // or if the split polygon as a whole intersects with our merged polygon
                        // or if any hole in the split polygon is within our merged polygon (handles really small holes)
                        if (
                            GeometricUtils.complex_polygons_intersect([split_polygon[0]], merged_polygon) ||
                            GeometricUtils.complex_polygons_intersect(split_polygon, merged_polygon) ||
                            GeometricUtils.any_complex_polygon_hole_is_within_complex_polygon(split_polygon, merged_polygon)
                        ) {
                            n_merges += 1;
                            // Merge the split polygon with the current merged polygon
                            merged_polygon = GeometricUtils.merge_polygons(split_polygon, merged_polygon);
                        } else {
                            // If the split doesn't intersect our active merge, just add it back to the new spatial payload
                            new_spatial_payload = new_spatial_payload.concat(split_polygon);
                        }
                    }
                    // Add the merged polygon to the new spatial payload
                    if (n_merges > 0) {
                        new_spatial_payload = new_spatial_payload.concat(merged_polygon);
                    } else {
                        return;
                    }                   
                }
                
                if (new_spatial_payload.length === 0) {
                    // Delete the annotation before overwriting payload
                    this.delete_annotation(active_id);
                }
                annotation["spatial_payload"] = new_spatial_payload;
                this.verify_all_polygon_complex_layers(active_id);
                this.rebuild_containing_box(active_id);
                this.redraw_annotation(active_id);
            }
        }
    }

    finish_brush__undo() {
        // When undoing a brush, for convenience we will undo each continue_brush action
        // until we get back to the begin_brush or begin_annotation action
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        
        // Then, loop throught the action stream until we find the begin_brush or begin_annotation action
        while (current_subtask["actions"]["stream"].length > 0) {
            let action = current_subtask["actions"]["stream"].pop();
            action.is_internal_undo = true;
            // undo the action
            this.undo_action(action);
            if (action.act_type === "begin_brush" || action.act_type === "begin_annotation") {
                // we're done
                break;
            }
        }        

    }



    begin_edit(mouse_event) {
        // Create constants for convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const annotations = current_subtask["annotations"]["access"]

        // Handle case of editing an annotation that was not originally created by you
        let deprecate_old = false;
        let old_id = current_subtask["state"]["edit_candidate"]["annid"];
        let new_id = old_id;
        // TODO(3d)
        if (!annotations[old_id]["new"]) {
            // Make new id and record that you did
            deprecate_old = true;
            new_id = this.make_new_annotation_id();

            // Make new annotation (copy of old)
            annotations[new_id] = JSON.parse(JSON.stringify(annotations[old_id]));
            annotations[new_id]["id"] = new_id;
            annotations[new_id]["created_by"] = this.config["annotator"];
            annotations[new_id]["new"] = true;
            annotations[new_id]["parent_id"] = old_id;
            if (!NONSPATIAL_MODES.includes(annotations[new_id]["spatial_type"])) {
                annotations[new_id]["canvas_id"] = this.get_init_canvas_context_id(new_id);
            }
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(new_id);

            // Set parent_id and deprecated = true
            mark_deprecated(annotations[old_id], true)
            // Redraw the old annotation
            this.redraw_annotation(old_id);

            // Change edit candidate to new id
            this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"] = new_id;
        }

        current_subtask["state"]["active_id"] = current_subtask["state"]["edit_candidate"]["annid"];
        current_subtask["state"]["is_in_edit"] = true;
        let edit_candidate = JSON.parse(JSON.stringify(current_subtask["state"]["edit_candidate"]));
        let starting_point = this.get_with_access_string(current_subtask["state"]["edit_candidate"]["annid"], edit_candidate["access"]);
        this.edit_annotation(mouse_event);
        this.suggest_edits(mouse_event);
        let gmx = this.get_global_mouse_x(mouse_event);
        let gmy = this.get_global_mouse_y(mouse_event);

        let annotation_mode = annotations[new_id]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        this.record_action({
            act_type: "edit_annotation",
            frame: frame,
            undo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                edit_candidate: edit_candidate,
                starting_x: starting_point[0],
                starting_y: starting_point[1],
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            },
            redo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                edit_candidate: edit_candidate,
                ending_x: gmx,
                ending_y: gmy,
                finished: false,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            }
        });
    }

    edit_annotation(mouse_event) {
        // Convenience and readability
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const active_id = current_subtask["state"]["active_id"];
        const access_str = current_subtask["state"]["edit_candidate"]["access"];
        if (active_id && (active_id !== null)) {
            const mouse_location = [
                this.get_global_mouse_x(mouse_event),
                this.get_global_mouse_y(mouse_event)
            ];
            // Clicks are handled elsewhere
            // TODO(3d)
            switch (current_subtask["annotations"]["access"][active_id]["spatial_type"]) {
                case "bbox":
                case "tbar":
                case "polygon":
                    this.set_with_access_string(active_id, access_str, mouse_location);
                    this.rebuild_containing_box(active_id);
                    this.redraw_annotation(active_id);
                    current_subtask["state"]["edit_candidate"]["point"] = mouse_location;
                    this.show_edit_suggestion(current_subtask["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(current_subtask["state"]["edit_candidate"]["annid"]);
                    break;
                case "bbox3":
                    // TODO(new3d) Will not always want to set 3rd val -- editing is possible within an intermediate frame or frames
                    this.set_with_access_string(active_id, access_str, [mouse_location[0], mouse_location[1], this.state["current_frame"]]);
                    this.rebuild_containing_box(active_id);
                    this.redraw_annotation(active_id);
                    current_subtask["state"]["edit_candidate"]["point"] = mouse_location;
                    this.show_edit_suggestion(current_subtask["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(current_subtask["state"]["edit_candidate"]["annid"]);
                    break;
                case "polyline":
                    this.set_with_access_string(active_id, access_str, mouse_location);
                    this.rebuild_containing_box(active_id);
                    this.redraw_annotation(active_id);
                    current_subtask["state"]["edit_candidate"]["point"] = mouse_location;
                    this.show_edit_suggestion(current_subtask["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(current_subtask["state"]["edit_candidate"]["annid"]);

                    // If the FilterDistance ToolboxItem is present, filter annotations on annotation edit
                    if (this.toolbox_order.includes(AllowedToolboxItem.FilterDistance)) {
                        // Currently only supported by polyline
                        filter_points_distance_from_line(this)
                    }
                    break;
                case "contour":
                    // TODO contour editing
                    this.raise_error("Annotation mode is not currently editable", ULabel.elvl_info);
                    break;
                default:
                    this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                    break;
            }
        }
    }

    edit_annotation__undo(undo_payload) {
        // Convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const annotations = current_subtask["annotations"]["access"]

        let active_id = undo_payload.actid;
        if (undo_payload.deprecate_old) {
            active_id = undo_payload.old_id;
            // TODO(3d)
            // Undeprecate the active annotation
            mark_deprecated(annotations[active_id], false)

            // Delete the new annotation which is being undone
            this.destroy_annotation_context(undo_payload.new_id);
            delete annotations[undo_payload.new_id];

            // Remove deleted annotation from ordering
            const index = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].indexOf(undo_payload.new_id)
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].splice(index, 1);
        }

        // Get the mouse location
        const mouse_location = [
            undo_payload.starting_x,
            undo_payload.starting_y
        ];

        this.set_with_access_string(active_id, undo_payload.edit_candidate["access"], mouse_location, true);
        this.rebuild_containing_box(active_id);
        this.redraw_annotation(active_id);
        this.suggest_edits(this.state["last_move"]);
    }

    edit_annotation__redo(redo_payload) {
        // Convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const annotations = current_subtask["annotations"]["access"]

        let actid = redo_payload.actid;
        if (redo_payload.deprecate_old) {
            actid = redo_payload.new_id;
            // TODO(3d)
            annotations[redo_payload.new_id] = JSON.parse(JSON.stringify(annotations[redo_payload.old_id]));
            annotations[redo_payload.new_id]["id"] = redo_payload.new_id;
            annotations[redo_payload.new_id]["created_by"] = this.config["annotator"];
            annotations[redo_payload.new_id]["new"] = true;
            annotations[redo_payload.new_id]["parent_id"] = redo_payload.old_id;
            if (!NONSPATIAL_MODES.includes(annotations[redo_payload.new_id]["spatial_type"])) {
                annotations[redo_payload.new_id]["canvas_id"] = this.get_init_canvas_context_id(redo_payload.new_id);
            }

            // Mark the old annotation as deprecated
            mark_deprecated(annotations[redo_payload.old_id], true)
            // Redraw old annotation
            this.redraw_annotation(redo_payload.old_id);

            // Add the new annotation to the ordering array
            current_subtask["annotations"]["ordering"].push(redo_payload.new_id);
        }
        const ms_loc = [
            redo_payload.ending_x,
            redo_payload.ending_y
        ];
        const cur_loc = this.get_with_access_string(redo_payload.actid, redo_payload.edit_candidate["access"]);
        // TODO(3d)
        const spatial_type = annotations[actid]["spatial_type"]
        switch (spatial_type) {
            case "bbox":
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc);
                this.rebuild_containing_box(actid);
                this.redraw_annotation(actid);
                this.suggest_edits(this.state["last_move"]);
                break;
            case "bbox3":
                ms_loc.push(redo_payload.ending_frame);
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc);
                this.rebuild_containing_box(actid);
                this.redraw_annotation(actid);
                this.suggest_edits(this.state["last_move"]);
                break;
            case "polygon":
            case "polyline":
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc, false);
                this.rebuild_containing_box(actid);
                this.redraw_annotation(actid);
                this.suggest_edits(this.state["last_move"]);
                break;
            case "tbar":
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc, false);
                this.rebuild_containing_box(actid);
                this.redraw_annotation(actid);
                this.suggest_edits(this.state["last_move"]);
                break;

        }
        let annotation_mode = annotations[actid]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }
        this.record_action({
            act_type: "edit_annotation",
            frame: frame,
            undo_payload: {
                actid: redo_payload.actid,
                edit_candidate: JSON.parse(JSON.stringify(redo_payload.edit_candidate)),
                starting_x: cur_loc[0],
                starting_y: cur_loc[1],
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            },
            redo_payload: {
                actid: redo_payload.actid,
                edit_candidate: JSON.parse(JSON.stringify(redo_payload.edit_candidate)),
                ending_x: redo_payload.ending_x,
                ending_y: redo_payload.ending_y,
                finished: true,
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            }
        }, true);
    }

    begin_move(mouse_event) {
        // Convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const annotations = current_subtask["annotations"]["access"]

        let deprecate_old = false;
        let old_id = this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"];
        let new_id = old_id;
        // TODO(3d)
        if (!annotations[old_id]["new"]) {
            // Make new id and record that you did
            deprecate_old = true;
            new_id = this.make_new_annotation_id();

            // Make new annotation (copy of old)
            annotations[new_id] = JSON.parse(JSON.stringify(annotations[old_id]));
            annotations[new_id]["id"] = new_id;
            annotations[new_id]["created_by"] = this.config["annotator"];
            annotations[new_id]["new"] = true;
            annotations[new_id]["parent_id"] = old_id;
            if (!NONSPATIAL_MODES.includes(annotations[new_id]["spatial_type"])) {
                annotations[new_id]["canvas_id"] = this.get_init_canvas_context_id(new_id);
            }
            current_subtask["annotations"]["ordering"].push(new_id);

            // Set parent_id and deprecated = true
            mark_deprecated(annotations[old_id], true);
            // Redraw the old annotation
            this.redraw_annotation(old_id);

            // Change edit candidate to new id
            current_subtask["state"]["move_candidate"]["annid"] = new_id;
        }

        current_subtask["state"]["active_id"] = current_subtask["state"]["move_candidate"]["annid"];
        current_subtask["state"]["is_in_move"] = true;

        // Revise start to current button center
        // TODO
        /*
        this.drag_state["move"]["mouse_start"][0] = mouse_event.target.pageX 
        this.drag_state["move"]["mouse_start"][1] +=
        */
        let mc = JSON.parse(JSON.stringify(current_subtask["state"]["move_candidate"]));
        let annotation_mode = annotations[new_id]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        this.record_action({
            act_type: "move_annotation",
            frame: frame,
            undo_payload: {
                actid: current_subtask["state"]["active_id"],
                move_candidate: mc,
                diffX: 0,
                diffY: 0,
                diffZ: 0,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            },
            redo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                move_candidate: mc,
                diffX: 0,
                diffY: 0,
                diffZ: 0,
                finished: false,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            }
        });
        // Hide point edit suggestion
        $(".edit_suggestion").css("display", "none");

        this.move_annotation(mouse_event);
    }

    // Cancel the annotation currently in progress
    cancel_annotation(redo_payload = null) {
        let annid;
        if (redo_payload === null) {
            // Get the active id
            annid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        } else {
            annid = redo_payload.annid;
        }

        let is_complex_layer = false;
        if (annid !== null) {
            const annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid];
            const og_annotation = JSON.parse(JSON.stringify(annotation));
            const spatial_type = annotation["spatial_type"];
            // When drawing a complex layer, we will only delete the last layer
            if (
                (spatial_type === "polygon" || spatial_type === "delete_polygon") &&
                annotation["spatial_payload"].length > 1
            ) {
                is_complex_layer = true;
                // Reuse the logic for undoing the start of a complex polygon
                this.start_complex_polygon__undo({actid: annid}); 
            } else {
                // Delete the annotation, without recording the delete action
                // This will also clear is_in_progress and other states
                this.delete_annotation(annid, null, false);
            }

            // Record the cancel action
            this.record_action({
                act_type: "cancel_annotation",
                frame: this.state["current_frame"],
                undo_payload: {
                    annid: annid,
                    suggest_edits: false,
                    drag_state: JSON.parse(JSON.stringify(this.drag_state)),
                    is_complex_layer: is_complex_layer,
                    annotation: og_annotation,
                },
                redo_payload: {
                    annid: annid,
                }
            }, redo_payload !== null);
        }
    }

    cancel_annotation__undo(undo_payload) {
        // Mark that the annotation is in progress again
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = undo_payload.annid;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = true;

        if (undo_payload.is_complex_layer) {
            // Restore the removed layer
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.annid] = JSON.parse(JSON.stringify(undo_payload.annotation));
            // Redraw the annotation
            this.redraw_annotation(undo_payload.annid);
        } else {
            // Undeprecate the annotation
            this.delete_annotation__undo(undo_payload);
        }

        let annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.annid];
        console.log("Restored annotation:", annotation);
        // If a polygon/delete polygon, show the ender
        if (annotation["spatial_type"] === "polygon" || annotation["spatial_type"] === "delete_polygon") {
            // Get the first point of the last layer
            let first_pt = annotation["spatial_payload"].at(-1)[0];
            this.create_polygon_ender(first_pt[0], first_pt[1], undo_payload.annid);
        } else if (annotation["spatial_type"] === "bbox" || annotation["spatial_type"] === "tbar") {
            // Reset the drag mode to cause mouse moves to move the annotation
            this.drag_state = undo_payload.drag_state;
            // Move to the current mouse location
            this.continue_annotation(this.state["last_move"]);
        }
    }

    finish_annotation(mouse_event) {
        // Convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const annotations = current_subtask["annotations"]["access"]

        // Initialize required variables
        let active_id = current_subtask["state"]["active_id"];
        let annotation = annotations[active_id];
        let spatial_payload = annotation["spatial_payload"];
        let active_spatial_payload = spatial_payload;

        // Record last point and redraw if necessary
        // TODO(3d)
        let n_kpts, start_pt, popped, act_type, active_idx;
        switch (annotation["spatial_type"]) {
            case "polygon":
                // For polygons, the active spatial payload is the last array of points in the spatial payload
                active_idx = spatial_payload.length - 1;
                active_spatial_payload = spatial_payload[active_idx];
                n_kpts = active_spatial_payload.length;
                if (n_kpts < 4) {
                    console.error("Canceled polygon with insufficient points:", n_kpts);
                    return;
                }
                start_pt = [
                    active_spatial_payload[0][0],
                    active_spatial_payload[0][1]
                ];
                active_spatial_payload[n_kpts - 1] = start_pt;

                // If in brush mode, we finish the brush
                if (current_subtask["state"]["is_in_brush_mode"]) {
                    act_type = "finish_brush";
                } else {
                    act_type = "finish_annotation";
                }
                this.record_action({
                    act_type: act_type,
                    frame: this.state["current_frame"],
                    undo_payload: {
                        actid: active_id,
                    },
                    redo_payload: {
                        actid: active_id,
                        annotation: JSON.parse(JSON.stringify(annotation)),
                    }
                });

                // Simplify the polygon
                this.simplify_polygon_complex_layer(active_id, active_idx);
                // Render merged layers. Also handles rebuilding containing box and redrawing
                this.merge_polygon_complex_layer(active_id);
                
                // When shift key is held, we start a new complex layer
                if (!current_subtask["state"]["is_in_brush_mode"] && mouse_event != null && mouse_event.shiftKey) {
                    // Start a new complex layer
                    this.start_complex_polygon();
                } else {
                    this.destroy_polygon_ender(active_id);
                }

                break;
            case "delete_polygon":
                n_kpts = active_spatial_payload.length;
                if (n_kpts < 4) {
                    console.error("Canceled delete with insufficient points:", n_kpts);
                    return;
                }
                start_pt = [
                    active_spatial_payload[0][0],
                    active_spatial_payload[0][1]
                ];
                active_spatial_payload[n_kpts - 1] = start_pt;
                this.delete_annotations_in_polygon(active_id);
                break;
            case "polyline":
                // TODO handle the case of merging with existing annotation
                // Remove last point
                n_kpts = spatial_payload.length;
                if (n_kpts > 2) {
                    popped = true;
                    n_kpts -= 1;
                    spatial_payload.pop();
                }
                else {
                    popped = false;
                    this.rebuild_containing_box(active_id, false, this.state["current_subtask"]);
                }

                this.redraw_annotation(active_id);
                this.record_action({
                    act_type: "finish_annotation",
                    frame: this.state["current_frame"],
                    undo_payload: {
                        actid: active_id,
                        popped: popped
                    },
                    redo_payload: {
                        actid: active_id,
                        popped: popped,
                        fin_pt: JSON.parse(JSON.stringify(
                            spatial_payload[n_kpts - 1]
                        )),
                        annotation: JSON.parse(JSON.stringify(annotation)),
                    }
                });
                break;
            case "delete_bbox":
                this.record_finish(active_id);
                this.delete_annotations_in_bbox(active_id);
                break;
            case "bbox":
            case "bbox3":
            case "contour":
            case "tbar":
            case "point":
                this.record_finish(active_id);
                break;
            default:
                break;
        }

        // If ID has not been assigned to this annotation, build a dialog for it
        // if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] === null) {
        //     this.show_id_dialog(mouse_event, actid);
        // }
        // TODO build a dialog here when necessary -- will also need to integrate with undo
        // TODO(3d)
        if (current_subtask["single_class_mode"]) {
            annotation["classification_payloads"] = [
                {
                    "class_id": current_subtask["class_defs"][0]["id"],
                    "confidence": 1.0
                }
            ]
        }

        // Reset last brush stroke
        this.state["last_brush_stroke"] = null;

        // Set mode to no active annotation, unless shift key is held for a polygon
        if (current_subtask["state"]["starting_complex_polygon"]) {
            console.log("Continuing complex polygon...");
        } else {
            current_subtask["state"]["active_id"] = null;
            current_subtask["state"]["is_in_progress"] = false;
        }
    }

    finish_annotation__undo() {
        // This is only ever invoked for polygons and polylines
        // When undoing a finished annotation, for convenience we will undo each continue_annotation action
        const current_subtask = this.subtasks[this.state["current_subtask"]]

        // Loop through the action stream until we find the start_complex_polygon action or begin_annotation action
        while (current_subtask["actions"]["stream"].length > 0) {
            let action = current_subtask["actions"]["stream"].pop();
            action.is_internal_undo = true;
            if (action.act_type === "start_complex_polygon" || action.act_type === "begin_annotation") {
                // undo the action
                this.undo_action(action);
                // now we're done
                break;
            } else {
                // undo the action
                this.undo_action(action);
            }
        }
    }

    finish_annotation__redo(redo_payload) {
        // Copy the annotation from the redo payload
        let annotation = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.actid]
        annotation = redo_payload.annotation;
        // Get a new canvas context for the annotation
        annotation["canvas_id"] = this.get_init_canvas_context_id(redo_payload.actid);
        // Add annotation back to ordering and access
        this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(redo_payload.actid);
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.actid] = annotation;
        // Redraw the annotation
        this.redraw_annotation(redo_payload.actid);
    }

    finish_edit() {
        // Record last point and redraw if necessary
        let actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        const access_str = this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["access"];
        let layer_idx;
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
            case "polygon":
                this.record_finish_edit(actid);
                // Reset spatial_payload_child_indices
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload_child_indices"] = [];
                // Get the idx of the edited layer and try and merge it
                layer_idx = parseInt(access_str[0], 10)
                this.merge_polygon_complex_layer(actid, layer_idx);
                // Check if any other layers need to be merged
                for (let i = 0; i < this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length; i++) {
                    if (i !== layer_idx) {
                        this.merge_polygon_complex_layer(actid, i);
                    }
                }
                break;
            case "polyline":
            case "bbox":
            case "bbox3":
            case "tbar":
                this.record_finish_edit(actid);
                break;
            case "contour":
            case "point":
                break;
            default:
                break;
        }

        // Set mode to no active annotation
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"] = false;
    }

    move_annotation(mouse_event) {
        // Convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const active_id = current_subtask["state"]["active_id"];
        const active_annotation = current_subtask["annotations"]["access"][active_id]

        if (active_id && (active_id !== null)) {
            let offset = {
                "id": current_subtask["state"]["move_candidate"]["annid"],
                "diffX": (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0]) / this.state["zoom_val"],
                "diffY": (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1]) / this.state["zoom_val"],
                "diffZ": this.state["current_frame"] - this.drag_state["move"]["mouse_start"][2]
            };

            // Check if the FilterDistance ToolboxItem is in this ULabel instance
            // And that the current annotations is of type polyline
            if (
                this.toolbox_order.includes(AllowedToolboxItem.FilterDistance) &&
                active_annotation["spatial_type"] === "polyline"
            ) {
                filter_points_distance_from_line(this, offset);
            }
            this.redraw_annotation(active_id, null, offset);
            this.show_global_edit_suggestion(current_subtask["state"]["move_candidate"]["annid"], offset); // TODO handle offset
            this.reposition_dialogs();
            return;
        }
    }

    finish_move(mouse_event) {
        // Actually edit spatial payload this time
        const diffX = (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0]) / this.state["zoom_val"];
        const diffY = (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1]) / this.state["zoom_val"];
        const diffZ = this.state["current_frame"] - this.drag_state["move"]["mouse_start"][2];

        const active_id = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        const spatial_type = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id]["spatial_type"];
        let spatial_payload = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id]["spatial_payload"];
        let active_spatial_payload = spatial_payload;

        // if a polygon, n_iters is the length the spatial payload
        // else n_iters is 1
        let n_iters = spatial_type === "polygon" ? spatial_payload.length : 1;

        for (let i = 0; i < n_iters; i++) {
            // for polygons, we need to move the points in each part of the spatial payload
            if (spatial_type === "polygon") {
                active_spatial_payload = spatial_payload[i];
            }
            
            // If first and last point reference the same point array in memory, we don't want to add the diff twice
            let n_points = active_spatial_payload.length;
            if (spatial_type === "polygon" && active_spatial_payload[0] === active_spatial_payload[n_points - 1]) {
                n_points -= 1;
            }

            // Move the points
            for (let spi = 0; spi < n_points; spi++) {
                active_spatial_payload[spi][0] += diffX;
                active_spatial_payload[spi][1] += diffY;
            }

            if (MODES_3D.includes(spatial_type)) {
                for (let spi = 0; spi < active_spatial_payload.length; spi++) {
                    active_spatial_payload[spi][2] += diffZ;
                }
            }
        }

        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id]["containing_box"]["tlx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id]["containing_box"]["brx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id]["containing_box"]["tly"] += diffY;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id]["containing_box"]["bry"] += diffY;

        switch (spatial_type) {
            case "polygon":
            case "polyline":
            case "bbox":
            case "bbox3":
            case "contour":
            case "tbar":
            case "point":
                break;
            default:
                break;
        }

        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"] = false;

        this.redraw_annotation(active_id);

        this.record_finish_move(diffX, diffY, diffZ);
    }

    move_annotation__undo(undo_payload) {
        // Convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const annotations = current_subtask["annotations"]["access"]

        const diffX = undo_payload.diffX;
        const diffY = undo_payload.diffY;
        const diffZ = undo_payload.diffZ;

        let active_id = undo_payload.move_candidate["annid"];
        // TODO(3d)
        if (undo_payload.deprecate_old) {
            active_id = undo_payload.old_id;

            // Mark the active annotation undeprecated
            mark_deprecated(annotations[active_id], false)

            // Delete the new annotation that is being undone
            this.destroy_annotation_context(undo_payload.new_id);
            delete annotations[undo_payload.new_id];

            // Remove the deleted annotation from the access array
            let index = current_subtask["annotations"]["ordering"].indexOf(undo_payload.new_id);
            current_subtask["annotations"]["ordering"].splice(index, 1);
        } else {
            const spatial_type = annotations[active_id]["spatial_type"];
            let spatial_payload = annotations[active_id]["spatial_payload"];
            let active_spatial_payload = spatial_payload;

            // if a polygon, n_iters is the length the spatial payload
            // else n_iters is 1
            let n_iters = spatial_type === "polygon" ? spatial_payload.length : 1;

            for (let i = 0; i < n_iters; i++) {
                // for polygons, we need to move the points in each part of the spatial payload
                if (spatial_type === "polygon") {
                    active_spatial_payload = spatial_payload[i];
                }


                for (var spi = 0; spi < active_spatial_payload.length; spi++) {
                    active_spatial_payload[spi][0] += diffX;
                    active_spatial_payload[spi][1] += diffY;
                    if (active_spatial_payload[spi].length > 2) {
                        active_spatial_payload[spi][2] += diffZ;
                    }
                }
            }
            annotations[active_id]["containing_box"]["tlx"] += diffX;
            annotations[active_id]["containing_box"]["brx"] += diffX;
            annotations[active_id]["containing_box"]["tly"] += diffY;
            annotations[active_id]["containing_box"]["bry"] += diffY;
        }

        this.redraw_annotation(active_id);
        this.hide_edit_suggestion();
        this.hide_global_edit_suggestion();
        this.reposition_dialogs();
        this.suggest_edits(this.state["last_move"]);
        this.update_frame(diffZ);
    }

    move_annotation__redo(redo_payload) {
        // Convenience
        const current_subtask = this.subtasks[this.state["current_subtask"]]
        const annotations = current_subtask["annotations"]["access"]

        const diffX = redo_payload.diffX;
        const diffY = redo_payload.diffY;
        const diffZ = redo_payload.diffZ;

        let active_id = redo_payload.move_candidate["annid"];
        // TODO(3d)
        if (redo_payload.deprecate_old) {
            active_id = redo_payload.new_id;
            annotations[active_id] = JSON.parse(JSON.stringify(annotations[redo_payload.old_id]));
            annotations[redo_payload.new_id]["id"] = redo_payload.new_id;
            annotations[redo_payload.new_id]["created_by"] = this.config["annotator"];
            annotations[redo_payload.new_id]["new"] = true;
            annotations[redo_payload.new_id]["parent_id"] = redo_payload.old_id;
            if (!NONSPATIAL_MODES.includes(annotations[redo_payload.new_id]["spatial_type"])) {
                annotations[redo_payload.new_id]["canvas_id"] = this.get_init_canvas_context_id(redo_payload.new_id);
            }

            // Mark old annotation deprecated
            mark_deprecated(annotations[redo_payload.old_id], true)
            // Redraw the old annotation
            this.redraw_annotation(redo_payload.old_id);

            // Add new annotation id to ordering array
            current_subtask["annotations"]["ordering"].push(redo_payload.new_id);
        }

        const spatial_type = annotations[active_id]["spatial_type"];
        let spatial_payload = annotations[active_id]["spatial_payload"];
        let active_spatial_payload = spatial_payload;

        // if a polygon, n_iters is the length the spatial payload
        // else n_iters is 1
        let n_iters = spatial_type === "polygon" ? spatial_payload.length : 1;

        for (let i = 0; i < n_iters; i++) {
            // for polygons, we need to move the points in each part of the spatial payload
            if (spatial_type === "polygon") {
                active_spatial_payload = spatial_payload[i];
            }
        
            // TODO(3d)
            for (var spi = 0; spi < active_spatial_payload.length; spi++) {
                active_spatial_payload[spi][0] += diffX;
                active_spatial_payload[spi][1] += diffY;
                if (active_spatial_payload[spi].length > 2) {
                    active_spatial_payload[spi][2] += diffZ;
                }
            }
        }

        annotations[active_id]["containing_box"]["tlx"] += diffX;
        annotations[active_id]["containing_box"]["brx"] += diffX;
        annotations[active_id]["containing_box"]["tly"] += diffY;
        annotations[active_id]["containing_box"]["bry"] += diffY;

        this.redraw_annotation(active_id);
        this.hide_edit_suggestion();
        this.hide_global_edit_suggestion();
        this.reposition_dialogs();
        this.suggest_edits(this.state["last_move"]);

        let annotation_mode = annotations[active_id]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        this.record_action({
            act_type: "move_annotation",
            frame: frame,
            undo_payload: {
                actid: current_subtask["state"]["active_id"],
                move_candidate: redo_payload.move_candidate,
                diffX: -diffX,
                diffY: -diffY,
                diffZ: -diffZ,
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            },
            redo_payload: {
                actid: current_subtask["state"]["active_id"],
                move_candidate: redo_payload.move_candidate,
                diffX: diffX,
                diffY: diffY,
                diffZ: diffZ,
                finished: true,
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            }
        }, true);
        this.update_frame(diffZ);
    }

    /**
     * Get initial edit candidates with bounding box collisions
     * @param {*} gblx Global x coordinate 
     * @param {*} gbly Global y coordinate
     * @param {*} dst_thresh Threshold to adjust boxes by 
     * @returns 
     */
    get_edit_candidates(gblx, gbly, dst_thresh) {
        dst_thresh /= this.get_empirical_scale();
        let ret = {
            "candidate_ids": [],
            "best": null
        };
        let minsize = Infinity;
        // TODO(3d)
        for (var edi = 0; edi < this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].length; edi++) {
            let id = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"][edi];
            if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["deprecated"]) continue;
            let cbox = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["containing_box"];
            let frame = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["frame"];
            if (cbox) {
                cbox["tlz"] = this.state["current_frame"];
                cbox["brz"] = this.state["current_frame"];
                if (frame != null) {
                    cbox["tlz"] = frame;
                    cbox["brz"] = frame;
                }
                else {
                    if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["spatial_type"] === "bbox3") {
                        let pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["spatial_payload"];
                        cbox["tlz"] = Math.min(pts[0][2], pts[1][2]);
                        cbox["brz"] = Math.max(pts[0][2], pts[1][2]);
                    }
                }
            }
            // TODO(new3d) bbox3 will have different rules here 
            if (
                cbox &&
                (gblx >= cbox["tlx"] - dst_thresh) &&
                (gblx <= cbox["brx"] + dst_thresh) &&
                (gbly >= cbox["tly"] - dst_thresh) &&
                (gbly <= cbox["bry"] + dst_thresh) &&
                (this.state["current_frame"] >= cbox["tlz"]) &&
                (this.state["current_frame"] <= cbox["brz"])
            ) {
                ret["candidate_ids"].push(id);
                let boxsize = (cbox["brx"] - cbox["tlx"]) * (cbox["bry"] - cbox["tly"]);
                if (boxsize < minsize) {
                    minsize = boxsize;
                    ret["best"] = {
                        "annid": id
                    };
                }
            }
        }
        return ret;
    }

    /** 
     * Suggest edit candidates based on mouse position
     * Workflow is as follows:
     * Find annotations where cursor is within bounding box
     * Find closest keypoints (ends of polygons/polylines etc) within a range defined by the edit handle
     * If no endpoints, search along segments with infinite range 
     */
    suggest_edits(mouse_event = null, nonspatial_id = null) {
        // don't show edits when potentially trying to draw a hole
        if (this.subtasks[this.state["current_subtask"]]["state"]["starting_complex_polygon"] || this.subtasks[this.state["current_subtask"]]["state"]["is_in_brush_mode"]) {
            this.hide_global_edit_suggestion();
            this.hide_edit_suggestion();
        } else {
            let best_candidate;

            if (nonspatial_id === null) {
                if (mouse_event === null) {
                    mouse_event = this.state["last_move"];
                }

                const dst_thresh = this.config["edit_handle_size"] / 2;
                const global_x = this.get_global_mouse_x(mouse_event);
                const global_y = this.get_global_mouse_y(mouse_event);

                if ($(mouse_event.target).hasClass("gedit-target")) return;

                const edit_candidates = this.get_edit_candidates(
                    global_x,
                    global_y,
                    dst_thresh
                );

                if (edit_candidates["best"] === null) {
                    this.hide_global_edit_suggestion();
                    this.hide_edit_suggestion();
                    this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"] = null;
                    this.subtasks[this.state["current_subtask"]]["active_annotation"] = null;
                    return;
                }

                // Look for an existing point that's close enough to suggest editing it
                const nearest_active_keypoint = this.get_nearest_active_keypoint(global_x, global_y, dst_thresh, edit_candidates["candidate_ids"]);
                if (nearest_active_keypoint != null && nearest_active_keypoint.point != null) {
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"] = nearest_active_keypoint;
                    this.show_edit_suggestion(nearest_active_keypoint, true);
                    edit_candidates["best"] = nearest_active_keypoint;
                }
                else { // If none are found, look for a point along a segment that's close enough
                    const nearest_segment_point = this.get_nearest_segment_point(global_x, global_y, Infinity, edit_candidates["candidate_ids"]);
                    if (nearest_segment_point != null && nearest_segment_point.point != null) {
                        this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"] = nearest_segment_point;
                        this.show_edit_suggestion(nearest_segment_point, false);
                        edit_candidates["best"] = nearest_segment_point;
                    }
                    else {
                        this.hide_edit_suggestion();
                    }
                }

                // Show global edit dialogs for "best" candidate
                this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"] = edit_candidates["best"];
                best_candidate = edit_candidates["best"]["annid"];
            }
            else {
                this.hide_global_edit_suggestion();
                this.hide_edit_suggestion();
                best_candidate = nonspatial_id;
            }
            this.show_global_edit_suggestion(best_candidate, null, nonspatial_id);
            this.subtasks[this.state["current_subtask"]]["active_annotation"] = best_candidate
        }
    }


    // ================= Error handlers =================

    // Notify the user of information at a given level
    raise_error(message, level = ULabel.elvl_standard) {
        switch (level) {
            // TODO less crude here
            case ULabel.elvl_info:
                console.log("[info] " + message);
                break;
            case ULabel.elvl_standard:
                alert("[error] " + message);
                break;
            case ULabel.elvl_fatal:
                alert("[fatal] " + message);
                throw new Error(message);
        }
    }

    // ================= Mouse event interpreters =================

    // Get the mouse position on the screen
    get_global_mouse_x(mouse_event) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (mouse_event.pageX - annbox.offset().left + annbox.scrollLeft()) / scale;
        // return Math.round(raw);
        return raw;
    }
    get_global_mouse_y(mouse_event) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (mouse_event.pageY - annbox.offset().top + annbox.scrollTop()) / scale;
        // return Math.round(raw);
        return raw;
    }
    get_global_element_center_x(jqel) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (jqel.offset().left + jqel.width() / 2 - annbox.offset().left + annbox.scrollLeft()) / scale;
        // return Math.round(raw);
        return raw;
    }
    get_global_element_center_y(jqel) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (jqel.offset().top + jqel.height() / 2 - annbox.offset().top + annbox.scrollTop()) / scale;
        // return Math.round();
        return raw;
    }

    // ================= Dialog Interaction Handlers =================

    // ----------------- ID Dialog -----------------

    lookup_id_dialog_mouse_pos(mouse_event, front) {
        let idd = $("#" + this.subtasks[this.state["current_subtask"]]["state"]["idd_id"]);
        if (front) {
            idd = $("#" + this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"]);
        }

        // Get mouse position relative to center of div
        const idd_x = mouse_event.pageX - idd.offset().left - idd.width() / 2;
        const idd_y = mouse_event.pageY - idd.offset().top - idd.height() / 2;

        // Useful for interpreting mouse loc
        const inner_rad = this.config["inner_prop"] * this.config["outer_diameter"] / 2;
        const outer_rad = 0.5 * this.config["outer_diameter"];

        // Get radius
        const mouse_rad = Math.sqrt(Math.pow(idd_x, 2) + Math.pow(idd_y, 2));

        // If not inside, return
        if (mouse_rad > outer_rad) {
            return null;
        }

        // If in the core, return
        if (mouse_rad < inner_rad) {
            return null;
        }

        // Get array of classes by name in the dialog
        //    TODO handle nesting case
        //    TODO this is not efficient
        let class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];

        // Get the index of that class currently hovering over
        const class_ind = (
            -1 * Math.floor(
                Math.atan2(idd_y, idd_x) / (2 * Math.PI) * class_ids.length
            ) + class_ids.length
        ) % class_ids.length;

        // Get the distance proportion of the hover
        let dist_prop = (mouse_rad - inner_rad) / (outer_rad - inner_rad);

        return {
            class_ind: class_ind,
            dist_prop: dist_prop,
        }
    }

    set_id_dialog_payload_nopin(class_ind, dist_prop) {
        let class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
        // Recompute and render opaque pie slices
        for (var i = 0; i < class_ids.length; i++) {
            if (i === class_ind) {
                this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                    "class_id": class_ids[i],
                    "confidence": dist_prop
                };
            }
            else {
                this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                    "class_id": class_ids[i],
                    "confidence": (1 - dist_prop) / (class_ids.length - 1)
                };
            }
        }
    }

    set_id_dialog_payload_to_init(annid, pyld = null) {
        // TODO(3D)
        let crst = this.state["current_subtask"];
        if (pyld != null) {
            this.subtasks[this.state["current_subtask"]]["state"]["id_payload"] = JSON.parse(JSON.stringify(pyld));
            this.update_id_toolbox_display();
        }
        else {
            if (annid != null) {
                let anpyld = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["classification_payloads"];
                if (anpyld != null) {
                    this.subtasks[this.state["current_subtask"]]["state"]["id_payload"] = JSON.parse(JSON.stringify(anpyld));
                    return;
                }
            }
            // TODO currently assumes soft
            if (!this.config["allow_soft_id"]) {
                let dist_prop = 1.0;
                let class_ids = this.subtasks[crst]["class_ids"];
                let pfx = "div#tb-id-app--" + this.state["current_subtask"];
                let idarr = $(pfx + " a.tbid-opt.sel").attr("id").split("_");
                let class_ind = class_ids.indexOf(parseInt(idarr[idarr.length - 1]));
                // Recompute and render opaque pie slices
                for (var i = 0; i < class_ids.length; i++) {
                    if (i === class_ind) {
                        this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                            "class_id": class_ids[i],
                            "confidence": dist_prop
                        };
                    }
                    else {
                        this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                            "class_id": class_ids[i],
                            "confidence": (1 - dist_prop) / (class_ids.length - 1)
                        };
                    }
                }
            }
            else {
                // Not currently supported
            }
        }
    }

    update_id_dialog_display(front = false) {
        const inner_rad = this.config["inner_prop"] * this.config["outer_diameter"] / 2;
        const outer_rad = 0.5 * this.config["outer_diameter"];
        let class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
        for (var i = 0; i < class_ids.length; i++) {
            // Skip 
            let srt_prop = this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i]["confidence"];

            let cum_prop = i / class_ids.length;
            let srk_prop = 1 / class_ids.length;
            let gap_prop = 1.0 - srk_prop;

            let rad_frnt = inner_rad + srt_prop * (outer_rad - inner_rad) / 2;

            let wdt_frnt = srt_prop * (outer_rad - inner_rad);

            let srk_frnt = 2 * Math.PI * rad_frnt * srk_prop;
            let gap_frnt = 2 * Math.PI * rad_frnt * gap_prop;
            let off_frnt = 2 * Math.PI * rad_frnt * cum_prop;

            // TODO this is kind of a mess. If it works as is, the commented region below should be deleted
            // var circ = document.getElementById("circ_" + class_ids[i]);
            // circ.setAttribute("r", rad_frnt);
            // circ.setAttribute("stroke-dasharray", `${srk_frnt} ${gap_frnt}`);
            // circ.setAttribute("stroke-dashoffset", off_frnt);
            // circ.setAttribute("stroke-width", wdt_frnt);
            let idd_id;
            if (!front) {
                idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
            }
            else {
                idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
            }
            var circ = $(`#${idd_id}__circ_` + class_ids[i])
            // circ.attr("r", rad_frnt);
            // circ.attr("stroke-dasharray", `${srk_frnt} ${gap_frnt}`)
            // circ.attr("stroke-dashoffset", off_frnt)
            // circ.attr("stroke-width", wdt_frnt)
            // circ = $(`#${idd_id}__circ_` + class_ids[i])
            circ.attr("r", rad_frnt);
            circ.attr("stroke-dasharray", `${srk_frnt} ${gap_frnt}`)
            circ.attr("stroke-dashoffset", off_frnt)
            circ.attr("stroke-width", wdt_frnt)
        }
        this.redraw_demo();
    }
    // Toolbox Annotation ID Update
    update_id_toolbox_display() {
        if (this.config["allow_soft_id"]) {
            // Not supported yet
        } else {
            let pfx = "div#tb-id-app--" + this.state["current_subtask"];
            let class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
            for (var i = 0; i < class_ids.length; i++) {
                let cls = class_ids[i];
                if (this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i]["confidence"] > 0.5) {
                    if (!($(pfx + " #" + this.config["toolbox_id"] + " a#toolbox_sel_" + cls).hasClass("sel"))) {
                        $(pfx + " #" + this.config["toolbox_id"] + " a.tbid-opt.sel").attr("href", "#");
                        $(pfx + " #" + this.config["toolbox_id"] + " a.tbid-opt.sel").removeClass("sel");
                        $(pfx + " #" + this.config["toolbox_id"] + " a#toolbox_sel_" + cls).addClass("sel");
                        $(pfx + " #" + this.config["toolbox_id"] + " a#toolbox_sel_" + cls).removeAttr("href");
                    }
                }
            }
        }
    }

    handle_id_dialog_hover(mouse_event) {
        // Grab current subtask
        const current_subtask = this.subtasks[this.state.current_subtask]

        // Determine which dialog
        let front = current_subtask.state.idd_which === "front"

        let pos_evt = this.lookup_id_dialog_mouse_pos(mouse_event, front);
        if (pos_evt != null) {
            if (!this.config["allow_soft_id"]) {
                pos_evt.dist_prop = 1.0;
            }
            // TODO This assumes no pins
            this.set_id_dialog_payload_nopin(pos_evt.class_ind, pos_evt.dist_prop);
            this.update_id_dialog_display(front);
            this.update_id_toolbox_display()
        }
    }

    assign_annotation_id(actid = null, new_class_id = null, redo_payload = null) {
        let new_payload = null;
        let old_payload = null;
        let redoing = false;
        // TODO(3d)
        if (redo_payload === null) {
            if (actid === null) {
                actid = this.subtasks[this.state["current_subtask"]]["state"]["idd_associated_annotation"];
            }
            if (new_class_id !== null) {
                // Update the id_payload by setting the confidence of the new_class_id to 1 and the rest to 0
                for (let payload of this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]) {
                    if (payload["class_id"] === new_class_id) {
                        payload["confidence"] = 1;
                    } else {
                        payload["confidence"] = 0;
                    }
                }
            }
            old_payload = JSON.parse(JSON.stringify(
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"]
            ));
            new_payload = JSON.parse(JSON.stringify(
                this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]
            ));
        } else {
            redoing = true;
            old_payload = JSON.parse(JSON.stringify(redo_payload.old_id_payload));
            new_payload = JSON.parse(JSON.stringify(redo_payload.new_id_payload));
            actid = redo_payload.actid;
        }

        // Perform assignment
        // TODO(3d)
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] = JSON.parse(JSON.stringify(new_payload));

        // Redraw with correct color and hide id_dialog if applicable
        if (!redoing) {
            this.hide_id_dialog();
        }
        else {
            this.suggest_edits();
        }
        this.redraw_annotation(actid);

        // Explicit changes are undoable
        // First assignments are treated as though they were done all along
        // TODO(3d)
        if (this.subtasks[this.state["current_subtask"]]["state"]["first_explicit_assignment"]) {
            let n = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length;
            for (var i = 0; i < n; i++) {
                if (this.subtasks[this.state["current_subtask"]]["actions"]["stream"][n - i - 1].act_type === "begin_annotation") {
                    this.subtasks[this.state["current_subtask"]]["actions"]["stream"][n - i - 1].redo_payload.init_payload = JSON.parse(JSON.stringify(
                        new_payload
                    ));
                    break;
                }
            }
        }
        else {
            this.record_action({
                act_type: "assign_annotation_id",
                undo_payload: {
                    actid: actid,
                    old_id_payload: JSON.parse(JSON.stringify(old_payload))
                },
                redo_payload: {
                    actid: actid,
                    old_id_payload: JSON.parse(JSON.stringify(old_payload)),
                    new_id_payload: JSON.parse(JSON.stringify(new_payload))
                }
            }, redoing);
        }
    }

    assign_annotation_id__undo(undo_payload) {
        let actid = undo_payload.actid;
        let new_payload = JSON.parse(JSON.stringify(undo_payload.old_id_payload));
        // TODO(3d)
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] = JSON.parse(JSON.stringify(new_payload));
        this.redraw_annotation(actid);
        this.suggest_edits();
    }

    handle_id_dialog_click(mouse_event, new_class_id = null) {
        this.handle_id_dialog_hover(mouse_event);
        // TODO need to differentiate between first click and a reassign -- potentially with global state
        this.assign_annotation_id(null, new_class_id);
        this.subtasks[this.state["current_subtask"]]["state"]["first_explicit_assignment"] = false;
        this.suggest_edits(this.state["last_move"]);

        // TODO: Check to make sure the clicked annotation was a polyline
        // If the filter_distance_toolbox_item exists, filter annotations if in multi_class_mode
        if (this.filter_distance_overlay !== undefined) {
            // Probably not good practice to get the mode from the overlay instead of the toolboxitem but this is easier
            if (this.filter_distance_overlay.get_mode() === "multi") {
                filter_points_distance_from_line(this)
            }
        }
    }

    // ================= Viewer/Annotation Interaction Handlers  ================= 

    handle_mouse_down(mouse_event) {
        const drag_key = ULabel.get_drag_key_start(mouse_event, this);
        if (drag_key != null) {
            // Don't start new drag while id_dialog is visible
            if (this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] && !this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                return;
            }
            mouse_event.preventDefault();
            if (this.drag_state["active_key"] === null) {
                this.start_drag(drag_key, mouse_event.button, mouse_event);
            }
        }
    }

    handle_mouse_move(mouse_event) {
        const annotation_mode = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
        const idd_visible = this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"];
        const idd_thumbnail = this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"];
        const edit_candidate = this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"];
        this.state["last_move"] = mouse_event;
        // If the ID dialog is visible, let it's own handler take care of this
        // If not dragging...
        if (this.drag_state["active_key"] === null) {
            if (idd_visible && !idd_thumbnail) {
                return;
            }
            // If polygon is in progress, redirect last segment
            if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"]) {
                if (
                    (annotation_mode === "polygon") ||
                    (annotation_mode === "polyline") ||
                    (annotation_mode === "delete_polygon")
                ) {
                    this.continue_annotation(mouse_event);
                }
            } else if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_brush_mode"]) {
                // If brush mode is in progress, move the brush
                let gmx = this.get_global_mouse_x(mouse_event);
                let gmy = this.get_global_mouse_y(mouse_event);
                this.move_brush_circle(gmx, gmy);
            } else if (mouse_event.shiftKey && annotation_mode === "polygon" && idd_visible && edit_candidate != null) {
                // If shift key is held while hovering a polygon, we want to start a new complex payload

                // set annotation as active, in_progress, and starting_complex_polygon
                this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = edit_candidate["annid"];
                this.start_complex_polygon();
            } else { // Nothing in progress. Maybe show editable queues
                this.suggest_edits(mouse_event);
            }
        }
        else { // Dragging
            switch (this.drag_state["active_key"]) {
                case "pan":
                    this.drag_repan(mouse_event);
                    break;
                case "zoom":
                    this.drag_rezoom(mouse_event);
                    break;
                case "annotation":
                    if (!idd_visible || idd_thumbnail) {
                        this.continue_annotation(mouse_event);
                    }
                    break;
                case "brush":
                    // If currently brushing, continue
                    if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"]) {
                        this.continue_brush(mouse_event);
                    } else {
                        // If not, see if we should start
                        this.begin_brush(mouse_event);
                    }
                    break;
                case "edit":
                    if (!idd_visible || idd_thumbnail) {
                        this.edit_annotation(mouse_event);
                    }
                    break;
                case "move":
                    if (!idd_visible || idd_thumbnail) {
                        this.move_annotation(mouse_event);
                    }
                    break;
            }
        }
    }

    handle_mouse_up(mouse_event) {
        if (mouse_event.button === this.drag_state["release_button"]) {
            this.end_drag(mouse_event);
        }
    }

    // Start dragging to pan around image
    // Called when mousedown fires within annbox
    start_drag(drag_key, release_button, mouse_event) {
        // Convenience
        const annbox = $("#" + this.config["annbox_id"]);

        this.drag_state["active_key"] = drag_key;
        this.drag_state["release_button"] = release_button;
        this.drag_state[drag_key]["mouse_start"] = [
            mouse_event.clientX,
            mouse_event.clientY,
            this.state["current_frame"]
        ];
        this.drag_state[drag_key]["zoom_val_start"] = this.state["zoom_val"];
        this.drag_state[drag_key]["offset_start"] = [
            annbox.scrollLeft(),
            annbox.scrollTop()
        ];
        $(`textarea`).trigger("blur");
        $("div.permopen").removeClass("permopen");
        // TODO handle this drag start
        let annmd;
        switch (drag_key) {
            case "annotation":
                annmd = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
                if (!NONSPATIAL_MODES.includes(annmd) && !this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"]) {
                    this.begin_annotation(mouse_event);
                }
                break;
            case "brush":
                this.begin_brush(mouse_event);
                break;
            case "edit":
                this.begin_edit(mouse_event);
                break;
            case "move":
                this.begin_move(mouse_event);
                break;
            default:
                // No handling necessary for pan and zoom until mousemove
                break;
        }
    }

    end_drag(mouse_event) {
        // TODO handle this drag end
        const annotation_mode = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
        const active_id = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        let spatial_payload, n_points, active_spatial_payload;
        switch (this.drag_state["active_key"]) {
            case "annotation":
                if (active_id != null) {
                    spatial_payload = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][active_id]["spatial_payload"]
                    if (
                        (annotation_mode != "polygon") &&
                        (annotation_mode != "polyline") &&
                        (annotation_mode != "delete_polygon")
                    ) {
                        this.finish_annotation(mouse_event);
                    } else {
                        active_spatial_payload = spatial_payload.at(-1);
                        n_points = annotation_mode === "polygon" ? active_spatial_payload.length : spatial_payload.length;
                        if (
                            // We can finish a polygon by clicking on the ender
                            // however, we don't want this to trigger immediately after starting an annotation
                            // so we check that the polygon has more than 2 points
                            !this.subtasks[this.state["current_subtask"]]["state"]["starting_complex_polygon"] &&
                            n_points > 2 &&
                            (
                                (mouse_event.target.id === "ender_" + active_id) ||
                                (mouse_event.target.id === "ender_" + active_id + "_inner")
                            )
                        ) {
                            this.finish_annotation(mouse_event);
                        } else {
                            // If not at the ender OR if we're placing the start of a new complex polygon, continue
                            this.continue_annotation(mouse_event, true);
                        }
                    }
                }
                break;
            case "brush":
                if (active_id != null) {
                    this.finish_annotation(mouse_event);
                }
                break;
            case "right":
                if (active_id != null) {
                    if (annotation_mode === "polyline") {
                        this.finish_annotation(mouse_event);
                    }
                }
                break;
            case "edit":
                // TODO should be finish edit, right?
                this.finish_edit();
                break;
            case "move":
                this.finish_move(mouse_event);
                break;
            default:
                // No handling necessary for pan and zoom until mousemove
                break;
        }

        this.drag_state["active_key"] = null;
        this.drag_state["release_button"] = null;
    }

    // Pan to correct location given mouse dragging
    drag_repan(mouse_event) {
        // Convenience
        var annbox = $("#" + this.config["annbox_id"]);

        // Pan based on mouse position
        const aX = mouse_event.clientX;
        const aY = mouse_event.clientY;
        annbox.scrollLeft(
            this.drag_state["pan"]["offset_start"][0] + (this.drag_state["pan"]["mouse_start"][0] - aX)
        );
        annbox.scrollTop(
            this.drag_state["pan"]["offset_start"][1] + (this.drag_state["pan"]["mouse_start"][1] - aY)
        );
    }

    // Handle zooming by click-drag
    drag_rezoom(mouse_event) {
        const aY = mouse_event.clientY;
        this.state["zoom_val"] = (
            this.drag_state["zoom"]["zoom_val_start"] * Math.pow(
                1.1, -(aY - this.drag_state["zoom"]["mouse_start"][1]) / 10
            )
        );
        this.rezoom(this.drag_state["zoom"]["mouse_start"][0], this.drag_state["zoom"]["mouse_start"][1]);
    }

    // Handle zooming at a certain focus
    rezoom(foc_x = null, foc_y = null, abs = false) {
        // JQuery convenience
        var imwrap = $("#" + this.config["imwrap_id"]);
        var annbox = $("#" + this.config["annbox_id"]);

        if (foc_x === null) {
            foc_x = annbox.width() / 2;
        }
        if (foc_y === null) {
            foc_y = annbox.height() / 2;
        }

        // Get old size and position
        let old_width = imwrap.width();
        let old_height = imwrap.height();
        let old_left = annbox.scrollLeft();
        let old_top = annbox.scrollTop();
        if (abs) {
            old_width = this.config["image_width"];
            old_height = this.config["image_height"];
        }

        const viewport_width = annbox.width();
        const viewport_height = annbox.height();

        // Compute new size
        const new_width = Math.round(this.config["image_width"] * this.state["zoom_val"]);
        const new_height = Math.round(this.config["image_height"] * this.state["zoom_val"]);

        // Apply new size
        var toresize = $("." + this.config["imgsz_class"]);
        toresize.css("width", new_width + "px");
        toresize.css("height", new_height + "px");

        // Apply new size to overlay if overlay exists
        this.filter_distance_overlay?.resize_canvas(new_width, new_height)

        // Compute and apply new position
        let new_left, new_top;
        if (abs) {
            new_left = foc_x * new_width / old_width - viewport_width / 2;
            new_top = foc_y * new_height / old_height - viewport_height / 2;
        }
        else {
            new_left = (old_left + foc_x) * new_width / old_width - foc_x;
            new_top = (old_top + foc_y) * new_height / old_height - foc_y;
        }
        annbox.scrollLeft(new_left);
        annbox.scrollTop(new_top);

        // Redraw demo annotation
        this.redraw_demo();
    }

    swap_frame_image(new_src, frame = 0) {
        const ret = $(`img#${this.config["image_id_pfx"]}__${frame}`).attr("src");
        $(`img#${this.config["image_id_pfx"]}__${frame}`).attr("src", new_src);
        return ret;
    }

    // Swap annotation box background color
    swap_anno_bg_color(new_bg_color) {
        const annbox = $("#" + this.config["annbox_id"]);
        const ret = annbox.css("background-color");
        annbox.css("background-color", new_bg_color);
        return ret
    }

    reset_interaction_state(subtask = null) {
        let q = [];
        if (subtask === null) {
            for (let st in this.subtasks) {
                q.push(st);
            }
        }
        else {
            q.push(subtask);
        }
        for (let i = 0; i < q.length; i++) {
            if (this.subtasks[q[i]]["state"]["active_id"] != null) {
                // Delete polygon ender if exists
                $("#ender_" + this.subtasks[q[i]]["state"]["active_id"]).remove();
            }
            this.subtasks[q[i]]["state"]["is_in_edit"] = false;
            this.subtasks[q[i]]["state"]["is_in_move"] = false;
            this.subtasks[q[i]]["state"]["is_in_progress"] = false;
            this.subtasks[q[i]]["state"]["active_id"] = null;
            this.show
        }
        this.drag_state = {
            "active_key": null,
            "release_button": null,
            "annotation": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "edit": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "pan": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "zoom": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "move": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "right": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            }
        };
    }

    // Allow for external access and modification of annotations within a subtask
    get_annotations(subtask) {
        let ret = [];
        for (let i = 0; i < this.subtasks[subtask]["annotations"]["ordering"].length; i++) {
            let id = this.subtasks[subtask]["annotations"]["ordering"][i];
            if (id != this.subtasks[this.state["current_subtask"]]["state"]["active_id"]) {
                ret.push(this.subtasks[subtask]["annotations"]["access"][id]);
            }
        }
        return JSON.parse(JSON.stringify(ret));
    }

    set_annotations(new_annotations, subtask) {
        // Undo/redo won't work through a get/set
        this.reset_interaction_state();
        this.subtasks[subtask]["actions"]["stream"] = [];
        this.subtasks[subtask]["actions"]["undo_stack"] = [];

        // Remove canvases for spatial annotations
        for (let i = 0; i < this.subtasks[subtask]["annotations"]["ordering"].length; i++) {
            // If a spatial annotation, delete the canvas
            let id = this.subtasks[subtask]["annotations"]["ordering"][i];
            if (!NONSPATIAL_MODES.includes(this.subtasks[subtask]["annotations"]["access"][id]["spatial_type"])) {
                this.destroy_annotation_context(id);
            }
        }
        let newanns = JSON.parse(JSON.stringify(new_annotations));
        // Set new annotations and initialize canvases
        ULabel.process_resume_from(this, subtask, {"resume_from": newanns});
        ULabel.initialize_annotation_canvases(this, subtask);
        // Redraw all annotations to render them
        this.redraw_all_annotations(subtask);
    }

    // Change frame
    update_frame(delta = null, new_frame = null) {
        if (this.config["image_data"]["frames"].length === 1) {
            return;
        }
        let actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"]
        if (actid != null) {
            if (!MODES_3D.includes(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"])) {
                return;
            }
        }
        if (new_frame === null) {
            new_frame = parseInt($(`div#${this.config["toolbox_id"]} input.frame_input`).val());
            if (delta != null) {
                new_frame = Math.min(Math.max(new_frame + delta, 0), this.config["image_data"].frames.length - 1);
            }
        }
        else {
            new_frame = Math.min(Math.max(new_frame, 0), this.config["image_data"].frames.length - 1);
        }
        // Change the val above
        $(`div#${this.config["toolbox_id"]} input.frame_input`).val(new_frame);
        let old_frame = this.state["current_frame"];
        this.state["current_frame"] = new_frame;
        // $(`img#${this.config["image_id_pfx"]}__${old_frame}`).css("z-index", "initial");
        $(`img#${this.config["image_id_pfx"]}__${old_frame}`).css("display", "none");
        // $(`img#${this.config["image_id_pfx"]}__${new_frame}`).css("z-index", 50);
        $(`img#${this.config["image_id_pfx"]}__${new_frame}`).css("display", "block");
        if (
            actid &&
            MODES_3D.includes(
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]
            )
        ) {
            if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"]) {
                this.edit_annotation(this.state["last_move"]);
            }
            else if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"]) {
                this.move_annotation(this.state["last_move"]);
            }
            else if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"]) {
                this.continue_annotation(this.state["last_move"]);
            }
            else {
                this.redraw_all_annotations();
            }
        }
        else {
            this.redraw_all_annotations();
        }
        if (this.state["last_move"] != null) {
            this.suggest_edits(this.state["last_move"]);
        }
    }

    // Generic Callback Support
    on(fn, callback) {
        var old_fn = fn.bind(this);
        this[fn.name] = (...args) => {
            old_fn(...args);
            callback();
        }
    }
}

window.ULabel = ULabel;
export default ULabel;
