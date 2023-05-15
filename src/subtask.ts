import { ULabelAnnotation, ULabelSpatialType } from "..";

export class ULabelSubtask {
    public actions: { stream: any[]; undone_stack: any[]; };
    public class_ids: number[] = [];
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

    public get_classes_name_as_key() {
        // Initialize an object to populate and return
        let return_object: {[key: string]: string} = {}
        
        // Go through each class in the subtask
        this.classes.forEach(current_class => {
            // Add this class to the return object with the name as the key
            return_object[current_class.name] = current_class.id.toString()
        })

        return return_object
    }

    public get_classes_id_as_key() {
        // Initialize an object to populate and return
        let return_object: {[key: string]: string} = {}
        
        // Go through each class in the subtask
        this.classes.forEach(current_class => {
            // Add this class to the return object with the id as the key
            return_object[current_class.id] = current_class.name
        })
        
        return return_object
    }
}
//export type ULabelSubtasks = { [key: string]: ULabelSubtask };