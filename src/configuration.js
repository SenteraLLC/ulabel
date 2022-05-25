"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Configuration = void 0;
var Configuration = /** @class */ (function () {
    function Configuration(toolbox_item_order) {
        if (toolbox_item_order === void 0) { toolbox_item_order = [
            "mode select",
            "zoom pan",
            "annotation resize",
            "annotation id",
            "recolor active",
            "class counter",
            "keypoint slider",
            "linestyle"
        ]; }
        this.toolbox_item_order = toolbox_item_order;
    }
    Configuration.prototype.update_toolbox_item_order = function () {
        console.log();
    };
    return Configuration;
}());
exports.Configuration = Configuration;
