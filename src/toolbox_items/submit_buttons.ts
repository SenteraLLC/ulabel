import { ULabelSubmitButton, ULabel } from "../..";
import { ULabelAnnotation, DELETE_MODES, NONSPATIAL_MODES } from "../annotation";
import { ToolboxItem } from "../toolbox";

export class SubmitButtons extends ToolboxItem {
    private submit_buttons: ULabelSubmitButton[];
    private submit_buttons_by_row: ULabelSubmitButton[][];

    constructor(ulabel: ULabel) {
        super();

        // Grab the submit buttons from ulabel
        this.submit_buttons = ulabel.config.submit_buttons;

        // For legacy reasons submit_buttons may be a function, in that case convert it to the right format
        if (typeof this.submit_buttons == "function") {
            this.submit_buttons = [{
                name: "Submit",
                hook: this.submit_buttons,
                row_number: 0,
                set_saved: false,
            }];
        }

        // Set `set_saved` to false if not provided
        for (const button of this.submit_buttons) {
            button.set_saved = button.set_saved ?? false;
        }

        this.add_styles();

        this.add_event_listeners();

        this.submit_buttons_by_row = this.sort_buttons_by_row_number();

        for (const idx in this.submit_buttons) {
            // Create a unique event listener for each submit button in the submit buttons array.
            $(document).on("click.ulabel", "#" + this.submit_buttons[idx].name.replaceLowerConcat(" ", "-"), async () => {
                // Grab the button
                const button: HTMLButtonElement = <HTMLButtonElement>document.getElementById(this.submit_buttons[idx].name.replaceLowerConcat(" ", "-"));

                // Grab all of the submit buttons
                const submit_button_elements = <HTMLButtonElement[]>Array.from(document.getElementsByClassName("submit-button"));

                // Make all the buttons look disabled
                for (const i in submit_button_elements) {
                    submit_button_elements[i].disabled = true;
                    submit_button_elements[i].style.filter = "opacity(0.7)";
                }

                // Give the clicked button a loading animation
                button.innerText = "";
                const animation = document.createElement("div");
                animation.className = "lds-dual-ring";
                button.appendChild(animation);

                // Create the submit payload
                const submit_payload = {
                    task_meta: ulabel.config["task_meta"],
                    annotations: {},
                };

                // Loop through all of the subtasks
                for (const stkey in ulabel.subtasks) {
                    submit_payload["annotations"][stkey] = [];

                    // Add all of the annotations in that subtask
                    let annotation: ULabelAnnotation;
                    for (let i = 0; i < ulabel.subtasks[stkey]["annotations"]["ordering"].length; i++) {
                        try {
                            annotation = ULabelAnnotation.from_json(ulabel.subtasks[stkey]["annotations"]["access"][ulabel.subtasks[stkey]["annotations"]["ordering"][i]]);
                        } catch (e) {
                            console.error("Error validating annotation during submit.", e);
                            continue;
                        }

                        // Handle null
                        if (annotation === null) {
                            continue;
                        }

                        // Skip any delete modes
                        if (DELETE_MODES.includes(annotation.spatial_type)) {
                            continue;
                        }

                        // Skip spatial annotations that have an empty spatial payload
                        if (NONSPATIAL_MODES.includes(annotation.spatial_type) ||
                            annotation.spatial_payload.length === 0) {
                            continue;
                        }

                        // Ensure annotation is within the image if required
                        if (!ulabel.config.allow_annotations_outside_image) {
                            annotation.clamp_annotation_to_image_bounds(
                                ulabel.config["image_width"],
                                ulabel.config["image_height"],
                            );
                        }

                        submit_payload["annotations"][stkey].push(annotation);
                    }
                }

                // Set set_saved if it was provided
                if (this.submit_buttons[idx].set_saved) {
                    ulabel.set_saved(true);
                }

                await this.submit_buttons[idx].hook(submit_payload);

                // Give the button back its name
                button.innerText = this.submit_buttons[idx].name;

                // Re-enable the buttons
                for (const i in submit_button_elements) {
                    submit_button_elements[i].disabled = false;
                    submit_button_elements[i].style.filter = "opacity(1)";
                }
            });
        }
    }

    /**
     * Group submit buttons by row number
     *
     * @returns {ULabelSubmitButton[][]} Array of submit buttons grouped by row number
     */
    private sort_buttons_by_row_number() {
        const submit_buttons_by_row: ULabelSubmitButton[][] = [];
        // First, get all the unique row numbers.
        // If a button doesn't have a row number, it will be placed in row 0.
        const row_numbers: Set<number> = new Set(this.submit_buttons.map((button) => button.row_number ? button.row_number : 0));
        // Sort the row numbers
        const sorted_row_numbers: number[] = Array.from(row_numbers).sort((a, b) => a - b);
        // Group the buttons by row number in ascending order
        for (const row_number of sorted_row_numbers) {
            submit_buttons_by_row.push(
                this.submit_buttons.filter((button) => {
                    // If the button doesn't have a row number, it will be placed in row 0
                    if (button.row_number === undefined) {
                        return row_number === 0;
                    }
                    // Otherwise, place the button in the row that matches its row number
                    return button.row_number === row_number;
                }),
            );
        }
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
            const ctrl = event.ctrlKey || event.metaKey;
            if (ctrl && (event.key === "s" || event.key === "S")) {
                event.preventDefault();
                $(".submit-button")[0].click(); // Click the first submit button
            }
        });
    }

    get_html(): string {
        let toolboxitem_html = `<div class="submit-button-container">`;

        for (const submit_buttons of this.submit_buttons_by_row) {
            // Create a row for each row of submit buttons
            toolboxitem_html += `<div class="submit-button-row">`;

            // Create each button in the row
            for (const submit_button of submit_buttons) {
                let button_color = "rgba(255, 166, 0, 0.739)";
                if (submit_button.color !== undefined) {
                    button_color = submit_button.color;
                }

                // Get the size factor
                let size_factor = 1;
                if (submit_button.size_factor !== undefined) {
                    size_factor = submit_button.size_factor;
                }

                toolboxitem_html += `
                <button 
                    id="${submit_button.name.replaceLowerConcat(" ", "-")}" 
                    class="submit-button" 
                    style="
                        background-color: ${button_color};
                        border: ${1 * size_factor}px solid ${button_color};
                        border-radius: ${0.5 * size_factor}em;
                        height: ${1.2 * size_factor}em;
                        width: ${6 * size_factor}em;
                        font-size: ${1.5 * size_factor}em;
                        padding: ${1 * size_factor}em;
                ">
                    ${submit_button.name}
                </button>
                `;
            }
            // Close the row div
            toolboxitem_html += `</div>`;
        }
        // Close the container div
        toolboxitem_html += `</div>`;

        return toolboxitem_html;
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "SubmitButtons";
    }
}
