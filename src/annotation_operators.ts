import { 
    Offset, 
    ULabel, 
    ULabelSpatialType, 
    DeprecatedBy, 
    AnnotationClassDistanceData, 
    FilterDistanceOverride, 
    ValidDeprecatedBy,
    ClassDefinition
} from "..";

import { ULabelAnnotation } from "./annotation";
import { ULabelSubtask } from "./subtask";

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
export function get_annotation_class_id(annotation: ULabelAnnotation): string {
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
export function mark_deprecated(annotation: any, deprecated: boolean, deprecated_by_key: ValidDeprecatedBy = "human") {
    if (annotation.deprecated_by === undefined) {
        annotation.deprecated_by = <DeprecatedBy> {};
    }

    annotation.deprecated_by[deprecated_by_key] = deprecated;

    // If the annotation has been deprecated by any method, then deprecate the annotation
    if (Object.values(annotation.deprecated_by).some(x => x)) {
        annotation.deprecated = true
        return
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
export function filter_high(annotations: ULabelAnnotation[], property: string, filter: number, deprecated_by_key: ValidDeprecatedBy) {
    // Loop through each point annotation and deprecate them if they don't pass the filter
    annotations.forEach(function(annotation: ULabelAnnotation) {
        // Make sure the annotation is not a human deprecated one
        if (!annotation.deprecated_by["human"]) {
            // Run the annotation through the filter with the passed in property
            const should_deprecate: boolean = value_is_higher_than_filter(annotation[property], filter)

            // Mark the point deprecated
            mark_deprecated(annotation, should_deprecate, deprecated_by_key)
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
        let distance_from: AnnotationClassDistanceData = {"single": undefined}

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
            if (distance_from["single"] === undefined || distance < distance_from["single"]) {
                distance_from["single"] = distance
            }
        })

        // Assign the distance from object to the current point
        current_point.distance_from = distance_from
    })
}

export function get_point_and_line_annotations(ulabel: ULabel): [ULabelAnnotation[], ULabelAnnotation[]] {
    // Initialize set of all point and line annotations
    let point_annotations: ULabelAnnotation[] = []
    let line_annotations: ULabelAnnotation[] = []

    const subtasks: ULabelSubtask[] = Object.values(ulabel.subtasks)

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

    return [point_annotations, line_annotations]
}


/**
 * Using the value of the FilterPointDistanceFromRow's slider, filter all point annotations based on their distance 
 * from a polyline annotation.
 * 
 * @param ulabel ULabel object
 * @param offset Offset of a particular annotation. Used when filter is called while an annotation is being moved
 * @param override Used to filter annotations without calling the dom
 */
export function filter_points_distance_from_line(ulabel: ULabel, offset: Offset = null, override: FilterDistanceOverride = null) {

    // Get a set of all point and polyline annotations
    const annotations: [ULabelAnnotation[], ULabelAnnotation[]] = get_point_and_line_annotations(ulabel)
    const point_annotations: ULabelAnnotation[] = annotations[0]
    const line_annotations: ULabelAnnotation[] = annotations[1]

    // Initialize variables to hold info required from the dom
    let multi_class_mode: boolean
    let show_overlay: boolean
    let should_redraw: boolean
    let distances: AnnotationClassDistanceData = { 
        "single": null // It gets angry if you don't initilize the single property
    }

    // If the override is null grab the necessary info from the dom
    if (override === null) {
        // Used for error checking
        let return_early: boolean = false

        // Try to grab the elements from the dom
        const multi_checkbox: HTMLInputElement = document.querySelector("#filter-slider-distance-multi-checkbox")
        const show_overlay_checkbox: HTMLInputElement = document.querySelector("#filter-slider-distance-toggle-overlay-checkbox")
        const sliders: NodeListOf<HTMLInputElement> = document.querySelectorAll(".filter-row-distance-slider")
        
        // Check to make sure each element exists before trying to use
        if (multi_checkbox === null) {
            console.error("filter_points_distance_from_line could not find multi-class checkbox object")
            return_early = true
        }
        if (show_overlay_checkbox === null) {
            console.error("filter_points_distance_from_line could not find show_overlay checkbox object")
            return_early = true
        }
        if (sliders === null || sliders.length === 0) {
            console.error("filter_points_distance_from_line could not find any filter distance slider objects")
            return_early = true
        }

        if (return_early) return

        multi_class_mode = multi_checkbox.checked
        show_overlay = show_overlay_checkbox.checked

        // Loop through each slider and populate distances
        for (let idx = 0; idx < sliders.length; idx++) {
            // Use a regex to get the string after the final - character in the slider id (Which is the class id or the string "single")
            const slider_class_name = /[^-]*$/.exec(sliders[idx].id)[0]

            // Use the class id as a key to store the slider's value
            distances[slider_class_name] = sliders[idx].valueAsNumber
        }
        
        // Always redraw when there's no override
        should_redraw = true
    } 
    else {
        multi_class_mode = override.multi_class_mode
        show_overlay = override.show_overlay
        distances = override.distances
        should_redraw = override.should_redraw // Useful for filtering before annotations have been rendered
    }

    // Calculate and assign each point a distance from line value
    assign_distance_from_line(point_annotations, line_annotations, offset)

    // Filter each point based on current mode, distances, and its distance_from property
    if (multi_class_mode) { // Multi-class mode
        // Loop through each point and deprecate them if they fall outside the range of all lines
        point_annotations.forEach(annotation => {
            check_distances: {
                for (const id in distances) {
                    // Ignore the single class slider
                    if (id === "single") continue
    
                    // If the annotation is smaller than the filter value for any id it passes
                    if (annotation.distance_from[id] <= distances[id]) {
                        mark_deprecated(annotation, false, "distance_from_row")
                        break check_distances
                    }
                }
                // Only here if break not called
                mark_deprecated(annotation, true, "distance_from_row")
            }
        })
    }
    else { // Single-class mode
        point_annotations.forEach(annotation => {
            mark_deprecated(annotation, annotation.distance_from["single"] > distances["single"], "distance_from_row")
        })
    }

    if (should_redraw){
        ulabel.redraw_all_annotations(null, null, false)
    } 
    
    // Ensure the overlay exists before trying to access it
    if (ulabel.filter_distance_overlay === null || ulabel.filter_distance_overlay === undefined) {
        console.warn(`
            filter_distance_overlay currently does not exist.
            As such, unable to update distance overlay
        `)
    }
    else {
        // Update overlay properties first
        ulabel.filter_distance_overlay.update_annotations(line_annotations)
        ulabel.filter_distance_overlay.update_distances(distances)
        ulabel.filter_distance_overlay.update_mode(multi_class_mode ? "multi" : "single")
        ulabel.filter_distance_overlay.update_display_overlay(show_overlay)

        // Then redraw the overlay
        ulabel.filter_distance_overlay.draw_overlay(offset)
    }  
}

/**
 * Goes through all subtasks and finds all classes that polylines can be. Then returns a list of them.
 * 
 * @returns A list of all classes which can be polylines
 */
export function findAllPolylineClassDefinitions(ulabel: ULabel) {
    // Initialize potential class definitions
    let potential_class_defs: ClassDefinition[] = []

    // Check each subtask to see if polyline is one of its allowed modes
    for (let subtask_key in ulabel.subtasks) {
        // Grab the subtask
        const subtask = ulabel.subtasks[subtask_key]

        if (subtask.allowed_modes.includes("polyline")) {

            // Loop through all the classes in the subtask 
            subtask.class_defs.forEach(current_class_def => {
                potential_class_defs.push(current_class_def)
            })
        }
    }
    return potential_class_defs
}
