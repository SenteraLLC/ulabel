import { Toolbox } from "./src/toolbox";

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

/**
 * @link https://github.com/SenteraLLC/ulabel/blob/main/api_spec.md#subtasks
 */
export type ULabelSpatialType = 'contour' | 'polygon' | 'bbox' | 'tbar' | 'bbox3' | 'whole-image' | 'global' | 'point';

export type ULabelSubtask = {
    display_name: string,
    classes: { name: string, color: string, id: number }[],
    allowed_modes: ULabelSpatialType[],
    resume_from: ULabelAnnotation[],
    task_meta: any,
    annotation_meta: any
    read_only?: boolean;
    annotations: { access: {}, ordering: [] }
}
export type ULabelSubtasks = { [key: string]: ULabelSubtask };

export class ULabel {
    subtasks: ULabelSubtask[];
    state: any;
    config: any;
    toolbox: Toolbox;
    /**
     * @link https://github.com/SenteraLLC/ulabel/blob/main/api_spec.md#ulabel-constructor
     */
    constructor(
        container_id: string,
        image_data: string | string[],
        username: string,
        on_submit: ULabelSubmitHandler,
        publicsubtasks: ULabelSubtasks,
        task_meta?: any,
        annotation_meta?: any,
        px_per_px?: number,
        init_crop?: any,
        initial_line_size?: number,
        instructions_url?: string
        )
        
        /**
         * @link https://github.com/SenteraLLC/ulabel/blob/main/api_spec.md#display-utility-functions
         */
        public init(callback: () => void): void;
        public swap_frame_image(new_src: string, frame?: number): string;
        public swap_anno_bg_color(new_bg_color: string): string;
        public get_annotations(subtask: ULabelSubtask): ULabelAnnotation[];
        public set_annotations(annotations: ULabelAnnotation[], subtask: ULabelSubtask);
        public set_saved(saved: boolean);
        public redraw_all_annotations(subtask: any, offset:any, spatial_only: any);
        static process_classes(ulabel_obj: any, arg1: string, subtask_obj: any);
        static build_id_dialogs(ulabel_obj: any);
        
    }
    