"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTMLBuilder = void 0;
var toolbox_1 = require("./toolbox");
var version_1 = require("./version");
var blobs_1 = require("./blobs");
var HTMLBuilder = /** @class */ (function () {
    function HTMLBuilder() {
    }
    HTMLBuilder.add_style_to_document = function (ulabel) {
        var head = document.head || document.getElementsByTagName('head')[0];
        var style = document.createElement('style');
        head.appendChild(style);
        style.appendChild(document.createTextNode((0, blobs_1.get_init_style)(ulabel.config["container_id"])));
    };
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
    HTMLBuilder.build_edit_suggestion = function (ulabel) {
        // TODO noconflict
        // DONE Migrated to subtasks
        for (var stkey in ulabel.subtasks) {
            var local_id = "edit_suggestion__".concat(stkey);
            var global_id = "global_edit_suggestion__".concat(stkey);
            var subtask_dialog_container_jq = $("#dialogs__" + stkey);
            // Local edit suggestion
            subtask_dialog_container_jq.append("\n                <a href=\"#\" id=\"".concat(local_id, "\" class=\"edit_suggestion editable\"></a>\n            "));
            $("#" + local_id).css({
                "height": ulabel.config["edit_handle_size"] + "px",
                "width": ulabel.config["edit_handle_size"] + "px",
                "border-radius": ulabel.config["edit_handle_size"] / 2 + "px"
            });
            // Global edit suggestion
            var id_edit = "";
            var mcm_ind = "";
            if (!ulabel.subtasks[stkey]["single_class_mode"]) {
                id_edit = "--><a href=\"#\" class=\"reid_suggestion global_sub_suggestion gedit-target\"></a><!--";
                mcm_ind = " mcm";
            }
            subtask_dialog_container_jq.append("\n                <div id=\"".concat(global_id, "\" class=\"global_edit_suggestion glob_editable gedit-target").concat(mcm_ind, "\">\n                    <a href=\"#\" class=\"move_suggestion global_sub_suggestion movable gedit-target\">\n                        <img class=\"movable gedit-target\" src=\"data:image/png;base64,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\">\n                    </a><!--\n                    ").concat(id_edit, "\n                    --><a href=\"#\" class=\"delete_suggestion global_sub_suggestion gedit-target\">\n                        <span class=\"bigx gedit-target\">&#215;</span>\n                    </a>\n                </div>\n            "));
            // Register these dialogs with each subtask
            ulabel.subtasks[stkey]["state"]["visible_dialogs"][local_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
            ulabel.subtasks[stkey]["state"]["visible_dialogs"][global_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
        }
    };
    HTMLBuilder.build_confidence_dialog = function (ulabel) {
        for (var stkey in ulabel.subtasks) {
            var local_id = "annotation_confidence__".concat(stkey);
            var global_id = "global_annotation_confidence__".concat(stkey);
            var subtask_dialog_container_jq = $("#dialogs__" + stkey);
            var global_edit_suggestion_jq = $("#global_edit_suggestion__" + stkey);
            //Local confidence dialog
            subtask_dialog_container_jq.append("\n                <p id=\"".concat(local_id, "\" class=\"annotation-confidence editable\"></p>\n            "));
            $("#" + local_id).css({
                "height": ulabel.config["edit_handle_size"] + "px",
                "width": ulabel.config["edit_handle_size"] + "px",
            });
            // Global edit suggestion
            var id_edit = "";
            var mcm_ind = "";
            if (!ulabel.subtasks[stkey]["single_class_mode"]) {
                id_edit = "--><a href=\"#\" class=\"reid_suggestion global_sub_suggestion gedit-target\"></a><!--";
                mcm_ind = " mcm";
            }
            global_edit_suggestion_jq.append("\n                <div id=\"".concat(global_id, "\" class=\"annotation-confidence gedit-target").concat(mcm_ind, "\">\n                    <p class=\"annotation-confidence-title\" style=\"margin: 0.25em; margin-top: 1em; padding-top: 0.3em; opacity: 1;\">Annotation Confidence:</p>\n                    <p class=\"annotation-confidence-value\" style=\"margin: 0.25em; opacity: 1;\">\n                    ").concat(ulabel.subtasks[ulabel.state["current_subtask"]]["active_annotation"], "\n                    </p>\n                </div>\n            "));
            // Style the dialog
            $("#" + global_id).css({
                "background-color": "black",
                "color": "white",
                "opacity": "0.6",
                "height": "3em",
                "width": "14.5em",
                "margin-top": "-9.5em",
                "border-radius": "1em",
                "font-size": "1.2em",
                "margin-left": "-1.4em",
            });
        }
    };
    return HTMLBuilder;
}());
exports.HTMLBuilder = HTMLBuilder;
