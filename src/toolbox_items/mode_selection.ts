import { ULabel } from "..";
import { ToolboxItem, BrushToolboxItem } from "../toolbox";

/**
 * Set the annotation mode.
 * @param new_anno_mode Annotation mode to switch to
 */
export function set_annotation_mode(
    new_anno_mode: string,
    ulabel: ULabel,
) {
    const current_subtask = ulabel.get_current_subtask();
    current_subtask.state.annotation_mode = new_anno_mode;
    if (new_anno_mode === "polygon") {
        BrushToolboxItem.show_brush_toolbox_item();
    } else {
        BrushToolboxItem.hide_brush_toolbox_item();
        // Should be able to pass null because we're turning it off
        if (current_subtask.state.is_in_erase_mode) ulabel.toggle_erase_mode(null);
        if (current_subtask.state.is_in_brush_mode) ulabel.toggle_brush_mode(null);
    }

    $("a.md-btn.sel").attr("href", "#");
    $("a.md-btn.sel").removeClass("sel");

    $("a#md-btn--" + new_anno_mode).addClass("sel");
    $("a#md-btn--" + new_anno_mode).removeAttr("href");
    ulabel.show_annotation_mode();
    ulabel.toggle_delete_class_id_in_toolbox();
}

/**
 * Toolbox item for selecting annotation mode.
 */

export class ModeSelectionToolboxItem extends ToolboxItem {
    constructor(public ulabel: ULabel) {
        super();

        this.add_styles();

        // Buttons to change annotation mode
        $(document).on("click.ulabel", "a.md-btn", (e) => {
            // Grab the current target and the current subtask
            const target_jq = $(e.currentTarget);
            const current_subtask = ulabel.get_current_subtask();

            // Check if button clicked is already selected, or if creation of a new annotation is in progress
            if (target_jq.hasClass("sel") || current_subtask["state"]["is_in_progress"]) return;

            // Get the new mode and set it to ulabel's current mode
            const new_mode = target_jq.attr("id").split("--")[1];
            set_annotation_mode(new_mode, ulabel);
            // current_subtask["state"]["annotation_mode"] = new_mode;

            // // Show the BrushToolboxItem when polygon mode is selected
            // if (new_mode === "polygon") {
            //     BrushToolboxItem.show_brush_toolbox_item();
            // } else {
            //     BrushToolboxItem.hide_brush_toolbox_item();
            //     // Turn off erase mode if it's on
            //     if (current_subtask["state"]["is_in_erase_mode"]) {
            //         ulabel.toggle_erase_mode(e);
            //     }
            //     // Turn off brush mode if it's on
            //     if (current_subtask["state"]["is_in_brush_mode"]) {
            //         ulabel.toggle_brush_mode(e);
            //     }
            // }

            // // Reset the previously selected mode button
            // $("a.md-btn.sel").attr("href", "#");
            // $("a.md-btn.sel").removeClass("sel");

            // // Make the selected class look selected
            // target_jq.addClass("sel");
            // target_jq.removeAttr("href");

            // ulabel.show_annotation_mode(target_jq);
            // ulabel.toggle_delete_class_id_in_toolbox();
        });

        $(document).on("keypress.ulabel", (e) => {
            // If creation of a new annotation is in progress, don't change the mode
            if (ulabel.get_current_subtask()["state"]["is_in_progress"]) return;

            // Check if the correct key was pressed
            if (e.key == ulabel.config.toggle_annotation_mode_keybind) {
                const mode_button_array: HTMLElement[] = [];

                // Loop through all of the mode buttons
                for (const idx in Array.from(document.getElementsByClassName("md-btn"))) {
                    // Grab mode button
                    const mode_button = <HTMLElement>document.getElementsByClassName("md-btn")[idx];

                    // Continue without adding it to the array if its display is none
                    if (mode_button.style.display == "none") {
                        continue;
                    }
                    mode_button_array.push(mode_button);
                }

                // Grab the currently selected mode button
                const selected_mode_button = <HTMLAnchorElement>Array.from(document.getElementsByClassName("md-btn sel"))[0]; // There's only ever going to be one element in this array, so grab the first one

                let new_button_index: number;

                // Loop through all of the mode select buttons that are currently displayed
                // to find which one is the currently selected button.  Once its found add 1
                // to get the index of the next mode select button. If the new button index
                // is the same as the array's length, then loop back and set the new button
                // to 0.
                for (const idx in mode_button_array) {
                    if (mode_button_array[idx] === selected_mode_button) {
                        new_button_index = Number(idx) + 1;
                        if (new_button_index == mode_button_array.length) {
                            new_button_index = 0;
                        }
                    }
                }

                // Grab the button for the mode we want to switch to
                const new_selected_button = mode_button_array[new_button_index];

                new_selected_button.click();
            }
        });
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

        
        
        
        `;
        // Create an id so this specific style tag can be referenced
        const style_id = "mode-selection-toolbox-item-styles";

        // Don't add the style tag if its already been added once
        if (document.getElementById(style_id)) return;

        // Grab the document's head and create a style tag
        const head = document.head || document.querySelector("head");
        const style = document.createElement("style");

        // Add the css and id to the style tag
        style.appendChild(document.createTextNode(css));
        style.id = style_id;

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
        `;
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "ModeSelection";
    }
}
