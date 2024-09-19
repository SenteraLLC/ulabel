import { 
    AnnotationClassDistanceData, 
    DeprecatedBy, 
    ULabelClassificationPayload, 
    ULabelContainingBox, 
    ULabelSpatialType 
} from "..";
import { GeometricUtils } from "./geometric_utils";

// Modes used to draw an area in the which to delete all annotations
export const DELETE_MODES = ["delete_polygon", "delete_bbox"]
export const DELETE_CLASS_ID = -1;
export const MODES_3D = ["global", "bbox3"];
export const NONSPATIAL_MODES = ["whole-image", "global"];
export const N_ANNOS_PER_CANVAS = 100;

export type PolygonSpatialData = {
    spatial_payload: [number[]][],
    spatial_payload_holes: boolean[],
    spatial_payload_child_indices: number[][],
    containing_box: ULabelContainingBox,
}

export class ULabelAnnotation {
    constructor(
        // Required properties
        public annotation_meta: any = null,
        public deprecated: boolean = false,
        public deprecated_by: DeprecatedBy = {"human": false},
        public is_new: boolean = true,
        public parent_id: string = null,
        public text_payload: string = "",

        // Optional properties
        public subtask_key?: string,
        public classification_payloads?:ULabelClassificationPayload[],
        public containing_box?: ULabelContainingBox,
        public created_by?: string,
        public distance_from?: AnnotationClassDistanceData,
        public frame?: number,
        public line_size?: number,
        public id?: string,
        public canvas_id?: string,
        // Polygons use complex spatial payloads
        public spatial_payload?: any,
        public spatial_type?: ULabelSpatialType,
        // Polygons track if each layer is a hole or fill
        public spatial_payload_holes?: boolean[],
        // Track what holes belong to what fill, ie if spatial_payload[0] is a fill with a hole at spatial_payload[1], spatial_payload_child_indices[0] = [1]
        public spatial_payload_child_indices?: number[][],
    ) {}

    public ensure_compatible_classification_payloads(ulabel_class_ids: [number]) {
        let found_ids = [];
        let j: number;
        let conf_not_found_j = null;
        let remaining_confidence = 1.0;

        // Filter out any classification payloads items that use the DELETE_CLASS_ID
        this.classification_payloads = this.classification_payloads.filter((payload) => {
            return payload.class_id !== DELETE_CLASS_ID;
        });

        for (j = 0; j < this.classification_payloads.length;j++) {
            let this_id = this.classification_payloads[j].class_id;
            if (!ulabel_class_ids.includes(this_id)) {
                alert(`Found class id ${this_id} in "resume_from" data but not in "allowed_classes"`);
                throw `Found class id ${this_id} in "resume_from" data but not in "allowed_classes"`;
            }
            found_ids.push(this_id);
            if (!("confidence" in this.classification_payloads[j])) {
                if(conf_not_found_j !== null) {
                    throw("More than one classification payload was supplied without confidence for a single annotation.");
                }
                else {
                    conf_not_found_j = j;
                }
            }
            else {
                this.classification_payloads[j].confidence = this.classification_payloads[j].confidence;
                remaining_confidence -= this.classification_payloads[j]["confidence"];
            }

        }
        if (conf_not_found_j !== null) {
            if (remaining_confidence < 0) {
                throw("Supplied total confidence was greater than 100%");
            }
            this.classification_payloads[conf_not_found_j].confidence = remaining_confidence;
        }
        for (j = 0; j < ulabel_class_ids.length; j++) {
            if (!(found_ids.includes(ulabel_class_ids[j]))) {
                this.classification_payloads.push(
                    {
                        "class_id": ulabel_class_ids[j],
                        "confidence": 0.0
                    }
                )
            }
        }
    }

    // ensure polygon spatial_payloads are updated to support complex polygons
    public ensure_compatible_spatial_payloads() {
        if (this.spatial_type === "polygon") {
            // Catch empty spatial payloads
            if (this.spatial_payload === undefined || this.spatial_payload.length === 0) {
                console.warn(`Empty spatial payload for polygon id ${this.id}. Skipping annotation.`);
                return false;
            }
            // Check that spatial_payload[0][0] is an array and not a number
            if (!Array.isArray(this.spatial_payload[0][0]) && typeof this.spatial_payload[0][0] === "number") {
                this.spatial_payload = [this.spatial_payload];
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

            let indices_to_remove = [];
            // Simplify each layer of the polygon
            for (let i = 0; i < this.spatial_payload.length; i++) {
                let layer = this.spatial_payload[i];
                // Ensure that the layer is an array
                if (!Array.isArray(layer[0])) {
                    console.log(`Layer ${i} points of id ${this.id} are not arrays. Removing layer.`);
                    indices_to_remove.push(i);
                    continue;
                }

                // Ensure that the layer has at least 4 points (3 unique points + 1 duplicate to close the polygon)
                if (layer.length === 3) {
                    // If the last point is NOT the same as the first, add the first point to the end
                    if (layer[0][0] !== layer[2][0] || layer[0][1] !== layer[2][1]) {
                        layer.push([layer[0][0], layer[0][1]]);
                    }
                }
                if (layer.length < 4) {
                    console.log(`Layer ${i} of id ${this.id} has fewer than 4 points. Removing layer.`)
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
                    console.log(`Error simplifying polygon layer ${i} of id ${this.id}. Removing layer.`);
                    console.warn(error);
                    indices_to_remove.push(i);
                }
            }

            // Remove layers that are too small
            for (let idx of indices_to_remove) {
                this.spatial_payload.splice(idx, 1);
            }
        }

        // Return true if we successfully made it here
        return true;
    }

    public static from_json(json_block: any): ULabelAnnotation {
        let ret = new ULabelAnnotation();
        Object.assign(ret, json_block);
        // Handle 'new' keyword collision
        if("new" in json_block) {
            ret.is_new = json_block["new"]
        }
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
    public static get_polygon_spatial_data(annotation: ULabelAnnotation, deep_copy: boolean = false): PolygonSpatialData {
        // Check if the annotation is a polygon
        if (annotation.spatial_type !== "polygon") {
            throw new Error("Annotation is not a polygon");
        }
        // Return the data, initializing the arrays if they are undefined
        const ret = {
            spatial_payload: annotation.spatial_payload,
            containing_box: annotation.containing_box ? annotation.containing_box : null,
            spatial_payload_holes: annotation.spatial_payload_holes ? annotation.spatial_payload_holes : [false],
            spatial_payload_child_indices: annotation.spatial_payload_child_indices ? annotation.spatial_payload_child_indices : [[]],
        }
        if (deep_copy) {
            return JSON.parse(JSON.stringify(ret));
        } else {
            return ret;
        }
    }
}

type ULabelAnnotations = {
    ordering: [string],
    access: { [key: string]: ULabelAnnotation[] }
}