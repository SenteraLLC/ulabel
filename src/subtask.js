"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ULabelSubtask = void 0;
var ULabelSubtask = /** @class */ (function () {
    function ULabelSubtask(display_name, classes, allowed_modes, resume_from, task_meta, annotation_meta, read_only, inactivate_opacity) {
        if (inactivate_opacity === void 0) { inactivate_opacity = 0.4; }
        this.display_name = display_name;
        this.classes = classes;
        this.allowed_modes = allowed_modes;
        this.resume_from = resume_from;
        this.task_meta = task_meta;
        this.annotation_meta = annotation_meta;
        this.read_only = read_only;
        this.inactivate_opacity = inactivate_opacity;
        this.actions = {
            "stream": [],
            "undone_stack": []
        };
    }
    ULabelSubtask.from_json = function (subtask_key, subtask_json) {
        var ret = new ULabelSubtask(subtask_key, subtask_json["classes"], subtask_json["allowed_modes"], subtask_json["resume_from"], subtask_json["task_meta"], subtask_json["annotation_meta"]);
        ret.read_only = ("read_only" in subtask_json) && (subtask_json["read_only"] === true);
        if ("inactive_opacity" in subtask_json && typeof subtask_json["inactive_opacity"] == "number") {
            ret.inactivate_opacity = Math.min(Math.max(subtask_json["inactive_opacity"], 0.0), 1.0);
        }
        return ret;
    };
    return ULabelSubtask;
}());
exports.ULabelSubtask = ULabelSubtask;
//export type ULabelSubtasks = { [key: string]: ULabelSubtask };
