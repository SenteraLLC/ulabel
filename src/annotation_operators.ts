import { Offset, ULabel, ULabelSpatialType, ULabelSubtask, DeprecatedBy, DistanceFrom, FilterDistanceOverride } from "..";
import { ULabelAnnotation } from "./annotation";

/**
 * Returns the confidence of the passed in ULabelAnnotation.
 * In the case of multiple classifications in the classification_payloads, returns the largest confidence value.
 * 
 * @param annotation ULabelAnnotation
 * @returns The largest confidence value inside classification_payloads
 */
export function get_annotation_confidence(annotation: ULabelAnnotation) {
    let current_confidence = -1;
    for (let type_of_id in annotation.classification_payloads) {
        if (annotation.classification_payloads[type_of_id].confidence > current_confidence) {
            current_confidence = annotation.classification_payloads[type_of_id].confidence;
        }
    }
    return current_confidence;
}

/**
 * Returns the class id of a ULabelAnnotation as a string.
 * 
 * @param annotation ULabelAnnotation
 * @returns The class id of the annotation as a string
 */
function get_annotation_class_id(annotation: ULabelAnnotation) {
        // Keep track of the most likely class id and its confidence
        let id: number, confidence: number

        // Go through each item in the classification payload
        annotation.classification_payloads.forEach(current_payload => {
            // The confidence will be undefined the first time through, so set the id and confidence for a baseline
            // Otherwise replace the id if the conidence is higher

            if (confidence === undefined || current_payload.confidence > confidence) {
                id = current_payload.class_id
                confidence = current_payload.confidence
            }
        })

        return id.toString()
}

/**
 * Takes in an annotation and marks it either deprecated or not deprecated.
 * 
 * @param annotation ULabelAnnotation
 * @param deprecated boolean 
 * @param deprecated_by_key 
 */
export function mark_deprecated(annotation: any, deprecated: boolean, deprecated_by_key: string = "human") {

    // If annotation.deprecated_by is undefined, then set the deprecated_by property
    if (annotation.deprecated_by === undefined) {
        annotation.deprecated_by = <DeprecatedBy> {
            [deprecated_by_key]: deprecated
        }
    }
    else { // If annotation.deprecated_by is not undefined, then just update the property
        annotation.deprecated_by[deprecated_by_key] = deprecated
    }

    // Loop through each way an annotation can be deprecated
    for (const key in annotation.deprecated_by) {
        // If the annotation has been deprecated by any method, then deprecate the annotation
        if (annotation.deprecated_by[key]) {
            annotation.deprecated = true
            return
        }
    }

    // If the annotation hasn't been deprecated by any property, then set deprecated to false
    annotation.deprecated = false
}

/**
 * If the value is less than the filter then return true, else return false.
 * 
 * @param value Value to be compaired against the filter
 * @param filter What the value is compared against
 */
export function value_is_lower_than_filter(value: number, filter: number) {
    return value < filter
}

/**
 * If the value is greater than the filter then return true, else return false.
 * 
 * @param value Value to be compaired against the filter
 * @param filter What the value is compared against
 */
export function value_is_higher_than_filter(value: number, filter: number) {
    return value > filter
}

/**
 * Takes in a list of annotations and either deprecates or undeprecates them based on if their property is higher than the 
 * filter value.
 * 
 * @param annotations List of annotations to be compared against the filter value
 * @param property The property on the annotation to be compared against the filter. e.g. "confidence"
 * @param filter The value all filters will be compared against
 */
export function filter_high(annotations: ULabelAnnotation[], property: string, filter: number, deprecated_by: string) {
    // Loop through each point annotation and deprecate them if they don't pass the filter
    annotations.forEach(function(annotation: ULabelAnnotation) {
        // Make sure the annotation is not a human deprecated one
        if (!annotation.deprecated_by["human"]) {
            // Run the annotation through the filter with the passed in property
            const should_deprecate: boolean = value_is_higher_than_filter(annotation[property], filter)

            // Mark the point deprecated
            mark_deprecated(annotation, should_deprecate, deprecated_by)
        }
    })
}

/**
 * Calculates the distance from a point to a line segment. 
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

/**
 * Calculates the distance from a point annotation to each segment of a polyline annotation, then returns the smallest distance.
 * 
 * @param point_annotation Point annotation to get the distance of
 * @param line_annotation Line annotation the point annotation is being compared against
 * @param offset Offset of a particular annotation in the set. Used when an annotation is being moved by the user
 * @returns The distance from a point to a polyline
 */
function get_distance_from_point_to_line(point_annotation: ULabelAnnotation, line_annotation: ULabelAnnotation, offset: Offset = null) {

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

        // Create offset variables
        let line_offset_x: number = 0
        let line_offset_y: number = 0

        // Only apply the offset when the line annotation id matches with the offset id
        // Check if offset !== null first to avoid an issue with reading properties of null
        if ((offset !== null) && (line_annotation.id === offset.id)) {
            line_offset_x = offset.diffX
            line_offset_y = offset.diffY
        }

        // Calculate the distance from the point to the line segment
        const distance_to_segment = calculate_distance_from_point_to_line(
            point_x,
            point_y,
            line_x1 + line_offset_x,
            line_y1 + line_offset_y,
            line_x2 + line_offset_x,
            line_y2 + line_offset_y
        )

        // Check if the distance to this segment is undefined or less than the distance to another segment
        if (distance === undefined || distance_to_segment < distance) {
            distance = distance_to_segment
        }
    }

    return distance
}

/**
 * Assigns each point annotation a distance from each diffrent class of row. Will also update the distance from any row.
 * 
 * @param point_annotations Set of point annotations
 * @param line_annotations Set of line annotations
 * @param offset Offset of a particular annotation in the set. Used when an annotation is being moved by the user
 */
export function assign_distance_from_line(
    point_annotations: ULabelAnnotation[],
    line_annotations: ULabelAnnotation[],
    offset: Offset = null) {
    // Loop through every point and assign it a distance from line
    point_annotations.forEach(current_point => {

        // Create a DistanceFrom object to be assigned to this point
        let distance_from: DistanceFrom = {"any_line": undefined}

        // Calculate the distance from each line and populate the distance_from accordingly
        line_annotations.forEach(current_line => {

            const line_class_id = get_annotation_class_id(current_line)
            
            const distance = get_distance_from_point_to_line(current_point, current_line, offset)

            // If the distance from the current class is undefined, then set it
            // Otherwise replace the value if the current distance is less than the one set
            if (distance_from[line_class_id] === undefined || distance < distance_from[line_class_id]) {
                distance_from[line_class_id] = distance
            }

            // Likewise check to see if the current distance is less than a line of any class
            if (distance_from["any_line"] === undefined || distance < distance_from["any_line"]) {
                distance_from["any_line"] = distance
            }
        })

        // Assign the distance from object to the current point
        current_point.distance_from = distance_from
        console.log(current_point.distance_from)
    })
}

/**
 * Using the value of the FilterPointDistanceFromRow's slider, filter all point annotations based on their distance 
 * from a polyline annotation.
 * 
 * @param ulabel ULabel object
 * @param offset Offset of a particular annotation. Used when filter is called while an annotation is being moved
 */
export function filter_points_distance_from_line(ulabel: ULabel, offset: Offset = null, override: FilterDistanceOverride = null) {
    // Grab the slider's value
    let filter_value: number, multi_class_mode: boolean

    // If the override exists, then use the override's values
    if (override !== null) {
        // Exists so that this function can be called without accessing the dom
        filter_value = override.filter_value

        // TODO: Support Multi-Class Override
        // Multi-class mode is currently not supported with an override
        multi_class_mode = false
    }
    else {
        // Otherwise access the dom to get the appropriate values
        const sliders: HTMLInputElement = document.querySelector(".filter-row-distance-slider")
        const multi_checkbox: HTMLInputElement = document.querySelector("#filter-slider-distance-multi-checkbox")
        
        // Log an error if either the slider or the multi-checkbox are unable to be found
        if (sliders === null) {
            console.error("filter_points_distance_from_line could not find slider objects")
        }
        if (multi_checkbox === null) {
            console.error("filter_points_distance_from_line could not find multi-class checkbox object")
        }
        // If either one was not found, then return from the function early
        if (sliders === null || multi_checkbox === null) {
            return
        }
        
        // Set the appropriate values
        //filter_value = slider.valueAsNumber
        multi_class_mode = multi_checkbox.checked
    }
    
    // Grab the subtasks from ulabel
    const subtasks: ULabelSubtask[] = Object.values(ulabel.subtasks)

    // Initialize set of all point and line annotations
    let point_annotations: ULabelAnnotation[] = []
    let line_annotations: ULabelAnnotation[] = []

    // Go through all annotations to populate a set of all point annotations and a set of all line annotations
    // First loop through each subtask
    for (let subtask of subtasks) {

        // Then go through each annotation in the subtask
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

    // Calculate and assign each point a distance from line value
    assign_distance_from_line(point_annotations, line_annotations, offset)

    point_annotations.forEach(annotation => {
        console.log(annotation.distance_from)
    })
    // Filter based on current mode
    if (multi_class_mode) { // Multi class mode
        
    }
    else { // Single class mode

    }
    //filter_high(point_annotations, "distance_from_any_line", filter_value, "distance_from_row")

    // Redraw if the override does not exist
    // Redraw if the override.should_redraw is true
    if (override === null || override.should_redraw) {
        ulabel.redraw_all_annotations(null, null, false);
    }
}

/**
 * Goes through all subtasks and finds all classes that polylines can be. Then returns a list of them.
 * 
 * @returns A list of all classes which can be polylines
 */
export function findAllPolylineClasses(ulabel: ULabel) {
    // Initialize potential classes
    let potential_classes: string[] = []

    // Check each subtask to see if polyline is one of its allowed modes
    for (let subtask_key in ulabel.subtasks) {
        // Grab the subtask
        const subtask = ulabel.subtasks[subtask_key]

        if (subtask.allowed_modes.includes("polyline")) {

            // Loop through all the classes in the subtask 
            for (let class_idx = 0; class_idx < subtask.classes.length; class_idx++) {

                // Add them to the potential classes
                potential_classes.push(subtask.classes[class_idx].name)
            }
        }
    }
    return potential_classes
}
