import type { ULabel } from "../index";
import { ToolboxItem } from "../toolbox";
import { ULabelAnnotation } from "../annotation";
import { ULabelSubtask } from "../subtask";
import {
    BBOX_SVG,
    DELETE_BBOX_SVG,
    BBOX3_SVG,
    POINT_SVG,
    POLYGON_SVG,
    DELETE_POLYGON_SVG,
    CONTOUR_SVG,
    TBAR_SVG,
    POLYLINE_SVG,
    WHOLE_IMAGE_SVG,
} from "../../src/blobs";

/**
 * Toolbox item for displaying and navigating annotations in a list
 */
export class AnnotationListToolboxItem extends ToolboxItem {
    private ulabel: ULabel;
    private show_deprecated: boolean = false;
    private group_by_class: boolean = false;
    private is_collapsed: boolean = false;
    private show_labels: boolean = false;
    private sync_scheduled: boolean = false;

    constructor(ulabel: ULabel) {
        super();
        this.ulabel = ulabel;

        this.add_styles();
        this.add_event_listeners();
    }

    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        const css = `
        #toolbox .annotation-list-toolbox-item {
            padding: 0.5rem 0;
        }

        #toolbox .annotation-list-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 1.5rem;
            cursor: pointer;
        }

        #toolbox .annotation-list-title {
            margin: 0.5rem 0;
            font-size: 1rem;
            font-weight: 600;
        }

        #toolbox .annotation-list-toggle-btn {
            background: none;
            border: none;
            color: inherit;
            font-size: 1rem;
            cursor: pointer;
            padding: 0.25rem;
            width: 24px;
            height: 24px;
        }

        #toolbox .annotation-list-toggle-btn:hover {
            background-color: rgba(0, 128, 255, 0.1);
        }

        #toolbox .annotation-list-content {
            display: block;
            padding: 0 1rem;
        }

        #toolbox .annotation-list-options {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.5rem;
            font-size: 0.85rem;
        }

        #toolbox .annotation-list-option {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        #toolbox .annotation-list-option input[type="checkbox"] {
            cursor: pointer;
        }

        #toolbox .annotation-list-option label {
            cursor: pointer;
            user-select: none;
        }

        #toolbox .annotation-list-container {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid rgba(128, 128, 128, 0.3);
            border-radius: 4px;
            margin: 0.5rem 0;
        }

        #toolbox .annotation-list-empty {
            padding: 1rem;
            text-align: center;
            color: gray;
            font-style: italic;
        }

        #toolbox .annotation-list-item {
            padding: 0.5rem;
            border-bottom: 1px solid rgba(128, 128, 128, 0.2);
            cursor: pointer;
            transition: background-color 150ms;
        }

        #toolbox .annotation-list-item:last-child {
            border-bottom: none;
        }

        #toolbox .annotation-list-item:hover {
            background-color: rgba(0, 128, 255, 0.1);
        }

        #toolbox .annotation-list-item.highlighted {
            background-color: rgba(0, 128, 255, 0.2);
        }

        #toolbox .annotation-list-item-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        #toolbox .annotation-list-item-icon {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #toolbox .annotation-list-item-icon svg {
            width: 100%;
            height: 100%;
        }

        #toolbox .annotation-list-item-text {
            flex: 1;
            font-size: 0.85rem;
        }

        #toolbox .annotation-list-item-class {
            font-weight: 600;
        }

        #toolbox .annotation-list-item-id {
            color: gray;
            font-size: 0.75rem;
        }

        #toolbox .annotation-list-class-group {
            margin-bottom: 0.5rem;
        }

        #toolbox .annotation-list-class-group-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            background-color: rgba(128, 128, 128, 0.1);
            font-weight: 600;
            font-size: 0.9rem;
        }

        #toolbox .annotation-list-class-group-color {
            width: 14px;
            height: 14px;
            border-radius: 2px;
            flex-shrink: 0;
        }

        #toolbox .annotation-list-class-group-count {
            margin-left: auto;
            color: gray;
            font-size: 0.8rem;
            font-weight: normal;
        }

        .annotation-label {
            position: absolute;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            pointer-events: none;
            z-index: 1000;
            white-space: nowrap;
        }

        .ulabel-night .annotation-label {
            background-color: rgba(255, 255, 255, 0.8);
            color: black;
        }

        .ulabel-night #toolbox .annotation-list-container {
            border-color: rgba(255, 255, 255, 0.3);
        }

        .ulabel-night #toolbox .annotation-list-item {
            border-bottom-color: rgba(255, 255, 255, 0.2);
        }

        .ulabel-night #toolbox .annotation-list-item:hover {
            background-color: rgba(100, 149, 237, 0.2);
        }

        .ulabel-night #toolbox .annotation-list-item.highlighted {
            background-color: rgba(100, 149, 237, 0.3);
        }

        .ulabel-night #toolbox .annotation-list-class-group-header {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .annotation-navigation-toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            pointer-events: none;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        }

        .annotation-navigation-toast.show {
            opacity: 1;
        }

        .ulabel-night .annotation-navigation-toast {
            background-color: rgba(255, 255, 255, 0.9);
            color: black;
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
        }
        `;

        const style_id = "annotation-list-toolbox-styles";

        if (document.getElementById(style_id)) return;

        const head = document.head || document.querySelector("head");
        const style = document.createElement("style");

        style.appendChild(document.createTextNode(css));
        style.id = style_id;

        head.appendChild(style);
    }

    /**
     * Initialize event listeners for this toolbox item
     */
    private add_event_listeners() {
        // Toggle button to show/hide annotation list
        $(document).on("click.ulabel", "#annotation-list-toggle", () => {
            this.is_collapsed = !this.is_collapsed;
            this.update_list();
        });

        // Show/hide deprecated annotations checkbox
        $(document).on("change.ulabel", "#annotation-list-show-deprecated", (e) => {
            this.show_deprecated = (e.target as HTMLInputElement).checked;
            this.update_list();
        });

        // Group by class checkbox
        $(document).on("change.ulabel", "#annotation-list-group-by-class", (e) => {
            this.group_by_class = (e.target as HTMLInputElement).checked;
            this.update_list();
        });

        // Show labels checkbox
        $(document).on("change.ulabel", "#annotation-list-show-labels", (e) => {
            this.show_labels = (e.target as HTMLInputElement).checked;
            if (this.show_labels) {
                this.render_all_labels();
            } else {
                this.clear_all_labels();
            }
        });

        // Click on annotation list item to fly to it
        $(document).on("click.ulabel", ".annotation-list-item", (e) => {
            const annotation_id = $(e.currentTarget).data("annotation-id");
            if (annotation_id) {
                this.ulabel.fly_to_annotation_id(annotation_id, null, this.ulabel.config.fly_to_max_zoom);
            }
        });

        // Hover on annotation list item to highlight annotation on canvas
        $(document).on("mouseenter.ulabel", ".annotation-list-item", (e) => {
            const annotation_id = $(e.currentTarget).data("annotation-id");
            if (annotation_id) {
                // Highlight this list item
                $(".annotation-list-item").removeClass("highlighted");
                $(e.currentTarget).addClass("highlighted");

                // Show the global edit suggestion (ID dialog)
                this.ulabel.show_global_edit_suggestion(annotation_id, null, null);
            }
        });

        // Remove highlight when mouse leaves the list item
        $(document).on("mouseleave.ulabel", ".annotation-list-item", () => {
            $(".annotation-list-item").removeClass("highlighted");
            // Clear the edit suggestion
            this.ulabel.hide_global_edit_suggestion();
            this.ulabel.hide_edit_suggestion();
        });

        // Listen for mousemove on the annbox to sync list highlighting from canvas
        $(document).on("mousemove.ulabel", `#${this.ulabel.config.annbox_id}`, () => {
            // Use requestAnimationFrame to avoid excessive calls
            if (!this.sync_scheduled) {
                this.sync_scheduled = true;
                requestAnimationFrame(() => {
                    this.sync_highlight_from_canvas();
                    this.sync_scheduled = false;
                });
            }
        });

        // Also listen for mouseleave on annbox to clear highlights when leaving the canvas area
        $(document).on("mouseleave.ulabel", `#${this.ulabel.config.annbox_id}`, () => {
            // Don't clear if we're hovering over a list item
            if (!$(".annotation-list-item:hover").length) {
                $(".annotation-list-item").removeClass("highlighted");
            }
        });
    }

    /**
     * Render labels on all annotations
     */
    private render_all_labels() {
        // Clear existing labels first
        this.clear_all_labels();

        const current_subtask = this.ulabel.get_current_subtask();
        if (!current_subtask) return;

        const annotations = this.get_filtered_annotations(current_subtask);

        for (let i = 0; i < annotations.length; i++) {
            const annotation = annotations[i];
            this.render_annotation_label(annotation, i);
        }
    }

    /**
     * Render a label for a single annotation
     */
    private render_annotation_label(annotation: ULabelAnnotation, display_idx: number) {
        // Skip if annotation doesn't have a containing box
        if (!annotation.containing_box) return;

        const bbox = annotation.containing_box;
        const class_id = this.get_annotation_class_id(annotation);
        const current_subtask = this.ulabel.get_current_subtask();
        const class_def = current_subtask.class_defs.find((def) => def.id === class_id);
        const class_name = class_def ? class_def.name : "Unknown";

        // Calculate scale using the same method as get_empirical_scale
        const imwrap_width = $("#" + this.ulabel.config.imwrap_id).width();
        const scale = imwrap_width / this.ulabel.config.image_width;
        const annbox = $("#" + this.ulabel.config.annbox_id);

        const x = bbox.tlx * scale - annbox.scrollLeft();
        const y = bbox.tly * scale - annbox.scrollTop();

        // Create label element
        const label = document.createElement("div");
        label.className = "annotation-label";
        label.id = `annotation-label-${annotation.id}`;
        label.textContent = `${class_name} #${display_idx}`;
        label.style.left = `${x}px`;
        label.style.top = `${y - 20}px`; // Position above the annotation

        // Add to annbox
        annbox.append(label);
    }

    /**
     * Clear all annotation labels
     */
    private clear_all_labels() {
        $(".annotation-label").remove();
    }

    /**
     * Update labels when zooming/panning
     */
    private update_label_positions() {
        if (!this.show_labels) return;

        const current_subtask = this.ulabel.get_current_subtask();
        if (!current_subtask) return;

        const annotations = this.get_filtered_annotations(current_subtask);

        // Calculate scale using the same method as get_empirical_scale
        const imwrap_width = $("#" + this.ulabel.config.imwrap_id).width();
        const scale = imwrap_width / this.ulabel.config.image_width;
        const annbox = $("#" + this.ulabel.config.annbox_id);

        for (let i = 0; i < annotations.length; i++) {
            const annotation = annotations[i];
            if (!annotation.containing_box) continue;

            const bbox = annotation.containing_box;
            const x = bbox.tlx * scale - annbox.scrollLeft();
            const y = bbox.tly * scale - annbox.scrollTop();

            const label = document.getElementById(`annotation-label-${annotation.id}`);
            if (label) {
                label.style.left = `${x}px`;
                label.style.top = `${y - 20}px`;
            }
        }
    }

    /**
     * Build and update the annotation list display
     */
    private update_list() {
        const content = document.querySelector<HTMLDivElement>("#annotation-list-content");
        const toggle_btn = document.querySelector<HTMLButtonElement>("#annotation-list-toggle");

        if (!content || !toggle_btn) return;

        // Update toggle button
        toggle_btn.innerText = this.is_collapsed ? "▼" : "▲";
        content.style.display = this.is_collapsed ? "none" : "block";

        if (this.is_collapsed) return;

        // Get current subtask
        const current_subtask = this.ulabel.get_current_subtask();
        if (!current_subtask) return;

        // Build the list HTML
        const list_container = document.querySelector<HTMLDivElement>("#annotation-list-container");
        if (!list_container) return;

        const annotations = this.get_filtered_annotations(current_subtask);

        if (annotations.length === 0) {
            list_container.innerHTML = "<div class=\"annotation-list-empty\">No annotations</div>";
            return;
        }

        if (this.group_by_class) {
            list_container.innerHTML = this.build_grouped_list_html(annotations, current_subtask);
        } else {
            list_container.innerHTML = this.build_flat_list_html(annotations, current_subtask);
        }
    }

    /**
     * Get filtered annotations based on current options
     */
    private get_filtered_annotations(subtask: ULabelSubtask): ULabelAnnotation[] {
        const annotations: ULabelAnnotation[] = [];

        for (const annotation_id of subtask.annotations.ordering) {
            const annotation = subtask.annotations.access[annotation_id];

            // Skip deprecated if option is disabled
            if (!this.show_deprecated && annotation.deprecated) {
                continue;
            }

            annotations.push(annotation);
        }

        return annotations;
    }

    /**
     * Build HTML for flat (non-grouped) list
     */
    private build_flat_list_html(annotations: ULabelAnnotation[], subtask: ULabelSubtask): string {
        let html = "";

        for (let i = 0; i < annotations.length; i++) {
            const annotation = annotations[i];
            const class_id = this.get_annotation_class_id(annotation);
            const class_def = subtask.class_defs.find((def) => def.id === class_id);
            const class_name = class_def ? class_def.name : "Unknown";
            const color = this.ulabel.color_info[class_id] || "#cccccc";
            const svg = this.get_spatial_type_svg(annotation.spatial_type, color);

            html += `
                <div class="annotation-list-item" data-annotation-id="${annotation.id}" data-annotation-idx="${i}">
                    <div class="annotation-list-item-header">
                        <div class="annotation-list-item-icon">${svg}</div>
                        <div class="annotation-list-item-text">
                            <span class="annotation-list-item-class">${class_name}</span>
                            <span class="annotation-list-item-id">#${i}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        return html;
    }

    /**
     * Build HTML for grouped (by class) list
     */
    private build_grouped_list_html(annotations: ULabelAnnotation[], subtask: ULabelSubtask): string {
        // Group annotations by class
        const groups: { [class_id: number]: ULabelAnnotation[] } = {};

        for (const annotation of annotations) {
            const class_id = this.get_annotation_class_id(annotation);
            if (!groups[class_id]) {
                groups[class_id] = [];
            }
            groups[class_id].push(annotation);
        }

        // Build HTML for each group
        let html = "";

        for (const class_id_str in groups) {
            const class_id = parseInt(class_id_str);
            const group_annotations = groups[class_id];
            const class_def = subtask.class_defs.find((def) => def.id === class_id);
            const class_name = class_def ? class_def.name : "Unknown";
            const color = this.ulabel.color_info[class_id] || "#cccccc";

            html += `
                <div class="annotation-list-class-group">
                    <div class="annotation-list-class-group-header">
                        <div class="annotation-list-class-group-color" style="background-color: ${color};"></div>
                        <span>${class_name}</span>
                        <span class="annotation-list-class-group-count">(${group_annotations.length})</span>
                    </div>
            `;

            for (let i = 0; i < group_annotations.length; i++) {
                const annotation = group_annotations[i];
                const overall_idx = annotations.indexOf(annotation);
                const svg = this.get_spatial_type_svg(annotation.spatial_type, color);

                html += `
                    <div class="annotation-list-item" data-annotation-id="${annotation.id}" data-annotation-idx="${overall_idx}">
                        <div class="annotation-list-item-header">
                            <div class="annotation-list-item-icon" style="margin-left: 0.5rem;">${svg}</div>
                            <div class="annotation-list-item-text">
                                <span class="annotation-list-item-id">#${i}</span>
                            </div>
                        </div>
                    </div>
                `;
            }

            html += `</div>`;
        }

        return html;
    }

    /**
     * Get the SVG icon for a given spatial type
     */
    private get_spatial_type_svg(spatial_type: string, color: string): string {
        let svg = "";

        switch (spatial_type) {
            case "bbox":
                svg = BBOX_SVG;
                break;
            case "delete_bbox":
                svg = DELETE_BBOX_SVG;
                break;
            case "bbox3":
                svg = BBOX3_SVG;
                break;
            case "point":
                svg = POINT_SVG;
                break;
            case "polygon":
                svg = POLYGON_SVG;
                break;
            case "delete_polygon":
                svg = DELETE_POLYGON_SVG;
                break;
            case "contour":
                svg = CONTOUR_SVG;
                break;
            case "tbar":
                svg = TBAR_SVG;
                break;
            case "polyline":
                svg = POLYLINE_SVG;
                break;
            case "whole-image":
            case "global":
                svg = WHOLE_IMAGE_SVG;
                break;
            default:
                svg = BBOX_SVG; // fallback
                break;
        }

        // Color the SVG by replacing stroke/fill colors
        // The SVGs use various colors, so we'll replace common ones
        svg = svg.replace(/stroke:#[0-9a-fA-F]{6}/g, `stroke:${color}`);
        svg = svg.replace(/fill:#[0-9a-fA-F]{6}/g, `fill:${color}`);

        return svg;
    }

    /**
     * Get the primary class ID for an annotation
     */
    private get_annotation_class_id(annotation: ULabelAnnotation): number {
        if (!annotation.classification_payloads || annotation.classification_payloads.length === 0) {
            return 0;
        }

        // Find the classification payload with the highest confidence
        let max_confidence = -1;
        let class_id = annotation.classification_payloads[0].class_id;

        for (const payload of annotation.classification_payloads) {
            if (payload.confidence > max_confidence) {
                max_confidence = payload.confidence;
                class_id = payload.class_id;
            }
        }

        return class_id;
    }

    /**
     * Get the HTML for this toolbox item
     */
    public get_html(): string {
        return `
        <div id="annotation-list-container-outer" class="annotation-list-toolbox-item">
            <div class="toolbox-divider"></div>
            <div class="annotation-list-header">
                <h3 class="annotation-list-title">Annotation List</h3>
                <button id="annotation-list-toggle" class="annotation-list-toggle-btn">▲</button>
            </div>
            <div id="annotation-list-content" class="annotation-list-content">
                <div class="annotation-list-options">
                    <div class="annotation-list-option">
                        <input type="checkbox" id="annotation-list-show-deprecated" />
                        <label for="annotation-list-show-deprecated">Show Deprecated</label>
                    </div>
                    <div class="annotation-list-option">
                        <input type="checkbox" id="annotation-list-group-by-class" />
                        <label for="annotation-list-group-by-class">Group by Class</label>
                    </div>
                    <div class="annotation-list-option">
                        <input type="checkbox" id="annotation-list-show-labels" />
                        <label for="annotation-list-show-labels">Show Labels on Canvas</label>
                    </div>
                </div>
                <div id="annotation-list-container" class="annotation-list-container">
                    <div class="annotation-list-empty">No annotations</div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Returns a unique string for this toolbox item
     */
    public get_toolbox_item_type(): string {
        return "AnnotationList";
    }

    /**
     * Code called after all of ULabel's constructor and initialization code is called
     */
    public after_init(): void {
        // Initial list update
        this.update_list();
    }

    /**
     * Update the list when annotations change
     */
    public redraw_update(): void {
        this.update_list();
        this.sync_highlight_from_canvas();
        if (this.show_labels) {
            this.render_all_labels();
        }
    }

    /**
     * Update the list when frame changes
     */
    public frame_update(): void {
        this.update_list();
        this.sync_highlight_from_canvas();
        if (this.show_labels) {
            this.render_all_labels();
        }
    }

    /**
     * Sync highlighting from canvas hover to list
     * Called when the edit_candidate changes on the canvas
     */
    private sync_highlight_from_canvas() {
        const current_subtask = this.ulabel.get_current_subtask();
        if (!current_subtask) return;

        const edit_candidate = current_subtask.state.edit_candidate;

        // Remove all highlights first
        $(".annotation-list-item").removeClass("highlighted");

        // If there's an edit candidate, highlight its list item
        if (edit_candidate && edit_candidate.annid) {
            const list_item = $(`.annotation-list-item[data-annotation-id="${edit_candidate.annid}"]`);
            if (list_item.length > 0) {
                list_item.addClass("highlighted");
                // Optionally scroll the item into view
                list_item[0].scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }
    }
}
