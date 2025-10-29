/**
 * ULabel initializer utilities and logic.
 *
 * This also includes "staggered" initializers to test loading.
 */

// Import ULabel from ../src/index - TypeScript will find ../src/index.d.ts for types
import { ULabel } from "../src/index";
import { initialize_annotation_canvases } from "./canvas_utils";
import { NightModeCookie } from "./cookies";
import { add_style_to_document, build_confidence_dialog, build_edit_suggestion, build_id_dialogs, prep_window_html } from "./html_builder";
import { create_ulabel_listeners } from "./listeners";
import { ULabelLoader } from "./loader";
import { ULabelSubtask } from "./subtask";
import { ULabelAnnotation } from "./annotation";
import { get_local_storage_item } from "./utilities";

/**
 * Make canvases for each subtask
 *
 * @param ulabel ULabel instance to create canvases for
 * @param loaded_img Single loaded image for sizing
 */
function make_image_canvases(
    ulabel: ULabel,
    loaded_img: HTMLImageElement,
) {
    // Store image dimensions
    ulabel.config["image_height"] = loaded_img.naturalHeight;
    ulabel.config["image_width"] = loaded_img.naturalWidth;

    // Add canvases for each subtask and get their rendering contexts
    for (const st in ulabel.subtasks) {
        $("#" + ulabel.config["imwrap_id"]).append(`
        <div id="canvasses__${st}" class="canvasses">
            <canvas 
                id="${ulabel.subtasks[st]["canvas_bid"]}" 
                class="${ulabel.config["canvas_class"]} ${ulabel.config["imgsz_class"]} canvas_cls" 
                height=${ulabel.config["image_height"] * ulabel.config["px_per_px"]} 
                width=${ulabel.config["image_width"] * ulabel.config["px_per_px"]}></canvas>
            <canvas 
                id="${ulabel.subtasks[st]["canvas_fid"]}" 
                class="${ulabel.config["canvas_class"]} ${ulabel.config["imgsz_class"]} canvas_cls" 
                height=${ulabel.config["image_height"] * ulabel.config["px_per_px"]} 
                width=${ulabel.config["image_width"] * ulabel.config["px_per_px"]} 
                oncontextmenu="return false"></canvas>
            <div id="dialogs__${st}" class="dialogs_container"></div>
        </div>
        `);
        $("#" + ulabel.config["container_id"] + ` div#fad_st__${st}`).append(`
            <div id="front_dialogs__${st}" class="front_dialogs"></div>
        `);

        // Get canvas contexts
        const canvas_bid = <HTMLCanvasElement>document.getElementById(ulabel.subtasks[st]["canvas_bid"]);
        const canvas_fid = <HTMLCanvasElement>document.getElementById(ulabel.subtasks[st]["canvas_fid"]);
        ulabel.subtasks[st]["state"]["back_context"] = canvas_bid.getContext("2d");
        ulabel.subtasks[st]["state"]["front_context"] = canvas_fid.getContext("2d");
    }
}

/**
 * Store original keybinds before customization
 *
 * @param ulabel ULabel instance to store original keybinds for
 */
function store_original_keybinds(ulabel: ULabel) {
    // Store original config keybinds (from constructor, before localStorage)
    const original_config_keybinds: { [config_key: string]: string } = {};
    const keybind_keys = [
        "reset_zoom_keybind",
        "create_point_annotation_keybind",
        "delete_annotation_keybind",
        "switch_subtask_keybind",
        "toggle_annotation_mode_keybind",
        "create_bbox_on_initial_crop",
        "toggle_brush_mode_keybind",
        "toggle_erase_mode_keybind",
        "increase_brush_size_keybind",
        "decrease_brush_size_keybind",
        "fly_to_next_annotation_keybind",
        "fly_to_previous_annotation_keybind",
        "annotation_size_small_keybind",
        "annotation_size_large_keybind",
        "annotation_size_plus_keybind",
        "annotation_size_minus_keybind",
        "annotation_vanish_keybind",
    ];

    for (const key of keybind_keys) {
        if (key in ulabel.config) {
            original_config_keybinds[key] = ulabel.config[key] as string;
        }
    }
    ulabel.state["original_config_keybinds"] = original_config_keybinds;

    // Store original class keybinds in the ULabel state for later reference
    const original_class_keybinds: { [class_id: number]: string } = {};
    for (const subtask_key in ulabel.subtasks) {
        const subtask = ulabel.subtasks[subtask_key];
        if (subtask.class_defs) {
            for (const class_def of subtask.class_defs) {
                if (class_def.keybind !== null) {
                    original_class_keybinds[class_def.id] = class_def.keybind;
                }
            }
        }
    }
    ulabel.state["original_class_keybinds"] = original_class_keybinds;
}

/**
 * Restore custom keybinds from localStorage
 *
 * @param ulabel ULabel instance to restore keybinds for
 */
function restore_custom_keybinds(ulabel: ULabel) {
    // First, store the original keybinds before applying customizations
    store_original_keybinds(ulabel);

    // Restore regular keybinds
    const stored_keybinds = get_local_storage_item("ulabel_custom_keybinds");
    if (stored_keybinds) {
        try {
            const custom_keybinds = JSON.parse(stored_keybinds);
            for (const [config_key, value] of Object.entries(custom_keybinds)) {
                if (config_key in ulabel.config) {
                    ulabel.config[config_key] = value as string;
                }
            }
        } catch (e) {
            console.error("Failed to parse custom keybinds from localStorage:", e);
        }
    }

    // Restore class keybinds
    const stored_class_keybinds = get_local_storage_item("ulabel_custom_class_keybinds");
    if (stored_class_keybinds) {
        try {
            const custom_class_keybinds = JSON.parse(stored_class_keybinds);
            for (const subtask_key in ulabel.subtasks) {
                const subtask = ulabel.subtasks[subtask_key];
                if (subtask.class_defs) {
                    for (const class_def of subtask.class_defs) {
                        if (class_def.id in custom_class_keybinds) {
                            class_def.keybind = custom_class_keybinds[class_def.id];
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Failed to parse custom class keybinds from localStorage:", e);
        }
    }
}

/**
 * ULabel initializer logic.
 * Async to ensure correct processing order; many steps are dependent on knowing the image/canvas size.
 *
 * @param ulabel ULabel instance to initialize.
 * @param user_callback User-provided callback to run after initialization.`
 */
export async function ulabel_init(
    ulabel: ULabel,
    user_callback: () => void,
) {
    // Add stylesheet
    add_style_to_document(ulabel);

    // Restore custom keybinds from localStorage
    restore_custom_keybinds(ulabel);

    // Set current subtask to first subtask
    ulabel.state["current_subtask"] = Object.keys(ulabel.subtasks)[0];

    // Place image element
    prep_window_html(
        ulabel,
        ulabel.config.toolbox_order,
    );

    // Detect night cookie
    if (NightModeCookie.exists_in_document()) {
        $("#" + ulabel.config["container_id"]).addClass("ulabel-night");
    }
    const first_bg_img = <HTMLImageElement>document.getElementById(`${ulabel.config["image_id_pfx"]}__0`);
    await first_bg_img.decode();

    make_image_canvases(ulabel, first_bg_img);

    // Once the image dimensions are known, we can resize annotations if needed
    if (!ulabel.config.allow_annotations_outside_image) {
        const image_height = ulabel.config["image_height"];
        const image_width = ulabel.config["image_width"];
        for (const subtask of Object.values(ulabel.subtasks) as ULabelSubtask[]) {
            for (const anno of Object.values(subtask.annotations.access) as ULabelAnnotation[]) {
                anno.clamp_annotation_to_image_bounds(image_width, image_height);
            }
        }
    }

    // This step is hoisted up to show the container before the rest of the initialization
    $(`div#${ulabel.config["container_id"]}`).css("display", "block");

    // Create the annotation canvases for the resume_from annotations
    initialize_annotation_canvases(ulabel);

    // Add the ID dialogs' HTML to the document
    build_id_dialogs(ulabel);

    // Add the HTML for the edit suggestion to the window
    build_edit_suggestion(ulabel);

    // Add dialog to show annotation confidence
    build_confidence_dialog(ulabel);

    // Create listers to manipulate and export this object
    create_ulabel_listeners(ulabel);

    // Restore toolbox collapsed state from localStorage
    const is_collapsed = get_local_storage_item("ulabel_toolbox_collapsed");
    if (is_collapsed === "true") {
        const toolbox = $("#" + ulabel.config["toolbox_id"]);
        const btn = toolbox.find(".toolbox-collapse-btn");
        toolbox.addClass("collapsed");
        btn.text("▶");
        btn.attr("title", "Expand toolbox");
    }

    ulabel.handle_toolbox_overflow();

    // Set the canvas elements in the correct stacking order given current subtask
    ulabel.set_subtask(
        ulabel.state["current_subtask"],
    );

    ulabel.create_overlays();

    // Indicate that the object is now init!
    ulabel.is_init = true;

    ulabel.show_initial_crop();
    ulabel.update_frame();

    // Draw demo annotation
    ulabel.redraw_demo();

    // Draw resumed from annotations
    ulabel.redraw_all_annotations();

    // Update class counter
    ulabel.toolbox.redraw_update_items(ulabel);

    ULabelLoader.remove_loader_div();

    // Call the user-provided callback
    user_callback();
    ulabel.after_init();
    console.log(`Time taken to construct and initialize: ${Date.now() - ulabel.begining_time}`);
}
