"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Configuration = void 0;
var toolbox_1 = require("./toolbox");
var annotation_operators_1 = require("./annotation_operators");
var AllowedToolboxItem;
(function (AllowedToolboxItem) {
    AllowedToolboxItem[AllowedToolboxItem["ModeSelect"] = 0] = "ModeSelect";
    AllowedToolboxItem[AllowedToolboxItem["ZoomPan"] = 1] = "ZoomPan";
    AllowedToolboxItem[AllowedToolboxItem["AnnotationResize"] = 2] = "AnnotationResize";
    AllowedToolboxItem[AllowedToolboxItem["AnnotationID"] = 3] = "AnnotationID";
    AllowedToolboxItem[AllowedToolboxItem["RecolorActive"] = 4] = "RecolorActive";
    AllowedToolboxItem[AllowedToolboxItem["ClassCounter"] = 5] = "ClassCounter";
    AllowedToolboxItem[AllowedToolboxItem["KeypointSlider"] = 6] = "KeypointSlider";
})(AllowedToolboxItem || (AllowedToolboxItem = {}));
var Configuration = /** @class */ (function () {
    function Configuration() {
        this.toolbox_map = new Map([
            [AllowedToolboxItem.ModeSelect, toolbox_1.ModeSelectionToolboxItem],
            [AllowedToolboxItem.ZoomPan, toolbox_1.ZoomPanToolboxItem],
            [AllowedToolboxItem.AnnotationResize, toolbox_1.AnnotationResizeItem],
            [AllowedToolboxItem.AnnotationID, toolbox_1.AnnotationIDToolboxItem],
            [AllowedToolboxItem.RecolorActive, toolbox_1.RecolorActiveItem],
            [AllowedToolboxItem.ClassCounter, toolbox_1.ClassCounterToolboxItem],
            [AllowedToolboxItem.KeypointSlider, toolbox_1.KeypointSliderItem]
        ]);
        //Change the order of the toolbox items here to change the order they show up in the toolbox
        this.default_toolbox_item_order = [
            AllowedToolboxItem.ModeSelect,
            AllowedToolboxItem.ZoomPan,
            AllowedToolboxItem.AnnotationResize,
            AllowedToolboxItem.AnnotationID,
            AllowedToolboxItem.RecolorActive,
            AllowedToolboxItem.ClassCounter,
            [AllowedToolboxItem.KeypointSlider, {
                    "name": "Fliter Low Confidence",
                    "filter_function": annotation_operators_1.filter_low,
                    "confidence_function": annotation_operators_1.get_annotation_confidence,
                    "mark_deprecated": annotation_operators_1.mark_deprecated,
                    "default_value": 0.05
                }]
        ];
    }
    Configuration.prototype.create_toolbox = function (ulabel, toolbox_item_order) {
        if (toolbox_item_order === void 0) { toolbox_item_order = this.default_toolbox_item_order; }
        //There's no point to having an empty toolbox, so throw an error if the toolbox is empty.
        //The toolbox won't actually break if there aren't any items in the toolbox, so if for
        //whatever reason we want that in the future, then feel free to remove this error.
        if (toolbox_item_order.length == 0) {
            throw new Error("No Toolbox Items Given");
        }
        var toolbox_instance_list = [];
        //Go through the items in toolbox_item_order and add their instance to the toolbox instance list
        for (var i = 0; i < toolbox_item_order.length; i++) {
            var args = void 0, toolbox_key = void 0;
            //If the value of toolbox_item_order[i] is a number then that means the it is one of the 
            //enumerated toolbox items, so set it to the key, otherwise the element must be an array
            //of which the first element of that array must be the enumerated value, and the arguments
            //must be the second value
            if (typeof (toolbox_item_order[i]) == "number") {
                toolbox_key = toolbox_item_order[i];
            }
            else {
                toolbox_key = toolbox_item_order[i][0];
                args = toolbox_item_order[i][1];
            }
            var toolbox_item_class = this.toolbox_map.get(toolbox_key);
            if (args == null) {
                toolbox_instance_list.push(new toolbox_item_class(ulabel));
            }
            else {
                toolbox_instance_list.push(new toolbox_item_class(ulabel, args));
            }
        }
        return toolbox_instance_list;
    };
    Configuration.default_keybinds = {
        "annotation_size_small": "s",
        "annotation_size_large": "l",
        "annotation_size_plus": "=",
        "annotation_size_minus": "-",
        "annotation_vanish": "v" //The v Key by default
    };
    Configuration.annotation_gradient_default = true;
    return Configuration;
}());
exports.Configuration = Configuration;
