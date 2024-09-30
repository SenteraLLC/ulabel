import { ULabelSpatialType, ClassDefinition } from "..";
import { ULabelAnnotation } from "./annotation";

export class ULabelSubtask {
    public actions: { stream: any[]; undone_stack: any[]; };
    public class_ids: number[] = [];
    public class_defs: ClassDefinition[]
    public active_annotation: ULabelAnnotation
    public annotations: {
        "access": {[key: string]: ULabelAnnotation},
        "ordering": string[]
    }
    public single_class_mode: boolean
    public state: {
        active_id: string,
        annotation_mode: string,
        back_context: CanvasRenderingContext2D,
        edit_candidate: unknown, // TODO: figure out what type this is
        first_explicit_assignment: boolean,
        front_context: CanvasRenderingContext2D,
        id_payload: number[] | {
            class_id: number,
            confidence: number
        }[],
        idd_associated_annotation: unknown // TODO: figure out what type this is
        idd_id: string,
        idd_id_front: string,
        idd_thumbnail: boolean,
        idd_visible: boolean,
        is_in_edit: boolean,
        is_in_move: boolean,
        is_in_progress: boolean,
        starting_complex_polygon: boolean, 
        is_in_brush_mode: boolean,
        is_in_erase_mode: boolean,
        move_candidate: unknown, // TODO: figure out what type this is.  Probably ULabelAnnotation idk for sure tho
        visible_dialogs: {}
    }

    constructor(
        public display_name: string,
        public classes: { name: string, color: string, id: number, keybind: string}[],
        public allowed_modes: ULabelSpatialType[],
        public resume_from: ULabelAnnotation[],
        public task_meta: any,
        public annotation_meta: any,
        public read_only?: boolean,
        public inactive_opacity: number = 0.4
    ) {
        this.actions = {
            "stream": [],
            "undone_stack": []
        }
    }

    public static from_json(subtask_key: string, subtask_json: any): ULabelSubtask {
        let ret = new ULabelSubtask(
            subtask_json["display_name"],
            subtask_json["classes"],
            subtask_json["allowed_modes"],
            subtask_json["resume_from"],
            subtask_json["task_meta"],
            subtask_json["annotation_meta"],
        )
        ret.read_only = ("read_only" in subtask_json) && (subtask_json["read_only"] === true)
        if ("inactive_opacity" in subtask_json && typeof subtask_json["inactive_opacity"] == "number") {
            ret.inactive_opacity = Math.min(Math.max(subtask_json["inactive_opacity"], 0.0), 1.0);
        }
        return ret;
    }
}
//export type ULabelSubtasks = { [key: string]: ULabelSubtask };