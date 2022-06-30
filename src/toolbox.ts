import { ULabel, ULabelSubtask } from "..";
import { Configuration } from "./configuration";
import { ULabelAnnotation } from "./annotation";

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
        let val = 50;
        if (this.selected) {
            if (this.subtask.read_only) {
                href = "";
            }
            sel = " sel";
            val = 100;
        }
        console.log(subtask.display_name)
        console.log(subtask)
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
    constructor(...args) {
        super();
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

        //update cased size to default
        this.cached_size = ulabel.config.default_annotation_size

        //grab current subtask for convinience
        let current_subtask_key = ulabel.state["current_subtask"];
        let current_subtask = ulabel.subtasks[current_subtask_key];

        //First check for a size cookie, if one isn't found then check the config
        //for a default annotation size. If neither are found it will use the size
        //that the annotation was saved as.
        if (this.read_size_cookie(current_subtask) != null) {           
            this.update_annotation_size(current_subtask, Number(this.read_size_cookie(current_subtask)));
        } 
        else if (ulabel.config.default_annotation_size != undefined) {          
            this.update_annotation_size(current_subtask, ulabel.config.default_annotation_size);
        }

        //event listener for buttons
        $(document).on("click", "a.butt-ann", (e) => {
            let button = $(e.currentTarget);
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
            const annotation_size = button.attr("id").slice(18);
            this.update_annotation_size(current_subtask, annotation_size);
            ulabel.redraw_all_annotations(null, null, false);
        })
        //event listener for keybinds
        $(document).on("keypress", (e) => {
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
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
                this.loop_through_annotations(subtask, this.cached_size, "=")
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
                this.cached_size = small_size
                break;           
            case 'l':
                this.loop_through_annotations(subtask, large_size, "=")
                this.cached_size = large_size
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
        if (operation == "=") {
            for (const annotation_id in subtask.annotations.access) {
                subtask.annotations.access[annotation_id].line_size = size;
            }
            this.set_size_cookie(size, subtask)
            return;
        }
        if (operation == "+") {
            for (const annotation_id in subtask.annotations.access) {
                subtask.annotations.access[annotation_id].line_size += size;
                //temporary solution
                this.cached_size = subtask.annotations.access[annotation_id].line_size
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
                this.cached_size = subtask.annotations.access[annotation_id].line_size
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
    public default_value: number = 0; //defalut value must be a number between 0 and 1 inclusive

    //function_array must contain three functions
    //the first function is how to filter the annotations
    //the second is how to get the particular confidence
    //the third is how to mark the annotations deprecated
    constructor(ulabel: ULabel, kwargs: {[name: string]: any}) {
        super();
        this.inner_HTML = `<p class="tb-header">Keypoint Slider</p>`;
        this.name = kwargs.name;
        this.filter_function = kwargs.filter_function;
        this.get_confidence = kwargs.confidence_function;
        this.mark_deprecated = kwargs.mark_deprecated;
        this.slider_bar_id = this.name.replaceLowerConcat(" ", "-");
        
        //if the config has a default value override, then use that instead
        if (ulabel.config.hasOwnProperty(this.name.replaceLowerConcat(" ", "_", "_default_value"))) {
            kwargs.default_value = ulabel.config[this.name.replaceLowerConcat(" ", "_", "_default_value")];
        }

        //if this keypoint slider has a generic default, then use it
        //otherwise the defalut is 0
        if (kwargs.hasOwnProperty("default_value")) {

            //check to make sure the default value given is valid
            if ((kwargs.default_value >= 0) && (kwargs.default_value <= 1)) {
                this.default_value = kwargs.default_value
            } else {
                throw Error("Invalid defalut keypoint slider value given")
            }

        }
        
        let current_subtask_key = ulabel.state["current_subtask"];
        let current_subtask = ulabel.subtasks[current_subtask_key];

        //Check to see if any of the annotations were deprecated by default
        this.check_for_human_deprecated(current_subtask);

        //check the config to see if we should update the annotations with the default filter on load
        if (ulabel.config.filter_annotations_on_load) {
            this.deprecate_annotations(ulabel, this.default_value, false);
        }

        //The annotations are drawn for the first time after the toolbox is loaded
        //so we don't actually have to redraw the annotations after deprecating them.
        
        $(document).on("input", "#" + this.name.replaceLowerConcat(" ", "-"), (e) => {
            let filter_value = e.currentTarget.value / 100;
            this.deprecate_annotations(ulabel, filter_value);
        })

        $(document).on("click", "a." + this.name.replaceLowerConcat(" ", "-") + "-button", (e) => {
            let button_text = e.currentTarget.outerText
            let slider = <HTMLInputElement> document.getElementById(this.name.replaceLowerConcat(" ", "-"))

            if (button_text == "+") {
                slider.value = (slider.valueAsNumber + 1).toString();
            } else if (button_text == "-") {
                slider.value = (slider.valueAsNumber - 1).toString();
            } else {
                throw Error("Unknown Keypoint Slider Button Pressed");
            }

            //update the slider's label
            $("#" + slider.id + "-label").text(Math.round(slider.valueAsNumber) + "%");

            this.deprecate_annotations(ulabel, slider.valueAsNumber / 100);
            ulabel.redraw_all_annotations(null, null, false);
        })

        //event listener for keybinds
        $(document).on("keypress", (e) => {

            if (e.key == kwargs.keybinds.increment) {
                let button = <HTMLAnchorElement> document.getElementsByClassName(this.name.replaceLowerConcat(" ", "-") + "-button inc")[0]
                button.click()
            }

            if (e.key == kwargs.keybinds.decrement) {
                let button = <HTMLAnchorElement> document.getElementsByClassName(this.name.replaceLowerConcat(" ", "-") + "-button dec")[0]
                button.click()
            }
        })
    }

    public deprecate_annotations(ulabel, filter_value, redraw: boolean = true) {

        //get the current subtask
        let current_subtask_key = ulabel.state["current_subtask"];
        let current_subtask = ulabel.subtasks[current_subtask_key];

        for (let i in current_subtask.annotations.ordering) {
            let current_annotation: ULabelAnnotation = current_subtask.annotations.access[current_subtask.annotations.ordering[i]]

            //kinda a hack, but an annotation can't be human deprecated if its not deprecated
            if (current_annotation.deprecated == false) {
                current_annotation.human_deprecated = false
            }

            //we don't want to change any annotations that were hand edited by the user.
            if (current_annotation.human_deprecated) {
                continue;
            }

            let current_confidence: number = this.get_confidence(current_annotation)
            let deprecate: boolean = this.filter_function(current_confidence, filter_value)
            this.mark_deprecated(current_annotation, deprecate)
        }

        //Update the slider bar's position, and the label's text.
        $("#" + this.slider_bar_id).val(Math.round(filter_value * 100));
        $("#" + this.slider_bar_id + "-label").text(Math.round(filter_value * 100) + "%");

        if (redraw) {
            ulabel.redraw_all_annotations(null, null, false);
        }
    }

    //if an annotation is deprecated and has a child, then assume its human deprecated.
    public check_for_human_deprecated(current_subtask) {
        for (let i in current_subtask.annotations.ordering) {
            let current_annotation: ULabelAnnotation = current_subtask.annotations.access[current_subtask.annotations.ordering[i]]

            let parent_id = current_annotation.parent_id

            //if the parent id exists and is deprecated, then assume that it was human deprecated
            if (parent_id != null) {
                let parent_annotation = current_subtask.annotations.access[parent_id]

                //check if the parent annotation exists
                if (parent_annotation != null) {
                    
                    if (parent_annotation.deprecated) {
                        parent_annotation.human_deprecated = true
                    }
                }

            }
        }
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
                    class="keypoint-slider" value="${this.default_value * 100}"
                />
                <label 
                    for="${component_name}" 
                    id="${component_name}-label"
                    class="keypoint-slider-label">
                    ${Math.round(this.default_value * 100)}%
                </label>
                <span class="increment" >
                    <a href="#" class="button inc keypoint-slider-increment ${component_name}-button" >+</a>
                    <a href="#" class="button dec keypoint-slider-increment ${component_name}-button" >-</a>
                </span>
            </div>
        </div>`
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