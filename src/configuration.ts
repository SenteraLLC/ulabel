import { ModeSelectionToolboxItem, ZoomPanToolboxItem, AnnotationIDToolboxItem, ClassCounterToolboxItem, AnnotationResizeItem, RecolorActiveItem, KeypointSliderItem, SubmitButtons, FilterPointDistanceFromRow } from "./toolbox"
import { get_annotation_confidence, mark_deprecated, filter_low } from "./annotation_operators";

enum AllowedToolboxItem {
    ModeSelect,         // 0
    ZoomPan,            // 1
    AnnotationResize,   // 2
    AnnotationID,       // 3
    RecolorActive,      // 4
    ClassCounter,       // 5
    KeypointSlider,     // 6
    SubmitButtons,      // 7
    FilterDistance      // 8
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
        [AllowedToolboxItem.FilterDistance, FilterPointDistanceFromRow]
    ]);
    
    //Change the order of the toolbox items here to change the order they show up in the toolbox
    public default_toolbox_item_order: unknown[] = [
        AllowedToolboxItem.ModeSelect,
        AllowedToolboxItem.ZoomPan,
        AllowedToolboxItem.AnnotationResize,
        AllowedToolboxItem.AnnotationID,
        AllowedToolboxItem.RecolorActive,
        AllowedToolboxItem.ClassCounter,
        [AllowedToolboxItem.KeypointSlider, {
            "name": "Filter Low Confidence",
            "filter_function": filter_low, 
            "confidence_function": get_annotation_confidence, 
            "mark_deprecated": mark_deprecated,
            "default_value": 0.05,
            "keybinds": {
                "increment": "2",
                "decrement": "1"
            }
        }],
        AllowedToolboxItem.SubmitButtons,
    ]

    public default_keybinds = {
        "annotation_size_small": "s", //The s Key by default
        "annotation_size_large": "l", //The l Key by default
        "annotation_size_plus": "=",   //The = Key by default
        "annotation_size_minus": "-",  //The - Key by default
        "annotation_vanish": "v"      //The v Key by default
    }

    public change_zoom_keybind: string = "r";

    public create_point_annotation_keybind: string = "c";
    
    public default_annotation_size: number = 6;
    
    public delete_annotation_keybind: string = "d";
    
    public filter_low_confidence_default_value: number;
    
    public filter_annotations_on_load: boolean = false;
    
    public switch_subtask_keybind: string = "z";
    
    public toggle_annotation_mode_keybind: string = "u";

    public static annotation_gradient_default: boolean = false;

    constructor(...kwargs: {[key: string]: unknown}[]) {
        this.modify_config(...kwargs)
    }

    public modify_config(...kwargs: {[key: string]: unknown}[]) {

        //we don't know how many arguments we'll recieve, so loop through all of the elements in kwargs
        for (let i = 0; i < kwargs.length; i++) {

            //for every key: value pair, overwrite them/add them to the config
            for (let key in kwargs[i]) {
                this[key] = kwargs[i][key]
            }
        }
    }
}
