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
        ],
        public defalut_keybinds: {[key: string]: number} = {
            "annotation_size_small": 115, //The s Key by default
            "annotation_size_large": 108, //The l Key by default
            "annotation_size_plus": 61,   //The = Key by default
            "annotation_size_minus": 45,  //The - Key by default
            "annotation_vanish": 118      //The v Key by default
        }
    ) {
    }

    public update_toolbox_item_order() {
        console.log()
    }
}