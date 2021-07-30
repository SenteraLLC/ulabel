
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

class ULabelAnnotation {
    constructor(
        public id: string,
        public is_new: boolean = true,
        public parent_id: string = null,
        public created_by: string,
        public deprecated: boolean = false,
        public spatial_type: ULabelSpatialType,
        public spatial_payload: ULabelSpatialPayload,
        public classification_payloads: ULabelClassificationPayload,
        public line_size: number,
        public containing_box: ULabelContainingBox,
        public frame: number,
        public text_payload: string = "",
        public annotation_meta: any = null
    ) {}

}