import { FilterDistanceConfig, RecolorActiveConfig } from "..";
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
    BrushToolboxItem
} from "./toolbox"
import { is_object_and_not_array } from "./utilities";

export enum AllowedToolboxItem {
    ModeSelect,       // 0
    ZoomPan,          // 1
    AnnotationResize, // 2
    AnnotationID,     // 3
    RecolorActive,    // 4
    ClassCounter,     // 5
    KeypointSlider,   // 6
    SubmitButtons,    // 7
    FilterDistance,   // 8
    Brush,            // 9
}

export class Configuration {
    public toolbox_map = new Map<AllowedToolboxItem, any> ([
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
    public default_toolbox_item_order: AllowedToolboxItem[] = [
        AllowedToolboxItem.ModeSelect,
        AllowedToolboxItem.Brush,
        AllowedToolboxItem.ZoomPan,
        AllowedToolboxItem.AnnotationResize,
        AllowedToolboxItem.AnnotationID,
        AllowedToolboxItem.RecolorActive,
        AllowedToolboxItem.ClassCounter,
        AllowedToolboxItem.KeypointSlider,
        AllowedToolboxItem.SubmitButtons,
    ]

    public default_keybinds = {
        "annotation_size_small": "s", //The s Key by default
        "annotation_size_large": "l", //The l Key by default
        "annotation_size_plus": "=",   //The = Key by default
        "annotation_size_minus": "-",  //The - Key by default
        "annotation_vanish": "v"      //The v Key by default
    }

    // Config for RecolorActiveItem
    public recolor_active_toolbox_item: RecolorActiveConfig = {
        gradient_turned_on: false
    }

    // Config for FilterDistanceToolboxItem
    public distance_filter_toolbox_item: FilterDistanceConfig = {
        "name": "Filter Distance From Row",
        "component_name": "filter-distance-from-row",
        "filter_min": 0,
        "filter_max": 400,
        "default_values": {"single": 40},
        "step_value": 2,
        "multi_class_mode": false,
        "filter_on_load": true,
        "show_options": true,
        "toggle_overlay_keybind": "p",
        "show_overlay_on_load": false
    }

    public change_zoom_keybind: string = "r";

    public create_point_annotation_keybind: string = "c";
    
    public default_annotation_size: number = 6;
    
    public delete_annotation_keybind: string = "d";
    
    public keypoint_slider_default_value: number;

    public filter_annotations_on_load: boolean = false;
    
    public switch_subtask_keybind: string = "z";
    
    public toggle_annotation_mode_keybind: string = "u";

    public create_bbox_on_initial_crop: string = "f";

    public toggle_brush_mode_keybind: string = "g"

    public toggle_erase_mode_keybind: string = "e"

    public increase_brush_size_keybind: string = "]"

    public decrease_brush_size_keybind: string = "["

    constructor(...kwargs: {[key: string]: unknown}[]) {
        this.modify_config(...kwargs)
    }

    public modify_config(...kwargs: {[key: string]: any}[]) {
        // Loop through every elements in kwargs
        for (let idx = 0; idx < kwargs.length; idx++) {
            // For every key: value pair, overwrite them/add them to the config
            for (let key in kwargs[idx]) {
                // If the value itself is an object, then loop through it and modify only the defined values
                if (
                    is_object_and_not_array(kwargs[idx][key]) &&
                    is_object_and_not_array(this[key])
                ) {
                    const inner_object = kwargs[idx][key]
                    for (const inner_key in inner_object) {
                        this[key][inner_key] = inner_object[inner_key]
                    }
                } else {
                    this[key] = kwargs[idx][key]
                }
            }
        }
    }
}
