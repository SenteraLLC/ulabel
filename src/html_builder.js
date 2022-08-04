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
    HTMLBuilder.get_idd_string = function (idd_id, width, center_coord, cl_opacity, class_ids, inner_rad, outer_rad, class_defs) {
        // TODO noconflict
        var dialog_html = "\n        <div id=\"".concat(idd_id, "\" class=\"id_dialog\" style=\"width: ").concat(width, "px; height: ").concat(width, "px;\">\n            <a class=\"id-dialog-clickable-indicator\" href=\"#\"></a>\n            <svg width=\"").concat(width, "\" height=\"").concat(width, "\">\n        ");
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
            dialog_html += "\n            <circle\n                r=\"".concat(rad_back, "\" cx=\"").concat(center_coord, "\" cy=\"").concat(center_coord, "\" \n                stroke=\"").concat(ths_col, "\" \n                fill-opacity=\"0\"\n                stroke-opacity=\"").concat(cl_opacity, "\"\n                stroke-width=\"").concat(wdt_back, "\"; \n                stroke-dasharray=\"").concat(srk_back, " ").concat(gap_back, "\" \n                stroke-dashoffset=\"").concat(off_back, "\" />\n            <circle\n                id=\"").concat(idd_id, "__circ_").concat(ths_id, "\"\n                r=\"").concat(rad_frnt, "\" cx=\"").concat(center_coord, "\" cy=\"").concat(center_coord, "\"\n                fill-opacity=\"0\"\n                stroke=\"").concat(ths_col, "\" \n                stroke-opacity=\"1.0\"\n                stroke-width=\"").concat(wdt_frnt, "\" \n                stroke-dasharray=\"").concat(srk_frnt, " ").concat(gap_frnt, "\" \n                stroke-dashoffset=\"").concat(off_frnt, "\" />\n            ");
        }
        dialog_html += "\n            </svg>\n            <div class=\"centcirc\"></div>\n        </div>";
        return dialog_html;
    };
    HTMLBuilder.build_id_dialogs = function (ulabel) {
        var full_toolbox_html = "<div class=\"toolbox-id-app-payload\">";
        var width = ulabel.config.outer_diameter;
        // TODO real names here!
        var inner_rad = ulabel.config.inner_prop * width / 2;
        var inner_diam = inner_rad * 2;
        var outer_rad = 0.5 * width;
        var inner_top = outer_rad - inner_rad;
        var inner_lft = outer_rad - inner_rad;
        var cl_opacity = 0.4;
        var tbid = ulabel.config.toolbox_id;
        var center_coord = width / 2;
        for (var st in ulabel.subtasks) {
            var idd_id = ulabel.subtasks[st]["state"]["idd_id"];
            var idd_id_front = ulabel.subtasks[st]["state"]["idd_id_front"];
            var subtask_dialog_container_jq = $("#dialogs__" + st);
            var front_subtask_dialog_container_jq = $("#front_dialogs__" + st);
            var dialog_html_v2 = HTMLBuilder.get_idd_string(idd_id, width, center_coord, cl_opacity, ulabel.subtasks[st]["class_ids"], inner_rad, outer_rad, ulabel.subtasks[st]["class_defs"]);
            var front_dialog_html_v2 = HTMLBuilder.get_idd_string(idd_id_front, width, center_coord, cl_opacity, ulabel.subtasks[st]["class_ids"], inner_rad, outer_rad, ulabel.subtasks[st]["class_defs"]);
            // TODO noconflict
            var toolbox_html = "<div id=\"tb-id-app--".concat(st, "\" class=\"tb-id-app\">");
            var class_ids = ulabel.subtasks[st]["class_ids"];
            for (var i = 0; i < class_ids.length; i++) {
                var this_id = class_ids[i];
                var this_color = ulabel.subtasks[st]["class_defs"][i]["color"];
                var this_name = ulabel.subtasks[st]["class_defs"][i]["name"];
                var sel = "";
                var href = ' href="#"';
                if (i == 0) {
                    sel = " sel";
                    href = "";
                }
                if (ulabel.config["allow_soft_id"]) {
                    var msg = "Only hard id is currently supported";
                    throw new Error(msg);
                }
                else {
                    toolbox_html += "\n                        <a".concat(href, " id=\"").concat(tbid, "_sel_").concat(this_id, "\" class=\"tbid-opt").concat(sel, "\">\n                            <div class=\"colprev ").concat(tbid, "_colprev_").concat(this_id, "\" style=\"background-color: ").concat(this_color, "\"></div> <span class=\"tb-cls-nam\">").concat(this_name, "</span>\n                        </a>\n                    ");
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
            ulabel.subtasks[st]["state"]["visible_dialogs"][idd_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
        }
        // Add all toolbox html at once
        $("#" + ulabel.config["toolbox_id"] + " div.id-toolbox-app").html(full_toolbox_html);
        // Style revisions based on the size
        var idci = $("#" + ulabel.config["container_id"] + " a.id-dialog-clickable-indicator");
        idci.css({
            "height": "".concat(width, "px"),
            "width": "".concat(width, "px"),
            "border-radius": "".concat(outer_rad, "px"),
        });
        var ccirc = $("#" + ulabel.config["container_id"] + " div.centcirc");
        ccirc.css({
            "position": "absolute",
            "top": "".concat(inner_top, "px"),
            "left": "".concat(inner_lft, "px"),
            "width": "".concat(inner_diam, "px"),
            "height": "".concat(inner_diam, "px"),
            "background-color": "black",
            "border-radius": "".concat(inner_rad, "px")
        });
    };
    return HTMLBuilder;
}());
exports.HTMLBuilder = HTMLBuilder;
