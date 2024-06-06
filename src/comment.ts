// Operations for "comment" annotation type
import { ULabel } from "..";
import { ULabelAnnotation } from "./annotation";

/**
 * Get the point at the center of the annotation bbox
 * 
 * @param {ULabelAnnotation} annotation Comment annotation
 * @returns {Array<number>} Point at the center of the annotation bbox
 */
export function getCommentCenterPoint(annotation: ULabelAnnotation): Array<number> {
    return [
        annotation.spatial_payload[0][0] + (annotation.spatial_payload[1][0] - annotation.spatial_payload[0][0]) / 2,
        annotation.spatial_payload[0][1] + (annotation.spatial_payload[1][1] - annotation.spatial_payload[0][1]) / 2
    ];
}


/**
 * Get the coordinates to place the comment window for a given annotation
 * 
 * @param {ULabelAnnotation} annotation Comment annotation
 * @returns { { x: number, y: number } } Coordinates (left, top) of the comment window
 */
export function getCommentWindowCoordinates(annotation: ULabelAnnotation): { x: number, y: number } {
    // The annotation spatial payload is a bbox [[x1, y1], [x2, y2]] where x1, y1 is the top left corner and x2, y2 is the bottom right corner
    // We want to place the comment window at the top right corner of the bbox
    return {
        x: annotation.spatial_payload[1][0],
        y: annotation.spatial_payload[0][1]
    };
}

/**
 * Show window for a given comment annotation
 * 
 * @param {ULabel} ulabel ULabel instance
 * @param {ULabelAnnotation} annotation Comment annotation
 */
export function showCommentWindow(ulabel: ULabel, annotation: ULabelAnnotation): void {
    // TODO: ulabel state to only allow one comment window at a time

    // Ensure correct spatial type
    if (annotation.spatial_type !== "comment") return;

    // Show the comment window
    // A text area for the comment 
    const coordinates = getCommentWindowCoordinates(annotation);
    console.log(coordinates);
    $(`
        <div>
            <textarea class="nonspatial_note" placeholder="Notes...">${annotation.text_payload}</textarea>
        </div>
    `).css({
        position: "absolute",
        left: coordinates.x + "px",
        top: coordinates.y + "px",
    }).appendTo("#" + ulabel.config["container_id"]);
}