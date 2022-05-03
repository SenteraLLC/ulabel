import { ULabel, ULabelAnnotation, ULabelSubtask } from "..";

const toolboxDividerDiv = "<div class=toolbox-divider></div>"
function read_annotation_confidence() {
    return
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
    constructor() {
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
    constructor(
        public frame_range: string
    ) {
        super();
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
 * Toolbox Item for selecting line style.
 */
export class LinestyleToolboxItem extends ToolboxItem { 
    constructor(
        public canvas_did: string,
        public demo_width: number,
        public demo_height: number,
        public px_per_px: number 
    ) {super();}

    public get_html() {
        return `
        <div class="linestyle">
            <p class="tb-header">Line Width</p>
            <div class="lstyl-row">
                <div class="line-expl">
                    <a href="#" class="wbutt wout">-</a>
                    <canvas 
                        id="${this.canvas_did}" 
                        class="demo-canvas" 
                        width=${this.demo_width*this.px_per_px}} 
                        height=${this.demo_height*this.px_per_px}></canvas>
                    <a href="#" class="wbutt win">+</a>
                </div><!--
                --><div class="setting">
                    <a class="fixed-setting">Fixed</a><br>
                    <a href="#" class="dyn-setting">Dynamic</a>
                </div>
            </div>
        </div>
        `
    }
}

/**
 * Toolbox item for selection Annotation ID.
 */
export class AnnotationIDToolboxItem extends ToolboxItem {
    constructor(
        public instructions: string,
    ) {
        super();
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
    constructor() {
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
    public is_vanished: boolean = false;
    public cashed_size: number = 1.5;
    public html: string;
    public inner_HTML: string;
    constructor(ulabel: ULabel) {
        super();
        this.inner_HTML = `<p class="tb-header">Annotation Count</p>`;
        //Sets the default line size
        
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
            console.log(e.which)
            switch(e.which) {
                case 118:
                    this.update_annotation_size(current_subtask, "v")
                    break;
                case 115:
                    this.update_annotation_size(current_subtask, "s")
                    break;
                case 108:
                    this.update_annotation_size(current_subtask, "l")
                    break;
                case 45:
                    this.update_annotation_size(current_subtask, "dec")
                    break;
                case 61:
                    this.update_annotation_size(current_subtask, "inc")
                    break;
            }
            ulabel.redraw_all_annotations(null, null, false);
        } )
        }
        

    //recieives a string of 's', 'l', 'dec', 'inc', or 'v' depending on which button was pressed
    public update_annotation_size(subtask, size) {
        const small_size = 1.5;
        const large_size = 5;
        const increment_size = 0.5;
        const vanish_size = 0.01;

        if (subtask == null) return;

        //If the annotations are currently vanished and a button other than the vanish button is
        //pressed, then we want to ignore the input
        if(this.is_vanished && size !== "v") return;

        if (size == "v") {
            if (this.is_vanished) { 
                this.loop_through_annotations(subtask, this.cashed_size, "=")
                //flip the bool state
                this.is_vanished = !this.is_vanished
                $("#annotation-resize-v").attr("style","background-color: "+"rgba(100, 148, 237, 0.8)");
                return;
            }
            if (this.is_vanished !== true) {
                this.loop_through_annotations(subtask, vanish_size, "=")
                //flip the bool state
                this.is_vanished = !this.is_vanished;
                $("#annotation-resize-v").attr("style","background-color: "+"#1c2d4d");
                return;
            }
            return;
        }

        switch(size) {
            case 's':
                this.loop_through_annotations(subtask, small_size, "=")
                this.cashed_size = small_size
                break;           
            case 'l':
                this.loop_through_annotations(subtask, large_size, "=")
                this.cashed_size = large_size
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
            return;
        }
        if (operation == "+") {
            for (const annotation_id in subtask.annotations.access) {
                subtask.annotations.access[annotation_id].line_size += size;
                //temporary solution
                this.cashed_size = subtask.annotations.access[annotation_id].line_size
            }
            return;
        }
        if (operation == "-") {
            for (const annotation_id in subtask.annotations.access) {
                subtask.annotations.access[annotation_id].line_size -= size;
                //temporary solution
                this.cashed_size = subtask.annotations.access[annotation_id].line_size
            }
            return;
        }
        return;
    }
    
    public get_html() {
        return `
        <div class="annotation-resize">
            <p class="tb-header">Change Annotation Size</p>
            <div class="annotation-resize-button-holder">
                <span class="annotation-vanish">
                    <a href="#" class="butt-ann" id="annotation-resize-v">Vanish</a>
                </span>
                <span class="annotation-size">
                    <a href="#" class="butt-ann" id="annotation-resize-s">Small</a>
                    <a href="#" class="butt-ann" id="annotation-resize-l">Large</a>
                </span>
                <span class="annotation-inc">
                    <a href="#" class="butt-ann" id="annotation-resize-inc">+</a>
                    <a href="#" class="butt-ann" id="annotation-resize-dec">-</a>
                </span>
            </div>
        </div>
        `
    }
}

export class RecolorActiveItem extends ToolboxItem { 
    public html: string;
    public inner_HTML: string;
    constructor(ulabel: ULabel) {
        super();
        this.inner_HTML = `<p class="tb-header">Recolor Annotations</p>`;
        //event handler for the buttons
        $(document).on("click", "input.color-change-btn", (e) => {
            let button = $(e.currentTarget);
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
            //slice 13,16 to grab the part of the id that specifies color
            const color_from_id = button.attr("id").slice(13,16);
            this.update_annotation_color(current_subtask, color_from_id);

            ULabel.process_classes(ulabel, ulabel.state.current_subtask, current_subtask)
            //ULabel.build_id_dialogs(ulabel)

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
            let color_picker_container = document.getElementById("color-picker-container")
            color_picker_container.style.backgroundColor = hex

            ULabel.process_classes(ulabel, ulabel.state.current_subtask, current_subtask)
            //ULabel.build_id_dialogs(ulabel)

            ulabel.redraw_all_annotations(null, null, false);
        })
    }

    public update_annotation_color(subtask, color) {
        
        //check for the three special cases, otherwise assume color is a hex value
        if (color == "yel") {
            color ="Yellow";
        }
        if (color == "red") {
            color ="Red";
        }
        if (color == "cya") {
            color ="Cyan";
        }

        let selected_id = "none";

        subtask.state.id_payload.forEach(item => {
            
            if (item.confidence == 1) {
                selected_id = item.class_id
            }  
        });

        //if the selected id is still none, then that means that no id had a
        //confidence of 1. Therefore the default is having the first annotation
        //id selected, so we'll default to that

        if (selected_id == "none") {
            selected_id = subtask.classes[0].id;
        }
        // console.log(selected_id)

        subtask.classes.forEach(item => {
            if (item.id === selected_id) {
                item.color = color;
            }
        })

        //$("a.toolbox_sel_"+selected_id+":first").attr("backround-color", color);
        let colored_square_element = ".toolbox_colprev_"+selected_id;
        $(colored_square_element).attr("style","background-color: "+color);
        
    }

    public get_html() {
        return `
        <div class="recolor-active">
            <p class="tb-header">Recolor Annotations</p>
            <div class="annotation-recolor-button-holder">
                <div class="color-btn-container">
                    <input type="button" class="color-change-btn" id="color-change-yel">
                    <input type="button" class="color-change-btn" id="color-change-red">
                    <input type="button" class="color-change-btn" id="color-change-cya">
                </div>
                <div class="color-picker-container" id="color-picker-container">
                    <canvas id="color-picker-canvas"></canvas>
                    <input type="color"  class="color-change-picker" id="color-change-pick">
                </div>
            </div>
        </div>
        `
    }
}

export class KeypointSlider extends ToolboxItem {
    public html: string;
    public inner_HTML: string;

    constructor(ulabel: ULabel, get_annotation_confidence: Function) {
        super();
        this.inner_HTML = `<p class="tb-header">Keypoint Slider</p>`;
        $(document).on("input", "#keypoint-slider", (e) => {
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
            $("#keypoint-slider-label").text(e.currentTarget.value + "%")

            const annotation_confidence = get_annotation_confidence(current_subtask)
            
            this.draw_histogram(current_subtask, annotation_confidence)
            this.update_annotations(current_subtask, annotation_confidence , e.currentTarget.value / 100)
            ulabel.redraw_all_annotations(null, null, false);
        })
    }
    
    //annotation_confidence should be in the form [{id: "", confidence: "", class_id: ""}, {id: "", confidence: "", class_id: ""}, ...]
    public update_annotations(subtask, annotation_confidence, filter_value) {

        for (let annotation in annotation_confidence) {
            if (annotation_confidence[annotation].confidence < filter_value) {
                subtask.annotations.access[annotation_confidence[annotation].id].deprecated = true
            }
            if (annotation_confidence[annotation].confidence >= filter_value) {
                subtask.annotations.access[annotation_confidence[annotation].id].deprecated = false
            }
        }
    }

    public make_histogram(subtask, annotation_confidence) {

    }

    public draw_histogram(subtask, annotation_confidence) {
        let canvas = <HTMLCanvasElement> document.getElementById("histogram");
        let ctx = canvas.getContext("2d")

        this.draw_grid(ctx,canvas.width, canvas.height, 11, "#444444")

        
        this.draw_line(ctx, canvas.width / 11, 0, canvas.width / 11, 10 * canvas.height / 11, "#FFFF00")
        this.draw_line(ctx, canvas.width / 11, 10 * canvas.height / 11, canvas.width, 10 * canvas.height / 11, "#FFFF00")

        this.draw_rectangle(ctx, 0, 0, canvas.width / 14, canvas.height, "#FFFFFF")
        this.draw_rectangle(ctx, 0, canvas.height - (canvas.height / 16), canvas.width, canvas.height, "#FFFFFF")

    }

    //x1, y1 is the x,y coordinate of the first endpoint, x2, y2 is the 
    //x,y coordinate of the second endpoint.
    private draw_line(ctx, x1, y1, x2, y2, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1,y1);
        ctx.lineTo(x2,y2);
        ctx.stroke();
        ctx.restore();
    }

    private draw_rectangle(ctx, upper_left_x, upper_left_y, width, height, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(upper_left_x, upper_left_y, width, height);
        ctx.restore();

    }

    private draw_rectangle_with_border(ctx, upper_left_x, upper_left_y, width, height, fill_color, border_color) {
        ctx.save();
        this.draw_rectangle(ctx, upper_left_x, upper_left_y, width, height, border_color)
        this.draw_rectangle(ctx, upper_left_x + 1, upper_left_y + 1, width - 2, height - 2, fill_color)
        ctx.restore();
    }

    private draw_grid(ctx, canvas_width, canvas_height, grid_size, color) {
        ctx.save();
        let len = canvas_width / grid_size;
        //draws the vertical lines in the grid
        for (let i = 1; (i < len); i++) {
            this.draw_line(ctx, len * i, 0, len * i, canvas_height, color)
        }
        //draws the horizontal lines in the grid
        len = canvas_height / grid_size;
        for (let i = 1; (i < len); i++) {
            this.draw_line(ctx, 0, len * i, canvas_width, len * i, color)
        }
        ctx.restore();
    }

    public get_html() {
        return`
        <div class="keypoint-slider">
            <p class="tb-header">Keypoint Slider</p>
            <div id="histogram">
                200 <br/><br/> 100 <br/><br/> 0
                <ul>
                    <li>30:2007:lightblue</li>
                    <li>40:2008:lightgreen</li>
                    <li>80:2009:yellow</li>
                    <li>14:2010:cyan</li>

                </ul>
            </div>
            <canvas id="histogra"></canvas>
            <div class="keypoint-slider-holder">
                <input type="range" id="keypoint-slider">
                <label for="keypoint-slider" id="keypoint-slider-label">50%</label>
            </div>
        </div>
        `
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