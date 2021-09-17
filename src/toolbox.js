"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WholeImageClassifierToolboxTab = exports.ClassCounterToolboxTab = exports.AnnotationIDToolboxTab = exports.ToolboxTab = void 0;
var toolboxDividerDiv = "<div class=toolbox-divider></div>";
var ToolboxTab = /** @class */ (function () {
    function ToolboxTab(div_HTML_class, header_title, inner_HTML) {
        this.div_HTML_class = div_HTML_class;
        this.header_title = header_title;
        this.inner_HTML = inner_HTML;
    }
    return ToolboxTab;
}());
exports.ToolboxTab = ToolboxTab;
var AnnotationIDToolboxTab = /** @class */ (function (_super) {
    __extends(AnnotationIDToolboxTab, _super);
    function AnnotationIDToolboxTab(subtask) {
        return _super.call(this, "toolbox-annotation-id", "Annotation ID", "<div class=\"id-toolbox-app\"></div>") || this;
    }
    return AnnotationIDToolboxTab;
}(ToolboxTab));
exports.AnnotationIDToolboxTab = AnnotationIDToolboxTab;
var ClassCounterToolboxTab = /** @class */ (function (_super) {
    __extends(ClassCounterToolboxTab, _super);
    function ClassCounterToolboxTab() {
        var _this = _super.call(this, "toolbox-class-counter", "Annotation Count", "") || this;
        _this.inner_HTML = "<p class=\"tb-header\">" + _this.header_title + "</p>";
        return _this;
    }
    ClassCounterToolboxTab.prototype.update_toolbox_counter = function (subtask, toolbox_id) {
        if (subtask == null) {
            return;
        }
        var class_ids = subtask.class_ids;
        var i, j;
        var class_counts = {};
        for (i = 0; i < class_ids.length; i++) {
            class_counts[class_ids[i]] = 0;
        }
        var annotations = subtask.annotations.access;
        var annotation_ids = subtask.annotations.ordering;
        var current_annotation, current_payload;
        for (i = 0; i < annotation_ids.length; i++) {
            current_annotation = annotations[annotation_ids[i]];
            if (current_annotation.deprecated == false) {
                for (j = 0; j < current_annotation.classification_payloads.length; j++) {
                    current_payload = current_annotation.classification_payloads[j];
                    if (current_payload.confidence > 0.0) {
                        class_counts[current_payload.class_id] += 1;
                        break;
                    }
                }
            }
        }
        var f_string = "";
        var class_name, class_count;
        for (i = 0; i < class_ids.length; i++) {
            class_name = subtask.class_defs[i].name;
            // MF-Tassels Hack
            if (class_name.includes("OVERWRITE")) {
                continue;
            }
            class_count = class_counts[subtask.class_defs[i].id];
            f_string += class_name + ": " + class_count + "<br>";
        }
        this.inner_HTML = "<p class=\"tb-header\">" + this.header_title + "</p>" + ("<p>" + f_string + "</p>");
    };
    return ClassCounterToolboxTab;
}(ToolboxTab));
exports.ClassCounterToolboxTab = ClassCounterToolboxTab;
var WholeImageClassifierToolboxTab = /** @class */ (function (_super) {
    __extends(WholeImageClassifierToolboxTab, _super);
    function WholeImageClassifierToolboxTab() {
        return _super.call(this, "toolbox-whole-image-classifier", "Whole Image Classification", "") || this;
    }
    return WholeImageClassifierToolboxTab;
}(ToolboxTab));
exports.WholeImageClassifierToolboxTab = WholeImageClassifierToolboxTab;
