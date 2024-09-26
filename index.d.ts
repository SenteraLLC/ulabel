import { ULabelAnnotation } from "./src/annotation";
import { AllowedToolboxItem, Configuration } from "./src/configuration";
import { FilterDistanceOverlay } from "./src/overlays";
import { ULabelSubtask } from "./src/subtask";
import { Toolbox } from "./src/toolbox";

export type DistanceFromPolyline = {
    distance: number,
    polyline_id?: string,
}

/**
 * Stores the current "distance from line" filter values, or the distance of a point to the closest lines.
 * The key is the class id of the polyline. "closest_row" is a special key that stores the distance to the closest line.
 */
export type DistanceFromPolylineClasses = {
    closest_row: DistanceFromPolyline,
    [key: number]: DistanceFromPolyline
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
    distances: DistanceFromPolylineClasses,
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
    default_values?: DistanceFromPolylineClasses,
    step_value?: number,
    multi_class_mode?: boolean,
    disable_multi_class_mode?: boolean,
    filter_on_load?: boolean,
    show_options?: boolean,
    show_overlay?: boolean,
    toggle_overlay_keybind?: string,
    filter_during_polyline_move?: boolean,
}

export type ULabelSubmitButton = {
    name: string, 
    hook: Function, 
    color?: string, 
    set_saved?: boolean, 
    size_factor?: number,
    row_number?: number,
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

export type InitialCrop = {
    top: number;
    left: number;
    height: number;
    width: number;
}

export type ImageData = {
    spacing: {
        x: number,
        y: number,
        z: number,
        units: string
    },
    frames: string[]
}

export type ULabelSubtasks = { [key: string]: ULabelSubtask };

export class ULabel {
    subtasks: ULabelSubtask[];
    state: any;
    config: Configuration;
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
        submit_buttons: ULabelSubmitButton[],
        subtasks: ULabelSubtasks,
        task_meta?: object,
        annotation_meta?: object,
        px_per_px?: number,
        initial_crop?: InitialCrop,
        initial_line_size?: number,
        instructions_url?: string,
        config_data?: object,
        toolbox_order?: AllowedToolboxItem[],
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
    public redraw_multiple_spatial_annotations(annotation_ids: string[], subtask?: string, offset?: number)
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
    static process_classes(ulabel_obj: any, arg1: string, subtask_obj: any);
    static build_id_dialogs(ulabel_obj: any);
        
}

declare global {
    interface String {
    replaceLowerConcat(before: string, after: string, concat_string?: string): string
    }
}