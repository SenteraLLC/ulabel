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
    return HTMLBuilder;
}());
exports.HTMLBuilder = HTMLBuilder;
