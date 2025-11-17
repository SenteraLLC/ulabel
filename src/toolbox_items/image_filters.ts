import type { ULabel } from "../index";
import { SliderHandler } from "../html_builder";
import { ToolboxItem } from "../toolbox";
import { get_local_storage_item, set_local_storage_item } from "../utilities";

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
    private is_collapsed: boolean = false;

    constructor(ulabel: ULabel) {
        super();
        this.ulabel = ulabel;

        // Get default values from config
        this.filter_values = this.get_default_filter_values();

        this.init_sliders();
        this.add_styles();
        this.init_listeners();
    }

    /**
     * Get default filter values from config or use built-in defaults
     */
    private get_default_filter_values(): ImageFilterValues {
        const config_defaults = this.ulabel.config.image_filters_toolbox_item?.default_values || {};
        return {
            brightness: config_defaults.brightness ?? DEFAULT_FILTER_VALUES.brightness,
            contrast: config_defaults.contrast ?? DEFAULT_FILTER_VALUES.contrast,
            hueRotate: config_defaults.hueRotate ?? DEFAULT_FILTER_VALUES.hueRotate,
            invert: config_defaults.invert ?? DEFAULT_FILTER_VALUES.invert,
            saturate: config_defaults.saturate ?? DEFAULT_FILTER_VALUES.saturate,
        };
    }

    private init_sliders() {
        // Brightness slider (0-200%)
        this.brightness_slider = new SliderHandler({
            id: "image-filter-brightness",
            main_label: "Brightness",
            label_units: "%",
            default_value: String(this.filter_values.brightness),
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
            default_value: String(this.filter_values.contrast),
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
            default_value: String(this.filter_values.hueRotate),
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
            default_value: String(this.filter_values.invert),
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
            default_value: String(this.filter_values.saturate),
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
     * Reset all filters to default values (from config or built-in defaults)
     */
    private reset_filters() {
        // Reset filter values to defaults
        this.filter_values = this.get_default_filter_values();

        // Update all slider inputs and labels
        this.update_slider_input_and_label("brightness", this.filter_values.brightness, "%");
        this.update_slider_input_and_label("contrast", this.filter_values.contrast, "%");
        this.update_slider_input_and_label("hue-rotate", this.filter_values.hueRotate, "°");
        this.update_slider_input_and_label("invert", this.filter_values.invert, "%");
        this.update_slider_input_and_label("saturate", this.filter_values.saturate, "%");

        this.apply_filters();
    }

    /**
     * Helper method to update both slider input value and label
     */
    private update_slider_input_and_label(filter_type: string, value: number, unit: string) {
        const input = document.querySelector<HTMLInputElement>(`#image-filter-${filter_type}`);
        const label = document.querySelector<HTMLLabelElement>(`#image-filter-${filter_type}-value-label`);

        if (input) input.value = String(value);
        if (label) label.innerText = `${value}${unit}`;
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
        // Restore collapsed state from localStorage
        this.restore_collapsed_state();

        // Apply the initial filter values from config
        this.apply_filters();
    }

    /**
     * Restore the collapsed state from localStorage
     */
    private restore_collapsed_state(): void {
        const stored_state = get_local_storage_item("ulabel_image_filters_collapsed");
        if (stored_state === "false") {
            this.is_collapsed = false;
        } else if (stored_state === "true") {
            this.is_collapsed = true;
        }

        // Apply the stored state to the UI
        const content = document.querySelector<HTMLDivElement>("#image-filters-content");
        const toggle_btn = document.querySelector<HTMLButtonElement>("#image-filters-toggle");

        if (content && toggle_btn) {
            content.style.display = this.is_collapsed ? "none" : "block";
            toggle_btn.innerText = this.is_collapsed ? "▼" : "▲";
        }
    }

    /**
     * Initialize event listeners for this toolbox item
     */
    public init_listeners() {
        // Toggle button to show/hide filter controls (click anywhere on header)
        $(document).on("click.ulabel", ".image-filters-header", () => {
            const content = document.querySelector<HTMLDivElement>("#image-filters-content");
            const toggle_btn = document.querySelector<HTMLButtonElement>("#image-filters-toggle");

            if (content && toggle_btn) {
                this.is_collapsed = !this.is_collapsed;
                set_local_storage_item("ulabel_image_filters_collapsed", this.is_collapsed ? "true" : "false");
                content.style.display = this.is_collapsed ? "none" : "block";
                toggle_btn.innerText = this.is_collapsed ? "▼" : "▲";
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
