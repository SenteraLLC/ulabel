import type {
    Offset,
    ULabelSpatialType,
    DeprecatedBy,
    DistanceFromPolylineClasses,
    FilterDistanceOverride,
    ValidDeprecatedBy,
    ClassDefinition,
} from "..";
// Import ULabel from ../src/index - TypeScript will find ../src/index.d.ts for types
import { ULabel } from "../src/index";

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
    for (const type_of_id in annotation.classification_payloads) {
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
    let id: number, confidence: number;

    // Go through each item in the classification payload
    annotation.classification_payloads.forEach((current_payload) => {
        // The confidence will be undefined the first time through, so set the id and confidence for a baseline
        // Otherwise replace the id if the conidence is higher

        if (confidence === undefined || current_payload.confidence > confidence) {
            id = current_payload.class_id;
            confidence = current_payload.confidence;
        }
    });

    return id.toString();
}

/**
 * Takes in an annotation and marks it either deprecated or not deprecated.
 *
 * @param annotation ULabelAnnotation
 * @param deprecated boolean
 * @param deprecated_by_key
 */
export function mark_deprecated(
    annotation: ULabelAnnotation,
    deprecated: boolean,
    deprecated_by_key: ValidDeprecatedBy = "human",
) {
    if (annotation.deprecated_by === undefined) {
        annotation.deprecated_by = <DeprecatedBy> {};
    }

    annotation.deprecated_by[deprecated_by_key] = deprecated;

    // If the annotation has been deprecated by any method, then deprecate the annotation
    if (Object.values(annotation.deprecated_by).some((x) => x)) {
        annotation.deprecated = true;
        return;
    }

    // If the annotation hasn't been deprecated by any property, then set deprecated to false
    annotation.deprecated = false;
}

/**
 * If the value is less than the filter then return true, else return false.
 *
 * @param value Value to be compaired against the filter
 * @param filter What the value is compared against
 * @returns True if the value is less than the filter, false otherwise
 */
export function value_is_lower_than_filter(value: number, filter: number): boolean {
    return value < filter;
}

/**
 * If the value is greater than the filter then return true, else return false.
 *
 * @param value Value to be compaired against the filter
 * @param filter What the value is compared against
 * @returns True if the value is greater than the filter, false otherwise
 */
export function value_is_higher_than_filter(value: number, filter: number): boolean {
    return value > filter;
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
    annotations.forEach(function (annotation: ULabelAnnotation) {
        // Make sure the annotation is not a human deprecated one
        if (!annotation.deprecated_by["human"]) {
            // Run the annotation through the filter with the passed in property
            const should_deprecate: boolean = value_is_higher_than_filter(annotation[property], filter);

            // Mark the point deprecated
            mark_deprecated(annotation, should_deprecate, deprecated_by_key);
        }
    });
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
    line_y2: number,
): number {
    const A = point_x - line_x1;
    const B = point_y - line_y1;
    const C = line_x2 - line_x1;
    const D = line_y2 - line_y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;

    // Initialize the param variable
    let param;

    // Check for a divide by 0 error in the case of 0 length line
    if (len_sq != 0) {
        param = dot / len_sq;
    }

    let xx, yy;

    // If param is still undefined then the line should have 0 length
    // In which case we can set xx and yy equal to any endpoint
    if (param === undefined) {
        xx = line_x1;
        yy = line_y1;
    } else if (param < 0) {
        xx = line_x1;
        yy = line_y1;
    } else if (param > 1) {
        xx = line_x2;
        yy = line_y2;
    } else {
        xx = line_x1 + param * C;
        yy = line_y1 + param * D;
    }

    const dx = point_x - xx;
    const dy = point_y - yy;
    return Math.sqrt(dx * dx + dy * dy);
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
    const point_x: number = point_annotation.spatial_payload[0][0];
    const point_y: number = point_annotation.spatial_payload[0][1];

    // Initialize the distance from the point to the polyline
    let distance: number;

    // Loop through each segment of the polyline
    for (let idx = 0; idx < line_annotation.spatial_payload.length - 1; idx++) {
        // Create constants for the segment's endpoints' x and y values
        const line_x1: number = line_annotation.spatial_payload[idx][0];
        const line_y1: number = line_annotation.spatial_payload[idx][1];
        const line_x2: number = line_annotation.spatial_payload[idx + 1][0];
        const line_y2: number = line_annotation.spatial_payload[idx + 1][1];

        // Create offset variables
        let line_offset_x: number = 0;
        let line_offset_y: number = 0;

        // Only apply the offset when the line annotation id matches with the offset id
        // Check if offset !== null first to avoid an issue with reading properties of null
        if ((offset !== null) && (line_annotation.id === offset.id)) {
            line_offset_x = offset.diffX;
            line_offset_y = offset.diffY;
        }

        // Calculate the distance from the point to the line segment
        const distance_to_segment = calculate_distance_from_point_to_line(
            point_x,
            point_y,
            line_x1 + line_offset_x,
            line_y1 + line_offset_y,
            line_x2 + line_offset_x,
            line_y2 + line_offset_y,
        );

        // Check if the distance to this segment is undefined or less than the distance to another segment
        if (distance === undefined || distance_to_segment < distance) {
            distance = distance_to_segment;
        }
    }

    return distance;
}

/**
 * Wrapper for assign_closest_line_to_single_point()
 *
 * @param point_annotations Set of point annotations
 * @param line_annotations Set of line annotations
 * @param offset Offset of a particular annotation in the set. Used when an annotation is being moved by the user
 */
export function assign_closest_line_to_each_point(
    point_annotations: ULabelAnnotation[],
    line_annotations: ULabelAnnotation[],
    offset: Offset = null,
) {
    // Loop through every point and assign it a distance from line
    point_annotations.forEach((current_point) => {
        assign_closest_line_to_single_point(current_point, line_annotations, offset);
    });
}

/**
 * Assigns a single point annotation a distance to the closest polyline
 * from each diffrent class of polyline, as well as the distance from
 * the closest line, regardless of class.
 *
 * @param point_annotation single point annotation
 * @param line_annotations set of line annotations
 * @param offset Offset of a particular annotation in the set. Used when an annotation is being moved by the user
 */
export function assign_closest_line_to_single_point(
    point_annotation: ULabelAnnotation,
    line_annotations: ULabelAnnotation[],
    offset: Offset = null,
) {
    // Create a new distance_from object for the point annotation
    const distance_from: DistanceFromPolylineClasses = { closest_row: { distance: Infinity } };

    // Calculate the distance from each line and populate the distance_from accordingly
    line_annotations.forEach((current_line) => {
        const line_class_id = get_annotation_class_id(current_line);
        const distance = get_distance_from_point_to_line(point_annotation, current_line, offset);

        // If the distance from the current class is undefined, then set it
        // Otherwise replace the value if the current distance is less than the one set
        if (distance_from[line_class_id] === undefined || distance < distance_from[line_class_id].distance) {
            distance_from[line_class_id] = {
                distance: distance,
                polyline_id: current_line.id,
            };
        }

        // Likewise check to see if the current distance is less than a line of any class
        if (distance < distance_from.closest_row.distance) {
            distance_from.closest_row = {
                distance: distance,
                polyline_id: current_line.id,
            };
        }
    });

    // Assign the distance from object to the current point
    point_annotation.distance_from = distance_from;
}

/**
 * Update the distance from a single line to each point annotation.
 * If a line was previously the closest line to a point, then the distance from that point to ALL lines will be recalculated.
 * Used when a single polyline is modified.
 *
 * @param line_annotation line annotation
 * @param point_annotations all point annotations
 * @param all_line_annotations all line annotations
 * @param offset offset of the line annotation
 */
export function update_distance_from_line_to_each_point(
    line_annotation: ULabelAnnotation,
    point_annotations: ULabelAnnotation[],
    all_line_annotations: ULabelAnnotation[],
    offset: Offset = null,
) {
    // Get the class id of the line annotation
    const line_class_id = get_annotation_class_id(line_annotation);

    // Loop through each point and update the distance from the line to the point
    point_annotations.forEach((current_point) => {
        // Check if the line was the closest line to the point for any class
        if (is_closest_line_to_point(line_annotation.id, current_point)) {
            // Recalculate the distance from the point to all lines, since this may no longer be its closest line
            assign_closest_line_to_single_point(current_point, all_line_annotations, offset);
        } else {
            // Otherwise only update the distance from the line to the point
            const distance = get_distance_from_point_to_line(current_point, line_annotation, offset);

            // Check if the line is the closest line of its class to the point
            if (
                current_point.distance_from[line_class_id] === undefined ||
                distance < current_point.distance_from[line_class_id].distance
            ) {
                current_point.distance_from[line_class_id] = {
                    distance: distance,
                    polyline_id: line_annotation.id,
                };
            }

            // Check if the line is the closest line to the point
            if (
                current_point.distance_from.closest_row === undefined ||
                distance < current_point.distance_from.closest_row.distance
            ) {
                current_point.distance_from.closest_row = {
                    distance: distance,
                    polyline_id: line_annotation.id,
                };
            }
        }
    });
}

/**
 * Check if a line is the closest line to a point annotation,
 * either the closest line for any class or the closest line for a specific class.
 *
 * @param line_id polyline id
 * @param point_annotation point annotation
 * @returns whether the line is the closest line to the point
 */
export function is_closest_line_to_point(line_id: string, point_annotation: ULabelAnnotation): boolean {
    // Check if the distance_from is undefined
    if (point_annotation.distance_from === undefined) {
        console.error("is_closest_line_to_point called on a point without a distance_from object");
    }

    // Loop through each class in the distance_from object
    for (const class_id in point_annotation.distance_from) {
        // Check if the line id matches the closest line id for any class
        if (
            point_annotation.distance_from[class_id] !== undefined &&
            point_annotation.distance_from[class_id].polyline_id === line_id
        ) {
            return true;
        }
    }

    return false;
}

export function get_point_and_line_annotations(ulabel: ULabel): [ULabelAnnotation[], ULabelAnnotation[]] {
    // Initialize set of all point and line annotations
    const point_annotations: ULabelAnnotation[] = [];
    const line_annotations: ULabelAnnotation[] = [];

    // Go through all annotations to populate a set of all point annotations and a set of all line annotations
    // First loop through each subtask
    for (const [subtask_key, subtask] of Object.entries(ulabel.subtasks) as [string, ULabelSubtask][]) {
        // Then go through each annotation in the subtask
        for (const annotation_key in subtask.annotations.access) {
            const annotation: ULabelAnnotation = subtask.annotations.access[annotation_key];

            // Check for annotation type and push the annotation into the appropriate array
            switch (annotation.spatial_type) {
                case "point" as ULabelSpatialType:
                    // Note the annotation's subtask
                    annotation.subtask_key = subtask_key;
                    // Add the point annotation to the set
                    point_annotations.push(annotation);
                    break;
                case "polyline" as ULabelSpatialType:
                    // Skip over deprecated line annotations
                    if (annotation.deprecated) continue;

                    // Add non-deprecated line annotations to the set
                    line_annotations.push(annotation);
                    break;
            }
        }
    }

    return [point_annotations, line_annotations];
}

/**
 * Using the value of the FilterPointDistanceFromRow's slider, filter all point annotations based on their distance
 * from a polyline annotation.
 *
 * @param ulabel ULabel object
 * @param recalculate_distances whether to recalculate the distance from each point to the nearest line
 * @param offset Offset of a particular annotation. Used when filter is called while an annotation is being moved
 * @param override Used to filter annotations without calling the dom
 */
export function filter_points_distance_from_line(ulabel: ULabel, recalculate_distances: boolean = false, offset: Offset = null, override: FilterDistanceOverride = null) {
    // Get a set of all point and polyline annotations
    const annotations: [ULabelAnnotation[], ULabelAnnotation[]] = get_point_and_line_annotations(ulabel);
    const point_annotations: ULabelAnnotation[] = annotations[0];
    const line_annotations: ULabelAnnotation[] = annotations[1];

    // Initialize variables to hold info required from the dom
    let multi_class_mode: boolean = false;
    let show_overlay: boolean;
    let should_redraw: boolean;
    let distances: DistanceFromPolylineClasses = { closest_row: undefined };

    // If the override is null grab the necessary info from the dom
    if (override === null) {
        // Used for error checking
        let return_early: boolean = false;

        // Try to grab the elements from the dom
        const multi_checkbox: HTMLInputElement = document.querySelector("#filter-slider-distance-multi-checkbox");
        const show_overlay_checkbox: HTMLInputElement = document.querySelector("#filter-slider-distance-toggle-overlay-checkbox");
        const sliders: NodeListOf<HTMLInputElement> = document.querySelectorAll(".filter-row-distance-slider");

        // Check to make sure each element exists before trying to use
        if (show_overlay_checkbox === null) {
            console.error("filter_points_distance_from_line could not find show_overlay checkbox object");
            return_early = true;
        }
        if (sliders === null || sliders.length === 0) {
            console.error("filter_points_distance_from_line could not find any filter distance slider objects");
            return_early = true;
        }

        if (return_early) return;

        // Checkbox may not exist if `disable_multi_class_mode` is set to true
        if (multi_checkbox) {
            multi_class_mode = multi_checkbox.checked;
        }
        show_overlay = show_overlay_checkbox.checked;

        // Loop through each slider and populate distances
        for (let idx = 0; idx < sliders.length; idx++) {
            // Use a regex to get the string after the final - character in the slider id (Which is the class id or the string "closest_row")
            const slider_class_name = /[^-]*$/.exec(sliders[idx].id)[0];
            // Use the class id as a key to store the slider's value
            distances[slider_class_name] = {
                distance: sliders[idx].valueAsNumber,
            };
        }

        // Always redraw when there's no override
        should_redraw = true;
    } else {
        multi_class_mode = override.multi_class_mode;
        show_overlay = override.show_overlay;
        distances = override.distances;
        should_redraw = override.should_redraw; // Useful for filtering before annotations have been rendered
    }

    if (recalculate_distances) {
        // Calculate and assign each point a distance from line value
        assign_closest_line_to_each_point(point_annotations, line_annotations, offset);
    }

    // Store which annotations need to be redrawn
    const annotations_ids_to_redraw_by_subtask: { [key: string]: string[] } = {};
    // Initialize the object with the subtask keys
    for (const subtask_key in ulabel.subtasks) {
        annotations_ids_to_redraw_by_subtask[subtask_key] = [];
    }

    // Filter each point based on current mode, distances, and its distance_from property
    if (multi_class_mode) {
        // Loop through each point and deprecate them if they fall outside the range of all lines
        point_annotations.forEach((annotation) => {
            check_distances: {
                for (const id in distances) {
                    // Ignore the single class slider
                    if (id === "closest_row") continue;

                    // If the annotation is smaller than the filter value for any id, it passes
                    if (
                        annotation.distance_from[id] !== undefined &&
                        annotation.distance_from[id].distance <= distances[id].distance
                    ) {
                        if (annotation.deprecated) {
                            // Undeprecate the annotation
                            mark_deprecated(annotation, false, "distance_from_row");
                            annotations_ids_to_redraw_by_subtask[annotation.subtask_key].push(annotation.id);
                        }
                        break check_distances;
                    }
                }
                // Only here if break not called
                if (!annotation.deprecated) {
                    mark_deprecated(annotation, true, "distance_from_row");
                    annotations_ids_to_redraw_by_subtask[annotation.subtask_key].push(annotation.id);
                }
            }
        });
    } else {
        // Single-class mode
        point_annotations.forEach((annotation) => {
            const should_deprecate = annotation.distance_from.closest_row.distance > distances.closest_row.distance;
            // Only change deprecated status and redraw if it needs to be changed
            if (should_deprecate && !annotation.deprecated) {
                mark_deprecated(annotation, true, "distance_from_row");
                annotations_ids_to_redraw_by_subtask[annotation.subtask_key].push(annotation.id);
            } else if (!should_deprecate && annotation.deprecated) {
                mark_deprecated(annotation, false, "distance_from_row");
                annotations_ids_to_redraw_by_subtask[annotation.subtask_key].push(annotation.id);
            }
        });
    }

    if (should_redraw) {
        // Redraw each subtask's annotations
        for (const subtask_key in annotations_ids_to_redraw_by_subtask) {
            ulabel.redraw_multiple_spatial_annotations(annotations_ids_to_redraw_by_subtask[subtask_key], subtask_key);
        }
    }

    // Ensure the overlay exists before trying to access it
    if (ulabel.filter_distance_overlay === null || ulabel.filter_distance_overlay === undefined) {
        console.warn(`
            filter_distance_overlay currently does not exist.
            As such, unable to update distance overlay
        `);
    } else {
        // Update overlay properties first
        ulabel.filter_distance_overlay.update_annotations(line_annotations);
        ulabel.filter_distance_overlay.update_distances(distances);
        ulabel.filter_distance_overlay.update_mode(multi_class_mode);
        ulabel.filter_distance_overlay.update_display_overlay(show_overlay);

        // Then redraw the overlay
        ulabel.filter_distance_overlay.draw_overlay(offset);
    }
}

/**
 * Goes through all subtasks and finds all classes that polylines can be. Then returns a list of them.
 *
 * @returns A list of all classes which can be polylines
 */
export function findAllPolylineClassDefinitions(ulabel: ULabel) {
    // Initialize potential class definitions
    const potential_class_defs: ClassDefinition[] = [];

    // Check each subtask to see if polyline is one of its allowed modes
    for (const subtask_key in ulabel.subtasks) {
        // Grab the subtask
        const subtask = ulabel.subtasks[subtask_key];

        if (subtask.allowed_modes.includes("polyline")) {
            // Loop through all the classes in the subtask
            subtask.class_defs.forEach((current_class_def) => {
                potential_class_defs.push(current_class_def);
            });
        }
    }
    return potential_class_defs;
}
