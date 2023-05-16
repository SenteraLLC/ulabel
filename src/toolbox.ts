import { FilterDistanceOverride, ULabel } from "..";
import { ULabelAnnotation } from "./annotation";
import { ULabelSubtask } from "./subtask";
import { Configuration } from "./configuration";
import { 
    get_annotation_confidence, 
    value_is_lower_than_filter, 
    mark_deprecated, 
    filter_points_distance_from_line,
    findAllPolylineClassIds,
    value_is_higher_than_filter, 
} from "./annotation_operators";

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

    abstract get_html(): string;
    public redraw_update(ulabel: ULabel): void {}
    public frame_update(ulabel: ULabel): void {} 
}

/**
 * Toolbox item for selecting annotation mode.
 */
export class ModeSelectionToolboxItem extends ToolboxItem {
    constructor(public ulabel: ULabel) {
        super();

        // Buttons to change annotation mode
        $(document).on("click", "a.md-btn", (e) => {
            
            // Grab the current target and the current subtask
            let target_jq = $(e.currentTarget);
            let current_subtask = ulabel.state["current_subtask"];

            // Check if button clicked is already selected, or if creation of a new annotation is in progress
            if (target_jq.hasClass("sel") || ulabel.subtasks[current_subtask]["state"]["is_in_progress"]) return;

            // Get the new mode and set it to ulabel's current mode
            let new_mode = target_jq.attr("id").split("--")[1];
            ulabel.subtasks[current_subtask]["state"]["annotation_mode"] = new_mode;

            // Reset the previously selected mode button
            $("a.md-btn.sel").attr("href", "#");
            $("a.md-btn.sel").removeClass("sel");

            // Make the selected class look selected
            target_jq.addClass("sel");
            target_jq.removeAttr("href");

            ulabel.show_annotation_mode(target_jq);
        });

        $(document).on("keypress", (e) => {

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

        $(document).on("click", "#recenter-button", () => {
            ulabel.show_initial_crop();
        });

        $(document).on("click", "#recenter-whole-image-button", () => {
            ulabel.show_whole_image();
        });

        $(document).on("keypress", (e) => {
            if (e.key == ulabel.config.change_zoom_keybind.toLowerCase()) {
                document.getElementById("recenter-button").click()
            }
            if (e.key == ulabel.config.change_zoom_keybind.toUpperCase()) {
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
            <div class="half-tb htbmain set-zoom">
                <p class="shortcut-tip">ctrl+scroll or shift+drag</p>
                <div class="zpcont">
                    <div class="lblpyldcont">
                        <span class="pzlbl htblbl">Zoom</span>
                        <span class="zinout htbpyld">
                            <a href="#" class="zbutt zout">-</a>
                            <a href="#" class="zbutt zin">+</a>
                        </span>
                    </div>
                </div>
            </div><!--
            --><div class="half-tb htbmain set-pan">
                <p class="shortcut-tip">scrollclick+drag or ctrl+drag</p>
                <div class="zpcont">
                    <div class="lblpyldcont">
                        <span class="pzlbl htblbl">Pan</span>
                        <span class="panudlr htbpyld">
                            <a href="#" class="pbutt left"></a>
                            <a href="#" class="pbutt right"></a>
                            <a href="#" class="pbutt up"></a>
                            <a href="#" class="pbutt down"></a>
                            <span class="spokes"></span>
                        </span>
                    </div>
                </div>
            </div>
            <div class="recenter-cont" style="text-align: center;">
                <a href="#" id="recenter-button">Re-Center</a>
                <a href="#" id="recenter-whole-image-button">Whole Image</a>
            </div>
            ${this.frame_range}
        </div>
        `;
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
    }

    private set_instructions(ulabel) {
        this.instructions = "";
        if (ulabel.config["instructions_url"] != null) {
            this.instructions = `
                <a href="${ulabel.config["instructions_url"]}" target="_blank" rel="noopener noreferrer">Instructions</a>
            `;
        }
    }

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
}

export class ClassCounterToolboxItem extends ToolboxItem {
    public html: string;
    public inner_HTML: string;
    constructor(...args) {
        super();
        this.inner_HTML = `<p class="tb-header">Annotation Count</p>`;
    }

    update_toolbox_counter(subtask, toolbox_id) {
        if (subtask == null) {
            return;
        }
        let class_ids = subtask.class_ids;
        let i: number, j: number;
        let class_counts = {};
        for (i = 0;i < class_ids.length;i++) {
            class_counts[class_ids[i]] = 0;
        }
        let annotations = subtask.annotations.access;
        let annotation_ids = subtask.annotations.ordering;
        var current_annotation: ULabelAnnotation, current_payload;
        for (i = 0;i < annotation_ids.length;i++) {
            current_annotation = annotations[annotation_ids[i]];
            if (current_annotation.deprecated == false) {
                for(j = 0;j < current_annotation.classification_payloads.length;j++) {
                    current_payload = current_annotation.classification_payloads[j];
                    if(current_payload.confidence > 0.0) {
                        class_counts[current_payload.class_id] += 1;
                        break;
                    }
                }
            }
        }
        let f_string = "";
        let class_name: string, class_count: number;
        for(i = 0;i<class_ids.length;i++) {
            class_name = subtask.class_defs[i].name;
            // MF-Tassels Hack
            if(class_name.includes("OVERWRITE")) {
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

    public redraw_update(ulabel: ULabel) {
        this.update_toolbox_counter(
            ulabel.subtasks[ulabel.state["current_subtask"]],
            ulabel.config["toolbox_id"]
        );
        $("#" + ulabel.config["toolbox_id"] + " div.toolbox-class-counter").html(this.inner_HTML);
    }
}

/**
 * Toolbox item for resizing all annotations
 */
export class AnnotationResizeItem extends ToolboxItem {
    public cached_size: number = 1.5;
    public html: string;
    public inner_HTML: string;
    private keybind_configuration: {[key: string]: string}
    constructor(ulabel: ULabel) {
        super();
        this.inner_HTML = `<p class="tb-header">Annotation Count</p>`;
        //get default keybinds
        this.keybind_configuration = ulabel.config.default_keybinds

        //grab current subtask for convinience
        let current_subtask_key = ulabel.state["current_subtask"];
        let current_subtask = ulabel.subtasks[current_subtask_key];

        //First check for a size cookie, if one isn't found then check the config
        //for a default annotation size. If neither are found it will use the size
        //that the annotation was saved as.
        for (let subtask in ulabel.subtasks) {
            let cached_size_property = ulabel.subtasks[subtask].display_name.replaceLowerConcat(" ", "-", "-cached-size")
            let size_cookie = this.read_size_cookie(ulabel.subtasks[subtask])
            if ((size_cookie != null) && size_cookie != "NaN") {
                this.update_annotation_size(ulabel.subtasks[subtask], Number(size_cookie));
                this[cached_size_property] = Number(size_cookie)
            }
            else if (ulabel.config.default_annotation_size != undefined) {          
                this.update_annotation_size(ulabel.subtasks[subtask], ulabel.config.default_annotation_size);
                this[cached_size_property] = ulabel.config.default_annotation_size
            } 
            else {
                const DEFAULT_SIZE = 5
                this.update_annotation_size(ulabel.subtasks[subtask], DEFAULT_SIZE)
                this[cached_size_property] = DEFAULT_SIZE
            }
        }

        //event listener for buttons
        $(document).on("click", "a.butt-ann", (e) => {
            let button = $(e.currentTarget);
            let current_subtask_key = ulabel.state["current_subtask"];
            let current_subtask = ulabel.subtasks[current_subtask_key];
            const annotation_size = button.attr("id").slice(18);
            this.update_annotation_size(current_subtask, annotation_size);
            ulabel.redraw_all_annotations(null, null, false);
        })
        //event listener for keybinds
        $(document).on("keypress", (e) => {
            let current_subtask_key = ulabel.state["current_subtask"];
            let current_subtask = ulabel.subtasks[current_subtask_key];
            switch(e.key) {
                case this.keybind_configuration.annotation_vanish.toUpperCase():
                    this.update_all_subtask_annotation_size(ulabel, "v");
                    break;
                case this.keybind_configuration.annotation_vanish:
                    this.update_annotation_size(current_subtask, "v")
                    break;
                case this.keybind_configuration.annotation_size_small:
                    this.update_annotation_size(current_subtask, "s")
                    break;
                case this.keybind_configuration.annotation_size_large:
                    this.update_annotation_size(current_subtask, "l")
                    break;
                case this.keybind_configuration.annotation_size_minus:
                    this.update_annotation_size(current_subtask, "dec")
                    break;
                case this.keybind_configuration.annotation_size_plus:
                    this.update_annotation_size(current_subtask, "inc")
                    break;
            }
            ulabel.redraw_all_annotations(null, null, false);
        } )
    }
        

    //recieives a string of 's', 'l', 'dec', 'inc', or 'v' depending on which button was pressed
    //also the constructor can pass in a number from the config
    public update_annotation_size(subtask, size) {
        const small_size = 1.5;
        const large_size = 5;
        const increment_size = 0.5;
        const vanish_size = 0.01;
        let subtask_cached_size = subtask.display_name.replaceLowerConcat(" ", "-", "-cached-size");

        if (subtask == null) return;
        let subtask_vanished_flag = subtask.display_name.replaceLowerConcat(" ", "-", "-vanished");
        //If the annotations are currently vanished and a button other than the vanish button is
        //pressed, then we want to ignore the input
        if (this[subtask_vanished_flag] && size !== "v") return;

        if (typeof(size) === "number") {
            this.loop_through_annotations(subtask, size, "=");
        }

        if (size == "v") {
            if (this[subtask_vanished_flag]) { 
                this.loop_through_annotations(subtask, this[subtask_cached_size], "=")
                //flip the bool state
                this[subtask_vanished_flag] = !this[subtask_vanished_flag]
                $("#annotation-resize-v").attr("style","background-color: "+"rgba(100, 148, 237, 0.8)");
                return;
            }
            if (!this[subtask_vanished_flag]) {
                this.loop_through_annotations(subtask, vanish_size, "=")
                //flip the bool state
                this[subtask_vanished_flag] = !this[subtask_vanished_flag]
                $("#annotation-resize-v").attr("style","background-color: "+"#1c2d4d");
                return;
            }
            return;
        }

        switch(size) {
            case 's':
                this.loop_through_annotations(subtask, small_size, "=")
                this[subtask_cached_size] = small_size
                break;           
            case 'l':
                this.loop_through_annotations(subtask, large_size, "=")
                this[subtask_cached_size] = large_size
                break;
            case 'dec':
                this.loop_through_annotations(subtask, increment_size, "-")
                break;
            case 'inc':
                this.loop_through_annotations(subtask, increment_size, "+")
                break;    
            default:
                return;
        }
    }
    //loops through all annotations in a subtask to change their line size
    public loop_through_annotations(subtask, size, operation) {
        let subtask_cached_size = subtask.display_name.replaceLowerConcat(" ", "-", "-cached-size");
        if (operation == "=") {
            for (const annotation_id in subtask.annotations.access) {
                subtask.annotations.access[annotation_id].line_size = size;
            }

            // Don't set the vanished size as a cookie
            if (size == 0.01) return;

            this.set_size_cookie(size, subtask);
            return;
        }
        if (operation == "+") {
            for (const annotation_id in subtask.annotations.access) {
                subtask.annotations.access[annotation_id].line_size += size;
                //temporary solution
                this[subtask_cached_size] = subtask.annotations.access[annotation_id].line_size
            }
            this.set_size_cookie(subtask.annotations.access[subtask.annotations.ordering[0]].line_size, subtask)
            return;
        }
        if (operation == "-") {
            for (const annotation_id in subtask.annotations.access) {
                //Check to make sure annotation line size won't go 0 or negative. If it would
                //set it equal to a small positive number
                if (subtask.annotations.access[annotation_id].line_size - size <= 0.01) {
                    subtask.annotations.access[annotation_id].line_size = 0.01
                } else {
                    subtask.annotations.access[annotation_id].line_size -= size;
                }
                //temporary solution
                this[subtask_cached_size] = subtask.annotations.access[annotation_id].line_size
            }
            this.set_size_cookie(subtask.annotations.access[subtask.annotations.ordering[0]].line_size, subtask)
            return;
        }
        throw Error("Invalid Operation given to loop_through_annotations")
    }

    //Loop through all subtasks and apply a size to them all
    public update_all_subtask_annotation_size(ulabel, size) {
        for (let subtask in ulabel.subtasks) {
            this.update_annotation_size(ulabel.subtasks[subtask], size)
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
                    <a href="#" class="butt-ann button" id="annotation-resize-v">Vanish</a>
                </span>
                <span class="annotation-size">
                    <a href="#" class="butt-ann button" id="annotation-resize-s">Small</a>
                    <a href="#" class="butt-ann button" id="annotation-resize-l">Large</a>
                </span>
                <span class="annotation-inc increment">
                    <a href="#" class="butt-ann button inc" id="annotation-resize-inc">+</a>
                    <a href="#" class="butt-ann button dec" id="annotation-resize-dec">-</a>
                </span>
            </div>
        </div>
        `
    }
}

export class RecolorActiveItem extends ToolboxItem { 
    public html: string;
    public inner_HTML: string;
    private most_recent_draw: number = Date.now()
    constructor(ulabel: ULabel) {
        super();
        this.inner_HTML = `<p class="tb-header">Recolor Annotations</p>`;
        
        let current_subtask_key = ulabel.state["current_subtask"];
        let current_subtask = ulabel.subtasks[current_subtask_key];

        //loop through all the types of annotations and check to see it there's
        //a color cookie corresponding to that class id
        for (let i = 0; i < current_subtask.classes.length; i++) {
            let cookie_color = this.read_color_cookie(current_subtask.classes[i].id)
            if (cookie_color !== null) {
                this.update_annotation_color(current_subtask, cookie_color, current_subtask.classes[i].id)
            }
        }
        ULabel.process_classes(ulabel, ulabel.state.current_subtask, current_subtask);

        //event handler for the buttons
        $(document).on("click", "input.color-change-btn", (e) => {
            let button = $(e.currentTarget);
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];

            //slice 13,16 to grab the part of the id that specifies color
            const color_from_id = button.attr("id").slice(13,16);
            this.update_annotation_color(current_subtask, color_from_id);

            ULabel.process_classes(ulabel, ulabel.state.current_subtask, current_subtask);

            ulabel.redraw_all_annotations(null, null, false);
        })
        $(document).on("input", "input.color-change-picker", (e) => {
            //Gets the current subtask
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];

            //Gets the hex value from the color picker
            let hex = e.currentTarget.value;

            this.update_annotation_color(current_subtask, hex);
            
            //somewhat janky way to update the color on the color picker 
            //to allow for more css options
            let color_picker_container = document.getElementById("color-picker-container");
            color_picker_container.style.backgroundColor = hex;

            ULabel.process_classes(ulabel, ulabel.state.current_subtask, current_subtask);

            this.limit_redraw(ulabel);
        })
        $(document).on("input", "#gradient-toggle", (e) => {
            ulabel.redraw_all_annotations(null, null, false);
            this.set_gradient_cookie($("#gradient-toggle").prop("checked"));  
        })
        $(document).on("input", "#gradient-slider", (e) => {
            $("div.gradient-slider-value-display").text(e.currentTarget.value + "%");
            ulabel.redraw_all_annotations(null, null, false);
        })
    }

    public update_annotation_color(subtask, color, selected_id = null) {
        let need_to_set_cookie = true
        if (selected_id !== null) {
            need_to_set_cookie = false
        }
        
        //check for the three special cases, otherwise assume color is a hex value
        if (color == "yel") {
            color ="#FFFF00";
        }
        if (color == "red") {
            color ="#FF0000";
        }
        if (color == "cya") {
            color ="#00FFFF";
        }

        if (selected_id == null) {
            subtask.state.id_payload.forEach(item => {              
                if (item.confidence == 1) {
                    selected_id = item.class_id;
                }  
            });
        }

        //if the selected id is still null, then that means that no id was passed
        //in or had a confidence of 1. Therefore the default is having the first 
        //annotation id selected, so we'll default to that
        if (selected_id == null) {
            selected_id = subtask.classes[0].id;
        }

        subtask.classes.forEach(item => {
            if (item.id === selected_id) {
                item.color = color;
            }
        })

        //$("a.toolbox_sel_"+selected_id+":first").attr("backround-color", color);
        let colored_square_element = ".toolbox_colprev_"+selected_id;
        $(colored_square_element).attr("style","background-color: "+color);
        
        //Finally set a cookie to remember color preference if needed
        if (need_to_set_cookie) {
            this.set_color_cookie(selected_id, color);
        }
    }

    
    private limit_redraw(ulabel: ULabel, wait_time: number = 100) {

        //Compare most recent draw time to now and only draw if  
        //more than wait_time milliseconds have passed. 
        if (Date.now() - this.most_recent_draw > wait_time) {

            //update most recent draw to now
            this.most_recent_draw = Date.now();

            //redraw annotations
            ulabel.redraw_all_annotations(null, null, false);
        }
    }

    private set_color_cookie(annotation_id, cookie_value) {
        let d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));
        document.cookie = "color" + annotation_id + "=" + cookie_value + ";" + d.toUTCString() + ";path=/";
    }

    private read_color_cookie(annotation_id) {
        let cookie_name = "color" + annotation_id + "=";       

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

    private set_gradient_cookie(gradient_status) {
        let d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));
        document.cookie = "gradient=" + gradient_status + ";" + d.toUTCString() + ";path=/";
    }

    private read_gradient_cookie() {
        let cookie_name = "gradient=";       

        let cookie_array = document.cookie.split(";");

        for (let i = 0; i < cookie_array.length; i++) {
            let current_cookie = cookie_array[i];

            //while there's whitespace at the front of the cookie, loop through and remove it
            while (current_cookie.charAt(0) == " ") {
                current_cookie = current_cookie.substring(1);
            }

            if (current_cookie.indexOf(cookie_name) == 0) {
                return (current_cookie.substring(cookie_name.length, current_cookie.length) == "true")
            }
        }

        return null
    }

    public get_html() {

        let checked_status_bool: boolean = this.read_gradient_cookie(); //true, false, or null
        let checked_status_string: string = ""

        //null means no cookie, so grab the default from configuration
        if (checked_status_bool == null) {
            checked_status_bool = Configuration.annotation_gradient_default;
        }

        if (checked_status_bool == true) {
            checked_status_string = "checked";

        }

        return `
        <div class="recolor-active">
            <p class="tb-header">Recolor Annotations</p>
            <div class="recolor-tbi-gradient">
                <div>
                    <label for="gradient-toggle" id="gradient-toggle-label">Toggle Gradients</label>
                    <input type="checkbox" id="gradient-toggle" name="gradient-checkbox" value="gradient" ${checked_status_string}>
                </div>
                <div>
                    <label for="gradient-slider" id="gradient-slider-label">Gradient Max</label>
                    <input type="range" id="gradient-slider" value="100">
                    <div class="gradient-slider-value-display">100%</div>
                </div>
            </div>
            <div class="annotation-recolor-button-holder">
                <div class="color-btn-container">
                    <input type="button" class="color-change-btn" id="color-change-yel">
                    <input type="button" class="color-change-btn" id="color-change-red">
                    <input type="button" class="color-change-btn" id="color-change-cya">
                </div>
                <div class="color-picker-border">
                    <div class="color-picker-container" id="color-picker-container">
                        <input type="color" class="color-change-picker" id="color-change-pick">
                    </div>
                </div>
            </div>
        </div>
        `
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

    // Function_array must contain three functions
    // The first function is how to filter the annotations
    // The second is how to get the particular confidence
    // The third is how to mark the annotations deprecated
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
        
        // If the config has a default value override kwargs.default_value with it
        if (this.ulabel.config.hasOwnProperty(this.name.replaceLowerConcat(" ", "_", "_default_value"))) {
            // Grab the new defalut value for convenience
            const new_default_value: number = this.ulabel.config[this.name.replaceLowerConcat(" ", "_", "_default_value")];

            kwargs.default_value = this.ulabel.config[this.name.replaceLowerConcat(" ", "_", "_default_value")];
        }

        if (kwargs.default_value !== undefined) {
            // Set the filter value to the default value
            this.filter_value = kwargs.default_value
        }

        // Check the config to see if we should update the annotations with the default filter on load
        if (this.ulabel.config.filter_annotations_on_load) {
            this.deprecate_annotations(this.ulabel, this.filter_value);
        }


        // ======== Event Listeners ========
        
        // Called when the slider element is directly edited by the user
        $(document).on("input", "#" + this.name.replaceLowerConcat(" ", "-"), (e) => {
            this.filter_value = e.currentTarget.value;
            this.deprecate_annotations(ulabel, this.filter_value);
            this.update_visuals()
        })

        // Called whenever the user clicks on the increment and decrement buttons
        $(document).on("click", "a." + this.name.replaceLowerConcat(" ", "-") + "-button", (e) => {
            const button_text: string = e.currentTarget.outerText
            const slider = <HTMLInputElement> document.getElementById(this.name.replaceLowerConcat(" ", "-"))

            // Use button_text to figure out what button was clicked, and update the slider value accordingly
            switch(button_text) {
                case "+":
                    this.filter_value = slider.valueAsNumber + 1;
                    break;
                case "-":
                    this.filter_value = slider.valueAsNumber - 1;
                    break;
                default:
                    throw Error("Unknown Keypoint Slider Button Pressed");
            }

            this.deprecate_annotations(ulabel, this.filter_value);

            this.update_visuals()
        })

        // Called whenever the user uses the keybinds to change the slider value
        $(document).on("keypress", (e) => {
            if (e.key === this.keybinds.increment) {
                let button = <HTMLAnchorElement> document.getElementsByClassName(this.name.replaceLowerConcat(" ", "-") + "-button inc")[0]
                button.click()
            }

            if (e.key === this.keybinds.decrement) {
                let button = <HTMLAnchorElement> document.getElementsByClassName(this.name.replaceLowerConcat(" ", "-") + "-button dec")[0]
                button.click()
            }
        })
    }

    /**
     * Given the ulabel object and a filter value, goes through each annotation and decides whether or not to deprecate them.
     * 
     * @param ulabel ULabel object
     * @param filter_value The number between 0-100 which annotation's confidence is compared against
     */
    private deprecate_annotations(ulabel: ULabel, filter_value: number) {
        // Get the current subtask
        const current_subtask = ulabel.subtasks[ulabel.state["current_subtask"]];

        for (let idx in current_subtask.annotations.ordering) {
            // Get the current annotation
            const current_annotation: ULabelAnnotation = current_subtask.annotations.access[current_subtask.annotations.ordering[idx]]

            // Get the annotation's confidence as decimal between 0-1
            let confidence: number = this.get_confidence(current_annotation)

            // filter_value will be a number between 0-100, so convert the confidence to a percentage as well
            confidence = Math.round(confidence * 100)

            // Compare the confidence value against the filter value
            const should_deprecate: boolean = this.filter_function(confidence, filter_value)

            // Mark this annotation as either deprecated or undeprecated by the confidence filter
            mark_deprecated(current_annotation, should_deprecate, "confidence_filter")
        }
    }

    /**
     * Handles only redrawing to the screen.
     */
    private update_visuals() {
        // Update the slider bar's position, and the label's text.
        $("#" + this.slider_bar_id).val(Math.round(this.filter_value));
        $("#" + this.slider_bar_id + "-label").text(Math.round(this.filter_value) + "%");

        // Redraw the annotations
        this.ulabel.redraw_all_annotations(null, null, false);
    }

    public get_html() {
        let component_name = this.name.replaceLowerConcat(" ", "-")
        return`
        <div class="keypoint-slider">
            <p class="tb-header">${this.name}</p>
            <div class="keypoint-slider-holder">
                <input 
                    type="range" 
                    id="${component_name}" 
                    class="keypoint-slider" value="${this.filter_value * 100}"
                />
                <label 
                    for="${component_name}" 
                    id="${component_name}-label"
                    class="keypoint-slider-label">
                    ${Math.round(this.filter_value * 100)}%
                </label>
                <span class="increment" >
                    <a href="#" class="button inc keypoint-slider-increment ${component_name}-button" >+</a>
                    <a href="#" class="button dec keypoint-slider-increment ${component_name}-button" >-</a>
                </span>
            </div>
        </div>`
    }
}

export class FilterPointDistanceFromRow extends ToolboxItem {
    name: string = "Filter Distance From Row" // Component name shown to users
    component_name: string = "FilterPointDistanceFromRow" // Internal component name
    default_value: number = 40 // Value slider is set to on page load
    filter_min: number = 0 // Minimum value slider may be set to
    filter_max: number = 400 // Maximum value slider may be set to
    increment_value: number = 2 // Value slider increments by
    filter_on_load: boolean = true // Whether or not to filter annotations on page load
    multi_class_mode: boolean = true // Whether or not the component is currently in multi-class mode
    show_options: boolean = true // Whether or not the options dialog will be visable

    ulabel: ULabel // The ULable object. Must be passed in


    constructor(ulabel: ULabel, kwargs: {[name: string]: any} = null) {
        super()

        this.ulabel = ulabel

        // If kwargs were passed in then update component properties
        if (kwargs !== null && kwargs !== undefined) {
            // Make sure each property is the correct type before useing
            // Mainly to make sure its not undefined so the user doesn't have to set every property to set one
            if (typeof kwargs.name === "string") {
                this.name = kwargs.name
            }
            if (typeof kwargs.component_name === "string") {
                this.component_name = kwargs.component_name
            }
            if (typeof kwargs.filter_min === "number") {
                this.filter_min = kwargs.filter_min
            }
            if (typeof kwargs.filter_max === "number") {
                this.filter_max = kwargs.filter_max
            }
            if (typeof kwargs.default_value === "number") {
                this.default_value = kwargs.default_value
            }
            if (typeof kwargs.increment_value === "number") {
                this.increment_value = kwargs.increment_value
            }
            if (typeof kwargs.multi_class_mode === "boolean") {
                this.multi_class_mode = kwargs.multi_class_mode
            }
            if (typeof kwargs.filter_on_load === "boolean") {
                this.filter_on_load = kwargs.filter_on_load
            }
            if (typeof kwargs.show_options === "boolean") {
                this.show_options = kwargs.show_options
            }
        }

        // Make sure property isn't undefined before using
        if (typeof this.ulabel.config.filter_row_distance_default_value !== "undefined") {
            this.default_value = this.ulabel.config.filter_row_distance_default_value
        }

        if (typeof this.ulabel.config.filter_row_distance_on_load !== "undefined") {
            this.filter_on_load = this.ulabel.config.filter_row_distance_on_load
        }

        // If filter_on_load is true, then filter on load
        if (this.filter_on_load) {
            // Create a filter distance override, so filter distance knows how to filter without accessing the dom
            const override: FilterDistanceOverride = {
                "filter_value": this.default_value,
                "should_redraw": false // Because the dom hasn't loaded yet
            }

            filter_points_distance_from_line(this.ulabel, null, override)
        }
        

        // === Create event listeners for this ToolboxItem ===

        // Whenever the user directly updates the slider, call the filtering function and update the label
        $(document).on("input", ".filter-row-distance-slider", () => {
            filter_points_distance_from_line(this.ulabel)
            this.updateSliderLabel()
        })

        // Whenever the user clicks on the increment button, increment the slider value
        $(document).on("click", "#" + this.component_name + "inc-button", () => this.incrementSliderValue())

        // Whenever the user clicks on the decrement button, decrement the slider value
        $(document).on("click", "#" + this.component_name + "dec-button", () => this.decrementSliderValue())

        // Whenever the multi-class filtering checkbox is clicked, switch the displayed filter mode
        $(document).on("click", "#filter-slider-distance-multi-checkbox", () => this.switchFilterMode())
    }

    /**
     * Updates this component's slider's label based on the slider's current value.
     */
    private updateSliderLabel() {

        const sliders: NodeListOf<HTMLInputElement> = document.querySelectorAll(`.filter-row-distance-slider`)

        // Go through every slider
        for (let idx = 0; idx < sliders.length; idx++) {
            // Grab the slider, its value, and its id
            const slider: HTMLInputElement = sliders[idx]
            const slider_value: string = slider.value
            const slider_id: string = slider.id

            // Grab the label element that is for the current slider and has the class filter-distance-percent-label
            let label: HTMLLabelElement = document.querySelector(`label[for="${slider_id}"].filter-distance-px-label`)

            label.innerText = slider_value + "px"
        }
    }

    /**
     * Increments this component's slider by one.
     */
    private incrementSliderValue() {
        // Grab the slider element
        let slider: HTMLInputElement = document.querySelector("#" + this.component_name + "-slider")

        // Update the slider's value
        slider.value = (slider.valueAsNumber + this.increment_value).toString()

        // Update the label to be accurate
        this.updateSliderLabel()

        // Call the filter function
        filter_points_distance_from_line(this.ulabel)
    }

    /**
     * Decrements this component's slider by one.
     */
    private decrementSliderValue() {
        // Grab the slider element
        let slider: HTMLInputElement = document.querySelector("#" + this.component_name + "-slider")

        // Update the slider's value
        slider.value = (slider.valueAsNumber - this.increment_value).toString()

        // Update the label to be accurate
        this.updateSliderLabel()

        // Call the filter function
        filter_points_distance_from_line(this.ulabel)
    }

    /**
     * Toggle which filter mode is being displayed and which one is being hidden.
     */
    private switchFilterMode() {
        $("#filter-single-class-mode").toggleClass("ulabel-hidden")
        $("#filter-multi-class-mode").toggleClass("ulabel-hidden")
    }

    /**
     * Gets all classes that polylines can be and creates a distance filter for each class.
     * 
     * @returns HTML for the multi-class filtering mode
     */
    private createMultiFilterHTML() {
        // Get all potential classes
        const class_ids = findAllPolylineClassIds(this.ulabel)

        let multi_class_html = ``

        // Loop through each class and create their html
        for (let idx = 0; idx < class_ids.length; idx++) {
            // Grab current class for convenience
            const current_class_id = class_ids[idx]

            // Add current classes html to multi_class_html
            multi_class_html += `
            <label
                for="filter-row-distance-${current_class_id}"
                id="filter-row-distance-${current_class_id}-name-label"
                class="filter-row-distance-name-label">
                ${current_class_id}
            </label>
            <div class="filter-row-distance-container">
                <input 
                    type="range"
                    min="${this.filter_min}"
                    max="${this.filter_max}"
                    step="${this.increment_value}"
                    id="filter-row-distance-${current_class_id}" 
                    class="filter-row-distance-slider filter-row-distance-class-slider" 
                    value="${this.default_value}"
                />
                <label 
                    for="filter-row-distance-${current_class_id}" 
                    id="filter-row-distance-${current_class_id}-px-label"
                    class="filter-distance-px-label">
                    ${Math.round(this.default_value)}px
                </label>
                <div class="filter-row-distance-button-holder">
                    <button id="${this.component_name}inc-button">+</button>
                    <button id="${this.component_name}dec-button">-</button>
                </div>
            </div>
            `
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
        const multi_class_html = this.createMultiFilterHTML()

        console.log(this.show_options, "show options")

        return`
        <div class="filter-row-distance">
            <p class="tb-header">${this.name}</p>
            <fieldset class="filter-row-distance-options ${this.show_options ? "" : "ulabel-hidden"}">
                <legend>Options</legend>
                <div>
                    <input
                        type="checkbox"
                        id="filter-slider-distance-multi-checkbox"
                        class="filter-row-distance-options-checkbox"
                        ${this.multi_class_mode ? "checked" : ""}
                    />
                    <label
                        for="${this.component_name}-multi-checkbox"
                        id="${this.component_name}-multi-checkbox-label"
                        class="filter-row-distance-label">
                        Multi-Class Filtering
                    </label>
                </div>
                <div>
                    <input
                        type="checkbox"
                        id="${this.component_name}-toggle-range-display-checkbox"
                        class="filter-row-distance-options-checkbox"
                    />
                    <label
                        for="${this.component_name}-toggle-range-display-checkbox"
                        id="${this.component_name}-toggle-range-display-checkbox-label"
                        class="filter-row-distance-label">
                        Show Filter Range
                    </label>
                </div>
            </fieldset>
            <div id="filter-single-class-mode" class="${!this.multi_class_mode ? "" : "ulabel-hidden"}">
                <div class="filter-row-distance-container">
                    <input 
                        type="range"
                        min="0"
                        max="400"
                        step="${this.increment_value}"
                        id="filter-row-distance-single" 
                        class="filter-row-distance-slider" 
                        value="${this.default_value}"
                    />
                    <label 
                        for="filter-row-distance-single" 
                        id="${this.component_name}-single-mode-label"
                        class="filter-distance-px-label">
                        ${Math.round(this.default_value)}px
                    </label>
                    <div class="filter-row-distance-button-holder">
                        <button id="${this.component_name}inc-button">+</button>
                        <button id="${this.component_name}dec-button">-</button>
                    </div>
                </div>
            </div>
            <div id="filter-multi-class-mode" class="${this.multi_class_mode ? "" : "ulabel-hidden"}">
                ` + multi_class_html + `
            </div>
        </div>
        `
    }
}

export class SubmitButtons extends ToolboxItem {
    private submit_buttons: {name: string, hook: Function, color?: string}[] | Function;

    constructor(ulabel: ULabel) {
        super();
    
        // Grab the submit buttons from ulabel
        this.submit_buttons = ulabel.config.submit_buttons

        // For legacy reasons submit_buttons may be a function, in that case convert it to the right format
        if (typeof this.submit_buttons == "function") {
            this.submit_buttons = [{
                "name": "Submit",
                "hook": this.submit_buttons
            }]
        }

        for (let idx in this.submit_buttons) {

            // Create a unique event listener for each submit button in the submit buttons array.
            $(document).on("click", "#" + this.submit_buttons[idx].name.replaceLowerConcat(" ", "-"), async (e) => {
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
                        submit_payload["annotations"][stkey].push(
                            ulabel.subtasks[stkey]["annotations"]["access"][
                            ulabel.subtasks[stkey]["annotations"]["ordering"][i]
                            ]
                        );
                    }
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

    get_html(): string {
        let toolboxitem_html = ``

        for (let idx in this.submit_buttons) {

            let button_color
            if (this.submit_buttons[idx].color !== undefined) {
                button_color = this.submit_buttons[idx].color
            } else {
                // If no color provided use hard coded default
                button_color = "rgba(255, 166, 0, 0.739)"
            }

            toolboxitem_html += `
            <button 
            id="${this.submit_buttons[idx].name.replaceLowerConcat(" ", "-")}" 
            class="submit-button" 
            style="
                display: block;
                height: 1.2em;
                width: 6em;
                font-size: 1.5em;
                color: white;
                background-color: ${button_color}; 
                margin-left: auto;
                margin-right: auto;
                margin-top: 0.5em;
                margin-bottom: 0.5em;
                padding: 1em;
                border: 1px solid ${button_color};
                border-radius: 0.5em;
                cursor: pointer;
            ">
                ${this.submit_buttons[idx].name}
            </button>
            `
        }
        
        return toolboxitem_html
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