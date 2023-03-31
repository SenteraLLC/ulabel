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

/**
 * This function calculates the distance from a point to a line segment. 
 * 
 * @param point_x The point's x position
 * @param point_y The point's y position
 * @param line_x1 The first endpoint of the line's x position
 * @param line_y1 The first endpoint of the line's y position
 * @param line_x2 The second endpoint of the line's x position
 * @param line_y2 The second endpoint of the line's y position
 * @returns The distance from the point to the line segment
 */
function calculate_distance_from_point_to_line(
    point_x: number, 
    point_y: number, 
    line_x1: number, 
    line_y1: number, 
    line_x2: number, 
    line_y2: number 
    ): number {

    let A = point_x - line_x1
    let B = point_y - line_y1
    let C = line_x2 - line_x1
    let D = line_y2 - line_y1
  
    let dot = A * C + B * D
    let len_sq = C * C + D * D

    // Initialize the param variable
    let param

    // Check for a divide by 0 error in the case of 0 length line
    if (len_sq != 0) {
        param = dot / len_sq;
    }

    let xx, yy
  
    // If param is still undefined then the line should have 0 length 
    // In which case we can set xx and yy equal to any endpoint
    if (param === undefined) {
        xx = line_x1
        yy = line_y1        
    }
    else if (param < 0) {
      xx = line_x1
      yy = line_y1
    }
    else if (param > 1) {
      xx = line_x2
      yy = line_y2
    }
    else {
      xx = line_x1 + param * C
      yy = line_y1 + param * D
    }
  
    let dx = point_x - xx
    let dy = point_y - yy
    return Math.sqrt(dx * dx + dy * dy)
  }

export function get_distance_from_point_to_line(point_annotation: ULabelAnnotation, line_annotation: ULabelAnnotation) {
    console.log(point_annotation, line_annotation)

    // Create constants for the line's endpoints' x and y value
    const line_x1 = line_annotation.spatial_payload[0][0]
    const line_y1 = line_annotation.spatial_payload[0][1]
    const line_x2 = line_annotation.spatial_payload[1][0]
    const line_y2 = line_annotation.spatial_payload[1][1]

    // Create constants for the point's x and y value
    const point_x = point_annotation.spatial_payload[0][0]
    const point_y = point_annotation.spatial_payload[0][1]

    // Calculate the distance from the point annotation to the line annotation
    const distance = calculate_distance_from_point_to_line(point_x, point_y, line_x1, line_y1, line_x2, line_y2)

    console.log(distance)

    return distance
}

export function assign_all_points_distance_from_line(point_annotations: ULabelAnnotation[], line_annotations: ULabelAnnotation[]) {
    let startTime = performance.now()

    for (let point_idx = 0; point_idx < point_annotations.length; point_idx++) {
        for (let line_idx = 0; line_idx < line_annotations.length; line_idx++) {
            const current_point = point_annotations[point_idx]
            const current_line = line_annotations[line_idx]
        
            const distance = get_distance_from_point_to_line(current_point, current_line)

            // Replace this property with the new distance if its the smallest distance calculated or undefined
            if (current_point["distance_from_any_line"] === undefined || current_point["distance_from_any_line"] >= distance) {                 
                point_annotations[point_idx]["distance_from_any_line"] = distance
            }
        }
    }

    let endTime = performance.now()

    console.log(`Call to doSomething took ${endTime - startTime} milliseconds`)
}