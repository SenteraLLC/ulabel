import type {
    ULabel,
    ConfidenceSliderConfig,
    ConfidenceSliderClasses,
    ULabelSpatialType,
    ValidDeprecatedBy,
} from "../../index";
import { ToolboxItem } from "../toolbox";
import { ULabelAnnotation } from "../annotation";
import { DEFAULT_CONFIDENCE_SLIDER_CONFIG } from "../configuration";
import { SliderHandler } from "../html_builder";
import {
    get_annotation_confidence,
    get_annotation_confidence_for_class,
    get_annotation_class_id,
    get_spatial_annotations_with_confidence,
    value_is_lower_than_filter,
    mark_deprecated,
    findAllClassDefinitions,
    get_point_and_line_annotations,
    CONFIDENCE_FILTERABLE_SPATIAL_TYPES,
} from "../annotation_operators";

/**
 * ToolboxItem for filtering (deprecating/showing) spatial annotations by their confidence.
 *
 * Supports two modes:
 * - Single-class mode: one slider applies a confidence threshold to all targeted spatial
 *   annotations across every subtask, using each annotation's highest confidence.
 * - Multi-class mode: one slider per targeted class id. Each slider filters only the annotations
 *   whose assigned (highest-confidence) class matches, using that class's confidence.
 *
 * The `class_filter_mode` config controls whether the mode is user-toggleable (`"toggle"`), or
 * locked to `"all-only"` (single global slider) or `"class-only"` (per-class sliders).
 */
export class ConfidenceSlider extends ToolboxItem {
    public ulabel: ULabel;
    public config!: ConfidenceSliderConfig;
    public name!: string;
    public filter_min!: number;
    public filter_max!: number;
    public step_value!: number;
    public default_values!: ConfidenceSliderClasses;
    public filter_on_load!: boolean;
    public target_spatial_types!: ULabelSpatialType[];
    public target_class_ids!: number[] | null;
    public collapse_options: boolean = false;

    // Whether the class-filter-mode toggle is shown, and whether per-class sliders are active
    public show_class_toggle!: boolean;
    public is_class_mode!: boolean;

    public filter_function: (value: number, filter: number) => boolean;
    public get_confidence: (annotation: ULabelAnnotation) => number;
    public mark_deprecated: (
        annotation: ULabelAnnotation,
        deprecated: boolean,
        deprecated_by_key?: ValidDeprecatedBy,
    ) => void;

    // The deprecated_by key this item uses. Overridden by deprecated subclasses.
    protected deprecated_by_key: ValidDeprecatedBy = "confidence_slider";

    // DOM naming used to build and read this item's sliders
    protected component_prefix: string = "confidence-slider";
    protected slider_class: string = "confidence-slider-input";

    // TODO (joshua-dean): See if we can narrow this any
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
    constructor(ulabel: ULabel, kwargs: { [name: string]: any } | null = null) {
        super();
        this.ulabel = ulabel;

        // Default the deprecating utilities. Subclasses may override in their own constructor.
        this.filter_function = value_is_lower_than_filter;
        this.get_confidence = get_annotation_confidence;
        this.mark_deprecated = mark_deprecated;

        // Deprecated subclasses (e.g. KeypointSliderItem) perform their own setup.
        if (this.get_toolbox_item_type() !== "ConfidenceSlider") return;

        // Get this component's config from ulabel's config, defaulting any missing keys
        this.config = this.ulabel.config.confidence_slider_toolbox_item ?? {};
        for (const key in DEFAULT_CONFIDENCE_SLIDER_CONFIG) {
            if (!Object.prototype.hasOwnProperty.call(this.config, key)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (this.config as any)[key] = (DEFAULT_CONFIDENCE_SLIDER_CONFIG as any)[key];
            }
        }

        // Assign config properties to this instance
        this.name = this.config.name!;
        this.filter_min = this.config.filter_min!;
        this.filter_max = this.config.filter_max!;
        this.step_value = this.config.step_value!;
        // Always ensure an "all" threshold exists (used by the global slider and as the per-class
        // fallback), even if a user supplies default_values with only per-class keys.
        this.default_values = { all: 0, ...this.config.default_values };
        this.filter_on_load = this.config.filter_on_load!;
        this.target_spatial_types = this.config.target_spatial_types ?? CONFIDENCE_FILTERABLE_SPATIAL_TYPES;
        this.target_class_ids = this.config.target_class_ids ?? null;

        // Resolve the class-filter-mode option into runtime state
        const class_filter_mode = this.config.class_filter_mode!;
        this.show_class_toggle = class_filter_mode === "toggle";
        this.is_class_mode = class_filter_mode === "class-only";

        this.add_styles();
        this.add_event_listeners();

        // Filter on load if configured
        if (this.filter_on_load) {
            this.filter_annotations(false);
        }
    }

    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        const css = `
            #toolbox div.confidence-slider {
                text-align: left;
            }

            #toolbox div.confidence-slider fieldset.confidence-slider-options {
                display: inline-block;
                position: relative;
                left: 1rem;
                margin-bottom: 0.5rem;
                font-size: 80%;
                user-select: none;
            }

            #toolbox div.confidence-slider fieldset.confidence-slider-options legend {
                border-radius: 0.1rem;
                padding: 0.1rem 0.3rem;
                cursor: pointer;
            }

            #toolbox div.confidence-slider fieldset.confidence-slider-options legend:hover {
                background-color: rgba(128, 128, 128, 0.3);
            }

            #toolbox div.confidence-slider fieldset.confidence-slider-options.ulabel-collapsed {
                border: none;
                margin-bottom: 0;
                padding: 0;
                padding-left: calc(0.75em + 2px);
            }

            #toolbox div.confidence-slider fieldset.confidence-slider-options.ulabel-collapsed :not(legend) {
                display: none;
            }

            #toolbox div.confidence-slider fieldset.confidence-slider-options input[type="checkbox"] {
                margin: 0;
            }

            #toolbox div.confidence-slider fieldset.confidence-slider-options label {
                position: relative;
                top: -0.2rem;
                font-size: smaller;
            }`;

        const style_id = "confidence-slider-toolbox-item-styles";

        // Don't add the style tag if its already been added once
        if (document.getElementById(style_id)) return;

        const head = document.head || document.querySelector("head");
        const style = document.createElement("style");
        style.appendChild(document.createTextNode(css));
        style.id = style_id;
        head.appendChild(style);
    }

    private add_event_listeners(): void {
        // Toggle the options fieldset when its legend is clicked
        $(document).on("click.ulabel", "fieldset.confidence-slider-options > legend", () => this.toggleCollapsedOptions());

        // Switch between the "all" slider and the per-class sliders when the checkbox is clicked
        $(document).on("click.ulabel", `#${this.component_prefix}-multi-checkbox`, (event) => {
            this.is_class_mode = event.currentTarget.checked;
            $(`#${this.component_prefix}-single-class-mode`).toggleClass("ulabel-hidden");
            $(`#${this.component_prefix}-multi-class-mode`).toggleClass("ulabel-hidden");
            this.filter_annotations(true);
        });
    }

    private toggleCollapsedOptions(): void {
        $("fieldset.confidence-slider-options").toggleClass("ulabel-collapsed");
        this.collapse_options = !this.collapse_options;
    }

    /**
     * Get the class definitions that should receive a slider in multi-class mode.
     */
    private get_target_class_defs() {
        let class_defs = findAllClassDefinitions(this.ulabel, this.target_spatial_types);
        if (this.target_class_ids !== null) {
            class_defs = class_defs.filter((class_def) => this.target_class_ids!.includes(class_def.id));
        }
        return class_defs;
    }

    /**
     * Read the current threshold values, preferring the DOM sliders and falling back to defaults.
     *
     * @returns A map of class identifiers (and "all") to their threshold values
     */
    public get_filter_values(): ConfidenceSliderClasses {
        // Seed with defaults so filtering works before the sliders are rendered (e.g. on load).
        const values: ConfidenceSliderClasses = { all: this.default_values.all };

        // In class mode, seed every targeted class (those that get a slider) with its explicit
        // default or the "all" fallback. This matches the rendered slider defaults from
        // createMultiFilterHTML(), so class-mode filter-on-load behaves consistently before the
        // DOM sliders exist.
        if (this.is_class_mode) {
            for (const class_def of this.get_target_class_defs()) {
                values[class_def.id] = this.default_values[class_def.id] ?? this.default_values.all;
            }
        }

        // Read the single-class slider if present
        const all_slider = document.querySelector<HTMLInputElement>(`#${this.component_prefix}-all`);
        if (all_slider !== null) {
            values.all = all_slider.valueAsNumber;
        }

        // Read the per-class sliders if present (override the seeded defaults)
        const sliders = document.querySelectorAll<HTMLInputElement>(`.${this.slider_class}`);
        for (let idx = 0; idx < sliders.length; idx++) {
            const slider_class_name = /[^-]*$/.exec(sliders[idx].id)![0];
            if (slider_class_name === "all") continue;
            values[slider_class_name] = sliders[idx].valueAsNumber;
        }

        return values;
    }

    /**
     * Deprecate or show every targeted spatial annotation across all subtasks based on the
     * current threshold values and mode.
     *
     * @param redraw whether or not to redraw the annotations after filtering
     */
    public filter_annotations(redraw: boolean = false): void {
        const values = this.get_filter_values();
        const annotations = get_spatial_annotations_with_confidence(this.ulabel, this.target_spatial_types);

        // Store which annotations need to be redrawn, organized by subtask key
        const annotations_ids_to_redraw_by_subtask: { [key: string]: string[] } = {};
        for (const subtask_key in this.ulabel.subtasks) {
            annotations_ids_to_redraw_by_subtask[subtask_key] = [];
        }

        for (const annotation of annotations) {
            let should_deprecate = false;

            if (this.is_class_mode) {
                // In class-only mode, only filter annotations whose assigned class has a slider
                const class_id = Number(get_annotation_class_id(annotation));
                if (values[class_id] !== undefined) {
                    const confidence = Math.round(get_annotation_confidence_for_class(annotation, class_id) * 100);
                    should_deprecate = this.filter_function(confidence, values[class_id]);
                }
            } else {
                // In single-class mode, filter all targeted annotations by their highest confidence
                const confidence = Math.round(this.get_confidence(annotation) * 100);
                should_deprecate = this.filter_function(confidence, values.all);
            }

            // Mark deprecated and, if the visible state changed, queue a redraw
            const was_deprecated = annotation.deprecated;
            this.mark_deprecated(annotation, should_deprecate, this.deprecated_by_key);
            if (annotation.deprecated !== was_deprecated) {
                annotations_ids_to_redraw_by_subtask[annotation.subtask_key!].push(annotation.id!);
            }
        }

        if (redraw) {
            for (const subtask_key in annotations_ids_to_redraw_by_subtask) {
                this.ulabel.redraw_multiple_spatial_annotations(annotations_ids_to_redraw_by_subtask[subtask_key], subtask_key);
            }
            this.ulabel.toolbox.redraw_update_items(this.ulabel);
        }
    }

    /**
     * Builds one slider per targeted class for multi-class mode.
     */
    private createMultiFilterHTML(): string {
        const class_defs = this.get_target_class_defs();

        let multi_class_html = ``;
        for (const class_def of class_defs) {
            const default_value = (
                this.default_values[class_def.id] !== undefined ?
                    this.default_values[class_def.id] :
                    this.default_values.all
            ).toString();

            const slider = new SliderHandler({
                id: `${this.component_prefix}-${class_def.id}`,
                class: `${this.slider_class} ${this.slider_class}-class`,
                min: this.filter_min.toString(),
                max: this.filter_max.toString(),
                default_value: default_value,
                step: this.step_value.toString(),
                label_units: "%",
                main_label: class_def.name,
                slider_event: () => this.filter_annotations(true),
            });

            multi_class_html += slider.getSliderHTML();
        }

        return multi_class_html;
    }

    public get_html(): string {
        // Only build per-class sliders when they can actually be shown (class-only or toggle mode).
        // In all-only mode the multi-class container is never revealed, so skip the wasted DOM and
        // SliderHandler event listeners.
        const multi_class_html = (this.is_class_mode || this.show_class_toggle) ? this.createMultiFilterHTML() : "";

        const single_class_slider = new SliderHandler({
            id: `${this.component_prefix}-all`, // "all" is extracted using regex
            class: this.slider_class,
            default_value: this.default_values.all.toString(),
            min: this.filter_min.toString(),
            max: this.filter_max.toString(),
            step: this.step_value.toString(),
            label_units: "%",
            slider_event: () => this.filter_annotations(true),
        });

        let options_html = ``;
        if (this.show_class_toggle) {
            options_html = `
            <fieldset class="
                    confidence-slider-options
                    ${this.collapse_options ? "ulabel-collapsed" : ""}
                ">
                <legend>Options ˅</legend>
                <div class="confidence-slider-option">
                    <input
                        type="checkbox"
                        id="${this.component_prefix}-multi-checkbox"
                        class="confidence-slider-options-checkbox"
                        ${this.is_class_mode ? "checked" : ""}
                    />
                    <label
                        for="${this.component_prefix}-multi-checkbox"
                        class="confidence-slider-label">
                        Per-Class Filtering
                    </label>
                </div>
            </fieldset>`;
        }

        return `
        <div class="confidence-slider">
            <p class="tb-header">${this.name}</p>
            ${options_html}
            <div id="${this.component_prefix}-single-class-mode" class="${!this.is_class_mode ? "" : "ulabel-hidden"}">
                ${single_class_slider.getSliderHTML()}
            </div>
            <div id="${this.component_prefix}-multi-class-mode" class="${this.is_class_mode ? "" : "ulabel-hidden"}">
                ${multi_class_html}
            </div>
        </div>
        `;
    }

    /**
     * Get the current confidence slider values by reading the DOM slider elements.
     *
     * @returns A map of class identifiers to their threshold values, or null if no sliders are found
     */
    public get_current_values(): ConfidenceSliderClasses | null {
        const all_slider = document.querySelector<HTMLInputElement>(`#${this.component_prefix}-all`);
        if (all_slider === null) return null;

        const values: ConfidenceSliderClasses = { all: all_slider.valueAsNumber };

        // In class-only mode, also read the per-class sliders
        if (this.is_class_mode) {
            const sliders = document.querySelectorAll<HTMLInputElement>(`.${this.slider_class}`);
            for (let idx = 0; idx < sliders.length; idx++) {
                const slider_class_name = /[^-]*$/.exec(sliders[idx].id)![0];
                if (slider_class_name === "all") continue;
                values[slider_class_name] = sliders[idx].valueAsNumber;
            }
        }

        return values;
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "ConfidenceSlider";
    }
}

/**
 * ToolboxItem for filtering point ("keypoint") annotations by their confidence.
 *
 * @deprecated Use {@link ConfidenceSlider} (`AllowedToolboxItem.ConfidenceSlider`) instead,
 * which supports all spatial annotation types, per-class targeting, and multiple sliders.
 * This item is retained for backwards compatibility and only filters point annotations.
 */
export class KeypointSliderItem extends ConfidenceSlider {
    public html!: string;
    public inner_HTML: string;
    public slider_bar_id: string;

    filter_value: number = 0;
    keybinds: {
        increment: string;
        decrement: string;
    };

    // TODO (joshua-dean): See if we can narrow this any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(ulabel: ULabel, kwargs: { [name: string]: any }) {
        super(ulabel);
        this.inner_HTML = `<p class="tb-header">Keypoint Slider</p>`;
        this.ulabel = ulabel;

        // Use properties in kwargs if kwargs is present
        if (kwargs !== undefined) {
            this.name = kwargs.name;
            this.filter_function = kwargs.filter_function;
            this.get_confidence = kwargs.confidence_function;
            this.mark_deprecated = kwargs.mark_deprecated;
            this.keybinds = kwargs.keybinds;
        } else {
            // Otherwise use defaults
            this.name = "Keypoint Slider";
            this.filter_function = value_is_lower_than_filter;
            this.get_confidence = get_annotation_confidence;
            this.mark_deprecated = mark_deprecated;
            this.keybinds = {
                increment: "2",
                decrement: "1",
            };
        }

        // Create slider bar id
        this.slider_bar_id = this.name.replaceLowerConcat(" ", "-");

        // If the config has a default value override the filter_value
        const has_filter_override = Object.prototype.hasOwnProperty.call(
            this.ulabel.config,
            this.name.replaceLowerConcat(" ", "_", "_default_value"),
        );
        if (has_filter_override) {
            // Set the filter value
            this.filter_value = this.ulabel.config[this.name.replaceLowerConcat(" ", "_", "_default_value")];
        }

        // Check the config to see if we should update the annotations with the default filter on load
        if (this.ulabel.config.filter_annotations_on_load) {
            this.filter_keypoint_annotations(this.ulabel);
        }

        this.add_styles();
    }

    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        // Define the css
        const css = `
        /* Component has no css?? */
        `;
        // Create an id so this specific style tag can be referenced
        const style_id = "keypoint-slider-toolbox-item-styles";

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

    /**
     * Given the ulabel object and a filter value, go through each point annotation and decide
     * whether or not to deprecate it.
     *
     * @param ulabel ULabel object
     * @param filter_value The number between 0-100 which annotation's confidence is compared against
     * @param redraw whether or not to redraw the annotations after filtering
     */
    private filter_keypoint_annotations(ulabel: ULabel, filter_value: number | null = null, redraw: boolean = false): void {
        if (filter_value === null) {
            // Use stored filter value if none is passed in
            filter_value = Math.round(this.filter_value * 100);
        }
        // Store which annotations need to be redrawn
        const annotations_ids_to_redraw_by_subtask: { [key: string]: string[] } = {};
        // Initialize the object with the subtask keys
        for (const subtask_key in ulabel.subtasks) {
            annotations_ids_to_redraw_by_subtask[subtask_key] = [];
        }

        // Get all point annotations
        const point_and_line_annotations = get_point_and_line_annotations(ulabel);
        for (const annotation of point_and_line_annotations[0]) {
            // Get the annotation's confidence as decimal between 0-1
            let confidence: number = this.get_confidence(annotation);

            // filter_value will be a number between 0-100, so convert the confidence to a percentage as well
            confidence = Math.round(confidence * 100);

            // Compare the confidence value against the filter value
            const should_deprecate: boolean = this.filter_function(confidence, filter_value);
            // Check if an annotation should be deprecated or undeprecated, else do nothing
            if (
                (should_deprecate && !annotation.deprecated) ||
                (!should_deprecate && annotation.deprecated)
            ) {
                // Mark this annotation as either deprecated or undeprecated by the confidence filter
                this.mark_deprecated(annotation, should_deprecate, "confidence_filter");
                annotations_ids_to_redraw_by_subtask[annotation.subtask_key!].push(annotation.id!);
            }
        }

        if (redraw) {
            // Redraw each subtask's annotations
            for (const subtask_key in annotations_ids_to_redraw_by_subtask) {
                ulabel.redraw_multiple_spatial_annotations(annotations_ids_to_redraw_by_subtask[subtask_key], subtask_key);
            }
            // Update class counter
            ulabel.toolbox.redraw_update_items(ulabel);
        }
    }

    public get_html() {
        // Create a SliderHandler instance to handle slider interactions
        const slider_handler = new SliderHandler({
            id: this.name.replaceLowerConcat(" ", "-"),
            class: "keypoint-slider",
            default_value: Math.round(this.filter_value * 100).toString(),
            label_units: "%",
            slider_event: (slider_value: number | string) => {
                // Filter the annotations, then redraw them
                this.filter_keypoint_annotations(this.ulabel, Number(slider_value), true);
            },
        });

        return `
        <div class="keypoint-slider">
            <p class="tb-header">${this.name}</p>
            ` + slider_handler.getSliderHTML() + `
        </div>
        `;
    }

    /**
     * Get the current keypoint slider value by reading the DOM slider element.
     *
     * @returns The current slider value as a number between 0 and 1, or null if the slider is not found
     */
    public get_current_value(): number | null {
        const slider = document.querySelector<HTMLInputElement>(`#${this.slider_bar_id}`);
        if (slider === null) return null;
        return slider.valueAsNumber / 100;
    }

    public after_init() {
        // This toolbox item doesn't need to do anything after initialization
    }

    public get_toolbox_item_type() {
        return "KeypointSlider";
    }
}
