import type {
    DeprecatedBy,
    DistanceFromPolylineClasses,
    ULabelClassificationPayload,
    ULabelContainingBox,
    ULabelSpatialType,
} from "..";
import { GeometricUtils } from "./geometric_utils";
import { log_message, LogLevel } from "./error_logging";

// Modes used to draw an area in the which to delete all annotations
export const DELETE_MODES = ["delete_polygon", "delete_bbox"];
export const DELETE_CLASS_ID = -1;
export const MODES_3D = ["global", "bbox3"];
export const NONSPATIAL_MODES = ["whole-image", "global"];

export type PolygonSpatialData = {
    // TODO (joshua-dean): validate this type
    spatial_payload: [number[]][];
    spatial_payload_holes: boolean[];
    spatial_payload_child_indices: number[][];
    containing_box: ULabelContainingBox;
};

export class ULabelAnnotation {
    constructor(
        // Required properties
        public annotation_meta: object = {},
        public deprecated: boolean = false,
        public deprecated_by: DeprecatedBy = { human: false },
        public text_payload: string = "",

        // Optional properties
        public subtask_key?: string,
        public classification_payloads?: ULabelClassificationPayload[],
        public containing_box?: ULabelContainingBox,
        public created_by?: string,
        public distance_from?: DistanceFromPolylineClasses,
        public frame?: number,
        public id?: string,
        public canvas_id?: string,
        // Polygons use complex spatial payloads
        // TODO (joshua-dean): narrow this disaster
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        public spatial_payload?: any,
        public spatial_type?: ULabelSpatialType,
        // Polygons track if each layer is a hole or fill
        public spatial_payload_holes?: boolean[],
        // Track what holes belong to what fill, ie if spatial_payload[0] is a fill with a hole at spatial_payload[1], spatial_payload_child_indices[0] = [1]
        public spatial_payload_child_indices?: number[][],
        // Lineage tracking fields
        public last_edited_by?: string,
        public last_edited_at?: string,
    ) {}

    public ensure_compatible_classification_payloads(ulabel_class_ids: [number]) {
        const found_ids = [];
        let j: number;
        let conf_not_found_j = null;
        let remaining_confidence = 1.0;

        // Filter out any classification payloads items that use the DELETE_CLASS_ID
        this.classification_payloads = this.classification_payloads.filter((payload) => {
            return payload.class_id !== DELETE_CLASS_ID;
        });

        for (j = 0; j < this.classification_payloads.length; j++) {
            const this_id = this.classification_payloads[j].class_id;
            if (!ulabel_class_ids.includes(this_id)) {
                log_message(`Found class id ${this_id} in "resume_from" data but not in "allowed_classes"`, LogLevel.ERROR);
            }
            found_ids.push(this_id);
            if (!("confidence" in this.classification_payloads[j])) {
                if (conf_not_found_j !== null) {
                    log_message("More than one classification payload was supplied without confidence for a single annotation.", LogLevel.ERROR);
                } else {
                    conf_not_found_j = j;
                }
            } else {
                // TODO (joshua-dean): Why is this here? It doesn't do anything
                // eslint-disable-next-line no-self-assign
                this.classification_payloads[j].confidence = this.classification_payloads[j].confidence;
                remaining_confidence -= this.classification_payloads[j]["confidence"];
            }
        }
        if (conf_not_found_j !== null) {
            if (remaining_confidence < 0) {
                log_message("Supplied total confidence was greater than 100%", LogLevel.ERROR);
            }
            this.classification_payloads[conf_not_found_j].confidence = remaining_confidence;
        }
        for (j = 0; j < ulabel_class_ids.length; j++) {
            if (!(found_ids.includes(ulabel_class_ids[j]))) {
                this.classification_payloads.push(
                    {
                        class_id: ulabel_class_ids[j],
                        confidence: 0.0,
                    },
                );
            }
        }
    }

    // ensure polygon spatial_payloads are updated to support complex polygons
    public ensure_compatible_spatial_payloads() {
        if (this.spatial_type === "polygon") {
            // Catch empty spatial payloads
            if (this.spatial_payload === undefined || this.spatial_payload.length === 0) {
                log_message(`Empty spatial payload for polygon id ${this.id}. Skipping annotation.`, LogLevel.WARNING, true);
                return false;
            }
            // Check that spatial_payload[0][0] is an array and not a number
            if (!Array.isArray(this.spatial_payload[0][0]) && typeof this.spatial_payload[0][0] === "number") {
                this.spatial_payload = <[number[]][]>[this.spatial_payload];
            }

            // Default fields if not provided
            if (
                this.spatial_payload_holes === undefined ||
                this.spatial_payload_child_indices === undefined
            ) {
                // These will be populated later, during `process_resume_from`
                this.spatial_payload_holes = [false];
                this.spatial_payload_child_indices = [[]];
            }

            const indices_to_remove = [];
            // Simplify each layer of the polygon
            for (let i = 0; i < this.spatial_payload.length; i++) {
                const layer = this.spatial_payload[i];
                // Ensure that the layer is an array
                if (!Array.isArray(layer[0])) {
                    log_message(`Layer ${i} of id ${this.id} has an invalid or empty point array. Removing layer.`, LogLevel.WARNING, true);
                    indices_to_remove.push(i);
                    continue;
                }

                // Ensure that the layer has at least 4 points (3 unique points + 1 duplicate to close the polygon)
                if (layer.length === 3) {
                    // If the last point is NOT the same as the first, add the first point to the end
                    if (layer[0][0] !== layer[2][0] || layer[0][1] !== layer[2][1]) {
                        layer.push([
                            layer[0][0],
                            layer[0][1],
                        ]);
                    }
                }
                if (layer.length < 4) {
                    log_message(`Layer ${i} of id ${this.id} has fewer than 4 points. Removing layer.`, LogLevel.WARNING, true);
                    indices_to_remove.push(i);
                    continue;
                }

                // If the last point is NOT the same as the first, add the first point to the end
                if (layer[0][0] !== layer[layer.length - 1][0] || layer[0][1] !== layer[layer.length - 1][1]) {
                    layer.push([layer[0][0], layer[0][1]]);
                }
                try {
                    this.spatial_payload[i] = GeometricUtils.turf_simplify_complex_polygon([layer])[0];
                } catch (error) {
                    log_message(`Error simplifying polygon layer ${i} of id ${this.id}. Removing layer. Error: ${error.message}`, LogLevel.WARNING, true);
                    indices_to_remove.push(i);
                }
            }

            // Remove layers that are too small
            for (const idx of indices_to_remove) {
                this.spatial_payload.splice(idx, 1);
            }
        }

        // Return true if we successfully made it here
        return true;
    }

    /**
     * Ensure each point in an annotation is within the image.
     *
     * @param {number} image_width Width of the image.
     * @param {number} image_height Height of the image.
     * @return {ULabelAnnotation} The annotation with the updated spatial payload.
     */
    public clamp_annotation_to_image_bounds(image_width: number, image_height: number): ULabelAnnotation {
        if (!this.is_delete_annotation()) {
            // Ensure each point in the payload is within the image
            // for polygons, we'll need to loop through all points
            let active_spatial_payload = this.spatial_payload;
            const n_iters = this.spatial_type === "polygon" ? this.spatial_payload.length : 1;
            for (let i = 0; i < n_iters; i++) {
                if (this.spatial_type === "polygon") {
                    active_spatial_payload = this.spatial_payload[i];
                }

                for (let j = 0; j < active_spatial_payload.length; j++) {
                    active_spatial_payload[j] = GeometricUtils.clamp_point_to_image(
                        active_spatial_payload[j],
                        image_width,
                        image_height,
                    );
                }
            }
        }

        // Return the annotation with the updated spatial payload
        return this;
    }

    /**
     * Check if the annotation is a delete annotation, e.g. annotations drawn by the `delete_polygon`
     * or `delete_bbox` annotation modes.
     *
     * @returns {boolean} True if the annotation is a delete annotation, false otherwise.
     */
    public is_delete_annotation(): boolean {
        // Check if the annotation is a delete annotation
        return this.classification_payloads[0]["class_id"] === DELETE_CLASS_ID;
    }

    public static from_json(json_block: object): ULabelAnnotation {
        const ret = new ULabelAnnotation();
        Object.assign(ret, json_block);
        // Convert deprecated spatial payloads if necessary
        if (ret.ensure_compatible_spatial_payloads()) {
            return ret;
        }
        // Return null if the spatial payload is not compatible
        return null;
    }

    /**
     * Get the polygon spatial data from an annotation.
     *
     * @param {ULabelAnnotation} annotation  polygon annotation
     * @param {boolean} deep_copy whether to return a deep copy
     * @returns {PolygonSpatialData} polygon spatial data
     */
    public static get_polygon_spatial_data(
        annotation: ULabelAnnotation,
        deep_copy: boolean = false,
    ): PolygonSpatialData {
        // Check if the annotation is a polygon
        if (annotation.spatial_type !== "polygon") {
            throw new Error("Annotation is not a polygon");
        }
        // Return the data, initializing the arrays if they are undefined
        const ret: PolygonSpatialData = {
            spatial_payload: annotation.spatial_payload,
            containing_box: annotation.containing_box ? annotation.containing_box : null,
            spatial_payload_holes: annotation.spatial_payload_holes ? annotation.spatial_payload_holes : [false],
            spatial_payload_child_indices: annotation.spatial_payload_child_indices ? annotation.spatial_payload_child_indices : [[]],
        };
        if (deep_copy) {
            return JSON.parse(JSON.stringify(ret));
        } else {
            return ret;
        }
    }
}
