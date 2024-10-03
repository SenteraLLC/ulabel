import { ULabelSpatialType, ClassDefinition } from "..";
import { ULabelAnnotation } from "./annotation";

/**
 * Action object for undo/redo functionality
 */
export type ULabelAction = {
    act_type: string
    frame: number
    /**
     * Undo/reload payloads vary on the action type
     * When they are stored, JSON.stringify() is called on the payload
     */
    undo_payload: string
    redo_payload: string
};

/**
 * Position information for a dialog
 */
export type ULabelDialogPosition = {
    left: number
    top: number
    pin: string
};

export class ULabelSubtask {
    public actions: { stream: ULabelAction[], undone_stack: ULabelAction[] };
    public class_ids: number[] = [];
    public class_defs: ClassDefinition[];
    public annotations: {
        access: { [key: string]: ULabelAnnotation }
        ordering: string[]
    };

    public single_class_mode: boolean;
    public state: {
        active_id: string
        annotation_mode: string
        back_context: CanvasRenderingContext2D
        edit_candidate: {
            annid: string
            /**
             * Access string, referring to the point with a spatial payload being edited.
             * The type varies on the type of spatial payload.
             */
            access: string | number | [number, number]
            distance: number
            point: [number, number] // Mouse location
        }
        first_explicit_assignment: boolean
        front_context: CanvasRenderingContext2D
        id_payload: number[] | {
            class_id: number
            confidence: number
        }[]
        idd_associated_annotation: unknown // TODO: figure out what type this is
        idd_id: string
        idd_id_front: string
        idd_thumbnail: boolean
        idd_visible: boolean
        is_in_edit: boolean
        is_in_move: boolean
        is_in_progress: boolean
        starting_complex_polygon: boolean
        is_in_brush_mode: boolean
        is_in_erase_mode: boolean
        move_candidate: unknown // TODO: figure out what type this is.  Probably ULabelAnnotation idk for sure tho
        visible_dialogs: {
            [key: string]: ULabelDialogPosition
        }
    };

    constructor(
        public display_name: string,
        public classes: { name: string, color: string, id: number, keybind: string }[],
        public allowed_modes: ULabelSpatialType[],
        public resume_from: ULabelAnnotation[],
        // TODO (joshua-dean): Is `task_meta` even used?
        public task_meta: object,
        /**
         * TODO (joshua-dean): Is `annotation_meta` even used?
         * It gets loaded/saved, but I don't see it being used anywhere
         * If it's specifically for user-defined meta that we shouldn't touch,
         * Then that should be documented
         */
        public annotation_meta: object | string,
        public read_only?: boolean,
        public inactive_opacity: number = 0.4,
    ) {
        this.actions = {
            stream: [],
            undone_stack: [],
        };
    }

    public static from_json(subtask_key: string, subtask_json: object): ULabelSubtask {
        const ret = new ULabelSubtask(
            subtask_json["display_name"],
            subtask_json["classes"],
            subtask_json["allowed_modes"],
            subtask_json["resume_from"],
            subtask_json["task_meta"],
            subtask_json["annotation_meta"],
        );
        ret.read_only = ("read_only" in subtask_json) && (subtask_json["read_only"] === true);
        if ("inactive_opacity" in subtask_json && typeof subtask_json["inactive_opacity"] == "number") {
            ret.inactive_opacity = Math.min(Math.max(subtask_json["inactive_opacity"], 0.0), 1.0);
        }
        return ret;
    }
}
// export type ULabelSubtasks = { [key: string]: ULabelSubtask };
