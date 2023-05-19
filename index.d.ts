import { ULabelAnnotation } from "./src/annotation";
import { FilterDistanceOverlay } from "./src/overlays";
import { ULabelSubtask } from "./src/subtask";
import { Toolbox } from "./src/toolbox";

export type Offset = {
    id: string;
    diffX: number;
    diffY: number;
    diffZ?: number;
}

/**
 * Valid keys for the DeprecatedBy type
 */
export type ValidDeprecatedBy = "human" | "confidence_filter" | "distance_from_row";

export type DeprecatedBy = {
    human?: boolean;
    confidence_filter?: boolean;
    distance_from_row?: boolean;
}

export type DistanceFrom = {
    any_line: number;
    [key: string]: number // Key can be any string, but value must be number
}

/**
 * Info needed to filter distance from row without accessing the dom. 
 * Primarily exists so that points can be filtered before the page loads.
 */
export type FilterDistanceOverride = {
    "filter_value": number,
    "should_redraw": boolean
}

export type ClassDefinition = {
    "name": string,
    "id": number,
    "color": string
}

export type ULabelAnnotations = { [key: string]: ULabelAnnotation[] };

export type ULabelSubmitData = {
    annotations: ULabelAnnotations;
    task_meta: any;
}
export type ULabelSubmitHandler = (submitData: ULabelSubmitData) => void;

/**
 * @link https://github.com/SenteraLLC/ulabel/blob/main/api_spec.md#subtasks
 */
export type ULabelSpatialType = 'contour' | 'polygon' | 'polyline' | 'bbox' | 'tbar' | 'bbox3' | 'whole-image' | 'global' | 'point';

export type ULabelSpatialPayload = [number, number][];

export type ULabelClassificationPayload = {
    class_id: number;
    confidence: number;
}

export type ULabelContainingBox = {
    tlx: number;
    tly: number;
    brx: number;
    bry: number;
    tlz: number;
    brz: number;
};

export type ULabelSubtasks = { [key: string]: ULabelSubtask };

export class ULabel {
    subtasks: ULabelSubtask[];
    state: any;
    config: any;
    toolbox: Toolbox;
    toolbox_order?: number[];
    filter_distance_overlay?: FilterDistanceOverlay
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
    public show_initial_crop(): void;
    public show_whole_image(): void;
    public swap_frame_image(new_src: string, frame?: number): string;
    public swap_anno_bg_color(new_bg_color: string): string;
    public get_annotations(subtask: ULabelSubtask): ULabelAnnotation[];
    public set_annotations(annotations: ULabelAnnotation[], subtask: ULabelSubtask);
    public set_saved(saved: boolean);
    public redraw_all_annotations(subtask: any, offset:any, spatial_only: any);
    public show_annotation_mode(target_jq: JQuery<any>);
    public raise_error(message: string, level?: number);
    static process_classes(ulabel_obj: any, arg1: string, subtask_obj: any);
    static build_id_dialogs(ulabel_obj: any);
        
}
    
declare global {
    interface String {
    replaceLowerConcat(before: string, after: string, concat_string?: string): string
    }
}