"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Configuration = void 0;
var Configuration = /** @class */ (function () {
    function Configuration(default_toolbox_item_order, defalut_keybinds) {
        if (default_toolbox_item_order === void 0) { default_toolbox_item_order = [
            "mode select",
            "zoom pan",
            "annotation resize",
            "annotation id",
            "recolor active",
            "class counter",
            "keypoint slider",
        ]; }
        if (defalut_keybinds === void 0) { defalut_keybinds = {
            "annotation_size_small": 115,
            "annotation_size_large": 108,
            "annotation_size_plus": 61,
            "annotation_size_minus": 45,
            "annotation_vanish": 118 //The v Key by default
        }; }
        this.default_toolbox_item_order = default_toolbox_item_order;
        this.defalut_keybinds = defalut_keybinds;
    }
    Configuration.prototype.update_toolbox_item_order = function () {
        console.log();
    };
    return Configuration;
}());
exports.Configuration = Configuration;
