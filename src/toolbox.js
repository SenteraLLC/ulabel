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
exports.AnnotationResizeItem = exports.ClassCounterToolboxItem = exports.AnnotationIDToolboxItem = exports.LinestyleToolboxItem = exports.ZoomPanToolboxItem = exports.ModeSelectionToolboxItem = exports.ToolboxItem = exports.ToolboxTab = exports.Toolbox = void 0;
var toolboxDividerDiv = "<div class=toolbox-divider></div>";
/**
 * Manager for toolbox. Contains ToolboxTab items.
 */
var Toolbox = /** @class */ (function () {
    // public tabs: ToolboxTab[] = [];
    // public items: ToolboxItem[] = []; 
    function Toolbox(tabs, items) {
        if (tabs === void 0) { tabs = []; }
        if (items === void 0) { items = []; }
        this.tabs = tabs;
        this.items = items;
    }
    Toolbox.prototype.setup_toolbox_html = function (ulabel, frame_annotation_dialogs, images, ULABEL_VERSION) {
        // Setup base div and ULabel version header
        var toolbox_html = "\n        <div class=\"full_ulabel_container_\">\n            ".concat(frame_annotation_dialogs, "\n            <div id=\"").concat(ulabel.config["annbox_id"], "\" class=\"annbox_cls\">\n                <div id=\"").concat(ulabel.config["imwrap_id"], "\" class=\"imwrap_cls ").concat(ulabel.config["imgsz_class"], "\">\n                    ").concat(images, "\n                </div>\n            </div>\n            <div id=\"").concat(ulabel.config["toolbox_id"], "\" class=\"toolbox_cls\">\n                <div class=\"toolbox-name-header\">\n                    <h1 class=\"toolname\"><a class=\"repo-anchor\" href=\"https://github.com/SenteraLLC/ulabel\">ULabel</a> <span class=\"version-number\">v").concat(ULABEL_VERSION, "</span></h1><!--\n                    --><div class=\"night-button-cont\">\n                        <a href=\"#\" class=\"night-button\">\n                            <div class=\"night-button-track\">\n                                <div class=\"night-status\"></div>\n                            </div>\n                        </a>\n                    </div>\n                </div>\n                <div class=\"toolbox_inner_cls\">\n        ");
        for (var tbitem in this.items) {
            toolbox_html += this.items[tbitem].get_html() + toolboxDividerDiv;
        }
        toolbox_html += "\n                </div>\n                <div class=\"toolbox-tabs\">\n                    ".concat(this.get_toolbox_tabs(ulabel), "\n                </div> \n            </div>\n        </div>");
        return toolbox_html;
    };
    /**
     * Adds tabs for each ULabel subtask to the toolbox.
     */
    Toolbox.prototype.get_toolbox_tabs = function (ulabel) {
        var ret = "";
        for (var st_key in ulabel.subtasks) {
            var selected = st_key == ulabel.state["current_subtask"];
            var subtask = ulabel.subtasks[st_key];
            var current_tab = new ToolboxTab([], subtask, st_key, selected);
            ret += current_tab.html;
            this.tabs.push(current_tab);
        }
        return ret;
    };
    Toolbox.prototype.redraw_update_items = function (ulabel) {
        for (var _i = 0, _a = this.items; _i < _a.length; _i++) {
            var tbitem = _a[_i];
            tbitem.redraw_update(ulabel);
        }
    };
    return Toolbox;
}());
exports.Toolbox = Toolbox;
var ToolboxTab = /** @class */ (function () {
    function ToolboxTab(toolboxitems, subtask, subtask_key, selected) {
        if (toolboxitems === void 0) { toolboxitems = []; }
        if (selected === void 0) { selected = false; }
        this.toolboxitems = toolboxitems;
        this.subtask = subtask;
        this.subtask_key = subtask_key;
        this.selected = selected;
        var sel = "";
        var href = " href=\"#\"";
        var val = 50;
        if (this.selected) {
            if (this.subtask.read_only) {
                href = "";
            }
            sel = " sel";
            val = 100;
        }
        console.log(subtask.display_name);
        console.log(subtask);
        this.html = "\n        <div class=\"tb-st-tab".concat(sel, "\">\n            <a").concat(href, " id=\"tb-st-switch--").concat(subtask_key, "\" class=\"tb-st-switch\">").concat(this.subtask.display_name, "</a><!--\n            --><span class=\"tb-st-range\">\n                <input id=\"tb-st-range--").concat(subtask_key, "\" type=\"range\" min=0 max=100 value=").concat(val, " />\n            </span>\n        </div>\n        ");
    }
    return ToolboxTab;
}());
exports.ToolboxTab = ToolboxTab;
var ToolboxItem = /** @class */ (function () {
    function ToolboxItem() {
    }
    ToolboxItem.prototype.redraw_update = function (ulabel) { };
    ToolboxItem.prototype.frame_update = function (ulabel) { };
    return ToolboxItem;
}());
exports.ToolboxItem = ToolboxItem;
/**
 * Toolbox item for selecting annotation mode.
 */
var ModeSelectionToolboxItem = /** @class */ (function (_super) {
    __extends(ModeSelectionToolboxItem, _super);
    function ModeSelectionToolboxItem() {
        return _super.call(this) || this;
    }
    ModeSelectionToolboxItem.prototype.get_html = function () {
        return "\n        <div class=\"mode-selection\">\n            <p class=\"current_mode_container\">\n                <span class=\"cmlbl\">Mode:</span>\n                <span class=\"current_mode\"></span>\n            </p>\n        </div>\n        ";
    };
    return ModeSelectionToolboxItem;
}(ToolboxItem));
exports.ModeSelectionToolboxItem = ModeSelectionToolboxItem;
/**
 * Toolbox item for zooming and panning.
 */
var ZoomPanToolboxItem = /** @class */ (function (_super) {
    __extends(ZoomPanToolboxItem, _super);
    function ZoomPanToolboxItem(frame_range) {
        var _this = _super.call(this) || this;
        _this.frame_range = frame_range;
        return _this;
    }
    ZoomPanToolboxItem.prototype.get_html = function () {
        return "\n        <div class=\"zoom-pan\">\n            <div class=\"half-tb htbmain set-zoom\">\n                <p class=\"shortcut-tip\">ctrl+scroll or shift+drag</p>\n                <div class=\"zpcont\">\n                    <div class=\"lblpyldcont\">\n                        <span class=\"pzlbl htblbl\">Zoom</span>\n                        <span class=\"zinout htbpyld\">\n                            <a href=\"#\" class=\"zbutt zout\">-</a>\n                            <a href=\"#\" class=\"zbutt zin\">+</a>\n                        </span>\n                    </div>\n                </div>\n            </div><!--\n            --><div class=\"half-tb htbmain set-pan\">\n                <p class=\"shortcut-tip\">scrollclick+drag or ctrl+drag</p>\n                <div class=\"zpcont\">\n                    <div class=\"lblpyldcont\">\n                        <span class=\"pzlbl htblbl\">Pan</span>\n                        <span class=\"panudlr htbpyld\">\n                            <a href=\"#\" class=\"pbutt left\"></a>\n                            <a href=\"#\" class=\"pbutt right\"></a>\n                            <a href=\"#\" class=\"pbutt up\"></a>\n                            <a href=\"#\" class=\"pbutt down\"></a>\n                            <span class=\"spokes\"></span>\n                        </span>\n                    </div>\n                </div>\n            </div>\n            <div class=\"recenter-cont\" style=\"text-align: center;\">\n                <a href=\"#\" id=\"recenter-button\">Re-Center</a>\n            </div>\n            ".concat(this.frame_range, "\n        </div>\n        ");
    };
    return ZoomPanToolboxItem;
}(ToolboxItem));
exports.ZoomPanToolboxItem = ZoomPanToolboxItem;
/**
 * Toolbox Item for selecting line style.
 */
var LinestyleToolboxItem = /** @class */ (function (_super) {
    __extends(LinestyleToolboxItem, _super);
    function LinestyleToolboxItem(canvas_did, demo_width, demo_height, px_per_px) {
        var _this = _super.call(this) || this;
        _this.canvas_did = canvas_did;
        _this.demo_width = demo_width;
        _this.demo_height = demo_height;
        _this.px_per_px = px_per_px;
        return _this;
    }
    LinestyleToolboxItem.prototype.get_html = function () {
        return "\n        <div class=\"linestyle\">\n            <p class=\"tb-header\">Line Width</p>\n            <div class=\"lstyl-row\">\n                <div class=\"line-expl\">\n                    <a href=\"#\" class=\"wbutt wout\">-</a>\n                    <canvas \n                        id=\"".concat(this.canvas_did, "\" \n                        class=\"demo-canvas\" \n                        width=").concat(this.demo_width * this.px_per_px, "} \n                        height=").concat(this.demo_height * this.px_per_px, "></canvas>\n                    <a href=\"#\" class=\"wbutt win\">+</a>\n                </div><!--\n                --><div class=\"setting\">\n                    <a class=\"fixed-setting\">Fixed</a><br>\n                    <a href=\"#\" class=\"dyn-setting\">Dynamic</a>\n                </div>\n            </div>\n        </div>\n        ");
    };
    return LinestyleToolboxItem;
}(ToolboxItem));
exports.LinestyleToolboxItem = LinestyleToolboxItem;
/**
 * Toolbox item for selection Annotation ID.
 */
var AnnotationIDToolboxItem = /** @class */ (function (_super) {
    __extends(AnnotationIDToolboxItem, _super);
    function AnnotationIDToolboxItem(instructions) {
        var _this = _super.call(this) || this;
        _this.instructions = instructions;
        return _this;
    }
    AnnotationIDToolboxItem.prototype.get_html = function () {
        return "\n        <div class=\"classification\">\n            <p class=\"tb-header\">Annotation ID</p>\n            <div class=\"id-toolbox-app\"></div>\n        </div>\n        <div class=\"toolbox-refs\">\n            ".concat(this.instructions, "\n        </div>\n        ");
    };
    return AnnotationIDToolboxItem;
}(ToolboxItem));
exports.AnnotationIDToolboxItem = AnnotationIDToolboxItem;
var ClassCounterToolboxItem = /** @class */ (function (_super) {
    __extends(ClassCounterToolboxItem, _super);
    function ClassCounterToolboxItem() {
        var _this = _super.call(this) || this;
        _this.inner_HTML = "<p class=\"tb-header\">Annotation Count</p>";
        return _this;
    }
    ClassCounterToolboxItem.prototype.update_toolbox_counter = function (subtask, toolbox_id) {
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
            f_string += "".concat(class_name, ": ").concat(class_count, "<br>");
        }
        this.inner_HTML = "<p class=\"tb-header\">Annotation Count</p>" + "<p>".concat(f_string, "</p>");
    };
    ClassCounterToolboxItem.prototype.get_html = function () {
        return "\n        <div class=\"toolbox-class-counter\">" + this.inner_HTML + "</div>";
    };
    ClassCounterToolboxItem.prototype.redraw_update = function (ulabel) {
        this.update_toolbox_counter(ulabel.subtasks[ulabel.state["current_subtask"]], ulabel.config["toolbox_id"]);
        $("#" + ulabel.config["toolbox_id"] + " div.toolbox-class-counter").html(this.inner_HTML);
    };
    return ClassCounterToolboxItem;
}(ToolboxItem));
exports.ClassCounterToolboxItem = ClassCounterToolboxItem;
/**
 * Toolbox item for resizing all annotations
 */
var AnnotationResizeItem = /** @class */ (function (_super) {
    __extends(AnnotationResizeItem, _super);
    function AnnotationResizeItem(ulabel) {
        var _this = _super.call(this) || this;
        _this.inner_HTML = "<p class=\"tb-header\">Annotation Count</p>";
        $(document).on("click", "a.butt-ann", function (e) {
            var button = $(e.currentTarget);
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
            var annotation_size = button.attr("id").slice(-1);
            _this.update_annotation_size(current_subtask, annotation_size);
            ulabel.redraw_all_annotations(null, null, false);
        });
        return _this;
    }
    //recieives a string of 's','m', 'l', '-', or '+' depending on which button was pressed
    AnnotationResizeItem.prototype.update_annotation_size = function (subtask, size) {
        var small_size = 5;
        var medium_size = 9;
        var large_size = 13;
        var increment_size = 2;
        if (subtask == null)
            return;
        switch (size) {
            case 's':
                for (var annotation_id in subtask.annotations.access) {
                    subtask.annotations.access[annotation_id].line_size = small_size;
                }
                break;
            case 'm':
                for (var annotation_id in subtask.annotations.access) {
                    subtask.annotations.access[annotation_id].line_size = medium_size;
                }
                break;
            case 'l':
                for (var annotation_id in subtask.annotations.access) {
                    subtask.annotations.access[annotation_id].line_size = large_size;
                }
                break;
            case '-':
                for (var annotation_id in subtask.annotations.access) {
                    subtask.annotations.access[annotation_id].line_size -= increment_size;
                }
                break;
            case '+':
                for (var annotation_id in subtask.annotations.access) {
                    subtask.annotations.access[annotation_id].line_size += increment_size;
                }
                break;
            default:
                return;
        }
    };
    AnnotationResizeItem.prototype.get_html = function () {
        return "\n        <div class=\"annotation-resize\">\n            <p class=\"tb-header\">Change Annotation Size</p>\n            <div class=\"annotation-resize-button-holder\">\n                <span class=\"annotation-inc\">\n                    <a href=\"#\" class=\"butt-ann\" id=\"annotation-resize--\">-</a>\n                </span>\n                <span class=\"annotation-size\">\n                    <a href=\"#\" class=\"butt-ann\" id=\"annotation-resize-s\">Small</a>\n                    <a href=\"#\" class=\"butt-ann\" id=\"annotation-resize-m\">Medium</a>\n                    <a href=\"#\" class=\"butt-ann\" id=\"annotation-resize-l\">Large</a>\n                </span>\n                <span class=\"annotation-inc\">\n                    <a href=\"#\" class=\"butt-ann\" id=\"annotation-resize-+\">+</a>\n                </span>\n            </div>\n        </div>\n        ";
    };
    return AnnotationResizeItem;
}(ToolboxItem));
exports.AnnotationResizeItem = AnnotationResizeItem;
// export class WholeImageClassifierToolboxTab extends ToolboxItem {
//     constructor() {
//         super(
//             "toolbox-whole-image-classifier",
//             "Whole Image Classification",
//             ""
//         );
//     }
// }
