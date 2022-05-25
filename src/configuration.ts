import { ToolboxItem } from "./toolbox"

export class Configuration {
    constructor(
        public default_toolbox_item_order: string[] = [
            "mode select",
            "zoom pan",
            "annotation resize",
            "annotation id",
            "recolor active",
            "class counter",
            "keypoint slider",
            //"linestyle"
        ]
    ) {
    }

    public update_toolbox_item_order() {
        console.log()
    }
}