import type { ULabel } from "../index";
import { ToolboxItem } from "../toolbox";

interface KeybindInfo {
    key: string;
    label: string;
    description: string;
    configurable: boolean;
    config_key?: string;
}

/**
 * Toolbox item for displaying and editing keybinds
 */
export class KeybindsToolboxItem extends ToolboxItem {
    private ulabel: ULabel;
    private is_collapsed: boolean = true;

    constructor(ulabel: ULabel) {
        super();
        this.ulabel = ulabel;

        this.add_styles();
    }

    /**
     * Create the css for this ToolboxItem and append it to the page.
     */
    protected add_styles() {
        const css = `
        #toolbox .keybinds-toolbox-item {
            padding: 0.5rem 0;
        }

        #toolbox .keybinds-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 1.5rem;
            cursor: pointer;
        }

        #toolbox .keybinds-title {
            margin: 0.5rem 0;
            font-size: 1rem;
            font-weight: 600;
        }

        #toolbox .keybinds-toggle-btn {
            background: none;
            border: none;
            color: inherit;
            font-size: 1rem;
            cursor: pointer;
            padding: 0.25rem;
            width: 24px;
            height: 24px;
        }

        #toolbox .keybinds-toggle-btn:hover {
            background-color: rgba(0, 128, 255, 0.1);
        }

        #toolbox .keybinds-content {
            display: none;
            padding: 0 1rem;
            max-height: 400px;
            overflow-y: auto;
        }

        #toolbox .keybinds-content.expanded {
            display: block;
        }

        #toolbox .keybinds-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.5rem;
        }

        #toolbox .keybind-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.5rem;
            border-radius: 4px;
            background-color: rgba(0, 0, 0, 0.05);
            font-size: 0.85rem;
        }

        .ulabel-night #toolbox .keybind-item {
            background-color: rgba(255, 255, 255, 0.05);
        }

        #toolbox .keybind-item:hover {
            background-color: rgba(0, 128, 255, 0.1);
        }

        #toolbox .keybind-description {
            flex: 1;
            margin-right: 0.75rem;
            color: #333;
            font-weight: 500;
        }

        .ulabel-night #toolbox .keybind-description {
            color: #ddd;
        }

        #toolbox .keybind-key {
            font-family: monospace;
            font-weight: bold;
            font-size: 0.9rem;
            padding: 0.3rem 0.6rem;
            background-color: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            min-width: 30px;
            text-align: center;
            white-space: nowrap;
        }

        .ulabel-night #toolbox .keybind-key {
            background-color: rgba(255, 255, 255, 0.1);
        }

        #toolbox .keybind-key.collision {
            background-color: rgba(255, 0, 0, 0.3);
            border: 1px solid red;
        }

        #toolbox .keybind-key.editable {
            cursor: pointer;
            border: 1px solid transparent;
        }

        #toolbox .keybind-key.editable:hover {
            background-color: rgba(0, 128, 255, 0.2);
            border-color: rgba(0, 128, 255, 0.5);
        }

        #toolbox .keybind-key.editing {
            outline: 2px solid rgba(0, 128, 255, 0.7);
        }

        #toolbox .keybind-category {
            font-weight: 600;
            font-size: 0.9rem;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            padding: 0.25rem 0.5rem;
            color: rgba(0, 128, 255, 0.9);
        }
        `;

        const style_id = "keybinds-toolbox-styles";
        const existing_style = document.getElementById(style_id);
        if (existing_style) {
            existing_style.remove();
        }

        const style = document.createElement("style");
        style.id = style_id;
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    /**
     * Get all keybinds from the configuration
     */
    private get_all_keybinds(): KeybindInfo[] {
        const config = this.ulabel.config;
        const keybinds: KeybindInfo[] = [];

        // Configurable keybinds
        keybinds.push({
            key: config.change_zoom_keybind,
            label: "Change Zoom",
            description: "Change zoom mode (hold: drag zoom, release: single-click zoom)",
            configurable: true,
            config_key: "change_zoom_keybind",
        });

        keybinds.push({
            key: config.create_point_annotation_keybind,
            label: "Create Point",
            description: "Create point annotation at mouse location (in point mode)",
            configurable: true,
            config_key: "create_point_annotation_keybind",
        });

        keybinds.push({
            key: config.delete_annotation_keybind,
            label: "Delete Annotation",
            description: "Delete (deprecate) the active annotation",
            configurable: true,
            config_key: "delete_annotation_keybind",
        });

        keybinds.push({
            key: config.switch_subtask_keybind,
            label: "Switch Subtask",
            description: "Switch to the next subtask",
            configurable: true,
            config_key: "switch_subtask_keybind",
        });

        keybinds.push({
            key: config.toggle_annotation_mode_keybind,
            label: "Toggle Mode",
            description: "Toggle between annotation modes",
            configurable: true,
            config_key: "toggle_annotation_mode_keybind",
        });

        keybinds.push({
            key: config.create_bbox_on_initial_crop,
            label: "Create BBox on Crop",
            description: "Create bbox annotation on initial crop area",
            configurable: true,
            config_key: "create_bbox_on_initial_crop",
        });

        keybinds.push({
            key: config.toggle_brush_mode_keybind,
            label: "Toggle Brush",
            description: "Toggle brush mode for polygon/contour annotation",
            configurable: true,
            config_key: "toggle_brush_mode_keybind",
        });

        keybinds.push({
            key: config.toggle_erase_mode_keybind,
            label: "Toggle Erase",
            description: "Toggle erase mode in brush",
            configurable: true,
            config_key: "toggle_erase_mode_keybind",
        });

        keybinds.push({
            key: config.increase_brush_size_keybind,
            label: "Increase Brush Size",
            description: "Increase brush size",
            configurable: true,
            config_key: "increase_brush_size_keybind",
        });

        keybinds.push({
            key: config.decrease_brush_size_keybind,
            label: "Decrease Brush Size",
            description: "Decrease brush size",
            configurable: true,
            config_key: "decrease_brush_size_keybind",
        });

        keybinds.push({
            key: config.fly_to_next_annotation_keybind,
            label: "Next Annotation",
            description: "Fly to next annotation",
            configurable: true,
            config_key: "fly_to_next_annotation_keybind",
        });

        if (config.fly_to_previous_annotation_keybind !== null) {
            keybinds.push({
                key: config.fly_to_previous_annotation_keybind,
                label: "Previous Annotation",
                description: "Fly to previous annotation",
                configurable: true,
                config_key: "fly_to_previous_annotation_keybind",
            });
        }

        // Resize keybinds from default_keybinds
        if (config.default_keybinds) {
            keybinds.push({
                key: config.default_keybinds.annotation_size_small,
                label: "Size: Small",
                description: "Set annotation size to small",
                configurable: false,
            });

            keybinds.push({
                key: config.default_keybinds.annotation_size_large,
                label: "Size: Large",
                description: "Set annotation size to large",
                configurable: false,
            });

            keybinds.push({
                key: config.default_keybinds.annotation_size_plus,
                label: "Size: Increase",
                description: "Increase annotation size",
                configurable: false,
            });

            keybinds.push({
                key: config.default_keybinds.annotation_size_minus,
                label: "Size: Decrease",
                description: "Decrease annotation size",
                configurable: false,
            });

            keybinds.push({
                key: config.default_keybinds.annotation_vanish,
                label: "Toggle Vanish",
                description: "Toggle annotation vanish mode",
                configurable: false,
            });
        }

        // Add class keybinds
        const current_subtask = this.ulabel.get_current_subtask();
        if (current_subtask && current_subtask.class_defs) {
            for (const class_def of current_subtask.class_defs) {
                if (class_def.keybind !== null) {
                    keybinds.push({
                        key: class_def.keybind,
                        label: class_def.name,
                        description: `Select class: ${class_def.name}`,
                        configurable: false,
                    });
                }
            }
        }

        // Non-configurable keybinds (hardcoded in listeners)
        keybinds.push({
            key: "Shift+Tab",
            label: "Previous Annotation",
            description: "Fly to previous annotation (if fly_to_previous_annotation_keybind is null)",
            configurable: false,
        });

        return keybinds;
    }

    /**
     * Check if a key has collisions with other keybinds
     */
    private has_collision(key: string, all_keybinds: KeybindInfo[]): boolean {
        const occurrences = all_keybinds.filter((kb) => kb.key === key).length;
        return occurrences > 1;
    }

    /**
     * Generate HTML for the toolbox item
     */
    public get_html(): string {
        const all_keybinds = this.get_all_keybinds();

        let keybinds_html = "";

        // Group keybinds by category
        const configurable = all_keybinds.filter((kb) => kb.configurable);
        const class_binds = all_keybinds.filter((kb) => kb.description.startsWith("Select class:"));
        const resize_binds = all_keybinds.filter((kb) =>
            kb.description.includes("annotation size") || kb.description.includes("vanish"),
        );
        const other = all_keybinds.filter((kb) =>
            !kb.configurable &&
            !kb.description.startsWith("Select class:") &&
            !kb.description.includes("annotation size") &&
            !kb.description.includes("vanish"),
        );

        // Configurable keybinds
        if (configurable.length > 0) {
            keybinds_html += "<div class=\"keybind-category\">Configurable Keybinds</div>";
            for (const keybind of configurable) {
                const has_collision = this.has_collision(keybind.key, all_keybinds);
                const collision_class = has_collision ? " collision" : "";
                keybinds_html += `
                    <div class="keybind-item" title="${keybind.description}">
                        <span class="keybind-description">${keybind.label}</span>
                        <span class="keybind-key editable${collision_class}" data-config-key="${keybind.config_key}">${keybind.key}</span>
                    </div>
                `;
            }
        }

        // Class keybinds
        if (class_binds.length > 0) {
            keybinds_html += "<div class=\"keybind-category\">Class Selection</div>";
            for (const keybind of class_binds) {
                const has_collision = this.has_collision(keybind.key, all_keybinds);
                const collision_class = has_collision ? " collision" : "";
                keybinds_html += `
                    <div class="keybind-item" title="${keybind.description}">
                        <span class="keybind-description">${keybind.label}</span>
                        <span class="keybind-key${collision_class}">${keybind.key}</span>
                    </div>
                `;
            }
        }

        // Resize/vanish keybinds
        if (resize_binds.length > 0) {
            keybinds_html += "<div class=\"keybind-category\">Annotation Display</div>";
            for (const keybind of resize_binds) {
                const has_collision = this.has_collision(keybind.key, all_keybinds);
                const collision_class = has_collision ? " collision" : "";
                keybinds_html += `
                    <div class="keybind-item" title="${keybind.description}">
                        <span class="keybind-description">${keybind.label}</span>
                        <span class="keybind-key${collision_class}">${keybind.key}</span>
                    </div>
                `;
            }
        }

        // Other keybinds
        if (other.length > 0) {
            keybinds_html += "<div class=\"keybind-category\">Other</div>";
            for (const keybind of other) {
                const has_collision = this.has_collision(keybind.key, all_keybinds);
                const collision_class = has_collision ? " collision" : "";
                keybinds_html += `
                    <div class="keybind-item" title="${keybind.description}">
                        <span class="keybind-description">${keybind.label}</span>
                        <span class="keybind-key${collision_class}">${keybind.key}</span>
                    </div>
                `;
            }
        }

        return `
            <div class="keybinds-toolbox-item">
                <div class="keybinds-header">
                    <h3 class="keybinds-title">Keybinds</h3>
                    <button class="keybinds-toggle-btn">▶</button>
                </div>
                <div class="keybinds-content">
                    <div class="keybinds-list">
                        ${keybinds_html}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Returns a unique string identifier for this toolbox item type
     */
    public get_toolbox_item_type(): string {
        return "keybinds";
    }

    /**
     * Called after ULabel initialization is complete
     */
    public after_init(): void {
        this.add_event_listeners();
    }

    /**
     * Add event listeners for the keybinds toolbox item
     */
    private add_event_listeners(): void {
        // Toggle collapse/expand
        $(document).on("click.ulabel", ".keybinds-header", () => {
            this.is_collapsed = !this.is_collapsed;
            const content = $(".keybinds-content");
            const toggle_btn = $(".keybinds-toggle-btn");

            if (this.is_collapsed) {
                content.removeClass("expanded");
                toggle_btn.text("▶");
            } else {
                content.addClass("expanded");
                toggle_btn.text("▼");
            }
        });

        // TODO: Implement edit functionality for configurable keybinds
        $(document).on("click.ulabel", ".keybind-key.editable", (e) => {
            const target = $(e.currentTarget);
            const config_key = target.data("config-key");

            // For now, just show an alert
            alert(`Editing keybind for: ${config_key}\n\nThis feature is not yet fully implemented.`);
        });
    }
}
