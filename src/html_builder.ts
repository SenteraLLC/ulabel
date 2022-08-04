import { ULabel } from "..";
import { Toolbox, ZoomPanToolboxItem } from "./toolbox";
import { ULABEL_VERSION } from './version';

import {
    BBOX_SVG,
    BBOX3_SVG,
    POINT_SVG,
    POLYGON_SVG,
    CONTOUR_SVG,
    TBAR_SVG,
    POLYLINE_SVG,
    WHOLE_IMAGE_SVG,
    GLOBAL_SVG
} from './blobs';

export class HTMLBuilder {

    private static get_md_button(md_key, md_name, svg_blob, cur_md, subtasks) {
        let sel = "";
        let href = ` href="#"`;
        if (cur_md == md_key) {
            sel = " sel";
            href = "";
        }
        let st_classes = "";
        for (const st_key in subtasks) {
            if (subtasks[st_key]["allowed_modes"].includes(md_key)) {
                st_classes += " md-en4--" + st_key;
            }
        }

        return `<div class="mode-opt">
            <a${href} id="md-btn--${md_key}" class="md-btn${sel}${st_classes} invert-this-svg" amdname="${md_name}">
                ${svg_blob}
            </a>
        </div>`;
    }

    private static get_images_html(ulabel: ULabel) {
        let images_html: string = "";

        let display: string;
        for (let i = 0; i < ulabel.config["image_data"].frames.length; i++) {
            if (i != 0) {
                display = "none";
            }
            else {
                display = "block";
            }
            images_html += `
                <img id="${ulabel.config["image_id_pfx"]}__${i}" src="${ulabel.config["image_data"].frames[i]}" class="imwrap_cls ${ulabel.config["imgsz_class"]} image_frame" style="z-index: 50; display: ${display};" />
            `;
        }
        return images_html;
    }

    private static get_frame_annotation_dialogs(ulabel: ULabel) {
        let frame_annotation_dialog: string = "";
        let tot: number = 0;
        for (const st_key in ulabel.subtasks) {
            if (
                !ulabel.subtasks[st_key].allowed_modes.includes('whole-image') &&
                !ulabel.subtasks[st_key].allowed_modes.includes('global')
            ) {
                continue;
            }
            tot += 1;
        }
        let ind: number = 0;
        for (const st_key in ulabel.subtasks) {
            if (
                !ulabel.subtasks[st_key].allowed_modes.includes('whole-image') &&
                !ulabel.subtasks[st_key].allowed_modes.includes('global')
            ) {
                continue;
            }
            frame_annotation_dialog += `
                <div id="fad_st__${st_key}" class="frame_annotation_dialog fad_st__${st_key} fad_ind__${tot - ind - 1}">
                    <div class="hide_overflow_container">
                        <div class="row_container">
                            <div class="fad_row name">
                                <div class="fad_row_inner">
                                    <div class="fad_st_name">${ulabel.subtasks[st_key].display_name}</div>
                                </div>
                            </div>
                            <div class="fad_row add">
                                <div class="fad_row_inner">
                                    <div class="fad_st_add">
                                        <a class="add-glob-button" href="#">+</a>
                                    </div>
                                </div>
                            </div><div class="fad_annotation_rows"></div>
                        </div>
                    </div>
                </div>
            `;
            ind += 1;
            if (ind > 4) {
                throw new Error("At most 4 subtasks can have allow 'whole-image' or 'global' annotations.");
            }
        }
        return frame_annotation_dialog;
    }

    static prep_window_html(ulabel: ULabel, toolbox_item_order: unknown[] = null) {
        // Bring image and annotation scaffolding in
        // TODO multi-image with spacing etc.

        // const tabs = ULabel.get_toolbox_tabs(ul);
        const images: string = HTMLBuilder.get_images_html(ulabel);
        const frame_annotation_dialogs: string = HTMLBuilder.get_frame_annotation_dialogs(ulabel);
        
        // const toolbox = configuration.create_toolbox();
        const toolbox: Toolbox = new Toolbox(
            [],
            Toolbox.create_toolbox(ulabel, toolbox_item_order)
        );

        let tool_html: string = toolbox.setup_toolbox_html(
            ulabel,
            frame_annotation_dialogs,
            images,
            ULABEL_VERSION
        )

        // Set the container's html to the toolbox html we just created
        $("#" + ulabel.config["container_id"]).html(tool_html)

        // Build toolbox for the current subtask only
        const current_subtask: string = Object.keys(ulabel.subtasks)[0];

        // Initialize toolbox based on configuration
        const sp_id = ulabel.config["toolbox_id"];
        let curmd = ulabel.subtasks[current_subtask]["state"]["annotation_mode"];
        let md_buttons: string[] = [
            HTMLBuilder.get_md_button("bbox", "Bounding Box", BBOX_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("point", "Point", POINT_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("polygon", "Polygon", POLYGON_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("tbar", "T-Bar", TBAR_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("polyline", "Polyline", POLYLINE_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("contour", "Contour", CONTOUR_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("bbox3", "Bounding Cube", BBOX3_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("whole-image", "Whole Frame", WHOLE_IMAGE_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("global", "Global", GLOBAL_SVG, curmd, ulabel.subtasks),
        ];

        // Append but don't wait
        $("#" + sp_id + " .toolbox_inner_cls .mode-selection").append(md_buttons.join("<!-- -->"));

        // Show current mode label
        ulabel.show_annotation_mode(null);

        // Make sure that entire toolbox is shown
        if ($("#" + ulabel.config["toolbox_id"] + " .toolbox_inner_cls").height() > $("#" + ulabel.config["container_id"]).height()) {
            $("#" + ulabel.config["toolbox_id"]).css("overflow-y", "scroll");
        }

        ulabel.toolbox = toolbox;

        // Check an array to see if it contains a ZoomPanToolboxItem
        let contains_zoom_pan: Function = function(array: unknown[]) {
            
            //check if the array is empty
            if (array.length == 0) return false;
            
            // Loop through everything in the array and check if its the ZoomPanToolboxItem
            for (let idx in array) {
                if (array[idx] instanceof ZoomPanToolboxItem) {
                    return true;
                }
            }
            
            // If the ZoomPanToolboxItem wasn't found then return false
            return false;
        }

        // Check if initial_crop exists and has the appropriate properties
        let check_initial_crop: Function = function(initial_crop) {

            // If initial_crop doesn't exist, return false
            if (initial_crop == null) return false;

            // If initial_crop has the appropriate properties, return true
            if (
                "width" in initial_crop &&
                "height" in initial_crop &&
                "left" in initial_crop &&
                "top" in initial_crop
            ) {
                return true;
            }

            // If initial_crop exists but doesn't have the appropriate properties,
            // then raise an error and return false
            ulabel.raise_error("initial_crop missing necessary properties. Ignoring.");
            return false;
        }

        // Make sure the toolbox contains the ZoomPanToolboxItem
        if (contains_zoom_pan(ulabel.toolbox.items)) {

            // Make sure the initial_crop exists and contains the necessary properties
            if (check_initial_crop(ulabel.config.initial_crop)) {

                // Grab the initial crop button and rename it
                let initial_crop_button = document.getElementById("recenter-button");
                initial_crop_button.innerHTML = "Initial Crop"
            } 
            else {
                // Grab the whole image button and set its display to none
                let whole_image_button = document.getElementById("recenter-whole-image-button");
                whole_image_button.style.display = "none";
            }
        }
    }

    static get_idd_string(
        idd_id, 
        width, 
        center_coord, 
        cl_opacity, 
        class_ids, 
        inner_rad, 
        outer_rad, 
        class_defs
    ) {
        // TODO noconflict
        let dialog_html: string = `
        <div id="${idd_id}" class="id_dialog" style="width: ${width}px; height: ${width}px;">
            <a class="id-dialog-clickable-indicator" href="#"></a>
            <svg width="${width}" height="${width}">
        `;

        for (let i = 0; i < class_ids.length; i++) {

            let srt_prop = 1 / class_ids.length;

            let cum_prop = i / class_ids.length;
            let srk_prop = 1 / class_ids.length;
            let gap_prop = 1.0 - srk_prop;

            let rad_back = inner_rad + 1.0 * (outer_rad - inner_rad) / 2;
            let rad_frnt = inner_rad + srt_prop * (outer_rad - inner_rad) / 2;

            let wdt_back = 1.0 * (outer_rad - inner_rad);
            let wdt_frnt = srt_prop * (outer_rad - inner_rad);

            let srk_back = 2 * Math.PI * rad_back * srk_prop;
            let gap_back = 2 * Math.PI * rad_back * gap_prop;
            let off_back = 2 * Math.PI * rad_back * cum_prop;

            let srk_frnt = 2 * Math.PI * rad_frnt * srk_prop;
            let gap_frnt = 2 * Math.PI * rad_frnt * gap_prop;
            let off_frnt = 2 * Math.PI * rad_frnt * cum_prop;

            let ths_id = class_ids[i];
            let ths_col = class_defs[i]["color"];
            // TODO should names also go on the id dialog?
            // let ths_nam = class_defs[i]["name"];
            dialog_html += `
            <circle
                r="${rad_back}" cx="${center_coord}" cy="${center_coord}" 
                stroke="${ths_col}" 
                fill-opacity="0"
                stroke-opacity="${cl_opacity}"
                stroke-width="${wdt_back}"; 
                stroke-dasharray="${srk_back} ${gap_back}" 
                stroke-dashoffset="${off_back}" />
            <circle
                id="${idd_id}__circ_${ths_id}"
                r="${rad_frnt}" cx="${center_coord}" cy="${center_coord}"
                fill-opacity="0"
                stroke="${ths_col}" 
                stroke-opacity="1.0"
                stroke-width="${wdt_frnt}" 
                stroke-dasharray="${srk_frnt} ${gap_frnt}" 
                stroke-dashoffset="${off_frnt}" />
            `;
        }
        dialog_html += `
            </svg>
            <div class="centcirc"></div>
        </div>`;

        return dialog_html;
    }
}