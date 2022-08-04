"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTMLBuilder = void 0;
var toolbox_1 = require("./toolbox");
var version_1 = require("./version");
var blobs_1 = require("./blobs");
var HTMLBuilder = /** @class */ (function () {
    function HTMLBuilder() {
    }
    HTMLBuilder.get_md_button = function (md_key, md_name, svg_blob, cur_md, subtasks) {
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
        return "<div class=\"mode-opt\">\n            <a".concat(href, " id=\"md-btn--").concat(md_key, "\" class=\"md-btn").concat(sel).concat(st_classes, " invert-this-svg\" amdname=\"").concat(md_name, "\">\n                ").concat(svg_blob, "\n            </a>\n        </div>");
    };
    HTMLBuilder.get_images_html = function (ulabel) {
        var images_html = "";
        var display;
        for (var i = 0; i < ulabel.config["image_data"].frames.length; i++) {
            if (i != 0) {
                display = "none";
            }
            else {
                display = "block";
            }
            images_html += "\n                <img id=\"".concat(ulabel.config["image_id_pfx"], "__").concat(i, "\" src=\"").concat(ulabel.config["image_data"].frames[i], "\" class=\"imwrap_cls ").concat(ulabel.config["imgsz_class"], " image_frame\" style=\"z-index: 50; display: ").concat(display, ";\" />\n            ");
        }
        return images_html;
    };
    HTMLBuilder.get_frame_annotation_dialogs = function (ulabel) {
        var frame_annotation_dialog = "";
        var tot = 0;
        for (var st_key in ulabel.subtasks) {
            if (!ulabel.subtasks[st_key].allowed_modes.includes('whole-image') &&
                !ulabel.subtasks[st_key].allowed_modes.includes('global')) {
                continue;
            }
            tot += 1;
        }
        var ind = 0;
        for (var st_key in ulabel.subtasks) {
            if (!ulabel.subtasks[st_key].allowed_modes.includes('whole-image') &&
                !ulabel.subtasks[st_key].allowed_modes.includes('global')) {
                continue;
            }
            frame_annotation_dialog += "\n                <div id=\"fad_st__".concat(st_key, "\" class=\"frame_annotation_dialog fad_st__").concat(st_key, " fad_ind__").concat(tot - ind - 1, "\">\n                    <div class=\"hide_overflow_container\">\n                        <div class=\"row_container\">\n                            <div class=\"fad_row name\">\n                                <div class=\"fad_row_inner\">\n                                    <div class=\"fad_st_name\">").concat(ulabel.subtasks[st_key].display_name, "</div>\n                                </div>\n                            </div>\n                            <div class=\"fad_row add\">\n                                <div class=\"fad_row_inner\">\n                                    <div class=\"fad_st_add\">\n                                        <a class=\"add-glob-button\" href=\"#\">+</a>\n                                    </div>\n                                </div>\n                            </div><div class=\"fad_annotation_rows\"></div>\n                        </div>\n                    </div>\n                </div>\n            ");
            ind += 1;
            if (ind > 4) {
                throw new Error("At most 4 subtasks can have allow 'whole-image' or 'global' annotations.");
            }
        }
        return frame_annotation_dialog;
    };
    HTMLBuilder.prep_window_html = function (ulabel, toolbox_item_order) {
        // Bring image and annotation scaffolding in
        // TODO multi-image with spacing etc.
        if (toolbox_item_order === void 0) { toolbox_item_order = null; }
        // const tabs = ULabel.get_toolbox_tabs(ul);
        var images = HTMLBuilder.get_images_html(ulabel);
        var frame_annotation_dialogs = HTMLBuilder.get_frame_annotation_dialogs(ulabel);
        // const toolbox = configuration.create_toolbox();
        var toolbox = new toolbox_1.Toolbox([], toolbox_1.Toolbox.create_toolbox(ulabel, toolbox_item_order));
        var tool_html = toolbox.setup_toolbox_html(ulabel, frame_annotation_dialogs, images, version_1.ULABEL_VERSION);
        // Set the container's html to the toolbox html we just created
        $("#" + ulabel.config["container_id"]).html(tool_html);
        // Build toolbox for the current subtask only
        var current_subtask = Object.keys(ulabel.subtasks)[0];
        // Initialize toolbox based on configuration
        var sp_id = ulabel.config["toolbox_id"];
        var curmd = ulabel.subtasks[current_subtask]["state"]["annotation_mode"];
        var md_buttons = [
            HTMLBuilder.get_md_button("bbox", "Bounding Box", blobs_1.BBOX_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("point", "Point", blobs_1.POINT_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("polygon", "Polygon", blobs_1.POLYGON_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("tbar", "T-Bar", blobs_1.TBAR_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("polyline", "Polyline", blobs_1.POLYLINE_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("contour", "Contour", blobs_1.CONTOUR_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("bbox3", "Bounding Cube", blobs_1.BBOX3_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("whole-image", "Whole Frame", blobs_1.WHOLE_IMAGE_SVG, curmd, ulabel.subtasks),
            HTMLBuilder.get_md_button("global", "Global", blobs_1.GLOBAL_SVG, curmd, ulabel.subtasks),
        ];
        // Append but don't wait
        $("#" + sp_id + " .toolbox_inner_cls .mode-selection").append(md_buttons.join("<!-- -->"));
        // Show current mode label
        ulabel.show_annotation_mode(null);
        // Make sure that entire toolbox is shown
        if ($("#" + ulabel.config["toolbox_id"] + " .toolbox_inner_cls").height() > $("#" + ulabel.config["container_id"]).height()) {
            $("#" + ulabel.config["toolbox_id"]).css("overflow-y", "scroll");
        }
        ulabel.toolbox = toolbox;
        // Check an array to see if it contains a ZoomPanToolboxItem
        var contains_zoom_pan = function (array) {
            //check if the array is empty
            if (array.length == 0)
                return false;
            // Loop through everything in the array and check if its the ZoomPanToolboxItem
            for (var idx in array) {
                if (array[idx] instanceof toolbox_1.ZoomPanToolboxItem) {
                    return true;
                }
            }
            // If the ZoomPanToolboxItem wasn't found then return false
            return false;
        };
        // Check if initial_crop exists and has the appropriate properties
        var check_initial_crop = function (initial_crop) {
            // If initial_crop doesn't exist, return false
            if (initial_crop == null)
                return false;
            // If initial_crop has the appropriate properties, return true
            if ("width" in initial_crop &&
                "height" in initial_crop &&
                "left" in initial_crop &&
                "top" in initial_crop) {
                return true;
            }
            // If initial_crop exists but doesn't have the appropriate properties,
            // then raise an error and return false
            ulabel.raise_error("initial_crop missing necessary properties. Ignoring.");
            return false;
        };
        // Make sure the toolbox contains the ZoomPanToolboxItem
        if (contains_zoom_pan(ulabel.toolbox.items)) {
            // Make sure the initial_crop exists and contains the necessary properties
            if (check_initial_crop(ulabel.config.initial_crop)) {
                // Grab the initial crop button and rename it
                var initial_crop_button = document.getElementById("recenter-button");
                initial_crop_button.innerHTML = "Initial Crop";
            }
            else {
                // Grab the whole image button and set its display to none
                var whole_image_button = document.getElementById("recenter-whole-image-button");
                whole_image_button.style.display = "none";
            }
        }
    };
    return HTMLBuilder;
}());
exports.HTMLBuilder = HTMLBuilder;
