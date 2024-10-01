/**
 * ULabel initializer utilities and logic.
 * 
 * This also includes "staggered" initializers to test loading.
 */

import { ULabel } from "..";
import { add_style_to_document, build_confidence_dialog, build_edit_suggestion, build_id_dialogs, prep_window_html } from "./html_builder";
import { ULabelLoader } from "./loader";

/**
 * Standard ULabel initializer.
 * 
 * @param ulabel ULabel instance to initialize.
 * @param callback User-provided callback to run after initialization.
 */
export function ulabel_init(
    ulabel: ULabel,
    callback: () => void
) {
    // Add stylesheet
    add_style_to_document(ulabel);
    
    // Set current subtask to first subtask
    ulabel.state["current_subtask"] = Object.keys(ulabel.subtasks)[0];
    
    // Place image element
    prep_window_html(
        ulabel,
        ulabel.config.toolbox_order
    );

    // Detect night cookie
    if (ULabel.has_night_mode_cookie()) {
        $("#" + ulabel.config["container_id"]).addClass("ulabel-night");
    }

    var images = [document.getElementById(`${ulabel.config["image_id_pfx"]}__0`)];
    let mappable_images = [];
    for (let i = 0; i < images.length; i++) {
        mappable_images.push(images[i]);
        break;
    }
    let image_promises = mappable_images.map(ULabel.load_image_promise);

    Promise.all(image_promises).then((loaded_imgs) => {
        // Store image dimensions
        ulabel.config["image_height"] = loaded_imgs[0].naturalHeight;
        ulabel.config["image_width"] = loaded_imgs[0].naturalWidth;

        // Add canvasses for each subtask and get their rendering contexts
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
            const canvas_bid = <HTMLCanvasElement> document.getElementById(ulabel.subtasks[st]["canvas_bid"]);
            const canvas_fid = <HTMLCanvasElement> document.getElementById(ulabel.subtasks[st]["canvas_fid"]);
            ulabel.subtasks[st]["state"]["back_context"] = canvas_bid.getContext("2d");
            ulabel.subtasks[st]["state"]["front_context"] = canvas_fid.getContext("2d");
        }

        /**
         * This used to be just after `that.is_init = true;`,
         * but for testing loading I've hoisted it up here.
         * 
         * Some things (like available annotation modes)
         * display incorrectly as a result.
         */
        $(`div#${ulabel.config["container_id"]}`).css("display", "block");

        // Create the annotation canvases for the resume_from annotations
        ULabel.initialize_annotation_canvases(ulabel);

        // Add the ID dialogs' HTML to the document
        build_id_dialogs(ulabel);

        // Add the HTML for the edit suggestion to the window
        build_edit_suggestion(ulabel);

        // Add dialog to show annotation confidence
        build_confidence_dialog(ulabel);

        // Create listers to manipulate and export this object
        ULabel.create_listeners(ulabel);

        ulabel.handle_toolbox_overflow();

        // Set the canvas elements in the correct stacking order given current subtask
        ulabel.set_subtask(
            ulabel.state["current_subtask"]
        );

        ulabel.create_overlays()

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
        callback();
    }).catch((err) => {
        console.log(err);
        ulabel.raise_error("Unable to load images: " + JSON.stringify(err), ULabel.elvl_fatal);
    });

    // Final code to be called after the object is initialized
    ULabel.after_init(ulabel)

    console.log(`Time taken to construct and initialize: ${Date.now() - ulabel.begining_time}`)
}