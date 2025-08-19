/*
Uncertain Labeling Tool
Sentera Inc.
*/
import {
    ULabelAnnotation,
    DELETE_CLASS_ID,
    DELETE_MODES,
    NONSPATIAL_MODES,
    MODES_3D,
} from "../build/annotation";
import { ULabelSubtask } from "../build/subtask";
import { GeometricUtils } from "../build/geometric_utils";
import {
    AllowedToolboxItem,
    Configuration,
} from "../build/configuration";
import { get_gradient } from "../build/drawing_utilities";
import {
    assign_closest_line_to_each_point,
    filter_points_distance_from_line,
    get_annotation_class_id,
    get_annotation_confidence,
    get_point_and_line_annotations,
    mark_deprecated,
    update_distance_from_line_to_each_point,
} from "../build/annotation_operators";

import { remove_ulabel_listeners } from "../build/listeners";
import { log_message, LogLevel } from "../build/error_logging";
import { initialize_annotation_canvases } from "../build/canvas_utils";
import { record_action, record_finish, record_finish_edit, record_finish_move, undo, redo } from "../build/actions";

import $ from "jquery";
const jQuery = $;

// Electron workaround: https://github.com/electron/electron/issues/254
// eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
window.$ = window.jQuery = require("jquery");

import { v4 as uuidv4 } from "uuid";

import {
    COLORS,
    WHOLE_IMAGE_SVG,
    GLOBAL_SVG,
    FRONT_Z_INDEX,
    BACK_Z_INDEX,
} from "./blobs";
import { ULABEL_VERSION } from "./version";
import { BrushToolboxItem } from "../build/toolbox";
import { ulabel_init } from "../build/initializer";

jQuery.fn.outer_html = function () {
    return jQuery("<div />").append(this.eq(0).clone()).html();
};

export class ULabel {
    static version() {
        return ULABEL_VERSION;
    }

    // ================= Static Utilities =================

    // Returns current epoch time in milliseconds
    static get_time() {
        return (new Date()).toISOString();
    }

    static get_allowed_toolbox_item_enum() {
        return AllowedToolboxItem;
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
        if (ul.get_current_subtask()["state"]["active_id"] != null) {
            if (mouse_event.button === 1) {
                return "pan";
            } else if (mouse_event.button === 2) {
                return "right";
            }
            return "annotation";
        }
        switch (mouse_event.button) {
            case 0:
                if (mouse_event.target.id === "brush_circle") {
                    return "brush";
                } else if (mouse_event.target.id === ul.get_current_subtask()["canvas_fid"]) {
                    if (mouse_event.ctrlKey || mouse_event.metaKey) {
                        return "pan";
                    }
                    if (mouse_event.shiftKey) {
                        return "zoom";
                    }
                    return "annotation";
                } else if ($(mouse_event.target).hasClass("editable")) {
                    return "edit";
                } else if ($(mouse_event.target).hasClass("movable")) {
                    mouse_event.preventDefault();
                    return "move";
                } else {
                    return null;
                }
            case 1:
                return "pan";
            case 2:
                return null;
        }
    }

    /**
     * Removes persistent event listeners from the document and window.
     * Listeners attached directly to html elements are not explicitly removed.
     * Note that ULabel will not function properly after this method is called.
     */
    remove_listeners() {
        remove_ulabel_listeners(this);
    }

    static process_allowed_modes(ul, subtask_key, subtask) {
        // TODO(v1) check to make sure these are known modes
        ul.subtasks[subtask_key]["allowed_modes"] = subtask["allowed_modes"];
    }

    static create_unused_class_id(ulabel) {
        // More likely to be valid than always starting at 0, but use 0 if valid_class_ids is undefined
        let current_id = ulabel.valid_class_ids ? ulabel.valid_class_ids.length : 0;

        // Loop until a valid id is found
        while (true) {
            // If the current id is not currently being used, then return it
            if (!ulabel.valid_class_ids.includes(current_id)) return current_id;

            // If the id was being used, then increment the id and try again
            current_id++;
        }
    }

    static process_classes(ulabel, subtask_key, raw_subtask_json) {
        // Check to make sure allowed classes were provided
        if (!("classes" in raw_subtask_json)) {
            throw new Error(`classes not specified for subtask "${subtask_key}"`);
        }
        if (typeof raw_subtask_json.classes != "object" || raw_subtask_json.classes.length === undefined || raw_subtask_json.classes.length === 0) {
            throw new Error(`classes has an invalid value for subtask "${subtask_key}"`);
        }

        // Create a constant to hold the actual ULabelSubtask
        // The raw subtask is used for reading values that are constant inside this method, the actual subtask is for writing values
        const subtask = ulabel.subtasks[subtask_key];

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
            let modifed_class_definition = {};
            let name, id, color, keybind;
            switch (typeof class_definition) {
                case "string":
                    modifed_class_definition = {
                        name: class_definition, // When class_definition is a string, that string is the class name
                        id: ULabel.create_unused_class_id(ulabel), // Create an id that's unused by another class
                        color: COLORS[ulabel.valid_class_ids.length], // Arbitrary yet unique color
                    };
                    break;
                case "object":
                    // If no name is provided, give a generic name based on the total number of currently initialized classes
                    name = class_definition.name ?? `Class ${ulabel.valid_class_ids.length}`;

                    // Skip classes with the reserved DELETE_CLASS_ID
                    if (class_definition.id === DELETE_CLASS_ID) {
                        console.warn(`Class id ${DELETE_CLASS_ID} is reserved for delete mode and cannot be used for class definitions`);
                        continue;
                    }

                    // Only create an id if one wasn't provided
                    id = class_definition.id ?? ULabel.create_unused_class_id(ulabel);

                    if (ulabel.valid_class_ids.includes(id)) {
                        console.warn(`Duplicate class id ${id} detected. This is not supported and may result in unintended side-effects.
                        This may be caused by mixing string and object class definitions, or by assigning the same id to two or more object class definitions.`);
                    }

                    // Use generic color only if color not provided
                    color = class_definition.color ?? COLORS[ulabel.valid_class_ids.length];

                    // Save the keybind if it exists, otherwise default to null
                    keybind = class_definition.keybind ?? null;

                    modifed_class_definition = {
                        name: name,
                        id: id,
                        color: color,
                        keybind: keybind,
                    };
                    break;
                default:
                    console.log(raw_subtask_json.classes);
                    throw new Error(`Entry in classes not understood: ${class_definition}\n${class_definition} must either be a string or an object.`);
            }

            // Save the class definitions and ids on the subtask
            subtask.class_defs.push(modifed_class_definition);
            subtask.class_ids.push(modifed_class_definition.id);

            // Also save the id and color_info on the ULabel object
            ulabel.valid_class_ids.push(modifed_class_definition.id);
            ulabel.color_info[modifed_class_definition.id] = modifed_class_definition.color;
        }

        // If the subtask has any DELETE_MODE enabled, add a class definition for it
        if (subtask.allowed_modes.some((mode) => DELETE_MODES.includes(mode))) {
            subtask.class_defs.push({
                name: "Delete",
                id: DELETE_CLASS_ID,
                // Default to crimson
                color: COLORS[1],
                keybind: null,
            });
            ulabel.valid_class_ids.push(DELETE_CLASS_ID);
            ulabel.color_info[DELETE_CLASS_ID] = COLORS[1];
        }
    }

    static process_resume_from(ul, subtask_key, subtask) {
        // Initialize to no annotations
        ul.subtasks[subtask_key]["annotations"] = {
            ordering: [],
            access: {},
        };
        if (subtask["resume_from"] != null) {
            for (var i = 0; i < subtask["resume_from"].length; i++) {
                // Get copy of annotation to import for modification before incorporation
                let cand = ULabelAnnotation.from_json(JSON.parse(JSON.stringify(subtask["resume_from"][i])));
                if (cand === null) {
                    continue;
                }

                // Ensure the id is unique
                if (
                    (cand.id === undefined) || (cand.id in ul.subtasks[subtask_key]["annotations"]["access"])
                ) {
                    cand.id = ul.make_new_annotation_id();
                }

                // Set to default line size if there is none, check for null and undefined using ==
                if (
                    (cand.line_size === undefined) || (cand.line_size == null)
                ) {
                    cand.line_size = ul.get_initial_line_size();
                }

                // Add created by attribute if there is none
                if (
                    (cand.created_by === undefined)
                ) {
                    cand.created_by = "unknown";
                }

                // Add created at attribute if there is none
                if (
                    (cand.created_at === undefined)
                ) {
                    cand.created_at = ULabel.get_time();
                }

                // Add last edited by attribute if there is none
                if (
                    (cand.last_edited_by === undefined)
                ) {
                    cand.last_edited_by = cand.created_by;
                }

                // Add last edited at attribute if there is none
                if (
                    (cand.last_edited_at === undefined)
                ) {
                    cand.last_edited_at = cand.created_at;
                }

                // Add deprecated at attribute if there is none
                if (
                    (cand.deprecated === undefined)
                ) {
                    mark_deprecated(cand, false);
                }

                // Throw error if no spatial type is found
                if (
                    (cand.spatial_type === undefined)
                ) {
                    alert(`Error: Attempted to import annotation without a spatial type (id: ${cand.id})`);
                    throw `Error: Attempted to import annotation without a spatial type (id: ${cand.id})`;
                }

                // Throw error if no spatial type is found
                if (
                    !("spatial_payload" in cand)
                ) {
                    alert(`Error: Attempted to import annotation without a spatial payload (id: ${cand.id})`);
                    throw `Error: Attempted to import annotation without a spatial payload (id: ${cand.id})`;
                } else if (
                    cand.spatial_type === "polygon" && cand.spatial_payload.length < 1
                ) {
                    console.warn(`[WARNING]: Skipping attempted import of polygon annotation without any points (id: ${cand.id})`);
                    continue;
                }

                // Set frame to zero if not provided
                if (
                    (cand.frame === undefined)
                ) {
                    cand.frame = 0;
                }

                // Set annotation_meta if not provided
                if (
                    (cand.annotation_meta === undefined)
                ) {
                    cand.annotation_meta = {};
                }

                // Ensure that classification payloads are compatible with config
                cand.ensure_compatible_classification_payloads(ul.subtasks[subtask_key].class_ids);

                cand.classification_payloads.sort(
                    (a, b) => {
                        return (
                            ul.subtasks[subtask_key].class_ids.find((e) => e === a.class_id) -
                            ul.subtasks[subtask_key].class_ids.find((e) => e === b.class_id)
                        );
                    },
                );

                // Push to ordering and add to access
                ul.subtasks[subtask_key]["annotations"]["ordering"].push(cand.id);
                ul.subtasks[subtask_key]["annotations"]["access"][subtask["resume_from"][i]["id"]] = cand;

                if (cand.spatial_type === "polygon") {
                    // If missing any of `spatial_payload_holes` or `spatial_payload_child_indices`,
                    // or if they don't match the length of `spatial_payload`, then rebuild them
                    if (
                        (cand.spatial_payload_holes === undefined) ||
                        (cand.spatial_payload_child_indices === undefined) ||
                        cand.spatial_payload_holes.length !== cand.spatial_payload.length ||
                        cand.spatial_payload_child_indices.length !== cand.spatial_payload.length
                    ) {
                        ul.state.current_subtask = subtask_key;
                        // For polygons, verify all layers
                        ul.verify_all_polygon_complex_layers(cand.id);
                    }
                }

                // Update the containing box for all spatial types
                if (!NONSPATIAL_MODES.includes(cand.spatial_type)) {
                    ul.rebuild_containing_box(cand.id, false, subtask_key);
                }

                console.log(cand);
            }
        }
    }

    static initialize_subtasks(ul) {
        let first_non_ro = null;

        // Initialize a place on the ulabel object to hold annotation color information
        ul.color_info = {};

        // Initialize a place on the ulabel object to hold all classification ids
        ul.valid_class_ids = [];

        // Perform initialization tasks on each subtask individually
        for (const subtask_key in ul.config.subtasks) {
            // For convenience, make a raw subtask var
            let raw_subtask = ul.config.subtasks[subtask_key];
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
                idd_id: "id_dialog__" + subtask_key,
                idd_id_front: "id_dialog_front__" + subtask_key,
                idd_visible: false,
                idd_associated_annotation: null,
                idd_thumbnail: false,
                id_payload: id_payload,
                delete_mode_id_payload: [{ class_id: -1, confidence: 1 }],
                first_explicit_assignment: false,

                // Annotation state
                annotation_mode: ul.subtasks[subtask_key]["allowed_modes"][0],
                active_id: null,
                is_in_progress: false,
                is_in_edit: false,
                is_in_move: false,
                starting_complex_polygon: false,
                is_in_brush_mode: false,
                is_in_erase_mode: false,
                edit_candidate: null,
                move_candidate: null,

                // Rendering context
                front_context: null,
                back_context: null,
                annotation_contexts: {}, // {canvas_id: {context: ctx, annotation_ids: []}, ...}

                // Generic dialogs
                visible_dialogs: {},
            };
        }
        if (first_non_ro === null) {
            log_message(
                "You must have at least one subtask without 'read_only' set to true.",
                LogLevel.ERROR,
            );
        }
    }

    static expand_image_data(ul, raw_img_dat) {
        if (typeof raw_img_dat === "string") {
            return {
                spacing: {
                    x: 1,
                    y: 1,
                    z: 1,
                    units: "pixels",
                },
                frames: [
                    raw_img_dat,
                ],
            };
        } else if (Array.isArray(raw_img_dat)) {
            return {
                spacing: {
                    x: 1,
                    y: 1,
                    z: 1,
                    units: "pixels",
                },
                frames: raw_img_dat,
            };
        } else if ("spacing" in raw_img_dat && "frames" in raw_img_dat) {
            return raw_img_dat;
        } else {
            log_message(
                `Image data object not understood. Must be of form "http://url.to/img" OR ["img1", "img2", ...] OR {spacing: {x: <num>, y: <num>, z: <num>, units: <str>}, frames: ["img1", "img2", ...]}. Provided: ${JSON.stringify(raw_img_dat)}`,
                LogLevel.ERROR,
            );
            return null;
        }
    }

    static handle_deprecated_arguments() {
        // Warn users that this method is deprecated
        console.warn(`
            Passing in each argument as a seperate parameter to ULabel is now deprecated \n
            Please pass in an object with keyword arguments instead
        `);

        return {
            // Required
            container_id: arguments[0],
            image_data: arguments[1],
            username: arguments[2],
            submit_buttons: arguments[3],
            subtasks: arguments[4],
            // Use default if optional argument is undefined
            task_meta: arguments[5] ?? null,
            annotation_meta: arguments[6] ?? null,
            px_per_px: arguments[7] ?? 1,
            initial_crop: arguments[8] ?? null,
            initial_line_size: arguments[9] ?? 4,
            config_data: arguments[10] ?? null,
            toolbox_order: arguments[11] ?? null,
        };
    }

    // ================= Construction/Initialization =================

    constructor(kwargs) {
        this.begining_time = Date.now();

        // Ensure arguments were recieved
        if (arguments.length === 0) {
            console.error("ULabel was given no arguments");
        } else if (arguments.length > 1) {
            // The old constructor took in up to 11 arguments,
            // so if more than 1 argument is present convert them to the new format
            kwargs = ULabel.handle_deprecated_arguments(...arguments);
        }

        // Declare a list of required properties to error check against
        const required_properties = [
            "container_id",
            "image_data",
            "username",
            "submit_buttons",
            "subtasks",
        ];

        // Ensure kwargs has all required properties
        for (const property of required_properties) {
            if (kwargs[property] == undefined) { // == also checks for null
                console.error(`ULabel did not receive required property ${property}`);
            }
        }

        // Process image_data
        kwargs["image_data"] = ULabel.expand_image_data(this, kwargs["image_data"]);

        // Process deprecated config_data field by adding each key-value pair to kwargs
        if ("config_data" in kwargs) {
            console.warn("The 'config_data' argument is deprecated. Please pass in all configuration values as keyword arguments.");
            for (const key in kwargs["config_data"]) {
                kwargs[key] = kwargs["config_data"][key];
            }
        }

        // Create the config and add ulabel dependent data
        this.config = new Configuration(kwargs);

        // Useful for the efficient redraw of nonspatial annotations
        this.tmp_nonspatial_element_ids = {};

        // Create object for current ulabel state
        this.state = {
            // Viewer state
            // Add and handle a value for current image
            zoom_val: 1.0,
            last_move: null,
            current_frame: 0,

            // Global annotation state (subtasks also maintain an annotation state)
            current_subtask: null, // The key of the current subtask
            last_brush_stroke: null,
            line_size: this.config.initial_line_size,
            anno_scaling_mode: this.config.anno_scaling_mode,

            // Renderings state
            demo_canvas_context: null,
            edited: false,
        };

        // Create a place on ulabel to store resize observer objects
        this.resize_observers = [];

        // Populate these in an external "static" function
        this.subtasks = {};
        this.color_info = {};
        ULabel.initialize_subtasks(this);

        // Create object for dragging interaction state
        // TODO(v1)
        // There can only be one drag, yes? Maybe pare this down...
        // Would be nice to consolidate this with global state also
        this.drag_state = {
            active_key: null,
            release_button: null,
            annotation: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            brush: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            edit: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            pan: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            zoom: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            move: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            right: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
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
        // Track global state
        this.is_shaking = false;
    }

    init(callback) {
        ulabel_init(this, callback);
    }

    /**
     * Code to be called after ULabel has finished initializing.
     */
    after_init() {
        // Perform the after_init method for each toolbox item
        for (const toolbox_item of this.toolbox.items) {
            toolbox_item.after_init();
        }
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
            "FilterDistance",
        ];

        for (const toolbox_item of this.toolbox.items) {
            // Store current toolbox name in a constant for convenience
            const toolbox_name = toolbox_item.get_toolbox_item_type();

            // If the current toolboxitem is not included in possible_overlays then continue
            if (!possible_overlays.includes(toolbox_name)) continue;

            switch (toolbox_name) {
                case "FilterDistance":
                    // Give ulabel a referance to the filter overlay for confinience
                    this.filter_distance_overlay = toolbox_item.get_overlay();

                    // Image width and height is undefined when the overlay is created, so update it here
                    this.filter_distance_overlay.set_canvas_size(
                        this.config.image_width * this.config.px_per_px,
                        this.config.image_height * this.config.px_per_px,
                    );

                    $("#" + this.config["imwrap_id"]).prepend(this.filter_distance_overlay.get_canvas());

                    // Filter the points with an override
                    filter_points_distance_from_line(this, true, null, {
                        should_redraw: this.config.distance_filter_toolbox_item.filter_on_load,
                        multi_class_mode: this.config.distance_filter_toolbox_item.multi_class_mode,
                        show_overlay: this.filter_distance_overlay.get_display_overlay(),
                        distances: this.config.distance_filter_toolbox_item.default_values,
                    });
                    break;
                default:
                    console.warn(`Toolbox item ${toolbox_name} is associated with an overlay, yet no overlay logic exists.`);
            }
        }
    }

    handle_toolbox_overflow() {
        try {
            let tabs_height = $("#" + this.config["container_id"] + " div.toolbox-tabs").height();
            $("#" + this.config["container_id"] + " div.toolbox_inner_cls").css("height", `calc(100% - ${tabs_height + 38}px)`);
            let view_height = $("#" + this.config["container_id"] + " div.toolbox_cls")[0].scrollHeight - 38 - tabs_height;
            let want_height = $("#" + this.config["container_id"] + " div.toolbox_inner_cls")[0].scrollHeight;
            if (want_height <= view_height) {
                $("#" + this.config["container_id"] + " div.toolbox_inner_cls").css("overflow-y", "hidden");
            } else {
                $("#" + this.config["container_id"] + " div.toolbox_inner_cls").css("overflow-y", "scroll");
            }
        } catch (e) {
            console.warn("Failed to resize toolbox", e);
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
                this.filter_distance_overlay?.draw_overlay();

                return;
            } else {
                log_message(
                    `Initial crop must contain properties "width", "height", "left", and "top". Ignoring.`,
                    LogLevel.INFO,
                );
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

        this.filter_distance_overlay?.draw_overlay();
    }

    // ================== Cursor Helpers ====================
    /**
     * Deprecated when dynamic line size toolbox item was removed.
     * TODO: Un-deprecated the dynamic line size toolbox item.
     */
    update_cursor() {
        // let color = this.get_non_spatial_annotation_color(null);
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

    /**
     * Get the current subtask key
     * @returns {string} The current subtask key
     */
    get_current_subtask_key() {
        return this.state["current_subtask"];
    }

    /**
     * Get the current subtask
     * @returns {ULabelSubtask} The current subtask
     */
    get_current_subtask() {
        return this.subtasks[this.get_current_subtask_key()];
    }

    readjust_subtask_opacities() {
        for (const st_key in this.subtasks) {
            let sliderval = $("#tb-st-range--" + st_key).val();
            $("div#canvasses__" + st_key).css("opacity", sliderval / 100);
        }
    }

    set_subtask(st_key) {
        let old_st = this.get_current_subtask_key();

        // Change object state
        this.state["current_subtask"] = st_key;

        // Bring new set of canvasses out to front
        $("div.canvasses").css("z-index", BACK_Z_INDEX);
        $("div#canvasses__" + st_key).css("z-index", FRONT_Z_INDEX);

        // Show appropriate set of dialogs
        $("div.dialogs_container").css("display", "none");
        $("div#dialogs__" + st_key).css("display", "block");

        // Show appropriate set of annotation modes
        $("a.md-btn").css("display", "none");
        $("a.md-btn.md-en4--" + st_key).css("display", "inline-block");

        // Show appropriate set of class options
        $("div.tb-id-app").css("display", "none");
        $("div#tb-id-app--" + st_key).css("display", "block");

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

        // Update class counter
        this.toolbox.redraw_update_items(this);

        // Set transparancy for inactive layers
        this.readjust_subtask_opacities();

        // Redraw demo
        this.redraw_demo();
    }

    /**
     * Switch to the next subtask in the toolbox
     */
    switch_to_next_subtask() {
        let current_subtask = this.get_current_subtask_key();
        let new_subtask_index = this.toolbox.tabs.findIndex((tab) => tab.subtask_key === current_subtask) + 1;
        // If the current subtask was the last one in the array, then
        // loop around to the first subtask
        if (new_subtask_index === this.toolbox.tabs.length) {
            new_subtask_index = 0;
        }

        this.set_subtask(this.toolbox.tabs[new_subtask_index].subtask_key);
    }

    // ================= Toolbox Functions ==================

    set_annotation_mode(annotation_mode) {
        this.get_current_subtask()["state"]["annotation_mode"] = annotation_mode;
        this.update_annotation_mode();
    }

    update_annotation_mode() {
        $("a.md-btn.sel").attr("href", "#");
        $("a.md-btn.sel").removeClass("sel");
        const ann_mode = this.get_current_subtask()["state"]["annotation_mode"];
        $("a#md-btn--" + ann_mode).addClass("sel");
        $("a#md-btn--" + ann_mode).removeAttr("href");
        this.show_annotation_mode();
    }

    update_current_class() {
        this.update_id_toolbox_display();
        // $("a.tbid-opt.sel").attr("href", "#");
        // $("a.tbid-opt.sel").removeClass("sel");
        // $("a#toolbox_sel_" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).addClass("sel");
        // $("a#toolbox_sel_" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).removeAttr("href");
    }

    /**
     * If FilterDistance toolbox item is active AND a polyline undergoes a change,
     * then filter the points based on the new polyline
     *
     * @param {string} annotation_id - The annotation id of the annotation that changed
     * @param {boolean} redraw_update_items - If true, redraw the toolbox items
     * @param {boolean} force_filter_all - If true, force the filter to occur using all polylines
     * @param {object} offset - The offset (for polyline moves)
     */
    update_filter_distance(annotation_id, redraw_update_items = true, force_filter_all = false, offset = null) {
        // First verify if the FilterDistance toolbox item is active
        if (this.config.toolbox_order.includes(AllowedToolboxItem.FilterDistance)) {
            // Add id to the offset
            if (offset !== null) {
                offset["id"] = annotation_id;
            }

            if (force_filter_all) {
                // Filter all points from all lines
                // Used when a line is deleted
                filter_points_distance_from_line(this, true, offset);
            } else if (annotation_id in this.get_current_subtask().annotations.access) {
                // Update based on changes to a single polyline or point
                let points_and_lines;
                const annotation = this.get_current_subtask().annotations.access[annotation_id];
                switch (annotation.spatial_type) {
                    case "polyline":
                        // Update each point's distance to THIS polyline
                        points_and_lines = get_point_and_line_annotations(this);
                        update_distance_from_line_to_each_point(annotation, points_and_lines[0], points_and_lines[1], offset);
                        // Filter all points from the updated line
                        filter_points_distance_from_line(this, false, offset);
                        break;
                    case "point":
                        // Update THIS point's distance to the nearest lines
                        points_and_lines = get_point_and_line_annotations(this);
                        assign_closest_line_to_each_point([annotation], points_and_lines[1], offset);
                        // Don't filter the point yet, since that may be unexpected for the user
                        break;
                    default:
                        break;
                }
            }

            // Lastly, redraw the toolbox items if necessary
            if (redraw_update_items) {
                this.toolbox.redraw_update_items(this);
            }
        }
    }

    /**
     * Wrapper for update_filter_distance that is called during a polyline move
     * First checks if `filter_during_polyline_move` is true.
     *
     * @param {string} annotation_id - The annotation id of the annotation that changed
     * @param {boolean} redraw_update_items - If true, redraw the toolbox items
     * @param {boolean} force_filter_all - If true, force the filter to occur without checking the annotation type (used if annotation no longer exists)
     * @param {object} offset - The offset (for polyline moves)
     */
    update_filter_distance_during_polyline_move(annotation_id, redraw_update_items = true, force_filter_all = false, offset = null) {
        if (
            this.config.toolbox_order.includes(AllowedToolboxItem.FilterDistance) &&
            this.toolbox.items.find((item) => item.get_toolbox_item_type() === "FilterDistance").filter_during_polyline_move
        ) {
            this.update_filter_distance(annotation_id, redraw_update_items, force_filter_all, offset);
        }
    }

    // Show annotation mode
    show_annotation_mode(el = null) {
        if (el === null) {
            el = $("a.md-btn.sel");
        }
        let new_name = el.attr("amdname");
        $("#" + this.config["toolbox_id"] + " .current_mode").html(new_name);
        const current_stk = this.get_current_subtask_key();
        const current_st = this.get_current_subtask();
        $(`div.frame_annotation_dialog:not(.fad_st__${current_stk})`).removeClass("active");
        if (["whole-image", "global"].includes(current_st["state"]["annotation_mode"])) {
            $(`div.frame_annotation_dialog.fad_st__${current_stk}`).addClass("active");
        } else {
            $("div.frame_annotation_dialog").removeClass("active");
        }
    }

    toggle_delete_class_id_in_toolbox() {
        const current_subtask = this.get_current_subtask();
        // Check if a DELETE_MODE is active
        let show_delete = DELETE_MODES.includes(current_subtask["state"]["annotation_mode"]);
        if (show_delete) {
            // Show the delete class id in the toolbox
            $("a#toolbox_sel_" + DELETE_CLASS_ID).css("display", "inline-block");
            // Select the delete class id in the toolbox by clicking it
            $("a#toolbox_sel_" + DELETE_CLASS_ID).trigger("click");
        } else {
            // Hide the delete class id in the toolbox
            $("a#toolbox_sel_" + DELETE_CLASS_ID).css("display", "none");
            // If the delete class id is selected, select the first class id in the toolbox
            if ($("a#toolbox_sel_" + DELETE_CLASS_ID).hasClass("sel")) {
                // Check if we are hovering an annotation
                let target_id = null;
                if (current_subtask.state.active_id !== null) {
                    target_id = current_subtask.state.active_id;
                } else if (current_subtask.state.move_candidate !== null) {
                    target_id = current_subtask.state.move_candidate["annid"];
                }
                // If we are not hovering an annotation, select default to the first class
                if (target_id === null) {
                    $("a.tbid-opt").first().trigger("click");
                } else {
                    // If we are hovering an annotation, select the class id of the annotation
                    // which is the class with the highest confidence
                    const classification_payloads = current_subtask.annotations.access[target_id].classification_payloads;
                    const target_class_id = classification_payloads.reduce((acc, curr) => {
                        return curr.confidence > acc.confidence ? curr : acc;
                    })["class_id"];
                    $("a#toolbox_sel_" + target_class_id).trigger("click");
                }
            }
        }

        // For all other class ids, show or hide them in the toolbox
        for (const class_id of this.get_current_subtask()["class_ids"]) {
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
        if (!this.get_current_subtask()["allowed_modes"].includes(annotation_mode)) {
            console.warn(`Annotation mode ${annotation_mode} is not allowed for subtask ${this.get_current_subtask_key()}`);
            return false;
        }
        // Set the new mode via the toolbox
        document.getElementById("md-btn--" + annotation_mode).click();
        return true;
    }

    // Draw demo annotation in demo canvas
    redraw_demo() {
        // this.state["demo_canvas_context"].clearRect(0, 0, this.config["demo_width"] * this.config["px_per_px"], this.config["demo_height"] * this.config["px_per_px"]);
        // this.draw_annotation(DEMO_ANNOTATION, null, "demo");
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
    get_init_spatial(gmx, gmy, annotation_mode, mouse_event) {
        const true_gmx = this.get_global_mouse_x(mouse_event);
        const true_gmy = this.get_global_mouse_y(mouse_event);
        switch (annotation_mode) {
            case "point":
                return [
                    [gmx, gmy],
                ];
            case "bbox":
            case "polyline":
            case "contour":
            case "tbar":
            case "delete_polygon":
            case "delete_bbox":
                return [
                    [gmx, gmy],
                    [gmx, gmy],
                ];
            case "polygon":
                // Get brush spatial payload if in brush mode
                if (this.get_current_subtask()["state"]["is_in_brush_mode"]) {
                    // Don't pass the potentially adjusted mouse coordinates
                    return this.get_brush_circle_spatial_payload(true_gmx, true_gmy);
                }
                return [[
                    [gmx, gmy],
                    [gmx, gmy],
                ]];
            case "bbox3":
                return [
                    [gmx, gmy, this.state["current_frame"]],
                    [gmx, gmy, this.state["current_frame"]],
                ];
            default:
                // TODO broader refactor of error handling and detecting/preventing corruption
                log_message(
                    "Annotation mode is not understood",
                    LogLevel.INFO,
                );
                return null;
        }
    }

    get_init_id_payload(spatial_type = null) {
        this.set_id_dialog_payload_to_init(null);
        if (DELETE_MODES.includes(spatial_type)) {
            // Use special id payload for delete modes
            return [{
                class_id: DELETE_CLASS_ID,
                confidence: 1.0,
            }];
        } else {
            return JSON.parse(JSON.stringify(this.get_current_subtask()["state"]["id_payload"]));
        }
    }

    /**
     * Find the next available annotation context and return its ID.
     * If all annotation contexts are in use, create a new canvas and return it's id.
     *
     * @param {string} subtask subtask name
     * @returns {string} The ID of an available canvas
     */
    get_next_available_canvas_id(subtask = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
        }
        const canvas_ids = Object.keys(this.subtasks[subtask]["state"]["annotation_contexts"]);
        for (let i = 0; i < canvas_ids.length; i++) {
            // If the canvas has less than n_annos_per_canvas annotations, return its ID
            if (this.subtasks[subtask]["state"]["annotation_contexts"][canvas_ids[i]]["annotation_ids"].length < this.config.n_annos_per_canvas) {
                return canvas_ids[i];
            }
        }
        // If no canvas has less than n_annos_per_canvas annotations, create a new canvas
        return this.create_annotation_canvas(subtask);
    }

    /**
     * Create a new canvas and return its ID
     *
     * @param {string} subtask name
     * @returns {string} The ID of a new canvas
     */
    create_annotation_canvas(subtask) {
        const canvas_id = `canvas__${this.make_new_annotation_id()}`;

        // Add canvas to the "canvasses__${subtask}" div
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
        this.subtasks[subtask]["state"]["annotation_contexts"][canvas_id] = {
            annotation_ids: [],
            context: document.getElementById(canvas_id).getContext("2d"),
        };

        return canvas_id;
    }

    /**
     * Get the ID of the next available canvas context and add the annotation ID to it.
     *
     * @param {string} annotation_id annotation ID
     * @param {string} subtask subtask name
     * @returns {string} The ID of the canvas context
     */
    get_init_canvas_context_id(annotation_id, subtask = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
        }
        // Get the next available canvas id
        const canvas_id = this.get_next_available_canvas_id(subtask);
        // Add the annotation id to the canvas context
        this.subtasks[subtask]["state"]["annotation_contexts"][canvas_id]["annotation_ids"].push(annotation_id);

        return canvas_id;
    }

    // Remove a canvas from the document and the state
    destroy_annotation_context(annotation_id, subtask = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
        }

        // Remove the annotation_id from the canvas context list
        const canvas_id = this.subtasks[subtask]["annotations"]["access"][annotation_id]["canvas_id"];
        const canvas_context = this.subtasks[subtask]["state"]["annotation_contexts"][canvas_id];
        const annotation_ids = canvas_context["annotation_ids"];
        const idx = annotation_ids.indexOf(annotation_id);
        if (idx > -1) {
            annotation_ids.splice(idx, 1);
        }

        if (annotation_ids.length === 0) {
            // If the canvas is empty, remove it from the document and the state
            $("#" + canvas_id).remove();
            delete this.subtasks[subtask]["state"]["annotation_contexts"][canvas_id];
        } else {
            // Otherwise, redraw the remaining annotations
            this.redraw_all_annotations_in_annotation_context(canvas_id, subtask);
        }
    }

    // Get the element id for a nonspatial annotation row
    get_nonspatial_annotation_element_id(annotation_id) {
        return `row__${annotation_id}`;
    }

    // ================= Access string utilities =================

    // Access a point in a spatial payload using access string
    // Optional arg at the end is for finding position of a moved splice point through its original access string
    get_with_access_string(annid, access_str, as_though_pre_splice = false) {
        // TODO(3d)
        let bbi, bbj, bbk, bbox_pts, ret, bas, dif, tbi, tbj, tbar_pts, active_index;
        const spatial_type = this.get_current_subtask()["annotations"]["access"][annid]["spatial_type"];
        let spatial_payload = this.get_current_subtask()["annotations"]["access"][annid]["spatial_payload"];
        let active_spatial_payload = spatial_payload;

        switch (spatial_type) {
            case "bbox":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                bbox_pts = spatial_payload;
                return [bbox_pts[bbi][0], bbox_pts[bbj][1]];
            case "point":
                return spatial_payload;
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
                } else {
                    if (as_though_pre_splice) {
                        dif = 0;
                        bas += 1;
                        return active_spatial_payload[bas];
                    } else {
                        return GeometricUtils.interpolate_poly_segment(
                            active_spatial_payload,
                            bas,
                            dif,
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
                log_message(
                    "Unable to apply access string to annotation of type " + spatial_type,
                    LogLevel.WARNING,
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
        const spatial_type = this.get_current_subtask()["annotations"]["access"][annid]["spatial_type"];
        let spatial_payload = this.get_current_subtask()["annotations"]["access"][annid]["spatial_payload"];
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
                    } else {
                        active_spatial_payload[acint] = val;
                    }
                } else {
                    if (undoing === true) {
                        active_spatial_payload.splice(bas + 1, 1);
                    } else if (undoing === false) {
                        active_spatial_payload.splice(bas + 1, 0, [val[0], val[1]]);
                    } else {
                        var newpt = GeometricUtils.interpolate_poly_segment(
                            active_spatial_payload,
                            bas,
                            dif,
                        );
                        active_spatial_payload.splice(bas + 1, 0, newpt);
                    }
                }
                break;
            default:
                log_message(
                    "Unable to apply access string to annotation of type " + spatial_type,
                    LogLevel.WARNING,
                );
        }
    }

    get_annotation_color(annotation) {
        // Use the annotation's class id to get the color of the annotation
        const class_id = get_annotation_class_id(annotation);
        const color = this.color_info[class_id];

        // Log an error and return a default color if the color is undefined
        if (color === undefined) {
            console.error(`get_annotation_color encountered error while getting annotation color with class id ${class_id}`);
            return this.config.default_annotation_color;
        }

        // Return the color after applying a gradient to it based on its confidence
        // If gradients are disabled, get_gradient will return the passed in color
        return get_gradient(annotation, color, get_annotation_confidence, $("#gradient-slider").val() / 100);
    }

    get_active_class_color() {
        const color = this.color_info[this.get_active_class_id()];
        if (color === undefined) {
            console.error(`get_active_class_color() encountered error while getting active class color.`);
            return this.config.default_annotation_color;
        }
        return color;
    }

    get_non_spatial_annotation_color(clf_payload, subtask = null) {
        if (this.config["allow_soft_id"]) {
            // not currently supported;
            return this.config["default_annotation_color"];
        }
        let crst = this.get_current_subtask_key();
        if (subtask != null) {
            crst = subtask;
        }
        let col_payload = JSON.parse(JSON.stringify(this.subtasks[crst]["state"]["id_payload"])); // BOOG
        if (clf_payload != null) {
            col_payload = clf_payload;
        }

        for (let i = 0; i < col_payload.length; i++) {
            if (col_payload[i]["confidence"] > 0) {
                return this.subtasks[crst]["class_defs"][i]["color"];
            }
        }
        return this.config["default_annotation_color"];
    }

    // ================= Drawing Functions =================

    draw_bounding_box(annotation_object, ctx, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        const line_size = this.get_scaled_line_size(annotation_object);

        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object);
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

    draw_point(annotation_object, ctx, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        const line_size = this.get_scaled_line_size(annotation_object);

        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object);
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

    draw_bbox3(annotation_object, ctx, offset = null) {
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

        const line_size = this.get_scaled_line_size(annotation_object);

        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object);
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

    draw_polygon(annotation_object, ctx, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        const line_size = this.get_scaled_line_size(annotation_object);

        // Hack to turn off fills during vanish
        let is_in_vanish_mode = line_size <= 0.01;

        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object);
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
        let layer_is_closed = false;
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
            layer_is_closed = GeometricUtils.is_polygon_closed(active_spatial_payload);
            if (!is_in_vanish_mode && spatial_type === "polygon" && layer_is_closed) {
                if (annotation_object["spatial_payload_holes"][i]) {
                    ctx.globalCompositeOperation = "destination-out";
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

        if (
            spatial_type === "polygon" &&
            !layer_is_closed &&
            this.get_current_subtask()["state"]["is_in_progress"] &&
            !this.get_current_subtask()["state"]["starting_complex_polygon"]
        ) {
            // Clear the lines that fall within the polygon ender
            // Use the first point of the last layer
            const ender_center_pt = spatial_payload.at(-1)[0];
            ctx.globalCompositeOperation = "destination-out";
            ctx.beginPath();
            ctx.arc(
                ender_center_pt[0], // x
                ender_center_pt[1], // y
                this.config["polygon_ender_size"] / 2, // radius
                0, // start angle
                2 * Math.PI, // end angle
            );
            ctx.fill();
            // Reset globals
            ctx.globalCompositeOperation = "source-over";
        }
    }

    draw_contour(annotation_object, ctx, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        const line_size = this.get_scaled_line_size(annotation_object);

        // Prep for bbox drawing
        const color = this.get_annotation_color(annotation_object);
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

    draw_tbar(annotation_object, ctx, offset = null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        const line_size = this.get_scaled_line_size(annotation_object);

        // Prep for tbar drawing
        const color = this.get_annotation_color(annotation_object);
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
            (sp[0] - ep[0]) * (sp[0] - ep[0]) + (sp[1] - ep[1]) * (sp[1] - ep[1]),
        ) / 2;
        let theta = Math.atan((ep[1] - sp[1]) / (ep[0] - sp[0]));
        let sb = [
            sp[0] + halflen * Math.sin(theta),
            sp[1] - halflen * Math.cos(theta),
        ];
        let eb = [
            sp[0] - halflen * Math.sin(theta),
            sp[1] + halflen * Math.cos(theta),
        ];

        ctx.lineCap = "square";
        ctx.beginPath();
        ctx.moveTo((sb[0] + diffX) * px_per_px, (sb[1] + diffY) * px_per_px);
        ctx.lineTo((eb[0] + diffX) * px_per_px, (eb[1] + diffY) * px_per_px);
        ctx.stroke();
        ctx.lineCap = "round";
    }

    draw_nonspatial_annotation(annotation_object, svg_obj, subtask = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
        }
        const annotation_id = annotation_object["id"];
        const element_id = this.get_nonspatial_annotation_element_id(annotation_id);
        if ($(`div#${element_id}`).length === 0) {
            $(`div#fad_st__${subtask} div.fad_annotation_rows`).append(`
            <div id="row__${annotation_id}" class="fad_row">
                <div class="fad_buttons">
                    <div class="fad_inp_container text">
                        <textarea id="note__${annotation_id}" class="nonspatial_note" placeholder="Notes...">${annotation_object["text_payload"]}</textarea>
                    </div><!--
                    --><div class="fad_inp_container button frst">
                        <a href="#" id="reclf__${annotation_id}" class="fad_button reclf"></a>
                    </div><!--
                    --><div class="fad_inp_container button">
                        <a href="#" id="delete__${annotation_id}" class="fad_button delete">&#215;</a>
                    </div>
                </div><!--
                --><div id="icon__${annotation_id}" class="fad_type_icon invert-this-svg" style="background-color: ${this.get_non_spatial_annotation_color(annotation_object["classification_payloads"], subtask)};">
                    ${svg_obj}
                </div>
            </div>
            `);
        } else {
            $(`textarea#note__${annotation_id}`).val(annotation_object["text_payload"]);
            $(`div#icon__${annotation_id}`).css("background-color", this.get_non_spatial_annotation_color(annotation_object["classification_payloads"], subtask));
        }
    }

    clear_nonspatial_annotation(annotation_id) {
        $(`div#row__${annotation_id}`).remove();
    }

    draw_whole_image_annotation(annotation_object, subtask = null) {
        this.draw_nonspatial_annotation(annotation_object, WHOLE_IMAGE_SVG, subtask);
    }

    draw_global_annotation(annotation_object, subtask = null) {
        this.draw_nonspatial_annotation(annotation_object, GLOBAL_SVG, subtask);
    }

    draw_annotation(annotation_object, offset = null, subtask = null) {
        // DEBUG left here for refactor reference, but I don't think it's needed moving forward
        //    there may be a use case for drawing depreacted annotations
        // Don't draw if deprecated
        if (annotation_object["deprecated"]) return;

        // Get actual context from context key and subtask
        let context = null;
        if (subtask === "demo") {
            // Must be demo
            if (annotation_object["canvas_id"] != "demo_canvas_context") {
                throw new Error("Error drawing demo annotation.");
            }
            context = this.state["demo_canvas_context"];
        } else if (NONSPATIAL_MODES.includes(annotation_object["spatial_type"])) {
            // Draw nonspatial annotations on the front context
            context = this.subtasks[subtask]["state"]["front_context"];
        } else {
            // Draw spatial annotations on their own canvas
            context = this.subtasks[subtask]["state"]["annotation_contexts"][annotation_object["canvas_id"]]["context"];
        }

        // Dispatch to annotation type's drawing function
        switch (annotation_object["spatial_type"]) {
            case "bbox":
            case "delete_bbox":
                this.draw_bounding_box(annotation_object, context, offset);
                break;
            case "point":
                this.draw_point(annotation_object, context, offset);
                break;
            case "bbox3":
                // TODO(new3d)
                this.draw_bbox3(annotation_object, context, offset);
                break;
            case "polygon":
            case "polyline":
            case "delete_polygon":
                this.draw_polygon(annotation_object, context, offset);
                break;
            case "contour":
                this.draw_contour(annotation_object, context, offset);
                break;
            case "tbar":
                this.draw_tbar(annotation_object, context, offset);
                break;
            case "whole-image":
                this.draw_whole_image_annotation(annotation_object, subtask);
                break;
            case "global":
                this.draw_global_annotation(annotation_object, subtask);
                break;
            default:
                log_message(
                    "Annotation mode " + annotation_object["spatial_type"] + " not understood",
                    LogLevel.INFO,
                );
                break;
        }
    }

    draw_annotation_from_id(id, offset = null, subtask = null) {
        if (subtask === null) {
            // Should never be here tbh
            subtask = this.get_current_subtask_key();
        }
        let frame = this.subtasks[subtask]["annotations"]["access"][id]["frame"];
        // Keep `==` here, we want to catch null and undefined
        if (frame == null || frame == "undefined" || frame == this.state["current_frame"]) {
            this.draw_annotation(this.subtasks[subtask]["annotations"]["access"][id], offset, subtask);
        }
    }

    /**
     * Redraw all annotations in a given annotation context
     *
     * @param {string} canvas_id ID of the canvas to redraw annotations in
     * @param {string} subtask subtask name
     * @param {number} offset used to offset annotations, usually while rendering a move
     * @param {Array<string>} annotation_ids_to_offset  list of annotation ids to offset
     */
    redraw_all_annotations_in_annotation_context(canvas_id, subtask, offset = null, annotation_ids_to_offset = null) {
        // Clear the canvas
        this.clear_annotation_canvas(canvas_id, subtask);
        // Handle redraw of each annotation in the context
        for (const annid of this.subtasks[subtask]["state"]["annotation_contexts"][canvas_id]["annotation_ids"]) {
            // Only draw with offset if the annotation is in the list of annotations to offset, or if the list is null
            if (annotation_ids_to_offset === null || annotation_ids_to_offset.includes(annid)) {
                this.draw_annotation_from_id(annid, offset, subtask);
            } else {
                this.draw_annotation_from_id(annid, null, subtask);
            }
        }
    }

    redraw_all_annotations_in_subtask(subtask, offset = null, nonspatial_only = false) {
        // Clear the canvas
        this.clear_front_canvas(subtask);
        // Handle redrawing of nonspatial annotations
        for (const annid of this.subtasks[subtask]["annotations"]["ordering"]) {
            if (NONSPATIAL_MODES.includes(this.subtasks[subtask]["annotations"]["access"][annid]["spatial_type"])) {
                this.draw_annotation(this.subtasks[subtask]["annotations"]["access"][annid], offset, subtask);
            }
        }
        // Handle redraw of each annotation context
        if (!nonspatial_only) {
            for (const canvas_id in this.subtasks[subtask]["state"]["annotation_contexts"]) {
                this.redraw_all_annotations_in_annotation_context(canvas_id, subtask, offset);
            }
        }
    }

    /**
     * Redraw all annotations in a given subtask, or all subtasks if subtask is null
     *
     * @param {string} subtask subtask name
     * @param {number} offset used to offset annotations, usually while rendering a move
     * @param {boolean} nonspatial_only if true, only redraw nonspatial annotations
     */
    redraw_all_annotations(subtask = null, offset = null, nonspatial_only = false) {
        // TODO(3d)
        if (subtask === null) {
            for (const st in this.subtasks) {
                this.redraw_all_annotations_in_subtask(st, offset, nonspatial_only);
            }
        } else {
            this.redraw_all_annotations_in_subtask(subtask, offset, nonspatial_only);
        }
    }

    /**
     * Redraw an annotation, given its id
     *
     * @param {string} annotation_id ID of the annotation to redraw
     * @param {string} subtask subtask name
     * @param {number} offset used to offset annotations, usually while rendering a move
     */
    redraw_annotation(annotation_id, subtask = null, offset = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
        }
        // Check if the annotation is spatial
        let is_spatial = !NONSPATIAL_MODES.includes(this.subtasks[subtask]["annotations"]["access"][annotation_id]["spatial_type"]);
        if (is_spatial) {
            // Clear and redraw all annotations on the canvas where the annotation is drawn
            const canvas_id = this.subtasks[subtask]["annotations"]["access"][annotation_id]["canvas_id"];
            this.redraw_all_annotations_in_annotation_context(canvas_id, subtask, offset, [annotation_id]);
        } else {
            // Nonspatial annotations are drawn on the front context
            this.redraw_all_annotations_in_subtask(subtask, offset, true);
        }
    }

    /**
     * Find each unique annotation context and redraw all annotations in each context
     *
     * @param {Array<string>} annotation_ids IDs of annotations to redraw
     * @param {string} subtask subtask name
     * @param {number} offset used to offset annotations, usually while rendering a move
     */
    redraw_multiple_spatial_annotations(annotation_ids, subtask = null, offset = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
        }

        // Find all unique annotation contexts
        let unique_contexts = new Set();
        for (const annid of annotation_ids) {
            unique_contexts.add(this.subtasks[subtask]["annotations"]["access"][annid]["canvas_id"]);
        }

        // Redraw all annotations in each unique context
        for (const canvas_id of unique_contexts) {
            this.redraw_all_annotations_in_annotation_context(canvas_id, subtask, offset);
        }
    }

    clear_annotation_canvas(canvas_id, subtask = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
        }
        this.subtasks[subtask]["state"]["annotation_contexts"][canvas_id]["context"].clearRect(0, 0, this.config["image_width"] * this.config["px_per_px"], this.config["image_height"] * this.config["px_per_px"]);
    }

    clear_front_canvas(subtask = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
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
        let crst = this.get_current_subtask_key();

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
        const subtask_key = this.get_current_subtask_key();
        const current_subtask = this.subtasks[subtask_key];
        const annotation = current_subtask["annotations"]["access"][polygon_id];
        const spatial_type = annotation["spatial_type"];

        // Verify polygon spatial type
        if (
            !current_subtask["state"]["is_in_brush_mode"] &&
            (spatial_type === "polygon" || spatial_type === "delete_polygon")
        ) {
            // Create ender id
            const ender_id = "ender_" + polygon_id;

            // Build ender html
            const ender_html = `
            <a href="#" id="${ender_id}" class="ender_outer">
                <span id="${ender_id}_inner" class="ender_inner"></span>
            </a>
            `;
            const polygon_ender_size = this.config["polygon_ender_size"] * this.state["zoom_val"];
            $("#dialogs__" + subtask_key).append(ender_html);
            $("#" + ender_id).css({
                "width": polygon_ender_size + "px",
                "height": polygon_ender_size + "px",
                "border-radius": polygon_ender_size / 2 + "px",
                // Get the color of the active class
                "box-shadow": "0 0 0 2px " + this.get_annotation_color(annotation),
            });
            $("#" + ender_id + "_inner").css({
                "width": polygon_ender_size / 5 + "px",
                "height": polygon_ender_size / 5 + "px",
                "border-radius": polygon_ender_size / 10 + "px",
                "top": 2 * polygon_ender_size / 5 + "px",
                "left": 2 * polygon_ender_size / 5 + "px",
            });

            // Add this id to the list of dialogs with managed positions
            current_subtask["state"]["visible_dialogs"][ender_id] = {
                left: gmx / this.config["image_width"],
                top: gmy / this.config["image_height"],
                pin: "center",
            };
            this.reposition_dialogs();
        }
    }

    destroy_polygon_ender(polygon_id) {
        // Check if the ender exists
        const ender_id = "ender_" + polygon_id;
        const ender_jq = $("#" + ender_id);
        if (ender_jq.length) {
            $("#" + ender_id).remove();
            delete this.get_current_subtask()["state"]["visible_dialogs"][ender_id];
            this.reposition_dialogs();
        }
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
        this.get_current_subtask()["state"]["visible_dialogs"][ender_id] = {
            left: gmx / this.config["image_width"],
            top: gmy / this.config["image_height"],
            pin: "center",
        };
        this.reposition_dialogs();
    }

    resize_active_polygon_ender() {
        // Check if there is an active polygon annotation
        const current_subtask = this.get_current_subtask_key();
        const active_id = this.subtasks[current_subtask]["state"]["active_id"];
        if (active_id === null) {
            return;
        }
        // Check that this is a polygon
        const active_annotation = this.subtasks[current_subtask]["annotations"]["access"][active_id];
        if (active_annotation["spatial_type"] !== "polygon") {
            return;
        }
        // Get the ender and resize it with the current zoom
        const ender_id = "ender_" + active_id;
        const polygon_ender_size = this.config["polygon_ender_size"] * this.state["zoom_val"];
        $("#" + ender_id).css({
            "width": polygon_ender_size + "px",
            "height": polygon_ender_size + "px",
            "border-radius": polygon_ender_size / 2 + "px",
        });
        $("#" + ender_id + "_inner").css({
            "width": polygon_ender_size / 5 + "px",
            "height": polygon_ender_size / 5 + "px",
            "border-radius": polygon_ender_size / 10 + "px",
            "top": 2 * polygon_ender_size / 5 + "px",
            "left": 2 * polygon_ender_size / 5 + "px",
        });
    }

    recolor_active_polygon_ender() {
        // Check if there is an active polygon annotation
        const current_subtask = this.get_current_subtask();
        const active_id = current_subtask["state"]["active_id"];
        if (active_id === null) {
            return;
        }
        // Check that this is a polygon
        const active_annotation = current_subtask["annotations"]["access"][active_id];
        if (active_annotation["spatial_type"] !== "polygon") {
            return;
        }
        // Get the ender and recolor it
        const ender_id = "ender_" + active_id;
        $("#" + ender_id).css({
            "box-shadow": "0 0 0 2px " + this.get_annotation_color(active_annotation),
        });
    }

    toggle_brush_mode(mouse_event) {
        // Try and switch to polygon annotation if not already in it
        const current_subtask = this.get_current_subtask_key();
        let is_in_polygon_mode = this.subtasks[current_subtask]["state"]["annotation_mode"] === "polygon";
        // Try and switch to polygon mode if not already in it
        if (!is_in_polygon_mode) {
            is_in_polygon_mode = this.set_and_update_annotation_mode("polygon");
            $("#brush-mode").removeClass(BrushToolboxItem.BRUSH_BTN_ACTIVE_CLS);
            $("#erase-mode").removeClass(BrushToolboxItem.BRUSH_BTN_ACTIVE_CLS);
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
                this.suggest_edits();
                // Clear any move candidates
                this.subtasks[current_subtask]["state"]["move_candidate"] = null;
                // If in starting_complex_polygon mode, end it by undoing
                if (this.subtasks[current_subtask]["state"]["starting_complex_polygon"]) {
                    undo(this, true);
                }
                // Show brush circle
                let gmx = this.get_global_mouse_x(mouse_event);
                let gmy = this.get_global_mouse_y(mouse_event);
                this.create_brush_circle(gmx, gmy);
                $("#brush-mode").addClass(BrushToolboxItem.BRUSH_BTN_ACTIVE_CLS);
            } else {
                this.destroy_brush_circle();
                $("#brush-mode").removeClass(BrushToolboxItem.BRUSH_BTN_ACTIVE_CLS);
            }
        }
    }

    toggle_erase_mode(mouse_event) {
        const current_subtask = this.get_current_subtask();
        // If not in brush mode, turn it on
        if (!current_subtask["state"]["is_in_brush_mode"]) {
            this.toggle_brush_mode(mouse_event);
        }

        // Toggle erase mode
        if (current_subtask["state"]["is_in_erase_mode"]) {
            $("#erase-mode").removeClass(BrushToolboxItem.BRUSH_BTN_ACTIVE_CLS);
            // "Erase mode" is a subset of "brush mode"
            if (current_subtask["state"]["is_in_brush_mode"]) {
                $("#brush-mode").addClass(BrushToolboxItem.BRUSH_BTN_ACTIVE_CLS);
            }
        } else {
            $("#erase-mode").addClass(BrushToolboxItem.BRUSH_BTN_ACTIVE_CLS);
            $("#brush-mode").removeClass(BrushToolboxItem.BRUSH_BTN_ACTIVE_CLS);
        }
        current_subtask["state"]["is_in_erase_mode"] = !current_subtask["state"]["is_in_erase_mode"];

        // Update brush circle color
        const brush_circle_id = "brush_circle";
        $("#" + brush_circle_id).css({
            "background-color": current_subtask["state"]["is_in_erase_mode"] ? "red" : "white",
        });

        // When turning off erase mode, also turn off brush mode
        if (
            current_subtask["state"]["is_in_brush_mode"] &&
            !current_subtask["state"]["is_in_erase_mode"]
        ) {
            this.toggle_brush_mode();
        }
    }

    // Create a brush circle at the mouse location
    create_brush_circle(gmx, gmy) {
        // Create brush circle id
        const brush_circle_id = "brush_circle";

        // Build brush circle html
        const brush_circle_html = `
        <a id="${brush_circle_id}" class="brush_circle"></a>`;
        $("#dialogs__" + this.get_current_subtask_key()).append(brush_circle_html);
        $("#" + brush_circle_id).css({
            "width": (this.config["brush_size"] * this.state["zoom_val"]) + "px",
            "height": (this.config["brush_size"] * this.state["zoom_val"]) + "px",
            "border-radius": (this.config["brush_size"] * this.state["zoom_val"]) * 2 + "px",
            "background-color": this.get_current_subtask()["state"]["is_in_erase_mode"] ? "red" : this.get_active_class_color(),
            "left": gmx + "px",
            "top": gmy + "px",
        });

        // Add this id to the list of dialogs with managed positions
        this.get_current_subtask()["state"]["visible_dialogs"][brush_circle_id] = {
            left: gmx / this.config["image_width"],
            top: gmy / this.config["image_height"],
            pin: "center",
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
        this.get_current_subtask()["state"]["visible_dialogs"][brush_circle_id] = {
            left: gmx / this.config["image_width"],
            top: gmy / this.config["image_height"],
            pin: "center",
        };
        this.reposition_dialogs();
    }

    recolor_brush_circle() {
        // Only allow when not in erase mode
        if (
            this.get_current_subtask()["state"]["is_in_brush_mode"] &&
            !this.get_current_subtask()["state"]["is_in_erase_mode"]
        ) {
            // Get brush circle id
            const brush_circle_id = "brush_circle";
            const active_id = this.get_current_subtask()["state"]["active_id"];
            $("#" + brush_circle_id).css({
                // Use annotation id if available, else use active class color
                "background-color": active_id !== null ?
                    this.get_annotation_color(this.get_current_subtask()["annotations"]["access"][active_id]) :
                    this.get_active_class_color(),
            });
        }
    }

    // Destroy the brush circle
    destroy_brush_circle() {
        // Get brush circle id
        const brush_circle_id = "brush_circle";
        $("#" + brush_circle_id).remove();
        delete this.get_current_subtask()["state"]["visible_dialogs"][brush_circle_id];
        this.reposition_dialogs();
    }

    // Change the brush size by a scale factor
    change_brush_size(scale_factor) {
        if (this.get_current_subtask()["state"]["is_in_brush_mode"]) {
            this.config["brush_size"] *= scale_factor;

            // Get brush circle id
            const brush_circle_id = "brush_circle";

            // Update the brush circle
            $("#" + brush_circle_id).css({
                "width": (this.config["brush_size"] * this.state["zoom_val"]) + "px",
                "height": (this.config["brush_size"] * this.state["zoom_val"]) + "px",
                "border-radius": (this.config["brush_size"] * this.state["zoom_val"]) + "px",
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

        // If we can't draw outside the image, then adjust the payload to fit within the image
        if (!this.config.allow_annotations_outside_image) {
            let any_point_inside_image = false;
            for (let i = 0; i < spatial_payload.length; i++) {
                let pt = spatial_payload[i];

                // Check if the point is inside the image
                if (
                    !any_point_inside_image &&
                    GeometricUtils.point_is_within_image_bounds(pt, this.config["image_width"], this.config["image_height"])
                ) {
                    any_point_inside_image = true;
                }

                // Clamp the point to the image bounds
                spatial_payload[i] = GeometricUtils.clamp_point_to_image(pt, this.config["image_width"], this.config["image_height"]);
            }

            // If no point is inside the image, then return null
            if (!any_point_inside_image) {
                return null;
            }
        }

        return [spatial_payload];
    }

    // Check if the newest complex layer can merge with each previous layer.
    merge_polygon_complex_layer(annotation_id, layer_idx = null, recursive_call = false, redoing = false, should_record_action = true) {
        const annotation = this.get_current_subtask()["annotations"]["access"][annotation_id];
        if (annotation["spatial_type"] === "polygon" && annotation["spatial_payload"].length > 1) {
            const og_polygon_spatial_data = ULabelAnnotation.get_polygon_spatial_data(annotation, true);
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
                record_action(this, {
                    act_type: "merge_polygon_complex_layer",
                    annotation_id: annotation_id,
                    frame: this.state["current_frame"],
                    undo_payload: {
                        og_polygon_spatial_data: og_polygon_spatial_data,
                    },
                    redo_payload: {
                        layer_idx: layer_idx,
                    },
                }, redoing, should_record_action);
            }
        }
    }

    // Undo the merging of layers by replacing the annotation with the undo payload
    merge_polygon_complex_layer__undo(annotation_id, undo_payload) {
        this.replace_polygon_spatial_data(annotation_id, undo_payload["og_polygon_spatial_data"]);
    }

    // Call merge_polygon_complex_layer on all layers of a polygon
    verify_all_polygon_complex_layers(annotation_id) {
        const annotation = this.get_current_subtask()["annotations"]["access"][annotation_id];
        // Reset the child indices and holes
        annotation["spatial_payload_holes"] = [false];
        annotation["spatial_payload_child_indices"] = [[]];
        // merge_polygon_complex_layer will verify all layers
        // We can start at layer 1 since layer 0 is always a fill
        for (let layer_idx = 1; layer_idx < annotation["spatial_payload"].length; layer_idx++) {
            this.merge_polygon_complex_layer(annotation_id, layer_idx, false, false, false);
        }
    }

    // Simplify a single layer of a complex polygon. Modifies the annotation directly.
    simplify_polygon_complex_layer(annotation_id, active_idx, redoing = false) {
        // Get the annotation
        const annotation = this.get_current_subtask()["annotations"]["access"][annotation_id];
        // Save the annotation for undo
        const og_polygon_spatial_data = ULabelAnnotation.get_polygon_spatial_data(annotation, true);
        // Get the layer
        const layer = annotation["spatial_payload"][active_idx];
        // layer is a list of points, so we need to wrap it in a list
        // Replace the layer with the simplified layer
        annotation["spatial_payload"][active_idx] = GeometricUtils.turf_simplify_complex_polygon([layer])[0];

        // Record the action
        record_action(this, {
            act_type: "simplify_polygon_complex_layer",
            annotation_id: annotation_id,
            frame: this.state["current_frame"],
            undo_payload: {
                og_polygon_spatial_data: og_polygon_spatial_data,
            },
            redo_payload: {
                active_idx: active_idx,
            },
        }, redoing);
    }

    // Undo the simplification of a layer by replacing the annotation with the undo payload
    simplify_polygon_complex_layer__undo(annotation_id, undo_payload) {
        this.replace_polygon_spatial_data(annotation_id, undo_payload["og_polygon_spatial_data"]);
    }

    // Delete all annotations that are completely within a delete annotation (a simple polygon).
    delete_annotations_in_polygon(delete_annid, redo_payload = null) {
        let redoing = false;
        let delete_annotation, delete_polygon;
        if (redo_payload !== null) {
            redoing = true;
            delete_polygon = redo_payload["delete_polygon"];
        } else {
            // Get the delete annotation
            delete_annotation = this.get_current_subtask()["annotations"]["access"][delete_annid];
            delete_polygon = delete_annotation["spatial_payload"];
            mark_deprecated(delete_annotation, true);
        }

        // Get the list of annotations
        const annotations = this.get_current_subtask()["annotations"]["access"];
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
                        mark_deprecated(annotation, true);
                        deprecated_ids.push(annid);
                        needs_redraw = true;
                    }
                    break;
                // Subtract the delete polygon from the annotation
                case "polygon":
                case "polyline":
                case "contour":
                    new_spatial_payload = [];
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
                        mark_deprecated(annotation, true);
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
                        mark_deprecated(annotation, true);
                        deprecated_ids.push(annid);
                        needs_redraw = true;
                    }
                    break;

                // TODO: handle other spatial types
            }
            // Redraw if needed
            if (needs_redraw) {
                this.redraw_annotation(annid);
                this.update_filter_distance(annid, false);
                this.toolbox.redraw_update_items(this);
            }
        }

        // Record the delete annotation
        record_action(this, {
            act_type: "delete_annotations_in_polygon",
            annotation_id: delete_annid,
            frame: this.state["current_frame"],
            undo_payload: {
                ender_html: $("#ender_" + delete_annid).outer_html(),
                deprecated_ids: deprecated_ids,
                modified_annotations: modified_annotations,
            },
            redo_payload: {
                delete_polygon: delete_polygon,
            },
        }, redoing);

        if (!redoing) {
            // Destroy the polygon ender
            this.destroy_polygon_ender(delete_annid);
            // Remove the delete annotation from access and ordering, and delete its canvas context
            this.destroy_annotation_context(delete_annid);
            this.remove_annotation_from_access_and_ordering(delete_annid);
            this.remove_recorded_events_for_annotation(delete_annid);
        }
    }

    // Undo the deletion of annotations by replacing the annotations with the undo payload
    delete_annotations_in_polygon__undo(undo_payload) {
        // Get the list of annotations
        const subtask = this.get_current_subtask_key();
        const annotations = this.subtasks[subtask]["annotations"]["access"];
        // Loop through all deprecated annotations
        let annotation_ids_to_redraw = [];
        let polyline_was_updated = false;
        for (let annid of undo_payload["deprecated_ids"]) {
            if (!polyline_was_updated && annotations[annid].spatial_type === "polyline") {
                polyline_was_updated = true;
            }
            // Undeprecate the annotation
            mark_deprecated(annotations[annid], false);
            // Redraw the annotation
            annotation_ids_to_redraw.push(annid);
        }
        // Loop through all modified annotations
        for (let [annid, annotation] of Object.entries(undo_payload["modified_annotations"])) {
            if (!polyline_was_updated && annotation.spatial_type === "polyline") {
                polyline_was_updated = true;
            }
            // Replace the annotation with the undo payload
            annotations[annid] = annotation;
            // Redraw the annotation
            annotation_ids_to_redraw.push(annid);
        }
        // Redraw annotations
        this.redraw_multiple_spatial_annotations(annotation_ids_to_redraw, subtask);
        // If a polyline was updated, re-filter all points
        if (polyline_was_updated) {
            this.update_filter_distance(null, false, true);
        }
        // Update class counter
        this.toolbox.redraw_update_items(this);
    }

    // Convert bbox to polygon and then delete annotations in polygon
    delete_annotations_in_bbox(delete_annid) {
        const delete_annotation = this.get_current_subtask()["annotations"]["access"][delete_annid];
        const delete_bbox = delete_annotation["spatial_payload"];
        const delete_polygon = GeometricUtils.bbox_to_simple_polygon(delete_bbox);
        delete_annotation["spatial_payload"] = delete_polygon;
        delete_annotation["spatial_type"] = "delete_polygon";
        // All the deletion work is done in delete_annotations_in_polygon
        this.delete_annotations_in_polygon(delete_annid);
    }

    // Remove an annotation from access and ordering
    remove_annotation_from_access_and_ordering(annotation_id) {
        const current_subtask = this.get_current_subtask();
        if (annotation_id in current_subtask["annotations"]["access"]) {
            // Remove the annotation from access
            delete current_subtask["annotations"]["access"][annotation_id];
            // Remove the annotation from ordering
            current_subtask["annotations"]["ordering"] = current_subtask["annotations"]["ordering"].filter((value) => value !== annotation_id);
        }
    }

    // Remove all recorded events associated with a specific annotation id
    remove_recorded_events_for_annotation(annotation_id) {
        // filter action stream
        let new_action_stream = [];
        for (let action of this.get_current_subtask()["actions"]["stream"]) {
            if (
                action.annotation_id !== annotation_id ||
                action.act_type === "delete_annotations_in_polygon"
            ) {
                new_action_stream.push(action);
            }
        }
        this.get_current_subtask()["actions"]["stream"] = new_action_stream;
    }

    /**
     * Replace an entire annotation with a new one. Generally used for undo/redo.
     *
     * @param {string} annotation_id The id of the annotation to replace
     * @param {object} new_annotation The new annotation to replace the old one
     */
    replace_annotation(annotation_id, annotation) {
        this.get_current_subtask()["annotations"]["access"][annotation_id] = annotation;
    }

    /**
     * Replace the spatial data of a polygon annotation with new spatial data. Generally used for undo/redo.
     *
     * @param {string} annotation_id The id of the annotation to replace
     * @param {object} new_spatial_data The new spatial data to replace the old one
     */
    replace_polygon_spatial_data(annotation_id, new_spatial_data) {
        const annotation = this.get_current_subtask()["annotations"]["access"][annotation_id];
        annotation["spatial_payload"] = new_spatial_data["spatial_payload"];
        annotation["spatial_payload_holes"] = new_spatial_data["spatial_payload_holes"];
        annotation["spatial_payload_child_indices"] = new_spatial_data["spatial_payload_child_indices"];
        annotation["containing_box"] = new_spatial_data["containing_box"];
    }

    // ================= Edit/ID Dialogs =================

    // Edit suggestion: highlight a point in an annotation that can be edited
    show_edit_suggestion(edit_suggestion, currently_exists = false) {
        let esid = "edit_suggestion__" + this.get_current_subtask_key();
        var esjq = $("#" + esid);
        esjq.css("display", "block");
        if (currently_exists) {
            esjq.removeClass("soft");
        } else {
            esjq.addClass("soft");
        }
        this.get_current_subtask()["state"]["visible_dialogs"][esid]["left"] = edit_suggestion["point"][0] / this.config["image_width"];
        this.get_current_subtask()["state"]["visible_dialogs"][esid]["top"] = edit_suggestion["point"][1] / this.config["image_height"];
        this.reposition_dialogs();
    }

    hide_edit_suggestion() {
        $(".edit_suggestion").css("display", "none");
    }

    // Global edit suggestion: id dialog, move button, and delete button
    show_global_edit_suggestion(annid, offset = null, nonspatial_id = null) {
        const subtask_key = this.get_current_subtask_key();
        const current_subtask = this.subtasks[subtask_key];

        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let idd_x;
        let idd_y;
        if (nonspatial_id === null) {
            let esid = "global_edit_suggestion__" + subtask_key;
            var esjq = $("#" + esid);
            esjq.css("display", "block");
            let cbox = current_subtask["annotations"]["access"][annid]["containing_box"];
            let new_lft = (cbox["tlx"] + cbox["brx"] + 2 * diffX) / (2 * this.config["image_width"]);
            let new_top = (cbox["tly"] + cbox["bry"] + 2 * diffY) / (2 * this.config["image_height"]);
            current_subtask["state"]["visible_dialogs"][esid]["left"] = new_lft;
            current_subtask["state"]["visible_dialogs"][esid]["top"] = new_top;
            this.reposition_dialogs();
            idd_x = (cbox["tlx"] + cbox["brx"] + 2 * diffX) / 2;
            idd_y = (cbox["tly"] + cbox["bry"] + 2 * diffY) / 2;
        } else {
            // TODO(new3d)
            idd_x = $("#reclf__" + nonspatial_id).offset().left - 85;// this.get_global_element_center_x($("#reclf__" + nonspatial_id));
            idd_y = $("#reclf__" + nonspatial_id).offset().top - 85;// this.get_global_element_center_y($("#reclf__" + nonspatial_id));
        }

        // let placeholder = $("#global_edit_suggestion a.reid_suggestion");
        if (!current_subtask["single_class_mode"]) {
            // Show id dialog thumbnail
            this.show_id_dialog(idd_x, idd_y, annid, true, nonspatial_id != null);
        }
    }

    hide_global_edit_suggestion() {
        $(".global_edit_suggestion").css("display", "none");
        this.hide_id_dialog();
    }

    // ID dialog: color wheel to change the ID of an annotation
    show_id_dialog(gbx, gby, active_ann, thumbnail = false, nonspatial = false) {
        let stkey = this.get_current_subtask_key();

        // Record which annotation this dialog is associated with
        // TODO
        // am_dialog_associated_ann = active_ann;
        this.get_current_subtask()["state"]["idd_visible"] = true;
        this.get_current_subtask()["state"]["idd_thumbnail"] = thumbnail;
        this.get_current_subtask()["state"]["idd_associated_annotation"] = active_ann;
        this.get_current_subtask()["state"]["idd_which"] = "back";

        let idd_id = this.get_current_subtask()["state"]["idd_id"];
        let idd_niu_id = this.get_current_subtask()["state"]["idd_id_front"];
        let new_height = $(`#global_edit_suggestion__${stkey} a.reid_suggestion`)[0].getBoundingClientRect().height;

        if (nonspatial) {
            this.get_current_subtask()["state"]["idd_which"] = "front";
            idd_id = this.get_current_subtask()["state"]["idd_id_front"];
            idd_niu_id = this.get_current_subtask()["state"]["idd_id"];
            new_height = 28;
        } else {
            // Add this id to the list of dialogs with managed positions
            // TODO actually only do this when calling append()
            this.get_current_subtask()["state"]["visible_dialogs"][idd_id] = {
                left: gbx / this.config["image_width"],
                top: gby / this.config["image_height"],
                pin: "center",
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
                "z-index": zidx,
            });
            idd.parent().css({
                "z-index": zidx,
            });
        }

        // Add or remove thumbnail class if necessary
        let scale_ratio = new_height / this.config["outer_diameter"];
        if (thumbnail) {
            if (!idd.hasClass("thumb")) {
                idd.addClass("thumb");
            }
            $("#" + idd_id + ".thumb").css({
                transform: `scale(${scale_ratio})`,
            });
        } else {
            $("#" + idd_id + ".thumb").css({
                transform: `scale(1.0)`,
            });
            if (idd.hasClass("thumb")) {
                idd.removeClass("thumb");
            }
        }

        this.reposition_dialogs();

        // Configure the dialog to show the current information for this ann
        this.set_id_dialog_payload_to_init(active_ann);
        this.update_id_dialog_display(nonspatial);

        // Show the dialog
        idd.css("display", "block");
        idd_niu.css("display", "none");
        // TODO(new3d)
        // if (nonspatial) {
        //     idd.css("z-index", 2000);
        // }
    }

    hide_id_dialog() {
        let idd_id = this.get_current_subtask()["state"]["idd_id"];
        let idd_id_front = this.get_current_subtask()["state"]["idd_id_front"];
        this.get_current_subtask()["state"]["idd_visible"] = false;
        this.get_current_subtask()["state"]["idd_associated_annotation"] = null;
        $("#" + idd_id).css("display", "none");
        $("#" + idd_id_front).css("display", "none");
    }

    // ================= Annotation Utilities =================

    /**
     * Undo the last action.
     */
    undo() {
        undo(this);
    }

    /**
     * Redo the last undone action.
     */
    redo() {
        redo(this);
    }

    /**
     * Creates an annotation based on passed in parameters. Does not use mouse positions
     *
     * @param {string} spatial_type What type of annotation to create
     * @param {[number, number][]} spatial_payload
     * @param {string} unique_id Optional unique id to use for the annotation. If null, a new unique id will be generated
     */
    create_annotation(spatial_type, spatial_payload, unique_id = null, is_redo = false) {
        // Grab constants for convenience
        const current_subtask = this.get_current_subtask();
        const annotation_access = current_subtask["annotations"]["access"];
        const annotation_ordering = current_subtask["annotations"]["ordering"];

        // Create a new unique id for this annotation
        if (unique_id === null) {
            // Create a unique id if one is not provided
            unique_id = this.make_new_annotation_id();
        }

        // Get the frame
        if (MODES_3D.includes(spatial_type)) {
            this.state["current_frame"] = null;
        }

        // Create the new annotation
        let new_annotation = {
            id: unique_id,
            parent_id: null,
            created_by: this.config.username,
            created_at: ULabel.get_time(),
            last_edited_by: this.config.username,
            last_edited_at: ULabel.get_time(),
            deprecated: false,
            deprecated_by: { human: false },
            spatial_type: spatial_type,
            spatial_payload: spatial_payload,
            classification_payloads: this.get_init_id_payload(spatial_type),
            text_payload: "",
            line_size: this.get_initial_line_size(),
            canvas_id: this.get_init_canvas_context_id(unique_id),
        };

        new_annotation = ULabelAnnotation.from_json(new_annotation);

        // Snap each point to the image bounds
        if (!this.config.allow_annotations_outside_image) {
            new_annotation = new_annotation.clamp_annotation_to_image_bounds(this.config["image_width"], this.config["image_height"]);
        }

        if (spatial_type === "polygon") {
            new_annotation["spatial_payload_holes"] = [false];
            new_annotation["spatial_payload_child_indices"] = [[]];
        }

        // Add the new annotation to the annotation access and ordering
        annotation_access[unique_id] = new_annotation;
        annotation_ordering.push(unique_id);

        // Record the action so it can be undone and redone
        record_action(this, {
            act_type: "create_annotation",
            annotation_id: unique_id,
            frame: this.state["current_frame"],
            undo_payload: {},
            redo_payload: {
                spatial_payload: spatial_payload,
                spatial_type: spatial_type,
            },
        }, is_redo);
    }

    /**
     * Undo annotation creation.
     *
     * @param {string} annotation_id The id of the annotation
     */
    create_annotation__undo(annotation_id) {
        // Destory the canvas context
        this.destroy_annotation_context(annotation_id);
        // Remove the annotation from access and ordering
        this.remove_annotation_from_access_and_ordering(annotation_id);
    }

    /**
     * Recalls create_annotation with the information inside the undo_payload.
     * redo_payload should be an object containing three properties.
     * redo_payload.spatial_payload: [number, number][]
     * redo_payload.spatial_type: string
     *
     * @param {string} annotation_id The id of the annotation
     * @param {Object} redo_payload Payload containing the properties required to recall create_annotation
     */
    create_annotation__redo(annotation_id, redo_payload) {
        // Recreate the annotation with the same annotation_id, spatial_type, and spatial_payload
        this.create_annotation(
            redo_payload.spatial_type,
            redo_payload.spatial_payload,
            annotation_id,
            true,
        );
    }

    create_point_annotation_at_mouse_location() {
        const last_move = this.state["last_move"];
        if (last_move !== null) {
            const spatial_payload = this.get_image_aware_mouse_x_y(last_move);
            // Create a point annotation at the mouse position
            this.create_annotation("point", [spatial_payload]);
        }
    }

    delete_annotation(annotation_id, redoing = false, should_record_action = true) {
        // Grab constants for convenience
        const current_subtask = this.get_current_subtask();
        const annotations = current_subtask["annotations"]["access"];
        const spatial_type = annotations[annotation_id]["spatial_type"];

        // Deprecate the annotation and redraw it
        mark_deprecated(annotations[annotation_id], true);

        if (current_subtask["state"]["active_id"] !== null) {
            current_subtask["state"]["active_id"] = null;
            current_subtask["state"]["is_in_edit"] = false;
            current_subtask["state"]["is_in_move"] = false;
            current_subtask["state"]["is_in_progress"] = false;
            current_subtask["state"]["starting_complex_polygon"] = false;
        }

        let frame = this.state["current_frame"];
        if (MODES_3D.includes(spatial_type)) {
            frame = null;
        }

        record_action(this, {
            act_type: "delete_annotation",
            annotation_id: annotation_id,
            frame: frame,
            undo_payload: {},
            redo_payload: {},
        }, redoing, should_record_action);
    }

    delete_annotation__undo(annotation_id) {
        // Set the annotation to be undeprecated and redraw it
        mark_deprecated(this.get_current_subtask()["annotations"]["access"][annotation_id], false);
    }

    delete_annotation__redo(annotation_id) {
        this.delete_annotation(annotation_id, true);
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
            annid: null,
            access: null,
            distance: max_dist / this.get_empirical_scale(),
            point: null,
        };
        if (candidates === null) {
            candidates = this.get_current_subtask()["annotations"]["ordering"];
        }
        // Iterate through and find any close enough defined points
        var edid = null;
        for (var edi = 0; edi < candidates.length; edi++) {
            edid = candidates[edi];
            let npi = null;
            let curfrm, pts, n_iters, access_idx;
            const spatial_type = this.get_current_subtask()["annotations"]["access"][edid]["spatial_type"];
            let spatial_payload = this.get_current_subtask()["annotations"]["access"][edid]["spatial_payload"];
            let active_spatial_payload = spatial_payload;
            switch (spatial_type) {
                case "bbox":
                    npi = GeometricUtils.get_nearest_point_on_bounding_box(
                        global_x, global_y, spatial_payload, max_dist,
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
                            global_x, global_y, curfrm, pts, max_dist,
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
                            global_x, global_y, active_spatial_payload, max_dist, false,
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
                        global_x, global_y, spatial_payload, max_dist,
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
            annid: null,
            access: null,
            distance: max_dist / this.get_empirical_scale(),
            point: null,
        };
        if (candidates === null) {
            candidates = this.get_current_subtask()["annotations"]["ordering"];
        }
        for (var edi = 0; edi < candidates.length; edi++) {
            var edid = candidates[edi];
            const spatial_type = this.get_current_subtask()["annotations"]["access"][edid]["spatial_type"];
            let spatial_payload = this.get_current_subtask()["annotations"]["access"][edid]["spatial_payload"];
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
                            global_x, global_y, active_spatial_payload, max_dist / this.get_empirical_scale(), true,
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

    get_scaled_line_size(annotation) {
        // If a line size isn't provided, use the default line size
        let line_size;
        if ("line_size" in annotation && annotation["line_size"] !== null) {
            line_size = annotation["line_size"];
        } else {
            line_size = this.get_initial_line_size();
        }

        // fixed: line size is independent of zoom level
        // match-zoom: line size increases with increased zoom level
        // inverse-zoom: line size decreases with increased zoom level
        if (this.state.anno_scaling_mode === "match-zoom") {
            line_size *= this.state["zoom_val"];
        } else if (this.state.anno_scaling_mode === "inverse-zoom") {
            line_size /= this.state["zoom_val"];
        }

        return line_size;
    }

    get_initial_line_size() {
        return this.state.line_size;
    }

    // Action Stream Events

    set_saved(saved) {
        this.state["edited"] = !saved;
    }

    create_nonspatial_annotation(annotation_id = null, redo_payload = null) {
        const current_subtask = this.get_current_subtask();
        let redoing = false;
        let annotation_mode = null;
        let init_idpyld = null;
        if (redo_payload === null) {
            annotation_id = this.make_new_annotation_id();
            annotation_mode = current_subtask["state"]["annotation_mode"];
            init_idpyld = this.get_init_id_payload();
        } else {
            redoing = true;
            annotation_mode = redo_payload.annotation_mode;
            init_idpyld = redo_payload.init_payload;
        }

        // Add this annotation to annotations object
        let annframe = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            annframe = null;
        }

        let new_annotation = {
            id: annotation_id,
            parent_id: null,
            created_by: this.config.username,
            created_at: ULabel.get_time(),
            last_edited_by: this.config.username,
            last_edited_at: ULabel.get_time(),
            deprecated: false,
            deprecated_by: { human: false },
            spatial_type: annotation_mode,
            spatial_payload: null,
            classification_payloads: JSON.parse(JSON.stringify(init_idpyld)),
            line_size: null,
            containing_box: null,
            frame: annframe,
            text_payload: "",
            annotation_meta: this.config["annotation_meta"],
        };

        current_subtask["annotations"]["access"][annotation_id] = new_annotation;
        current_subtask["annotations"]["ordering"].push(annotation_id);

        if (redoing) {
            this.set_id_dialog_payload_to_init(annotation_id, init_idpyld);
        }

        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        // Record for potential undo/redo
        record_action(this, {
            act_type: "create_nonspatial_annotation",
            annotation_id: annotation_id,
            frame: frame,
            redo_payload: {
                annotation_mode: annotation_mode,
                init_spatial: null,
                finished: true,
                init_payload: this.get_current_subtask()["state"]["id_payload"],
            },
            undo_payload: {},
        }, redoing);
    }

    create_nonspatial_annotation__undo(annotation_id) {
        this.remove_annotation_from_access_and_ordering(annotation_id);
        this.clear_nonspatial_annotation(annotation_id);
    }

    begin_annotation(mouse_event, annotation_id = null, redo_payload = null) {
        // Give the new annotation a unique ID
        let line_size = null;
        let annotation_mode = null;
        let redoing = false;
        let gmx = null;
        let gmy = null;
        let init_spatial = null;
        let init_id_payload = null;
        let containing_box = null;

        const subtask_key = this.get_current_subtask_key();
        const current_subtask = this.subtasks[subtask_key];

        if (redo_payload === null) {
            annotation_id = this.make_new_annotation_id();
            line_size = this.get_initial_line_size();
            annotation_mode = current_subtask["state"]["annotation_mode"];
            [gmx, gmy] = this.get_image_aware_mouse_x_y(mouse_event);
            init_spatial = this.get_init_spatial(gmx, gmy, annotation_mode, mouse_event);
            init_id_payload = this.get_init_id_payload(annotation_mode);
        } else {
            line_size = redo_payload.line_size;
            mouse_event = redo_payload.mouse_event;
            annotation_mode = redo_payload.annotation_mode;
            redoing = true;
            gmx = redo_payload.gmx;
            gmy = redo_payload.gmy;
            init_spatial = redo_payload.init_spatial;
            init_id_payload = redo_payload.init_payload;
        }

        let canvas_id = this.get_init_canvas_context_id(annotation_id, subtask_key);

        // TODO(3d)
        if (NONSPATIAL_MODES.includes(annotation_mode)) {
            line_size = null;
            init_spatial = null;
        } else {
            containing_box = {
                tlx: gmx,
                tly: gmy,
                brx: gmx,
                bry: gmy,
            };
        }

        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        // Add this annotation to annotations object
        current_subtask["annotations"]["access"][annotation_id] = {
            id: annotation_id,
            parent_id: null,
            created_by: this.config.username,
            created_at: ULabel.get_time(),
            last_edited_at: ULabel.get_time(),
            last_edited_by: this.config.username,
            deprecated: false,
            deprecated_by: { human: false },
            spatial_type: annotation_mode,
            spatial_payload: init_spatial,
            classification_payloads: init_id_payload,
            line_size: line_size,
            containing_box: containing_box,
            frame: frame,
            canvas_id: canvas_id,
            text_payload: "",
        };

        if (annotation_mode === "polygon") {
            // First layer is always a fill, not a hole
            current_subtask["annotations"]["access"][annotation_id]["spatial_payload_holes"] = [false];
            current_subtask["annotations"]["access"][annotation_id]["spatial_payload_child_indices"] = [[]];
        }

        // TODO(3d)
        // Load annotation_meta into annotation
        current_subtask["annotations"]["access"][annotation_id]["annotation_meta"] = this.config["annotation_meta"];
        current_subtask["annotations"]["ordering"].push(annotation_id);

        // If a polygon was just started, we need to add a clickable to end the shape
        this.create_polygon_ender(gmx, gmy, annotation_id);

        current_subtask["state"]["active_id"] = annotation_id;
        current_subtask["state"]["is_in_progress"] = true;

        // Record for potential undo/redo
        record_action(this, {
            act_type: "begin_annotation",
            annotation_id: annotation_id,
            frame: frame,
            redo_payload: {
                mouse_event: mouse_event,
                line_size: line_size,
                annotation_mode: annotation_mode,
                gmx: gmx,
                gmy: gmy,
                init_spatial: init_spatial,
                finished: redoing || annotation_mode === "point",
                init_payload: init_id_payload,
            },
            undo_payload: {},
        }, redoing);

        if (redoing) {
            this.set_id_dialog_payload_to_init(annotation_id, init_id_payload);

            if (annotation_mode === "polygon" || annotation_mode === "polyline" || annotation_mode === "delete_polygon") {
                this.continue_annotation(this.state["last_move"]);
            } else {
                this.finish_annotation();
            }
        }
    }

    begin_annotation__undo(annotation_id) {
        const current_subtask = this.get_current_subtask();

        // Set annotation state not in progress, nullify active id
        current_subtask["state"]["is_in_progress"] = false;
        current_subtask["state"]["active_id"] = null;

        // Destroy the annotation's canvas, thus removing it from the screen
        this.destroy_annotation_context(annotation_id);
        this.remove_annotation_from_access_and_ordering(annotation_id);
    }

    update_containing_box(ms_loc, actid, subtask = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
        }
        // TODO(3d)
        if (ms_loc[0] < this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"] = ms_loc[0];
        } else if (ms_loc[0] > this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"] = ms_loc[0];
        }
        if (ms_loc[1] < this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"] = ms_loc[1];
        } else if (ms_loc[1] > this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"] = ms_loc[1];
        }
    }

    rebuild_containing_box(actid, ignore_final = false, subtask = null) {
        if (subtask === null) {
            subtask = this.get_current_subtask_key();
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
        if (init_pt === undefined) {
            return;
        }

        this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"] = {
            tlx: init_pt[0],
            tly: init_pt[1],
            brx: init_pt[0],
            bry: init_pt[1],
        };
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
        );
    }

    continue_annotation(mouse_event, isclick = false, annotation_id = null, redo_payload = null) {
        // Convenience
        const current_subtask = this.get_current_subtask();
        let redoing = false;
        let gmx = null;
        let gmy = null;
        let frm = this.state["current_frame"];
        let is_click_dragging = this.drag_state["active_key"] != null;
        if (redo_payload === null) {
            annotation_id = current_subtask["state"]["active_id"];
            [gmx, gmy] = this.get_image_aware_mouse_x_y(mouse_event);
        } else {
            mouse_event = redo_payload.mouse_event;
            isclick = redo_payload.isclick;
            redoing = true;
            gmx = redo_payload.gmx;
            gmy = redo_payload.gmy;
            frm = redo_payload.frame;
        }

        if (annotation_id !== null) {
            const ms_loc = [
                gmx,
                gmy,
            ];
            // Handle annotation continuation based on the annotation mode
            // TODO(3d)
            // TODO(3d--META) -- This is the farthest I got tagging places that will need to be fixed.
            let n_kpts, ender_pt, ender_dist, ender_thresh;
            let add_keypoint = false;
            const spatial_type = current_subtask["annotations"]["access"][annotation_id]["spatial_type"];
            let spatial_payload = current_subtask["annotations"]["access"][annotation_id]["spatial_payload"];
            let active_spatial_payload = spatial_payload;

            switch (spatial_type) {
                case "bbox":
                case "delete_bbox":
                    spatial_payload[1] = ms_loc;
                    break;
                case "bbox3":
                    spatial_payload[1] = [
                        ms_loc[0],
                        ms_loc[1],
                        frm,
                    ];
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
                            active_spatial_payload[0][1],
                        ];
                        ender_dist = Math.pow(Math.pow(ms_loc[0] - ender_pt[0], 2) + Math.pow(ms_loc[1] - ender_pt[1], 2), 0.5);
                        ender_thresh = $("#ender_" + annotation_id).width() / (2 * this.get_empirical_scale());
                        if (ender_dist < ender_thresh) {
                            active_spatial_payload[n_kpts - 1] = ender_pt;
                        } else { // Else, just redirect line to mouse position
                            active_spatial_payload[n_kpts - 1] = ms_loc;
                        }
                    } else if (current_subtask["state"]["starting_complex_polygon"]) {
                        // When waiting to start a complex polygon, move the ender to the mouse position
                        this.move_polygon_ender(gmx, gmy, annotation_id);
                    }

                    // If this mouse event is a click, add a new member to the list of keypoints
                    //    ender clicks are filtered before they get here
                    if (isclick || (is_click_dragging && this.config.click_and_drag_poly_annotations)) {
                        add_keypoint = true;
                        if (n_kpts === 0) {
                            // We'll need to add this point twice, once for the actual point
                            // and once for rendering future lines.
                            active_spatial_payload.push(ms_loc);
                            // mark that we've successfully started our complex polygon
                            current_subtask["state"]["starting_complex_polygon"] = false;
                        } else if (n_kpts > 1) {
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
                        }
                    }
                    break;
                case "contour":
                    if (GeometricUtils.l2_norm(ms_loc, spatial_payload.at(-1)) * this.config["px_per_px"] > 3) {
                        spatial_payload.push(ms_loc);
                    }
                    break;
                case "tbar":
                    spatial_payload[1] = ms_loc;
                    break;
                default:
                    log_message(
                        `Annotation mode is not understood: ${spatial_type}`,
                        LogLevel.INFO,
                    );
                    break;
            }

            // Only an undoable action if placing a polygon keypoint
            record_action(this, {
                act_type: "continue_annotation",
                annotation_id: annotation_id,
                frame: this.state["current_frame"],
                redo_payload: {
                    mouse_event: mouse_event,
                    isclick: isclick || is_click_dragging,
                    gmx: gmx,
                    gmy: gmy,
                },
                undo_payload: {},
            }, redoing, add_keypoint);

            if (redoing) {
                this.continue_annotation(this.state["last_move"]);
            }
        }
    }

    continue_annotation__undo(annotation_id) {
        const current_subtask = this.get_current_subtask();
        let spatial_payload = current_subtask["annotations"]["access"][annotation_id]["spatial_payload"];
        const spatial_type = current_subtask["annotations"]["access"][annotation_id]["spatial_type"];
        let active_spatial_payload = spatial_payload;
        if (spatial_type === "polygon") {
            // For polygons, the active spatial payload is the last array of points in the spatial payload
            active_spatial_payload = spatial_payload.at(-1);
        }
        // Get the last point in the active spatial payload
        active_spatial_payload.pop();

        // Logic for dealing with complex layers
        if (spatial_type === "polygon" && spatial_payload[0].length > 1) {
            // If the active spatial payload has *one* point remaining, delete the point and start moving the polygon ender
            if (active_spatial_payload.length === 1) {
                active_spatial_payload.pop();
                current_subtask["state"]["starting_complex_polygon"] = true;
            } else if (active_spatial_payload.length === 0) {
                // If the user has undone all points in the active spatial payload, return to the previous layer
                // Set the starting_complex_polygon state to false
                current_subtask["state"]["starting_complex_polygon"] = false;
                // Remove the placeholder annotation
                spatial_payload.pop();
                active_spatial_payload = spatial_payload.at(-1);
                // move the polygon ender
                let last_pt = active_spatial_payload.at(-1);
                this.move_polygon_ender(last_pt[0], last_pt[1], current_subtask["state"]["active_id"]);
            }
        }
        this.continue_annotation(this.state["last_move"]);
    }

    start_complex_polygon(annotation_id = null) {
        const current_subtask = this.get_current_subtask();
        let redoing = false;
        if (annotation_id === null) {
            annotation_id = current_subtask["state"]["active_id"];
        } else {
            current_subtask["state"]["active_id"] = annotation_id;
            redoing = true;

            // Add back the ender
            const [gmx, gmy] = this.get_image_aware_mouse_x_y(this.state["last_move"]);
            this.create_polygon_ender(gmx, gmy, annotation_id);
        }

        const polygon_spatial_data = ULabelAnnotation.get_polygon_spatial_data(current_subtask["annotations"]["access"][annotation_id], true);
        // Prep the next part of the polygon
        current_subtask["annotations"]["access"][annotation_id]["spatial_payload"].push([]);
        // mark that we are starting complex polygon
        current_subtask["state"]["starting_complex_polygon"] = true;
        // mark in progress
        current_subtask["state"]["is_in_progress"] = true;

        record_action(this, {
            act_type: "start_complex_polygon",
            annotation_id: annotation_id,
            frame: this.state["current_frame"],
            undo_payload: {
                // Save polygon spatial data for potential "finish_modify_annotation" undo
                polygon_spatial_data: polygon_spatial_data,
            },
            redo_payload: {},
        }, redoing);
    }

    start_complex_polygon__undo(annotation_id) {
        const current_subtask = this.get_current_subtask();
        // Set the starting_complex_polygon state to false
        current_subtask["state"]["starting_complex_polygon"] = false;
        // Remove the placeholder annotation
        current_subtask["annotations"]["access"][annotation_id]["spatial_payload"].pop();
        // Mark that we're done here
        current_subtask["state"]["active_id"] = null;
        current_subtask["state"]["is_in_progress"] = false;
    }

    // Split a ULabel complex polygon seperate turf polygons for each fill
    split_complex_polygon(active_id) {
        this.verify_complex_polygon_child_indices(active_id);
        // Get annotation
        const annotation = this.get_current_subtask()["annotations"]["access"][active_id];
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
        const annotation = this.get_current_subtask()["annotations"]["access"][active_id];
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
        const current_subtask = this.get_current_subtask();
        // First, we check if there is an annotation touching the brush
        let brush_cand_active_id = null;
        const global_x = this.get_global_mouse_x(mouse_event);
        const global_y = this.get_global_mouse_y(mouse_event);
        let brush_polygon = this.get_brush_circle_spatial_payload(global_x, global_y);

        // Loop through all annotations in the ordering until we find a polygon that intersects with the brush
        if (brush_polygon !== null) {
            for (let i = current_subtask["annotations"]["ordering"].length - 1; i >= 0; i--) {
                let active_id = current_subtask["annotations"]["ordering"][i];
                let annotation = current_subtask["annotations"]["access"][active_id];
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
        }

        if (brush_cand_active_id !== null) {
            // Set annotation as in progress
            current_subtask["state"]["active_id"] = brush_cand_active_id;
            current_subtask["state"]["is_in_progress"] = true;
            // Update the id_payload
            current_subtask["state"]["id_payload"] = JSON.parse(JSON.stringify(current_subtask["annotations"]["access"][brush_cand_active_id]["classification_payloads"]));
            this.update_id_toolbox_display();
            // Recolor the brush
            this.recolor_brush_circle();
            // Record for potential undo/redo
            record_action(this, {
                act_type: "begin_brush",
                annotation_id: brush_cand_active_id,
                frame: this.state["current_frame"],
                undo_payload: {
                    polygon_spatial_data: ULabelAnnotation.get_polygon_spatial_data(current_subtask["annotations"]["access"][brush_cand_active_id]),
                },
                redo_payload: {},
            });
            this.continue_brush(mouse_event);
        } else if (
            !current_subtask["state"]["is_in_erase_mode"] &&
            brush_polygon !== null
        ) {
            // Start a new annotation if not in erase mode
            this.begin_annotation(mouse_event);
        } else {
            // Move the brush
            this.move_brush_circle(global_x, global_y);
        }

        if (brush_polygon === null && !current_subtask["state"]["is_in_erase_mode"]) {
            // Indicate that the brush is fully outside the image
            this.shake_screen();
        }
    }

    // Reset the annotation
    begin_brush__undo(annotation_id, undo_payload) {
        if (annotation_id !== null) {
            // Reset the annotation
            this.replace_polygon_spatial_data(annotation_id, undo_payload.polygon_spatial_data);
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
            let [last_gmx, last_gmy] = this.state["last_brush_stroke"];
            if (Math.abs(gmx - last_gmx) < min_brush_distance && Math.abs(gmy - last_gmy) < min_brush_distance) {
                continue_brush = false;
            }
        }

        if (continue_brush) {
            // Save the last brush stroke
            this.state["last_brush_stroke"] = [gmx, gmy];
            const current_subtask = this.get_current_subtask();
            const active_id = current_subtask["state"]["active_id"];
            let brush_polygon = this.get_brush_circle_spatial_payload(gmx, gmy);

            if (active_id !== null && brush_polygon !== null) {
                // Get the current annotation
                const annotation = current_subtask["annotations"]["access"][active_id];
                // Split the annotation into separate polygons for each fill
                let split_polygons = this.split_complex_polygon(active_id);
                let new_spatial_payload = [];

                if (current_subtask["state"]["is_in_erase_mode"]) {
                    let merged_polygon = null;
                    for (let split_polygon of split_polygons) {
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

                // Record the action without adding to the action stream
                record_action(this, {
                    act_type: "continue_brush",
                    annotation_id: active_id,
                    frame: this.state["current_frame"],
                    undo_payload: {},
                    redo_payload: {},
                }, false, false);
            }
        }
    }

    /**
     * Undo an annotation modification, for example a brush stroke
     *
     * @param {string} annotation_id The id of the annotation to undo
     * @param {object} undo_payload {polygon_spatial_data: object}
     */
    finish_modify_annotation__undo(annotation_id, undo_payload) {
        // Replace the polygon spatial data
        this.replace_polygon_spatial_data(annotation_id, undo_payload.polygon_spatial_data);
    }

    /**
     * Redo an annotation modification, for example a brush stroke
     *
     * @param {string} annotation_id The id of the annotation to redo
     * @param {object} redo_payload {polygon_spatial_data: object}
     */
    finish_modify_annotation__redo(annotation_id, redo_payload) {
        // Store data for undo
        const polygon_spatial_data = ULabelAnnotation.get_polygon_spatial_data(this.get_current_subtask()["annotations"]["access"][annotation_id]);
        // Replace the polygon spatial data
        this.replace_polygon_spatial_data(annotation_id, redo_payload.polygon_spatial_data);
        // Record the action
        record_action(this, {
            act_type: "finish_modify_annotation",
            annotation_id: annotation_id,
            frame: this.state["current_frame"],
            undo_payload: {
                polygon_spatial_data: polygon_spatial_data,
            },
            redo_payload: {
                polygon_spatial_data: redo_payload.polygon_spatial_data,
            },
        }, true);
    }

    begin_edit(mouse_event) {
        // Create constants for convenience
        const current_subtask = this.get_current_subtask();
        const annotations = current_subtask["annotations"]["access"];

        // Set global params
        const active_id = current_subtask["state"]["edit_candidate"]["annid"];
        current_subtask["state"]["active_id"] = active_id;
        current_subtask["state"]["is_in_edit"] = true;

        const annotation_mode = annotations[active_id]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        record_action(this, {
            act_type: "begin_edit",
            annotation_id: active_id,
            frame: frame,
            undo_payload: {
                annotation: annotations[active_id],
            },
            redo_payload: {
                annotation: annotations[active_id],
                finished: false,
            },
        });

        this.continue_edit(mouse_event, true);
    }

    continue_edit(mouse_event, is_begin_edit = false) {
        // Convenience and readability
        const current_subtask = this.get_current_subtask();
        const active_id = current_subtask["state"]["active_id"];
        const access_str = current_subtask["state"]["edit_candidate"]["access"];
        if (active_id !== null) {
            const mouse_location = [
                this.get_global_mouse_x(mouse_event),
                this.get_global_mouse_y(mouse_event),
            ];
            const spatial_type = current_subtask["annotations"]["access"][active_id]["spatial_type"];
            let edit_success = true;
            // Clicks are handled elsewhere
            switch (spatial_type) {
                case "bbox":
                case "tbar":
                case "polygon":
                    this.set_with_access_string(active_id, access_str, mouse_location);
                    break;
                case "bbox3":
                    // TODO(new3d) Will not always want to set 3rd val -- editing is possible within an intermediate frame or frames
                    this.set_with_access_string(active_id, access_str, [mouse_location[0], mouse_location[1], this.state["current_frame"]]);
                    break;
                case "polyline":
                    this.set_with_access_string(active_id, access_str, mouse_location);
                    break;
                case "contour":
                case "point":
                    // TODO contour editing
                    log_message(
                        "Annotation mode is not currently editable",
                        LogLevel.INFO,
                    );
                    edit_success = false;
                    break;
                default:
                    log_message(
                        `Annotation mode ${spatial_type} is not understood`,
                        LogLevel.INFO,
                    );
                    edit_success = false;
                    break;
            }

            if (edit_success) {
                // Record action without adding to the action stream
                record_action(this, {
                    act_type: "continue_edit",
                    annotation_id: active_id,
                    frame: this.state["current_frame"],
                    undo_payload: {},
                    redo_payload: {},
                }, false, false);

                // If this is the first edit, we may need to update the access string
                // if we've added a new point to the spatial payload
                // TODO: less hacky way to do this
                if (is_begin_edit) {
                    current_subtask["state"]["is_in_edit"] = false;
                    this.suggest_edits();
                    current_subtask["state"]["is_in_edit"] = true;
                }

                // Update the edit candidate point
                current_subtask["state"]["edit_candidate"]["point"] = mouse_location;
                this.show_edit_suggestion(current_subtask["state"]["edit_candidate"], true);
            }
        }
    }

    finish_edit() {
        const current_subtask = this.get_current_subtask();
        let actid = current_subtask["state"]["active_id"];
        const access_str = current_subtask["state"]["edit_candidate"]["access"];
        let layer_idx;
        switch (current_subtask["annotations"]["access"][actid]["spatial_type"]) {
            case "polygon":
                // Reset spatial_payload_child_indices
                current_subtask["annotations"]["access"][actid]["spatial_payload_child_indices"] = [];
                // Get the idx of the edited layer and try and merge it
                layer_idx = parseInt(access_str[0], 10);
                this.merge_polygon_complex_layer(actid, layer_idx, false, false, false);
                // Check if any other layers need to be merged
                for (let i = 0; i < current_subtask["annotations"]["access"][actid]["spatial_payload"].length; i++) {
                    if (i !== layer_idx) {
                        this.merge_polygon_complex_layer(actid, i, false, false, false);
                    }
                }
                record_finish_edit(this, actid);
                break;
            case "polyline":
            case "bbox":
            case "bbox3":
            case "tbar":
                record_finish_edit(this, actid);
                break;
            case "contour":
            case "point":
                break;
            default:
                break;
        }

        // Set mode to no active annotation
        this.get_current_subtask()["state"]["active_id"] = null;
        this.get_current_subtask()["state"]["is_in_edit"] = false;
    }

    // The action name used to trigger this is "begin_edit"
    // which is updated by the "record_finish_edit" in "finish_edit"
    begin_edit__undo(annotation_id, undo_payload) {
        this.replace_annotation(annotation_id, undo_payload.annotation);
    }

    // The action name used to trigger this is "begin_edit"
    // which is updated by the "record_finish_edit" in "finish_edit"
    begin_edit__redo(annotation_id, redo_payload) {
        // Save the current annotation for undo
        const current_annotation = JSON.parse(JSON.stringify(this.get_current_subtask()["annotations"]["access"][annotation_id]));
        // Replace the annotation with the redo payload
        this.replace_annotation(annotation_id, redo_payload.annotation);

        const spatial_type = redo_payload.annotation["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(spatial_type)) {
            frame = null;
        }
        record_action(this, {
            act_type: "begin_edit",
            annotation_id: annotation_id,
            frame: frame,
            undo_payload: {
                annotation: current_annotation,
            },
            redo_payload: {
                annotation: redo_payload.annotation,
                finished: true,
            },
        }, true);
    }

    // Cancel the annotation currently in progress
    cancel_annotation(annotation_id = null) {
        let redoing = true;
        if (annotation_id === null) {
            // Get the active id
            annotation_id = this.get_current_subtask()["state"]["active_id"];
            redoing = false;
        }

        let is_complex_layer = false;
        if (annotation_id !== null) {
            const annotation = this.get_current_subtask()["annotations"]["access"][annotation_id];
            const spatial_type = annotation["spatial_type"];
            // When drawing a complex layer, we will only delete the last layer
            if (
                spatial_type === "polygon" && annotation["spatial_payload"].length > 1
            ) {
                is_complex_layer = true;
                // Reuse the logic for undoing the start of a complex polygon
                this.start_complex_polygon__undo(annotation_id);
            } else {
                // Delete the annotation, without recording the delete action
                // This will also clear is_in_progress and other states
                this.delete_annotation(annotation_id, false, false);
            }

            // Record the cancel action
            record_action(this, {
                act_type: "cancel_annotation",
                annotation_id: annotation_id,
                frame: this.state["current_frame"],
                undo_payload: {
                    suggest_edits: false,
                    drag_state: this.drag_state,
                    is_complex_layer: is_complex_layer,
                    annotation: annotation,
                },
                redo_payload: {},
            }, redoing);
        }
    }

    cancel_annotation__undo(annotation_id, undo_payload) {
        // Mark that the annotation is in progress again
        const current_subtask = this.get_current_subtask();
        current_subtask["state"]["active_id"] = annotation_id;
        current_subtask["state"]["is_in_progress"] = true;

        if (undo_payload.is_complex_layer) {
            // Restore the removed layer
            this.replace_annotation(annotation_id, undo_payload.annotation);
        } else {
            // Undeprecate the annotation
            this.delete_annotation__undo(annotation_id);
        }

        const annotation = current_subtask["annotations"]["access"][annotation_id];
        // If a polygon/delete polygon, show the ender
        if (annotation["spatial_type"] === "polygon") {
            // Get the first point of the last layer for a polygon
            let first_pt = annotation["spatial_payload"].at(-1)[0];
            this.create_polygon_ender(first_pt[0], first_pt[1], annotation_id);
        } else if (annotation["spatial_type"] === "delete_polygon") {
            // Get the first point of a delete polygon
            let first_pt = annotation["spatial_payload"][0];
            this.create_polygon_ender(first_pt[0], first_pt[1], annotation_id);
        } else if (annotation["spatial_type"] === "bbox" || annotation["spatial_type"] === "delete_bbox" || annotation["spatial_type"] === "tbar") {
            // Reset the drag mode to cause mouse moves to move the annotation
            this.drag_state = undo_payload.drag_state;
            // Move to the current mouse location
            this.continue_annotation(this.state["last_move"]);
        }
    }

    finish_annotation(mouse_event = null) {
        // Convenience
        const current_subtask = this.get_current_subtask();
        const annotations = current_subtask["annotations"]["access"];

        // Initialize required variables
        let active_id = current_subtask["state"]["active_id"];
        let annotation = annotations[active_id];
        let spatial_payload = annotation["spatial_payload"];
        let active_spatial_payload = spatial_payload;
        let should_record_action = false;
        let act_type = "finish_annotation";

        // Record last point and redraw if necessary
        // TODO(3d)
        let n_kpts, start_pt, active_idx, uniquePoints;
        const spatial_type = annotation["spatial_type"];
        switch (spatial_type) {
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
                    active_spatial_payload[0][1],
                ];
                active_spatial_payload[n_kpts - 1] = start_pt;

                // Record the action
                should_record_action = true;

                // Simplify the polygon
                this.simplify_polygon_complex_layer(active_id, active_idx);
                // Render merged layers. Also handles rebuilding containing box and redrawing
                this.merge_polygon_complex_layer(active_id);
                break;
            case "delete_polygon":
                n_kpts = active_spatial_payload.length;
                if (n_kpts < 4) {
                    console.error("Canceled delete with insufficient points:", n_kpts);
                    return;
                }
                start_pt = [
                    active_spatial_payload[0][0],
                    active_spatial_payload[0][1],
                ];
                active_spatial_payload[n_kpts - 1] = start_pt;
                this.delete_annotations_in_polygon(active_id);
                break;
            case "polyline":
                // Prevent zero-length polylines (must have at least two unique points)
                uniquePoints = new Set(spatial_payload.map((pt) => pt.join(",")));
                if (uniquePoints.size < 2) {
                    console.warn("Canceled polyline with insufficient unique points:", spatial_payload);
                    return;
                }

                // Remove last point
                n_kpts = spatial_payload.length;
                if (n_kpts > 2) {
                    spatial_payload.pop();
                }

                should_record_action = true;
                break;
            case "delete_bbox":
                record_finish(this, active_id);
                this.delete_annotations_in_bbox(active_id);
                break;
            case "bbox":
            case "bbox3":
            case "contour":
            case "tbar":
            case "point":
                record_finish(this, active_id);
                break;
            default:
                break;
        }

        let undo_payload = {};
        let redo_payload = {};
        if (should_record_action) {
            // Once we've finished a polygon or polyline, undoing will
            // remove the entire completed annotation rather that undoing each point.
            // Loop through the action stream until and remove every recorded action
            // until we find the start_complex_polygon, begin_brush, or begin_annotation action
            const action_stream = current_subtask["actions"]["stream"];
            while (action_stream.length > 0) {
                // Pop the action to remove it from the stream
                let action = action_stream.pop();
                if (action.act_type === "begin_annotation") {
                    // Now we're done
                    break;
                } else if (action.act_type === "begin_brush" || action.act_type === "start_complex_polygon") {
                    // Save the previous state of the annotation for undoing
                    act_type = "finish_modify_annotation";
                    undo_payload = JSON.parse(action.undo_payload);
                    redo_payload.polygon_spatial_data = ULabelAnnotation.get_polygon_spatial_data(annotations[active_id]);
                    break;
                }
            }
        }

        // Record the finish_annotation or finish_modify_annotation action
        // except for delete modes, which record their action separately
        if (!DELETE_MODES.includes(spatial_type)) {
            record_action(this, {
                act_type: act_type,
                annotation_id: active_id,
                frame: this.state["current_frame"],
                undo_payload: undo_payload,
                redo_payload: redo_payload,
            }, false, should_record_action);
        }

        // TODO build a dialog here when necessary -- will also need to integrate with undo
        // TODO(3d)
        if (current_subtask["single_class_mode"]) {
            annotation["classification_payloads"] = [
                {
                    class_id: current_subtask["class_defs"][0]["id"],
                    confidence: 1.0,
                },
            ];
        }

        // Reset last brush stroke
        this.state["last_brush_stroke"] = null;

        // Set mode to no active annotation, unless shift key is held for a polygon
        // When shift key is held, we start a new complex layer
        if (
            annotation["spatial_type"] === "polygon" &&
            !current_subtask["state"]["is_in_brush_mode"] &&
            mouse_event != null &&
            mouse_event.shiftKey
        ) {
            // Start a new complex layer
            this.start_complex_polygon();
        } else {
            current_subtask["state"]["active_id"] = null;
            current_subtask["state"]["is_in_progress"] = false;
        }
    }

    finish_annotation__undo(annotation_id) {
        // Deprecate the annotation
        mark_deprecated(this.get_current_subtask()["annotations"]["access"][annotation_id], true);
    }

    finish_annotation__redo(annotation_id) {
        // Undeprecate the annotation
        mark_deprecated(this.get_current_subtask()["annotations"]["access"][annotation_id], false);
        // Record the action
        record_action(this, {
            act_type: "finish_annotation",
            annotation_id: annotation_id,
            frame: this.state["current_frame"],
            undo_payload: {},
            redo_payload: {},
        }, true);
    }

    begin_move(mouse_event) {
        // Convenience
        const current_subtask = this.get_current_subtask();
        const annotations = current_subtask["annotations"]["access"];
        const active_id = current_subtask["state"]["move_candidate"]["annid"];

        // Set global params
        current_subtask["state"]["active_id"] = active_id;
        current_subtask["state"]["is_in_move"] = true;
        current_subtask["state"]["move_candidate"]["offset"] = {
            id: active_id,
            diffX: 0,
            diffY: 0,
            diffZ: 0,
        };

        const annotation_mode = annotations[active_id]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        record_action(this, {
            act_type: "begin_move",
            annotation_id: active_id,
            frame: frame,
            undo_payload: {
                diffX: 0,
                diffY: 0,
                diffZ: 0,
            },
            redo_payload: {
                diffX: 0,
                diffY: 0,
                diffZ: 0,
                finished: false,
                move_not_allowed: false,
            },
        });

        this.continue_move(mouse_event);
    }

    continue_move(mouse_event) {
        // Convenience
        const current_subtask = this.get_current_subtask();
        const active_id = current_subtask["state"]["active_id"];

        if (active_id !== null) {
            let offset = {
                id: current_subtask["state"]["move_candidate"]["annid"],
                diffX: (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0]) / this.state["zoom_val"],
                diffY: (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1]) / this.state["zoom_val"],
                diffZ: this.state["current_frame"] - this.drag_state["move"]["mouse_start"][2],
            };

            // Update move candidate
            // this offset is used to render the in-progress move
            current_subtask["state"]["move_candidate"]["offset"] = offset;
        }

        // Record the action without adding to the action stream
        record_action(this, {
            act_type: "continue_move",
            annotation_id: active_id,
            frame: this.state["current_frame"],
            undo_payload: {},
            redo_payload: {},
        }, false, false);
    }

    finish_move(mouse_event) {
        // Actually edit spatial payload this time
        const diffX = (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0]) / this.state["zoom_val"];
        const diffY = (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1]) / this.state["zoom_val"];
        const diffZ = this.state["current_frame"] - this.drag_state["move"]["mouse_start"][2];

        const current_subtask = this.get_current_subtask();
        const active_id = current_subtask["state"]["active_id"];
        const annotation = current_subtask["annotations"]["access"][active_id];
        const spatial_type = annotation["spatial_type"];
        let spatial_payload = annotation["spatial_payload"];
        let active_spatial_payload = spatial_payload;

        // if a polygon, n_iters is the length the spatial payload
        // else n_iters is 1
        let n_iters = spatial_type === "polygon" ? spatial_payload.length : 1;
        let point_outside_image = false;
        let x_outside_image = false;
        let y_outside_image = false;
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

                // Check if any point moved outside the image bounds
                if (!point_outside_image) {
                    x_outside_image = active_spatial_payload[spi][0] < 0 || active_spatial_payload[spi][0] > this.config["image_width"];
                    y_outside_image = active_spatial_payload[spi][1] < 0 || active_spatial_payload[spi][1] > this.config["image_height"];
                    point_outside_image = x_outside_image || y_outside_image;
                }
            }

            if (MODES_3D.includes(spatial_type)) {
                for (let spi = 0; spi < active_spatial_payload.length; spi++) {
                    active_spatial_payload[spi][2] += diffZ;
                }
            }
        }

        current_subtask["state"]["active_id"] = null;
        current_subtask["state"]["is_in_move"] = false;

        const move_not_allowed = !this.config.allow_annotations_outside_image && point_outside_image;
        record_finish_move(this, diffX, diffY, diffZ, move_not_allowed);

        // If any point is outside the image bounds, bounce back the move
        if (move_not_allowed) {
            // Revert the move
            undo(this, true);
            // Shake the screen to indicate the move was not allowed
            this.shake_screen();
        }
    }

    // Undo the move of an annotation
    // The action name used to trigger this is "begin_move"
    // which is updated by the "record_finish_move" in "finish_move"
    begin_move__undo(annotation_id, undo_payload) {
        // Convenience
        const current_subtask = this.get_current_subtask();
        const annotations = current_subtask["annotations"]["access"];

        const diffX = undo_payload.diffX;
        const diffY = undo_payload.diffY;
        const diffZ = undo_payload.diffZ;

        const spatial_type = annotations[annotation_id]["spatial_type"];
        const spatial_payload = annotations[annotation_id]["spatial_payload"];
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
    }

    // Redo the move of an annotation
    // The action name used to trigger this is "begin_move"
    // which is updated by the "record_finish_move" in "finish_move"
    begin_move__redo(annotation_id, redo_payload) {
        // If the move wasn't allowed in the first place, we don't want to redo it
        if (redo_payload.move_not_allowed) {
            return;
        }

        // Convenience
        const current_subtask = this.get_current_subtask();
        const annotations = current_subtask["annotations"]["access"];

        const diffX = redo_payload.diffX;
        const diffY = redo_payload.diffY;
        const diffZ = redo_payload.diffZ;

        const spatial_type = annotations[annotation_id]["spatial_type"];
        const spatial_payload = annotations[annotation_id]["spatial_payload"];
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

        let frame = this.state["current_frame"];
        if (MODES_3D.includes(spatial_type)) {
            frame = null;
        }

        record_action(this, {
            act_type: "begin_move",
            annotation_id: annotation_id,
            frame: frame,
            undo_payload: {
                diffX: -diffX,
                diffY: -diffY,
                diffZ: -diffZ,
            },
            redo_payload: {
                diffX: diffX,
                diffY: diffY,
                diffZ: diffZ,
                finished: true,
            },
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
            candidate_ids: [],
            best: null,
        };
        let minsize = Infinity;
        // TODO(3d)
        for (let edi = 0; edi < this.get_current_subtask()["annotations"]["ordering"].length; edi++) {
            const annotation_id = this.get_current_subtask()["annotations"]["ordering"][edi];
            let annotation = this.get_current_subtask()["annotations"]["access"][annotation_id];
            if (annotation["deprecated"]) continue;
            let cbox = annotation["containing_box"];
            let frame = annotation["frame"];
            const spatial_type = annotation["spatial_type"];
            if (cbox) {
                cbox["tlz"] = this.state["current_frame"];
                cbox["brz"] = this.state["current_frame"];
                if (frame != null) {
                    cbox["tlz"] = frame;
                    cbox["brz"] = frame;
                } else {
                    if (spatial_type === "bbox3") {
                        let pts = annotation["spatial_payload"];
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
                let found_perfect_match = false;
                let boxsize;
                switch (spatial_type) {
                    case "polygon":
                        // Check if the mouse is within the polygon
                        if (GeometricUtils.point_is_within_polygon_annotation([gblx, gbly], annotation)) {
                            found_perfect_match = true;
                        }
                        break;
                    case "bbox":
                    case "point":
                        if (
                            gblx >= cbox["tlx"] &&
                            gblx <= cbox["brx"] &&
                            gbly >= cbox["tly"] &&
                            gbly <= cbox["bry"]
                        ) {
                            found_perfect_match = true;
                        }
                        break;
                    default:
                        boxsize = (cbox["brx"] - cbox["tlx"]) * (cbox["bry"] - cbox["tly"]);
                        if (boxsize < minsize) {
                            minsize = boxsize;
                            ret["best"] = {
                                annid: annotation_id,
                            };
                        }
                        break;
                }

                if (!found_perfect_match) {
                    ret["candidate_ids"].push(annotation_id);
                } else {
                    // This should be the only candidate
                    ret["candidate_ids"] = [annotation_id];
                    ret["best"] = {
                        annid: annotation_id,
                    };
                    break;
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
    suggest_edits(mouse_event = null, nonspatial_id = null, force_refresh = false) {
        const current_subtask = this.get_current_subtask();
        // Don't show any dialogs when currently drawing/editing an annotation,
        // And hide just edit dialogs when moving
        if (
            current_subtask["state"]["is_in_progress"] ||
            current_subtask["state"]["starting_complex_polygon"] ||
            current_subtask["state"]["is_in_brush_mode"] ||
            current_subtask["state"]["is_in_edit"]
        ) {
            return this.hide_edits();
        } else if (
            current_subtask["state"]["is_in_move"]
        ) {
            return this.hide_edit_suggestion_during_move();
        }

        let best_candidate = null;
        if (nonspatial_id !== null) {
            best_candidate = {
                annid: nonspatial_id,
            };
        }

        if (best_candidate === null) {
            // Get mouse event from last move if not provided
            if (mouse_event === null) {
                if (this.state["last_move"] !== null) {
                    mouse_event = this.state["last_move"];
                } else {
                    return;
                }
            }

            const dst_thresh = this.config["edit_handle_size"] / 2;
            const global_x = this.get_global_mouse_x(mouse_event);
            const global_y = this.get_global_mouse_y(mouse_event);

            // Ignore when we're already hovering an edit
            if (
                !force_refresh &&
                $(mouse_event.target).hasClass("gedit-target")
            ) {
                return;
            }

            const edit_candidates = this.get_edit_candidates(
                global_x,
                global_y,
                dst_thresh,
            );

            if (edit_candidates["best"] === null) {
                return this.hide_and_clear_action_candidates();
            }

            // Show global edit dialogs for "best" candidate
            best_candidate = edit_candidates["best"];

            // Look for an existing point that's close enough to suggest editing it
            const nearest_active_keypoint = this.get_nearest_active_keypoint(global_x, global_y, dst_thresh, edit_candidates["candidate_ids"]);
            if (nearest_active_keypoint != null && nearest_active_keypoint.point != null) {
                this.show_edit_suggestion(nearest_active_keypoint, true);
                best_candidate = nearest_active_keypoint;
            } else {
                // If none are found, look for a point along a segment that's close enough
                // else, we should hide the suggestion
                const nearest_segment_point = this.get_nearest_segment_point(global_x, global_y, Infinity, edit_candidates["candidate_ids"]);
                if (nearest_segment_point != null && nearest_segment_point.point != null) {
                    this.show_edit_suggestion(nearest_segment_point, false);
                    best_candidate = nearest_segment_point;
                } else {
                    this.hide_edit_suggestion();
                }
            }

            // Only spatial annotations can be moved
            current_subtask["state"]["move_candidate"] = best_candidate;
        }

        // Both spatial/non-spatial can have the global suggestions
        this.show_global_edit_suggestion(best_candidate.annid, null, nonspatial_id);
        current_subtask["state"]["edit_candidate"] = best_candidate;

        // Must be called after active_annotation is updated
        this.update_confidence_dialog();
    }

    hide_edits() {
        this.hide_global_edit_suggestion();
        this.hide_edit_suggestion();
    }

    hide_and_clear_action_candidates() {
        this.hide_edits();
        this.get_current_subtask()["state"]["edit_candidate"] = null;
        this.get_current_subtask()["state"]["move_candidate"] = null;
    }

    hide_edit_suggestion_during_move() {
        // Hide edit suggestions
        this.hide_edit_suggestion();
        // Render annotation dialogs with offset
        this.show_global_edit_suggestion(
            this.get_current_subtask()["state"]["move_candidate"]["annid"],
            this.get_current_subtask()["state"]["move_candidate"]["offset"],
        );
    }

    // ================= Mouse event interpreters =================

    // Get the mouse position on the screen
    get_global_mouse_x(mouse_event) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (mouse_event.pageX - annbox.offset().left + annbox.scrollLeft()) / scale;
        return raw;
    }

    get_global_mouse_y(mouse_event) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (mouse_event.pageY - annbox.offset().top + annbox.scrollTop()) / scale;
        return raw;
    }

    /**
     * Get the mouse position, clamped to the image bounds if `allow_annotations_outside_image` is false.
     *
     * @param {*} mouse_event The mouse event to get the position from
     * @returns {[number, number]} The (x, y) coordinates of the mouse, clamped to the image bounds if required
     */
    get_image_aware_mouse_x_y(mouse_event) {
        const x = this.get_global_mouse_x(mouse_event);
        const y = this.get_global_mouse_y(mouse_event);
        let ret = [x, y];

        // Fit inside image bounds
        if (
            !this.config.allow_annotations_outside_image &&
            !DELETE_MODES.includes(this.get_current_subtask()["state"]["annotation_mode"])
        ) {
            ret = GeometricUtils.clamp_point_to_image(ret, this.config["image_width"], this.config["image_height"]);
        }

        return ret;
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
        let idd = $("#" + this.get_current_subtask()["state"]["idd_id"]);
        if (front) {
            idd = $("#" + this.get_current_subtask()["state"]["idd_id_front"]);
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
        let class_ids = this.get_current_subtask()["class_ids"];

        // Get the index of that class currently hovering over
        const class_ind = (
            -1 * Math.floor(
                Math.atan2(idd_y, idd_x) / (2 * Math.PI) * class_ids.length,
            ) + class_ids.length
        ) % class_ids.length;

        // Get the distance proportion of the hover
        let dist_prop = (mouse_rad - inner_rad) / (outer_rad - inner_rad);

        return {
            class_ind: class_ind,
            dist_prop: dist_prop,
        };
    }

    set_id_dialog_payload_nopin(class_ind, dist_prop) {
        let class_ids = this.get_current_subtask()["class_ids"];
        // Recompute and render opaque pie slices
        for (var i = 0; i < class_ids.length; i++) {
            if (i === class_ind) {
                this.get_current_subtask()["state"]["id_payload"][i] = {
                    class_id: class_ids[i],
                    confidence: dist_prop,
                };
            } else {
                this.get_current_subtask()["state"]["id_payload"][i] = {
                    class_id: class_ids[i],
                    confidence: (1 - dist_prop) / (class_ids.length - 1),
                };
            }
        }
    }

    // Grab the active class id from the toolbox
    get_active_class_id() {
        const pfx = "div#tb-id-app--" + this.get_current_subtask_key();
        const idarr = $(pfx + " a.tbid-opt.sel").attr("id").split("_");
        return parseInt(idarr[idarr.length - 1]);
    }

    get_active_class_id_idx() {
        const class_ids = this.get_current_subtask()["class_ids"];
        return class_ids.indexOf(this.get_active_class_id());
    }

    set_id_dialog_payload_to_init(annid, pyld = null) {
        // TODO(3D)
        if (pyld != null) {
            this.get_current_subtask()["state"]["id_payload"] = JSON.parse(JSON.stringify(pyld));
            this.update_id_toolbox_display();
        } else {
            if (annid != null) {
                let anpyld = this.get_current_subtask()["annotations"]["access"][annid]["classification_payloads"];
                if (anpyld != null) {
                    this.get_current_subtask()["state"]["id_payload"] = JSON.parse(JSON.stringify(anpyld));
                    return;
                }
            }
            // TODO currently assumes soft
            if (!this.config["allow_soft_id"]) {
                const dist_prop = 1.0;
                const class_ids = this.get_current_subtask()["class_ids"];
                const class_ind = this.get_active_class_id_idx();
                // Recompute and render opaque pie slices
                for (var i = 0; i < class_ids.length; i++) {
                    if (i === class_ind) {
                        this.get_current_subtask()["state"]["id_payload"][i] = {
                            class_id: class_ids[i],
                            confidence: dist_prop,
                        };
                    } else {
                        this.get_current_subtask()["state"]["id_payload"][i] = {
                            class_id: class_ids[i],
                            confidence: (1 - dist_prop) / (class_ids.length - 1),
                        };
                    }
                }
            } else {
                // Not currently supported
            }
        }
    }

    update_id_dialog_display(front = false) {
        const inner_rad = this.config["inner_prop"] * this.config["outer_diameter"] / 2;
        const outer_rad = 0.5 * this.config["outer_diameter"];
        let class_ids = this.get_current_subtask()["class_ids"];
        for (var i = 0; i < class_ids.length; i++) {
            // Skip
            let srt_prop = this.get_current_subtask()["state"]["id_payload"][i]["confidence"];

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
                idd_id = this.get_current_subtask()["state"]["idd_id"];
            } else {
                idd_id = this.get_current_subtask()["state"]["idd_id_front"];
            }
            var circ = $(`#${idd_id}__circ_` + class_ids[i]);
            // circ.attr("r", rad_frnt);
            // circ.attr("stroke-dasharray", `${srk_frnt} ${gap_frnt}`)
            // circ.attr("stroke-dashoffset", off_frnt)
            // circ.attr("stroke-width", wdt_frnt)
            // circ = $(`#${idd_id}__circ_` + class_ids[i])
            circ.attr("r", rad_frnt);
            circ.attr("stroke-dasharray", `${srk_frnt} ${gap_frnt}`);
            circ.attr("stroke-dashoffset", off_frnt);
            circ.attr("stroke-width", wdt_frnt);
        }
        this.redraw_demo();
    }

    // Toolbox Annotation ID Update
    update_id_toolbox_display(new_class_idx = null) {
        if (this.config["allow_soft_id"]) {
            // Not supported yet
        } else {
            let class_ids = this.get_current_subtask()["class_ids"];
            if (new_class_idx === null) {
                let id_payload = this.get_current_subtask()["state"]["id_payload"];
                // Get the id payload with the highest confidence
                let max_conf = 0;
                let new_class_id = null;
                for (var i = 0; i < id_payload.length; i++) {
                    // Select the class with the highest confidence
                    if (id_payload[i]["confidence"] > max_conf) {
                        max_conf = id_payload[i]["confidence"];
                        new_class_id = id_payload[i]["class_id"];
                        if (max_conf === 1.0) {
                            break;
                        }
                    }
                }
                // Get the index of the new class
                new_class_idx = class_ids.indexOf(new_class_id);
            }

            // Select the desired class by clicking on the toolbox selector
            $(`#toolbox_sel_${class_ids[new_class_idx]}`).trigger("click");
        }
    }

    handle_id_dialog_hover(mouse_event, pos_evt = null) {
        // Grab current subtask
        const current_subtask = this.subtasks[this.state.current_subtask];

        // Determine which dialog
        let front = current_subtask.state.idd_which === "front";
        if (pos_evt === null) {
            pos_evt = this.lookup_id_dialog_mouse_pos(mouse_event, front);
        }

        if (pos_evt !== null) {
            if (!this.config["allow_soft_id"]) {
                pos_evt.dist_prop = 1.0;
            }
            // TODO This assumes no pins
            this.set_id_dialog_payload_nopin(pos_evt.class_ind, pos_evt.dist_prop);
            this.update_id_dialog_display(front);
        }
    }

    assign_annotation_id(annotation_id = null, redo_payload = null) {
        const current_subtask = this.get_current_subtask();
        let new_payload, old_payload;
        let redoing = false;
        // TODO(3d)
        if (redo_payload === null) {
            if (annotation_id === null) {
                annotation_id = current_subtask["state"]["idd_associated_annotation"];
            }
            old_payload = current_subtask["annotations"]["access"][annotation_id]["classification_payloads"];
            new_payload = current_subtask["state"]["id_payload"];
        } else {
            redoing = true;
            old_payload = redo_payload.old_id_payload;
            new_payload = redo_payload.new_id_payload;
        }

        // Perform assignment
        current_subtask["annotations"]["access"][annotation_id]["classification_payloads"] = JSON.parse(JSON.stringify(new_payload));

        // Explicit changes are undoable
        // First assignments are treated as though they were done all along
        if (current_subtask["state"]["first_explicit_assignment"]) {
            let n = current_subtask["actions"]["stream"].length;
            for (var i = 0; i < n; i++) {
                if (current_subtask["actions"]["stream"][n - i - 1].act_type === "begin_annotation") {
                    // Parse the payload, edit, and then stringify
                    let redo_payload = JSON.parse(current_subtask["actions"]["stream"][n - i - 1].redo_payload);
                    redo_payload.init_payload = new_payload;
                    current_subtask["actions"]["stream"][n - i - 1].redo_payload = JSON.stringify(redo_payload);
                    break;
                }
            }
        } else {
            record_action(this, {
                act_type: "assign_annotation_id",
                annotation_id: annotation_id,
                undo_payload: {
                    old_id_payload: old_payload,
                },
                redo_payload: {
                    old_id_payload: old_payload,
                    new_id_payload: new_payload,
                },
            }, redoing);
        }
    }

    assign_annotation_id__undo(annotation_id, undo_payload) {
        // Restore the old payload
        this.get_current_subtask()["annotations"]["access"][annotation_id]["classification_payloads"] = undo_payload.old_id_payload;
    }

    handle_id_dialog_click(mouse_event, annotation_id = null, new_class_idx = null) {
        const current_subtask = this.get_current_subtask();

        // Handle explicitly setting the class
        if (new_class_idx !== null) {
            const pos_evt = { class_ind: new_class_idx, dist_prop: 1.0 };
            this.handle_id_dialog_hover(mouse_event, pos_evt);
        }
        // TODO need to differentiate between first click and a reassign -- potentially with global state
        this.assign_annotation_id(annotation_id);
        current_subtask["state"]["first_explicit_assignment"] = false;
    }

    // Update the displayed annotation confidence
    update_confidence_dialog() {
        // Whenever the mouse makes the dialogs show up, update the displayed annotation confidence.
        const current_subtask = this.get_current_subtask();
        const active_annotation_id = current_subtask["state"]["edit_candidate"]["annid"];
        const active_annotation = current_subtask["annotations"]["access"][active_annotation_id];
        /** The active annotation's classification payloads. */
        const aacp = active_annotation["classification_payloads"];

        // Keep track of highest payload confidence
        let confidence = 0;
        aacp.forEach((payload) => {
            if (payload.confidence > confidence) {
                confidence = payload.confidence;
            }
        });

        // Update the display dialog with the annotation's confidence
        $(".annotation-confidence-value").text(confidence);
    }

    // ================= Viewer/Annotation Interaction Handlers  =================

    handle_mouse_down(mouse_event) {
        const drag_key = ULabel.get_drag_key_start(mouse_event, this);
        if (drag_key != null) {
            // Don't start new drag while id_dialog is visible
            if (this.get_current_subtask()["state"]["idd_visible"] && !this.get_current_subtask()["state"]["idd_thumbnail"]) {
                return;
            }
            mouse_event.preventDefault();
            if (this.drag_state["active_key"] === null) {
                this.start_drag(drag_key, mouse_event.button, mouse_event);
            }
        }
    }

    handle_mouse_move(mouse_event) {
        const annotation_mode = this.get_current_subtask()["state"]["annotation_mode"];
        const idd_visible = this.get_current_subtask()["state"]["idd_visible"];
        const idd_thumbnail = this.get_current_subtask()["state"]["idd_thumbnail"];
        const edit_candidate = this.get_current_subtask()["state"]["edit_candidate"];
        this.state["last_move"] = mouse_event;
        // If the ID dialog is visible, let it's own handler take care of this
        // If not dragging...
        if (this.drag_state["active_key"] === null) {
            if (idd_visible && !idd_thumbnail) {
                return;
            }
            // If polygon is in progress, redirect last segment
            if (this.get_current_subtask()["state"]["is_in_progress"]) {
                if (
                    (annotation_mode === "polygon") ||
                    (annotation_mode === "polyline") ||
                    (annotation_mode === "delete_polygon")
                ) {
                    this.continue_annotation(mouse_event);
                }
            } else if (this.get_current_subtask()["state"]["is_in_brush_mode"]) {
                // If brush mode is in progress, move the brush
                let gmx = this.get_global_mouse_x(mouse_event);
                let gmy = this.get_global_mouse_y(mouse_event);
                this.move_brush_circle(gmx, gmy);
            } else if (mouse_event.shiftKey && annotation_mode === "polygon" && idd_visible && edit_candidate != null) {
                // If shift key is held while hovering a polygon, we want to start a new complex payload

                // set annotation as active, in_progress, and starting_complex_polygon
                this.get_current_subtask()["state"]["active_id"] = edit_candidate["annid"];
                this.start_complex_polygon();
            } else { // Nothing in progress. Maybe show editable queues
                this.suggest_edits(mouse_event);
            }
        } else { // Dragging
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
                    if (this.get_current_subtask()["state"]["is_in_progress"]) {
                        this.continue_brush(mouse_event);
                    } else {
                        // If not, see if we should start
                        this.begin_brush(mouse_event);
                    }
                    break;
                case "edit":
                    if (!idd_visible || idd_thumbnail) {
                        this.continue_edit(mouse_event);
                    }
                    break;
                case "move":
                    if (!idd_visible || idd_thumbnail) {
                        this.continue_move(mouse_event);
                    }
                    break;
            }
        }
    }

    handle_mouse_up(mouse_event) {
        if (mouse_event.button === this.drag_state["release_button"]) {
            mouse_event.preventDefault();
            this.end_drag(mouse_event);
        }
    }

    handle_aux_click(mouse_event) {
        // Prevent default
        mouse_event.preventDefault();
    }

    /**
     * Handler for "wheel" event listener
     *
     * @param {*} wheel_event
     */
    handle_wheel(wheel_event) {
        // Prevent scroll-zoom
        wheel_event.preventDefault();
        let fms = this.config["image_data"].frames.length > 1;
        if (wheel_event.altKey) {
            // When in brush mode, change the brush size
            if (this.get_current_subtask()["state"]["is_in_brush_mode"]) {
                this.change_brush_size(wheel_event.deltaY < 0 ? 1.1 : 1 / 1.1);
            }
        } else if (fms && (wheel_event.ctrlKey || wheel_event.shiftKey || wheel_event.metaKey)) {
            // Get direction of wheel
            const dlta = Math.sign(wheel_event.deltaY);
            this.update_frame(dlta);
        } else {
            // Don't scroll if id dialog is visible
            if (this.get_current_subtask()["state"]["idd_visible"] && !this.get_current_subtask()["state"]["idd_thumbnail"]) {
                return;
            }

            // Get direction of wheel
            const dlta = Math.sign(wheel_event.deltaY);

            // Apply new zoom
            this.state["zoom_val"] *= (1 - dlta / 5);
            this.rezoom(wheel_event.clientX, wheel_event.clientY);

            // Only try to update the overlay if it exists
            this.filter_distance_overlay?.draw_overlay();
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
            this.state["current_frame"],
        ];
        this.drag_state[drag_key]["zoom_val_start"] = this.state["zoom_val"];
        this.drag_state[drag_key]["offset_start"] = [
            annbox.scrollLeft(),
            annbox.scrollTop(),
        ];
        $(`textarea`).trigger("blur");
        $("div.permopen").removeClass("permopen");
        // TODO handle this drag start
        let annmd;
        switch (drag_key) {
            case "annotation":
                annmd = this.get_current_subtask()["state"]["annotation_mode"];
                if (!NONSPATIAL_MODES.includes(annmd) && !this.get_current_subtask()["state"]["is_in_progress"]) {
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
        const annotation_mode = this.get_current_subtask()["state"]["annotation_mode"];
        const active_id = this.get_current_subtask()["state"]["active_id"];
        let spatial_payload, n_points, active_spatial_payload;
        switch (this.drag_state["active_key"]) {
            case "annotation":
                if (active_id != null) {
                    spatial_payload = this.get_current_subtask()["annotations"]["access"][active_id]["spatial_payload"];
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
                            !this.get_current_subtask()["state"]["starting_complex_polygon"] &&
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
            this.drag_state["pan"]["offset_start"][0] + (this.drag_state["pan"]["mouse_start"][0] - aX),
        );
        annbox.scrollTop(
            this.drag_state["pan"]["offset_start"][1] + (this.drag_state["pan"]["mouse_start"][1] - aY),
        );
    }

    // Handle zooming by click-drag
    drag_rezoom(mouse_event) {
        const aY = mouse_event.clientY;
        this.state["zoom_val"] = (
            this.drag_state["zoom"]["zoom_val_start"] * Math.pow(
                1.1, -(aY - this.drag_state["zoom"]["mouse_start"][1]) / 10,
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
        this.filter_distance_overlay?.resize_canvas(new_width, new_height);

        // Apply new size to an active polygon ender
        this.resize_active_polygon_ender();

        // Compute and apply new position
        let new_left, new_top;
        if (abs) {
            new_left = foc_x * new_width / old_width - viewport_width / 2;
            new_top = foc_y * new_height / old_height - viewport_height / 2;
        } else {
            new_left = (old_left + foc_x) * new_width / old_width - foc_x;
            new_top = (old_top + foc_y) * new_height / old_height - foc_y;
        }
        annbox.scrollLeft(new_left);
        annbox.scrollTop(new_top);

        // Redraw demo annotation
        this.redraw_demo();

        // Redraw all annotations if size mode is not "fixed" to render them at their new size
        if (this.state.anno_scaling_mode === "inverse-zoom" || this.state.anno_scaling_mode === "match-zoom") {
            this.redraw_all_annotations();
        }
    }

    // Shake the screen
    shake_screen() {
        if (!this.is_shaking) {
            const annbox = $("#" + this.config["annbox_id"]);
            const old_top = annbox.scrollTop();
            const shake_distance = 10; // pixels
            const shake_duration = 150; // milliseconds
            const shake_interval = 25; // milliseconds
            let shake_count = 0;
            this.is_shaking = true;
            const shake = setInterval(() => {
                if (shake_count < shake_duration / shake_interval) {
                    // Alternate between shaking up and down
                    if (shake_count % 2 === 0) {
                        annbox.scrollTop(old_top + shake_distance);
                    } else {
                        annbox.scrollTop(old_top - shake_distance);
                    }
                } else {
                    // Stop shaking and reset position
                    clearInterval(shake);
                    annbox.scrollTop(old_top);
                    this.is_shaking = false;
                }
                shake_count++;
            }, shake_interval);
        }
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
        return ret;
    }

    reset_interaction_state(subtask = null) {
        let q = [];
        if (subtask === null) {
            for (let st in this.subtasks) {
                q.push(st);
            }
        } else {
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
            // TODO (joshua-dean): this line was probably a mistake
            // It's at least 3 years old, and is a nop as far as I can tell
            // this.show
        }
        this.drag_state = {
            active_key: null,
            release_button: null,
            annotation: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            edit: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            pan: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            zoom: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            move: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
            right: {
                mouse_start: null, // Screen coordinates where the current mouse drag started
                offset_start: null, // Scroll values where the current mouse drag started
                zoom_val_start: null, // zoom_val when the dragging interaction started
            },
        };
    }

    // Allow for external access and modification of annotations within a subtask
    get_annotations(subtask) {
        let ret = [];
        for (let i = 0; i < this.subtasks[subtask]["annotations"]["ordering"].length; i++) {
            let id = this.subtasks[subtask]["annotations"]["ordering"][i];
            if (id != this.get_current_subtask()["state"]["active_id"]) {
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
                this.destroy_annotation_context(id, subtask);
            }
        }
        // Set new annotations and initialize canvases
        ULabel.process_resume_from(this, subtask, { resume_from: new_annotations });
        initialize_annotation_canvases(this, subtask);
        // Redraw all annotations to render them
        this.redraw_all_annotations(subtask);
        // Calculate distances for all annotations if FilterDistance is present
        this.update_filter_distance(null, false, true);
        // Update class counter in toolbox
        this.toolbox.redraw_update_items(this);
    }

    // Change frame
    update_frame(delta = null, new_frame = null) {
        if (this.config["image_data"]["frames"].length === 1) {
            return;
        }
        let actid = this.get_current_subtask()["state"]["active_id"];
        if (actid != null) {
            if (!MODES_3D.includes(this.get_current_subtask()["annotations"]["access"][actid]["spatial_type"])) {
                return;
            }
        }
        if (new_frame === null) {
            new_frame = parseInt($(`div#${this.config["toolbox_id"]} input.frame_input`).val());
            if (delta != null) {
                new_frame = Math.min(Math.max(new_frame + delta, 0), this.config["image_data"].frames.length - 1);
            }
        } else {
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
                this.get_current_subtask()["annotations"]["access"][actid]["spatial_type"],
            )
        ) {
            if (this.get_current_subtask()["state"]["is_in_edit"]) {
                this.continue_edit(this.state["last_move"]);
            } else if (this.get_current_subtask()["state"]["is_in_move"]) {
                this.continue_move(this.state["last_move"]);
            } else if (this.get_current_subtask()["state"]["is_in_progress"]) {
                this.continue_annotation(this.state["last_move"]);
            } else {
                this.redraw_all_annotations();
            }
        } else {
            this.redraw_all_annotations();
        }

        this.suggest_edits();
    }

    // Generic Callback Support
    on(fn, callback) {
        var old_fn = fn.bind(this);
        this[fn.name] = (...args) => {
            old_fn(...args);
            callback();
        };
    }
}

window.ULabel = ULabel;
export default ULabel;
