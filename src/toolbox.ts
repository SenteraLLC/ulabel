import { 
    AnnotationClassDistanceData, 
    FilterDistanceConfig, 
    RecolorActiveConfig, 
    ULabel,
    ULabelSubmitButtons, 
} from "..";
import { ULabelAnnotation, NONSPATIAL_MODES, DELETE_MODES } from "./annotation";
import { ULabelSubtask } from "./subtask";
import { 
    get_annotation_confidence, 
    value_is_lower_than_filter, 
    mark_deprecated, 
    filter_points_distance_from_line,
    findAllPolylineClassDefinitions,
    get_point_and_line_annotations
} from "./annotation_operators";
import { SliderHandler, get_idd_string } from "./html_builder";
import { FilterDistanceOverlay } from "./overlays";
import { get_active_class_id } from "./utilities";

// For ResizeToolboxItem
enum ValidResizeValues {
    VANISH = "v",
    SMALL = "s",
    LARGE = "l",
    INCREMENT = "inc",
    DECREMENT = "dec"
}

const toolboxDividerDiv = "<div class=toolbox-divider></div>"

/** Chains the replaceAll method and the toLowerCase method.
 *  Optionally concatenates a string at the end of the method.
  */
String.prototype.replaceLowerConcat = function(before: string, after: string, concat_string: string = null) {
    
    if (typeof(concat_string) === "string") {
        return this.replaceAll(before, after).toLowerCase().concat(concat_string)
    }

    return this.replaceAll(before, after).toLowerCase()
}


/**
 * Manager for toolbox. Contains ToolboxTab items.
 */
export class Toolbox {
    // public tabs: ToolboxTab[] = [];
    // public items: ToolboxItem[] = []; 
    
    constructor(
        public tabs: ToolboxTab[] = [],
        public items: ToolboxItem[] = []
    ) {
    }

    public static create_toolbox(ulabel: ULabel, toolbox_item_order: unknown[]) {
        // Grab the default toolbox if one wasn't provided
        if (toolbox_item_order == null) {
            toolbox_item_order = ulabel.config.default_toolbox_item_order
        }

        // There's no point to having an empty toolbox, so throw an error if the toolbox is empty.
        // The toolbox won't actually break if there aren't any items in the toolbox, so this
        // error isn't strictly neccesary.
        if (toolbox_item_order.length === 0) {
            throw new Error("No Toolbox Items Given")
        }

        this.add_styles()

        let toolbox_instance_list = [];
        // Go through the items in toolbox_item_order and add their instance to the toolbox instance list
        for (let i = 0; i < toolbox_item_order.length; i++) {

            let args: object, toolbox_key: number;

            // If the value of toolbox_item_order[i] is a number then that means the it is one of the 
            // enumerated toolbox items, so set it to the key, otherwise the element must be an array
            // of which the first element of that array must be the enumerated value, and the arguments
            // must be the second value
            if (typeof(toolbox_item_order[i]) === "number") {
                toolbox_key = <number> toolbox_item_order[i]
            } else {
                toolbox_key = toolbox_item_order[i][0];
                args = toolbox_item_order[i][1]  
            }

            let toolbox_item_class = ulabel.config.toolbox_map.get(toolbox_key);

            if (args == null) {
                toolbox_instance_list.push(new toolbox_item_class(ulabel))
            } else {
                toolbox_instance_list.push(new toolbox_item_class(ulabel, args))
            }  
        }                    

        return toolbox_instance_list
    }

    static add_styles() {
        const css = `
        #toolbox {
            width: 320px;
            background-color: white;
            overflow-y: hidden;
            position: absolute;
            top: 0;
            right: 0;
        }

        .ulabel-night #toolbox {
            color: white;
        }

        .ulabel-night #toolbox div.toolbox_inner_cls {
            background-color: black;
        }

        .ulabel-night div.toolbox_cls {
            background-color: rgb(24, 24, 24);
        }

        .ulabel-night .invert-this-svg svg {
            filter: invert(90%);
        }

        #toolbox button {
            border: 1px solid rgba(128, 128, 128, 0.5);
            color: white;
            background-color: rgba(0, 128, 255, 0.7);
            transition: background-color 250ms;
            cursor: pointer;
        }
        
        #toolbox button:hover {
            background-color: rgba(0, 128, 255, 0.9);
        }

        #toolbox button.circle {
            position: relative;
            border-radius: 50%;
            font-size: 1.2rem;
            font-weight: bold;
            width: 20px;
            height: 20px;
            padding: 0;
        }

        #toolbox button.circle:hover {
            box-shadow: 0 0 4px 2px lightgray, 0 0 white;
        }
         
        /* No shadow effect in night-mode */
        .ulabel-night #toolbox button.circle:hover {
            box-shadow: initial;
        }

        #toolbox input {
            cursor: pointer;
        }

        #toolbox label {
            cursor: pointer;
        }
        
        #toolbox div.toolbox-divider {
            width: 90%;
            margin: 0 auto;
            height: 1px;
            background-color: lightgray;
        }

        .ulabel-night #toolbox div.toolbox-divider {
            background-color: gray;
        }`

        // Create an id so this specific style tag can be referenced
        const style_id = "toolbox-styles"

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

    public setup_toolbox_html(ulabel: ULabel, frame_annotation_dialogs: any, images: any, ULABEL_VERSION: any): string {
        // Setup base div and ULabel version header
        let toolbox_html = `
        <div class="full_ulabel_container_">
            ${frame_annotation_dialogs}
            <div id="${ulabel.config["annbox_id"]}" class="annbox_cls">
                <div id="${ulabel.config["imwrap_id"]}" class="imwrap_cls ${ulabel.config["imgsz_class"]}">
                    ${images}
                </div>
            </div>
            <div id="${ulabel.config["toolbox_id"]}" class="toolbox_cls">
                <div class="toolbox-name-header">
                    <h1 class="toolname"><a class="repo-anchor" href="https://github.com/SenteraLLC/ulabel">ULabel</a> <span class="version-number">v${ULABEL_VERSION}</span></h1><!--
                    --><div class="night-button-cont">
                        <a href="#" class="night-button">
                            <div class="night-button-track">
                                <div class="night-status"></div>
                            </div>
                        </a>
                    </div>
                </div>
                <div class="toolbox_inner_cls">
        `;
        for (const tbitem in this.items) {
            toolbox_html += this.items[tbitem].get_html() + toolboxDividerDiv;
        }
        toolbox_html += `
                </div>
                <div class="toolbox-tabs">
                    ${this.get_toolbox_tabs(ulabel)}
                </div> 
            </div>
        </div>`; 

        return toolbox_html;
    }

    /**
     * Adds tabs for each ULabel subtask to the toolbox.
     */
    public get_toolbox_tabs(ulabel: ULabel): string{
        let ret: string = "";
        for (const st_key in ulabel.subtasks) {
            let selected = st_key == ulabel.state["current_subtask"];
            let subtask = ulabel.subtasks[st_key];
            let current_tab = new ToolboxTab(
                [],
                subtask,
                st_key,
                selected 
            );
            ret += current_tab.html;
            this.tabs.push(
                current_tab 
            );
        }
        return ret 
    }
    
    public redraw_update_items(ulabel: ULabel): void {
        for(const tbitem of this.items) {
            tbitem.redraw_update(ulabel);
        }
    }
}

export class ToolboxTab {
    public html: string;
    constructor(
        public toolboxitems: ToolboxItem[] = [],
        public subtask: ULabelSubtask,
        public subtask_key: string,
        public selected: boolean = false,
    ) {
        let sel = "";
        let href = ` href="#"`;
        let val = subtask.inactive_opacity * 100;
        if (this.selected) {
            if (this.subtask.read_only) {
                href = "";
            }
            sel = " sel";
            val = 100;
        }
        console.log(subtask.display_name, subtask)
        this.html = `
        <div class="tb-st-tab${sel}">
            <a${href} id="tb-st-switch--${subtask_key}" class="tb-st-switch">${this.subtask.display_name}</a><!--
            --><span class="tb-st-range">
                <input id="tb-st-range--${subtask_key}" type="range" min=0 max=100 value=${val} />
            </span>
        </div>
        `;

    }
}

export abstract class ToolboxItem {
    constructor() {}

    /**
     * Returns this toolbox item's html.
     */
    abstract get_html(): string;

    /**
     * Returns a unique string for each toolbox item.
     */
    abstract get_toolbox_item_type(): string;

    /**
     * Code called after all of ULabel's constructor and initialization code is called.
     */
    abstract after_init(): void;

    /**
     * ToolboxItems need to handle their own css.
     */
    protected abstract add_styles(): void; 

    public redraw_update(ulabel: ULabel): void {}
    public frame_update(ulabel: ULabel): void {} 
}

/**
 * Toolbox item for selecting annotation mode.
 */
export class ModeSelectionToolboxItem extends ToolboxItem {
    constructor(public ulabel: ULabel) {
        super();

        this.add_styles()

        // Buttons to change annotation mode
        $(document).on("click.ulabel", "a.md-btn", (e) => {
            
            // Grab the current target and the current subtask
            let target_jq = $(e.currentTarget);
            let current_subtask = ulabel.state["current_subtask"];

            // Check if button clicked is already selected, or if creation of a new annotation is in progress
            if (target_jq.hasClass("sel") || ulabel.subtasks[current_subtask]["state"]["is_in_progress"]) return;

            // Get the new mode and set it to ulabel's current mode
            let new_mode = target_jq.attr("id").split("--")[1];
            ulabel.subtasks[current_subtask]["state"]["annotation_mode"] = new_mode;

            // Show the BrushToolboxItem when polygon mode is selected
            if (new_mode === "polygon") {
                BrushToolboxItem.show_brush_toolbox_item();
            } else {
                BrushToolboxItem.hide_brush_toolbox_item();
                // Turn off erase mode if it's on
                if (ulabel.subtasks[current_subtask]["state"]["is_in_erase_mode"]) {
                    ulabel.toggle_erase_mode(e);
                }
                // Turn off brush mode if it's on
                if (ulabel.subtasks[current_subtask]["state"]["is_in_brush_mode"]) {
                    ulabel.toggle_brush_mode(e);
                }
            }

            // Reset the previously selected mode button
            $("a.md-btn.sel").attr("href", "#");
            $("a.md-btn.sel").removeClass("sel");

            // Make the selected class look selected
            target_jq.addClass("sel");
            target_jq.removeAttr("href");

            ulabel.show_annotation_mode(target_jq);
            ulabel.toggle_delete_class_id_in_toolbox();
        });

        $(document).on("keypress.ulabel", (e) => {

            // If creation of a new annotation is in progress, don't change the mode
            let current_subtask = ulabel.state["current_subtask"];
            if (ulabel.subtasks[current_subtask]["state"]["is_in_progress"]) return;

            // Check if the correct key was pressed
            if (e.key == ulabel.config.toggle_annotation_mode_keybind) {

                let mode_button_array: HTMLElement[] = []

                // Loop through all of the mode buttons
                for (let idx in Array.from(document.getElementsByClassName("md-btn"))) {
    
                    // Grab mode button
                    let mode_button = <HTMLElement> document.getElementsByClassName("md-btn")[idx]

                    // Continue without adding it to the array if its display is none
                    if (mode_button.style.display == "none") {
                        continue
                    }
                    mode_button_array.push(mode_button)                  
                } 

                // Grab the currently selected mode button
                let selected_mode_button = <HTMLAnchorElement> Array.from(document.getElementsByClassName("md-btn sel"))[0] // There's only ever going to be one element in this array, so grab the first one

                let new_button_index: number

                // Loop through all of the mode select buttons that are currently displayed 
                // to find which one is the currently selected button.  Once its found add 1
                // to get the index of the next mode select button. If the new button index
                // is the same as the array's length, then loop back and set the new button
                // to 0.
                for (let idx in mode_button_array) {
                    if (mode_button_array[idx] === selected_mode_button) {
                        new_button_index = Number(idx) + 1
                        if (new_button_index == mode_button_array.length) {
                            new_button_index = 0
                        }
                    }
                }

                // Grab the button for the mode we want to switch to
                let new_selected_button = mode_button_array[new_button_index]

                new_selected_button.click()
            }
        })
    }

    
    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Define the css
        const css = `
        #toolbox div.mode-selection {
            padding: 10px 30px;
         }
         
         #toolbox div.mode-selection p.current_mode_container {
            margin-top: 0px;
            margin-bottom: 5px;
         }
         
         #toolbox div.mode-selection span.current_mode {
            color: cornflowerblue;
         }
         
         #toolbox div.mode-opt {
            display: inline-block;
         }
         
         #toolbox div.mode-selection a.md-btn {
            text-align: center;
            height: 30px;
            width: 30px;
            padding: 10px;
            margin: 0 auto;
            text-decoration: none;
            color: black;
            font-size: 1.2em;
            font-family: sans-serif;
         }
         
         #toolbox div.mode-selection a.md-btn svg {
            height: 30px;
            width: 30px;
         }
         
         #toolbox div.mode-selection a.md-btn:hover {
            background-color: rgba(255, 181, 44, 0.397);
         }
         
         #toolbox div.mode-selection a.md-btn.sel {
            background-color: rgba(100, 148, 237, 0.459);
         }

        
        
        
        `
        // Create an id so this specific style tag can be referenced
        const style_id = "mode-selection-toolbox-item-styles"

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

    public get_html() {
        return `
        <div class="mode-selection">
            <p class="current_mode_container">
                <span class="cmlbl">Mode:</span>
                <span class="current_mode"></span>
            </p>
        </div>
        `
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "ModeSelection"
    }
}

/**
 * Toolbox item for resizing all annotations
 */
export class BrushToolboxItem extends ToolboxItem {
    public html: string;
    private ulabel: ULabel

    constructor(ulabel: ULabel) {
        super();

        this.ulabel = ulabel

        this.add_styles()

        this.add_event_listeners()
    }

    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Define the css
        // Define the css
        const css = `
        #toolbox div.brush button:not(.circle) {
            padding: 1rem 0.5rem;
            border: 1px solid gray;
            border-radius: 10px
        }

        #toolbox div.brush div.brush-button-holder {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        #toolbox div.brush span.brush-mode {
            display: flex;
        }        
        `
        // Create an id so this specific style tag can be referenced
        const style_id = "brush-toolbox-item-styles"

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

    private add_event_listeners() {
        $(document).on("click.ulabel", ".brush-button", (event) => {
            // Get the clicked button
            const button = $(event.currentTarget)

            // Use the button id to get what size to resize the annotations to
            const button_id: string = button.attr("id");

            switch (button_id) {
                case "brush-mode":
                    this.ulabel.toggle_brush_mode(event);
                    break
                case "erase-mode":
                    this.ulabel.toggle_erase_mode(event);
                    break
                case "brush-inc":
                    this.ulabel.change_brush_size(1.1);
                    break
                case "brush-dec":
                    this.ulabel.change_brush_size(1/1.1);
                    break
            }
        })
    }
    
    public get_html() {
        return `
        <div class="brush">
            <p class="tb-header">Brush Tool</p>
            <div class="brush-button-holder">
                <span class="brush-mode">
                    <button class="brush-button" id="brush-mode">Brush</button>
                    <button class="brush-button" id="erase-mode">Erase</button>
                </span>
                <span class="brush-inc increment">
                    <button class="brush-button circle inc" id="brush-inc">+</button>
                    <button class="brush-button circle dec" id="brush-dec">-</button>
                </span>
            </div>
        </div>
        `
    }

    public static show_brush_toolbox_item() {
        // Remove hidden class from the brush toolbox item
        $(".brush").removeClass("ulabel-hidden")
    }

    public static hide_brush_toolbox_item() {
        // Add hidden class to the brush toolbox item
        $(".brush").addClass("ulabel-hidden")
    }

    public after_init() {
        // Only show BrushToolboxItem if the current mode is polygon
        if (this.ulabel.subtasks[this.ulabel.state["current_subtask"]].state["annotation_mode"] !== "polygon") {
            BrushToolboxItem.hide_brush_toolbox_item()
        }
    }

    public get_toolbox_item_type() {
        return "Brush"
    }
}

/**
 * Toolbox item for zooming and panning.
 */
export class ZoomPanToolboxItem extends ToolboxItem {
    public frame_range: string
    constructor(
        public ulabel: ULabel
    ) {
        super();
        this.set_frame_range(ulabel);

        this.add_styles()

        this.add_event_listeners()
    }
    
    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Define the css
        const css = `
        #toolbox div.zoom-pan {
            padding: 10px 30px;
            display: grid;
            grid-template-rows: auto 1.25rem auto;
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
                "zoom     pan"
                "zoom-tip pan-tip"
                "recenter recenter";
        }
         
        #toolbox div.zoom-pan > * {
            place-self: center;
        }
        
        #toolbox div.zoom-pan button {
            background-color: lightgray;
        }

        #toolbox div.zoom-pan button:hover {
            background-color: rgba(0, 128, 255, 0.9);
        }
        
        #toolbox div.zoom-pan div.set-zoom {
            grid-area: zoom;
        }
        
        #toolbox div.zoom-pan div.set-pan {
            grid-area: pan;
        }
        
        #toolbox div.zoom-pan div.set-pan div.pan-container {
            display: inline-flex;
            align-items: center;
        }
        
        #toolbox div.zoom-pan p.shortcut-tip {
            margin: 2px 0;
            font-size: 10px;
            color: white;
        }

        #toolbox div.zoom-pan:hover p.shortcut-tip {
            color: black;
        }

        .ulabel-night #toolbox div.zoom-pan p.shortcut-tip {
            margin: 0;
            font-size: 10px;
            color: black;
        }

        .ulabel-night #toolbox div.zoom-pan:hover p.shortcut-tip {
            color: white;
        }
        
        #toolbox.ulabel-night div.zoom-pan:hover p.pan-shortcut-tip {
            color: white;
        }
        
        #toolbox div.zoom-pan p.zoom-shortcut-tip {
            grid-area: zoom-tip;
        }
        
        #toolbox div.zoom-pan p.pan-shortcut-tip {
            grid-area: pan-tip;
        }
        
        #toolbox div.zoom-pan span.pan-label {
            margin-right: 10px;
        }
        
        #toolbox div.zoom-pan span.pan-button-holder {
            display: inline-grid;
            position: relative;
            grid-template-rows: 28px 28px;
            grid-template-columns: 28px 28px;
            grid-template-areas:
                "left   top"
                "bottom right";
            transform: rotate(-45deg);
            gap: 1px;
        }
        
        #toolbox div.zoom-pan span.pan-button-holder > * {
            border: 1px solid gray;
        }
        
        #toolbox div.zoom-pan button.ulabel-pan:hover {
            background-color: cornflowerblue;
        }
        
        #toolbox div.zoom-pan button.ulabel-pan-left {
            grid-area: left;
            border-radius: 100% 0 0 0;
        }
        
        #toolbox div.zoom-pan button.ulabel-pan-right {
            grid-area: right;
            border-radius: 0 0 100% 0;
        }
        
        #toolbox div.zoom-pan button.ulabel-pan-up {
            grid-area: top;
            border-radius: 0 100% 0 0;
        }
        
        #toolbox div.zoom-pan button.ulabel-pan-down {
            grid-area: bottom;
            border-radius: 0 0 0 100%;
        }
        
        #toolbox div.zoom-pan span.spokes {
            background-color: white;
            width: 16px;
            height: 16px;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
        }
        
        .ulabel-night #toolbox div.zoom-pan span.spokes {
            background-color: black;
        }

        #toolbox div.zoom-pan div.recenter-container {
            grid-area: recenter;
        }
        
        .ulabel-night #toolbox div.zoom-pan a {
            color: lightblue;
        }

        .ulabel-night #toolbox div.zoom-pan a:active {
            color: white;
        }
        `
        // Create an id so this specific style tag can be referenced
        const style_id = "zoom-pan-toolbox-item-styles"

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

    private add_event_listeners() {
        const frames_exist = this.ulabel.config["image_data"].frames.length > 1

        $(document).on("click.ulabel", ".ulabel-zoom-button", (event) => {

            if ($(event.currentTarget).hasClass("ulabel-zoom-out")) {
                this.ulabel.state.zoom_val /= 1.1
            }
            else if ($(event.currentTarget).hasClass("ulabel-zoom-in")) {
                this.ulabel.state.zoom_val *= 1.1
            }

            this.ulabel.rezoom()

            // Only try to update the overlay if it exists
            this.ulabel.filter_distance_overlay?.draw_overlay()
        })

        $(document).on("click.ulabel", ".ulabel-pan", (event) => {
            const annbox = $("#" + this.ulabel.config.annbox_id);
            if ($(event.currentTarget).hasClass("ulabel-pan-up")) {
                annbox.scrollTop(annbox.scrollTop() - 20);
            }
            else if ($(event.currentTarget).hasClass("ulabel-pan-down")) {
                annbox.scrollTop(annbox.scrollTop() + 20);
            }
            else if ($(event.currentTarget).hasClass("ulabel-pan-left")) {
                annbox.scrollLeft(annbox.scrollLeft() - 20);
            }
            else if ($(event.currentTarget).hasClass("ulabel-pan-right")) {
                annbox.scrollLeft(annbox.scrollLeft() + 20);
            }
        })

        // Add diffrent keypress events if frames exist
        if (frames_exist) {
            $(document).on("keypress.ulabel", (event) => {
                event.preventDefault()
                switch (event.key) {
                    case "ArrowRight":
                    case "ArrowDown":
                        this.ulabel.update_frame(1)
                        break
                    case "ArrowUp":
                    case "ArrowLeft":
                        this.ulabel.update_frame(-1)
                }
            })
        }
        else {
            $(document).on("keydown.ulabel", (event) => {
                const annbox = $("#" + this.ulabel.config.annbox_id);
                switch (event.key) {
                    case "ArrowLeft":
                        annbox.scrollLeft(annbox.scrollLeft() - 20)
                        event.preventDefault()
                        break
                    case "ArrowRight":
                        annbox.scrollLeft(annbox.scrollLeft() + 20)
                        event.preventDefault()
                        break
                    case "ArrowUp":
                        annbox.scrollTop(annbox.scrollTop() - 20)
                        event.preventDefault()
                        break
                    case "ArrowDown":
                        annbox.scrollTop(annbox.scrollTop() + 20)
                        event.preventDefault()
                    default:
                }
            })
        }

        $(document).on("click.ulabel", "#recenter-button", () => {
            this.ulabel.show_initial_crop();
        });

        $(document).on("click.ulabel", "#recenter-whole-image-button", () => {
            this.ulabel.show_whole_image();
        });

        $(document).on("keypress.ulabel", (e) => {
            if (e.key == this.ulabel.config.change_zoom_keybind.toLowerCase()) {
                document.getElementById("recenter-button").click()
            }
            if (e.key == this.ulabel.config.change_zoom_keybind.toUpperCase()) {
                document.getElementById("recenter-whole-image-button").click()
            }
        })
    }

    private set_frame_range(ulabel) {
        if (ulabel.config["image_data"]["frames"].length == 1) {
            this.frame_range = ``;
            return
        }
        this.frame_range = `
            <div class="full-tb htbmain set-frame">
                <p class="shortcut-tip">scroll to switch frames</p>
                <div class="zpcont">
                    <div class="lblpyldcont">
                        <span class="pzlbl htblbl">Frame</span> &nbsp;
                        <input class="frame_input" type="range" min=0 max=${ulabel.config["image_data"].frames.length - 1} value=0 />
                    </div>
                </div>
            </div>
            `;
    }

    public get_html() {
        return `
        <div class="zoom-pan">
            <div class="set-zoom">  
                <span>Zoom</span>
                <span class="zoom-button-holder">
                    <button class="ulabel-zoom-button ulabel-zoom-out circle">-</button>
                    <button class="ulabel-zoom-button ulabel-zoom-in circle">+</button>
                </span>
            </div>
            <p class="shortcut-tip zoom-shortcut-tip">ctrl+scroll or shift+drag</p>
            <div class="set-pan">
                <div class="pan-container">
                    <span class="pan-label">Pan</span>
                    <span class="pan-button-holder">
                        <button class="ulabel-pan ulabel-pan-left"></button>
                        <button class="ulabel-pan ulabel-pan-right"></button>
                        <button class="ulabel-pan ulabel-pan-up"></button>
                        <button class="ulabel-pan ulabel-pan-down"></button>
                        <span class="spokes"></span>
                    </span>
                </div>
            </div>
            <p class="shortcut-tip pan-shortcut-tip">scrollclick+drag or ctrl+drag</p>
            <div class="recenter-container">
                <a href="#" id="recenter-button">Re-Center</a>
                <a href="#" id="recenter-whole-image-button">Whole Image</a>
            </div>
            ${this.frame_range}
        </div>
        `;
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "ZoomPan"
    }
}

/**
 * Toolbox item for selection Annotation ID.
 */
export class AnnotationIDToolboxItem extends ToolboxItem {
    instructions: string
    constructor(
        public ulabel: ULabel
    ) {
        super();
        this.set_instructions(ulabel);

        this.add_styles()
    }

    
    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Define the css
        const css = `
        #toolbox div.classification div.id-toolbox-app {
            margin-bottom: 1rem;
        }
        `
        // Create an id so this specific style tag can be referenced
        const style_id = "annotation-id-toolbox-item-styles"

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

    private set_instructions(ulabel: ULabel) {
        this.instructions = "";
        if (ulabel.config["instructions_url"] != null) {
            this.instructions = `
                <a href="${ulabel.config["instructions_url"]}" target="_blank" rel="noopener noreferrer">Instructions</a>
            `;
        }
    }

    /**
     * Get the html skeleton for this ToolboxItem. The actual ID selection items will be added 
     * in html_builder.ts in the function build_id_dialogs()
     * 
     * @returns html string
     */
    public get_html() {
        return `
        <div class="classification">
            <p class="tb-header">Annotation ID</p>
            <div class="id-toolbox-app"></div>
        </div>
        <div class="toolbox-refs">
            ${this.instructions}
        </div>
        `;
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "AnnotationID"
    }
}

export class ClassCounterToolboxItem extends ToolboxItem {
    public html: string;
    public inner_HTML: string;
    constructor(...args) {
        super();
        this.inner_HTML = `<p class="tb-header">Annotation Count</p>`;
        this.add_styles()
    }

    
    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Define the css
        const css = ` /* ClassCounterToolboxItem currently requires no styling */ `
        
        // Create an id so this specific style tag can be referenced
        const style_id = "class-counter-toolbox-item-styles"

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

    /**
     * Update the Class Counter with the current number of active annotations.
     * 
     * @param {ULabelSubtask} subtask Subtask to update the counter for.
     */
    update_toolbox_counter(subtask: ULabelSubtask): void {
        if (subtask == null) {
            return;
        }
        const class_ids = subtask.class_ids;
        let i: number, j: number;
        let class_counts = {};
        for (i = 0; i < class_ids.length; i++) {
            class_counts[class_ids[i]] = 0;
        }
        let annotations = subtask.annotations.access;
        let annotation_ids = subtask.annotations.ordering;
        var current_annotation: ULabelAnnotation, current_payload;
        for (i = 0; i < annotation_ids.length; i++) {
            current_annotation = annotations[annotation_ids[i]];
            if (current_annotation.deprecated === false) {
                for (j = 0; j < current_annotation.classification_payloads.length; j++) {
                    current_payload = current_annotation.classification_payloads[j];
                    if (current_payload.confidence > 0.0) {
                        class_counts[current_payload.class_id] += 1;
                        break;
                    }
                }
            }
        }
        let f_string = "";
        let class_name: string, class_count: number;
        for (i = 0; i < class_ids.length; i++) {
            class_name = subtask.class_defs[i].name;
            // MF-Tassels Hack
            if (class_name.includes("OVERWRITE")) {
                continue;
            }
            class_count = class_counts[subtask.class_defs[i].id];
            f_string += `${class_name}: ${class_count}<br>`;
        }
        this.inner_HTML = `<p class="tb-header">Annotation Count</p>` + `<p>${f_string}</p>`;
    }
    
    public get_html() {
        return `
        <div class="toolbox-class-counter">` + this.inner_HTML + `</div>`;
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public redraw_update(ulabel: ULabel) {
        this.update_toolbox_counter(
            ulabel.subtasks[ulabel.state["current_subtask"]],
        );
        $("#" + ulabel.config["toolbox_id"] + " div.toolbox-class-counter").html(this.inner_HTML);
    }

    public get_toolbox_item_type() {
        return "ClassCounter"
    }
}

/**
 * Toolbox item for resizing all annotations
 */
export class AnnotationResizeItem extends ToolboxItem {
    public cached_size: number = 1.5;
    public html: string;
    private keybind_configuration: {[key: string]: string}
    private ulabel: ULabel

    constructor(ulabel: ULabel) {
        super();

        this.ulabel = ulabel

        // Get default keybinds
        this.keybind_configuration = ulabel.config.default_keybinds

        // First check for a size cookie, if one isn't found then check the config
        // for a default annotation size. If neither are found it will use the size
        // that the annotation was saved as.
        for (let subtask in ulabel.subtasks) {
            let cached_size_property = ulabel.subtasks[subtask].display_name.replaceLowerConcat(" ", "-", "-cached-size")
            let size_cookie = this.read_size_cookie(ulabel.subtasks[subtask])
            if ((size_cookie != null) && size_cookie != "NaN") {
                this.update_annotation_size(ulabel, ulabel.subtasks[subtask], Number(size_cookie));
                this[cached_size_property] = Number(size_cookie)
            }
            else if (ulabel.config.default_annotation_size != undefined) {          
                this.update_annotation_size(ulabel, ulabel.subtasks[subtask], ulabel.config.default_annotation_size);
                this[cached_size_property] = ulabel.config.default_annotation_size
            } 
            else {
                const DEFAULT_SIZE = 5
                this.update_annotation_size(ulabel, ulabel.subtasks[subtask], DEFAULT_SIZE)
                this[cached_size_property] = DEFAULT_SIZE
            }
        }

        this.add_styles()

        this.add_event_listeners()
    }

    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Define the css
        const css = `
        #toolbox div.annotation-resize button:not(.circle) {
            padding: 1rem 0.5rem;
            border: 1px solid gray;
            border-radius: 10px
        }

        #toolbox div.annotation-resize div.annotation-resize-button-holder {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        #toolbox div.annotation-resize span.annotation-vanish:hover,
        #toolbox div.annotation-resize span.annotation-size:hover {
            border-radius: 10px;
            box-shadow: 0 0 4px 2px lightgray, 0 0 white;
        }

        /* No box-shadow in night-mode */
        .ulabel-night #toolbox div.annotation-resize span.annotation-vanish:hover,
        .ulabel-night #toolbox div.annotation-resize span.annotation-size:hover {
            box-shadow: initial;
        }

        #toolbox div.annotation-resize span.annotation-size {
            display: flex;
        }

        #toolbox div.annotation-resize span.annotation-size #annotation-resize-s {
            border-radius: 10px 0 0 10px;
        }

        #toolbox div.annotation-resize span.annotation-size #annotation-resize-l {
            border-radius: 0 10px 10px 0;
        }
        
        #toolbox div.annotation-resize span.annotation-inc {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        #toolbox div.annotation-resize button.locked {
            background-color: #1c2d4d;
        }
        
        `
        // Create an id so this specific style tag can be referenced
        const style_id = "resize-annotation-toolbox-item-styles"

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

    private add_event_listeners() {
        $(document).on("click.ulabel", ".annotation-resize-button", (event) => {
            // Get the current subtask
            const current_subtask_key = this.ulabel.state["current_subtask"];
            const current_subtask = this.ulabel.subtasks[current_subtask_key];

            // Get the clicked button
            const button = $(event.currentTarget)

            // Use the button id to get what size to resize the annotations to
            const annotation_size = <ValidResizeValues> button.attr("id").slice(18);

            // Update the size of all annotations in the subtask
            this.update_annotation_size(this.ulabel, current_subtask, annotation_size);

            this.ulabel.redraw_all_annotations(current_subtask_key, null, false);
        })

        $(document).on("keydown.ulabel", (event) => {
            // Get the current subtask
            const current_subtask_key = this.ulabel.state["current_subtask"];
            const current_subtask = this.ulabel.subtasks[current_subtask_key];

            switch(event.key) {
                case this.keybind_configuration.annotation_vanish.toUpperCase():
                    this.update_all_subtask_annotation_size(this.ulabel, ValidResizeValues.VANISH)
                    break
                case this.keybind_configuration.annotation_vanish.toLowerCase():
                    this.update_annotation_size(this.ulabel, current_subtask, ValidResizeValues.VANISH)
                    break
                case this.keybind_configuration.annotation_size_small:
                    this.update_annotation_size(this.ulabel, current_subtask, ValidResizeValues.SMALL)
                    break
                case this.keybind_configuration.annotation_size_large:
                    this.update_annotation_size(this.ulabel, current_subtask, ValidResizeValues.LARGE)
                    break
                case this.keybind_configuration.annotation_size_minus:
                    this.update_annotation_size(this.ulabel, current_subtask, ValidResizeValues.DECREMENT)
                    break
                case this.keybind_configuration.annotation_size_plus:
                    this.update_annotation_size(this.ulabel, current_subtask, ValidResizeValues.INCREMENT)
                    break
                default:
                    // Return if no valid keybind was pressed
                    return
            }
            
            // If the sizes were updated resize the annotations
            this.ulabel.redraw_all_annotations(null, null, false)
        })
    }

    /**
     * Takes in either a number or a ValidResizeValues.value. If given a number it will resize all annotations in the subtask to 
     * be that size. The ValidResizeValues will either set the size of all annotations to set values or increment/decrement the 
     * current size of the annotations.
     * 
     * @param subtask Subtask which holds the annotations to act on
     * @param size How to resize the annotations
     */
    public update_annotation_size(ulabel: ULabel, subtask: ULabelSubtask, size: number | ValidResizeValues): void {
        if (subtask === null) return;

        const small_size = 1.5;
        const large_size = 5;
        const increment_size = 0.5;
        const vanish_size = 0.01;
        let subtask_cached_size = subtask.display_name.replaceLowerConcat(" ", "-", "-cached-size");
        let subtask_vanished_flag = subtask.display_name.replaceLowerConcat(" ", "-", "-vanished");

        // If the annotations are currently vanished and a button other than the vanish button is
        // pressed, then we want to ignore the input
        if (this[subtask_vanished_flag] && size !== "v") return;

        // If a number was passed in, set all annotations to be the size of the number
        if (typeof(size) === "number") {
            this.loop_through_annotations(subtask, size, "=");
            return
        }

        // Otherwise handle each ValidResizeValues case here
        switch(size) {
            case ValidResizeValues.SMALL:
                this.loop_through_annotations(subtask, small_size, "=")
                this[subtask_cached_size] = small_size
                break;           
            case ValidResizeValues.LARGE:
                this.loop_through_annotations(subtask, large_size, "=")
                this[subtask_cached_size] = large_size
                break;
            case ValidResizeValues.DECREMENT:
                this.loop_through_annotations(subtask, increment_size, "-")
                if (this[subtask_cached_size] - increment_size > vanish_size) {
                    this[subtask_cached_size] -= increment_size;
                } else {
                    this[subtask_cached_size] = vanish_size;
                }
                break;
            case ValidResizeValues.INCREMENT:
                this.loop_through_annotations(subtask, increment_size, "+")
                this[subtask_cached_size] += increment_size;
                break;
            case ValidResizeValues.VANISH:
                if (this[subtask_vanished_flag]) {
                    // Re-apply the cashed annotation size 
                    this.loop_through_annotations(subtask, this[subtask_cached_size], "=")
                    
                    // Filp the state
                    this[subtask_vanished_flag] = !this[subtask_vanished_flag]
    
                    // Unlock the vanish button
                    $("#annotation-resize-v").removeClass("locked")
                } else {
                    // Apply the vanish size to make the annotations to small to see
                    this.loop_through_annotations(subtask, vanish_size, "=")
                    
                    // Filp the state
                    this[subtask_vanished_flag] = !this[subtask_vanished_flag]
    
                    // Lock the vanish button
                    $("#annotation-resize-v").addClass("locked")
                }
                break
            default:
                console.error("update_annotation_size called with unknown size");
        }

        // Store the new size as the default if we should be tracking it
        if (ulabel.state.line_size !== null) {
            ulabel.state.line_size = this[subtask_cached_size];
        }
    }

    // Loop through all annotations in a subtask and change their line size
    public loop_through_annotations(subtask: ULabelSubtask, size: number, operation: "=" | "+" | "-") {        
        for (const annotation_id in subtask.annotations.access) {
            switch (operation) {
                case "=":
                    subtask.annotations.access[annotation_id].line_size = size;
                    break;
                case "+":
                    subtask.annotations.access[annotation_id].line_size += size;
                    break;
                case "-":
                    // Check to make sure annotation line size won't go 0 or negative. 
                    // If it would, set it equal to a small positive number
                    if (subtask.annotations.access[annotation_id].line_size - size <= 0.01) {
                        subtask.annotations.access[annotation_id].line_size = 0.01
                    } else {
                        subtask.annotations.access[annotation_id].line_size -= size;
                    }
                    break;
                default:
                    throw Error("Invalid Operation given to loop_through_annotations")
            }
        }

        if (subtask.annotations.ordering.length > 0) {
            this.set_size_cookie(subtask.annotations.access[subtask.annotations.ordering[0]].line_size, subtask);
        }
    }

    //Loop through all subtasks and apply a size to them all
    public update_all_subtask_annotation_size(ulabel, size) {
        for (let subtask in ulabel.subtasks) {
            this.update_annotation_size(ulabel, ulabel.subtasks[subtask], size)
        }
    }

    private set_size_cookie(cookie_value, subtask) {
        let d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));

        let subtask_name = subtask.display_name.replaceLowerConcat(" ", "_");

        document.cookie = subtask_name + "_size=" + cookie_value + ";" + d.toUTCString() + ";path=/";
    }

    private read_size_cookie(subtask) {
        let subtask_name = subtask.display_name.replaceLowerConcat(" ", "_");

        let cookie_name = subtask_name + "_size=";       

        let cookie_array = document.cookie.split(";");

        for (let i = 0; i < cookie_array.length; i++) {
            let current_cookie = cookie_array[i];

            //while there's whitespace at the front of the cookie, loop through and remove it
            while (current_cookie.charAt(0) == " ") {
                current_cookie = current_cookie.substring(1);
            }

            if (current_cookie.indexOf(cookie_name) == 0) {
                return current_cookie.substring(cookie_name.length, current_cookie.length)
            }
        }

        return null
    }
    
    public get_html() {
        return `
        <div class="annotation-resize">
            <p class="tb-header">Change Annotation Size</p>
            <div class="annotation-resize-button-holder">
                <span class="annotation-vanish">
                    <button class="annotation-resize-button" id="annotation-resize-v">Vanish</button>
                </span>
                <span class="annotation-size">
                    <button class="annotation-resize-button" id="annotation-resize-s">Small</button>
                    <button class="annotation-resize-button" id="annotation-resize-l">Large</button>
                </span>
                <span class="annotation-inc increment">
                    <button class="annotation-resize-button circle inc" id="annotation-resize-inc">+</button>
                    <button class="annotation-resize-button circle dec" id="annotation-resize-dec">-</button>
                </span>
            </div>
        </div>
        `
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "AnnotationResize"
    }
}

/**
 * ToolboxItem for recoloring annotations and applying gradients to annotations based on confidence.
 */
export class RecolorActiveItem extends ToolboxItem {
    private ulabel: ULabel
    private config: RecolorActiveConfig
    private most_recent_redraw_time: number = 0
    private gradient_turned_on: boolean

    constructor(ulabel: ULabel) {
        super()

        // Save ulabel to this object and grab this component's config from the main config
        this.ulabel = ulabel
        this.config = this.ulabel.config.recolor_active_toolbox_item

        // Add styles and event listeners for this component
        this.add_styles()
        this.add_event_listeners()

        // Read local storage to see if any colors have been saved
        this.read_local_storage()

        // Use the config's default only if a value wasn't found inside local storage
        this.gradient_turned_on ??= this.config.gradient_turned_on
    }

    private save_local_storage_color(class_id: number | string, color: string): void {
        localStorage.setItem(`RecolorActiveItem-${class_id}`, color)
    }

    private save_local_storage_gradient(gradient_status: boolean): void {
        localStorage.setItem("RecolorActiveItem-Gradient", gradient_status.toString())
    }

    private read_local_storage(): void {
        // Loop through every valid id and see if a color has been saved for it in local storage
        for (const class_id of this.ulabel.valid_class_ids) {

            // Get the color from local storage based on the current class id
            const color = localStorage.getItem(`RecolorActiveItem-${class_id}`)

            // Update the color if its not null
            // Additionally no need to save the color to local storage since we got it from reading local storage
            if (color !== null) this.update_color(class_id, color, false)
        }

        // Then read whether or not the gradient should be on by default
        this.gradient_turned_on = localStorage.getItem("RecolorActiveItem-Gradient") === "true"
    }

    private replace_color_pie(): void {
        // Only the current subtask's color can be changed, so only the current subtask needs to be updated
        const current_subtask_key: string = this.ulabel.state.current_subtask
        const current_subtask: ULabelSubtask = this.ulabel.subtasks[current_subtask_key]

        // Get the back and front id dialog's ids
        const id_dialog_id: string = current_subtask.state.idd_id
        const front_id_dialog_id = this.ulabel.subtasks[current_subtask_key].state.idd_id_front

        // Need the width and inner radius of the pie to re-build it
        const width: number = this.ulabel.config.outer_diameter
        const inner_radius = this.ulabel.config.inner_prop * width / 2

        const color_info = this.ulabel.color_info

        // Grab the dialogs and their containers
        let subtask_dialog_container_jq = $("#dialogs__" + current_subtask_key);
        let id_dialog_container = $(`#id_dialog__${current_subtask_key}`)
        let front_subtask_dialog_container_jq = $("#front_dialogs__" + current_subtask_key);
        let front_id_dialog_container = $(`#id_front_dialog__${current_subtask_key}`)

        // Build the html
        let dialog_html_v2 = get_idd_string(
            id_dialog_id, width, this.ulabel.subtasks[current_subtask_key].class_ids,
            inner_radius, color_info
        );
        let front_dialog_html_v2 = get_idd_string(
            front_id_dialog_id, width, this.ulabel.subtasks[current_subtask_key].class_ids,
            inner_radius, color_info
        );

        // Remove the old pies
        id_dialog_container.remove()
        front_id_dialog_container.remove()

        // Add dialog to the document inside their containers
        front_subtask_dialog_container_jq.append(front_dialog_html_v2);
        subtask_dialog_container_jq.append(dialog_html_v2);

        // Re-add the event listener for changing the opacity on hover
        // Set that = this because this references the element inside the event listener instead of the toolbox item
        let that = this
        $(".id_dialog").on("mousemove.ulabel", function (mouse_event) {
            if (!that.ulabel.subtasks[current_subtask_key].state.idd_thumbnail) {
                that.ulabel.handle_id_dialog_hover(mouse_event);
            }
        })
    }

    private update_color(class_id: number | string, color: string, need_to_save: boolean = true): void {
        // Update the color_info for annotations appropriately
        this.ulabel.color_info[class_id] = color

        // Update the color in the AnnotationId button for this class
        const button_color_square = <HTMLDivElement> document.querySelector(`#toolbox_sel_${class_id} > div`)
        if (button_color_square) button_color_square.style.backgroundColor = color

        // Update the id update pie
        this.replace_color_pie()

        // Save the color to local storage if appropriate
        if (need_to_save) this.save_local_storage_color(class_id, color)
    }

    protected add_styles(): void {
        // Define the css
        const css = `
        #toolbox div.recolor-active {
            padding: 0 2rem;
        }

        #toolbox div.recolor-active div.recolor-tbi-gradient {
            font-size: 80%;
        }

        #toolbox div.recolor-active div.gradient-toggle-container {
            text-align: left;
            display: flex;
            align-items: center;
        }

        #toolbox div.recolor-active div.gradient-slider-container {
            display: flex;
            align-items: center;
        }

        #toolbox div.recolor-active div.gradient-slider-container > input {
            width: 50%;
        }

        #toolbox div.recolor-active div.annotation-recolor-button-holder {
            margin: 0.5rem;
            display: grid;
            grid-template-columns: 2fr 1fr;
            grid-template-rows: 1fr 1fr 1fr;
            grid-template-areas:
                "yellow picker"
                "red    picker"
                "cyan   picker";
            gap: 0.25rem 0.75rem;
        }

        #toolbox div.recolor-active div.annotation-recolor-button-holder .color-change-btn {
            height: 1.5rem;
            border-radius: 0.5rem;
        }

        #toolbox div.recolor-active div.annotation-recolor-button-holder #color-change-yellow {
            grid-area: yellow;
            background-color: yellow;
            border: 1px solid rgb(200, 200, 0);
        }

        #toolbox div.recolor-active div.annotation-recolor-button-holder #color-change-red {
            grid-area: red;
            background-color: red;
            border: 1px solid rgb(200, 0, 0);
        }

        #toolbox div.recolor-active div.annotation-recolor-button-holder #color-change-cyan {
            grid-area: cyan;
            background-color: cyan;
            border: 1px solid rgb(0, 200, 200);
        }

        #toolbox div.recolor-active div.annotation-recolor-button-holder div.color-picker-border {
            grid-area: picker;
            background: linear-gradient(to bottom right, red, orange, yellow, green, blue, indigo, violet);
            border: 1px solid black;
            border-radius: 0.5rem;
        }

        #toolbox div.recolor-active div.annotation-recolor-button-holder div.color-picker-border div.color-picker-container {
            width: calc(100% - 8px);
            height: calc(100% - 8px);
            margin: 3px;
            background-color: black;
            border: 1px solid black;
            border-radius: 0.5rem;
        }

        #toolbox div.recolor-active div.color-picker-container input.color-change-picker {
            width: 100%;
            height: 100%;
            padding: 0;
            opacity: 0;
        }`

        // Create an id so this specific style tag can be referenced
        const style_id = "recolor-toolbox-item-styles"

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

    private add_event_listeners(): void {
        // Listener for the static color change buttons
        $(document).on("click.ulabel", ".color-change-btn", (event) => {
            // Grab the color of what button was clicked
            const color: string = event.target.id.slice(13)

            // Get the currently selected class id
            const active_class_id: number = get_active_class_id(this.ulabel)

            // Overwrite the color info with the new color
            this.update_color(active_class_id, color)

            // Redraw the annotations with the new color
            // Since this is a listener for a button, no limit needs to be imposed on the redrawing
            this.redraw(0)
        })

        // Listener for the color picker
        $(document).on("input.ulabel", "input.color-change-picker", (event) => {
            // Get the selected color from the event
            let color: string = event.currentTarget.value

            // Get the currently selected class id
            const active_class_id: number = get_active_class_id(this.ulabel)

            // Update the color for this class
            this.update_color(active_class_id, color)
            
            // Grab the color picker container and update its background to the selected color
            let color_picker_container = <HTMLDivElement> document.getElementById("color-picker-container")
            color_picker_container.style.backgroundColor = color

            // Redraw the annotations with the new color
            this.redraw()
        })

        // Event listener for the gradient toggle
        $(document).on("input.ulabel", "#gradient-toggle", (event) => {
            // Redraw all annotations, not just those in the active subtask because all subtasks can be effected by the gradient
            this.redraw(0)

            // Save whether or not the toggle is checked so when the page is reloaded it can remain in the same state
            this.save_local_storage_gradient(event.target.checked) 
        })

        // Event listener for the gradient max value slider
        $(document).on("input.ulabel", "#gradient-slider", (event) => {
            // Update the slider's label so the user knows exactly which value is selected
            $("div.gradient-slider-value-display").text(event.currentTarget.value + "%");

            // Redraw all annotations because other subtasks can be effected by the gradient slider
            this.redraw(100, true)
        })
    }

    /**
     * Redraw all annotations in the current subtask. Limits how frequently annotations can be redrawn for performance reasons.
     * 
     * @param wait_time Number of milliseconds that must pass since the previous redraw before drawing is allowed again
     * @param redraw_all_annotations False by default. If true, redraws all subtasks. Otherwise only redraws current subtask
     */
    private redraw(wait_time: number = 100, redraw_all_annotations: boolean = false): void {
        // If less than the wait time has passed since since the most recent redraw, then return without drawing
        if (Date.now() - this.most_recent_redraw_time < wait_time) return

        if (redraw_all_annotations) {
            // Redraw all annotations
            this.ulabel.redraw_all_annotations()
        }
        else {
            // Otherwise only redraw the annotations in the subtask we updated
            const current_subtask_key: string = this.ulabel.state.current_subtask
            this.ulabel.redraw_all_annotations(current_subtask_key)
        }

        // Update the most_recent_redraw_time
        this.most_recent_redraw_time = Date.now()
    }

    public get_html(): string {
        return `
        <div class="recolor-active">
            <p class="tb-header">Recolor Annotations</p>
            <div class="recolor-tbi-gradient">
                <div class="gradient-toggle-container">
                    <label for="gradient-toggle" id="gradient-toggle-label">Toggle Gradients:</label>
                    <input type="checkbox" id="gradient-toggle" name="gradient-checkbox" value="gradient" ${this.gradient_turned_on ? "checked" : ""}>
                </div>
                <div class="gradient-slider-container">
                    <label for="gradient-slider" id="gradient-slider-label">Gradient Max:</label>
                    <input type="range" id="gradient-slider" value="100">
                    <div class="gradient-slider-value-display">100%</div>
                </div>
            </div>
            <div class="annotation-recolor-button-holder">
                <input type="button" class="color-change-btn" id="color-change-yellow">
                <input type="button" class="color-change-btn" id="color-change-red">
                <input type="button" class="color-change-btn" id="color-change-cyan">
                <div class="color-picker-border">
                    <div class="color-picker-container" id="color-picker-container">
                        <input type="color" class="color-change-picker" id="color-change-pick">
                    </div>
                </div>
            </div>
        </div>
        `
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type(): string {
        return "RecolorActive"
    }
}

export class KeypointSliderItem extends ToolboxItem {
    public html: string;
    public inner_HTML: string;
    public name: string;
    public slider_bar_id: string;
    public filter_function: Function;
    public get_confidence: Function;
    public mark_deprecated: Function;
    filter_value: number = 0;
    ulabel: ULabel;
    keybinds: {
        "increment": string,
        "decrement": string
    }

    constructor(ulabel: ULabel, kwargs: {[name: string]: any}) {
        super();
        this.inner_HTML = `<p class="tb-header">Keypoint Slider</p>`;
        this.ulabel = ulabel;

        // Use properties in kwargs if kwargs is present
        if (kwargs !== undefined) {
            this.name = kwargs.name;
            this.filter_function = kwargs.filter_function;
            this.get_confidence = kwargs.confidence_function;
            this.mark_deprecated = kwargs.mark_deprecated;
            this.keybinds = kwargs.keybinds
        }
        // Otherwise use defaults
        else {
            this.name = "Keypoint Slider";
            this.filter_function = value_is_lower_than_filter;
            this.get_confidence = get_annotation_confidence;
            this.mark_deprecated = mark_deprecated;
            this.keybinds = {
                "increment": "2",
                "decrement": "1"
            }
            kwargs = {};
        }

        // Create slider bar id
        this.slider_bar_id = this.name.replaceLowerConcat(" ", "-");
        
        // If the config has a default value override the filter_value
        if (this.ulabel.config.hasOwnProperty(this.name.replaceLowerConcat(" ", "_", "_default_value"))) {
            // Set the filter value
            this.filter_value = this.ulabel.config[this.name.replaceLowerConcat(" ", "_", "_default_value")];
        }

        // Check the config to see if we should update the annotations with the default filter on load
        if (this.ulabel.config.filter_annotations_on_load) {
            this.filter_annotations(this.ulabel, this.filter_value);
        }

        this.add_styles()
    }

    
    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Define the css
        const css = `
        /* Component has no css?? */
        `
        // Create an id so this specific style tag can be referenced
        const style_id = "keypoint-slider-toolbox-item-styles"

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

    /**
     * Given the ulabel object and a filter value, go through each annotation and decide whether or 
     * not to deprecate it.
     * 
     * @param ulabel ULabel object
     * @param filter_value The number between 0-100 which annotation's confidence is compared against
     */
    private filter_annotations(ulabel: ULabel, filter_value: number) {
        // Get the current subtask
        const current_subtask = ulabel.subtasks[ulabel.state["current_subtask"]];

        for (const annotation_id in current_subtask.annotations.access) {
            // Get the current annotation from the access object
            const current_annotation: ULabelAnnotation = current_subtask.annotations.access[annotation_id]

            // Get the annotation's confidence as decimal between 0-1
            let confidence: number = this.get_confidence(current_annotation)

            // filter_value will be a number between 0-100, so convert the confidence to a percentage as well
            confidence = Math.round(confidence * 100)

            // Compare the confidence value against the filter value
            const should_deprecate: boolean = this.filter_function(confidence, filter_value)

            // Mark this annotation as either deprecated or undeprecated by the confidence filter
            this.mark_deprecated(current_annotation, should_deprecate, "confidence_filter")
        }
    }

    public get_html() {
        // Create a SliderHandler instance to handle slider interactions
        const slider_handler = new SliderHandler({
            "id": this.name.replaceLowerConcat(" ", "-"),
            "class": "keypoint-slider",
            "default_value": Math.round(this.filter_value * 100).toString(),
            "label_units": "%",
            "slider_event": (slider_value: number) => {
                // Filter the annotations, then redraw them
                this.filter_annotations(this.ulabel, slider_value);
                this.ulabel.redraw_all_annotations();
                // Update class counter
                this.ulabel.toolbox.redraw_update_items(this.ulabel);
            }
        })

        return `
        <div class="keypoint-slider">
            <p class="tb-header">${this.name}</p>
            ` + slider_handler.getSliderHTML() + `
        </div>
        `
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "KeypointSlider"
    }
}

export class FilterPointDistanceFromRow extends ToolboxItem {
    name: string // Component name shown to users
    component_name: string // Internal component name
    default_values: AnnotationClassDistanceData // Values sliders are set to on page load
    filter_min: number // Minimum value slider may be set to
    filter_max: number // Maximum value slider may be set to
    step_value: number // Value slider increments by
    filter_on_load: boolean // Whether or not to filter annotations on page load
    multi_class_mode: boolean // Whether or not the component is currently in multi-class mode
    show_options: boolean // Whether or not the options dialog will be visable
    collapse_options: boolean// Whether or not the options is in a collapsed state
    show_overlay: boolean // Whether or not the overlay will be shown
    toggle_overlay_keybind: string 
    overlay: FilterDistanceOverlay

    ulabel: ULabel // The ULabel object. Must be passed in
    config: FilterDistanceConfig // This object's config object

    constructor(ulabel: ULabel, kwargs: {[name: string]: any} = null) {
        super()

        this.ulabel = ulabel
        
        // Get this component's config from ulabel's config
        this.config = this.ulabel.config.distance_filter_toolbox_item

        // Create a set of defaults for every config value
        const default_values = {
            "name": <string> "Filter Distance From Row",
            "component_name": <string> "fitler_distance_from_row",
            "filter_min": <number> 0,
            "filter_max": <number> 100,
            "default_values": <AnnotationClassDistanceData> {"single": 50},
            "step_value": <number> 1,
            "multi_class_mode": <boolean> false,
            "filter_on_load": <boolean> true,
            "show_options": <boolean> true,
            "toggle_overlay_keybind": <string> "p"
        }

        // Loop through every key value pair in the config
        for (const [key, value] of Object.entries(this.config)) {
            // If the passed in value's type !== the default value's type then use the default value
            if (typeof value !== typeof default_values[key]) {
                this.config[key] = default_values[key]
            }
        }

        // Set the component's properties to be the same as the config's properties
        for (const property in this.config) {
            this[property] = this.config[property]
        }
        
        // Get if the options should be collapsed from local storage
        if (window.localStorage.getItem("filterDistanceCollapseOptions") === "true") {
            this.collapse_options = true
        }
        else if (window.localStorage.getItem("filterDistanceCollapseOptions") === "false") {
            this.collapse_options = false
        }
 
        // Create an overlay and determine whether or not it should be displayed
        this.create_overlay()
        if (window.localStorage.getItem("filterDistanceShowOverlay") === "true") {
            this.show_overlay = true
            this.overlay.update_display_overlay(true)
        }
        else if (window.localStorage.getItem("filterDistanceShowOverlay") === "false") {
            this.show_overlay = false
            this.overlay.update_display_overlay(false)
        }
        else if (this.config.show_overlay_on_load !== undefined || this.config.show_overlay_on_load !== null) {
            this.show_overlay = this.config.show_overlay_on_load
        }
        else {
            this.show_overlay = false // Default
        }

        this.add_styles()

        this.add_event_listeners()
    }

    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Define the css
        const css = `
            #toolbox div.filter-row-distance {
                text-align: left;
            }

            #toolbox p.tb-header {
                margin: 0.75rem 0 0.5rem;
            }

            #toolbox div.filter-row-distance fieldset.filter-row-distance-options {
                display: inline-block;
                position: relative;
                left: 1rem;
                margin-bottom: 0.5rem;
                font-size: 80%;
                user-select: none;
            }

            #toolbox div.filter-row-distance fieldset.filter-row-distance-options * {
                text-align: left;
            }

            #toolbox div.filter-row-distance fieldset.filter-row-distance-options.ulabel-collapsed {
                border: none;
                margin-bottom: 0;
                padding: 0; /* Padding takes up too much space without the content */

                /* Needed to prevent the element from moving when ulabel-collapsed is toggled 
                0.75em comes from the previous padding, 2px comes from the removed border */
                padding-left: calc(0.75em + 2px)
            }

            #toolbox div.filter-row-distance fieldset.filter-row-distance-options legend {
                border-radius: 0.1rem;
                padding: 0.1rem 0.3rem;
                cursor: pointer;
            }

            #toolbox div.filter-row-distance fieldset.filter-row-distance-options.ulabel-collapsed legend {
                padding: 0.1rem 0.28rem;
            }

            #toolbox div.filter-row-distance fieldset.filter-row-distance-options.ulabel-collapsed :not(legend) {
                display: none;
            }

            #toolbox div.filter-row-distance fieldset.filter-row-distance-options legend:hover {
                background-color: rgba(128, 128, 128, 0.3)
            }

            #toolbox div.filter-row-distance fieldset.filter-row-distance-options input[type="checkbox"] {
                margin: 0;
            }

            #toolbox div.filter-row-distance fieldset.filter-row-distance-options label {
                position: relative;
                top: -0.2rem;
                font-size: smaller;
            }`

        // Create an id so this specific style tag can be referenced
        const style_id = "filter-distance-from-row-toolbox-item-styles"

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

    private add_event_listeners() {
        // Whenever the options legend is clicked, toggle displaying the options
        $(document).on("click.ulabel", "fieldset.filter-row-distance-options > legend", () => this.toggleCollapsedOptions())

        // Whenever the multi-class filtering checkbox is clicked, switch the displayed filter mode
        $(document).on("click.ulabel", "#filter-slider-distance-multi-checkbox", () => {
            // Toggle the multi-class state
            this.multi_class_mode = !this.multi_class_mode

            // Toggle whether the single-class slider, or the multi-class sliders are visible
            this.switchFilterMode()

            this.overlay.update_mode(this.multi_class_mode ? "multi" : "single")

            // Re-filter the points in the new mode
            filter_points_distance_from_line(this.ulabel)
        })

        $(document).on("change.ulabel", "#filter-slider-distance-toggle-overlay-checkbox", (event) => {
            // Update whether or not the overlay is allowed to be drawn
            this.overlay.update_display_overlay(event.currentTarget.checked)

            // Try to draw the overlay
            this.overlay.draw_overlay()

            // Save whether or not the overlay is allowed to be drawn to local storage
            window.localStorage.setItem("filterDistanceShowOverlay", event.currentTarget.checked.toString())
        })

        $(document).on("keypress.ulabel", (event) => {
            if (event.key !== this.toggle_overlay_keybind) return

            // Grab the show overlay checkbox and click it
            const show_overlay_checkbox: HTMLInputElement = document.querySelector("#filter-slider-distance-toggle-overlay-checkbox")
            show_overlay_checkbox.click()
        })
    }

    /**
     * Toggle which filter mode is being displayed and which one is being hidden.
     */
    private switchFilterMode() {
        $("#filter-single-class-mode").toggleClass("ulabel-hidden")
        $("#filter-multi-class-mode").toggleClass("ulabel-hidden")
    }

    /**
     * Toggles whether or not the options should be displayed.
     */
    private toggleCollapsedOptions() {
        // Toggle the class which collapses the options
        $("fieldset.filter-row-distance-options").toggleClass("ulabel-collapsed")

        // Toggle the state
        this.collapse_options = !this.collapse_options

        // Save the state to the user's browser so it can be re-loaded in the same state
        window.localStorage.setItem("filterDistanceCollapseOptions", this.collapse_options.toString())
    }

    private create_overlay() {
        // Get only the set of all line annotations
        const line_annotations: ULabelAnnotation[] = get_point_and_line_annotations(this.ulabel)[1]

        // Initialize an object to hold the distances points are allowed to be from each class as well as any line
        let filter_values: AnnotationClassDistanceData = {"single": undefined}

        // Grab all filter-distance-sliders on the page
        const sliders: NodeListOf<HTMLInputElement> = document.querySelectorAll(".filter-row-distance-slider")

        // Loop through each slider and populate filter_values
        for (let idx = 0; idx < sliders.length; idx++) {
            // Use a regex to get the string after the final - character in the slider id (Which is the class id or the string "single")
            const slider_class_name = /[^-]*$/.exec(sliders[idx].id)[0]

            // Use the class id as a key to store the slider's value
            filter_values[slider_class_name] = sliders[idx].valueAsNumber
        }

        // Create and assign an overlay class instance to ulabel to be able to access it
        this.overlay = new FilterDistanceOverlay(
            this.ulabel.config["image_width"] * this.ulabel.config["px_per_px"],
            this.ulabel.config["image_height"] * this.ulabel.config["px_per_px"],
            line_annotations,
            this.ulabel.config["px_per_px"]
        )

        // Apply the generated distances to the overlay
        this.overlay.update_distances(filter_values)
    }

    public get_overlay() {
        return this.overlay
    }

    /**
     * Gets all classes that polylines can be and creates a distance filter for each class.
     * 
     * @returns {string} HTML for the multi-class filtering mode
     */
    private createMultiFilterHTML(): string {
        // Get all potential classes
        const class_defs = findAllPolylineClassDefinitions(this.ulabel)

        let multi_class_html: string = ``

        // Loop through each class and create their html
        for (let idx = 0; idx < class_defs.length; idx++) {
            // Grab current class for convenience
            const current_id = class_defs[idx].id
            const current_name = class_defs[idx].name

            let default_value: string
            if (this.default_values[current_id] !== undefined) {
                default_value = this.default_values[current_id].toString()
            }
            else {
                default_value = this.default_values["single"].toString()
            }

            const multi_class_slider_instance = new SliderHandler({
                "id": `filter-row-distance-${current_id}`,
                "class": "filter-row-distance-slider filter-row-distance-class-slider",
                "min": this.filter_min.toString(),
                "max": this.filter_max.toString(),
                "default_value": default_value,
                "step": this.step_value.toString(),
                "label_units": "px",
                "main_label": current_name,
                "slider_event": () => filter_points_distance_from_line(this.ulabel)
            })

            // Add current classes html to multi_class_html
            multi_class_html += multi_class_slider_instance.getSliderHTML()
        }

        return multi_class_html
    }

    /**
     * Returns the component's html.
     * 
     * @returns {String} Component's html
     */
    public get_html(): string {
        // Get the multi-class filter html
        const multi_class_html: string = this.createMultiFilterHTML()

        /* Create a SliderHandler instance to take care of creating the single class slider's html
           and its event handlers */
        const single_class_slider_handler = new SliderHandler({
            "class": "filter-row-distance-slider",
            "default_value": this.default_values["single"].toString(),
            "id": "filter-row-distance-single",
            "label_units": "px",
            "slider_event": () => filter_points_distance_from_line(this.ulabel),
            "min": this.filter_min.toString(),
            "max": this.filter_max.toString(),
            "step": this.step_value.toString()
        })

        return`
        <div class="filter-row-distance">
            <p class="tb-header">${this.name}</p>
            <fieldset class="
                    filter-row-distance-options 
                    ${this.show_options ? "" : "ulabel-hidden"} 
                    ${this.collapse_options ? "ulabel-collapsed" : "" } 
                ">
                <legend>
                    Options ˅
                </legend>
                <div class="filter-row-distance-option">
                    <input
                        type="checkbox"
                        id="filter-slider-distance-multi-checkbox"
                        class="filter-row-distance-options-checkbox"
                        ${this.multi_class_mode ? "checked" : ""}
                    />
                    <label
                        for="filter-slider-distance-multi-checkbox"
                        id="filter-slider-distance-multi-checkbox-label"
                        class="filter-row-distance-label">
                        Multi-Class Filtering
                    </label>
                </div>
                <div class="filter-row-distance-option">
                    <input
                        type="checkbox"
                        id="filter-slider-distance-toggle-overlay-checkbox"
                        class="filter-row-distance-options-checkbox"
                        ${this.show_overlay ? "checked" : ""}
                    />
                    <label
                        for="filter-slider-distance-toggle-overlay-checkbox"
                        id="filter-slider-distance-toggle-overlay-checkbox-label"
                        class="filter-row-distance-label">
                        Show Filter Range
                    </label>
                </div>
            </fieldset>
            <div id="filter-single-class-mode" class="${!this.multi_class_mode ? "" : "ulabel-hidden"}">
                ${single_class_slider_handler.getSliderHTML()}
            </div>
            <div id="filter-multi-class-mode" class="${this.multi_class_mode ? "" : "ulabel-hidden"}">
                ` + multi_class_html + `
            </div>
        </div>
        `
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "FilterDistance"
    }
}

export class SubmitButtons extends ToolboxItem {
    private submit_buttons: ULabelSubmitButtons;
    private submit_buttons_by_row: ULabelSubmitButtons[];

    constructor(ulabel: ULabel) {
        super();
    
        // Grab the submit buttons from ulabel
        this.submit_buttons = ulabel.config.submit_buttons

        this.add_styles()

        this.add_event_listeners()

        // For legacy reasons submit_buttons may be a function, in that case convert it to the right format
        if (typeof this.submit_buttons == "function") {
            this.submit_buttons = [{
                "name": "Submit",
                "hook": this.submit_buttons
            }]
        }

        this.submit_buttons_by_row = this.sort_buttons_by_row_number()

        for (let idx in this.submit_buttons) {

            // Create a unique event listener for each submit button in the submit buttons array.
            $(document).on("click.ulabel", "#" + this.submit_buttons[idx].name.replaceLowerConcat(" ", "-"), async (e) => {
                // Grab the button
                const button: HTMLButtonElement = <HTMLButtonElement> document.getElementById(this.submit_buttons[idx].name.replaceLowerConcat(" ", "-"));
                
                // Grab all of the submit buttons
                let submit_button_elements = <HTMLButtonElement[]> Array.from(document.getElementsByClassName("submit-button"));
                
                // Make all the buttons look disabled
                for (let i in submit_button_elements) {
                    submit_button_elements[i].disabled = true;
                    submit_button_elements[i].style.filter = "opacity(0.7)";
                }

                // Give the clicked button a loading animation
                button.innerText = "";
                let animation = document.createElement("div");
                animation.className = "lds-dual-ring";
                button.appendChild(animation);

                // Create the submit payload
                let submit_payload = {
                    "task_meta": ulabel.config["task_meta"],
                    "annotations": {}
                };

                // Loop through all of the subtasks
                for (const stkey in ulabel.subtasks) {
                    submit_payload["annotations"][stkey] = [];

                    // Add all of the annotations in that subtask
                    for (let i = 0; i < ulabel.subtasks[stkey]["annotations"]["ordering"].length; i++) {
                        let annotation = ulabel.subtasks[stkey]["annotations"]["access"][ulabel.subtasks[stkey]["annotations"]["ordering"][i]];
                        // Skip any delete modes
                        if (
                            DELETE_MODES.includes(annotation.spatial_type)
                        ) {
                            continue;
                        }

                        // Skip spatial annotations that have an empty spatial payload
                        if (
                            NONSPATIAL_MODES.includes(annotation.spatial_type) ||
                            annotation.spatial_payload.length === 0
                        ) {
                            continue;
                        }

                        submit_payload["annotations"][stkey].push(annotation);
                    }
                }

                // Set set_saved if it was provided
                if (this.submit_buttons[idx].set_saved !== undefined) {
                    ulabel.set_saved(this.submit_buttons[idx].set_saved);
                }
                
                await this.submit_buttons[idx].hook(submit_payload);

                // Give the button back its name
                button.innerText = this.submit_buttons[idx].name;

                // Re-enable the buttons
                for (let i in submit_button_elements) {
                    submit_button_elements[i].disabled = false;
                    submit_button_elements[i].style.filter = "opacity(1)";
                }
            })
        }
    }

    /**
     * Group submit buttons by row number
     * 
     * @returns {ULabelSubmitButtons[]} Array of submit buttons grouped by row number
     */
    private sort_buttons_by_row_number() {
        let submit_buttons_by_row: ULabelSubmitButtons[] = [];
        // First, get all the unique row numbers. 
        // If a button doesn't have a row number, it will be placed in row 0.
        let row_numbers: Set<number> = new Set(this.submit_buttons.map((button) => button.row_number ? button.row_number : 0));
        // Sort the row numbers
        let sorted_row_numbers: number[] = Array.from(row_numbers).sort((a, b) => a - b);
        // Group the buttons by row number
        for (let row_number of sorted_row_numbers) {
            submit_buttons_by_row.push(
                this.submit_buttons.filter((button) => button.row_number === row_number)
            );
        }
        console.log(sorted_row_numbers);
        console.log(submit_buttons_by_row);
        return submit_buttons_by_row;
    }

    
    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Styles defined in blobs.js and get_html()
    }

    add_event_listeners(): void {
        $(document).on("keypress.ulabel", (event) => {
            const ctrl = event.ctrlKey || event.metaKey
            if (ctrl &&
                (
                    event.key === "s" ||
                    event.key === "S"
                )
            ) {
                event.preventDefault();
                $(".submit-button")[0].click(); // Click the first submit button
            }
        })
    }

    get_html(): string {
        let toolboxitem_html = ``

        for (let submit_buttons of this.submit_buttons_by_row) {
            // Create a row for each row of submit buttons
            toolboxitem_html += `<div class="submit-button-container">`

            // Create each button in the row
            for (let submit_button of submit_buttons) {
                let button_color = "rgba(255, 166, 0, 0.739)"
                if (submit_button.color !== undefined) {
                    button_color = submit_button.color
                }

                // Get the size scale
                let size_factor = 1
                if (submit_button.size_factor !== undefined) {
                    size_factor = submit_button.size_factor
                }

                toolboxitem_html += `
                <button 
                    id="${submit_button.name.replaceLowerConcat(" ", "-")}" 
                    class="submit-button" 
                    style="
                        background-color: ${button_color};
                        border: 1px solid ${button_color};
                        transform: scale(${size_factor});
                ">
                    ${submit_button.name}
                </button>
                `
            }
            // Close the row div
            toolboxitem_html += `</div>`
        }
        
        return toolboxitem_html
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "SubmitButtons"
    }
}

// export class WholeImageClassifierToolboxTab extends ToolboxItem {
//     constructor() {
//         super(
//             "toolbox-whole-image-classifier",
//             "Whole Image Classification",
//             ""
//         );
//     }

// }