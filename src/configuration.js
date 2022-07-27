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
    AllowedToolboxItem[AllowedToolboxItem["SubmitButtons"] = 7] = "SubmitButtons";
})(AllowedToolboxItem || (AllowedToolboxItem = {}));
var Configuration = /** @class */ (function () {
    function Configuration() {
        var kwargs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            kwargs[_i] = arguments[_i];
        }
        this.toolbox_map = new Map([
            [AllowedToolboxItem.ModeSelect, toolbox_1.ModeSelectionToolboxItem],
            [AllowedToolboxItem.ZoomPan, toolbox_1.ZoomPanToolboxItem],
            [AllowedToolboxItem.AnnotationResize, toolbox_1.AnnotationResizeItem],
            [AllowedToolboxItem.AnnotationID, toolbox_1.AnnotationIDToolboxItem],
            [AllowedToolboxItem.RecolorActive, toolbox_1.RecolorActiveItem],
            [AllowedToolboxItem.ClassCounter, toolbox_1.ClassCounterToolboxItem],
            [AllowedToolboxItem.KeypointSlider, toolbox_1.KeypointSliderItem],
            [AllowedToolboxItem.SubmitButtons, toolbox_1.SubmitButtons]
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
                    "name": "Filter Low Confidence",
                    "filter_function": annotation_operators_1.filter_low,
                    "confidence_function": annotation_operators_1.get_annotation_confidence,
                    "mark_deprecated": annotation_operators_1.mark_deprecated,
                    "default_value": 0.05,
                    "keybinds": {
                        "increment": "2",
                        "decrement": "1"
                    }
                }],
            AllowedToolboxItem.SubmitButtons,
        ];
        this.default_keybinds = {
            "annotation_size_small": "s",
            "annotation_size_large": "l",
            "annotation_size_plus": "=",
            "annotation_size_minus": "-",
            "annotation_vanish": "v" //The v Key by default
        };
        this.change_zoom_keybind = "r";
        this.create_point_annotation_keybind = "c";
        this.default_annotation_size = 6;
        this.delete_annotation_keybind = "d";
        this.filter_annotations_on_load = false;
        this.switch_subtask_keybind = "z";
        this.toggle_annotation_mode_keybind = "u";
        this.modify_config.apply(this, kwargs);
    }
    Configuration.prototype.modify_config = function () {
        var kwargs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            kwargs[_i] = arguments[_i];
        }
        //we don't know how many arguments we'll recieve, so loop through all of the elements in kwargs
        for (var i = 0; i < kwargs.length; i++) {
            //for every key: value pair, overwrite them/add them to the config
            for (var key in kwargs[i]) {
                this[key] = kwargs[i][key];
            }
        }
    };
    Configuration.annotation_gradient_default = false;
    return Configuration;
}());
exports.Configuration = Configuration;
