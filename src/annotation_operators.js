"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filter_low = exports.mark_deprecated = exports.get_annotation_confidence = void 0;
//Given an annotation returns the confidence of that annotation
function get_annotation_confidence(annotation) {
    var current_confidence = -1;
    for (var type_of_id in annotation.classification_payloads) {
        if (annotation.classification_payloads[type_of_id].confidence > current_confidence) {
            current_confidence = annotation.classification_payloads[type_of_id].confidence;
        }
    }
    return current_confidence;
}
exports.get_annotation_confidence = get_annotation_confidence;
//Takes in an annotation and marks it either deprecated or not deprecated.
function mark_deprecated(annotation, deprecated) {
    annotation.deprecated = deprecated;
}
exports.mark_deprecated = mark_deprecated;
//if the annotation confidence is less than the filter value then return true, else return false
function filter_low(annotation_confidence, filter_value) {
    if (annotation_confidence < filter_value)
        return true;
    return false;
}
exports.filter_low = filter_low;
