/**
 * Annotation canvas utilities.
 * TODO (joshua-dean): Pull the rest of the canvas functions into here
 */

import type { ULabel, ULabelSubtasks } from "..";
import { NONSPATIAL_MODES } from "./annotation";
import { Configuration, DEFAULT_N_ANNOS_PER_CANVAS, TARGET_MAX_N_CANVASES_PER_SUBTASK } from "./configuration";

/**
 * If the user doesn't provide a number of annotations per canvas, set it dynamically.
 * This should help with performance.
 *
 * @param config ULabel configuration
 * @param subtasks ULabel subtasks
 */
function dynamically_set_n_annos_per_canvas(
    config: Configuration,
    subtasks: ULabelSubtasks,
) {
    // If they didn't provide a value, we'll still be using the default
    if (config.n_annos_per_canvas === DEFAULT_N_ANNOS_PER_CANVAS) {
        // Count max annotations per subtask
        const max_annos = Math.max(
            ...Object.values(subtasks).map((subtask) => subtask.annotations.ordering.length),
        );

        // Performance starts to deteriorate when we require many canvases to be drawn on
        // To be safe, check if max_annos / DEFAULT_N_ANNOS_PER_CANVAS is greater than TARGET_MAX_N_CANVASES_PER_SUBTASK
        if (max_annos / DEFAULT_N_ANNOS_PER_CANVAS > TARGET_MAX_N_CANVASES_PER_SUBTASK) {
            // If so, raise the default
            config.n_annos_per_canvas = Math.ceil(max_annos / TARGET_MAX_N_CANVASES_PER_SUBTASK);
        }
    }
}

/**
 * Initialize annotation canvases and assign annotations to them
 *
 * @param ulabel ULabel instance
 * @param subtask_key Subtask key. If null, this will dynamically initialize for all subtasks.
 */
export function initialize_annotation_canvases(
    ulabel: ULabel,
    subtask_key: string = null,
) {
    if (subtask_key === null) {
        dynamically_set_n_annos_per_canvas(
            ulabel.config,
            ulabel.subtasks,
        );
        for (const subtask_key in ulabel.subtasks) {
            initialize_annotation_canvases(ulabel, subtask_key);
        }
        return;
    }

    // TODO (joshua-dean): shouldn't this just be a separate function?
    // Create the canvas for each annotation
    const subtask = ulabel.subtasks[subtask_key];
    for (const annotation_id in subtask.annotations.access) {
        const annotation = subtask.annotations.access[annotation_id];
        if (!NONSPATIAL_MODES.includes(annotation.spatial_type)) {
            annotation["canvas_id"] = ulabel.get_init_canvas_context_id(
                annotation_id,
                subtask_key,
            );
        }
    }
}
