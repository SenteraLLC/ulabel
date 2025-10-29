import type { ULabel } from "../index";
import { ToolboxItem } from "../toolbox";
import { Configuration } from "../configuration";
import { get_local_storage_item, set_local_storage_item } from "../utilities";
import { DELETE_CLASS_ID } from "../annotation";
import { log_message, LogLevel } from "../error_logging";

interface KeybindInfo {
    key: string;
    label: string;
    description: string;
    configurable: boolean;
    config_key?: string;
    class_id?: number; // For class keybinds
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

        #toolbox .keybinds-reset-all {
            padding: 0.5rem;
            margin-bottom: 0.5rem;
        }

        #toolbox .keybinds-reset-all-btn {
            width: 100%;
            padding: 0.5rem;
            background-color: rgba(255, 0, 0, 0.1);
            border: 1px solid rgba(255, 0, 0, 0.3);
            color: #d00;
            cursor: pointer;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: 500;
        }

        #toolbox .keybinds-reset-all-btn:hover {
            background-color: rgba(255, 0, 0, 0.2);
            border-color: rgba(255, 0, 0, 0.5);
        }

        .ulabel-night #toolbox .keybinds-reset-all-btn {
            color: #f66;
            border-color: rgba(255, 102, 102, 0.3);
        }

        .ulabel-night #toolbox .keybinds-reset-all-btn:hover {
            background-color: rgba(255, 102, 102, 0.2);
            border-color: rgba(255, 102, 102, 0.5);
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
            gap: 0.5rem;
        }

        .ulabel-night #toolbox .keybind-item {
            background-color: rgba(255, 255, 255, 0.05);
        }

        #toolbox .keybind-item:hover {
            background-color: rgba(0, 128, 255, 0.1);
        }

        #toolbox .keybind-description {
            flex: 0 1 auto;
            margin-right: 0.75rem;
            color: #333;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        #toolbox .keybind-controls {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        #toolbox .keybind-reset-btn {
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 0.2rem 0.4rem;
            font-size: 0.75rem;
            border-radius: 3px;
            opacity: 0.5;
            transition: opacity 0.2s;
        }

        #toolbox .keybind-item:hover .keybind-reset-btn {
            opacity: 1;
        }

        #toolbox .keybind-reset-btn:hover {
            background-color: rgba(255, 0, 0, 0.1);
            color: #d00;
        }

        .ulabel-night #toolbox .keybind-reset-btn {
            color: #aaa;
        }

        .ulabel-night #toolbox .keybind-reset-btn:hover {
            color: #f66;
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
            flex-shrink: 0;
        }

        .ulabel-night #toolbox .keybind-key {
            background-color: rgba(255, 255, 255, 0.1);
        }

        #toolbox .keybind-key.customized {
            background-color: rgba(255, 255, 0, 0.2);
            border: 1px solid rgba(255, 200, 0, 0.5);
        }

        .ulabel-night #toolbox .keybind-key.customized {
            background-color: rgba(255, 255, 0, 0.15);
            border-color: rgba(255, 200, 0, 0.4);
        }

        #toolbox .keybind-key.collision {
            background-color: rgba(255, 0, 0, 0.3);
            border: 1px solid red;
        }

        #toolbox .keybind-key.keybind-editable {
            cursor: pointer;
            border: 1px solid transparent;
        }

        #toolbox .keybind-key.keybind-editable:hover {
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
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
        }

        #toolbox .keybind-category:hover {
            background-color: rgba(0, 128, 255, 0.05);
        }

        #toolbox .keybind-category-toggle {
            font-size: 0.8rem;
            margin-left: 0.5rem;
        }

        #toolbox .keybind-section-items {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        #toolbox .keybind-section-items.collapsed {
            display: none;
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
            key: config.reset_zoom_keybind,
            label: "Reset Zoom",
            description: "Change zoom mode (hold: drag zoom, release: single-click zoom)",
            configurable: true,
            config_key: "reset_zoom_keybind",
        });

        keybinds.push({
            key: config.show_full_image_keybind,
            label: "Show Full Image",
            description: "Show the full image",
            configurable: true,
            config_key: "show_full_image_keybind",
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
            label: "Toggle Annotation Mode",
            description: "Toggle between annotation modes",
            configurable: true,
            config_key: "toggle_annotation_mode_keybind",
        });

        keybinds.push({
            key: config.create_bbox_on_initial_crop_keybind,
            label: "Create BBox on Crop",
            description: "Create bbox annotation on initial crop area",
            configurable: true,
            config_key: "create_bbox_on_initial_crop_keybind",
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

        keybinds.push({
            key: config.fly_to_previous_annotation_keybind,
            label: "Previous Annotation",
            description: "Fly to previous annotation",
            configurable: true,
            config_key: "fly_to_previous_annotation_keybind",
        });

        keybinds.push({
            key: config.annotation_size_small_keybind,
            label: "Size: Small",
            description: "Set annotation size to small",
            configurable: true,
            config_key: "annotation_size_small_keybind",
        });

        keybinds.push({
            key: config.annotation_size_large_keybind,
            label: "Size: Large",
            description: "Set annotation size to large",
            configurable: true,
            config_key: "annotation_size_large_keybind",
        });

        keybinds.push({
            key: config.annotation_size_plus_keybind,
            label: "Size: Increase",
            description: "Increase annotation size",
            configurable: true,
            config_key: "annotation_size_plus_keybind",
        });

        keybinds.push({
            key: config.annotation_size_minus_keybind,
            label: "Size: Decrease",
            description: "Decrease annotation size",
            configurable: true,
            config_key: "annotation_size_minus_keybind",
        });

        keybinds.push({
            key: config.annotation_vanish_keybind,
            label: "Toggle Vanish",
            description: "Toggle annotation vanish mode",
            configurable: true,
            config_key: "annotation_vanish_keybind",
        });

        // Add class keybinds
        const current_subtask = this.ulabel.get_current_subtask();
        if (current_subtask && current_subtask.class_defs) {
            for (const class_def of current_subtask.class_defs) {
                // Skip delete class
                if (class_def.id === DELETE_CLASS_ID) continue;

                keybinds.push({
                    key: class_def.keybind,
                    label: class_def.name,
                    description: `Select class: ${class_def.name}`,
                    configurable: true,
                    class_id: class_def.id,
                });
            }
        }

        // Non-configurable keybinds
        keybinds.push({
            key: "ctrl+z",
            label: "Undo",
            description: "Undo the last action",
            configurable: false,
        });

        keybinds.push({
            key: "ctrl+shift+z",
            label: "Redo",
            description: "Redo the last undone action",
            configurable: false,
        });

        keybinds.push({
            key: "Escape",
            label: "Cancel",
            description: "Cancel current action, exit brush/erase mode, or cancel annotation in progress",
            configurable: false,
        });

        return keybinds;
    }

    /**
     * Check if a key has collisions with other keybinds
     */
    private has_collision(key: string, all_keybinds: KeybindInfo[]): boolean {
        // Skip null/undefined keys
        if (!key) return false;

        // Normalize key for comparison (case-insensitive)
        const normalized_key = String(key).toLowerCase();

        const occurrences = all_keybinds.filter((kb) => {
            // Skip null/undefined keybinds
            if (!kb.key) return false;
            const kb_normalized = String(kb.key).toLowerCase();
            return kb_normalized === normalized_key;
        }).length;
        return occurrences > 1;
    }

    /**
     * Save a regular keybind to localStorage
     */
    private save_keybind_to_storage(config_key: string, value: string): void {
        const stored = get_local_storage_item("ulabel_custom_keybinds");
        const custom_keybinds = stored ? JSON.parse(stored) : {};
        custom_keybinds[config_key] = value;
        set_local_storage_item("ulabel_custom_keybinds", JSON.stringify(custom_keybinds));
    }

    /**
     * Save a class keybind to localStorage
     */
    private save_class_keybind_to_storage(class_id: number, value: string): void {
        const stored = get_local_storage_item("ulabel_custom_class_keybinds");
        const custom_class_keybinds = stored ? JSON.parse(stored) : {};
        custom_class_keybinds[class_id] = value;
        set_local_storage_item("ulabel_custom_class_keybinds", JSON.stringify(custom_class_keybinds));
    }

    /**
     * Get the default value for a keybind (from constructor, not hardcoded defaults)
     */
    private get_default_keybind(config_key: string): string {
        const original_config_keybinds = this.ulabel.state["original_config_keybinds"];
        if (original_config_keybinds && config_key in original_config_keybinds) {
            return original_config_keybinds[config_key];
        }
        // Fallback to current config value if not found in original keybinds
        return this.ulabel.config[config_key] as string;
    }

    /**
     * Reset a keybind to its default value
     */
    private reset_keybind_to_default(config_key: string): void {
        const default_value = this.get_default_keybind(config_key);
        this.ulabel.config[config_key] = default_value;

        // Remove from localStorage
        const stored = get_local_storage_item("ulabel_custom_keybinds");
        if (stored) {
            try {
                const custom_keybinds = JSON.parse(stored);
                delete custom_keybinds[config_key];
                if (Object.keys(custom_keybinds).length > 0) {
                    set_local_storage_item("ulabel_custom_keybinds", JSON.stringify(custom_keybinds));
                } else {
                    // Remove the key entirely if empty
                    localStorage.removeItem("ulabel_custom_keybinds");
                }
            } catch (e) {
                log_message(`Failed to update custom keybinds: ${e}`, LogLevel.ERROR, true);
            }
        }
    }

    /**
     * Get original class keybinds (before customization)
     */
    private get_original_class_keybinds(): { [class_id: number]: string } {
        // Get from ULabel state (stored during initialization)
        return this.ulabel.state["original_class_keybinds"] || {};
    }

    /**
     * Check if a regular keybind is customized (different from default)
     */
    private is_keybind_customized(config_key: string): boolean {
        const stored = get_local_storage_item("ulabel_custom_keybinds");
        if (stored) {
            try {
                const custom_keybinds = JSON.parse(stored);
                return config_key in custom_keybinds;
            } catch {
                return false;
            }
        }
        return false;
    }

    /**
     * Check if a class keybind is customized (different from default)
     */
    private is_class_keybind_customized(class_id: number): boolean {
        const stored = get_local_storage_item("ulabel_custom_class_keybinds");
        if (stored) {
            try {
                const custom_class_keybinds = JSON.parse(stored);
                return class_id in custom_class_keybinds;
            } catch {
                return false;
            }
        }
        return false;
    }

    /**
     * Reset a class keybind to its default value
     */
    private reset_class_keybind_to_default(class_id: number): void {
        const current_subtask = this.ulabel.get_current_subtask();
        const class_def = current_subtask.class_defs.find((cd) => cd.id === class_id);
        if (class_def) {
            const original_class_keybinds = this.get_original_class_keybinds();
            class_def.keybind = original_class_keybinds[class_id];
        }

        // Remove from localStorage
        const stored = get_local_storage_item("ulabel_custom_class_keybinds");
        if (stored) {
            try {
                const custom_class_keybinds = JSON.parse(stored);
                delete custom_class_keybinds[class_id];
                if (Object.keys(custom_class_keybinds).length > 0) {
                    set_local_storage_item("ulabel_custom_class_keybinds", JSON.stringify(custom_class_keybinds));
                } else {
                    // Remove the key entirely if empty
                    localStorage.removeItem("ulabel_custom_class_keybinds");
                }
            } catch (e) {
                log_message(`Failed to update custom class keybinds: ${e}`, LogLevel.ERROR, true);
            }
        }
    }

    /**
     * Reset all keybinds to their default values
     */
    private reset_all_keybinds_to_default(): void {
        // Reset all regular keybinds
        for (const key of Configuration.KEYBIND_CONFIG_KEYS) {
            const default_value = this.get_default_keybind(key);
            this.ulabel.config[key] = default_value;
        }

        // Reset all class keybinds
        const original_class_keybinds = this.get_original_class_keybinds();
        const current_subtask = this.ulabel.get_current_subtask();
        if (current_subtask && current_subtask.class_defs) {
            for (const class_def of current_subtask.class_defs) {
                if (class_def.id in original_class_keybinds) {
                    class_def.keybind = original_class_keybinds[class_def.id];
                }
            }
        }

        // Clear localStorage
        localStorage.removeItem("ulabel_custom_keybinds");
        localStorage.removeItem("ulabel_custom_class_keybinds");
    }

    /**
     * Generate the keybinds list HTML
     */
    private generate_keybinds_list_html(): string {
        const all_keybinds = this.get_all_keybinds();
        let keybinds_html = "";

        // Group keybinds by category
        const configurable = all_keybinds.filter((kb) => kb.configurable && kb.class_id === undefined);
        const class_keybinds = all_keybinds.filter((kb) => kb.class_id !== undefined);
        const other = all_keybinds.filter((kb) => !kb.configurable);

        // Check collapsed states from localStorage
        const configurable_collapsed = get_local_storage_item("ulabel_keybind_section_configurable_collapsed") === "true";
        const class_collapsed = get_local_storage_item("ulabel_keybind_section_class_collapsed") === "true";
        const other_collapsed = get_local_storage_item("ulabel_keybind_section_other_collapsed") === "true";

        // Configurable keybinds (non-class)
        if (configurable.length > 0) {
            const toggle_icon = configurable_collapsed ? "▶" : "▼";
            const section_class = configurable_collapsed ? " collapsed" : "";

            keybinds_html += `
                <div class="keybind-category" data-section="configurable">
                    <span>Configurable Keybinds</span>
                    <span class="keybind-category-toggle">${toggle_icon}</span>
                </div>
                <div class="keybind-section-items${section_class}" data-section="configurable">
            `;
            for (const keybind of configurable) {
                const has_collision = this.has_collision(keybind.key, all_keybinds);
                const is_customized = this.is_keybind_customized(keybind.config_key);
                const collision_class = has_collision ? " collision" : "";
                const customized_class = is_customized ? " customized" : "";
                const display_key = keybind.key !== null && keybind.key !== undefined ? keybind.key : "none";
                const reset_button = is_customized ? `<button class="keybind-reset-btn" data-config-key="${keybind.config_key}" title="Reset to default">↺</button>` : "";

                keybinds_html += `
                    <div class="keybind-item" title="${keybind.description}">
                        <span class="keybind-description">${keybind.label}</span>
                        <div class="keybind-controls">
                            ${reset_button}
                            <span class="keybind-key keybind-editable${collision_class}${customized_class}" data-config-key="${keybind.config_key}">${display_key}</span>
                        </div>
                    </div>
                `;
            }
            keybinds_html += "</div>";
        }

        // Class keybinds
        if (class_keybinds.length > 0) {
            const toggle_icon = class_collapsed ? "▶" : "▼";
            const section_class = class_collapsed ? " collapsed" : "";

            keybinds_html += `
                <div class="keybind-category" data-section="class">
                    <span>Class Keybinds</span>
                    <span class="keybind-category-toggle">${toggle_icon}</span>
                </div>
                <div class="keybind-section-items${section_class}" data-section="class">
            `;
            for (const keybind of class_keybinds) {
                const has_collision = this.has_collision(keybind.key, all_keybinds);
                const is_customized = this.is_class_keybind_customized(keybind.class_id);
                const collision_class = has_collision ? " collision" : "";
                const customized_class = is_customized ? " customized" : "";
                const display_key = keybind.key != null ? keybind.key : "none";
                const reset_button = is_customized ? `<button class="keybind-reset-btn" data-class-id="${keybind.class_id}" title="Reset to default">↺</button>` : "";

                keybinds_html += `
                    <div class="keybind-item" title="${keybind.description}">
                        <span class="keybind-description">${keybind.label}</span>
                        <div class="keybind-controls">
                            ${reset_button}
                            <span class="keybind-key keybind-editable${collision_class}${customized_class}" data-class-id="${keybind.class_id}">${display_key}</span>
                        </div>
                    </div>
                `;
            }
            keybinds_html += "</div>";
        }

        // Other keybinds
        if (other.length > 0) {
            const toggle_icon = other_collapsed ? "▶" : "▼";
            const section_class = other_collapsed ? " collapsed" : "";

            keybinds_html += `
                <div class="keybind-category" data-section="other">
                    <span>Other</span>
                    <span class="keybind-category-toggle">${toggle_icon}</span>
                </div>
                <div class="keybind-section-items${section_class}" data-section="other">
            `;
            for (const keybind of other) {
                const has_collision = this.has_collision(keybind.key, all_keybinds);
                const collision_class = has_collision ? " collision" : "";
                const display_key = keybind.key !== null && keybind.key !== undefined ? keybind.key : "none";
                keybinds_html += `
                    <div class="keybind-item" title="${keybind.description}">
                        <span class="keybind-description">${keybind.label}</span>
                        <span class="keybind-key${collision_class}">${display_key}</span>
                    </div>
                `;
            }
            keybinds_html += "</div>";
        }

        return keybinds_html;
    }

    /**
     * Generate HTML for the toolbox item
     */
    public get_html(): string {
        const keybinds_html = this.generate_keybinds_list_html();

        return `
            <div class="keybinds-toolbox-item">
                <div class="keybinds-header">
                    <span class="keybinds-title">Keybinds</span>
                    <button class="keybinds-toggle-btn">▼</button>
                </div>
                <div class="keybinds-content">
                    <div class="keybinds-reset-all">
                        <button class="keybinds-reset-all-btn">Reset All to Default</button>
                    </div>
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
        return "Keybinds";
    }

    /**
     * Called after ULabel initialization is complete
     */
    public after_init(): void {
        this.add_event_listeners();
        this.restore_collapsed_state();
    }

    /**
     * Restore the collapsed/expanded state from localStorage
     */
    private restore_collapsed_state(): void {
        const stored_state = get_local_storage_item("ulabel_keybinds_collapsed");
        if (stored_state === "false") {
            // If stored as expanded, expand it
            this.is_collapsed = false;
            $(".keybinds-content").addClass("expanded");
            $(".keybinds-toggle-btn").text("▲");
        }
        // Default is collapsed, so no need to do anything if stored_state is "true" or null

        // Restore category section states
        const sections = ["configurable", "class", "other"];
        for (const section of sections) {
            const section_state = get_local_storage_item(`ulabel_keybind_section_${section}_collapsed`);
            if (section_state === "true") {
                $(`.keybind-section-items[data-section="${section}"]`).addClass("collapsed");
                $(`.keybind-category[data-section="${section}"] .keybind-category-toggle`).text("▶");
            }
        }
    }

    /**
     * Build a keybind chord string from a keyboard event
     */
    private build_chord_string(keyEvent: JQuery.KeyDownEvent): string {
        const modifiers: string[] = [];
        const key = keyEvent.key;

        // Don't treat modifier keys themselves as part of the chord
        if (key === "Control" || key === "Shift" || key === "Alt" || key === "Meta") {
            return null;
        }

        // Build modifier list in a consistent order
        if (keyEvent.ctrlKey || keyEvent.metaKey) {
            modifiers.push("ctrl");
        }
        if (keyEvent.altKey) {
            modifiers.push("alt");
        }
        if (keyEvent.shiftKey) {
            modifiers.push("shift");
        }

        // Normalize the key name
        let normalized_key = key;
        if (key === " ") {
            normalized_key = "space";
        } else if (key.length === 1) {
            // Keep single character keys lowercase for consistency
            normalized_key = key.toLowerCase();
        }

        // If there are modifiers, build a chord string
        if (modifiers.length > 0) {
            return modifiers.join("+") + "+" + normalized_key;
        }

        return normalized_key;
    }

    /**
     * Check if a keyboard event matches a keybind (supports chords)
     */
    private event_matches_keybind(keyEvent: JQuery.KeyDownEvent | JQuery.KeyPressEvent, keybind: string): boolean {
        if (!keybind) {
            return false;
        }

        // Check if this is a chord (contains '+')
        if (keybind.includes("+")) {
            const parts = keybind.toLowerCase().split("+");
            const modifiers = new Set(parts.slice(0, -1));
            const key = parts[parts.length - 1];

            // Check modifiers
            const has_ctrl = (keyEvent.ctrlKey || keyEvent.metaKey) === modifiers.has("ctrl");
            const has_alt = keyEvent.altKey === modifiers.has("alt");
            const has_shift = keyEvent.shiftKey === modifiers.has("shift");

            // Normalize event key
            let event_key = keyEvent.key.toLowerCase();
            if (event_key === " ") {
                event_key = "space";
            }

            return has_ctrl && has_alt && has_shift && event_key === key;
        }

        // Simple key match (no modifiers)
        return keyEvent.key === keybind || keyEvent.key.toLowerCase() === keybind.toLowerCase();
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
                toggle_btn.text("▼");
                set_local_storage_item("ulabel_keybinds_collapsed", "true");
            } else {
                content.addClass("expanded");
                toggle_btn.text("▲");
                set_local_storage_item("ulabel_keybinds_collapsed", "false");
            }
        });

        // Toggle collapse/expand for category sections
        $(document).on("click.ulabel", ".keybind-category", (e) => {
            e.stopPropagation();
            const category = $(e.currentTarget);
            const section = category.data("section");
            const items = $(`.keybind-section-items[data-section="${section}"]`);
            const toggle = category.find(".keybind-category-toggle");

            if (items.hasClass("collapsed")) {
                items.removeClass("collapsed");
                toggle.text("▼");
                set_local_storage_item(`ulabel_keybind_section_${section}_collapsed`, "false");
            } else {
                items.addClass("collapsed");
                toggle.text("▶");
                set_local_storage_item(`ulabel_keybind_section_${section}_collapsed`, "true");
            }
        });

        // Reset individual keybind to default
        $(document).on("click.ulabel", ".keybind-reset-btn", (e) => {
            e.stopPropagation();
            const button = $(e.currentTarget);
            const config_key = button.data("config-key") as string;
            const class_id = button.data("class-id") as number;

            if (class_id !== undefined) {
                // Reset class keybind
                this.reset_class_keybind_to_default(class_id);
            } else if (config_key) {
                // Reset regular keybind
                this.reset_keybind_to_default(config_key);
            }

            // Refresh the display
            this.refresh_keybinds_display();
        });

        // Reset all keybinds to default
        $(document).on("click.ulabel", ".keybinds-reset-all-btn", (e) => {
            e.stopPropagation();

            // Confirm with user
            if (confirm("Reset all keybinds to their default values?")) {
                this.reset_all_keybinds_to_default();
                this.refresh_keybinds_display();
            }
        });

        // Edit functionality for configurable keybinds
        $(document).on("click.ulabel", ".keybind-key.keybind-editable", (e) => {
            e.stopPropagation();
            const target = $(e.currentTarget);
            const config_key = target.data("config-key") as string;
            const class_id = target.data("class-id") as number;
            const is_class_keybind = class_id !== undefined;

            // If already editing this key, do nothing
            if (target.hasClass("editing")) {
                return;
            }

            // Remove editing class from any other key
            $(".keybind-key.editing").removeClass("editing");

            // Add editing class to this key
            target.addClass("editing");
            const original_value = target.text();
            target.text("Press key...");

            // Set the editing flag to prevent other key handlers from firing
            this.ulabel.state.is_editing_keybind = true;

            // Create a one-time keydown handler to capture the new key
            const keyHandler = (keyEvent: JQuery.KeyDownEvent) => {
                keyEvent.preventDefault();
                keyEvent.stopPropagation();
                keyEvent.stopImmediatePropagation();

                // Handle Escape to cancel
                if (keyEvent.key === "Escape") {
                    target.removeClass("editing");
                    target.text(original_value);
                    $(document).off("keydown.keybind-edit");
                    this.ulabel.state.is_editing_keybind = false;
                    return;
                }

                // Build chord string (handles modifiers + key)
                const new_key = this.build_chord_string(keyEvent);

                // If null (user pressed only a modifier key), ignore
                if (new_key === null) {
                    return;
                }

                // Update the config or class definition
                if (is_class_keybind) {
                    // Update the class definition keybind
                    const current_subtask = this.ulabel.get_current_subtask();
                    const class_def = current_subtask.class_defs.find((cd) => cd.id === class_id);
                    if (class_def) {
                        class_def.keybind = new_key;

                        // Only save to localStorage if different from default
                        const original_class_keybinds = this.get_original_class_keybinds();
                        const default_value = original_class_keybinds[class_id];
                        if (new_key !== default_value) {
                            this.save_class_keybind_to_storage(class_id, new_key);
                        } else {
                            // If it matches the default, remove it from localStorage
                            const stored = get_local_storage_item("ulabel_custom_class_keybinds");
                            if (stored) {
                                try {
                                    const custom_class_keybinds = JSON.parse(stored);
                                    delete custom_class_keybinds[class_id];
                                    if (Object.keys(custom_class_keybinds).length > 0) {
                                        set_local_storage_item("ulabel_custom_class_keybinds", JSON.stringify(custom_class_keybinds));
                                    } else {
                                        localStorage.removeItem("ulabel_custom_class_keybinds");
                                    }
                                } catch (e) {
                                    log_message(`Failed to update custom class keybinds: ${e}`, LogLevel.ERROR, true);
                                }
                            }
                        }
                    }
                } else {
                    // Update the config
                    this.ulabel.config[config_key] = new_key;

                    // Only save to localStorage if different from default
                    const default_value = this.get_default_keybind(config_key);
                    if (new_key !== default_value) {
                        this.save_keybind_to_storage(config_key, new_key);
                    } else {
                        // If it matches the default, remove it from localStorage
                        const stored = get_local_storage_item("ulabel_custom_keybinds");
                        if (stored) {
                            try {
                                const custom_keybinds = JSON.parse(stored);
                                delete custom_keybinds[config_key];
                                if (Object.keys(custom_keybinds).length > 0) {
                                    set_local_storage_item("ulabel_custom_keybinds", JSON.stringify(custom_keybinds));
                                } else {
                                    localStorage.removeItem("ulabel_custom_keybinds");
                                }
                            } catch (e) {
                                log_message(`Failed to update custom keybinds: ${e}`, LogLevel.ERROR, true);
                            }
                        }
                    }
                }

                // Update the display
                target.removeClass("editing");
                target.text(new_key);

                // Refresh the entire keybinds list to update collision detection
                this.refresh_keybinds_display();

                // Remove the keydown handler and clear editing flag
                $(document).off("keydown.keybind-edit");
                this.ulabel.state.is_editing_keybind = false;
            };

            // Attach the keydown handler
            $(document).on("keydown.keybind-edit", keyHandler);
        });

        // Click outside to cancel editing
        $(document).on("click.ulabel", (e) => {
            if (!$(e.target).hasClass("keybind-key")) {
                const editing_key = $(".keybind-key.editing");
                if (editing_key.length > 0) {
                    const config_key = editing_key.data("config-key") as string;
                    const class_id = editing_key.data("class-id") as number;
                    editing_key.removeClass("editing");

                    // Restore the original value
                    if (class_id !== undefined) {
                        const current_subtask = this.ulabel.get_current_subtask();
                        const class_def = current_subtask.class_defs.find((cd) => cd.id === class_id);
                        if (class_def) {
                            editing_key.text(class_def.keybind);
                        }
                    } else {
                        editing_key.text(this.ulabel.config[config_key]);
                    }

                    $(document).off("keydown.keybind-edit");
                    this.ulabel.state.is_editing_keybind = false;
                }
            }
        });
    }

    /**
     * Refresh the keybinds display to show updated keys and collision detection
     */
    public refresh_keybinds_display(): void {
        const keybinds_list = $(".keybinds-list");
        if (keybinds_list.length === 0) {
            return;
        }

        const keybinds_html = this.generate_keybinds_list_html();
        keybinds_list.html(keybinds_html);
    }
}
