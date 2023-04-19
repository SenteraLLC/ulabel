import { ULabel, ULabelAnnotation, ULabelSpatialType, ULabelSubtask } from "..";

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

    // Create constants for the point's x and y value
    const point_x: number = point_annotation.spatial_payload[0][0]
    const point_y: number = point_annotation.spatial_payload[0][1]

    // Initialize the distance from the point to the polyline
    let distance: number

    // Loop through each segment of the polyline
    for (let idx = 0; idx < line_annotation.spatial_payload.length - 1; idx++) {

        // Create constants for the segment's endpoints' x and y values
        const line_x1: number = line_annotation.spatial_payload[idx][0]
        const line_y1: number = line_annotation.spatial_payload[idx][1]
        const line_x2: number = line_annotation.spatial_payload[idx + 1][0]
        const line_y2: number = line_annotation.spatial_payload[idx + 1][1]

        // Calculate the distance from the point to the line segment
        const distance_to_segment = calculate_distance_from_point_to_line(point_x, point_y, line_x1, line_y1, line_x2, line_y2)

        // Check if the distance to this segment is undefined or less than the distance to another segment
        if (distance === undefined || distance_to_segment < distance) {
            distance = distance_to_segment
        }
    }

    return distance
}

export function assign_points_distance_from_line(point_annotations: ULabelAnnotation[], line_annotations: ULabelAnnotation[]) {

    for (let point_idx = 0; point_idx < point_annotations.length; point_idx++) {
        // Keep track of a smallest distance for each annotation
        let smallest_distance: number

        for (let line_idx = 0; line_idx < line_annotations.length; line_idx++) {
            const current_point = point_annotations[point_idx]
            const current_line = line_annotations[line_idx]
        
            const distance = get_distance_from_point_to_line(current_point, current_line)

            // Replace this property with the new distance if its the smallest distance calculated or undefined
            if (smallest_distance === undefined || smallest_distance > distance) {                 
                smallest_distance = distance
            }
        }

        // Assign the smallest distance to the annotation
        point_annotations[point_idx].distance_from_any_line = smallest_distance
    }
}

export function filter_points_distance_from_line(ulabel: ULabel) {
    // Grab the slider element
    const slider: HTMLInputElement = document.querySelector("#FilterPointDistanceFromRow-slider")

    // If this function is being called then a FilterPointDistanceFromRow instance should exist in the toolbox.
    // If a FilterPointDistanceFromRow instance exists in the toolbox, then the slider should be defined too.
    // If for any reason it still is not, then return from this function early
    if (slider === null) {
        console.error("filter_points_distance_from_line could not find slider object")
        return
    }
    
    // Grab the slider's value
    const filter_value: number = slider.valueAsNumber
    
    // Grab the subtasks from ulabel
    const subtasks: ULabelSubtask[] = Object.values(ulabel.subtasks)

    // Initialize set of all point and line annotations
    let point_annotations: ULabelAnnotation[] = []
    let line_annotations: ULabelAnnotation[] = []

    // Go through all annotations and populate the set of all point annotations and all line annotations
    for (let subtask of subtasks) {

        for (let annotation_key in subtask.annotations.access) {
            const annotation: ULabelAnnotation = subtask.annotations.access[annotation_key]
            
            // Check for annotation type and push the annotation into the appropriate array
            switch(annotation.spatial_type) {
                case "point" as ULabelSpatialType:
                    // Add the point annotation to the set
                    point_annotations.push(annotation)
                    break
                case "polyline" as ULabelSpatialType:
                    // Skip over deprecated line annotations
                    if (annotation.deprecated) continue

                    // Add non-deprecated line annotations to the set
                    line_annotations.push(annotation)
                    break
            }
        }
    }

    // Assign all of the point annotations a distance from line value
    assign_points_distance_from_line(point_annotations, line_annotations)

    point_annotations.forEach(function(annotation: ULabelAnnotation) {
        // Make sure the annotation is not a human deprecated one
        if (!annotation.human_deprecated) {
            // Run the annotation through the filter
            const should_deprecate: boolean = filter_high(annotation.distance_from_any_line, filter_value)

            // Mark it deprecated
            mark_deprecated(annotation, should_deprecate)
        }
    })
    ulabel.redraw_all_annotations(null, null, false);
}