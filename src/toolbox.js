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
exports.KeypointSliderItem = exports.RecolorActiveItem = exports.AnnotationResizeItem = exports.ClassCounterToolboxItem = exports.AnnotationIDToolboxItem = exports.ZoomPanToolboxItem = exports.ModeSelectionToolboxItem = exports.ToolboxItem = exports.ToolboxTab = exports.Toolbox = void 0;
var __1 = require("..");
var configuration_1 = require("./configuration");
var toolboxDividerDiv = "<div class=toolbox-divider></div>";
function read_annotation_confidence() {
    return;
}
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
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
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
    function ZoomPanToolboxItem(ulabel) {
        var _this = _super.call(this) || this;
        _this.ulabel = ulabel;
        _this.set_frame_range(ulabel);
        return _this;
    }
    ZoomPanToolboxItem.prototype.set_frame_range = function (ulabel) {
        if (ulabel.config["image_data"]["frames"].length == 1) {
            this.frame_range = "";
            return;
        }
        this.frame_range = "\n            <div class=\"full-tb htbmain set-frame\">\n                <p class=\"shortcut-tip\">scroll to switch frames</p>\n                <div class=\"zpcont\">\n                    <div class=\"lblpyldcont\">\n                        <span class=\"pzlbl htblbl\">Frame</span> &nbsp;\n                        <input class=\"frame_input\" type=\"range\" min=0 max=".concat(ulabel.config["image_data"].frames.length - 1, " value=0 />\n                    </div>\n                </div>\n            </div>\n            ");
    };
    ZoomPanToolboxItem.prototype.get_html = function () {
        return "\n        <div class=\"zoom-pan\">\n            <div class=\"half-tb htbmain set-zoom\">\n                <p class=\"shortcut-tip\">ctrl+scroll or shift+drag</p>\n                <div class=\"zpcont\">\n                    <div class=\"lblpyldcont\">\n                        <span class=\"pzlbl htblbl\">Zoom</span>\n                        <span class=\"zinout htbpyld\">\n                            <a href=\"#\" class=\"zbutt zout\">-</a>\n                            <a href=\"#\" class=\"zbutt zin\">+</a>\n                        </span>\n                    </div>\n                </div>\n            </div><!--\n            --><div class=\"half-tb htbmain set-pan\">\n                <p class=\"shortcut-tip\">scrollclick+drag or ctrl+drag</p>\n                <div class=\"zpcont\">\n                    <div class=\"lblpyldcont\">\n                        <span class=\"pzlbl htblbl\">Pan</span>\n                        <span class=\"panudlr htbpyld\">\n                            <a href=\"#\" class=\"pbutt left\"></a>\n                            <a href=\"#\" class=\"pbutt right\"></a>\n                            <a href=\"#\" class=\"pbutt up\"></a>\n                            <a href=\"#\" class=\"pbutt down\"></a>\n                            <span class=\"spokes\"></span>\n                        </span>\n                    </div>\n                </div>\n            </div>\n            <div class=\"recenter-cont\" style=\"text-align: center;\">\n                <a href=\"#\" id=\"recenter-button\">Re-Center</a>\n            </div>\n            ".concat(this.frame_range, "\n        </div>\n        ");
    };
    return ZoomPanToolboxItem;
}(ToolboxItem));
exports.ZoomPanToolboxItem = ZoomPanToolboxItem;
/**
 * Toolbox item for selection Annotation ID.
 */
var AnnotationIDToolboxItem = /** @class */ (function (_super) {
    __extends(AnnotationIDToolboxItem, _super);
    function AnnotationIDToolboxItem(ulabel) {
        var _this = _super.call(this) || this;
        _this.ulabel = ulabel;
        _this.set_instructions(ulabel);
        return _this;
    }
    AnnotationIDToolboxItem.prototype.set_instructions = function (ulabel) {
        this.instructions = "";
        if (ulabel.config["instructions_url"] != null) {
            this.instructions = "\n                <a href=\"".concat(ulabel.config["instructions_url"], "\" target=\"_blank\" rel=\"noopener noreferrer\">Instructions</a>\n            ");
        }
    };
    AnnotationIDToolboxItem.prototype.get_html = function () {
        return "\n        <div class=\"classification\">\n            <p class=\"tb-header\">Annotation ID</p>\n            <div class=\"id-toolbox-app\"></div>\n        </div>\n        <div class=\"toolbox-refs\">\n            ".concat(this.instructions, "\n        </div>\n        ");
    };
    return AnnotationIDToolboxItem;
}(ToolboxItem));
exports.AnnotationIDToolboxItem = AnnotationIDToolboxItem;
var ClassCounterToolboxItem = /** @class */ (function (_super) {
    __extends(ClassCounterToolboxItem, _super);
    function ClassCounterToolboxItem() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
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
        _this.is_vanished = false;
        _this.cached_size = 1.5;
        _this.inner_HTML = "<p class=\"tb-header\">Annotation Count</p>";
        //get default keybinds
        _this.keybind_configuration = ulabel.config.default_keybinds;
        //grab current subtask for convinience
        var current_subtask_key = ulabel.state["current_subtask"];
        var current_subtask = ulabel.subtasks[current_subtask_key];
        //First check for a size cookie, if one isn't found then check the config
        //for a default annotation size. If neither are found it will use the size
        //that the annotation was saved as.
        console.log(_this.read_size_cookie(current_subtask));
        if (_this.read_size_cookie(current_subtask) != null) {
            _this.update_annotation_size(current_subtask, Number(_this.read_size_cookie(current_subtask)));
        }
        else if (ulabel.config.default_annotation_size != undefined) {
            _this.update_annotation_size(current_subtask, ulabel.config.default_annotation_size);
        }
        //event listener for buttons
        $(document).on("click", "a.butt-ann", function (e) {
            var button = $(e.currentTarget);
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
            var annotation_size = button.attr("id").slice(18);
            _this.update_annotation_size(current_subtask, annotation_size);
            ulabel.redraw_all_annotations(null, null, false);
        });
        //event listener for keybinds
        $(document).on("keypress", function (e) {
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
            console.log(e.key);
            switch (e.key) {
                case _this.keybind_configuration.annotation_vanish:
                    _this.update_annotation_size(current_subtask, "v");
                    break;
                case _this.keybind_configuration.annotation_size_small:
                    _this.update_annotation_size(current_subtask, "s");
                    break;
                case _this.keybind_configuration.annotation_size_large:
                    _this.update_annotation_size(current_subtask, "l");
                    break;
                case _this.keybind_configuration.annotation_size_minus:
                    _this.update_annotation_size(current_subtask, "dec");
                    break;
                case _this.keybind_configuration.annotation_size_plus:
                    _this.update_annotation_size(current_subtask, "inc");
                    break;
            }
            ulabel.redraw_all_annotations(null, null, false);
        });
        return _this;
    }
    //recieives a string of 's', 'l', 'dec', 'inc', or 'v' depending on which button was pressed
    //also the constructor can pass in a number from the config
    AnnotationResizeItem.prototype.update_annotation_size = function (subtask, size) {
        var small_size = 1.5;
        var large_size = 5;
        var increment_size = 0.5;
        var vanish_size = 0.01;
        if (subtask == null)
            return;
        //If the annotations are currently vanished and a button other than the vanish button is
        //pressed, then we want to ignore the input
        if (this.is_vanished && size !== "v")
            return;
        if (typeof (size) === "number") {
            this.loop_through_annotations(subtask, size, "=");
        }
        if (size == "v") {
            if (this.is_vanished) {
                this.loop_through_annotations(subtask, this.cached_size, "=");
                //flip the bool state
                this.is_vanished = !this.is_vanished;
                $("#annotation-resize-v").attr("style", "background-color: " + "rgba(100, 148, 237, 0.8)");
                return;
            }
            if (this.is_vanished !== true) {
                this.loop_through_annotations(subtask, vanish_size, "=");
                //flip the bool state
                this.is_vanished = !this.is_vanished;
                $("#annotation-resize-v").attr("style", "background-color: " + "#1c2d4d");
                return;
            }
            return;
        }
        switch (size) {
            case 's':
                this.loop_through_annotations(subtask, small_size, "=");
                this.cached_size = small_size;
                break;
            case 'l':
                this.loop_through_annotations(subtask, large_size, "=");
                this.cached_size = large_size;
                break;
            case 'dec':
                this.loop_through_annotations(subtask, increment_size, "-");
                break;
            case 'inc':
                this.loop_through_annotations(subtask, increment_size, "+");
                break;
            default:
                return;
        }
    };
    //loops through all annotations in a subtask to change their line size
    AnnotationResizeItem.prototype.loop_through_annotations = function (subtask, size, operation) {
        if (operation == "=") {
            for (var annotation_id in subtask.annotations.access) {
                subtask.annotations.access[annotation_id].line_size = size;
            }
            this.set_size_cookie(size, subtask);
            return;
        }
        if (operation == "+") {
            for (var annotation_id in subtask.annotations.access) {
                subtask.annotations.access[annotation_id].line_size += size;
                //temporary solution
                this.cached_size = subtask.annotations.access[annotation_id].line_size;
            }
            this.set_size_cookie(subtask.annotations.access[subtask.annotations.ordering[0]].line_size, subtask);
            return;
        }
        if (operation == "-") {
            for (var annotation_id in subtask.annotations.access) {
                //Check to make sure annotation line size won't go 0 or negative. If it would
                //set it equal to a small positive number
                if (subtask.annotations.access[annotation_id].line_size - size <= 0.01) {
                    subtask.annotations.access[annotation_id].line_size = 0.01;
                }
                else {
                    subtask.annotations.access[annotation_id].line_size -= size;
                }
                //temporary solution
                this.cached_size = subtask.annotations.access[annotation_id].line_size;
            }
            this.set_size_cookie(subtask.annotations.access[subtask.annotations.ordering[0]].line_size, subtask);
            return;
        }
        throw Error("Invalid Operation given to loop_through_annotations");
    };
    AnnotationResizeItem.prototype.set_size_cookie = function (cookie_value, subtask) {
        var d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));
        var subtask_name = subtask.display_name.replaceAll(" ", "_").toLowerCase();
        document.cookie = subtask_name + "_size=" + cookie_value + ";" + d.toUTCString() + ";path=/";
    };
    AnnotationResizeItem.prototype.read_size_cookie = function (subtask) {
        var subtask_name = subtask.display_name.replaceAll(" ", "_").toLowerCase();
        var cookie_name = subtask_name + "_size=";
        var cookie_array = document.cookie.split(";");
        for (var i = 0; i < cookie_array.length; i++) {
            var current_cookie = cookie_array[i];
            //while there's whitespace at the front of the cookie, loop through and remove it
            while (current_cookie.charAt(0) == " ") {
                current_cookie = current_cookie.substring(1);
            }
            if (current_cookie.indexOf(cookie_name) == 0) {
                return current_cookie.substring(cookie_name.length, current_cookie.length);
            }
        }
        return null;
    };
    AnnotationResizeItem.prototype.get_html = function () {
        return "\n        <div class=\"annotation-resize\">\n            <p class=\"tb-header\">Change Annotation Size</p>\n            <div class=\"annotation-resize-button-holder\">\n                <span class=\"annotation-vanish\">\n                    <a href=\"#\" class=\"butt-ann button\" id=\"annotation-resize-v\">Vanish</a>\n                </span>\n                <span class=\"annotation-size\">\n                    <a href=\"#\" class=\"butt-ann button\" id=\"annotation-resize-s\">Small</a>\n                    <a href=\"#\" class=\"butt-ann button\" id=\"annotation-resize-l\">Large</a>\n                </span>\n                <span class=\"annotation-inc increment\">\n                    <a href=\"#\" class=\"butt-ann button inc\" id=\"annotation-resize-inc\">+</a>\n                    <a href=\"#\" class=\"butt-ann button dec\" id=\"annotation-resize-dec\">-</a>\n                </span>\n            </div>\n        </div>\n        ";
    };
    return AnnotationResizeItem;
}(ToolboxItem));
exports.AnnotationResizeItem = AnnotationResizeItem;
var RecolorActiveItem = /** @class */ (function (_super) {
    __extends(RecolorActiveItem, _super);
    function RecolorActiveItem(ulabel) {
        var _this = _super.call(this) || this;
        _this.most_recent_draw = Date.now();
        _this.inner_HTML = "<p class=\"tb-header\">Recolor Annotations</p>";
        var current_subtask_key = ulabel.state["current_subtask"];
        var current_subtask = ulabel.subtasks[current_subtask_key];
        //loop through all the types of annotations and check to see it there's
        //a color cookie corresponding to that class id
        for (var i = 0; i < current_subtask.classes.length; i++) {
            var cookie_color = _this.read_color_cookie(current_subtask.classes[i].id);
            if (cookie_color !== null) {
                _this.update_annotation_color(current_subtask, cookie_color, current_subtask.classes[i].id);
            }
        }
        __1.ULabel.process_classes(ulabel, ulabel.state.current_subtask, current_subtask);
        //event handler for the buttons
        $(document).on("click", "input.color-change-btn", function (e) {
            var button = $(e.currentTarget);
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
            //slice 13,16 to grab the part of the id that specifies color
            var color_from_id = button.attr("id").slice(13, 16);
            _this.update_annotation_color(current_subtask, color_from_id);
            __1.ULabel.process_classes(ulabel, ulabel.state.current_subtask, current_subtask);
            ulabel.redraw_all_annotations(null, null, false);
        });
        $(document).on("input", "input.color-change-picker", function (e) {
            //Gets the current subtask
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
            //Gets the hex value from the color picker
            var hex = e.currentTarget.value;
            _this.update_annotation_color(current_subtask, hex);
            //somewhat janky way to update the color on the color picker 
            //to allow for more css options
            var color_picker_container = document.getElementById("color-picker-container");
            color_picker_container.style.backgroundColor = hex;
            __1.ULabel.process_classes(ulabel, ulabel.state.current_subtask, current_subtask);
            _this.limit_redraw(ulabel);
        });
        $(document).on("input", "#gradient-toggle", function (e) {
            ulabel.redraw_all_annotations(null, null, false);
            _this.set_gradient_cookie($("#gradient-toggle").prop("checked"));
        });
        $(document).on("input", "#gradient-slider", function (e) {
            $("div.gradient-slider-value-display").text(e.currentTarget.value + "%");
            ulabel.redraw_all_annotations(null, null, false);
        });
        return _this;
    }
    RecolorActiveItem.prototype.update_annotation_color = function (subtask, color, selected_id) {
        if (selected_id === void 0) { selected_id = null; }
        var need_to_set_cookie = true;
        if (selected_id !== null) {
            need_to_set_cookie = false;
        }
        //check for the three special cases, otherwise assume color is a hex value
        if (color == "yel") {
            color = "#FFFF00";
        }
        if (color == "red") {
            color = "#FF0000";
        }
        if (color == "cya") {
            color = "#00FFFF";
        }
        if (selected_id == null) {
            subtask.state.id_payload.forEach(function (item) {
                if (item.confidence == 1) {
                    selected_id = item.class_id;
                }
            });
        }
        //if the selected id is still null, then that means that no id was passed
        //in or had a confidence of 1. Therefore the default is having the first 
        //annotation id selected, so we'll default to that
        if (selected_id == null) {
            selected_id = subtask.classes[0].id;
        }
        subtask.classes.forEach(function (item) {
            if (item.id === selected_id) {
                item.color = color;
            }
        });
        //$("a.toolbox_sel_"+selected_id+":first").attr("backround-color", color);
        var colored_square_element = ".toolbox_colprev_" + selected_id;
        $(colored_square_element).attr("style", "background-color: " + color);
        //Finally set a cookie to remember color preference if needed
        if (need_to_set_cookie) {
            this.set_color_cookie(selected_id, color);
        }
    };
    RecolorActiveItem.prototype.limit_redraw = function (ulabel, wait_time) {
        if (wait_time === void 0) { wait_time = 100; }
        //Compare most recent draw time to now and only draw if  
        //more than wait_time milliseconds have passed. 
        if (Date.now() - this.most_recent_draw > wait_time) {
            //update most recent draw to now
            this.most_recent_draw = Date.now();
            //redraw annotations
            ulabel.redraw_all_annotations(null, null, false);
        }
    };
    RecolorActiveItem.prototype.set_color_cookie = function (annotation_id, cookie_value) {
        var d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));
        document.cookie = "color" + annotation_id + "=" + cookie_value + ";" + d.toUTCString() + ";path=/";
    };
    RecolorActiveItem.prototype.read_color_cookie = function (annotation_id) {
        var cookie_name = "color" + annotation_id + "=";
        var cookie_array = document.cookie.split(";");
        for (var i = 0; i < cookie_array.length; i++) {
            var current_cookie = cookie_array[i];
            //while there's whitespace at the front of the cookie, loop through and remove it
            while (current_cookie.charAt(0) == " ") {
                current_cookie = current_cookie.substring(1);
            }
            if (current_cookie.indexOf(cookie_name) == 0) {
                return current_cookie.substring(cookie_name.length, current_cookie.length);
            }
        }
        return null;
    };
    RecolorActiveItem.prototype.set_gradient_cookie = function (gradient_status) {
        var d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));
        document.cookie = "gradient=" + gradient_status + ";" + d.toUTCString() + ";path=/";
    };
    RecolorActiveItem.prototype.read_gradient_cookie = function () {
        var cookie_name = "gradient=";
        var cookie_array = document.cookie.split(";");
        for (var i = 0; i < cookie_array.length; i++) {
            var current_cookie = cookie_array[i];
            //while there's whitespace at the front of the cookie, loop through and remove it
            while (current_cookie.charAt(0) == " ") {
                current_cookie = current_cookie.substring(1);
            }
            if (current_cookie.indexOf(cookie_name) == 0) {
                return (current_cookie.substring(cookie_name.length, current_cookie.length) == "true");
            }
        }
        return null;
    };
    RecolorActiveItem.prototype.get_html = function () {
        var checked_status_bool = this.read_gradient_cookie(); //true, false, or null
        var checked_status_string = "";
        //null means no cookie, so grab the default from configuration
        if (checked_status_bool == null) {
            checked_status_bool = configuration_1.Configuration.annotation_gradient_default;
        }
        if (checked_status_bool == true) {
            checked_status_string = "checked";
        }
        return "\n        <div class=\"recolor-active\">\n            <p class=\"tb-header\">Recolor Annotations</p>\n            <div class=\"recolor-tbi-gradient\">\n                <div>\n                    <label for=\"gradient-toggle\" id=\"gradient-toggle-label\">Toggle Gradients</label>\n                    <input type=\"checkbox\" id=\"gradient-toggle\" name=\"gradient-checkbox\" value=\"gradient\" ".concat(checked_status_string, ">\n                </div>\n                <div>\n                    <label for=\"gradient-slider\" id=\"gradient-slider-label\">Gradient Max</label>\n                    <input type=\"range\" id=\"gradient-slider\" value=\"100\">\n                    <div class=\"gradient-slider-value-display\">100%</div>\n                </div>\n            </div>\n            <div class=\"annotation-recolor-button-holder\">\n                <div class=\"color-btn-container\">\n                    <input type=\"button\" class=\"color-change-btn\" id=\"color-change-yel\">\n                    <input type=\"button\" class=\"color-change-btn\" id=\"color-change-red\">\n                    <input type=\"button\" class=\"color-change-btn\" id=\"color-change-cya\">\n                </div>\n                <div class=\"color-picker-border\">\n                    <div class=\"color-picker-container\" id=\"color-picker-container\">\n                        <input type=\"color\" class=\"color-change-picker\" id=\"color-change-pick\">\n                    </div>\n                </div>\n            </div>\n        </div>\n        ");
    };
    return RecolorActiveItem;
}(ToolboxItem));
exports.RecolorActiveItem = RecolorActiveItem;
var KeypointSliderItem = /** @class */ (function (_super) {
    __extends(KeypointSliderItem, _super);
    //function_array must contain three functions
    //the first function is how to filter the annotations
    //the second is how to get the particular confidence
    //the third is how to mark the annotations deprecated
    function KeypointSliderItem(ulabel, kwargs) {
        var _this = _super.call(this) || this;
        _this.default_value = 0; //defalut value must be a number between 0 and 1 inclusive
        _this.inner_HTML = "<p class=\"tb-header\">Keypoint Slider</p>";
        _this.name = kwargs.name;
        _this.filter_function = kwargs.filter_function;
        _this.get_confidence = kwargs.confidence_function;
        _this.mark_deprecated = kwargs.mark_deprecated;
        //if the config has a default value override, then use that instead
        if (ulabel.config.hasOwnProperty(_this.name.replaceAll(" ", "_").toLowerCase() + "_default_value")) {
            kwargs._default_value = ulabel.config[_this.name.split(" ").join("_").toLowerCase() + "_default_value"];
        }
        //if the user doesn't give a default for the slider, then the defalut is 0
        if (kwargs.hasOwnProperty("default_value")) {
            //check to make sure the default value given is valid
            if ((kwargs.default_value >= 0) && (kwargs.default_value <= 1)) {
                _this.default_value = kwargs.default_value;
            }
            else {
                throw Error("Invalid defalut keypoint slider value given");
            }
        }
        var current_subtask_key = ulabel.state["current_subtask"];
        var current_subtask = ulabel.subtasks[current_subtask_key];
        //Check to see if any of the annotations were deprecated by default
        _this.check_for_human_deprecated(current_subtask);
        //check the config to see if we should update the annotations with the default filter on load
        if (ulabel.config.filter_annotations_on_load) {
            _this.deprecate_annotations(current_subtask, _this.default_value);
        }
        //The annotations are drawn for the first time after the toolbox is loaded
        //so we don't actually have to redraw the annotations after deprecating them.
        $(document).on("input", "#" + _this.name.split(" ").join("-").toLowerCase(), function (e) {
            var current_subtask_key = ulabel.state["current_subtask"];
            var current_subtask = ulabel.subtasks[current_subtask_key];
            //update the slider value text next to the slider
            $("#" + _this.name.split(" ").join("-").toLowerCase() + "-label").text(e.currentTarget.value + "%");
            var filter_value = e.currentTarget.value / 100;
            _this.deprecate_annotations(current_subtask, filter_value);
            ulabel.redraw_all_annotations(null, null, false);
        });
        return _this;
    }
    KeypointSliderItem.prototype.deprecate_annotations = function (current_subtask, filter_value) {
        for (var i in current_subtask.annotations.ordering) {
            var current_annotation = current_subtask.annotations.access[current_subtask.annotations.ordering[i]];
            //kinda a hack, but an annotation can't be human deprecated if its not deprecated
            if (current_annotation.deprecated == false) {
                current_annotation.human_deprecated = false;
            }
            //we don't want to change any annotations that were hand edited by the user.
            if (current_annotation.human_deprecated) {
                continue;
            }
            var current_confidence = this.get_confidence(current_annotation);
            var deprecate = this.filter_function(current_confidence, filter_value);
            this.mark_deprecated(current_annotation, deprecate);
        }
    };
    //if an annotation is deprecated and has a child, then assume its human deprecated.
    KeypointSliderItem.prototype.check_for_human_deprecated = function (current_subtask) {
        for (var i in current_subtask.annotations.ordering) {
            var current_annotation = current_subtask.annotations.access[current_subtask.annotations.ordering[i]];
            var parent_id = current_annotation.parent_id;
            //if the parent id exists and is deprecated, then assume that it was human deprecated
            if (parent_id != null) {
                var parent_annotation = current_subtask.annotations.access[parent_id];
                //check if the parent annotation exists
                if (parent_annotation != null) {
                    if (parent_annotation.deprecated) {
                        parent_annotation.human_deprecated = true;
                    }
                }
            }
        }
    };
    KeypointSliderItem.prototype.get_html = function () {
        return "\n        <div class=\"keypoint-slider\">\n            <p class=\"tb-header\">".concat(this.name, "</p>\n            <div class=\"keypoint-slider-holder\">\n                <input \n                    type=\"range\" \n                    id=\"").concat(this.name.split(" ").join("-").toLowerCase(), "\" \n                    class=\"keypoint-slider\" value=\"").concat(this.default_value * 100, "\"\n                />\n                <label \n                    for=\"").concat(this.name.split(" ").join("-").toLowerCase(), "\" \n                    id=\"").concat(this.name.split(" ").join("-").toLowerCase(), "-label\"\n                    class=\"keypoint-slider-label\">\n                    ").concat(this.default_value * 100, "%\n                </label>\n                <span class=\"increment\" >\n                    <a href=\"#\" class=\"button inc\" >+</a>\n                    <a href=\"#\" class=\"button dec\" >-</a>\n                </span>\n            </div>\n        </div>");
    };
    return KeypointSliderItem;
}(ToolboxItem));
exports.KeypointSliderItem = KeypointSliderItem;
// export class WholeImageClassifierToolboxTab extends ToolboxItem {
//     constructor() {
//         super(
//             "toolbox-whole-image-classifier",
//             "Whole Image Classification",
//             ""
//         );
//     }
// }
