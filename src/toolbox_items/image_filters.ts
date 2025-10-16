import type { ULabel } from "../index";
import { SliderHandler } from "../html_builder";
import { ToolboxItem } from "../toolbox";

export interface ImageFilterValues {
    brightness: number;
    contrast: number;
    hueRotate: number;
    invert: number;
    saturate: number;
}

const DEFAULT_FILTER_VALUES: ImageFilterValues = {
    brightness: 100,
    contrast: 100,
    hueRotate: 0,
    invert: 0,
    saturate: 100,
};

/**
 * Toolbox item for applying CSS filters to images
 */
export class ImageFiltersToolboxItem extends ToolboxItem {
    private filter_values: ImageFilterValues;
    private brightness_slider: SliderHandler;
    private contrast_slider: SliderHandler;
    private hue_rotate_slider: SliderHandler;
    private invert_slider: SliderHandler;
    private saturate_slider: SliderHandler;
    private ulabel: ULabel;

    constructor(ulabel: ULabel) {
        super();
        this.ulabel = ulabel;
        this.filter_values = { ...DEFAULT_FILTER_VALUES };
        this.init_sliders();
        this.add_styles();
        this.init_listeners();
    }

    private init_sliders() {
        // Brightness slider (0-200%)
        this.brightness_slider = new SliderHandler({
            id: "image-filter-brightness",
            main_label: "Brightness",
            label_units: "%",
            default_value: "100",
            min: "0",
            max: "200",
            step: "1",
            slider_event: (value) => {
                this.filter_values.brightness = Number(value);
                this.apply_filters();
            },
        });

        // Contrast slider (0-200%)
        this.contrast_slider = new SliderHandler({
            id: "image-filter-contrast",
            main_label: "Contrast",
            label_units: "%",
            default_value: "100",
            min: "0",
            max: "200",
            step: "1",
            slider_event: (value) => {
                this.filter_values.contrast = Number(value);
                this.apply_filters();
            },
        });

        // Hue rotate slider (0-360 degrees)
        this.hue_rotate_slider = new SliderHandler({
            id: "image-filter-hue-rotate",
            main_label: "Hue Rotate",
            label_units: "°",
            default_value: "0",
            min: "0",
            max: "360",
            step: "1",
            slider_event: (value) => {
                this.filter_values.hueRotate = Number(value);
                this.apply_filters();
            },
        });

        // Invert slider (0-100%)
        this.invert_slider = new SliderHandler({
            id: "image-filter-invert",
            main_label: "Invert",
            label_units: "%",
            default_value: "0",
            min: "0",
            max: "100",
            step: "1",
            slider_event: (value) => {
                this.filter_values.invert = Number(value);
                this.apply_filters();
            },
        });

        // Saturate slider (0-200%)
        this.saturate_slider = new SliderHandler({
            id: "image-filter-saturate",
            main_label: "Saturate",
            label_units: "%",
            default_value: "100",
            min: "0",
            max: "200",
            step: "1",
            slider_event: (value) => {
                this.filter_values.saturate = Number(value);
                this.apply_filters();
            },
        });
    }

    /**
     * Apply CSS filters to all image frames
     */
    private apply_filters() {
        const filter_string = this.build_filter_string();
        const images = document.querySelectorAll<HTMLImageElement>(`.image_frame`);

        images.forEach((img) => {
            img.style.filter = filter_string;
        });
    }

    /**
     * Build CSS filter string from current filter values
     */
    private build_filter_string(): string {
        const filters: string[] = [];

        if (this.filter_values.brightness !== 100) {
            filters.push(`brightness(${this.filter_values.brightness}%)`);
        }
        if (this.filter_values.contrast !== 100) {
            filters.push(`contrast(${this.filter_values.contrast}%)`);
        }
        if (this.filter_values.hueRotate !== 0) {
            filters.push(`hue-rotate(${this.filter_values.hueRotate}deg)`);
        }
        if (this.filter_values.invert !== 0) {
            filters.push(`invert(${this.filter_values.invert}%)`);
        }
        if (this.filter_values.saturate !== 100) {
            filters.push(`saturate(${this.filter_values.saturate}%)`);
        }

        return filters.length > 0 ? filters.join(" ") : "none";
    }

    /**
     * Reset all filters to default values
     */
    private reset_filters() {
        this.filter_values = { ...DEFAULT_FILTER_VALUES };

        // Update slider values in the DOM
        const brightness_input = document.querySelector<HTMLInputElement>("#image-filter-brightness");
        const contrast_input = document.querySelector<HTMLInputElement>("#image-filter-contrast");
        const hue_rotate_input = document.querySelector<HTMLInputElement>("#image-filter-hue-rotate");
        const invert_input = document.querySelector<HTMLInputElement>("#image-filter-invert");
        const saturate_input = document.querySelector<HTMLInputElement>("#image-filter-saturate");

        if (brightness_input) brightness_input.value = "100";
        if (contrast_input) contrast_input.value = "100";
        if (hue_rotate_input) hue_rotate_input.value = "0";
        if (invert_input) invert_input.value = "0";
        if (saturate_input) saturate_input.value = "100";

        // Update labels
        const brightness_label = document.querySelector<HTMLLabelElement>("#image-filter-brightness-value-label");
        const contrast_label = document.querySelector<HTMLLabelElement>("#image-filter-contrast-value-label");
        const hue_rotate_label = document.querySelector<HTMLLabelElement>("#image-filter-hue-rotate-value-label");
        const invert_label = document.querySelector<HTMLLabelElement>("#image-filter-invert-value-label");
        const saturate_label = document.querySelector<HTMLLabelElement>("#image-filter-saturate-value-label");

        if (brightness_label) brightness_label.innerText = "100%";
        if (contrast_label) contrast_label.innerText = "100%";
        if (hue_rotate_label) hue_rotate_label.innerText = "0°";
        if (invert_label) invert_label.innerText = "0%";
        if (saturate_label) saturate_label.innerText = "100%";

        this.apply_filters();
    }

    /**
     * Get the HTML for this toolbox item
     */
    public get_html(): string {
        return `
        <div id="image-filters-container" class="image-filters-toolbox-item">
            <div class="toolbox-divider"></div>
            <div class="image-filters-header">
                <h3 class="image-filters-title">Image Filters</h3>
                <button id="image-filters-toggle" class="image-filters-toggle-btn">▼</button>
            </div>
            <div id="image-filters-content" class="image-filters-content">
                ${this.brightness_slider.getSliderHTML()}
                ${this.contrast_slider.getSliderHTML()}
                ${this.hue_rotate_slider.getSliderHTML()}
                ${this.invert_slider.getSliderHTML()}
                ${this.saturate_slider.getSliderHTML()}
                <button id="image-filters-reset" class="image-filters-reset-btn">Reset Filters</button>
            </div>
        </div>
        `;
    }

    /**
     * Returns a unique string for this toolbox item
     */
    public get_toolbox_item_type(): string {
        return "ImageFilters";
    }

    /**
     * Code called after all of ULabel's constructor and initialization code is called
     */
    public after_init(): void {
        // Nothing needed after init for this toolbox item
    }

    /**
     * Initialize event listeners for this toolbox item
     */
    public init_listeners() {
        // Toggle button to show/hide filter controls
        $(document).on("click.ulabel", "#image-filters-toggle", () => {
            const content = document.querySelector<HTMLDivElement>("#image-filters-content");
            const toggle_btn = document.querySelector<HTMLButtonElement>("#image-filters-toggle");

            if (content && toggle_btn) {
                const is_hidden = content.style.display === "none";
                content.style.display = is_hidden ? "block" : "none";
                toggle_btn.innerText = is_hidden ? "▲" : "▼";
            }
        });

        // Reset button
        $(document).on("click.ulabel", "#image-filters-reset", () => {
            this.reset_filters();
        });
    }

    /**
     * Redraw/update this toolbox item
     */
    public redraw_update_items() {
        // Nothing to update dynamically
    }

    /**
     * Add CSS styles for the image filters toolbox item
     */
    protected add_styles() {
        const css = `
        #toolbox .image-filters-toolbox-item {
            padding: 0.5rem 0;
        }

        #toolbox .image-filters-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 1.5rem;
            cursor: pointer;
        }

        #toolbox .image-filters-title {
            margin: 0.5rem 0;
            font-size: 1rem;
            font-weight: 600;
        }

        #toolbox .image-filters-toggle-btn {
            background: none;
            border: none;
            color: inherit;
            font-size: 1rem;
            cursor: pointer;
            padding: 0.25rem;
            width: 24px;
            height: 24px;
        }

        #toolbox .image-filters-toggle-btn:hover {
            background-color: rgba(0, 128, 255, 0.1);
        }

        #toolbox .image-filters-content {
            display: block;
        }

        #toolbox .image-filters-reset-btn {
            margin: 1rem 1.5rem 0.5rem;
            padding: 0.5rem 1rem;
            width: calc(100% - 3rem);
            border-radius: 4px;
            font-size: 0.9rem;
        }
        `;

        // Create an id so this specific style tag can be referenced
        const style_id = "image-filters-toolbox-styles";

        // Don't add the style tag if it's already been added once
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
}
