import { ModeSelectionToolboxItem, ZoomPanToolboxItem, AnnotationIDToolboxItem, ClassCounterToolboxItem, AnnotationResizeItem, RecolorActiveItem, KeypointSliderItem } from "./toolbox"
import { get_annotation_confidence, mark_deprecated, filter_low } from "./annotation_operators";

enum AllowedToolboxItem {
    ModeSelect,
    ZoomPan,
    AnnotationResize,
    AnnotationID,
    RecolorActive,
    ClassCounter,
    KeypointSlider
}

export class Configuration {
    public toolbox_map = new Map<AllowedToolboxItem, any> ([
        [AllowedToolboxItem.ModeSelect, ModeSelectionToolboxItem],
        [AllowedToolboxItem.ZoomPan, ZoomPanToolboxItem],
        [AllowedToolboxItem.AnnotationResize, AnnotationResizeItem],
        [AllowedToolboxItem.AnnotationID, AnnotationIDToolboxItem],
        [AllowedToolboxItem.RecolorActive, RecolorActiveItem],
        [AllowedToolboxItem.ClassCounter, ClassCounterToolboxItem],
        [AllowedToolboxItem.KeypointSlider, KeypointSliderItem]
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
            "default_value": 0.05
        }]
    ]

    public default_keybinds = {
        "annotation_size_small": "s", //The s Key by default
        "annotation_size_large": "l", //The l Key by default
        "annotation_size_plus": "=",   //The = Key by default
        "annotation_size_minus": "-",  //The - Key by default
        "annotation_vanish": "v"      //The v Key by default
    }

    public default_annotation_size: number = 6;

    public filter_low_confidence_default_value: number;

    public filter_annotations_on_load: boolean = false;

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
