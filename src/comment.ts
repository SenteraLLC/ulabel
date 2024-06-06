// Operations for "comment" annotation type
import { ULabel } from "..";
import { ULabelAnnotation } from "./annotation";
import { FRONT_Z_INDEX } from "../src/blobs";
import { ULabelSubtask } from "./subtask";

/**
 * Get the point at the center of the annotation bbox
 * 
 * @param {ULabelAnnotation} annotation Comment annotation
 * @returns {Array<number>} Point at the center of the annotation bbox
 */
export function get_comment_center_point(annotation: ULabelAnnotation): Array<number> {
    return [
        annotation.spatial_payload[0][0] + (annotation.spatial_payload[1][0] - annotation.spatial_payload[0][0]) / 2,
        annotation.spatial_payload[0][1] + (annotation.spatial_payload[1][1] - annotation.spatial_payload[0][1]) / 2
    ];
}


/**
 * Get the coordinates to place the comment window for a given annotation
 * 
 * @param {ULabel} ulabel ULabel instance
 * @param {ULabelAnnotation} annotation Comment annotation
 * @returns { { left: number, top: number } } Coordinates (left, top) of the comment window
 */
export function get_comment_window_coordinates(ulabel: ULabel, annotation: ULabelAnnotation): { left: number, top: number } {    
    // The annotation spatial payload is a bbox [[x1, y1], [x2, y2]] where x1, y1 is the top left corner and x2, y2 is the bottom right corner
    // We want to place the comment window at the top right corner of the bbox
    const top_right_corner = [annotation.spatial_payload[1][0], annotation.spatial_payload[0][1]];
    const coordinates = ulabel.get_global_coords_from_annbox_point(top_right_corner);
    return {
        left: coordinates[0],
        top: coordinates[1]
    };
}

/**
 * Show window for a given comment annotation. Only one comment window can be shown at a time.
 * 
 * @param {ULabel} ulabel ULabel instance
 * @param {ULabelAnnotation} annotation Comment annotation
 */
export function show_comment_window(ulabel: ULabel, annotation: ULabelAnnotation): void {
    // TODO: ulabel state to only allow one comment window at a time
    // Hide any existing comment window
    hide_comment_window(ulabel);

    // Ensure correct spatial type
    if (annotation.spatial_type !== "comment") return;

    // Show the comment window
    // A text area for the comment 
    const coordinates = get_comment_window_coordinates(ulabel, annotation);
    const comment_window_id = `comment_window_${annotation.id}`;
    $(`
        <div id=${comment_window_id}>
            <textarea class="nonspatial_note" placeholder="Notes...">${annotation.text_payload}</textarea>
        </div>
    `).css({
        position: "absolute",
        left: coordinates.left + "px",
        top: coordinates.top + "px",
        "z-index": FRONT_Z_INDEX,
    }).appendTo("#" + ulabel.config["container_id"]);

    // Save the comment window id in the state
    ulabel.state.comment_window_id = comment_window_id;
    // Redraw annotation
    ulabel.redraw_annotation(annotation.id);
}

/**
 * Hide window for a given comment annotation
 * 
 * @param {ULabel} ulabel ULabel instance
 */
export function hide_comment_window(ulabel: ULabel): void {
    if (ulabel.state.comment_window_id !== null) {
        // Hide the comment window
        $(`#${ulabel.state.comment_window_id}`).remove();
        // Clear the state
        ulabel.state.comment_window_id = null;
    }
}