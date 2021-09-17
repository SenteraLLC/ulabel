import { ULabelAnnotation, ULabelSubtask } from "..";

const toolboxDividerDiv = "<div class=toolbox-divider></div>"

export class ToolboxTab {
    constructor(
        public div_HTML_class: string,
        public header_title: string,
        public inner_HTML: string,
    ) {}
}

export class AnnotationIDToolboxTab extends ToolboxTab {
    constructor(subtask: any) {
        super(
            "toolbox-annotation-id",
            "Annotation ID",
            `<div class="id-toolbox-app"></div>`
        )
    }
}


export class ClassCounterToolboxTab extends ToolboxTab {
    constructor() {
        super(
            "toolbox-class-counter", 
            "Annotation Count", 
            ""
        );
        this.inner_HTML = `<p class="tb-header">${this.header_title}</p>`;
    }

    update_toolbox_counter(subtask, toolbox_id) {
        if (subtask == null) {
            return;
        }
        let class_ids = subtask.class_ids;
        let i: number, j: number;
        let class_counts = {};
        for (i = 0;i < class_ids.length;i++) {
            class_counts[class_ids[i]] = 0;
        }
        let annotations = subtask.annotations.access;
        let annotation_ids = subtask.annotations.ordering;
        var current_annotation: ULabelAnnotation, current_payload;
        for (i = 0;i < annotation_ids.length;i++) {
            current_annotation = annotations[annotation_ids[i]];
            if (current_annotation.deprecated == false) {
                for(j = 0;j < current_annotation.classification_payloads.length;j++) {
                    current_payload = current_annotation.classification_payloads[j];
                    if(current_payload.confidence > 0.0) {
                        class_counts[current_payload.class_id] += 1;
                        break;
                    }
                }
            }
        }
        let f_string = "";
        let class_name: string, class_count: number;
        for(i = 0;i<class_ids.length;i++) {
            class_name = subtask.class_defs[i].name;
            // MF-Tassels Hack
            if(class_name.includes("OVERWRITE")) {
                continue;
            }
            class_count = class_counts[subtask.class_defs[i].id];
            f_string += `${class_name}: ${class_count}<br>`;
        }
        this.inner_HTML = `<p class="tb-header">${this.header_title}</p>` + `<p>${f_string}</p>`;
    }
}

export class WholeImageClassifierToolboxTab extends ToolboxTab {
    constructor() {
        super(
            "toolbox-whole-image-classifier",
            "Whole Image Classification",
            ""
        );
    }

}