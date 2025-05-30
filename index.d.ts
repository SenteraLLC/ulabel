import { ULabelAnnotation } from "./src/annotation";
import { AllowedToolboxItem, Configuration } from "./src/configuration";
import { FilterDistanceOverlay } from "./src/overlays";
import { ULabelSubtask } from "./src/subtask";
import { Toolbox } from "./src/toolbox";

export type DistanceFromPolyline = {
    distance: number;
    polyline_id?: string;
};

/**
 * Stores the current "distance from line" filter values, or the distance of a point to the closest lines.
 * The key is the class id of the polyline. "closest_row" is a special key that stores the distance to the closest line.
 */
export type DistanceFromPolylineClasses = {
    closest_row: DistanceFromPolyline;
    [key: number]: DistanceFromPolyline;
};

export type AbstractPoint = {
    x: number;
    y: number;
    z?: number;
};

export type Offset = {
    id: string;
    diffX: number;
    diffY: number;
    diffZ?: number;
};

/**
 * Valid keys for the DeprecatedBy type
 */
export type ValidDeprecatedBy = "human" | "confidence_filter" | "distance_from_row";

export type DeprecatedBy = {
    human?: boolean;
    confidence_filter?: boolean;
    distance_from_row?: boolean;
};

/**
 * Info needed to filter distance from row without accessing the dom.
 * Primarily exists so that points can be filtered before the page loads.
 */
export type FilterDistanceOverride = {
    distances: DistanceFromPolylineClasses;
    multi_class_mode: boolean;
    should_redraw: boolean;
    show_overlay: boolean;
};

export type DistanceOverlayInfo = {
    multi_class_mode: boolean;
    zoom_val: number;
    offset?: Offset;
};

export type ClassDefinition = {
    name: string;
    id: number;
    color: string;
    keybind?: string;
};

export type SliderInfo = {
    default_value: string; // Whole number
    id: string;
    // TODO (joshua-dean): decide if this type can be narrowed
    slider_event: (slider_val: number | string) => void;

    class?: string;
    label_units?: string;
    main_label?: string; // A label that displays above the slider
    min?: string; // Whole number
    max?: string; // Whole number
    step?: string; // Whole number
};

export type RecolorActiveConfig = {
    gradient_turned_on: boolean;
};

/**
 * Config object for the FilterPointDistanceFromRow ToolboxItem.
 */
export type FilterDistanceConfig = {
    name?: string;
    component_name?: string;
    filter_min?: number;
    filter_max?: number;
    default_values?: DistanceFromPolylineClasses;
    step_value?: number;
    multi_class_mode?: boolean;
    disable_multi_class_mode?: boolean;
    filter_on_load?: boolean;
    show_options?: boolean;
    show_overlay?: boolean;
    toggle_overlay_keybind?: string;
    filter_during_polyline_move?: boolean;
};

export type ULabelSubmitButton = {
    name: string;
    hook: (submit_data: ULabelSubmitData) => void;
    color?: string;
    /**
     * Whether or not the button should call `set_saved(true)`
     * on the ULabel object when clicked. Defaults to false.
     */
    set_saved?: boolean;
    size_factor?: number;
    row_number?: number;
};

export type ULabelAnnotations = { [key: string]: ULabelAnnotation[] };

export type ULabelSubmitData = {
    annotations: ULabelAnnotations;
    task_meta: object;
};
export type ULabelSubmitHandler = (submitData: ULabelSubmitData) => void;

/**
 * @link https://github.com/SenteraLLC/ulabel/blob/main/api_spec.md#subtasks
 */
export type ULabelSpatialType = "contour" | "polygon" | "polyline" | "bbox" | "tbar" | "bbox3" | "whole-image" | "global" | "point";

// A 2D spatial payload is a list of 2D points
export type ULabelSpatialPayload = [number, number][];

// A Complex spatial payload is a list of ULableSpatialPayloads
export type ULabelComplexSpatialPayload = ULabelSpatialPayload[];

export type ULabelClassificationPayload = {
    class_id: number;
    confidence: number;
};

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
};

export type ImageData = {
    spacing: {
        x: number;
        y: number;
        z: number;
        units: string;
    };
    frames: string[];
};

export type SizeMode = "fixed" | "dynamic";

export type ULabelSubtasks = { [key: string]: ULabelSubtask };

export class ULabel {
    subtasks: ULabelSubtasks;
    state: {
        // Viewer state
        zoom_val: number;
        // TODO (joshua-dean): See if this can be narrowed.
        // This exists in a few other spots that are technically
        // just mouse events as well
        last_move: JQuery.TriggeredEvent;
        current_frame: number;
        // Global annotation state
        current_subtask: string;
        last_brush_stroke: [number, number];
        line_size: number;
        size_mode: SizeMode;
        // Render state
        // TODO (joshua-dean): this is never assigned, is it used?
        demo_canvas_context: CanvasRenderingContext2D;
        edited: boolean;
    };

    config: Configuration;
    toolbox: Toolbox;
    color_info: { [key: number]: string };
    valid_class_ids: number[];
    toolbox_order?: number[];
    filter_distance_overlay?: FilterDistanceOverlay;
    begining_time: number;
    is_init: boolean;
    resize_observers: ResizeObserver[];
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
    );

    /**
     * @link https://github.com/SenteraLLC/ulabel/blob/main/api_spec.md#display-utility-functions
     */
    public init(callback: () => void): void;
    public after_init(): void;
    public show_initial_crop(): void;
    public show_whole_image(): void;
    public swap_frame_image(new_src: string, frame?: number): string;
    public swap_anno_bg_color(new_bg_color: string): string;

    // Subtasks
    public get_current_subtask_key(): string;
    public get_current_subtask(): ULabelSubtask;
    public readjust_subtask_opacities(): void;
    public set_subtask(st_key: string): void;
    public switch_to_next_subtask(): void;

    // Annotations
    public get_annotations(subtask: ULabelSubtask): ULabelAnnotation[];
    public set_annotations(annotations: ULabelAnnotation[], subtask: ULabelSubtask);
    public set_saved(saved: boolean);
    public redraw_all_annotations(
        subtask?: string, // TODO (joshua-dean): THIS IS SUBTASK KEY, NAME PROPERLY
        offset?: number,
        spatial_only?: boolean,
    );
    public redraw_multiple_spatial_annotations(annotation_ids: string[], subtask?: string, offset?: number);
    public show_annotation_mode(
        target_jq?: JQuery<HTMLElement>, // TODO (joshua-dean): validate this type
    );
    public update_frame(delta?: number, new_frame?: number): void;
    public handle_id_dialog_hover(
        mouse_event: JQuery.TriggeredEvent,
        pos_evt?: {
            class_ind: number;
            dist_prop: number;
        },
    ): void;

    // Brush
    // TODO (joshua-dean): should these actually be optional?
    public toggle_erase_mode(mouse_event?: JQuery.TriggeredEvent): void;
    public toggle_brush_mode(mouse_event?: JQuery.TriggeredEvent): void;
    public toggle_delete_class_id_in_toolbox(): void;
    public change_brush_size(scale_factor: number): void;
    public recolor_brush_circle(): void;
    public destroy_brush_circle(): void;

    // Listeners
    public remove_listeners(): void;
    static get_allowed_toolbox_item_enum(): AllowedToolboxItem;
    static process_classes(ulabel_obj: ULabel, arg1: string, subtask_obj: ULabelSubtask): void;
    static build_id_dialogs(ulabel_obj: ULabel): void;

    // Instance init functions
    public create_overlays(): void;

    // nops
    public redraw_demo(): void;

    // Annotation lifecycle
    // TODO (joshua-dean): type for redo_payload
    public begin_annotation(mouse_event: JQuery.TriggeredEvent, redo_payload?: object): void;
    public create_annotation(
        spatial_type: ULabelSpatialType,
        spatial_payload: ULabelSpatialPayload,
        unique_id?: string,
    ): void;
    public create_nonspatial_annotation(
        redo_payload?: object,
    ): void;
    public delete_annotation(
        annotation_id: string,
        redo_payload?: object,
        record_action?: boolean,
    ): void;
    public cancel_annotation(redo_payload?: object): void;
    public get_active_class_id(): number;
    public get_active_class_id_idx(): number;
    public undo(is_internal_undo?: boolean): void;
    public redo(): void;

    // Mouse event handlers
    public handle_mouse_down(mouse_event: JQuery.TriggeredEvent): void;
    public handle_mouse_move(mouse_event: JQuery.TriggeredEvent): void;
    public handle_mouse_up(mouse_event: JQuery.TriggeredEvent): void;
    public handle_aux_click(mouse_event: JQuery.TriggeredEvent): void;
    public handle_wheel(wheel_event: WheelEvent): void;
    public start_drag(
        drag_key: string,
        release_button: string,
        mouse_event: JQuery.TriggeredEvent,
    ): void;
    public end_drag(mouse_event: JQuery.TriggeredEvent): void;
    public drag_repan(mouse_event: JQuery.TriggeredEvent): void;
    public drag_rezoom(mouse_event: JQuery.TriggeredEvent): void;

    // "Mouse event interpreters"
    public get_global_mouse_x(mouse_event: JQuery.TriggeredEvent): number;
    public get_global_mouse_y(mouse_event: JQuery.TriggeredEvent): number;

    // Edit suggestions
    public suggest_edits(
        mouse_event?: JQuery.TriggeredEvent,
        nonspatial_id?: string,
    ): void;
    public show_global_edit_suggestion(
        annid: string,
        offset?: {
            diffX: number;
            diffY: number;
            diffZ?: number;
        },
        nonspatial_id?: string,
    ): void;
    public hide_global_edit_suggestion(): void;

    // Drawing
    public rezoom(
        foc_x?: number,
        foc_y?: number,
        abs?: boolean,
    ): void;
    public reposition_dialogs(): void;
    public handle_toolbox_overflow(): void;

    // ID Dialog
    public set_id_dialog_payload_nopin(
        class_ind: number,
        dist_prop: number
    ): void;
    public update_id_dialog_display(
        front?: boolean,
    ): void;
    public handle_id_dialog_click(
        mouse_event: JQuery.TriggeredEvent,
        annotation_id?: string,
        new_class_idx?: number,
    ): void;
    public show_id_dialog(
        gbx: number,
        gby: number,
        active_ann: string, // annotation id
        thumbnail?: boolean,
        nonspatial?: boolean,
    ): void;

    // Canvases
    public get_init_canvas_context_id(
        annotation_id: string,
        subtask?: string, // SUBTASK KEY
    ): string;
}

declare global {
    interface String {
        replaceLowerConcat(before: string, after: string, concat_string?: string): string;
    }
}
