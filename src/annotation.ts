
type ULabelSpatialType = 'contour' | 'polygon' | 'bbox' | 'tbar' | 'bbox3' | 'whole-image' | 'global' | 'point';
type ULabelSpatialPayload = [number, number][];
type ULabelClassificationPayload = {
    class_id: number;
    confidence: number;
}
type ULabelContainingBox = {
    tlx: number;
    tly: number;
    brx: number;
    bry: number;
    tlz: number;
    brz: number;
};

export class ULabelAnnotation {
    constructor(
        public id?: string,
        public is_new: boolean = true,
        public parent_id: string = null,
        public created_by?: string,
        public deprecated: boolean = false,
        public spatial_type?: ULabelSpatialType,
        public spatial_payload?: ULabelSpatialPayload,
        public classification_payloads?: [ULabelClassificationPayload],
        public line_size?: number,
        public containing_box?: ULabelContainingBox,
        public frame?: number,
        public text_payload: string = "",
        public annotation_meta: any = null,
        public human_deprecated: boolean = null,
    ) {}

    public ensure_compatible_classification_payloads(ulabel_class_ids: [number]) {
        let found_ids = [];
        let j: number;
        let conf_not_found_j = null;
        let remaining_confidence = 1.0;
        for (j = 0; j < this.classification_payloads.length;j++) {
            let this_id = this.classification_payloads[j].class_id;
            if(!ulabel_class_ids.includes(this_id)) {
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

    public static from_json(json_block: any): ULabelAnnotation {
        let ret = new ULabelAnnotation();
        Object.assign(ret, json_block);
        // Handle 'new' keyword collision
        if("new" in json_block) {
            ret.is_new = json_block["new"]
        }
        return ret;
    } 

}

type ULabelAnnotations = {
    ordering: [string],
    access: { [key: string]: ULabelAnnotation[] }
}