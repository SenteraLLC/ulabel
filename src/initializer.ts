/**
 * ULabel initializer utilities and logic.
 *
 * This also includes "staggered" initializers to test loading.
 */

import { ULabel } from "..";
import { initialize_annotation_canvases } from "./canvas_utils";
import { NightModeCookie } from "./cookies";
import { log_message, LogLevel } from "./error_logging";
import { add_style_to_document, build_confidence_dialog, build_edit_suggestion, build_id_dialogs, prep_window_html } from "./html_builder";
import { create_ulabel_listeners } from "./listeners";
import { ULabelLoader } from "./loader";

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
 * Standard ULabel initializer.
 *
 * @param ulabel ULabel instance to initialize.
 * @param callback User-provided callback to run after initialization.
 */
export function ulabel_init(
    ulabel: ULabel,
    callback: () => void,
) {
    // Add stylesheet
    add_style_to_document(ulabel);

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
    first_bg_img.decode().then(() => {
        make_image_canvases(ulabel, first_bg_img);

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

        ulabel.handle_toolbox_overflow();

        // Set the canvas elements in the correct stacking order given current subtask
        ulabel.set_subtask(
            ulabel.state["current_subtask"],
        );

        ulabel.create_overlays();

        // Indicate that the object is now init!
        ulabel.is_init = true;
        $(`div#${ulabel.config["container_id"]}`).css("display", "block");

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
        callback();
    }).catch((err) => {
        console.log(err);
        log_message(
            "Unable to load images: " + JSON.stringify(err),
            LogLevel.ERROR,
        );
    });

    // Final code to be called after the object is initialized
    ulabel.after_init();

    console.log(`Time taken to construct and initialize: ${Date.now() - ulabel.begining_time}`);
}

/**
 * Delay function for staggered loading.
 * @param ms Milliseconds to delay.
 * @returns Promise<void> after delay.
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initializer for ULabel with staggered waits to visually show the loading process.
 *
 * @param ulabel ULabel instance to initialize.
 * @param user_callback User-provided callback to run after initialization.`
 * @param interval Interval between each step in the initialization process.
 */
export async function staggered_ulabel_init(
    ulabel: ULabel,
    user_callback: () => void,
    interval: number = 250,
) {
    // Add stylesheet
    add_style_to_document(ulabel);

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
    await delay(interval);

    const first_bg_img = <HTMLImageElement>document.getElementById(`${ulabel.config["image_id_pfx"]}__0`);
    await first_bg_img.decode();
    await delay(interval);

    make_image_canvases(ulabel, first_bg_img);
    await delay(interval);

    // This step is hoisted up to show the container before the rest of the initialization
    $(`div#${ulabel.config["container_id"]}`).css("display", "block");
    await delay(interval);

    // Create the annotation canvases for the resume_from annotations
    initialize_annotation_canvases(ulabel);
    await delay(interval);

    // Add the ID dialogs' HTML to the document
    build_id_dialogs(ulabel);
    await delay(interval);

    // Add the HTML for the edit suggestion to the window
    build_edit_suggestion(ulabel);
    await delay(interval);

    // Add dialog to show annotation confidence
    build_confidence_dialog(ulabel);
    await delay(interval);

    // Create listers to manipulate and export this object
    create_ulabel_listeners(ulabel);
    await delay(interval);

    ulabel.handle_toolbox_overflow();
    await delay(interval);

    // Set the canvas elements in the correct stacking order given current subtask
    ulabel.set_subtask(
        ulabel.state["current_subtask"],
    );
    await delay(interval);

    ulabel.create_overlays();
    await delay(interval);

    // Indicate that the object is now init!
    ulabel.is_init = true;
    await delay(interval);

    ulabel.show_initial_crop();
    await delay(interval);

    ulabel.update_frame();
    await delay(interval);

    // Draw demo annotation
    ulabel.redraw_demo();
    await delay(interval);

    // Draw resumed from annotations
    ulabel.redraw_all_annotations();
    await delay(interval);

    // Update class counter
    ulabel.toolbox.redraw_update_items(ulabel);
    await delay(interval);

    ULabelLoader.remove_loader_div();

    // Call the user-provided callback
    user_callback();
    ulabel.after_init();
    console.log(`Time taken to construct and initialize: ${Date.now() - ulabel.begining_time}`);
}
