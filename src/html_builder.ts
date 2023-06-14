import { SliderInfo, ULabel } from "..";
import { Toolbox, ZoomPanToolboxItem } from "./toolbox";
import { ULABEL_VERSION } from '../src/version';

import {
    BBOX_SVG,
    BBOX3_SVG,
    POINT_SVG,
    POLYGON_SVG,
    CONTOUR_SVG,
    TBAR_SVG,
    POLYLINE_SVG,
    WHOLE_IMAGE_SVG,
    GLOBAL_SVG,
    get_init_style
} from '../src/blobs';

export class HTMLBuilder {

    static add_style_to_document(ulabel: ULabel) {
        let head: HTMLHeadElement = document.head || document.getElementsByTagName('head')[0];
        let style: HTMLStyleElement = document.createElement('style');
        head.appendChild(style);
        
        style.appendChild(document.createTextNode(get_init_style(ulabel.config["container_id"])));
        
    }

    private static get_md_button(md_key, md_name, svg_blob, cur_md, subtasks) {
        let sel: string = "";
        let href: string = ` href="#"`;
        if (cur_md == md_key) {
            sel = " sel";
            href = "";
        }
        let subtask_classes: string = "";
        for (const st_key in subtasks) {
            if (subtasks[st_key]["allowed_modes"].includes(md_key)) {
                subtask_classes += " md-en4--" + st_key;
            }
        }

        return `<div class="mode-opt">
            <a${href} id="md-btn--${md_key}" class="md-btn${sel}${subtask_classes} invert-this-svg" amdname="${md_name}">
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

    private static get_idd_string(
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

    static build_id_dialogs(ulabel: ULabel) {
        let full_toolbox_html: string = `<div class="toolbox-id-app-payload">`;

        const width = ulabel.config.outer_diameter;
        // TODO real names here!
        const inner_rad: number = ulabel.config.inner_prop * width / 2;
        const inner_diam: number = inner_rad * 2;
        const outer_rad: number = 0.5 * width;
        const inner_top: number = outer_rad - inner_rad;
        const inner_lft: number = outer_rad - inner_rad;

        const cl_opacity: number = 0.4;
        let tbid: string = ulabel.config.toolbox_id;

        const center_coord: number = width / 2;

        for (const st in ulabel.subtasks) {
            const idd_id = ulabel.subtasks[st]["state"]["idd_id"];
            const idd_id_front = ulabel.subtasks[st]["state"]["idd_id_front"];

            let subtask_dialog_container_jq = $("#dialogs__" + st);
            let front_subtask_dialog_container_jq = $("#front_dialogs__" + st);

            let dialog_html_v2 = HTMLBuilder.get_idd_string(
                idd_id, width, center_coord, cl_opacity, ulabel.subtasks[st]["class_ids"],
                inner_rad, outer_rad, ulabel.subtasks[st]["class_defs"]
            );
            let front_dialog_html_v2 = HTMLBuilder.get_idd_string(
                idd_id_front, width, center_coord, cl_opacity, ulabel.subtasks[st]["class_ids"],
                inner_rad, outer_rad, ulabel.subtasks[st]["class_defs"]
            );

            // TODO noconflict
            let toolbox_html: string = `<div id="tb-id-app--${st}" class="tb-id-app">`;
            const class_ids = ulabel.subtasks[st]["class_ids"];


            for (let i = 0; i < class_ids.length; i++) {

                let this_id: string = class_ids[i].toString();
                let this_color: string = ulabel.subtasks[st]["class_defs"][i]["color"];
                let this_name: string = ulabel.subtasks[st]["class_defs"][i]["name"];

                let sel: string = "";
                let href: string = ' href="#"';
                if (i == 0) {
                    sel = " sel";
                    href = "";
                }
                if (ulabel.config["allow_soft_id"]) {
                    let msg = "Only hard id is currently supported";
                    throw new Error(msg);
                }
                else {
                    toolbox_html += `
                        <a${href} id="${tbid}_sel_${this_id}" class="tbid-opt${sel}">
                            <div class="colprev ${tbid}_colprev_${this_id}" style="background-color: ${this_color}"></div> <span class="tb-cls-nam">${this_name}</span>
                        </a>
                    `;
                }
            }
            toolbox_html += `
            </div>`;

            // Add dialog to the document
            front_subtask_dialog_container_jq.append(front_dialog_html_v2); // TODO(new3d) MOVE THIS TO GLOB BOX -- superimpose atop thee anchor already there when needed, no remove and add back
            subtask_dialog_container_jq.append(dialog_html_v2);

            // Wait to add full toolbox
            full_toolbox_html += toolbox_html;

            ulabel.subtasks[st]["state"]["visible_dialogs"][idd_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
        }

        // Add all toolbox html at once
        $("#" + ulabel.config["toolbox_id"] + " div.id-toolbox-app").html(full_toolbox_html);

        // Style revisions based on the size
        let idci = $("#" + ulabel.config["container_id"] + " a.id-dialog-clickable-indicator");
        idci.css({
            "height": `${width}px`,
            "width": `${width}px`,
            "border-radius": `${outer_rad}px`,
        });
        let ccirc = $("#" + ulabel.config["container_id"] + " div.centcirc");
        ccirc.css({
            "position": "absolute",
            "top": `${inner_top}px`,
            "left": `${inner_lft}px`,
            "width": `${inner_diam}px`,
            "height": `${inner_diam}px`,
            "background-color": "black",
            "border-radius": `${inner_rad}px`
        });
    }

    static build_edit_suggestion(ulabel: ULabel) {
        // TODO noconflict
        // DONE Migrated to subtasks

        for (const stkey in ulabel.subtasks) {
            let local_id: string = `edit_suggestion__${stkey}`;
            let global_id: string = `global_edit_suggestion__${stkey}`;

            let subtask_dialog_container_jq = $("#dialogs__" + stkey);

            // Local edit suggestion
            subtask_dialog_container_jq.append(`
                <a href="#" id="${local_id}" class="edit_suggestion editable"></a>
            `);
            $("#" + local_id).css({
                "height": ulabel.config["edit_handle_size"] + "px",
                "width": ulabel.config["edit_handle_size"] + "px",
                "border-radius": ulabel.config["edit_handle_size"] / 2 + "px"
            });

            // Global edit suggestion
            let id_edit: string = "";
            let mcm_ind: string = "";
            if (!ulabel.subtasks[stkey]["single_class_mode"]) {
                id_edit = `--><a href="#" class="reid_suggestion global_sub_suggestion gedit-target"></a><!--`;
                mcm_ind = " mcm";
            }
            subtask_dialog_container_jq.append(`
                <div id="${global_id}" class="global_edit_suggestion glob_editable gedit-target${mcm_ind}">
                    <a href="#" class="move_suggestion global_sub_suggestion movable gedit-target">
                        <img class="movable gedit-target" src="data:image/png;base64,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">
                    </a><!--
                    ${id_edit}
                    --><a href="#" class="delete_suggestion global_sub_suggestion gedit-target">
                        <span class="bigx gedit-target">&#215;</span>
                    </a>
                </div>
            `);

            // Register these dialogs with each subtask
            ulabel.subtasks[stkey]["state"]["visible_dialogs"][local_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
            ulabel.subtasks[stkey]["state"]["visible_dialogs"][global_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
        }
    }

    static build_confidence_dialog(ulabel: ULabel) {
        for (const stkey in ulabel.subtasks) {
            let local_id = `annotation_confidence__${stkey}`;
            let global_id = `global_annotation_confidence__${stkey}`;

            let subtask_dialog_container_jq = $("#dialogs__" + stkey);
            let global_edit_suggestion_jq = $("#global_edit_suggestion__" + stkey);

            //Local confidence dialog
            subtask_dialog_container_jq.append(`
                <p id="${local_id}" class="annotation-confidence editable"></p>
            `);
            $("#" + local_id).css({
                "height": ulabel.config["edit_handle_size"] + "px",
                "width": ulabel.config["edit_handle_size"] + "px",
            });

            // Global edit suggestion
            let id_edit: string = "";
            let mcm_ind: string = "";
            if (!ulabel.subtasks[stkey]["single_class_mode"]) {
                id_edit = `--><a href="#" class="reid_suggestion global_sub_suggestion gedit-target"></a><!--`;
                mcm_ind = " mcm";
            }
            global_edit_suggestion_jq.append(`
                <div id="${global_id}" class="annotation-confidence gedit-target${mcm_ind}">
                    <p class="annotation-confidence-title" style="margin: 0.25em; margin-top: 1em; padding-top: 0.3em; opacity: 1;">Annotation Confidence:</p>
                    <p class="annotation-confidence-value" style="margin: 0.25em; opacity: 1;">
                    ${ulabel.subtasks[ulabel.state["current_subtask"]]["active_annotation"]}
                    </p>
                </div>
            `);

            // Style the dialog
            $("#" + global_id).css({
                "background-color": "black",
                "color": "white",
                "opacity": "0.6",
                "height": "3em",
                "width": "14.5em",
                "margin-top": "-9.5em",
                "border-radius": "1em",
                "font-size": "1.2em",
                "margin-left": "-1.4em",
            });
        }
    }
}

export class SliderHandler {
    default_value: string
    id: string
    slider_event: Function
    class?: string
    label_units?: string = ""
    main_label: string
    min: string = "0"
    max: string = "100"
    step: string = "1"
    step_as_number: number = 1

    constructor(kwargs: SliderInfo) {
        this.default_value = kwargs.default_value
        this.id = kwargs.id
        this.slider_event = kwargs.slider_event
        
        // Only check optional properties
        if (typeof kwargs.class !== "undefined") {
            this.class = kwargs.class
        }
        if (typeof kwargs.main_label !== "undefined") {
            this.main_label = kwargs.main_label
        }
        if (typeof kwargs.label_units !== "undefined") {
            this.label_units = kwargs.label_units
        }
        if (typeof kwargs.min !== "undefined") {
            this.min = kwargs.min
        }
        if (typeof kwargs.max !== "undefined") {
            this.max = kwargs.max
        }
        if (typeof kwargs.step !== "undefined") {
            this.step = kwargs.step
        }

        // Useful to have as both string and number
        // String for html creation
        // Number for incrementing and decrementing slider value
        this.step_as_number = Number(this.step)

        this.add_styles()

        /* Add Event Listeners for this component */
        $(document).on("input", `#${this.id}`, (event) => {
            this.updateLabel()
            this.slider_event(event.currentTarget.valueAsNumber)
        })

        $(document).on("click", `#${this.id}-inc-button`, () => this.incrementSlider())

        $(document).on("click", `#${this.id}-dec-button`, () => this.decrementSlider())
    }

    private add_styles() {
        const css = `
        #toolbox div.ulabel-slider-container {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            margin: 0 1.5rem 0.5rem;
        }
         
        #toolbox div.ulabel-slider-container label.ulabel-filter-row-distance-name-label {
            width: 100%; /* Ensure title takes up full width of container */
            font-size: 0.95rem;
            align-items: center;
        }
         
        #toolbox div.ulabel-slider-container > *:not(label.ulabel-filter-row-distance-name-label) {
            flex: 1;
        }
        
        /*  
        .ulabel-night #toolbox div.ulabel-slider-container label {
            color: white;
        }
        */
        #toolbox div.ulabel-slider-container label.ulabel-slider-value-label {
            font-size: 0.9rem;
        }
         
         
        #toolbox div.ulabel-slider-container div.ulabel-slider-decrement-button-text {
            position: relative;
            bottom: 1.5px;
        }`

        // Create an id so this specific style tag can be referenced
        const style_id = "slider-handler-styles"

        // Don't add the style tag if its already been added once
        if (document.getElementById(style_id)) return

        // Grab the document's head and create a style tag
        const head = document.head || document.querySelector("head")
        const style = document.createElement('style');

        // Add the css and id to the style tag
        style.appendChild(document.createTextNode(css));
        style.id = style_id

        // Add the style tag to the document's head
        head.appendChild(style);
    }

    private updateLabel() {
        const slider: HTMLInputElement = document.querySelector(`#${this.id}`)
        const label: HTMLLabelElement = document.querySelector(`#${this.id}-value-label`)
        
        // Set the label as a concatenation of the value and the units
        label.innerText = slider.value + this.label_units
    }

    /**
     * Increment the slider's value by the step value and call the slider event with 
     * new slider value.
     */
    private incrementSlider() {
        // Get the slider element
        const slider: HTMLInputElement = document.querySelector(`#${this.id}`)

        // Add the step value
        const new_value = slider.valueAsNumber + this.step_as_number

        // Update the slider's value
        slider.value = new_value.toString()

        // Update the label
        this.updateLabel()

        // Call the slider event with the slider value
        this.slider_event(slider.value)
    }

    /**
     * Decrement the slider's value by the step value and call the slider event with 
     * new slider value.
     */
    private decrementSlider() {
        // Get the slider element
        const slider: HTMLInputElement = document.querySelector(`#${this.id}`)

        // Add the step value
        const new_value = slider.valueAsNumber - this.step_as_number

        // Update the slider's value
        slider.value = new_value.toString()

        // Update the label
        this.updateLabel()

        // Call the slider event with the slider value
        this.slider_event(slider.value)
    }

    public getSliderHTML(): string {
        return `
        <div class="ulabel-slider-container">
            ${this.main_label 
                ? `<label for="${this.id}" class="ulabel-filter-row-distance-name-label">${this.main_label}</label>` 
                : ""
            }
            <input 
                id="${this.id}"
                class="${this.class}"
                type="range"
                min="${this.min}"
                max="${this.max}"
                step="${this.step ? this.step : "1"}"
                value="${this.default_value}"
            />
            <label for="${this.id}" id="${this.id}-value-label" class="ulabel-slider-value-label">
                ${this.default_value}${this.label_units ? this.label_units : ""}
            </label>
            <div class="ulabel-slider-button-container">
                <button id=${this.id}-inc-button class="ulabel-slider-button circle" >
                    +
                </button>
                <button id=${this.id}-dec-button class="ulabel-slider-button circle">
                    <!-- Create an extra div here to be able to move the - text up -->
                    <div class="ulabel-slider-decrement-button-text">
                        –
                    </div>
                </button>
            </div>
        </div>
        `
    }
}