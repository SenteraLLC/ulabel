import { ULabelSpatialType, ClassDefinition } from "..";
import { ULabelAnnotation } from "./annotation";

export class ULabelSubtask {
    public actions: { stream: any[]; undone_stack: any[]; };
    public class_ids: number[] = [];
    public class_defs: ClassDefinition[]
    public annotations: {
        "access": {[key: string]: ULabelAnnotation},
        "ordering": string[]
    }
    constructor(
        public display_name: string,
        public classes: { name: string, color: string, id: number }[],
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