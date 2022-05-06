import { ULabel, ULabelAnnotation, ULabelSubtask } from "..";

//Given an annotation returns the confidence of that annotation
export function get_annotation_confidence(annotation) {
    let current_confidence = -1;
    for (let type_of_id in annotation.classification_payloads) {
        if (annotation.classification_payloads[type_of_id].confidence > current_confidence) {
            current_confidence = annotation.classification_payloads[type_of_id].confidence;
        }
    }
    return current_confidence;
}

//Takes in an annotation and marks it either deprecated or not deprecated.
export function mark_deprecated(annotation: ULabelAnnotation, deprecated: boolean) {
    annotation.deprecated = deprecated
}

//if the annotation confidence is less than the filter value then return true, else return false
export function filter_low(annotation_confidence: number, filter_value: number) {
    console.log(annotation_confidence, filter_value)
    if (annotation_confidence < filter_value) return true
    return false
}