import type { ULabelSpatialType, ClassDefinition, ULabelAction, ULabelActionCandidate } from "..";
import { ULabelAnnotation } from "./annotation";

/**
 * Position information for a dialog
 */
export type ULabelDialogPosition = {
    left: number;
    top: number;
    pin: string;
};

export class ULabelSubtask {
    public actions: { stream: ULabelAction[]; undone_stack: ULabelAction[] };
    public class_ids: number[] = [];
    public class_defs: ClassDefinition[];
    public annotations: {
        access: { [key: string]: ULabelAnnotation };
        ordering: string[];
    };

    public single_class_mode: boolean;
    public state: {
        active_id: string;
        annotation_mode: string;
        back_context: CanvasRenderingContext2D;
        edit_candidate: ULabelActionCandidate | null;
        move_candidate: ULabelActionCandidate | null;
        first_explicit_assignment: boolean;
        front_context: CanvasRenderingContext2D;
        id_payload: number[] | {
            class_id: number;
            confidence: number;
        }[];
        idd_associated_annotation: string;
        idd_id: string;
        idd_id_front: string;
        idd_thumbnail: boolean;
        idd_visible: boolean;
        is_in_edit: boolean;
        is_in_move: boolean;
        is_in_progress: boolean;
        starting_complex_polygon: boolean;
        is_in_brush_mode: boolean;
        is_in_erase_mode: boolean;
        visible_dialogs: {
            [key: string]: ULabelDialogPosition;
        };
        spatial_type: ULabelSpatialType;
    };

    constructor(
        public display_name: string,
        public classes: { name: string; color: string; id: number; keybind: string }[],
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
