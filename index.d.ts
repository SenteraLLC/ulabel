import { ULabelAnnotation } from "./src/annotation";
import { FilterDistanceOverlay } from "./src/overlays";
import { ULabelSubtask } from "./src/subtask";
import { Toolbox } from "./src/toolbox";

/**
 * Stores the current "distance from line" filter values.
 * "single" refers to the value of the single class distance filter while [key: number] is all of the polyline classes.
 */
export type AnnotationClassDistanceData = {
    "single": number,
    [key: number]: number
}

export type AbstractPoint = {
    x: number,
    y: number,
    z?: number
}

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

/**
 * Info needed to filter distance from row without accessing the dom. 
 * Primarily exists so that points can be filtered before the page loads.
 */
export type FilterDistanceOverride = {
    distances: AnnotationClassDistanceData,
    multi_class_mode: boolean,
    should_redraw: boolean,
    show_overlay: boolean
}

export type DistanceOverlayInfo = {
    multi_class_mode: boolean,
    zoom_val: number,
    offset?: Offset
}

export type ClassDefinition = {
    name: string,
    id: number,
    color: string
}

export type SliderInfo = {
    default_value: string // Whole number
    id: string,
    slider_event: Function,

    class?: string,
    label_units?: string,
    main_label?: string, // A label that displays above the slider
    min?: string, // Whole number
    max?: string, // Whole number
    step?: string, // Whole number
}

export type RecolorActiveConfig = {
    gradient_turned_on: boolean
}

/**
 * Config object for the FilterPointDistanceFromRow ToolboxItem.
 */
export type FilterDistanceConfig = {
    name?: string,
    component_name?: string,
    filter_min?: number,
    filter_max?: number,
    default_values?: AnnotationClassDistanceData,
    step_value?: number,
    multi_class_mode?: boolean,
    filter_on_load?: boolean,
    show_options?: boolean,
    toggle_overlay_keybind?: string,
    show_overlay_on_load?: boolean
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

// A 2D spatial payload is a list of 2D points
export type ULabelSpatialPayload = [number, number][];

// A Complex spatial payload is a list of ULableSpatialPayloads
export type ULabelComplexSpatialPayload = ULabelSpatialPayload[];

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
    color_info: {[key: number]: string}
    valid_class_ids: number[];
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
    public redraw_all_annotations(subtask?: any, offset?: any, spatial_only?: any);
    public show_annotation_mode(target_jq: JQuery<any>);
    public raise_error(message: string, level?: number);
    public rezoom(): void;
    public update_frame(delta?: number, new_frame?: number): void;
    public handle_id_dialog_hover(event: any): void;
    public toggle_erase_mode(mouse_event: any): void;
    public toggle_brush_mode(mouse_event: any): void;
    public toggle_delete_class_id_in_toolbox(): void;
    public change_brush_size(scale_factor: number): void;
    public remove_listeners(): void;
    public hide_global_edit_suggestion(): void;
    public hide_edit_suggestion(): void;
    static process_classes(ulabel_obj: any, arg1: string, subtask_obj: any);
    static build_id_dialogs(ulabel_obj: any);
        
}

declare global {
    interface String {
    replaceLowerConcat(before: string, after: string, concat_string?: string): string
    }
}