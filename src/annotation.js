"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ULabelAnnotation = void 0;
var ULabelAnnotation = /** @class */ (function () {
    function ULabelAnnotation(id, is_new, parent_id, created_by, deprecated, spatial_type, spatial_payload, classification_payloads, line_size, containing_box, frame, text_payload, annotation_meta, human_deprecated) {
        if (is_new === void 0) { is_new = true; }
        if (parent_id === void 0) { parent_id = null; }
        if (deprecated === void 0) { deprecated = false; }
        if (text_payload === void 0) { text_payload = ""; }
        if (annotation_meta === void 0) { annotation_meta = null; }
        if (human_deprecated === void 0) { human_deprecated = null; }
        this.id = id;
        this.is_new = is_new;
        this.parent_id = parent_id;
        this.created_by = created_by;
        this.deprecated = deprecated;
        this.spatial_type = spatial_type;
        this.spatial_payload = spatial_payload;
        this.classification_payloads = classification_payloads;
        this.line_size = line_size;
        this.containing_box = containing_box;
        this.frame = frame;
        this.text_payload = text_payload;
        this.annotation_meta = annotation_meta;
        this.human_deprecated = human_deprecated;
    }
    ULabelAnnotation.prototype.ensure_compatible_classification_payloads = function (ulabel_class_ids) {
        var found_ids = [];
        var j;
        var conf_not_found_j = null;
        var remaining_confidence = 1.0;
        for (j = 0; j < this.classification_payloads.length; j++) {
            var this_id = this.classification_payloads[j].class_id;
            if (!ulabel_class_ids.includes(this_id)) {
                alert("Found class id ".concat(this_id, " in \"resume_from\" data but not in \"allowed_classes\""));
                throw "Found class id ".concat(this_id, " in \"resume_from\" data but not in \"allowed_classes\"");
            }
            found_ids.push(this_id);
            if (!("confidence" in this.classification_payloads[j])) {
                if (conf_not_found_j !== null) {
                    throw ("More than one classification payload was supplied without confidence for a single annotation.");
                }
                else {
                    conf_not_found_j = j;
                }
            }
            else {
                this.classification_payloads[j].confidence = this.classification_payloads[j].confidence;
                remaining_confidence -= this.classification_payloads[j]["confidence"];
            }
        }
        if (conf_not_found_j !== null) {
            if (remaining_confidence < 0) {
                throw ("Supplied total confidence was greater than 100%");
            }
            this.classification_payloads[conf_not_found_j].confidence = remaining_confidence;
        }
        for (j = 0; j < ulabel_class_ids.length; j++) {
            if (!(found_ids.includes(ulabel_class_ids[j]))) {
                this.classification_payloads.push({
                    "class_id": ulabel_class_ids[j],
                    "confidence": 0.0
                });
            }
        }
    };
    ULabelAnnotation.from_json = function (json_block) {
        var ret = new ULabelAnnotation();
        Object.assign(ret, json_block);
        // Handle 'new' keyword collision
        if ("new" in json_block) {
            ret.is_new = json_block["new"];
        }
        return ret;
    };
    return ULabelAnnotation;
}());
exports.ULabelAnnotation = ULabelAnnotation;
