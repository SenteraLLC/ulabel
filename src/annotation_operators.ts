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

// Takes in an annotation and marks it either deprecated or not deprecated.
export function mark_deprecated(annotation: any, deprecated: boolean) {
    annotation.deprecated = deprecated
}

// If the annotation confidence is less than the filter value then return true, else return false
export function filter_low(annotation_confidence: number, filter_value: number) {
    if (annotation_confidence < filter_value) return true
    return false
}

export function filter_high(annotation_value: number, filter_threshold: number) {
    if (annotation_value > filter_threshold) return true
    return false
}

export function calculate_distance_from_line(point_annotation: ULabelAnnotation, line_annotation: ULabelAnnotation) {
    console.log(point_annotation, line_annotation)

    // Create constants for the line's endpoints' x and y value
    const line_x1 = line_annotation.spatial_payload[0][0]
    const line_y1 = line_annotation.spatial_payload[0][1]
    const line_x2 = line_annotation.spatial_payload[1][0]
    const line_y2 = line_annotation.spatial_payload[1][1]

    // Create constants for the point's x and y value
    const point_x = point_annotation.spatial_payload[0][0]
    const point_y = point_annotation.spatial_payload[0][1]

    // Just trust me bro
    const distance = Math.abs(((line_x2 - line_x1) * (line_y1 - point_y)) - ((line_x1 - point_x) * (line_y2 - line_y1))) / Math.sqrt(((line_x2 - line_x1) ** 2) + ((line_y2 - line_y1) ** 2))

    console.log(distance)

    return distance
}

export function assign_all_points_distance_from_line(point_annotations: ULabelAnnotation[], line_annotations: ULabelAnnotation[]) {
    let startTime = performance.now()

    for (let point_idx = 0; point_idx < point_annotations.length; point_idx++) {
        for (let line_idx = 0; line_idx < line_annotations.length; line_idx++) {
            const current_point = point_annotations[point_idx]
            const current_line = line_annotations[line_idx]
        
            const distance = calculate_distance_from_line(current_point, current_line)

            // Replace this property with the new distance if its the smallest distance calculated or undefined
            if (current_point["distance_from_any_line"] === undefined || current_point["distance_from_any_line"] >= distance) {                 
                point_annotations[point_idx]["distance_from_any_line"] = distance
            }
        }
    }

    let endTime = performance.now()

    console.log(`Call to doSomething took ${endTime - startTime} milliseconds`)
}