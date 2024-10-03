import {
    FilterDistanceConfig,
    InitialCrop,
    ImageData,
    RecolorActiveConfig,
    ULabelSubmitButton,
} from "..";
import {
    ModeSelectionToolboxItem,
    ZoomPanToolboxItem,
    AnnotationIDToolboxItem,
    ClassCounterToolboxItem,
    AnnotationResizeItem,
    RecolorActiveItem,
    KeypointSliderItem,
    SubmitButtons,
    FilterPointDistanceFromRow,
    BrushToolboxItem,
} from "./toolbox";
import { is_object_and_not_array } from "./utilities";

export enum AllowedToolboxItem {
    ModeSelect, // 0
    ZoomPan, // 1
    AnnotationResize, // 2
    AnnotationID, // 3
    RecolorActive, // 4
    ClassCounter, // 5
    KeypointSlider, // 6
    SubmitButtons, // 7
    FilterDistance, // 8
    Brush, // 9
}

export const DEFAULT_N_ANNOS_PER_CANVAS: number = 100;
export const TARGET_MAX_N_CANVASES_PER_SUBTASK: number = 8;
export const DEFAULT_FILTER_DISTANCE_CONFIG: FilterDistanceConfig = {
    name: "Filter Distance From Row",
    component_name: "filter-distance-from-row",
    filter_min: 0,
    filter_max: 400,
    default_values: { closest_row: { distance: 40 } },
    step_value: 2,
    multi_class_mode: false,
    disable_multi_class_mode: false,
    filter_on_load: true,
    show_options: true,
    show_overlay: false,
    toggle_overlay_keybind: "p",
    filter_during_polyline_move: true,
};

export class Configuration {
    // Values useful for generating HTML for tool
    public container_id: string = "container";
    public px_per_px: number = 1;
    public initial_crop: InitialCrop = null;
    public annbox_id: string = "annbox";
    public imwrap_id: string = "imwrap";
    public canvas_fid_pfx: string = "front-canvas";
    public canvas_bid_pfx: string = "back-canvas";
    public canvas_did: string = "demo-canvas";
    public canvas_class: string = "easel";
    public image_id_pfx: string = "ann_image";
    public imgsz_class: string = "imgsz";
    public toolbox_id: string = "toolbox";

    // Dimensions of various components of the tool
    public image_width: number = null;
    public image_height: number = null;
    public demo_width: number = 120;
    public demo_height: number = 40;
    public polygon_ender_size: number = 15;
    public edit_handle_size: number = 30;
    public brush_size: number = 60;

    // Configuration for the annotation task itself
    public image_data: ImageData = null;
    public allow_soft_id: boolean = false;
    public default_annotation_color: string = "#fa9d2a";
    public username: string = "ULabelUser";
    public initial_line_size: number = null;

    // ID Dialog config
    public cl_opacity: number = 0.4;
    public outer_diameter: number = 200;
    public inner_prop: number = 0.3;

    // Behavior on special interactions
    public instructions_url: string = null;
    public submit_buttons: ULabelSubmitButton[] = [];

    // Passthrough
    public task_meta: object = null;
    public annotation_meta: object = null;

    public subtasks: object = null;

    public toolbox_map = new Map<AllowedToolboxItem, any>([
        [AllowedToolboxItem.ModeSelect, ModeSelectionToolboxItem],
        [AllowedToolboxItem.ZoomPan, ZoomPanToolboxItem],
        [AllowedToolboxItem.AnnotationResize, AnnotationResizeItem],
        [AllowedToolboxItem.AnnotationID, AnnotationIDToolboxItem],
        [AllowedToolboxItem.RecolorActive, RecolorActiveItem],
        [AllowedToolboxItem.ClassCounter, ClassCounterToolboxItem],
        [AllowedToolboxItem.KeypointSlider, KeypointSliderItem],
        [AllowedToolboxItem.SubmitButtons, SubmitButtons],
        [AllowedToolboxItem.FilterDistance, FilterPointDistanceFromRow],
        [AllowedToolboxItem.Brush, BrushToolboxItem],
    ]);

    // Default toolbox order used when the user doesn't specify one
    public toolbox_order: AllowedToolboxItem[] = [
        AllowedToolboxItem.ModeSelect,
        AllowedToolboxItem.Brush,
        AllowedToolboxItem.ZoomPan,
        AllowedToolboxItem.AnnotationResize,
        AllowedToolboxItem.AnnotationID,
        AllowedToolboxItem.RecolorActive,
        AllowedToolboxItem.ClassCounter,
        AllowedToolboxItem.KeypointSlider,
        AllowedToolboxItem.SubmitButtons,
    ];

    public default_keybinds = {
        annotation_size_small: "s", // The s Key by default
        annotation_size_large: "l", // The l Key by default
        annotation_size_plus: "=", // The = Key by default
        annotation_size_minus: "-", // The - Key by default
        annotation_vanish: "v", // The v Key by default
    };

    // Config for RecolorActiveItem
    public recolor_active_toolbox_item: RecolorActiveConfig = {
        gradient_turned_on: false,
    };

    // Config for FilterDistanceToolboxItem
    public distance_filter_toolbox_item: FilterDistanceConfig = DEFAULT_FILTER_DISTANCE_CONFIG;

    public change_zoom_keybind: string = "r";

    public create_point_annotation_keybind: string = "c";

    public default_annotation_size: number = 6;

    public delete_annotation_keybind: string = "d";

    public keypoint_slider_default_value: number;

    public filter_annotations_on_load: boolean = true;

    public switch_subtask_keybind: string = "z";

    public toggle_annotation_mode_keybind: string = "u";

    public create_bbox_on_initial_crop: string = "f";

    public toggle_brush_mode_keybind: string = "g";

    public toggle_erase_mode_keybind: string = "e";

    public increase_brush_size_keybind: string = "]";

    public decrease_brush_size_keybind: string = "[";

    public n_annos_per_canvas: number = DEFAULT_N_ANNOS_PER_CANVAS;

    constructor(...kwargs: { [key: string]: unknown }[]) {
        this.modify_config(...kwargs);
    }

    public modify_config(...kwargs: { [key: string]: any }[]) {
        // Loop through every elements in kwargs
        for (let idx = 0; idx < kwargs.length; idx++) {
            // For every key: value pair, overwrite them/add them to the config
            for (const key in kwargs[idx]) {
                // If the value itself is an object, then loop through it and modify only the defined values
                if (
                    is_object_and_not_array(kwargs[idx][key]) &&
                    is_object_and_not_array(this[key])
                ) {
                    const inner_object = kwargs[idx][key];
                    for (const inner_key in inner_object) {
                        this[key][inner_key] = inner_object[inner_key];
                    }
                } else {
                    this[key] = kwargs[idx][key];
                }
            }
        }
    }
}
