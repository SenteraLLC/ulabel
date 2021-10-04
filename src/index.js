"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ULabel = void 0;
/*
Uncertain Labeling Tool
Sentera Inc.
*/
var annotation_1 = require("./annotation");
var toolbox_1 = require("./toolbox");
var subtask_1 = require("./subtask");
var geometric_utils_1 = __importDefault(require("./geometric_utils"));
var jquery_1 = __importDefault(require("jquery"));
var jQuery = jquery_1.default;
var uuidv4 = require('uuid').v4;
var blobs_1 = require("./blobs");
var version_1 = require("./version");
// TODO find the actual type for this
jQuery.fn.outer_html = function () {
    return jQuery('<div />').append(this.eq(0).clone()).html();
};
var MODES_3D = ["global", "bbox3"];
var NONSPATIAL_MODES = ["whole-image", "global"];
var ULabel = /** @class */ (function () {
    // ================= Construction/Initialization =================
    function ULabel(container_id, image_data, username, on_submit, subtasks, task_meta, annotation_meta, px_per_px, initial_crop, initial_line_size, instructions_url) {
        if (task_meta === void 0) { task_meta = null; }
        if (annotation_meta === void 0) { annotation_meta = null; }
        if (px_per_px === void 0) { px_per_px = 1; }
        if (initial_crop === void 0) { initial_crop = null; }
        if (initial_line_size === void 0) { initial_line_size = 4; }
        if (instructions_url === void 0) { instructions_url = null; }
        // Unroll safe default arguments
        if (task_meta == null) {
            task_meta = {};
        }
        if (annotation_meta == null) {
            annotation_meta = {};
        }
        // Unroll submit button
        var on_submit_unrolled;
        if (typeof on_submit == "function") {
            on_submit_unrolled = {
                name: "Submit",
                hook: on_submit
            };
        }
        else {
            on_submit_unrolled = on_submit;
        }
        // If on_submit hook is not async, wrap it in an async func
        var fin_on_submit_hook;
        if (on_submit_unrolled.hook.constructor.name == "AsyncFunction") {
            fin_on_submit_hook = on_submit_unrolled.hook;
        }
        else {
            fin_on_submit_hook = function (annotations) {
                return __awaiter(this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, on_submit_unrolled.hook(annotations)];
                    });
                });
            };
        }
        // TODO 
        // Allow for importing spacing data -- a measure tool would be nice too
        // Much of this is hardcoded defaults, 
        //   some might be offloaded to the constructor eventually...
        this.config = {
            // Values useful for generating HTML for tool
            // TODO(v1) Make sure these don't conflict with other page elements
            "container_id": container_id,
            "annbox_id": "annbox",
            "imwrap_id": "imwrap",
            "canvas_fid_pfx": "front-canvas",
            "canvas_bid_pfx": "back-canvas",
            "canvas_did": "demo-canvas",
            "canvas_class": "easel",
            "image_id_pfx": "ann_image",
            "imgsz_class": "imgsz",
            "toolbox_id": "toolbox",
            "px_per_px": px_per_px,
            "initial_crop": initial_crop,
            // Configuration for the annotation task itself
            "image_data": ULabel.expand_image_data(this, image_data),
            "annotator": username,
            "allow_soft_id": false,
            "default_annotation_color": "#fa9d2a",
            // Dimensions of various components of the tool
            "image_width": null,
            "image_height": null,
            "demo_width": 120,
            "demo_height": 40,
            "polygon_ender_size": 30,
            "edit_handle_size": 30,
            // Behavior on special interactions
            "done_callback": fin_on_submit_hook,
            "done_button": on_submit_unrolled.name,
            "instructions_url": instructions_url,
            // ID Dialog config
            "cl_opacity": 0.4,
            "outer_diameter": 200,
            "inner_prop": 0.3,
            // Passthrough
            "task_meta": task_meta,
            "annotation_meta": annotation_meta
        };
        // Useful for the efficient redraw of nonspatial annotations
        this.tmp_nonspatial_element_ids = {};
        // Create object for current ulabel state
        this.state = {
            // Viewer state
            // Add and handle a value for current image
            "zoom_val": 1.0,
            "last_move": null,
            "current_frame": 0,
            // Global annotation state (subtasks also maintain an annotation state)
            "current_subtask": null,
            "line_size": initial_line_size,
            "size_mode": "fixed",
            // Renderings state
            "demo_canvas_context": null,
            "edited": false
        };
        // Populate these in an external "static" function
        this.subtasks = {};
        this.tot_num_classes = 0;
        ULabel.initialize_subtasks(this, subtasks);
        // Create object for dragging interaction state
        // TODO(v1)
        // There can only be one drag, yes? Maybe pare this down...
        // Would be nice to consolidate this with global state also
        this.drag_state = {
            "active_key": null,
            "release_button": null,
            "annotation": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "edit": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "pan": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "zoom": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "move": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "right": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            }
        };
        for (var st in this.subtasks) {
            for (var i = 0; i < this.subtasks[st]["annotations"]["ordering"].length; i++) {
                var aid = this.subtasks[st]["annotations"]["ordering"][i];
                var amd = this.subtasks[st]["annotations"]["access"][aid]["spatial_type"];
                if (!NONSPATIAL_MODES.includes(amd)) {
                    this.rebuild_containing_box(this.subtasks[st]["annotations"]["ordering"][i], false, st);
                }
            }
        }
        // Indicate that object must be "init" before use!
        this.is_init = false;
    }
    Object.defineProperty(ULabel, "elvl_info", {
        // ================= Internal constants =================
        get: function () { return 0; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ULabel, "elvl_standard", {
        get: function () { return 1; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ULabel, "elvl_fatal", {
        get: function () { return 2; },
        enumerable: false,
        configurable: true
    });
    ULabel.version = function () { return version_1.ULABEL_VERSION; };
    // ================= Static Utilities =================
    ULabel.add_style_to_document = function (ul) {
        var head = document.head || document.getElementsByTagName('head')[0];
        // TODO not any-cast
        var style = document.createElement('style');
        head.appendChild(style);
        if (style.styleSheet) {
            style.styleSheet.cssText = blobs_1.get_init_style(ul.config["container_id"]);
        }
        // if (style.sheet) {
        //     style.sheet.cssRules[0].cssText = get_init_style(ul.config["container_id"]);
        // }
        else {
            style.appendChild(document.createTextNode(blobs_1.get_init_style(ul.config["container_id"])));
        }
    };
    // Returns current epoch time in milliseconds
    ULabel.get_time = function () {
        return (new Date()).toISOString();
    };
    // =========================== NIGHT MODE COOKIES =======================================
    ULabel.has_night_mode_cookie = function () {
        if (document.cookie.split(";").find(function (row) { return row.trim().startsWith("nightmode=true"); })) {
            return true;
        }
        return false;
    };
    ULabel.set_night_mode_cookie = function () {
        var d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));
        document.cookie = "nightmode=true;expires=" + d.toUTCString() + ";path=/";
    };
    ULabel.destroy_night_mode_cookie = function () {
        document.cookie = "nightmode=true;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    };
    /*
    Types of drags
        - annotation
            - Bare canvas left mousedown
        - edit
            - Editable left mousedown
        - pan
            - Ctrl-left mousedown
            - Center mousedown
        - zoom
            - Right mousedown
            - Shift-left mousedown
    */
    ULabel.get_drag_key_start = function (mouse_event, ul) {
        if (ul.subtasks[ul.state["current_subtask"]]["state"]["active_id"] != null) {
            if (mouse_event.button == 2) {
                return "right";
            }
            return "annotation";
        }
        switch (mouse_event.button) {
            case 0:
                if (mouse_event.target.id == ul.subtasks[ul.state["current_subtask"]]["canvas_fid"]) {
                    if (mouse_event.ctrlKey || mouse_event.metaKey) {
                        return "pan";
                    }
                    if (mouse_event.shiftKey) {
                        return "zoom";
                    }
                    return "annotation";
                }
                else if (jquery_1.default(mouse_event.target).hasClass("editable")) {
                    return "edit";
                }
                else if (jquery_1.default(mouse_event.target).hasClass("movable")) {
                    mouse_event.preventDefault();
                    return "move";
                }
                else {
                    console.log("Unable to assign a drag key to click target:", mouse_event.target.id);
                    return null;
                }
            case 1:
                return "pan";
            case 2:
                return null;
        }
    };
    // ================= Init helpers =================
    ULabel.get_md_button = function (md_key, md_name, svg_blob, cur_md, subtasks) {
        var sel = "";
        var href = " href=\"#\"";
        if (cur_md == md_key) {
            sel = " sel";
            href = "";
        }
        var st_classes = "";
        for (var st_key in subtasks) {
            if (subtasks[st_key]["allowed_modes"].includes(md_key)) {
                st_classes += " md-en4--" + st_key;
            }
        }
        return "<div class=\"mode-opt\">\n            <a" + href + " id=\"md-btn--" + md_key + "\" class=\"md-btn" + sel + st_classes + " invert-this-svg\" amdname=\"" + md_name + "\">\n                " + svg_blob + "\n            </a>\n        </div>";
    };
    ULabel.get_toolbox_tabs = function (ul) {
        var ret = "";
        for (var st_key in ul.subtasks) {
            var sel = "";
            var href = " href=\"#\"";
            var val = 50;
            if (st_key == ul.state["current_subtask"] || ul.subtasks[st_key]["read_only"]) {
                href = "";
            }
            if (st_key == ul.state["current_subtask"]) {
                sel = " sel";
                val = 100;
            }
            ret += "\n            <div class=\"tb-st-tab" + sel + "\">\n                <a" + href + " id=\"tb-st-switch--" + st_key + "\" class=\"tb-st-switch\">" + ul.subtasks[st_key]["display_name"] + "</a><!--\n                --><span class=\"tb-st-range\">\n                    <input id=\"tb-st-range--" + st_key + "\" type=\"range\" min=0 max=100 value=" + val + " />\n                </span>\n            </div>\n            ";
        }
        return ret;
    };
    ULabel.get_images_html = function (ul) {
        var ret = "";
        var dsply;
        for (var i = 0; i < ul.config["image_data"].frames.length; i++) {
            if (i != 0) {
                dsply = "none";
            }
            else {
                dsply = "block";
            }
            ret += "\n                <img id=\"" + ul.config["image_id_pfx"] + "__" + i + "\" src=\"" + ul.config["image_data"].frames[i] + "\" class=\"imwrap_cls " + ul.config["imgsz_class"] + " image_frame\" style=\"z-index: 50; display: " + dsply + ";\" />\n            ";
        }
        return ret;
    };
    ULabel.get_frame_annotation_dialogs = function (ul) {
        var ret = "";
        var tot = 0;
        for (var st_key in ul.subtasks) {
            if (!ul.subtasks[st_key].allowed_modes.includes('whole-image') &&
                !ul.subtasks[st_key].allowed_modes.includes('global')) {
                continue;
            }
            tot += 1;
        }
        var ind = 0;
        for (var st_key in ul.subtasks) {
            if (!ul.subtasks[st_key].allowed_modes.includes('whole-image') &&
                !ul.subtasks[st_key].allowed_modes.includes('global')) {
                continue;
            }
            ret += "\n                <div id=\"fad_st__" + st_key + "\" class=\"frame_annotation_dialog fad_st__" + st_key + " fad_ind__" + (tot - ind - 1) + "\">\n                    <div class=\"hide_overflow_container\">\n                        <div class=\"row_container\">\n                            <div class=\"fad_row name\">\n                                <div class=\"fad_row_inner\">\n                                    <div class=\"fad_st_name\">" + ul.subtasks[st_key].display_name + "</div>\n                                </div>\n                            </div>\n                            <div class=\"fad_row add\">\n                                <div class=\"fad_row_inner\">\n                                    <div class=\"fad_st_add\">\n                                        <a class=\"add-glob-button\" href=\"#\">+</a>\n                                    </div>\n                                </div>\n                            </div><div class=\"fad_annotation_rows\"></div>\n                        </div>\n                    </div>\n                </div>\n            ";
            ind += 1;
            if (ind > 4) {
                throw new Error("At most 4 subtasks can have allow 'whole-image' or 'global' annotations.");
            }
        }
        return ret;
    };
    ULabel.prep_window_html = function (ul) {
        // Bring image and annotation scaffolding in
        // TODO multi-image with spacing etc.
        var instructions = "";
        if (ul.config["instructions_url"] != null) {
            instructions = "\n                <a href=\"" + ul.config["instructions_url"] + "\" target=\"_blank\" rel=\"noopener noreferrer\">Instructions</a>\n            ";
        }
        var tabs = ULabel.get_toolbox_tabs(ul);
        var images = ULabel.get_images_html(ul);
        var frame_annotation_dialogs = ULabel.get_frame_annotation_dialogs(ul);
        var frame_range = "\n        <div class=\"full-tb htbmain set-frame\">\n            <p class=\"shortcut-tip\">scroll to switch frames</p>\n            <div class=\"zpcont\">\n                <div class=\"lblpyldcont\">\n                    <span class=\"pzlbl htblbl\">Frame</span> &nbsp;\n                    <input class=\"frame_input\" type=\"range\" min=0 max=" + (ul.config["image_data"].frames.length - 1) + " value=0 />\n                </div>\n            </div>\n        </div>\n        ";
        if (ul.config["image_data"]["frames"].length == 1) {
            frame_range = "";
        }
        var tool_html = "\n        <div class=\"full_ulabel_container_\">\n            " + frame_annotation_dialogs + "\n            <div id=\"" + ul.config["annbox_id"] + "\" class=\"annbox_cls\">\n                <div id=\"" + ul.config["imwrap_id"] + "\" class=\"imwrap_cls " + ul.config["imgsz_class"] + "\">\n                    " + images + "\n                </div>\n            </div>\n            <div id=\"" + ul.config["toolbox_id"] + "\" class=\"toolbox_cls\">\n                <div class=\"toolbox-name-header\">\n                    <h1 class=\"toolname\"><a class=\"repo-anchor\" href=\"https://github.com/SenteraLLC/ulabel\">ULabel</a> <span class=\"version-number\">v" + version_1.ULABEL_VERSION + "</span></h1><!--\n                    --><div class=\"night-button-cont\">\n                        <a href=\"#\" class=\"night-button\">\n                            <div class=\"night-button-track\">\n                                <div class=\"night-status\"></div>\n                            </div>\n                        </a>\n                    </div>\n                </div>\n                <div class=\"toolbox_inner_cls\">\n                    <div class=\"mode-selection\">\n                        <p class=\"current_mode_container\">\n                            <span class=\"cmlbl\">Mode:</span>\n                            <span class=\"current_mode\"></span>\n                        </p>\n                    </div>\n                    <div class=\"toolbox-divider\"></div>\n                    <div class=\"zoom-pan\">\n                        <div class=\"half-tb htbmain set-zoom\">\n                            <p class=\"shortcut-tip\">ctrl+scroll or shift+drag</p>\n                            <div class=\"zpcont\">\n                                <div class=\"lblpyldcont\">\n                                    <span class=\"pzlbl htblbl\">Zoom</span>\n                                    <span class=\"zinout htbpyld\">\n                                        <a href=\"#\" class=\"zbutt zout\">-</a>\n                                        <a href=\"#\" class=\"zbutt zin\">+</a>\n                                    </span>\n                                </div>\n                            </div>\n                        </div><!--\n                        --><div class=\"half-tb htbmain set-pan\">\n                            <p class=\"shortcut-tip\">scrollclick+drag or ctrl+drag</p>\n                            <div class=\"zpcont\">\n                                <div class=\"lblpyldcont\">\n                                    <span class=\"pzlbl htblbl\">Pan</span>\n                                    <span class=\"panudlr htbpyld\">\n                                        <a href=\"#\" class=\"pbutt left\"></a>\n                                        <a href=\"#\" class=\"pbutt right\"></a>\n                                        <a href=\"#\" class=\"pbutt up\"></a>\n                                        <a href=\"#\" class=\"pbutt down\"></a>\n                                        <span class=\"spokes\"></span>\n                                    </span>\n                                </div>\n                            </div>\n                        </div>\n                        " + frame_range + "\n                    </div>\n                    <div class=\"toolbox-divider\"></div>\n                    <div class=\"linestyle\">\n                        <p class=\"tb-header\">Line Width</p>\n                        <div class=\"lstyl-row\">\n                            <div class=\"line-expl\">\n                                <a href=\"#\" class=\"wbutt wout\">-</a>\n                                <canvas \n                                    id=\"" + ul.config["canvas_did"] + "\" \n                                    class=\"demo-canvas\" \n                                    width=" + ul.config["demo_width"] * ul.config["px_per_px"] + " \n                                    height=" + ul.config["demo_height"] * ul.config["px_per_px"] + "></canvas>\n                                <a href=\"#\" class=\"wbutt win\">+</a>\n                            </div><!--\n                            --><div class=\"setting\">\n                                <a class=\"fixed-setting\">Fixed</a><br>\n                                <a href=\"#\" class=\"dyn-setting\">Dynamic</a>\n                            </div>\n                        </div>\n                    </div>\n                    <div class=\"toolbox-divider\"></div>\n                    <div class=\"classification\">\n                        // <p class=\"tb-header\">Annotation ID</p>\n                        // <div class=\"id-toolbox-app\"></div>\n                    </div>\n                    <div class=\"toolbox-refs\">\n                        " + instructions + "\n                    </div>\n                    <div class=\"toolbox-divider\"></div>\n                    <div class=\"toolbox-class-counter\"></div>\n                </div>\n                <div class=\"toolbox-tabs\">\n                    " + tabs + "\n                </div>\n            </div>\n        </div>";
        jquery_1.default("#" + ul.config["container_id"]).html(tool_html);
        // Build toolbox for the current subtask only
        var crst = Object.keys(ul.subtasks)[0];
        // Initialize toolbox based on configuration
        var sp_id = ul.config["toolbox_id"];
        var curmd = ul.subtasks[crst]["state"]["annotation_mode"];
        var md_buttons = [
            ULabel.get_md_button("bbox", "Bounding Box", blobs_1.BBOX_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("point", "Point", blobs_1.POINT_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("polygon", "Polygon", blobs_1.POLYGON_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("tbar", "T-Bar", blobs_1.TBAR_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("polyline", "Polyline", blobs_1.POLYLINE_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("contour", "Contour", blobs_1.CONTOUR_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("bbox3", "Bounding Cube", blobs_1.BBOX3_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("whole-image", "Whole Frame", blobs_1.WHOLE_IMAGE_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("global", "Global", blobs_1.GLOBAL_SVG, curmd, ul.subtasks),
        ];
        // Append but don't wait
        jquery_1.default("#" + sp_id + " .toolbox_inner_cls .mode-selection").append(md_buttons.join("<!-- -->"));
        // TODO noconflict
        jquery_1.default("#" + sp_id + " .toolbox_inner_cls").append("\n            <a id=\"submit-button\" href=\"#\">" + ul.config["done_button"] + "</a>\n        ");
        // Show current mode label
        ul.show_annotation_mode();
        // Make sure that entire toolbox is shown
        if (jquery_1.default("#" + ul.config["toolbox_id"] + " .toolbox_inner_cls").height() > jquery_1.default("#" + ul.config["container_id"]).height()) {
            jquery_1.default("#" + ul.config["toolbox_id"]).css("overflow-y", "scroll");
        }
    };
    ULabel.get_idd_string = function (idd_id, wdt, center_coord, cl_opacity, class_ids, inner_rad, outer_rad, class_defs) {
        // TODO noconflict
        var dialog_html = "\n        <div id=\"" + idd_id + "\" class=\"id_dialog\" style=\"width: " + wdt + "px; height: " + wdt + "px;\">\n            <a class=\"id-dialog-clickable-indicator\" href=\"#\"></a>\n            <svg width=\"" + wdt + "\" height=\"" + wdt + "\">\n        ";
        for (var i = 0; i < class_ids.length; i++) {
            var srt_prop = 1 / class_ids.length;
            var cum_prop = i / class_ids.length;
            var srk_prop = 1 / class_ids.length;
            var gap_prop = 1.0 - srk_prop;
            var rad_back = inner_rad + 1.0 * (outer_rad - inner_rad) / 2;
            var rad_frnt = inner_rad + srt_prop * (outer_rad - inner_rad) / 2;
            var wdt_back = 1.0 * (outer_rad - inner_rad);
            var wdt_frnt = srt_prop * (outer_rad - inner_rad);
            var srk_back = 2 * Math.PI * rad_back * srk_prop;
            var gap_back = 2 * Math.PI * rad_back * gap_prop;
            var off_back = 2 * Math.PI * rad_back * cum_prop;
            var srk_frnt = 2 * Math.PI * rad_frnt * srk_prop;
            var gap_frnt = 2 * Math.PI * rad_frnt * gap_prop;
            var off_frnt = 2 * Math.PI * rad_frnt * cum_prop;
            var ths_id = class_ids[i];
            var ths_col = class_defs[i]["color"];
            // TODO should names also go on the id dialog?
            // let ths_nam = class_defs[i]["name"];
            dialog_html += "\n            <circle\n                r=\"" + rad_back + "\" cx=\"" + center_coord + "\" cy=\"" + center_coord + "\" \n                stroke=\"" + ths_col + "\" \n                fill-opacity=\"0\"\n                stroke-opacity=\"" + cl_opacity + "\"\n                stroke-width=\"" + wdt_back + "\"; \n                stroke-dasharray=\"" + srk_back + " " + gap_back + "\" \n                stroke-dashoffset=\"" + off_back + "\" />\n            <circle\n                id=\"" + idd_id + "__circ_" + ths_id + "\"\n                r=\"" + rad_frnt + "\" cx=\"" + center_coord + "\" cy=\"" + center_coord + "\"\n                fill-opacity=\"0\"\n                stroke=\"" + ths_col + "\" \n                stroke-opacity=\"1.0\"\n                stroke-width=\"" + wdt_frnt + "\" \n                stroke-dasharray=\"" + srk_frnt + " " + gap_frnt + "\" \n                stroke-dashoffset=\"" + off_frnt + "\" />\n            ";
        }
        dialog_html += "\n            </svg>\n            <div class=\"centcirc\"></div>\n        </div>";
        return dialog_html;
    };
    ULabel.build_id_dialogs = function (ul) {
        var full_toolbox_html = "<div class=\"toolbox-id-app-payload\">";
        var wdt = ul.config["outer_diameter"];
        // TODO real names here!
        var inner_rad = ul.config["inner_prop"] * wdt / 2;
        var inner_diam = inner_rad * 2;
        var outer_rad = 0.5 * wdt;
        var inner_top = outer_rad - inner_rad;
        var inner_lft = outer_rad - inner_rad;
        var cl_opacity = 0.4;
        var tbid = ul.config["toolbox_id"];
        var center_coord = wdt / 2;
        for (var st in ul.subtasks) {
            var idd_id = ul.subtasks[st]["state"]["idd_id"];
            var idd_id_front = ul.subtasks[st]["state"]["idd_id_front"];
            var subtask_dialog_container_jq = jquery_1.default("#dialogs__" + st);
            var front_subtask_dialog_container_jq = jquery_1.default("#front_dialogs__" + st);
            var dialog_html_v2 = ULabel.get_idd_string(idd_id, wdt, center_coord, cl_opacity, ul.subtasks[st]["class_ids"], inner_rad, outer_rad, ul.subtasks[st]["class_defs"]);
            var front_dialog_html_v2 = ULabel.get_idd_string(idd_id_front, wdt, center_coord, cl_opacity, ul.subtasks[st]["class_ids"], inner_rad, outer_rad, ul.subtasks[st]["class_defs"]);
            // TODO noconflict
            var toolbox_html = "<div id=\"tb-id-app--" + st + "\" class=\"tb-id-app\">";
            var class_ids = ul.subtasks[st]["class_ids"];
            for (var i = 0; i < class_ids.length; i++) {
                var ths_id = class_ids[i];
                var ths_col = ul.subtasks[st]["class_defs"][i]["color"];
                var ths_nam = ul.subtasks[st]["class_defs"][i]["name"];
                var sel = "";
                var href = ' href="#"';
                if (i == 0) {
                    sel = " sel";
                    href = "";
                }
                if (ul.config["allow_soft_id"]) {
                    var msg = "Only hard id is currently supported";
                    throw new Error(msg);
                }
                else {
                    toolbox_html += "\n                        <a" + href + " id=\"" + tbid + "_sel_" + ths_id + "\" class=\"tbid-opt" + sel + "\">\n                            <div class=\"colprev " + tbid + "_colprev_" + ths_id + "\" style=\"background-color: " + ths_col + "\"></div> <span class=\"tb-cls-nam\">" + ths_nam + "</span>\n                        </a>\n                    ";
                }
            }
            toolbox_html += "\n            </div>";
            // Add dialog to the document
            // front_subtask_dialog_container_jq.append(dialog_html);
            // $("#" + ul.subtasks[st]["idd_id"]).attr("id", ul.subtasks[st]["idd_id_front"]);
            front_subtask_dialog_container_jq.append(front_dialog_html_v2); // TODO(new3d) MOVE THIS TO GLOB BOX -- superimpose atop thee anchor already there when needed, no remove and add back
            subtask_dialog_container_jq.append(dialog_html_v2);
            // console.log(dialog_html);
            // console.log(dialog_html_v2);
            // Wait to add full toolbox
            full_toolbox_html += toolbox_html;
            ul.subtasks[st]["state"]["visible_dialogs"][idd_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
        }
        // Add all toolbox html at once
        jquery_1.default("#" + ul.config["toolbox_id"] + " div.id-toolbox-app").html(full_toolbox_html);
        // Style revisions based on the size
        var idci = jquery_1.default("#" + ul.config["container_id"] + " a.id-dialog-clickable-indicator");
        idci.css({
            "height": wdt + "px",
            "width": wdt + "px",
            "border-radius": outer_rad + "px",
        });
        var ccirc = jquery_1.default("#" + ul.config["container_id"] + " div.centcirc");
        ccirc.css({
            "position": "absolute",
            "top": inner_top + "px",
            "left": inner_lft + "px",
            "width": inner_diam + "px",
            "height": inner_diam + "px",
            "background-color": "black",
            "border-radius": inner_rad + "px"
        });
    };
    ULabel.build_edit_suggestion = function (ul) {
        // TODO noconflict
        // DONE Migrated to subtasks
        for (var stkey in ul.subtasks) {
            var local_id = "edit_suggestion__" + stkey;
            var global_id = "global_edit_suggestion__" + stkey;
            var subtask_dialog_container_jq = jquery_1.default("#dialogs__" + stkey);
            // Local edit suggestion
            subtask_dialog_container_jq.append("\n                <a href=\"#\" id=\"" + local_id + "\" class=\"edit_suggestion editable\"></a>\n            ");
            jquery_1.default("#" + local_id).css({
                "height": ul.config["edit_handle_size"] + "px",
                "width": ul.config["edit_handle_size"] + "px",
                "border-radius": ul.config["edit_handle_size"] / 2 + "px"
            });
            // Global edit suggestion
            var id_edit = "";
            var mcm_ind = "";
            if (!ul.subtasks[stkey]["single_class_mode"]) {
                id_edit = "--><a href=\"#\" class=\"reid_suggestion global_sub_suggestion gedit-target\"></a><!--";
                mcm_ind = " mcm";
            }
            subtask_dialog_container_jq.append("\n                <div id=\"" + global_id + "\" class=\"global_edit_suggestion glob_editable gedit-target" + mcm_ind + "\">\n                    <a href=\"#\" class=\"move_suggestion global_sub_suggestion movable gedit-target\">\n                        <img class=\"movable gedit-target\" src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAdVBMVEX///8jHyAAAAD7+/sfGxwcFxhta2s3NDUEAABxcHBqaWnr6+seGRoSCw0yLzC0s7O6ubl4dncLAAN9fHz19fUsKCkWERInIyTW1dV5eHjBwMCko6ODgoJAPj7o5+jw7/BYVleLiopHRUXKysqtrK1PTE0/PD0MlkEbAAAF+ElEQVR4nO2d63aiMBRGIYJTWhyrKPZia2sv7/+IQ7QWYhLITcmXyf41yzWLOXs+GsDmHJLkqsz32X5+3X/yuhSkTEuyGLuMyzElKYVMxy7kUhRHwUaxGLuUyzA9CYaaYtEKhpkiIxii4pQVDO9ELc4FQ0uRSzC0FAUJhpXi7Y1QMJwUC5lgKClO5YJhpNgrGEKKwlU0pBQHEqTcQCv2LDIdReATVXqZOFO8HbtQU5QSRE5RMUHcFJUTRE1RYRVlFOFWVE1BPEVtQbRLv8Yig5miQYIHRZjlxijBgyLIRWMxdLMthzyOXbwKH+aCjeLH2OUrsJ1ZGM62Y5evwKK2MKwRTtNPq7P0c+zyFZisc2PBfD0Zu3wV7kpeUfSzyX+WZ3djF68Gr0jul5zO8v78dM5LEMFGMWUVyVMi+L1F8sR+mKcwgo1i1lUk98lEYDhJmBRhTtEj3RSbBCWGXUWoBCltik2CUsNWESxByinFg6DU8KQIlyDlrmwuB/lRUG7YKDb/EzOcVbTLakHI18Pxz3LD5OGLkMVqvDId0WMYCNEQn2iITzTEJxriEw3xiYb4REN8oiE+0RCfaIhPNMQnGuITDfGJhvhEQ3yiIT7RMABEe6LCojjfpzcD2pmvxC5flllLuSx3Y5d04KMqnh39uEy2L39aXrauDvtcVBZ7wxdkVpO1z5t5XteknpmP9Lk9LA95/uqyJqe85oetZcSwT+PU+VLWvqZ4V5fHEs0aitrOlzzzM8XOLlYTxW7vkp9bI5nN1vqKbHNWvvFP8Wyrta7iefeZf/s/2Y3W2op8e12+8eMKfWK34VoedAZQiPoH841Pe0BXqaBtRb0LVTwwZ+lT01UlbB9TTVE2rGN52aK1kJSolqJk5JFfjzvSGhVSlI5bqd8uXrc6b7LusWFFaYIpebhG6Yo8yMscUOwRvL9O7YpwbWGKijCCpopAgmaKUIImivI+euLn6N+5vGDhUz9YghS9FOWCMz8TpMylvf98inLB5naNqFPZ3p/vHjX+Nb67WJqixSwLlllp9zXhpLYZydCFTdGZYBP4u5XhticWTbqKfaeoLuWLleF36a6UVtFhgmma/bUy/Js5rOU0DMapoFeGPylWTgX9MkxJ1XdjYIZfhvRu5cvxIT0zLN8Sx0f0zTDNkr3D5flwRL8Msy+7kUCiQ/plSIcWBb+W/gfXwyR5DPaepjod1mWK5beVodP70qo9bpjPFlX3wO6eD3O758OVu+fDij2yq2f8wvYZf1U4esbnpvfJU8T8nqbi/3ZY37UJ5y+G9H2pIEEKWIq6CVKgFHsEJQlSgBTNBIEUTQVD+B3wgGCPIsjv8QcF0fdiKAhi7KeRzERXE0TeE6UoKNnXlvq/r01ZEHVvotZJ5v/+Uk5RJ0GK/3uEd+zccF1BhH3eTIr6ggh79Tspmggi9Fv8pqi3yLT43zOz29TmCVIeD31P/go2it+078niC8yL9a59v7vqIJ0v3v146OH7D326RXIB30Nq3FLnKfzN/M3YJbkl/F7uaIhPNMQnGuITDfGJhvhEQ3yiIT7REJ9oiE80xCca4hMN8YmG+ERDfKIhPtEQn2iISfDv5Q7+3eqnAapHRanhT9+Ef/tXB2kHqB4UZYa/jSF+bvDsoTsClzxJDTudL2ApsiNwmxTFhkxrD1SKZ0OMaYqidyM8sR8CpciMof5Jke/YXXLNWTnKisoLNpcD7hPRZyAn6mQt67oaJl8j3OhYDUuho0i8Z1FbGNbSDl6PeLcZijCzmzlxHeTtnQp41agqxWKkj3lbwXW5lfQ/DnJj+K6R6yPqX1QR1Bj9PzZGimavUhkL6WR3OepvNvAD7RSxEqRoKuIJJkmho4i0yLRoXDRwLhMsyiliJkhRTBE1QYpSirgJUhRWVMRVtMvgpR/tQs8zkCL2KXqkVxE/QUrPcqPzIjGfkV40wkiQIkkxlAQpwhTDSZAiGMwUUoIUbkUNK0HKWYqhJUhhFEMUZG7gwjtFj/ymGGaClJ8UQ02QsiBZmpm/KByB+T7bX3ko8T9Zz1H5wFZx8QAAAABJRU5ErkJggg==\">\n                    </a><!--\n                    " + id_edit + "\n                    --><a href=\"#\" class=\"delete_suggestion global_sub_suggestion gedit-target\">\n                        <span class=\"bigx gedit-target\">&#215;</span>\n                    </a>\n                </div>\n            ");
            // Register these dialogs with each subtask
            ul.subtasks[stkey]["state"]["visible_dialogs"][local_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
            ul.subtasks[stkey]["state"]["visible_dialogs"][global_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
        }
    };
    ULabel.create_listeners = function (ul) {
        // ================= Mouse Events in the ID Dialog ================= 
        var _this = this;
        var iddg = jquery_1.default(".id_dialog");
        // Hover interactions
        iddg.on("mousemove", function (mouse_event) {
            var crst = ul.state["current_subtask"];
            if (!ul.subtasks[crst]["state"]["idd_thumbnail"]) {
                ul.handle_id_dialog_hover(mouse_event);
            }
        });
        // Clicks
        // TODO
        // ================= Mouse Events in the Annotation Container ================= 
        var annbox = jquery_1.default("#" + ul.config["annbox_id"]);
        // Detect and record mousedown
        annbox.mousedown(function (mouse_event) {
            ul.handle_mouse_down(mouse_event);
        });
        // Detect and record mouseup
        jquery_1.default(window).mouseup(function (mouse_event) {
            ul.handle_mouse_up(mouse_event);
        });
        jquery_1.default(window).on("click", function (e) {
            if (e.shiftKey) {
                e.preventDefault();
            }
        });
        // Mouse movement has meaning in certain cases
        annbox.mousemove(function (mouse_event) {
            ul.handle_mouse_move(mouse_event);
        });
        // Detection ctrl+scroll
        document.getElementById(ul.config["annbox_id"]).onwheel = function (wheel_event) {
            var fms = ul.config["image_data"].frames.length > 1;
            if (wheel_event.ctrlKey || wheel_event.shiftKey || wheel_event.metaKey) {
                // Prevent scroll-zoom
                wheel_event.preventDefault();
                // Don't rezoom if id dialog is visible
                if (ul.subtasks[ul.state["current_subtask"]]["state"]["idd_visible"] && !ul.subtasks[ul.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                    return;
                }
                // Get direction of wheel
                var dlta = Math.sign(wheel_event.deltaY);
                // Apply new zoom
                ul.state["zoom_val"] *= (1 - dlta / 10);
                ul.rezoom(wheel_event.clientX, wheel_event.clientY);
            }
            else if (fms) {
                wheel_event.preventDefault();
                // Get direction of wheel
                var dlta = Math.sign(wheel_event.deltaY);
                ul.update_frame(dlta);
            }
            else {
                // Don't scroll if id dialog is visible
                if (ul.subtasks[ul.state["current_subtask"]]["state"]["idd_visible"] && !ul.subtasks[ul.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                    wheel_event.preventDefault();
                    return;
                }
            }
        };
        // TODO better understand which browsers support this (new Chrome does)
        new ResizeObserver(function () {
            ul.reposition_dialogs();
        }).observe(document.getElementById(ul.config["imwrap_id"]));
        new ResizeObserver(function () {
            ul.handle_toolbox_overflow();
        }).observe(document.getElementById(ul.config["container_id"]));
        // Buttons to change annotation mode
        jquery_1.default(document).on("click", "a.md-btn", function (e) {
            var tgt_jq = jquery_1.default(e.currentTarget);
            var crst = ul.state["current_subtask"];
            if (tgt_jq.hasClass("sel") || ul.subtasks[crst]["state"]["is_in_progress"])
                return;
            var new_mode = tgt_jq.attr("id").split("--")[1];
            ul.subtasks[crst]["state"]["annotation_mode"] = new_mode;
            jquery_1.default("a.md-btn.sel").attr("href", "#");
            jquery_1.default("a.md-btn.sel").removeClass("sel");
            tgt_jq.addClass("sel");
            tgt_jq.removeAttr("href");
            ul.show_annotation_mode(tgt_jq);
        });
        jquery_1.default(document).on("click", "#" + ul.config["toolbox_id"] + " .zbutt", function (e) {
            var tgt_jq = jquery_1.default(e.currentTarget);
            if (tgt_jq.hasClass("zin")) {
                ul.state["zoom_val"] *= 1.1;
            }
            else if (tgt_jq.hasClass("zout")) {
                ul.state["zoom_val"] /= 1.1;
            }
            ul.rezoom();
        });
        jquery_1.default(document).on("click", "#" + ul.config["toolbox_id"] + " .pbutt", function (e) {
            var tgt_jq = jquery_1.default(e.currentTarget);
            var annbox = jquery_1.default("#" + ul.config["annbox_id"]);
            if (tgt_jq.hasClass("up")) {
                annbox.scrollTop(annbox.scrollTop() - 20);
            }
            else if (tgt_jq.hasClass("down")) {
                annbox.scrollTop(annbox.scrollTop() + 20);
            }
            else if (tgt_jq.hasClass("left")) {
                annbox.scrollLeft(annbox.scrollLeft() - 20);
            }
            else if (tgt_jq.hasClass("right")) {
                annbox.scrollLeft(annbox.scrollLeft() + 20);
            }
        });
        jquery_1.default(document).on("click", "#" + ul.config["toolbox_id"] + " .wbutt", function (e) {
            var tgt_jq = jquery_1.default(e.currentTarget);
            if (tgt_jq.hasClass("win")) {
                ul.state["line_size"] *= 1.1;
            }
            else if (tgt_jq.hasClass("wout")) {
                ul.state["line_size"] /= 1.1;
            }
            ul.redraw_demo();
        });
        jquery_1.default(document).on("click", "#" + ul.config["toolbox_id"] + " .setting a", function (e) {
            var tgt_jq = jquery_1.default(e.currentTarget);
            if (!e.currentTarget.hasAttribute("href"))
                return;
            if (tgt_jq.hasClass("fixed-setting")) {
                jquery_1.default("#" + ul.config["toolbox_id"] + " .setting a.fixed-setting").removeAttr("href");
                jquery_1.default("#" + ul.config["toolbox_id"] + " .setting a.dyn-setting").attr("href", "#");
                ul.state["line_size"] = ul.state["line_size"] * ul.state["zoom_val"];
                ul.state["size_mode"] = "fixed";
            }
            else if (tgt_jq.hasClass("dyn-setting")) {
                jquery_1.default("#" + ul.config["toolbox_id"] + " .setting a.dyn-setting").removeAttr("href");
                jquery_1.default("#" + ul.config["toolbox_id"] + " .setting a.fixed-setting").attr("href", "#");
                ul.state["line_size"] = ul.get_line_size();
                ul.state["size_mode"] = "dynamic";
            }
            ul.redraw_demo();
        });
        // Listener for soft id toolbox buttons
        jquery_1.default(document).on("click", "#" + ul.config["toolbox_id"] + ' a.tbid-opt', function (e) {
            var tgt_jq = jquery_1.default(e.currentTarget);
            var pfx = "div#tb-id-app--" + ul.state["current_subtask"];
            var crst = ul.state["current_subtask"];
            if (tgt_jq.attr("href") == "#") {
                jquery_1.default(pfx + " a.tbid-opt.sel").attr("href", "#");
                jquery_1.default(pfx + " a.tbid-opt.sel").removeClass("sel");
                tgt_jq.addClass("sel");
                tgt_jq.removeAttr("href");
                var idarr = tgt_jq.attr("id").split("_");
                var rawid = parseInt(idarr[idarr.length - 1]);
                ul.set_id_dialog_payload_nopin(ul.subtasks[crst]["class_ids"].indexOf(rawid), 1.0);
                ul.update_id_dialog_display();
            }
        });
        jquery_1.default(document).on("click", "a.tb-st-switch[href]", function (e) {
            var switch_to = jquery_1.default(e.target).attr("id").split("--")[1];
            // Ignore if in the middle of annotation
            if (ul.subtasks[ul.state["current_subtask"]]["state"]["is_in_progress"]) {
                return;
            }
            ul.set_subtask(switch_to);
        });
        jquery_1.default(document).on("input", "input.frame_input", function () {
            ul.update_frame();
        });
        jquery_1.default(document).on("input", "span.tb-st-range input", function () {
            ul.readjust_subtask_opacities();
        });
        jquery_1.default(document).on("click", "div.fad_row.add a.add-glob-button", function () {
            ul.create_nonspatial_annotation();
        });
        jquery_1.default(document).on("focus", "textarea.nonspatial_note", function () {
            jquery_1.default("div.frame_annotation_dialog.active").addClass("permopen");
        });
        jquery_1.default(document).on("focusout", "textarea.nonspatial_note", function () {
            jquery_1.default("div.frame_annotation_dialog.permopen").removeClass("permopen");
        });
        jquery_1.default(document).on("input", "textarea.nonspatial_note", function (e) {
            // Update annotation's text field
            ul.subtasks[ul.state["current_subtask"]]["annotations"]["access"][e.target.id.substring("note__".length)]["text_payload"] = e.target.value;
        });
        jquery_1.default(document).on("click", "a.fad_button.delete", function (e) {
            ul.delete_annotation(e.target.id.substring("delete__".length));
        });
        jquery_1.default(document).on("click", "a.fad_button.reclf", function (e) {
            // Show idd
            ul.show_id_dialog(e.pageX, e.pageY, e.target.id.substring("reclf__".length), false, true);
        });
        jquery_1.default(document).on("mouseenter", "div.fad_annotation_rows div.fad_row", function (e) {
            // Show thumbnail for idd
            ul.suggest_edits(null, jquery_1.default(e.currentTarget).attr("id").substring("row__".length));
        });
        jquery_1.default(document).on("mouseleave", "div.fad_annotation_rows div.fad_row", function () {
            // Show thumbnail for idd
            if (ul.subtasks[ul.state["current_subtask"]]["state"]["idd_visible"] && !ul.subtasks[ul.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                return;
            }
            ul.suggest_edits(null);
        });
        // Listener for id_dialog click interactions
        jquery_1.default(document).on("click", "#" + ul.config["container_id"] + " a.id-dialog-clickable-indicator", function (e) {
            var crst = ul.state["current_subtask"];
            if (!ul.subtasks[crst]["state"]["idd_thumbnail"]) {
                ul.handle_id_dialog_click(e);
            }
            else {
                // It's always covered up as a thumbnail. See below
            }
        });
        jquery_1.default(document).on("click", ".global_edit_suggestion a.reid_suggestion", function (e) {
            var crst = ul.state["current_subtask"];
            var annid = ul.subtasks[crst]["state"]["idd_associated_annotation"];
            ul.hide_global_edit_suggestion();
            ul.show_id_dialog(ul.get_global_mouse_x(e), ul.get_global_mouse_y(e), annid, false);
        });
        jquery_1.default(document).on("click", "#" + ul.config["annbox_id"] + " .delete_suggestion", function () {
            var crst = ul.state["current_subtask"];
            ul.delete_annotation(ul.subtasks[crst]["state"]["move_candidate"]["annid"]);
        });
        // Button to save annotations
        jquery_1.default(document).on("click", "a#submit-button[href=\"#\"]", function () { return __awaiter(_this, void 0, void 0, function () {
            var submit_payload, stkey, i, save_success, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        submit_payload = {
                            "task_meta": ul.config["task_meta"],
                            "annotations": {}
                        };
                        for (stkey in ul.subtasks) {
                            submit_payload["annotations"][stkey] = [];
                            for (i = 0; i < ul.subtasks[stkey]["annotations"]["ordering"].length; i++) {
                                submit_payload["annotations"][stkey].push(ul.subtasks[stkey]["annotations"]["access"][ul.subtasks[stkey]["annotations"]["ordering"][i]]);
                            }
                        }
                        ul.set_saved(false, true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, ul.config["done_callback"].bind(ul)(submit_payload)];
                    case 2:
                        save_success = _a.sent();
                        ul.set_saved(!(save_success === false));
                        return [3 /*break*/, 4];
                    case 3:
                        err_1 = _a.sent();
                        console.log("Error waiting for submit script.");
                        console.log(err_1);
                        ul.set_saved(false);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        jquery_1.default(document).on("click", "#" + ul.config["toolbox_id"] + " a.night-button", function () {
            if (jquery_1.default("#" + ul.config["container_id"]).hasClass("ulabel-night")) {
                jquery_1.default("#" + ul.config["container_id"]).removeClass("ulabel-night");
                // Destroy any night cookie
                ULabel.destroy_night_mode_cookie();
            }
            else {
                jquery_1.default("#" + ul.config["container_id"]).addClass("ulabel-night");
                // Drop a night cookie
                ULabel.set_night_mode_cookie();
            }
        });
        // Keyboard only events
        document.addEventListener("keydown", function (keypress_event) {
            var shift = keypress_event.shiftKey;
            var ctrl = keypress_event.ctrlKey || keypress_event.metaKey;
            var fms = ul.config["image_data"].frames.length > 1;
            var annbox = jquery_1.default("#" + ul.config["annbox_id"]);
            if (ctrl &&
                (keypress_event.key == "z" ||
                    keypress_event.key == "Z" ||
                    keypress_event.code == "KeyZ")) {
                keypress_event.preventDefault();
                if (shift) {
                    ul.redo();
                }
                else {
                    ul.undo();
                }
                return false;
            }
            else if (ctrl &&
                (keypress_event.key == "s" ||
                    keypress_event.key == "S" ||
                    keypress_event.code == "KeyS")) {
                keypress_event.preventDefault();
                jquery_1.default("a#submit-button").trigger("click");
            }
            else if (keypress_event.key == "l") {
                // console.log("Listing annotations using the \"l\" key has been deprecated.");
                // console.log(ul.annotations);
            }
            else if (keypress_event.key == "ArrowRight") {
                if (fms) {
                    ul.update_frame(1);
                }
                else {
                    annbox.scrollLeft(annbox.scrollLeft() + 20);
                }
            }
            else if (keypress_event.key == "ArrowDown") {
                if (fms) {
                    ul.update_frame(1);
                }
                else {
                    annbox.scrollTop(annbox.scrollTop() + 20);
                }
            }
            else if (keypress_event.key == "ArrowLeft") {
                if (fms) {
                    ul.update_frame(-1);
                }
                else {
                    annbox.scrollLeft(annbox.scrollLeft() - 20);
                }
            }
            else if (keypress_event.key == "ArrowUp") {
                if (fms) {
                    ul.update_frame(-1);
                }
                else {
                    annbox.scrollTop(annbox.scrollTop() - 20);
                }
            }
            else {
                // console.log(keypress_event);
            }
        });
        window.addEventListener("beforeunload", function (e) {
            var confirmationMessage = '';
            if (ul.state["edited"]) {
                confirmationMessage = 'You have made unsave changes. Are you sure you would like to leave?';
                (e || window.event).returnValue = confirmationMessage; //Gecko + IE
                return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
            }
        });
    };
    ULabel.process_allowed_modes = function (ul, subtask_key, subtask) {
        // TODO(v1) check to make sure these are known modes
        ul.subtasks[subtask_key]["allowed_modes"] = subtask["allowed_modes"];
    };
    ULabel.process_classes = function (ul, subtask_key, subtask) {
        // Check to make sure allowed classes were provided
        if (!("classes" in subtask)) {
            throw new Error("classes not specified for subtask \"" + subtask_key + "\"");
        }
        if (typeof subtask["classes"] != 'object' || subtask["classes"].length == undefined || subtask["classes"].length == 0) {
            throw new Error("classes has an invalid value for subtask \"" + subtask_key + "\"");
        }
        // Set to single class mode if applicable
        ul.subtasks[subtask_key]["single_class_mode"] = (subtask["classes"].length == 1);
        // Populate allowed classes vars
        // TODO might be nice to recognize duplicate classes and assign same color... idk
        // TODO better handling of default class ids would definitely be a good idea
        ul.subtasks[subtask_key]["class_defs"] = [];
        ul.subtasks[subtask_key]["class_ids"] = [];
        for (var i = 0; i < subtask["classes"].length; i++) {
            if (typeof subtask["classes"][i] == "string") {
                var name_1 = subtask["classes"][i];
                ul.subtasks[subtask_key]["class_defs"].push({
                    "name": name_1,
                    "color": blobs_1.COLORS[ul.tot_num_classes],
                    "id": ul.tot_num_classes
                });
                ul.subtasks[subtask_key]["class_ids"].push(ul.tot_num_classes);
            }
            else if (typeof subtask["classes"][i] == 'object') {
                // Start with default object
                var repl = {
                    "name": "Class " + ul.tot_num_classes,
                    "color": blobs_1.COLORS[ul.tot_num_classes],
                    "id": ul.tot_num_classes
                };
                // Populate with what we have
                if ("name" in subtask["classes"][i]) {
                    repl["name"] = subtask["classes"][i]["name"];
                }
                if ("color" in subtask["classes"][i]) {
                    repl["color"] = subtask["classes"][i]["color"];
                }
                if ("id" in subtask["classes"][i]) {
                    repl["id"] = subtask["classes"][i]["id"];
                }
                // Push finished product to list
                ul.subtasks[subtask_key]["class_defs"].push(repl);
                ul.subtasks[subtask_key]["class_ids"].push(repl["id"]);
            }
            else {
                throw new Error("Entry in classes not understood: " + subtask["classes"][i]);
            }
            ul.tot_num_classes++;
        }
    };
    ULabel.process_resume_from = function (ul, subtask_key, subtask) {
        // Initialize to no annotations
        ul.subtasks[subtask_key]["annotations"] = {
            "ordering": [],
            "access": {}
        };
        if (subtask["resume_from"] != null) {
            for (var i = 0; i < subtask["resume_from"].length; i++) {
                var current_annotation = annotation_1.ULabelAnnotation.from_json(JSON.parse(JSON.stringify(subtask["resume_from"][i])));
                // Set new to false
                current_annotation["new"] = false;
                // Test for line_size
                if (current_annotation["line_size"] == null) {
                    current_annotation["line_size"] = ul.state["line_size"];
                }
                // Ensure that spatial type is allowed
                // TODO do I really want to do this?
                // Ensure that classification payloads are compatible with config
                current_annotation.ensure_compatible_classification_payloads(ul.subtasks[subtask_key]["class_ids"]);
                // Push to ordering and add to access
                ul.subtasks[subtask_key]["annotations"]["ordering"].push(subtask["resume_from"][i]["id"]);
                ul.subtasks[subtask_key]["annotations"]["access"][subtask["resume_from"][i]["id"]] = current_annotation;
            }
        }
    };
    ULabel.initialize_subtasks = function (ul, stcs) {
        var first_non_ro = null;
        for (var subtask_key in stcs) {
            // For convenience, make a raw subtask var
            var raw_subtask = stcs[subtask_key];
            ul.subtasks[subtask_key] = subtask_1.ULabelSubtask.from_json(subtask_key, raw_subtask);
            if (first_non_ro == null && !ul.subtasks[subtask_key]["read_only"]) {
                first_non_ro = subtask_key;
            }
            // Process allowed_modes
            // They are placed in ul.subtasks[subtask_key]["allowed_modes"]
            ULabel.process_allowed_modes(ul, subtask_key, raw_subtask);
            // Process allowed classes
            // They are placed in ul.subtasks[subtask_key]["class_defs"]
            ULabel.process_classes(ul, subtask_key, raw_subtask);
            // Process imported annoations
            // They are placed in ul.subtasks[subtask_key]["annotations"]
            ULabel.process_resume_from(ul, subtask_key, raw_subtask);
            // Label canvasses and initialize context with null
            ul.subtasks[subtask_key]["canvas_fid"] = ul.config["canvas_fid_pfx"] + "__" + subtask_key;
            ul.subtasks[subtask_key]["canvas_bid"] = ul.config["canvas_bid_pfx"] + "__" + subtask_key;
            // Store state of ID dialog element
            // TODO much more here when full interaction is built
            var id_payload = [];
            for (var i = 0; i < ul.subtasks[subtask_key]["class_ids"].length; i++) {
                id_payload.push(1 / ul.subtasks[subtask_key]["class_ids"].length);
            }
            ul.subtasks[subtask_key]["state"] = {
                // Id dialog state
                "idd_id": "id_dialog__" + subtask_key,
                "idd_id_front": "id_dialog_front__" + subtask_key,
                "idd_visible": false,
                "idd_associated_annotation": null,
                "idd_thumbnail": false,
                "id_payload": id_payload,
                "first_explicit_assignment": false,
                // Annotation state
                "annotation_mode": ul.subtasks[subtask_key]["allowed_modes"][0],
                "active_id": null,
                "is_in_progress": false,
                "is_in_edit": false,
                "is_in_move": false,
                "edit_candidate": null,
                "move_candidate": null,
                // Rendering context
                "front_context": null,
                "back_context": null,
                // Generic dialogs
                "visible_dialogs": {}
            };
        }
        if (first_non_ro == null) {
            ul.raise_error("You must have at least one subtask without 'read_only' set to true.", ULabel.elvl_fatal);
        }
    };
    ULabel.expand_image_data = function (ul, raw_img_dat) {
        if (typeof raw_img_dat == "string") {
            return {
                spacing: {
                    x: 1,
                    y: 1,
                    z: 1,
                    units: "pixels"
                },
                frames: [
                    raw_img_dat
                ]
            };
        }
        else if (Array.isArray(raw_img_dat)) {
            return {
                spacing: {
                    x: 1,
                    y: 1,
                    z: 1,
                    units: "pixels"
                },
                frames: raw_img_dat
            };
        }
        else if ("spacing" in raw_img_dat && "frames" in raw_img_dat) {
            return raw_img_dat;
        }
        else {
            ul.raise_error("Image data object not understood. Must be of form \"http://url.to/img\" OR [\"img1\", \"img2\", ...] OR {spacing: {x: <num>, y: <num>, z: <num>, units: <str>}, frames: [\"img1\", \"img2\", ...]}. Provided: " + JSON.stringify(raw_img_dat), ULabel.elvl_fatal);
            return null;
        }
    };
    ULabel.load_image_promise = function (img_el) {
        return new Promise(function (resolve, reject) {
            try {
                img_el.onload = function () {
                    resolve(img_el);
                };
            }
            catch (err) {
                reject(err);
            }
        });
    };
    ULabel.prototype.init = function (callback) {
        var _this = this;
        // Add stylesheet
        ULabel.add_style_to_document(this);
        var that = this;
        that.state["current_subtask"] = Object.keys(that.subtasks)[0];
        // Place image element
        ULabel.prep_window_html(this);
        // Detect night cookie
        if (ULabel.has_night_mode_cookie()) {
            jquery_1.default("#" + this.config["container_id"]).addClass("ulabel-night");
        }
        var images = [document.getElementById(this.config["image_id_pfx"] + "__0")];
        var mappable_images = [];
        for (var i = 0; i < images.length; i++) {
            mappable_images.push(images[i]);
            break;
        }
        var image_promises = mappable_images.map(ULabel.load_image_promise);
        Promise.all(image_promises).then(function (loaded_imgs) {
            // Store image dimensions
            that.config["image_height"] = loaded_imgs[0].naturalHeight;
            that.config["image_width"] = loaded_imgs[0].naturalWidth;
            // Add canvasses for each subtask and get their rendering contexts
            for (var st in that.subtasks) {
                jquery_1.default("#" + that.config["imwrap_id"]).append("\n                <div id=\"canvasses__" + st + "\" class=\"canvasses\">\n                    <canvas \n                        id=\"" + that.subtasks[st]["canvas_bid"] + "\" \n                        class=\"" + that.config["canvas_class"] + " " + that.config["imgsz_class"] + " canvas_cls\" \n                        height=" + that.config["image_height"] * _this.config["px_per_px"] + " \n                        width=" + that.config["image_width"] * _this.config["px_per_px"] + "></canvas>\n                    <canvas \n                        id=\"" + that.subtasks[st]["canvas_fid"] + "\" \n                        class=\"" + that.config["canvas_class"] + " " + that.config["imgsz_class"] + " canvas_cls\" \n                        height=" + that.config["image_height"] * _this.config["px_per_px"] + " \n                        width=" + that.config["image_width"] * _this.config["px_per_px"] + " \n                        oncontextmenu=\"return false\"></canvas>\n                    <div id=\"dialogs__" + st + "\" class=\"dialogs_container\"></div>\n                </div>\n                ");
                jquery_1.default("#" + that.config["container_id"] + (" div#fad_st__" + st)).append("\n                    <div id=\"front_dialogs__" + st + "\" class=\"front_dialogs\"></div>\n                ");
                // Get canvas contexts
                that.subtasks[st]["state"]["back_context"] = document.getElementById(that.subtasks[st]["canvas_bid"]).getContext("2d");
                that.subtasks[st]["state"]["front_context"] = document.getElementById(that.subtasks[st]["canvas_fid"]).getContext("2d");
            }
            // Get rendering context for demo canvas
            that.state["demo_canvas_context"] = document.getElementById(that.config["canvas_did"]).getContext("2d");
            // Add the ID dialogs' HTML to the document
            ULabel.build_id_dialogs(that);
            // Add the HTML for the edit suggestion to the window
            ULabel.build_edit_suggestion(that);
            // Create listers to manipulate and export this object
            ULabel.create_listeners(that);
            that.handle_toolbox_overflow();
            // Set the canvas elements in the correct stacking order given current subtask
            that.set_subtask(that.state["current_subtask"]);
            // Indicate that the object is now init!
            that.is_init = true;
            jquery_1.default("div#" + _this.config["container_id"]).css("display", "block");
            _this.show_initial_crop();
            _this.update_frame();
            // Draw demo annotation
            that.redraw_demo();
            // Draw resumed from annotations
            that.redraw_all_annotations();
            // Call the user-provided callback
            callback();
        }).catch(function (err) {
            console.log(err);
            _this.raise_error("Unable to load images: " + JSON.stringify(err), ULabel.elvl_fatal);
        });
    };
    ULabel.prototype.version = function () {
        return ULabel.version();
    };
    ULabel.prototype.handle_toolbox_overflow = function () {
        var tabs_height = jquery_1.default("#" + this.config["container_id"] + " div.toolbox-tabs").height();
        jquery_1.default("#" + this.config["container_id"] + " div.toolbox_inner_cls").css("height", "calc(100% - " + (tabs_height + 38) + "px)");
        var view_height = jquery_1.default("#" + this.config["container_id"] + " div.toolbox_cls")[0].scrollHeight - 38 - tabs_height;
        var want_height = jquery_1.default("#" + this.config["container_id"] + " div.toolbox_inner_cls")[0].scrollHeight;
        if (want_height <= view_height) {
            jquery_1.default("#" + this.config["container_id"] + " div.toolbox_inner_cls").css("overflow-y", "hidden");
        }
        else {
            jquery_1.default("#" + this.config["container_id"] + " div.toolbox_inner_cls").css("overflow-y", "scroll");
        }
    };
    // A ratio of viewport height to image height
    ULabel.prototype.get_viewport_height_ratio = function (hgt) {
        return jquery_1.default("#" + this.config["annbox_id"]).height() / hgt;
    };
    // A ratio of viewport width to image width
    ULabel.prototype.get_viewport_width_ratio = function (wdt) {
        return jquery_1.default("#" + this.config["annbox_id"]).width() / wdt;
    };
    // The zoom ratio which fixes the entire image exactly in the viewport
    ULabel.prototype.show_initial_crop = function () {
        var wdt = this.config["image_width"];
        var hgt = this.config["image_height"];
        var lft_cntr = 0;
        var top_cntr = 0;
        var initcrp = this.config["initial_crop"];
        if (initcrp != null) {
            if ("width" in initcrp &&
                "height" in initcrp &&
                "left" in initcrp &&
                "top" in initcrp) {
                wdt = initcrp["width"];
                hgt = initcrp["height"];
                lft_cntr = initcrp["left"] + initcrp["width"] / 2;
                top_cntr = initcrp["top"] + initcrp["height"] / 2;
            }
            else {
                this.raise_error("Initial crop must contain properties \"width\", \"height\", \"left\", and \"top\". Ignoring.", ULabel.elvl_info);
            }
        }
        this.state["zoom_val"] = Math.min(this.get_viewport_height_ratio(hgt), this.get_viewport_width_ratio(wdt));
        this.rezoom(lft_cntr, top_cntr, true);
        return;
    };
    // ================== Cursor Helpers ====================
    ULabel.prototype.update_cursor = function () {
        var color = this.get_annotation_color(null, true);
        var thr_width = this.get_line_size() * this.state["zoom_val"];
        var width = Math.max(Math.min(thr_width, 64), 6);
        var cursor_svg = "<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" width=\"" + width + "px\" height=\"" + width + "px\" viewBox=\"0 0 " + width + " " + width + "\">\n            <circle cx=\"" + width / 2 + "\" cy=\"" + width / 2 + "\" r=\"" + width / 2 + "\" opacity=\"0.8\" stroke=\"white\" fill=\"" + color + "\" />\n        </svg>";
        var bk_width = Math.max(Math.min(thr_width, 32), 6);
        var bk_cursor_svg = "<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" width=\"" + bk_width + "px\" height=\"" + bk_width + "px\" viewBox=\"0 0 " + bk_width + " " + bk_width + "\">\n            <circle cx=\"" + bk_width / 2 + "\" cy=\"" + bk_width / 2 + "\" r=\"" + bk_width / 2 + "\" opacity=\"0.8\" stroke=\"" + color + "\" fill=\"" + color + "\" />\n        </svg>";
        var cursor_b64 = btoa(cursor_svg);
        var bk_cursor_b64 = btoa(bk_cursor_svg);
        jquery_1.default("#" + this.config["annbox_id"]).css("cursor", "url(data:image/svg+xml;base64," + cursor_b64 + ") " + width / 2 + " " + width / 2 + ", url(data:image/svg+xml;base64," + bk_cursor_b64 + ") " + bk_width / 2 + " " + bk_width / 2 + ", auto");
    };
    // ================== Subtask Helpers ===================
    ULabel.prototype.readjust_subtask_opacities = function () {
        for (var st_key in this.subtasks) {
            var sliderval = jquery_1.default("#tb-st-range--" + st_key).val();
            jquery_1.default("div#canvasses__" + st_key).css("opacity", sliderval / 100);
        }
    };
    ULabel.prototype.set_subtask = function (st_key) {
        var old_st = this.state["current_subtask"];
        // Change object state
        this.state["current_subtask"] = st_key;
        // Bring new set of canvasses out to front
        jquery_1.default("div.canvasses").css("z-index", 75);
        jquery_1.default("div#canvasses__" + this.state["current_subtask"]).css("z-index", 100);
        // Show appropriate set of dialogs
        jquery_1.default("div.dialogs_container").css("display", "none");
        jquery_1.default("div#dialogs__" + this.state["current_subtask"]).css("display", "block");
        // Show appropriate set of annotation modes
        jquery_1.default("a.md-btn").css("display", "none");
        jquery_1.default("a.md-btn.md-en4--" + st_key).css("display", "inline-block");
        // Show appropriate set of class options
        jquery_1.default("div.tb-id-app").css("display", "none");
        jquery_1.default("div#tb-id-app--" + this.state["current_subtask"]).css("display", "block");
        // Adjust tab buttons in toolbox
        jquery_1.default("a#tb-st-switch--" + old_st).attr("href", "#");
        jquery_1.default("a#tb-st-switch--" + old_st).parent().removeClass("sel");
        jquery_1.default("input#tb-st-range--" + old_st).val(Math.round(100 * this.subtasks[old_st]["inactive_opacity"]));
        jquery_1.default("a#tb-st-switch--" + st_key).removeAttr("href");
        jquery_1.default("a#tb-st-switch--" + st_key).parent().addClass("sel");
        jquery_1.default("input#tb-st-range--" + st_key).val(100);
        // Update toolbox opts
        this.update_annotation_mode();
        this.update_current_class();
        // Set transparancy for inactive layers
        this.readjust_subtask_opacities();
        // Redraw demo
        this.redraw_demo();
    };
    // ================= Toolbox Functions ==================
    ULabel.prototype.update_annotation_mode = function () {
        jquery_1.default("a.md-btn.sel").attr("href", "#");
        jquery_1.default("a.md-btn.sel").removeClass("sel");
        jquery_1.default("a#md-btn--" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).addClass("sel");
        jquery_1.default("a#md-btn--" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).removeAttr("href");
        this.show_annotation_mode();
    };
    ULabel.prototype.update_current_class = function () {
        this.update_id_toolbox_display();
        // $("a.tbid-opt.sel").attr("href", "#");
        // $("a.tbid-opt.sel").removeClass("sel");
        // $("a#toolbox_sel_" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).addClass("sel");
        // $("a#toolbox_sel_" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).removeAttr("href");
    };
    // Show annotation mode
    ULabel.prototype.show_annotation_mode = function (el) {
        if (el === void 0) { el = null; }
        if (el == null) {
            el = jquery_1.default("a.md-btn.sel");
        }
        var new_name = el.attr("amdname");
        jquery_1.default("#" + this.config["toolbox_id"] + " .current_mode").html(new_name);
        jquery_1.default("div.frame_annotation_dialog:not(.fad_st__" + this.state["current_subtask"] + ")").removeClass("active");
        if (["whole-image", "global"].includes(this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"])) {
            jquery_1.default("div.frame_annotation_dialog.fad_st__" + this.state["current_subtask"]).addClass("active");
        }
        else {
            jquery_1.default("div.frame_annotation_dialog").removeClass("active");
        }
    };
    // Draw demo annotation in demo canvas
    ULabel.prototype.redraw_demo = function () {
        this.state["demo_canvas_context"].clearRect(0, 0, this.config["demo_width"] * this.config["px_per_px"], this.config["demo_height"] * this.config["px_per_px"]);
        this.draw_annotation(blobs_1.DEMO_ANNOTATION, "demo_canvas_context", true, null, "demo");
        this.update_cursor();
    };
    // ================= Instance Utilities =================
    // A robust measure of zoom
    ULabel.prototype.get_empirical_scale = function () {
        // Simple ratio of canvas width to image x-dimension
        return jquery_1.default("#" + this.config["imwrap_id"]).width() / this.config["image_width"];
    };
    // Get a unique ID for new annotations
    ULabel.prototype.make_new_annotation_id = function () {
        var unq_str = uuidv4();
        return unq_str;
    };
    // Get the start of a spatial payload based on mouse event and current annotation mode
    ULabel.prototype.get_init_spatial = function (gmx, gmy, annotation_mode) {
        switch (annotation_mode) {
            case "point":
                return [
                    [gmx, gmy]
                ];
            case "bbox":
            case "polygon":
            case "polyline":
            case "contour":
            case "tbar":
                return [
                    [gmx, gmy],
                    [gmx, gmy]
                ];
            case "bbox3":
                return [
                    [gmx, gmy, this.state["current_frame"]],
                    [gmx, gmy, this.state["current_frame"]]
                ];
            default:
                // TODO broader refactor of error handling and detecting/preventing corruption
                this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                return null;
        }
    };
    ULabel.prototype.get_init_id_payload = function () {
        this.set_id_dialog_payload_to_init(null);
        return JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]));
    };
    // ================= Access string utilities =================
    // Access a point in a spatial payload using access string
    // Optional arg at the end is for finding position of a moved splice point through its original access string
    ULabel.prototype.get_with_access_string = function (annid, access_str, as_though_pre_splice) {
        if (as_though_pre_splice === void 0) { as_though_pre_splice = false; }
        // TODO(3d)
        var bbi, bbj, bbk, bbox_pts, ret, bas, dif, tbi, tbj, tbar_pts;
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"]) {
            case "bbox":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                bbox_pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"];
                return [bbox_pts[bbi][0], bbox_pts[bbj][1]];
            case "point":
                return JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"]));
            case "bbox3":
                // TODO(3d)
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                bbox_pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"];
                ret = [bbox_pts[bbi][0], bbox_pts[bbj][1]];
                if (access_str.length > 2) {
                    bbk = parseInt(access_str[2], 10);
                    ret.push(bbox_pts[bbk][2]);
                }
                return ret;
            case "polygon":
            case "polyline":
                bas = parseInt(access_str, 10);
                dif = parseFloat(access_str) - bas;
                if (dif < 0.005) {
                    return this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bas];
                }
                else {
                    if (as_though_pre_splice) {
                        dif = 0;
                        bas += 1;
                        return this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bas];
                    }
                    else {
                        return geometric_utils_1.default.interpolate_poly_segment(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"], bas, dif);
                    }
                }
            case "tbar":
                // TODO 3 point method
                tbi = parseInt(access_str[0], 10);
                tbj = parseInt(access_str[1], 10);
                tbar_pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"];
                return [tbar_pts[tbi][0], tbar_pts[tbj][1]];
            default:
                this.raise_error("Unable to apply access string to annotation of type " + this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"], ULabel.elvl_standard);
        }
    };
    // Set a point in a spatial payload using access string
    ULabel.prototype.set_with_access_string = function (annid, access_str, val, undoing) {
        if (undoing === void 0) { undoing = null; }
        // Ensure the values are ints
        // val[0] = Math.round(val[0]);
        // val[1] = Math.round(val[1]);
        // TODO(3d)
        var bbi, bbj, bbk;
        var styp = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"];
        switch (styp) {
            case "bbox":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbj][1] = val[1];
                break;
            case "point":
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                break;
            case "bbox3":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbj][1] = val[1];
                if (access_str.length > 2 && val.length > 2) {
                    bbk = parseInt(access_str[2], 10);
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbk][2] = val[2];
                }
                break;
            case "tbar":
                // TODO 3 points
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbj][1] = val[1];
                break;
            case "polygon":
            case "polyline":
                var bas = parseInt(access_str, 10);
                var dif = parseFloat(access_str) - bas;
                if (dif < 0.005) {
                    var acint = parseInt(access_str, 10);
                    var npts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"].length;
                    if ((styp == "polygon") && ((acint == 0) || (acint == (npts - 1)))) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][0] = [val[0], val[1]];
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][npts - 1] = [val[0], val[1]];
                    }
                    else {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][acint] = val;
                    }
                }
                else {
                    if (undoing === true) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"].splice(bas + 1, 1);
                    }
                    else if (undoing === false) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"].splice(bas + 1, 0, [val[0], val[1]]);
                    }
                    else {
                        var newpt = geometric_utils_1.default.interpolate_poly_segment(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"], bas, dif);
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"].splice(bas + 1, 0, newpt);
                    }
                }
                break;
            default:
                this.raise_error("Unable to apply access string to annotation of type " + this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"], ULabel.elvl_standard);
        }
    };
    ULabel.prototype.get_annotation_color = function (clf_payload, demo, subtask) {
        if (demo === void 0) { demo = false; }
        if (subtask === void 0) { subtask = null; }
        if (this.config["allow_soft_id"]) {
            // not currently supported;
            return this.config["default_annotation_color"];
        }
        var crst = this.state["current_subtask"];
        if (subtask != null && !demo) {
            crst = subtask;
        }
        var col_payload = JSON.parse(JSON.stringify(this.subtasks[crst]["state"]["id_payload"])); // BOOG
        if (demo) {
            var dist_prop = 1.0;
            var class_ids = this.subtasks[crst]["class_ids"];
            var pfx = "div#tb-id-app--" + this.state["current_subtask"];
            var idarr = jquery_1.default(pfx + " a.tbid-opt.sel").attr("id").split("_");
            var class_ind = class_ids.indexOf(parseInt(idarr[idarr.length - 1]));
            // Recompute and render opaque pie slices
            for (var i = 0; i < class_ids.length; i++) {
                if (i == class_ind) {
                    col_payload[i] = {
                        "class_id": class_ids[i],
                        "confidence": dist_prop
                    };
                }
                else {
                    col_payload[i] = {
                        "class_id": class_ids[i],
                        "confidence": (1 - dist_prop) / (class_ids.length - 1)
                    };
                }
            }
        }
        else {
            if (clf_payload != null) {
                col_payload = clf_payload;
            }
        }
        for (var i_1 = 0; i_1 < col_payload.length; i_1++) {
            if (col_payload[i_1]["confidence"] > 0.5) {
                return this.subtasks[crst]["class_defs"][i_1]["color"];
            }
        }
        return this.config["default_annotation_color"];
    };
    // ================= Drawing Functions =================
    ULabel.prototype.draw_bounding_box = function (annotation_object, ctx, demo, offset, subtask) {
        if (demo === void 0) { demo = false; }
        if (offset === void 0) { offset = null; }
        if (subtask === void 0) { subtask = null; }
        var px_per_px = this.config["px_per_px"];
        var diffX = 0;
        var diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }
        var line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
        // Prep for bbox drawing
        var color = this.get_annotation_color(annotation_object["classification_payloads"], false, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
        // Draw the box
        var sp = annotation_object["spatial_payload"][0];
        var ep = annotation_object["spatial_payload"][1];
        ctx.beginPath();
        ctx.moveTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((sp[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.closePath();
        ctx.stroke();
    };
    ULabel.prototype.draw_point = function (annotation_object, ctx, demo, offset, subtask) {
        if (demo === void 0) { demo = false; }
        if (offset === void 0) { offset = null; }
        if (subtask === void 0) { subtask = null; }
        var px_per_px = this.config["px_per_px"];
        var diffX = 0;
        var diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }
        var line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
        // Prep for bbox drawing
        var color = this.get_annotation_color(annotation_object["classification_payloads"], false, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
        // Draw the box
        var sp = annotation_object["spatial_payload"][0];
        ctx.beginPath();
        ctx.arc((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px, line_size * px_per_px * 0.75, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.beginPath();
        ctx.arc((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px, line_size * px_per_px * 3, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();
    };
    ULabel.prototype.draw_bbox3 = function (annotation_object, ctx, demo, offset, subtask) {
        if (demo === void 0) { demo = false; }
        if (offset === void 0) { offset = null; }
        if (subtask === void 0) { subtask = null; }
        var px_per_px = this.config["px_per_px"];
        var diffX = 0;
        var diffY = 0;
        var diffZ = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
            if ("diffZ" in offset) {
                diffZ = offset["diffZ"];
            }
        }
        var curfrm = this.state["current_frame"];
        var sp = annotation_object["spatial_payload"][0];
        var ep = annotation_object["spatial_payload"][1];
        if (curfrm < (Math.min(sp[2], ep[2]) + diffZ) || curfrm > (Math.max(sp[2], ep[2]) + diffZ)) {
            return;
        }
        var fill = false;
        if (curfrm == (Math.min(sp[2], ep[2]) + diffZ) || curfrm == (Math.max(sp[2], ep[2]) + diffZ)) {
            fill = true;
        }
        var line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
        // Prep for bbox drawing
        var color = this.get_annotation_color(annotation_object["classification_payloads"], false, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
        // Draw the box
        ctx.beginPath();
        ctx.moveTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((sp[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.closePath();
        ctx.stroke();
        if (fill) {
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    };
    ULabel.prototype.draw_polygon = function (annotation_object, ctx, demo, offset, subtask) {
        if (demo === void 0) { demo = false; }
        if (offset === void 0) { offset = null; }
        if (subtask === void 0) { subtask = null; }
        var px_per_px = this.config["px_per_px"];
        var diffX = 0;
        var diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }
        var line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
        // Prep for bbox drawing
        var color = this.get_annotation_color(annotation_object["classification_payloads"], demo, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.lineCap = "round";
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
        // Draw the box
        var pts = annotation_object["spatial_payload"];
        ctx.beginPath();
        ctx.moveTo((pts[0][0] + diffX) * px_per_px, (pts[0][1] + diffY) * px_per_px);
        for (var pti = 1; pti < pts.length; pti++) {
            ctx.lineTo((pts[pti][0] + diffX) * px_per_px, (pts[pti][1] + diffY) * px_per_px);
        }
        ctx.stroke();
    };
    ULabel.prototype.draw_contour = function (annotation_object, ctx, demo, offset, subtask) {
        if (demo === void 0) { demo = false; }
        if (offset === void 0) { offset = null; }
        if (subtask === void 0) { subtask = null; }
        var px_per_px = this.config["px_per_px"];
        var diffX = 0;
        var diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }
        var line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
        // Prep for bbox drawing
        var color = this.get_annotation_color(annotation_object["classification_payloads"], demo, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.lineCap = "round";
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
        // Draw the box
        var pts = annotation_object["spatial_payload"];
        ctx.beginPath();
        ctx.moveTo((pts[0][0] + diffX) * px_per_px, (pts[0][1] + diffY) * px_per_px);
        for (var pti = 1; pti < pts.length; pti++) {
            ctx.lineTo((pts[pti][0] + diffX) * px_per_px, (pts[pti][1] + diffY) * px_per_px);
        }
        ctx.stroke();
    };
    ULabel.prototype.draw_tbar = function (annotation_object, ctx, demo, offset, subtask) {
        if (demo === void 0) { demo = false; }
        if (offset === void 0) { offset = null; }
        if (subtask === void 0) { subtask = null; }
        var px_per_px = this.config["px_per_px"];
        var diffX = 0;
        var diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }
        var line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
        // Prep for tbar drawing
        var color = this.get_annotation_color(annotation_object["classification_payloads"], demo, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size * px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
        // Draw the tall part of the tbar
        var sp = annotation_object["spatial_payload"][0];
        var ep = annotation_object["spatial_payload"][1];
        ctx.beginPath();
        ctx.moveTo((sp[0] + diffX) * px_per_px, (sp[1] + diffY) * px_per_px);
        ctx.lineTo((ep[0] + diffX) * px_per_px, (ep[1] + diffY) * px_per_px);
        ctx.stroke();
        // Draw the cross of the tbar
        var halflen = Math.sqrt((sp[0] - ep[0]) * (sp[0] - ep[0]) + (sp[1] - ep[1]) * (sp[1] - ep[1])) / 2;
        var theta = Math.atan((ep[1] - sp[1]) / (ep[0] - sp[0]));
        var sb = [
            sp[0] + halflen * Math.sin(theta),
            sp[1] - halflen * Math.cos(theta)
        ];
        var eb = [
            sp[0] - halflen * Math.sin(theta),
            sp[1] + halflen * Math.cos(theta)
        ];
        ctx.lineCap = "square";
        ctx.beginPath();
        ctx.moveTo((sb[0] + diffX) * px_per_px, (sb[1] + diffY) * px_per_px);
        ctx.lineTo((eb[0] + diffX) * px_per_px, (eb[1] + diffY) * px_per_px);
        ctx.stroke();
        ctx.lineCap = "round";
    };
    ULabel.prototype.register_nonspatial_redraw_start = function (subtask) {
        var _this = this;
        // TODO(3d)
        this.tmp_nonspatial_element_ids[subtask] = [];
        var nonsp_window = jquery_1.default("div#fad_st__" + subtask);
        if (nonsp_window.length) {
            jquery_1.default("div#fad_st__" + subtask + " div.fad_annotation_rows div.fad_row").each(function (idx, val) {
                _this.tmp_nonspatial_element_ids[subtask].push(jquery_1.default(val).attr("id"));
            });
        }
    };
    ULabel.prototype.draw_nonspatial_annotation = function (annotation_object, svg_obj, subtask) {
        if (subtask === void 0) { subtask = null; }
        if (subtask == null) {
            subtask = this.state["current_subtask"];
        }
        var found = false;
        for (var i = 0; i < this.tmp_nonspatial_element_ids[subtask].length; i++) {
            if ("row__" + annotation_object["id"] == this.tmp_nonspatial_element_ids[subtask][i]) {
                this.tmp_nonspatial_element_ids[subtask][i] = null;
                found = true;
            }
        }
        if (!found) {
            jquery_1.default("div#fad_st__" + subtask + " div.fad_annotation_rows").append("\n            <div id=\"row__" + annotation_object["id"] + "\" class=\"fad_row\">\n                <div class=\"fad_buttons\">\n                    <div class=\"fad_inp_container text\">\n                        <textarea id=\"note__" + annotation_object["id"] + "\" class=\"nonspatial_note\" placeholder=\"Notes...\">" + annotation_object["text_payload"] + "</textarea>\n                    </div><!--\n                    --><div class=\"fad_inp_container button frst\">\n                        <a href=\"#\" id=\"reclf__" + annotation_object["id"] + "\" class=\"fad_button reclf\"></a>\n                    </div><!--\n                    --><div class=\"fad_inp_container button\">\n                        <a href=\"#\" id=\"delete__" + annotation_object["id"] + "\" class=\"fad_button delete\">&#215;</a>\n                    </div>\n                </div><!--\n                --><div id=\"icon__" + annotation_object["id"] + "\" class=\"fad_type_icon invert-this-svg\" style=\"background-color: " + this.get_annotation_color(annotation_object["classification_payloads"], false, subtask) + ";\">\n                    " + svg_obj + "\n                </div>\n            </div>\n            ");
        }
        else {
            jquery_1.default("textarea#note__" + annotation_object["id"]).val(annotation_object["text_payload"]);
            jquery_1.default("div#icon__" + annotation_object["id"]).css("background-color", this.get_annotation_color(annotation_object["classification_payloads"], false, subtask));
        }
    };
    ULabel.prototype.draw_whole_image_annotation = function (annotation_object, subtask) {
        if (subtask === void 0) { subtask = null; }
        this.draw_nonspatial_annotation(annotation_object, blobs_1.WHOLE_IMAGE_SVG, subtask);
    };
    ULabel.prototype.draw_global_annotation = function (annotation_object, subtask) {
        if (subtask === void 0) { subtask = null; }
        this.draw_nonspatial_annotation(annotation_object, blobs_1.GLOBAL_SVG, subtask);
    };
    ULabel.prototype.handle_nonspatial_redraw_end = function (subtask) {
        // TODO(3d)
        for (var i = 0; i < this.tmp_nonspatial_element_ids[subtask].length; i++) {
            jquery_1.default("#" + this.tmp_nonspatial_element_ids[subtask][i]).remove();
        }
        this.tmp_nonspatial_element_ids[subtask] = [];
    };
    ULabel.prototype.draw_annotation = function (annotation_object, cvs_ctx, demo, offset, subtask) {
        if (cvs_ctx === void 0) { cvs_ctx = "front_context"; }
        if (demo === void 0) { demo = false; }
        if (offset === void 0) { offset = null; }
        if (subtask === void 0) { subtask = null; }
        // DEBUG left here for refactor reference, but I don't think it's needed moving forward
        //    there may be a use case for drawing depreacted annotations 
        // Don't draw if deprecated
        if (annotation_object["deprecated"])
            return;
        // Get actual context from context key and subtask
        var ctx = null;
        if (subtask == "demo") {
            // Must be demo
            if (cvs_ctx != "demo_canvas_context") {
                throw new Error("Error drawing demo annotation.");
            }
            ctx = this.state["demo_canvas_context"];
        }
        else {
            ctx = this.subtasks[subtask]["state"][cvs_ctx];
        }
        // Dispatch to annotation type's drawing function
        switch (annotation_object["spatial_type"]) {
            case "bbox":
                this.draw_bounding_box(annotation_object, ctx, demo, offset, subtask);
                break;
            case "point":
                this.draw_point(annotation_object, ctx, demo, offset, subtask);
                break;
            case "bbox3":
                // TODO(new3d)
                this.draw_bbox3(annotation_object, ctx, demo, offset, subtask);
                break;
            case "polygon":
            case "polyline":
                this.draw_polygon(annotation_object, ctx, demo, offset, subtask);
                break;
            case "contour":
                this.draw_contour(annotation_object, ctx, demo, offset, subtask);
                break;
            case "tbar":
                this.draw_tbar(annotation_object, ctx, demo, offset, subtask);
                break;
            case "whole-image":
                this.draw_whole_image_annotation(annotation_object, subtask);
                break;
            case "global":
                this.draw_global_annotation(annotation_object, subtask);
                break;
            default:
                this.raise_error("Warning: Annotation " + annotation_object["id"] + " not understood", ULabel.elvl_info);
                break;
        }
    };
    ULabel.prototype.draw_annotation_from_id = function (id, cvs_ctx, offset, subtask) {
        if (cvs_ctx === void 0) { cvs_ctx = "front_context"; }
        if (offset === void 0) { offset = null; }
        if (subtask === void 0) { subtask = null; }
        if (subtask == null) {
            // Should never be here tbh
            subtask = this.state["current_subtask"];
        }
        var frame = this.subtasks[subtask]["annotations"]["access"][id]["frame"];
        if (frame == null || frame == "undefined" || frame == this.state["current_frame"]) {
            this.draw_annotation(this.subtasks[subtask]["annotations"]["access"][id], cvs_ctx, false, offset, subtask);
        }
    };
    // Draws the first n annotations on record
    ULabel.prototype.draw_n_annotations = function (n, cvs_ctx, offset, subtask, spatial_only) {
        if (cvs_ctx === void 0) { cvs_ctx = "front_context"; }
        if (offset === void 0) { offset = null; }
        if (subtask === void 0) { subtask = null; }
        if (spatial_only === void 0) { spatial_only = false; }
        if (subtask == null) {
            // Should never be here tbh
            subtask = this.state["current_subtask"];
        }
        for (var i = 0; i < n; i++) {
            var annid = this.subtasks[subtask]["annotations"]["ordering"][i];
            if (spatial_only && NONSPATIAL_MODES.includes(this.subtasks[subtask]["annotations"]["access"][annid]["spatial_type"])) {
                continue;
            }
            if (offset != null && offset["id"] == annid) {
                this.draw_annotation_from_id(annid, cvs_ctx, offset, subtask);
            }
            else {
                this.draw_annotation_from_id(annid, cvs_ctx, null, subtask);
            }
        }
    };
    ULabel.prototype.redraw_all_annotations_in_subtask = function (subtask, offset, spatial_only) {
        if (offset === void 0) { offset = null; }
        if (spatial_only === void 0) { spatial_only = false; }
        // Clear the canvas
        this.subtasks[subtask]["state"]["front_context"].clearRect(0, 0, this.config["image_width"] * this.config["px_per_px"], this.config["image_height"] * this.config["px_per_px"]);
        if (!spatial_only) {
            this.register_nonspatial_redraw_start(subtask);
        }
        // Draw them all again
        this.draw_n_annotations(this.subtasks[subtask]["annotations"]["ordering"].length, "front_context", offset, subtask, spatial_only);
        if (!spatial_only) {
            this.handle_nonspatial_redraw_end(subtask);
        }
    };
    ULabel.prototype.redraw_all_annotations = function (subtask, offset, spatial_only) {
        if (subtask === void 0) { subtask = null; }
        if (offset === void 0) { offset = null; }
        if (spatial_only === void 0) { spatial_only = false; }
        // TODO(3d)
        if (subtask == null) {
            for (var st in this.subtasks) {
                this.redraw_all_annotations_in_subtask(st, offset, spatial_only);
            }
        }
        else {
            this.redraw_all_annotations_in_subtask(subtask, offset, spatial_only);
        }
        /*
        TODO:
        Make a Toolbox manager that tracks all the individual tabs
        and updates them when appropriate.
        Also TODO:
        some update scheduling to make binding easier
        i.e. a batch of functions run on adding, removing annotations
        and a different batch run on redraw, a batch for subtask switch etc.
        */
        var test = new toolbox_1.ClassCounterToolboxTab();
        test.update_toolbox_counter(this.subtasks[subtask], this.config["toolbox_id"]);
        // TODO figure out how to have this occur from the toolbox
        jquery_1.default("#" + this.config["toolbox_id"] + " div.toolbox-class-counter").html(test.inner_HTML);
    };
    // ================= On-Canvas HTML Dialog Utilities =================
    // When a dialog is created or its position changes, make sure all
    // dialogs that are meant to be visible are in their correct positions
    ULabel.prototype.reposition_dialogs = function () {
        // Get info about image wrapper
        var imwrap = jquery_1.default("#" + this.config["imwrap_id"]);
        var new_dimx = imwrap.width();
        var new_dimy = imwrap.height();
        // Get current subtask for convenience
        var crst = this.state["current_subtask"];
        // Iterate over all visible dialogs and apply new positions
        for (var id in this.subtasks[crst]["state"]["visible_dialogs"]) {
            var el = this.subtasks[crst]["state"]["visible_dialogs"][id];
            var jqel = jquery_1.default("#" + id);
            var new_left = el["left"] * new_dimx;
            var new_top = el["top"] * new_dimy;
            switch (el["pin"]) {
                case "center":
                    new_left -= jqel.width() / 2;
                    new_top -= jqel.height() / 2;
                    break;
                case "top-left":
                    // No need to adjust for a top left pin
                    break;
                default:
                    // TODO top-right, bottom-left, bottom-right
                    // top/bottom-center? center-left/right?
                    break;
            }
            // Enforce that position be on the underlying image
            // TODO
            // Apply new position
            jqel.css("left", new_left + "px");
            jqel.css("top", new_top + "px");
        }
    };
    ULabel.prototype.create_polygon_ender = function (gmx, gmy, polygon_id) {
        // Create ender id
        var ender_id = "ender_" + polygon_id;
        // Build ender html
        var ender_html = "\n        <a href=\"#\" id=\"" + ender_id + "\" class=\"ender_outer\">\n            <span id=\"" + ender_id + "_inner\" class=\"ender_inner\"></span>\n        </a>\n        ";
        jquery_1.default("#dialogs__" + this.state["current_subtask"]).append(ender_html);
        jquery_1.default("#" + ender_id).css({
            "width": this.config["polygon_ender_size"] + "px",
            "height": this.config["polygon_ender_size"] + "px",
            "border-radius": this.config["polygon_ender_size"] / 2 + "px"
        });
        jquery_1.default("#" + ender_id + "_inner").css({
            "width": this.config["polygon_ender_size"] / 5 + "px",
            "height": this.config["polygon_ender_size"] / 5 + "px",
            "border-radius": this.config["polygon_ender_size"] / 10 + "px",
            "top": 2 * this.config["polygon_ender_size"] / 5 + "px",
            "left": 2 * this.config["polygon_ender_size"] / 5 + "px"
        });
        // Add this id to the list of dialogs with managed positions
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][ender_id] = {
            "left": gmx / this.config["image_width"],
            "top": gmy / this.config["image_height"],
            "pin": "center"
        };
        this.reposition_dialogs();
    };
    ULabel.prototype.destroy_polygon_ender = function (polygon_id) {
        // Create ender id
        var ender_id = "ender_" + polygon_id;
        jquery_1.default("#" + ender_id).remove();
        delete this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][ender_id];
        this.reposition_dialogs();
    };
    ULabel.prototype.show_edit_suggestion = function (nearest_point, currently_exists) {
        var esid = "edit_suggestion__" + this.state["current_subtask"];
        var esjq = jquery_1.default("#" + esid);
        esjq.css("display", "block");
        if (currently_exists) {
            esjq.removeClass("soft");
        }
        else {
            esjq.addClass("soft");
        }
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["left"] = nearest_point["point"][0] / this.config["image_width"];
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["top"] = nearest_point["point"][1] / this.config["image_height"];
        this.reposition_dialogs();
    };
    ULabel.prototype.hide_edit_suggestion = function () {
        jquery_1.default(".edit_suggestion").css("display", "none");
    };
    ULabel.prototype.show_global_edit_suggestion = function (annid, offset, nonspatial_id) {
        if (offset === void 0) { offset = null; }
        if (nonspatial_id === void 0) { nonspatial_id = null; }
        var diffX = 0;
        var diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }
        var idd_x;
        var idd_y;
        if (nonspatial_id == null) {
            var esid = "global_edit_suggestion__" + this.state["current_subtask"];
            var esjq = jquery_1.default("#" + esid);
            esjq.css("display", "block");
            var cbox = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["containing_box"];
            var new_lft = (cbox["tlx"] + cbox["brx"] + 2 * diffX) / (2 * this.config["image_width"]);
            var new_top = (cbox["tly"] + cbox["bry"] + 2 * diffY) / (2 * this.config["image_height"]);
            this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["left"] = new_lft;
            this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["top"] = new_top;
            this.reposition_dialogs();
            idd_x = (cbox["tlx"] + cbox["brx"] + 2 * diffX) / 2;
            idd_y = (cbox["tly"] + cbox["bry"] + 2 * diffY) / 2;
        }
        else {
            // TODO(new3d)
            idd_x = jquery_1.default("#reclf__" + nonspatial_id).offset().left - 85; //this.get_global_element_center_x($("#reclf__" + nonspatial_id));
            idd_y = jquery_1.default("#reclf__" + nonspatial_id).offset().top - 85; //this.get_global_element_center_y($("#reclf__" + nonspatial_id));
        }
        // let placeholder = $("#global_edit_suggestion a.reid_suggestion");
        if (!this.subtasks[this.state["current_subtask"]]["single_class_mode"]) {
            this.show_id_dialog(idd_x, idd_y, annid, true, nonspatial_id != null);
        }
    };
    ULabel.prototype.hide_global_edit_suggestion = function () {
        jquery_1.default(".global_edit_suggestion").css("display", "none");
        this.hide_id_dialog();
    };
    ULabel.prototype.show_id_dialog = function (gbx, gby, active_ann, thumbnail, nonspatial) {
        if (thumbnail === void 0) { thumbnail = false; }
        if (nonspatial === void 0) { nonspatial = false; }
        var stkey = this.state["current_subtask"];
        // Record which annotation this dialog is associated with
        // TODO
        // am_dialog_associated_ann = active_ann;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] = true;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"] = thumbnail;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_associated_annotation"] = active_ann;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_which"] = "back";
        var idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
        var idd_niu_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
        var new_height = jquery_1.default("#global_edit_suggestion__" + stkey + " a.reid_suggestion")[0].getBoundingClientRect().height;
        if (nonspatial) {
            this.subtasks[this.state["current_subtask"]]["state"]["idd_which"] = "front";
            idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
            idd_niu_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
            new_height = 28;
        }
        else {
            // Add this id to the list of dialogs with managed positions
            // TODO actually only do this when calling append()
            this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][idd_id] = {
                "left": gbx / this.config["image_width"],
                "top": gby / this.config["image_height"],
                "pin": "center"
            };
        }
        var idd = jquery_1.default("#" + idd_id);
        var idd_niu = jquery_1.default("#" + idd_niu_id);
        if (nonspatial) {
            var new_home = jquery_1.default("#reclf__" + active_ann);
            var fad_st = jquery_1.default("#fad_st__" + stkey + " div.front_dialogs");
            var ofst = -100;
            var zidx = 2000;
            if (thumbnail) {
                zidx = -1;
                // ofst = -100;
            }
            var top_c = new_home.offset().top - fad_st.offset().top + ofst + new_height / 2;
            var left_c = new_home.offset().left - fad_st.offset().left + ofst + 1 + new_height / 2;
            idd.css({
                "display": "block",
                "position": "absolute",
                "top": (top_c) + "px",
                "left": (left_c) + "px",
                "z-index": zidx
            });
            idd.parent().css({
                "z-index": zidx
            });
        }
        // Add or remove thumbnail class if necessary
        var scale_ratio = new_height / this.config["outer_diameter"];
        if (thumbnail) {
            if (!idd.hasClass("thumb")) {
                idd.addClass("thumb");
            }
            jquery_1.default("#" + idd_id + ".thumb").css({
                "transform": "scale(" + scale_ratio + ")"
            });
        }
        else {
            jquery_1.default("#" + idd_id + ".thumb").css({
                "transform": "scale(1.0)"
            });
            if (idd.hasClass("thumb")) {
                idd.removeClass("thumb");
            }
        }
        this.reposition_dialogs();
        // Configure the dialog to show the current information for this ann
        this.set_id_dialog_payload_to_init(active_ann);
        this.update_id_dialog_display(nonspatial);
        if (!thumbnail) {
            this.update_id_toolbox_display();
        }
        // Show the dialog
        idd.css("display", "block");
        idd_niu.css("display", "none");
        // TODO(new3d)
        // if (nonspatial) {
        //     idd.css("z-index", 2000);
        // }
    };
    ULabel.prototype.hide_id_dialog = function () {
        var idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
        var idd_id_front = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
        this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] = false;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_associated_annotation"] = null;
        jquery_1.default("#" + idd_id).css("display", "none");
        jquery_1.default("#" + idd_id_front).css("display", "none");
    };
    // ================= Annotation Utilities =================
    ULabel.prototype.undo = function () {
        if (!this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
            this.hide_id_dialog();
        }
        if (this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length > 0) {
            if (this.subtasks[this.state["current_subtask"]]["actions"]["stream"][this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1].redo_payload.finished === false) {
                this.finish_action(this.subtasks[this.state["current_subtask"]]["actions"]["stream"][this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1]);
            }
            this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].push(this.subtasks[this.state["current_subtask"]]["actions"]["stream"].pop());
            var newact = this.undo_action(this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"][this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].length - 1]);
            if (newact != null) {
                this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"][this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].length - 1] = newact;
            }
        }
        // console.log("AFTER UNDO", this.subtasks[this.state["current_subtask"]]["actions"]["stream"], this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"]);
    };
    ULabel.prototype.redo = function () {
        if (this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].length > 0) {
            this.redo_action(this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].pop());
        }
        // console.log("AFTER REDO", this.subtasks[this.state["current_subtask"]]["actions"]["stream"], this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"]);
    };
    ULabel.prototype.delete_annotation = function (aid, redo_payload) {
        if (redo_payload === void 0) { redo_payload = null; }
        var annid = aid;
        var old_id = annid;
        var new_id = old_id;
        var redoing = false;
        if (redo_payload != null) {
            redoing = true;
            annid = redo_payload.annid;
            old_id = redo_payload.old_id;
        }
        var annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["spatial_type"];
        var deprecate_old = false;
        if (!this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["new"]) {
            // Make new id and record that you did
            deprecate_old = true;
            if (!redoing) {
                new_id = this.make_new_annotation_id();
            }
            else {
                new_id = redo_payload.new_id;
            }
            // Make new annotation (copy of old)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["id"] = new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["parent_id"] = old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(new_id);
            // Set parent_id and deprecated = true
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["deprecated"] = true;
            // Work with new annotation from now on
            annid = new_id;
        }
        if (this.subtasks[this.state["current_subtask"]]["state"]["active_id"] != null) {
            this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
            this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"] = false;
            this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"] = false;
            this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = false;
        }
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["deprecated"] = true;
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.hide_global_edit_suggestion();
        var frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }
        // TODO add this action to the undo stack
        this.record_action({
            act_type: "delete_annotation",
            frame: frame,
            undo_payload: {
                annid: annid,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            },
            redo_payload: {
                annid: annid,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            }
        }, redoing);
    };
    ULabel.prototype.delete_annotation__undo = function (undo_payload) {
        var actid = undo_payload.annid;
        if (undo_payload.deprecate_old) {
            actid = undo_payload.old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["deprecated"] = false;
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.new_id];
            // remove from ordering
            var ind = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].indexOf(undo_payload.new_id);
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].splice(ind, 1);
        }
        else {
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.annid]["deprecated"] = false;
        }
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.suggest_edits(this.state["last_move"]);
    };
    ULabel.prototype.delete_annotation__redo = function (redo_payload) {
        this.delete_annotation(null, redo_payload);
    };
    ULabel.prototype.get_nearest_active_keypoint = function (global_x, global_y, max_dist, candidates) {
        if (candidates === void 0) { candidates = null; }
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist / this.get_empirical_scale(),
            "point": null
        };
        if (candidates == null) {
            candidates = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"];
        }
        // Iterate through and find any close enough defined points
        var edid = null;
        for (var edi = 0; edi < candidates.length; edi++) {
            edid = candidates[edi];
            var npi = null;
            var curfrm = void 0, pts = void 0;
            switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_type"]) {
                case "bbox":
                    npi = geometric_utils_1.default.get_nearest_point_on_bounding_box(global_x, global_y, this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"], max_dist);
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "bbox3":
                    curfrm = this.state["current_frame"];
                    pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"];
                    if ((curfrm >= Math.min(pts[0][2], pts[1][2])) && (curfrm <= Math.max(pts[0][2], pts[1][2]))) {
                        // TODO(new3d) Make sure this function works for bbox3 too
                        npi = geometric_utils_1.default.get_nearest_point_on_bbox3(global_x, global_y, curfrm, pts, max_dist);
                        if (npi["distance"] < ret["distance"]) {
                            ret["annid"] = edid;
                            ret["access"] = npi["access"];
                            ret["distance"] = npi["distance"];
                            ret["point"] = npi["point"];
                        }
                    }
                    break;
                case "polygon":
                case "polyline":
                    npi = geometric_utils_1.default.get_nearest_point_on_polygon(global_x, global_y, this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"], max_dist, false);
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "tbar":
                    npi = geometric_utils_1.default.get_nearest_point_on_tbar(global_x, global_y, this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"], max_dist);
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "contour":
                case "point":
                    // Not editable at the moment
                    break;
            }
        }
        // TODO(3d)
        // Iterate through 3d annotations here (e.g., bbox3)
        if (ret["annid"] == null) {
            return null;
        }
        return ret;
    };
    ULabel.prototype.get_nearest_segment_point = function (global_x, global_y, max_dist, candidates) {
        if (candidates === void 0) { candidates = null; }
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist / this.get_empirical_scale(),
            "point": null
        };
        if (candidates == null) {
            candidates = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"];
        }
        for (var edi = 0; edi < candidates.length; edi++) {
            var edid = candidates[edi];
            switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_type"]) {
                case "bbox":
                case "bbox3":
                case "point":
                    // Can't propose new bounding box or keypoint points
                    break;
                case "polygon":
                case "polyline":
                    var npi = geometric_utils_1.default.get_nearest_point_on_polygon(global_x, global_y, this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"], max_dist / this.get_empirical_scale(), true);
                    if (npi["distance"] != null && npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "contour":
                    // Not editable at the moment (TODO)
                    break;
                case "tbar":
                    // Can't propose new tbar points
                    break;
            }
        }
        if (ret["annid"] == null) {
            return null;
        }
        return ret;
    };
    ULabel.prototype.get_line_size = function (demo) {
        if (demo === void 0) { demo = false; }
        var line_size = this.state["line_size"] * this.config["px_per_px"];
        if (demo) {
            if (this.state["size_mode"] == "dynamic") {
                line_size *= this.state["zoom_val"];
            }
            return line_size;
        }
        else {
            if (this.state["size_mode"] == "fixed") {
                line_size /= this.state["zoom_val"];
            }
            return line_size;
        }
    };
    // Action Stream Events
    ULabel.prototype.set_saved = function (saved, in_progress) {
        if (in_progress === void 0) { in_progress = false; }
        if (saved) {
            jquery_1.default("#" + this.config["container_id"] + " a#submit-button").removeAttr("href");
            jquery_1.default("#" + this.config["container_id"] + " a#submit-button").html(this.config["done_button"]);
        }
        else {
            jquery_1.default("#" + this.config["container_id"] + " a#submit-button").attr("href", "#");
            if (in_progress) {
                jquery_1.default("#" + this.config["container_id"] + " a#submit-button").html(blobs_1.BUTTON_LOADER_HTML);
            }
            else {
                jquery_1.default("#" + this.config["container_id"] + " a#submit-button").html(this.config["done_button"]);
            }
        }
        this.state["edited"] = !saved;
    };
    ULabel.prototype.record_action = function (action, is_redo) {
        if (is_redo === void 0) { is_redo = false; }
        this.set_saved(false);
        // After a new action, you can no longer redo old actions
        if (!is_redo) {
            this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"] = [];
        }
        // Add to stream
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"].push(action);
    };
    ULabel.prototype.record_finish = function (actid) {
        // TODO(3d) 
        var i = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.init_spatial = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.finished = true;
    };
    ULabel.prototype.record_finish_edit = function (actid) {
        // TODO(3d) 
        var i = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1;
        var fin_pt = this.get_with_access_string(actid, this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.edit_candidate["access"], true);
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.ending_x = fin_pt[0];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.ending_y = fin_pt[1];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.ending_frame = this.state["current_frame"];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.finished = true;
    };
    ULabel.prototype.record_finish_move = function (diffX, diffY, diffZ) {
        if (diffZ === void 0) { diffZ = 0; }
        // TODO(3d) 
        var i = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.diffX = diffX;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.diffY = diffY;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.diffZ = diffZ;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].undo_payload.diffX = -diffX;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].undo_payload.diffY = -diffY;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].undo_payload.diffZ = -diffZ;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.finished = true;
    };
    ULabel.prototype.undo_action = function (action) {
        this.update_frame(null, action.frame);
        switch (action.act_type) {
            case "begin_annotation":
                this.begin_annotation__undo(action.undo_payload);
                break;
            case "continue_annotation":
                this.continue_annotation__undo(action.undo_payload);
                break;
            case "finish_annotation":
                this.finish_annotation__undo(action.undo_payload);
                break;
            case "edit_annotation":
                this.edit_annotation__undo(action.undo_payload);
                break;
            case "move_annotation":
                this.move_annotation__undo(action.undo_payload);
                break;
            case "delete_annotation":
                this.delete_annotation__undo(action.undo_payload);
                break;
            case "assign_annotation_id":
                this.assign_annotation_id__undo(action.undo_payload);
                break;
            case "create_nonspatial_annotation":
                this.create_nonspatial_annotation__undo(action.undo_payload);
                break;
            default:
                console.log("Undo error :(");
                break;
        }
    };
    ULabel.prototype.redo_action = function (action) {
        this.update_frame(null, action.frame);
        switch (action.act_type) {
            case "begin_annotation":
                this.begin_annotation(null, action.redo_payload);
                break;
            case "continue_annotation":
                this.continue_annotation(null, null, action.redo_payload);
                break;
            case "finish_annotation":
                this.finish_annotation(null, action.redo_payload);
                break;
            case "edit_annotation":
                this.edit_annotation__redo(action.redo_payload);
                break;
            case "move_annotation":
                this.move_annotation__redo(action.redo_payload);
                break;
            case "delete_annotation":
                this.delete_annotation__redo(action.redo_payload);
                break;
            case "assign_annotation_id":
                this.assign_annotation_id(null, action.redo_payload);
                break;
            case "create_nonspatial_annotation":
                this.create_nonspatial_annotation(action.redo_payload);
                break;
            default:
                console.log("Redo error :(");
                break;
        }
    };
    ULabel.prototype.finish_action = function (action) {
        switch (action.act_type) {
            case "begin_annotation":
            case "edit_annotation":
            case "move_annotation":
                this.end_drag(this.state["last_move"]);
                break;
            default:
                console.log("Finish error :(");
                break;
        }
    };
    ULabel.prototype.create_nonspatial_annotation = function (redo_payload) {
        if (redo_payload === void 0) { redo_payload = null; }
        var redoing = false;
        var unq_id = null;
        var annotation_mode = null;
        var init_idpyld = null;
        if (redo_payload == null) {
            unq_id = this.make_new_annotation_id();
            annotation_mode = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
            init_idpyld = this.get_init_id_payload();
        }
        else {
            redoing = true;
            unq_id = redo_payload.unq_id;
            annotation_mode = redo_payload.annotation_mode;
            init_idpyld = redo_payload.init_payload;
        }
        // Add this annotation to annotations object
        var annframe = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            annframe = null;
        }
        var new_annotation = {
            "id": unq_id,
            "new": true,
            "parent_id": null,
            "created_by": this.config["annotator"],
            "created_at": ULabel.get_time(),
            "deprecated": false,
            "spatial_type": annotation_mode,
            "spatial_payload": null,
            "classification_payloads": JSON.parse(JSON.stringify(init_idpyld)),
            "line_size": null,
            "containing_box": null,
            "frame": annframe,
            "text_payload": ""
        };
        var undo_frame = this.state["current_frame"];
        var ann_str;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id] = new_annotation;
        if (redoing) {
            this.set_id_dialog_payload_to_init(unq_id, init_idpyld);
        }
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["annotation_meta"] = this.config["annotation_meta"];
        this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(unq_id);
        ann_str = JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]);
        // Draw new annotation
        this.redraw_all_annotations(this.state["current_subtask"], null);
        var frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }
        // Record for potential undo/redo
        this.record_action({
            act_type: "create_nonspatial_annotation",
            frame: frame,
            redo_payload: {
                unq_id: unq_id,
                annotation_mode: annotation_mode,
                init_spatial: null,
                finished: true,
                init_payload: JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]))
            },
            undo_payload: {
                ann_str: ann_str,
                frame: undo_frame
            },
        }, redoing);
        this.suggest_edits(this.state["last_move"]);
    };
    ULabel.prototype.create_nonspatial_annotation__undo = function (undo_payload) {
        var ann = JSON.parse(undo_payload.ann_str);
        var unq_id = ann["id"];
        var end_ann;
        end_ann = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].pop();
        if (end_ann != unq_id) {
            console.log("We may have a problem... undo replication");
            console.log(end_ann, unq_id);
        }
        // Remove from access
        if (unq_id in this.subtasks[this.state["current_subtask"]]["annotations"]["access"]) {
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id];
        }
        else {
            console.log("We may have a problem... undo replication");
        }
        // Delete from view
        this.redraw_all_annotations(this.state["current_subtask"], null);
        this.suggest_edits(this.state["last_move"]);
    };
    ULabel.prototype.begin_annotation = function (mouse_event, redo_payload) {
        if (redo_payload === void 0) { redo_payload = null; }
        // Give the new annotation a unique ID
        var unq_id = null;
        var line_size = null;
        var annotation_mode = null;
        var redoing = false;
        var gmx = null;
        var gmy = null;
        var init_spatial = null;
        var init_idpyld = null;
        if (redo_payload == null) {
            unq_id = this.make_new_annotation_id();
            line_size = this.get_line_size();
            annotation_mode = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
            gmx = this.get_global_mouse_x(mouse_event);
            gmy = this.get_global_mouse_y(mouse_event);
            init_spatial = this.get_init_spatial(gmx, gmy, annotation_mode);
            init_idpyld = this.get_init_id_payload();
            this.hide_edit_suggestion();
            this.hide_global_edit_suggestion();
        }
        else {
            unq_id = redo_payload.unq_id;
            line_size = redo_payload.line_size;
            mouse_event = redo_payload.mouse_event;
            annotation_mode = redo_payload.annotation_mode;
            redoing = true;
            gmx = redo_payload.gmx;
            gmy = redo_payload.gmy;
            init_spatial = redo_payload.init_spatial;
            init_idpyld = redo_payload.init_payload;
        }
        // TODO(3d) 
        var containing_box = {
            "tlx": gmx,
            "tly": gmy,
            "brx": gmx,
            "bry": gmy
        };
        if (NONSPATIAL_MODES.includes(annotation_mode)) {
            containing_box = null;
            line_size = null;
            init_spatial = null;
        }
        var frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }
        // Add this annotation to annotations object
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id] = {
            "id": unq_id,
            "new": true,
            "parent_id": null,
            "created_by": this.config["annotator"],
            "created_at": ULabel.get_time(),
            "deprecated": false,
            "spatial_type": annotation_mode,
            "spatial_payload": init_spatial,
            "classification_payloads": JSON.parse(JSON.stringify(init_idpyld)),
            "line_size": line_size,
            "containing_box": containing_box,
            "frame": frame,
            "text_payload": ""
        };
        if (redoing) {
            this.set_id_dialog_payload_to_init(unq_id, init_idpyld);
        }
        // TODO(3d)
        // Load annotation_meta into annotation
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["annotation_meta"] = this.config["annotation_meta"];
        this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(unq_id);
        // If a polygon was just started, we need to add a clickable to end the shape
        if (annotation_mode == "polygon") {
            this.create_polygon_ender(gmx, gmy, unq_id);
        }
        else if (annotation_mode == "polyline") {
            // Create enders to connect to the ends of other polylines
            // TODO
        }
        // Draw annotation, and set state to annotation in progress
        this.draw_annotation_from_id(unq_id);
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = unq_id;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = true;
        // Record for potential undo/redo
        this.record_action({
            act_type: "begin_annotation",
            frame: frame,
            redo_payload: {
                mouse_event: mouse_event,
                unq_id: unq_id,
                line_size: line_size,
                annotation_mode: annotation_mode,
                gmx: gmx,
                gmy: gmy,
                init_spatial: JSON.parse(JSON.stringify(init_spatial)),
                finished: redoing || annotation_mode == "point",
                init_payload: JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]))
            },
            undo_payload: {
                // TODO(3d)
                ann_str: JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id])
            },
        }, redoing);
        if (redoing) {
            if (annotation_mode == "polygon" || annotation_mode == "polyline") {
                this.continue_annotation(this.state["last_move"]);
            }
            else {
                redo_payload.actid = redo_payload.unq_id;
                this.finish_annotation(null, redo_payload);
                this.rebuild_containing_box(unq_id);
                this.suggest_edits(this.state["last_move"]);
            }
        }
        else if (annotation_mode == "point") {
            this.finish_annotation(null);
            this.rebuild_containing_box(unq_id);
            this.suggest_edits(this.state["last_move"]);
        }
    };
    ULabel.prototype.begin_annotation__undo = function (undo_payload) {
        // Parse necessary data
        var ann = JSON.parse(undo_payload.ann_str);
        var unq_id = ann["id"];
        // Set annotation state not in progress, nullify active id
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = false;
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
        // Destroy ender
        // TODO(3d)
        if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["spatial_type"] == "polygon") {
            this.destroy_polygon_ender(unq_id);
        }
        else if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["spatial_type"] == "polyline") {
            // Destroy enders/linkers for polyline
            // TODO 
        }
        // Remove from ordering
        // TODO(3d)
        var end_ann = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].pop();
        if (end_ann != unq_id) {
            console.log("We may have a problem... undo replication");
            console.log(end_ann, unq_id);
        }
        // Remove from access
        // TODO(3d)
        if (unq_id in this.subtasks[this.state["current_subtask"]]["annotations"]["access"]) {
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id];
        }
        else {
            console.log("We may have a problem... undo replication");
        }
        // Delete from view
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.suggest_edits(this.state["last_move"]);
    };
    ULabel.prototype.update_containing_box = function (ms_loc, actid, subtask) {
        if (subtask === void 0) { subtask = null; }
        if (subtask == null) {
            subtask = this.state["current_subtask"];
        }
        // TODO(3d)
        if (ms_loc[0] < this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"] = ms_loc[0];
        }
        else if (ms_loc[0] > this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"] = ms_loc[0];
        }
        if (ms_loc[1] < this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"] = ms_loc[1];
        }
        else if (ms_loc[1] > this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"] = ms_loc[1];
        }
        // console.log(ms_loc, this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]);
    };
    ULabel.prototype.rebuild_containing_box = function (actid, ignore_final, subtask) {
        if (ignore_final === void 0) { ignore_final = false; }
        if (subtask === void 0) { subtask = null; }
        if (subtask == null) {
            subtask = this.state["current_subtask"];
        }
        var init_pt = this.subtasks[subtask]["annotations"]["access"][actid]["spatial_payload"][0];
        this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"] = {
            "tlx": init_pt[0],
            "tly": init_pt[1],
            "brx": init_pt[0],
            "bry": init_pt[1]
        };
        var npts = this.subtasks[subtask]["annotations"]["access"][actid]["spatial_payload"].length;
        if (ignore_final) {
            npts -= 1;
        }
        for (var pti = 1; pti < npts; pti++) {
            this.update_containing_box(this.subtasks[subtask]["annotations"]["access"][actid]["spatial_payload"][pti], actid, subtask);
        }
        if (this.subtasks[subtask]["annotations"]["access"][actid]["spatial_type"]) {
            var line_size = this.subtasks[subtask]["annotations"]["access"][actid]["line_size"];
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"] -= 3 * line_size;
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"] -= 3 * line_size;
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"] += 3 * line_size;
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"] += 3 * line_size;
        }
        // TODO modification here for T-Bar would be nice too
    };
    ULabel.prototype.continue_annotation = function (mouse_event, isclick, redo_payload) {
        if (isclick === void 0) { isclick = false; }
        if (redo_payload === void 0) { redo_payload = null; }
        // Convenience
        var actid = null;
        var redoing = false;
        var gmx = null;
        var gmy = null;
        var frm = this.state["current_frame"];
        if (redo_payload == null) {
            actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
            gmx = this.get_global_mouse_x(mouse_event);
            gmy = this.get_global_mouse_y(mouse_event);
        }
        else {
            mouse_event = redo_payload.mouse_event;
            isclick = redo_payload.isclick;
            actid = redo_payload.actid;
            redoing = true;
            gmx = redo_payload.gmx;
            gmy = redo_payload.gmy;
            frm = redo_payload.frame;
        }
        // TODO big performance gains with buffered canvasses
        if (actid && (actid)) {
            var ms_loc = [
                gmx,
                gmy
            ];
            // Handle annotation continuation based on the annotation mode
            // TODO(3d)
            // TODO(3d--META) -- This is the farthest I got tagging places that will need to be fixed.
            var n_kpts = void 0, ender_pt = void 0, ender_dist = void 0, ender_thresh = void 0, inp = void 0;
            switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
                case "bbox":
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][1] = ms_loc;
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    break;
                case "bbox3":
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][1] = [
                        ms_loc[0],
                        ms_loc[1],
                        frm
                    ];
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    break;
                case "polygon":
                case "polyline":
                    // Store number of keypoints for easy access
                    n_kpts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length;
                    // If hovering over the ender, snap to its center
                    ender_pt = [
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][0][0],
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][0][1]
                    ];
                    ender_dist = Math.pow(Math.pow(ms_loc[0] - ender_pt[0], 2) + Math.pow(ms_loc[1] - ender_pt[1], 2), 0.5);
                    ender_thresh = jquery_1.default("#ender_" + actid).width() / (2 * this.get_empirical_scale());
                    if (ender_dist < ender_thresh) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][n_kpts - 1] = ender_pt;
                    }
                    else { // Else, just redirect line to mouse position
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][n_kpts - 1] = ms_loc;
                    }
                    // If this mouse event is a click, add a new member to the list of keypoints 
                    //    ender clicks are filtered before they get here
                    if (isclick) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].push(ms_loc);
                        this.update_containing_box(ms_loc, actid);
                        var frame = this.state["current_frame"];
                        // Only an undoable action if placing a polygon keypoint
                        this.record_action({
                            act_type: "continue_annotation",
                            frame: frame,
                            redo_payload: {
                                mouse_event: mouse_event,
                                isclick: isclick,
                                actid: actid,
                                gmx: gmx,
                                gmy: gmy
                            },
                            undo_payload: {
                                actid: actid
                            }
                        }, redoing);
                        if (redoing) {
                            this.continue_annotation(this.state["last_move"]);
                        }
                    }
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    break;
                case "contour":
                    if (geometric_utils_1.default.l2_norm(ms_loc, this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length - 1]) * this.config["px_per_px"] > 3) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].push(ms_loc);
                        this.update_containing_box(ms_loc, actid);
                        this.redraw_all_annotations(this.state["current_subtask"], null, true); // TODO tobuffer, no need to redraw here, can just draw over
                    }
                    break;
                case "tbar":
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][1] = ms_loc;
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    break;
                default:
                    inp = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"];
                    this.raise_error("Annotation mode is not understood: " + inp, ULabel.elvl_info);
                    break;
            }
        }
    };
    ULabel.prototype.continue_annotation__undo = function (undo_payload) {
        // TODO(3d)
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"].pop();
        this.rebuild_containing_box(undo_payload.actid, true);
        this.continue_annotation(this.state["last_move"]);
    };
    ULabel.prototype.begin_edit = function (mouse_event) {
        // Handle case of editing an annotation that was not originally created by you
        var deprecate_old = false;
        var old_id = this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"];
        var new_id = old_id;
        // TODO(3d)
        if (!this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["new"]) {
            // Make new id and record that you did
            deprecate_old = true;
            new_id = this.make_new_annotation_id();
            // Make new annotation (copy of old)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["id"] = new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["parent_id"] = old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(new_id);
            // Set parent_id and deprecated = true
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["deprecated"] = true;
            // Change edit candidate to new id
            this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"] = new_id;
        }
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"];
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"] = true;
        var ec = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]));
        var stpt = this.get_with_access_string(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"], ec["access"]);
        this.edit_annotation(mouse_event);
        this.suggest_edits(mouse_event);
        var gmx = this.get_global_mouse_x(mouse_event);
        var gmy = this.get_global_mouse_y(mouse_event);
        var annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["spatial_type"];
        var frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }
        this.record_action({
            act_type: "edit_annotation",
            frame: frame,
            undo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                edit_candidate: ec,
                starting_x: stpt[0],
                starting_y: stpt[1],
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            },
            redo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                edit_candidate: ec,
                ending_x: gmx,
                ending_y: gmy,
                finished: false,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            }
        });
    };
    ULabel.prototype.edit_annotation = function (mouse_event) {
        // Convenience
        var actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        // TODO big performance gains with buffered canvasses
        if (actid && (actid !== null)) {
            var ms_loc = [
                this.get_global_mouse_x(mouse_event),
                this.get_global_mouse_y(mouse_event)
            ];
            // Clicks are handled elsewhere
            // TODO(3d)
            switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
                case "bbox":
                    this.set_with_access_string(actid, this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["access"], ms_loc);
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"]);
                    break;
                case "bbox3":
                    // TODO(new3d) Will not always want to set 3rd val -- editing is possible within an intermediate frame or frames
                    this.set_with_access_string(actid, this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["access"], [ms_loc[0], ms_loc[1], this.state["current_frame"]]);
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(null, null, true); // tobuffer
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"]);
                    break;
                case "polygon":
                case "polyline":
                    this.set_with_access_string(actid, this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["access"], ms_loc);
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"]);
                    // this.suggest_edits(mouse_event);
                    break;
                case "contour":
                    // TODO contour editing
                    this.raise_error("Annotation mode is not currently editable", ULabel.elvl_info);
                    break;
                case "tbar":
                    this.set_with_access_string(actid, this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["access"], ms_loc);
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"]);
                    break;
                default:
                    this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                    break;
            }
        }
    };
    ULabel.prototype.edit_annotation__undo = function (undo_payload) {
        var actid = undo_payload.actid;
        if (undo_payload.deprecate_old) {
            actid = undo_payload.old_id;
            // TODO(3d)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["deprecated"] = false;
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.new_id];
            // remove from ordering
            var ind = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].indexOf(undo_payload.new_id);
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].splice(ind, 1);
        }
        var ms_loc = [
            undo_payload.starting_x,
            undo_payload.starting_y
        ];
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
            case "bbox":
                this.set_with_access_string(actid, undo_payload.edit_candidate["access"], ms_loc, true);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "bbox3":
                ms_loc.push(undo_payload.starting_frame);
                this.set_with_access_string(actid, undo_payload.edit_candidate["access"], ms_loc, true);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "polygon":
            case "polyline":
                this.set_with_access_string(actid, undo_payload.edit_candidate["access"], ms_loc, true);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "tbar":
                this.set_with_access_string(actid, undo_payload.edit_candidate["access"], ms_loc, true);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
        }
    };
    ULabel.prototype.edit_annotation__redo = function (redo_payload) {
        var actid = redo_payload.actid;
        if (redo_payload.deprecate_old) {
            actid = redo_payload.new_id;
            // TODO(3d)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["id"] = redo_payload.new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["parent_id"] = redo_payload.old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.old_id]["deprecated"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(redo_payload.new_id);
        }
        var ms_loc = [
            redo_payload.ending_x,
            redo_payload.ending_y
        ];
        var cur_loc = this.get_with_access_string(redo_payload.actid, redo_payload.edit_candidate["access"]);
        // TODO(3d)
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
            case "bbox":
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "bbox3":
                ms_loc.push(redo_payload.ending_frame);
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "polygon":
            case "polyline":
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc, false);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "tbar":
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc, false);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
        }
        var annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"];
        var frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }
        this.record_action({
            act_type: "edit_annotation",
            frame: frame,
            undo_payload: {
                actid: redo_payload.actid,
                edit_candidate: JSON.parse(JSON.stringify(redo_payload.edit_candidate)),
                starting_x: cur_loc[0],
                starting_y: cur_loc[1],
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            },
            redo_payload: {
                actid: redo_payload.actid,
                edit_candidate: JSON.parse(JSON.stringify(redo_payload.edit_candidate)),
                ending_x: redo_payload.ending_x,
                ending_y: redo_payload.ending_y,
                finished: true,
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            }
        }, true);
    };
    ULabel.prototype.begin_move = function (mouse_event) {
        var deprecate_old = false;
        var old_id = this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"];
        var new_id = old_id;
        // TODO(3d)
        if (!this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["new"]) {
            // Make new id and record that you did
            deprecate_old = true;
            new_id = this.make_new_annotation_id();
            // Make new annotation (copy of old)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["id"] = new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["parent_id"] = old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(new_id);
            // Set parent_id and deprecated = true
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["deprecated"] = true;
            // Change edit candidate to new id
            this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"] = new_id;
        }
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"];
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"] = true;
        // Revise start to current button center
        // TODO
        /*
        this.drag_state["move"]["mouse_start"][0] = mouse_event.target.pageX
        this.drag_state["move"]["mouse_start"][1] +=
        */
        var mc = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]));
        var annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["spatial_type"];
        var frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }
        this.record_action({
            act_type: "move_annotation",
            frame: frame,
            undo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                move_candidate: mc,
                diffX: 0,
                diffY: 0,
                diffZ: 0,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            },
            redo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                move_candidate: mc,
                diffX: 0,
                diffY: 0,
                diffZ: 0,
                finished: false,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            }
        });
        // Hide point edit suggestion
        jquery_1.default(".edit_suggestion").css("display", "none");
        this.move_annotation(mouse_event);
    };
    ULabel.prototype.move_annotation = function (mouse_event) {
        // Convenience
        var actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        // TODO big performance gains with buffered canvasses
        if (actid && (actid !== null)) {
            var offset = {
                "id": this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"],
                "diffX": (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0]) / this.state["zoom_val"],
                "diffY": (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1]) / this.state["zoom_val"],
                "diffZ": this.state["current_frame"] - this.drag_state["move"]["mouse_start"][2]
            };
            this.redraw_all_annotations(null, offset, true); // tobuffer
            this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"], offset); // TODO handle offset
            this.reposition_dialogs();
            return;
        }
    };
    ULabel.prototype.finish_annotation = function (mouse_event, redo_payload) {
        if (redo_payload === void 0) { redo_payload = null; }
        // Convenience
        var actid = null;
        var redoing = false;
        if (redo_payload == null) {
            actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        }
        else {
            actid = redo_payload.actid;
            redoing = true;
        }
        // Record last point and redraw if necessary
        // TODO(3d)
        var n_kpts, start_pt, popped;
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
            case "polygon":
                n_kpts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length;
                start_pt = [
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][0][0],
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][0][1]
                ];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][n_kpts - 1] = start_pt;
                this.redraw_all_annotations(this.state["current_subtask"]); // tobuffer
                this.record_action({
                    act_type: "finish_annotation",
                    frame: this.state["current_frame"],
                    undo_payload: {
                        actid: actid,
                        // TODO find the actual type for this 
                        ender_html: jquery_1.default("#ender_" + actid).outer_html()
                    },
                    redo_payload: {
                        actid: actid
                    }
                }, redoing);
                jquery_1.default("#ender_" + actid).remove(); // TODO remove from visible dialogs
                break;
            case "polyline":
                // TODO handle the case of merging with existing annotation
                // Remove last point
                n_kpts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length;
                if (n_kpts > 2) {
                    popped = true;
                    n_kpts -= 1;
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].pop();
                }
                else {
                    popped = false;
                    this.rebuild_containing_box(actid, false, this.state["current_subtask"]);
                }
                console.log("At finish...", JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"], null, 2));
                this.redraw_all_annotations(this.state["current_subtask"]); // tobuffer
                this.record_action({
                    act_type: "finish_annotation",
                    frame: this.state["current_frame"],
                    undo_payload: {
                        actid: actid,
                        popped: popped
                        // ender_html: $("#ender_" + actid).outer_html()
                    },
                    redo_payload: {
                        actid: actid,
                        popped: popped,
                        fin_pt: JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][n_kpts - 1]))
                    }
                }, redoing);
                // TODO remove all enders/mergers for this polyline
                // $("#ender_" + actid).remove(); // TODO remove from visible dialogs
                break;
            case "bbox":
            case "bbox3":
            case "contour":
            case "tbar":
            case "point":
                this.record_finish(actid);
                // tobuffer this is where the annotation moves to back canvas
                break;
            default:
                break;
        }
        // If ID has not been assigned to this annotation, build a dialog for it
        // if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] == null) {
        //     this.show_id_dialog(mouse_event, actid);
        // }
        // TODO build a dialog here when necessary -- will also need to integrate with undo
        // TODO(3d)
        if (this.subtasks[this.state["current_subtask"]]["single_class_mode"]) {
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] = [
                {
                    "class_id": this.subtasks[this.state["current_subtask"]]["class_defs"][0]["id"],
                    "confidence": 1.0
                }
            ];
        }
        else {
            if (!redoing) {
                // Uncommenting would show id dialog after every annotation finishes. Currently this is not desired
                // this.subtasks[this.state["current_subtask"]]["state"]["first_explicit_assignment"] = true;
                // this.show_id_dialog(this.get_global_mouse_x(mouse_event), this.get_global_mouse_y(mouse_event), actid);
            }
        }
        // Set mode to no active annotation
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = false;
    };
    ULabel.prototype.finish_annotation__undo = function (undo_payload) {
        // This is only ever invoked for polygons and polylines
        // TODO(3d)
        var n_kpts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"].length;
        var amd = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_type"];
        if (amd == "polyline" && undo_payload.popped) {
            var new_pt = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"][n_kpts - 1]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"].push(new_pt);
            n_kpts += 1;
        }
        if (!NONSPATIAL_MODES.includes(amd)) {
            var pt = [
                this.get_global_mouse_x(this.state["last_move"]),
                this.get_global_mouse_y(this.state["last_move"]),
            ];
            if (MODES_3D.includes(amd)) {
                pt.push(this.state["current_frame"]);
            }
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"][n_kpts - 1] = pt;
        }
        // Note that undoing a finish should not change containing box
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = true;
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = undo_payload.actid;
        this.redraw_all_annotations(this.state["current_subtask"]);
        if (undo_payload.ender_html) {
            jquery_1.default("#dialogs__" + this.state["current_subtask"]).append(undo_payload.ender_html);
        }
        this.hide_edit_suggestion();
        this.hide_global_edit_suggestion();
        this.reposition_dialogs();
    };
    ULabel.prototype.finish_edit = function () {
        // Record last point and redraw if necessary
        var actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
            case "polygon":
            case "polyline":
            case "bbox":
            case "bbox3":
            case "tbar":
                this.record_finish_edit(actid);
                break;
            case "contour":
            case "point":
                // tobuffer this is where the annotation moves to back canvas
                break;
            default:
                break;
        }
        // Set mode to no active annotation
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"] = false;
    };
    ULabel.prototype.finish_move = function (mouse_event) {
        // Actually edit spatial payload this time
        var diffX = (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0]) / this.state["zoom_val"];
        var diffY = (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1]) / this.state["zoom_val"];
        var diffZ = this.state["current_frame"] - this.drag_state["move"]["mouse_start"][2];
        // TODO(3d)
        for (var spi = 0; spi < this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"].length; spi++) {
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"][spi][0] += diffX;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"][spi][1] += diffY;
        }
        if (MODES_3D.includes(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_type"])) {
            for (var spi = 0; spi < this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"].length; spi++) {
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"][spi][2] += diffZ;
            }
        }
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["containing_box"]["tlx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["containing_box"]["brx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["containing_box"]["tly"] += diffY;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["containing_box"]["bry"] += diffY;
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_type"]) {
            case "polygon":
            case "polyline":
            case "bbox":
            case "bbox3":
            case "contour":
            case "tbar":
            case "point":
                // tobuffer this is where the annotation moves to back canvas
                break;
            default:
                break;
        }
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"] = false;
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.record_finish_move(diffX, diffY, diffZ);
    };
    ULabel.prototype.move_annotation__undo = function (undo_payload) {
        var diffX = undo_payload.diffX;
        var diffY = undo_payload.diffY;
        var diffZ = undo_payload.diffZ;
        var actid = undo_payload.move_candidate["annid"];
        // TODO(3d)
        if (undo_payload.deprecate_old) {
            actid = undo_payload.old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["deprecated"] = false;
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.new_id];
            var ind = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].indexOf(undo_payload.new_id);
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].splice(ind, 1);
        }
        else {
            for (var spi = 0; spi < this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length; spi++) {
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][0] += diffX;
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][1] += diffY;
                if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi].length > 2) {
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][2] += diffZ;
                }
            }
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["tlx"] += diffX;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["brx"] += diffX;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["tly"] += diffY;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["bry"] += diffY;
        }
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.hide_edit_suggestion();
        this.hide_global_edit_suggestion();
        this.reposition_dialogs();
        this.suggest_edits(this.state["last_move"]);
        this.update_frame(diffZ);
    };
    ULabel.prototype.move_annotation__redo = function (redo_payload) {
        var diffX = redo_payload.diffX;
        var diffY = redo_payload.diffY;
        var diffZ = redo_payload.diffZ;
        var actid = redo_payload.move_candidate["annid"];
        // TODO(3d)
        if (redo_payload.deprecate_old) {
            actid = redo_payload.new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["id"] = redo_payload.new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["parent_id"] = redo_payload.old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.old_id]["deprecated"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(redo_payload.new_id);
        }
        // TODO(3d)
        for (var spi = 0; spi < this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length; spi++) {
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][0] += diffX;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][1] += diffY;
            if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi].length > 2) {
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][2] += diffZ;
            }
        }
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["tlx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["brx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["tly"] += diffY;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["bry"] += diffY;
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.hide_edit_suggestion();
        this.hide_global_edit_suggestion();
        this.reposition_dialogs();
        this.suggest_edits(this.state["last_move"]);
        var annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"];
        var frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }
        this.record_action({
            act_type: "move_annotation",
            frame: frame,
            undo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                move_candidate: redo_payload.move_candidate,
                diffX: -diffX,
                diffY: -diffY,
                diffZ: -diffZ,
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            },
            redo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                move_candidate: redo_payload.move_candidate,
                diffX: diffX,
                diffY: diffY,
                diffZ: diffZ,
                finished: true,
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            }
        }, true);
        this.update_frame(diffZ);
    };
    ULabel.prototype.get_edit_candidates = function (gblx, gbly, dst_thresh) {
        dst_thresh /= this.get_empirical_scale();
        var ret = {
            "candidate_ids": [],
            "best": null
        };
        var minsize = Infinity;
        // TODO(3d)
        for (var edi = 0; edi < this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].length; edi++) {
            var id = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"][edi];
            if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["deprecated"])
                continue;
            var cbox = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["containing_box"];
            var frame = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["frame"];
            if (cbox) {
                cbox["tlz"] = this.state["current_frame"];
                cbox["brz"] = this.state["current_frame"];
                if (frame != null) {
                    cbox["tlz"] = frame;
                    cbox["brz"] = frame;
                }
                else {
                    if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["spatial_type"] == "bbox3") {
                        var pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["spatial_payload"];
                        cbox["tlz"] = Math.min(pts[0][2], pts[1][2]);
                        cbox["brz"] = Math.max(pts[0][2], pts[1][2]);
                    }
                }
            }
            // TODO(new3d) bbox3 will have different rules here 
            if (cbox &&
                (gblx >= cbox["tlx"] - dst_thresh) &&
                (gblx <= cbox["brx"] + dst_thresh) &&
                (gbly >= cbox["tly"] - dst_thresh) &&
                (gbly <= cbox["bry"] + dst_thresh) &&
                (this.state["current_frame"] >= cbox["tlz"]) &&
                (this.state["current_frame"] <= cbox["brz"])) {
                ret["candidate_ids"].push(id);
                var boxsize = (cbox["brx"] - cbox["tlx"]) * (cbox["bry"] - cbox["tly"]);
                if (boxsize < minsize) {
                    minsize = boxsize;
                    ret["best"] = {
                        "annid": id
                    };
                }
            }
        }
        return ret;
    };
    ULabel.prototype.suggest_edits = function (mouse_event, nonspatial_id) {
        if (mouse_event === void 0) { mouse_event = null; }
        if (nonspatial_id === void 0) { nonspatial_id = null; }
        var best_candidate;
        if (nonspatial_id == null) {
            if (mouse_event == null) {
                mouse_event = this.state["last_move"];
            }
            var dst_thresh = this.config["edit_handle_size"] / 2;
            var global_x = this.get_global_mouse_x(mouse_event);
            var global_y = this.get_global_mouse_y(mouse_event);
            if (jquery_1.default(mouse_event.target).hasClass("gedit-target"))
                return;
            var edit_candidates = this.get_edit_candidates(global_x, global_y, dst_thresh);
            if (edit_candidates["best"] == null) {
                this.hide_global_edit_suggestion();
                this.hide_edit_suggestion();
                this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"] = null;
                return;
            }
            // Look for an existing point that's close enough to suggest editing it
            var nearest_active_keypoint = this.get_nearest_active_keypoint(global_x, global_y, dst_thresh, edit_candidates["candidate_ids"]);
            if (nearest_active_keypoint != null && nearest_active_keypoint.point != null) {
                this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"] = nearest_active_keypoint;
                this.show_edit_suggestion(nearest_active_keypoint, true);
                edit_candidates["best"] = nearest_active_keypoint;
            }
            else { // If none are found, look for a point along a segment that's close enough
                var nearest_segment_point = this.get_nearest_segment_point(global_x, global_y, dst_thresh, edit_candidates["candidate_ids"]);
                if (nearest_segment_point != null && nearest_segment_point.point != null) {
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"] = nearest_segment_point;
                    this.show_edit_suggestion(nearest_segment_point, false);
                    edit_candidates["best"] = nearest_segment_point;
                }
                else {
                    this.hide_edit_suggestion();
                }
            }
            // Show global edit dialogs for "best" candidate
            this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"] = edit_candidates["best"];
            best_candidate = edit_candidates["best"]["annid"];
        }
        else {
            this.hide_global_edit_suggestion();
            this.hide_edit_suggestion();
            best_candidate = nonspatial_id;
        }
        this.show_global_edit_suggestion(best_candidate, null, nonspatial_id);
    };
    // ================= Error handlers =================
    // Notify the user of information at a given level
    ULabel.prototype.raise_error = function (message, level) {
        if (level === void 0) { level = ULabel.elvl_standard; }
        switch (level) {
            // TODO less crude here
            case ULabel.elvl_info:
                console.log("[info] " + message);
                break;
            case ULabel.elvl_standard:
                alert("[error] " + message);
                break;
            case ULabel.elvl_fatal:
                alert("[fatal] " + message);
                throw new Error(message);
        }
    };
    // ================= Mouse event interpreters =================
    // Get the mouse position on the screen
    ULabel.prototype.get_global_mouse_x = function (mouse_event) {
        var scale = this.get_empirical_scale();
        var annbox = jquery_1.default("#" + this.config["annbox_id"]);
        var raw = (mouse_event.pageX - annbox.offset().left + annbox.scrollLeft()) / scale;
        // return Math.round(raw);
        return raw;
    };
    ULabel.prototype.get_global_mouse_y = function (mouse_event) {
        var scale = this.get_empirical_scale();
        var annbox = jquery_1.default("#" + this.config["annbox_id"]);
        var raw = (mouse_event.pageY - annbox.offset().top + annbox.scrollTop()) / scale;
        // return Math.round(raw);
        return raw;
    };
    ULabel.prototype.get_global_element_center_x = function (jqel) {
        var scale = this.get_empirical_scale();
        var annbox = jquery_1.default("#" + this.config["annbox_id"]);
        var raw = (jqel.offset().left + jqel.width() / 2 - annbox.offset().left + annbox.scrollLeft()) / scale;
        // return Math.round(raw);
        return raw;
    };
    ULabel.prototype.get_global_element_center_y = function (jqel) {
        var scale = this.get_empirical_scale();
        var annbox = jquery_1.default("#" + this.config["annbox_id"]);
        var raw = (jqel.offset().top + jqel.height() / 2 - annbox.offset().top + annbox.scrollTop()) / scale;
        // return Math.round();
        return raw;
    };
    // ================= Dialog Interaction Handlers =================
    // ----------------- ID Dialog -----------------
    ULabel.prototype.lookup_id_dialog_mouse_pos = function (mouse_event, front) {
        var idd = jquery_1.default("#" + this.subtasks[this.state["current_subtask"]]["state"]["idd_id"]);
        if (front) {
            idd = jquery_1.default("#" + this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"]);
        }
        // Get mouse position relative to center of div
        var idd_x = mouse_event.pageX - idd.offset().left - idd.width() / 2;
        var idd_y = mouse_event.pageY - idd.offset().top - idd.height() / 2;
        // Useful for interpreting mouse loc
        var inner_rad = this.config["inner_prop"] * this.config["outer_diameter"] / 2;
        var outer_rad = 0.5 * this.config["outer_diameter"];
        // Get radius
        var mouse_rad = Math.sqrt(Math.pow(idd_x, 2) + Math.pow(idd_y, 2));
        // If not inside, return
        if (mouse_rad > outer_rad) {
            return null;
        }
        // If in the core, return
        if (mouse_rad < inner_rad) {
            return null;
        }
        // Get array of classes by name in the dialog
        //    TODO handle nesting case
        //    TODO this is not efficient
        var class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
        // Get the index of that class currently hovering over
        var class_ind = (-1 * Math.floor(Math.atan2(idd_y, idd_x) / (2 * Math.PI) * class_ids.length) + class_ids.length) % class_ids.length;
        // Get the distance proportion of the hover
        var dist_prop = (mouse_rad - inner_rad) / (outer_rad - inner_rad);
        return {
            class_ind: class_ind,
            dist_prop: dist_prop,
        };
    };
    ULabel.prototype.set_id_dialog_payload_nopin = function (class_ind, dist_prop) {
        var class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
        // Recompute and render opaque pie slices
        for (var i = 0; i < class_ids.length; i++) {
            if (i == class_ind) {
                this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                    "class_id": class_ids[i],
                    "confidence": dist_prop
                };
            }
            else {
                this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                    "class_id": class_ids[i],
                    "confidence": (1 - dist_prop) / (class_ids.length - 1)
                };
            }
        }
    };
    ULabel.prototype.set_id_dialog_payload_to_init = function (annid, pyld) {
        if (pyld === void 0) { pyld = null; }
        // TODO(3D)
        var crst = this.state["current_subtask"];
        if (pyld != null) {
            this.subtasks[this.state["current_subtask"]]["state"]["id_payload"] = JSON.parse(JSON.stringify(pyld));
            this.update_id_toolbox_display();
        }
        else {
            if (annid != null) {
                var anpyld = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["classification_payloads"];
                if (anpyld != null) {
                    this.subtasks[this.state["current_subtask"]]["state"]["id_payload"] = JSON.parse(JSON.stringify(anpyld));
                    return;
                }
            }
            // TODO currently assumes soft
            if (!this.config["allow_soft_id"]) {
                var dist_prop = 1.0;
                var class_ids = this.subtasks[crst]["class_ids"];
                var pfx = "div#tb-id-app--" + this.state["current_subtask"];
                var idarr = jquery_1.default(pfx + " a.tbid-opt.sel").attr("id").split("_");
                var class_ind = class_ids.indexOf(parseInt(idarr[idarr.length - 1]));
                // Recompute and render opaque pie slices
                for (var i = 0; i < class_ids.length; i++) {
                    if (i == class_ind) {
                        this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                            "class_id": class_ids[i],
                            "confidence": dist_prop
                        };
                    }
                    else {
                        this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                            "class_id": class_ids[i],
                            "confidence": (1 - dist_prop) / (class_ids.length - 1)
                        };
                    }
                }
            }
            else {
                // Not currently supported
            }
        }
    };
    ULabel.prototype.update_id_dialog_display = function (front) {
        if (front === void 0) { front = false; }
        var inner_rad = this.config["inner_prop"] * this.config["outer_diameter"] / 2;
        var outer_rad = 0.5 * this.config["outer_diameter"];
        var class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
        for (var i = 0; i < class_ids.length; i++) {
            var srt_prop = this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i]["confidence"];
            var cum_prop = i / class_ids.length;
            var srk_prop = 1 / class_ids.length;
            var gap_prop = 1.0 - srk_prop;
            var rad_frnt = inner_rad + srt_prop * (outer_rad - inner_rad) / 2;
            var wdt_frnt = srt_prop * (outer_rad - inner_rad);
            var srk_frnt = 2 * Math.PI * rad_frnt * srk_prop;
            var gap_frnt = 2 * Math.PI * rad_frnt * gap_prop;
            var off_frnt = 2 * Math.PI * rad_frnt * cum_prop;
            // TODO this is kind of a mess. If it works as is, the commented region below should be deleted
            // var circ = document.getElementById("circ_" + class_ids[i]);
            // circ.setAttribute("r", rad_frnt);
            // circ.setAttribute("stroke-dasharray", `${srk_frnt} ${gap_frnt}`);
            // circ.setAttribute("stroke-dashoffset", off_frnt);
            // circ.setAttribute("stroke-width", wdt_frnt);
            var idd_id = void 0;
            if (!front) {
                idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
            }
            else {
                idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
            }
            var circ = jquery_1.default("#" + idd_id + "__circ_" + class_ids[i]);
            // circ.attr("r", rad_frnt);
            // circ.attr("stroke-dasharray", `${srk_frnt} ${gap_frnt}`)
            // circ.attr("stroke-dashoffset", off_frnt)
            // circ.attr("stroke-width", wdt_frnt)
            // circ = $(`#${idd_id}__circ_` + class_ids[i])
            circ.attr("r", rad_frnt);
            circ.attr("stroke-dasharray", srk_frnt + " " + gap_frnt);
            circ.attr("stroke-dashoffset", off_frnt);
            circ.attr("stroke-width", wdt_frnt);
        }
        this.redraw_demo();
    };
    ULabel.prototype.update_id_toolbox_display = function () {
        if (this.config["allow_soft_id"]) {
            // Not supported yet
        }
        else {
            var pfx = "div#tb-id-app--" + this.state["current_subtask"];
            var class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
            for (var i = 0; i < class_ids.length; i++) {
                var cls = class_ids[i];
                if (this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i]["confidence"] > 0.5) {
                    if (!(jquery_1.default(pfx + " #" + this.config["toolbox_id"] + " a#toolbox_sel_" + cls).hasClass("sel"))) {
                        jquery_1.default(pfx + " #" + this.config["toolbox_id"] + " a.tbid-opt.sel").attr("href", "#");
                        jquery_1.default(pfx + " #" + this.config["toolbox_id"] + " a.tbid-opt.sel").removeClass("sel");
                        jquery_1.default(pfx + " #" + this.config["toolbox_id"] + " a#toolbox_sel_" + cls).addClass("sel");
                        jquery_1.default(pfx + " #" + this.config["toolbox_id"] + " a#toolbox_sel_" + cls).removeAttr("href");
                    }
                }
            }
        }
    };
    ULabel.prototype.handle_id_dialog_hover = function (mouse_event) {
        // Determine which dialog
        var front = false;
        if (this.subtasks[this.state["current_subtask"]]["state"]["idd_which"] == "front") {
            front = true;
        }
        var pos_evt = this.lookup_id_dialog_mouse_pos(mouse_event, front);
        if (pos_evt != null) {
            if (!this.config["allow_soft_id"]) {
                pos_evt.dist_prop = 1.0;
            }
            // TODO This assumes no pins
            this.set_id_dialog_payload_nopin(pos_evt.class_ind, pos_evt.dist_prop);
            this.update_id_dialog_display(front);
            this.update_id_toolbox_display();
        }
    };
    ULabel.prototype.assign_annotation_id = function (actid, redo_payload) {
        if (actid === void 0) { actid = null; }
        if (redo_payload === void 0) { redo_payload = null; }
        var new_payload = null;
        var old_payload = null;
        var redoing = false;
        // TODO(3d)
        if (redo_payload == null) {
            if (actid == null) {
                actid = this.subtasks[this.state["current_subtask"]]["state"]["idd_associated_annotation"];
            }
            old_payload = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"]));
            new_payload = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]));
        }
        else {
            redoing = true;
            old_payload = JSON.parse(JSON.stringify(redo_payload.old_id_payload));
            new_payload = JSON.parse(JSON.stringify(redo_payload.new_id_payload));
            actid = redo_payload.actid;
        }
        // Perform assignment
        // TODO(3d)
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] = JSON.parse(JSON.stringify(new_payload));
        // Redraw with correct color and hide id_dialog if applicable
        if (!redoing) {
            this.hide_id_dialog();
        }
        else {
            this.suggest_edits();
        }
        this.redraw_all_annotations(this.state["current_subtask"]);
        // Explicit changes are undoable
        // First assignments are treated as though they were done all along
        // TODO(3d)
        if (this.subtasks[this.state["current_subtask"]]["state"]["first_explicit_assignment"]) {
            var n = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length;
            for (var i = 0; i < n; i++) {
                if (this.subtasks[this.state["current_subtask"]]["actions"]["stream"][n - i - 1].act_type == "begin_annotation") {
                    this.subtasks[this.state["current_subtask"]]["actions"]["stream"][n - i - 1].redo_payload.init_payload = JSON.parse(JSON.stringify(new_payload));
                    break;
                }
            }
        }
        else {
            this.record_action({
                act_type: "assign_annotation_id",
                undo_payload: {
                    actid: actid,
                    old_id_payload: JSON.parse(JSON.stringify(old_payload))
                },
                redo_payload: {
                    actid: actid,
                    old_id_payload: JSON.parse(JSON.stringify(old_payload)),
                    new_id_payload: JSON.parse(JSON.stringify(new_payload))
                }
            }, redoing);
        }
    };
    ULabel.prototype.assign_annotation_id__undo = function (undo_payload) {
        var actid = undo_payload.actid;
        var new_payload = JSON.parse(JSON.stringify(undo_payload.old_id_payload));
        // TODO(3d)
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] = JSON.parse(JSON.stringify(new_payload));
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.suggest_edits();
    };
    ULabel.prototype.handle_id_dialog_click = function (mouse_event) {
        this.handle_id_dialog_hover(mouse_event);
        // TODO need to differentiate between first click and a reassign -- potentially with global state
        this.assign_annotation_id();
        this.subtasks[this.state["current_subtask"]]["state"]["first_explicit_assignment"] = false;
        this.suggest_edits(this.state["last_move"]);
    };
    // ================= Viewer/Annotation Interaction Handlers  ================= 
    ULabel.prototype.handle_mouse_down = function (mouse_event) {
        var drag_key = ULabel.get_drag_key_start(mouse_event, this);
        if (drag_key != null) {
            // Don't start new drag while id_dialog is visible
            if (this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] && !this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                return;
            }
            mouse_event.preventDefault();
            if (this.drag_state["active_key"] == null) {
                this.start_drag(drag_key, mouse_event.button, mouse_event);
            }
        }
    };
    ULabel.prototype.handle_mouse_move = function (mouse_event) {
        this.state["last_move"] = mouse_event;
        // If the ID dialog is visible, let it's own handler take care of this
        // If not dragging...
        if (this.drag_state["active_key"] == null) {
            if (this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] && !this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                return;
            }
            // If polygon is in progress, redirect last segment
            if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"]) {
                if ((this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polygon") ||
                    (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polyline")) {
                    this.continue_annotation(mouse_event);
                }
            }
            else { // Nothing in progress. Maybe show editable queues
                this.suggest_edits(mouse_event);
            }
        }
        else { // Dragging
            switch (this.drag_state["active_key"]) {
                case "pan":
                    this.drag_repan(mouse_event);
                    break;
                case "zoom":
                    this.drag_rezoom(mouse_event);
                    break;
                case "annotation":
                    if (!this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] || this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                        this.continue_annotation(mouse_event);
                    }
                    break;
                case "edit":
                    if (!this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] || this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                        this.edit_annotation(mouse_event);
                    }
                    break;
                case "move":
                    if (!this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] || this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                        this.move_annotation(mouse_event);
                    }
                    break;
            }
        }
    };
    ULabel.prototype.handle_mouse_up = function (mouse_event) {
        if (mouse_event.button == this.drag_state["release_button"]) {
            this.end_drag(mouse_event);
        }
    };
    // Start dragging to pan around image
    // Called when mousedown fires within annbox
    ULabel.prototype.start_drag = function (drag_key, release_button, mouse_event) {
        // Convenience
        var annbox = jquery_1.default("#" + this.config["annbox_id"]);
        this.drag_state["active_key"] = drag_key;
        this.drag_state["release_button"] = release_button;
        this.drag_state[drag_key]["mouse_start"] = [
            mouse_event.clientX,
            mouse_event.clientY,
            this.state["current_frame"]
        ];
        this.drag_state[drag_key]["zoom_val_start"] = this.state["zoom_val"];
        this.drag_state[drag_key]["offset_start"] = [
            annbox.scrollLeft(),
            annbox.scrollTop()
        ];
        jquery_1.default("textarea").trigger("blur");
        jquery_1.default("div.permopen").removeClass("permopen");
        // TODO handle this drag start
        var annmd;
        switch (drag_key) {
            case "annotation":
                annmd = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
                if (annmd != "polygon" && annmd != "polyline" && !NONSPATIAL_MODES.includes(annmd)) {
                    this.begin_annotation(mouse_event);
                }
                break;
            case "edit":
                this.begin_edit(mouse_event);
                break;
            case "move":
                this.begin_move(mouse_event);
                break;
            default:
                // No handling necessary for pan and zoom until mousemove
                break;
        }
    };
    ULabel.prototype.end_drag = function (mouse_event) {
        // TODO handle this drag end
        switch (this.drag_state["active_key"]) {
            case "annotation":
                if (this.subtasks[this.state["current_subtask"]]["state"]["active_id"] != null) {
                    if ((this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] != "polygon") &&
                        (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] != "polyline")) {
                        this.finish_annotation(mouse_event);
                    }
                    else {
                        if ((mouse_event.target.id == "ender_" + this.subtasks[this.state["current_subtask"]]["state"]["active_id"]) ||
                            (mouse_event.target.id == "ender_" + this.subtasks[this.state["current_subtask"]]["state"]["active_id"] + "_inner")) {
                            this.finish_annotation(mouse_event);
                        }
                        else {
                            this.continue_annotation(mouse_event, true);
                        }
                    }
                }
                else {
                    if ((this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polygon") ||
                        (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polyline")) {
                        this.begin_annotation(mouse_event);
                    }
                }
                break;
            case "right":
                if (this.subtasks[this.state["current_subtask"]]["state"]["active_id"] != null) {
                    if (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polyline") {
                        this.finish_annotation(mouse_event);
                    }
                }
                break;
            case "edit":
                // TODO should be finish edit, right?
                this.finish_edit();
                break;
            case "move":
                this.finish_move(mouse_event);
                break;
            default:
                // No handling necessary for pan and zoom until mousemove
                break;
        }
        this.drag_state["active_key"] = null;
        this.drag_state["release_button"] = null;
    };
    // Pan to correct location given mouse dragging
    ULabel.prototype.drag_repan = function (mouse_event) {
        // Convenience
        var annbox = jquery_1.default("#" + this.config["annbox_id"]);
        // Pan based on mouse position
        var aX = mouse_event.clientX;
        var aY = mouse_event.clientY;
        annbox.scrollLeft(this.drag_state["pan"]["offset_start"][0] + (this.drag_state["pan"]["mouse_start"][0] - aX));
        annbox.scrollTop(this.drag_state["pan"]["offset_start"][1] + (this.drag_state["pan"]["mouse_start"][1] - aY));
    };
    // Handle zooming by click-drag
    ULabel.prototype.drag_rezoom = function (mouse_event) {
        var aY = mouse_event.clientY;
        this.state["zoom_val"] = (this.drag_state["zoom"]["zoom_val_start"] * Math.pow(1.1, -(aY - this.drag_state["zoom"]["mouse_start"][1]) / 10));
        this.rezoom(this.drag_state["zoom"]["mouse_start"][0], this.drag_state["zoom"]["mouse_start"][1]);
    };
    // Handle zooming at a certain focus
    ULabel.prototype.rezoom = function (foc_x, foc_y, abs) {
        if (foc_x === void 0) { foc_x = null; }
        if (foc_y === void 0) { foc_y = null; }
        if (abs === void 0) { abs = false; }
        // JQuery convenience
        var imwrap = jquery_1.default("#" + this.config["imwrap_id"]);
        var annbox = jquery_1.default("#" + this.config["annbox_id"]);
        if (foc_x == null) {
            foc_x = annbox.width() / 2;
        }
        if (foc_y == null) {
            foc_y = annbox.height() / 2;
        }
        // Get old size and position
        var old_width = imwrap.width();
        var old_height = imwrap.height();
        var old_left = annbox.scrollLeft();
        var old_top = annbox.scrollTop();
        if (abs) {
            old_width = this.config["image_width"];
            old_height = this.config["image_height"];
        }
        var viewport_width = annbox.width();
        var viewport_height = annbox.height();
        // Compute new size
        var new_width = Math.round(this.config["image_width"] * this.state["zoom_val"]);
        var new_height = Math.round(this.config["image_height"] * this.state["zoom_val"]);
        // Apply new size
        var toresize = jquery_1.default("." + this.config["imgsz_class"]);
        toresize.css("width", new_width + "px");
        toresize.css("height", new_height + "px");
        // Compute and apply new position
        var new_left, new_top;
        if (abs) {
            new_left = foc_x * new_width / old_width - viewport_width / 2;
            new_top = foc_y * new_height / old_height - viewport_height / 2;
        }
        else {
            new_left = (old_left + foc_x) * new_width / old_width - foc_x;
            new_top = (old_top + foc_y) * new_height / old_height - foc_y;
        }
        annbox.scrollLeft(new_left);
        annbox.scrollTop(new_top);
        // Redraw demo annotation
        this.redraw_demo();
    };
    ULabel.prototype.swap_frame_image = function (new_src, frame) {
        if (frame === void 0) { frame = 0; }
        var ret = jquery_1.default("img#" + this.config["image_id_pfx"] + "__" + frame).attr("src");
        jquery_1.default("img#" + this.config["image_id_pfx"] + "__" + frame).attr("src", new_src);
        return ret;
    };
    // Swap annotation box background color
    ULabel.prototype.swap_anno_bg_color = function (new_bg_color) {
        var annbox = jquery_1.default("#" + this.config["annbox_id"]);
        var ret = annbox.css("background-color");
        annbox.css("background-color", new_bg_color);
        return ret;
    };
    ULabel.prototype.reset_interaction_state = function (subtask) {
        if (subtask === void 0) { subtask = null; }
        var q = [];
        if (subtask == null) {
            for (var st in this.subtasks) {
                q.push(st);
            }
        }
        else {
            q.push(subtask);
        }
        for (var i = 0; i < q.length; i++) {
            if (this.subtasks[q[i]]["state"]["active_id"] != null) {
                // Delete polygon ender if exists
                jquery_1.default("#ender_" + this.subtasks[q[i]]["state"]["active_id"]).remove();
            }
            this.subtasks[q[i]]["state"]["is_in_edit"] = false;
            this.subtasks[q[i]]["state"]["is_in_move"] = false;
            this.subtasks[q[i]]["state"]["is_in_progress"] = false;
            this.subtasks[q[i]]["state"]["active_id"] = null;
            // this.show
            // Found this here, probably a mistake? TODO sort out 
        }
        this.drag_state = {
            "active_key": null,
            "release_button": null,
            "annotation": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "edit": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "pan": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "zoom": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "move": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "right": {
                "mouse_start": null,
                "offset_start": null,
                "zoom_val_start": null // zoom_val when the dragging interaction started
            }
        };
    };
    // Allow for external access and modification of annotations within a subtask
    ULabel.prototype.get_annotations = function (subtask) {
        var ret = [];
        for (var i = 0; i < this.subtasks[subtask]["annotations"]["ordering"].length; i++) {
            var id = this.subtasks[subtask]["annotations"]["ordering"][i];
            if (id != this.subtasks[this.state["current_subtask"]]["state"]["active_id"]) {
                ret.push(this.subtasks[subtask]["annotations"]["access"][id]);
            }
        }
        return JSON.parse(JSON.stringify(ret));
    };
    ULabel.prototype.set_annotations = function (new_annotations, subtask) {
        // Undo/redo won't work through a get/set
        this.reset_interaction_state();
        this.subtasks[subtask]["actions"]["stream"] = [];
        this.subtasks[subtask]["actions"]["undo_stack"] = [];
        var newanns = JSON.parse(JSON.stringify(new_annotations));
        var new_ordering = [];
        var new_access = {};
        for (var i = 0; i < newanns.length; i++) {
            new_ordering.push(newanns[i]["id"]);
            new_access[newanns[i]["id"]] = newanns[i];
        }
        this.subtasks[subtask]["annotations"]["ordering"] = new_ordering;
        this.subtasks[subtask]["annotations"]["access"] = new_access;
        for (var i = 0; i < new_ordering.length; i++) {
            this.rebuild_containing_box(new_ordering[i], false, subtask);
        }
        this.redraw_all_annotations(subtask);
    };
    // Change frame
    ULabel.prototype.update_frame = function (delta, new_frame) {
        if (delta === void 0) { delta = null; }
        if (new_frame === void 0) { new_frame = null; }
        if (this.config["image_data"]["frames"].length == 1) {
            return;
        }
        var actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        if (actid != null) {
            if (!MODES_3D.includes(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"])) {
                return;
            }
        }
        if (new_frame == null) {
            new_frame = parseInt(jquery_1.default("div#" + this.config["toolbox_id"] + " input.frame_input").val());
            if (delta != null) {
                new_frame = Math.min(Math.max(new_frame + delta, 0), this.config["image_data"].frames.length - 1);
            }
        }
        else {
            new_frame = Math.min(Math.max(new_frame, 0), this.config["image_data"].frames.length - 1);
        }
        // Change the val above
        jquery_1.default("div#" + this.config["toolbox_id"] + " input.frame_input").val(new_frame);
        var old_frame = this.state["current_frame"];
        this.state["current_frame"] = new_frame;
        // $(`img#${this.config["image_id_pfx"]}__${old_frame}`).css("z-index", "initial");
        jquery_1.default("img#" + this.config["image_id_pfx"] + "__" + old_frame).css("display", "none");
        // $(`img#${this.config["image_id_pfx"]}__${new_frame}`).css("z-index", 50);
        jquery_1.default("img#" + this.config["image_id_pfx"] + "__" + new_frame).css("display", "block");
        if (actid &&
            MODES_3D.includes(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"])) {
            if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"]) {
                this.edit_annotation(this.state["last_move"]);
            }
            else if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"]) {
                this.move_annotation(this.state["last_move"]);
            }
            else if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"]) {
                this.continue_annotation(this.state["last_move"]);
            }
            else {
                this.redraw_all_annotations();
            }
        }
        else {
            this.redraw_all_annotations();
        }
        if (this.state["last_move"] != null) {
            this.suggest_edits(this.state["last_move"]);
        }
    };
    // Generic Callback Support
    ULabel.prototype.on = function (fn, callback) {
        var old_fn = fn.bind(this);
        this[fn.name] = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            old_fn.apply(void 0, args);
            callback();
        };
    };
    return ULabel;
}());
exports.ULabel = ULabel;
// TODO not any-cast
window.ULabel = ULabel;
