import { ULabel } from "..";
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
    public default_toolbox_item_order: any[] = [
        AllowedToolboxItem.ModeSelect,
        AllowedToolboxItem.ZoomPan,
        AllowedToolboxItem.AnnotationResize,
        AllowedToolboxItem.AnnotationID,
        AllowedToolboxItem.RecolorActive,
        AllowedToolboxItem.ClassCounter,
        [AllowedToolboxItem.KeypointSlider, [filter_low, get_annotation_confidence, mark_deprecated]]
    ]

    public static default_keybinds: {[key: string]: string} = {
        "annotation_size_small": "s", //The s Key by default
        "annotation_size_large": "l", //The l Key by default
        "annotation_size_plus": "=",   //The = Key by default
        "annotation_size_minus": "-",  //The - Key by default
        "annotation_vanish": "v"      //The v Key by default
    }

    constructor() {}

    public create_toolbox(ulabel: ULabel, toolbox_item_order = this.default_toolbox_item_order) {

        //There's no point to having an empty toolbox, so throw an error if the toolbox is empty.
        //The toolbox won't actually break if there aren't any items in the toolbox, so if for
        //whatever reason we want that in the future, then feel free to remove this error.
        if (toolbox_item_order.length == 0) {
            throw new Error("No Toolbox Items Given")
        }

        let toolbox_instance_list = [];
        //Go through the items in toolbox_item_order and add their instance to the toolbox instance list
        for (let i = 0; i < toolbox_item_order.length; i++) {

            let args, toolbox_key;

            //If the value of toolbox_item_order[i] is a number then that means the it is one of the 
            //enumerated toolbox items, so set it to the key, otherwise the element must be an array
            //of which the first element of that array must be the enumerated value, and the arguments
            //must be the second value
            if (typeof(toolbox_item_order[i]) == "number") {
                toolbox_key = toolbox_item_order[i]
            } else {

                toolbox_key = toolbox_item_order[i][0];
                args = toolbox_item_order[i][1]  
            }

            let toolbox_item_class = this.toolbox_map.get(toolbox_key);

            if (args == null) {
                toolbox_instance_list.push(new toolbox_item_class(ulabel))
            } else {
                toolbox_instance_list.push(new toolbox_item_class(ulabel, args))
            }           
        }

        return toolbox_instance_list
    }
}