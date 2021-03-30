export type ULabelAnnotation = {
    id: string;
    new: boolean;
    parent_id: null | string;
    created_by: string;
    /**
     * date like "2021-03-30T00:17:43.772Z"
     */
    created_at: string;
    deprecated: boolean;
    spatial_type: ULabelSpatialType;
    spatial_payload: [number, number][];
    classification_payloads: {
        class_id: number;
        confidence: number;
    }[];
    line_size: number;
    containing_box: {
        tlx: number;
        tly: number;
        brx: number;
        bry: number;
        tlz: number;
        brz: number;
    },
    frame: number;
    text_payload: string;
    annotation_meta: any;
};
export type ULabelAnnotations = { [key: string]: ULabelAnnotation[] };
export type ULabelSubmitData = {
    annotations: ULabelAnnotations;
    task_meta: any;
}
export type ULabelSubmitHandler = (submitData: ULabelSubmitData) => void;
export type ULabelSpatialType = 'contour' | 'polygon' | 'bbox' | 'tbar';
export type ULabelSubtask = {
    display_name: string,
    classes: { name: string, color: string, id: number }[],
    allowed_modes: ULabelSpatialType[],
    resume_from: any,
    task_meta: any,
    annotation_meta: any
}
export type ULabelSubtasks = { [key: string]: ULabelSubtask };

export class ULabel {
    constructor(
        container_id: string,
        image_url: string,
        username: string,
        on_submit: ULabelSubmitHandler,
        subtasks: ULabelSubtasks
    )

    public init(callback: () => void): void;
}
