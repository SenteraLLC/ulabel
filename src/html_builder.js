"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTMLBuilder = void 0;
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
    return HTMLBuilder;
}());
exports.HTMLBuilder = HTMLBuilder;
