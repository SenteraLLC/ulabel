import { ULabel } from "..";

export class HTMLBuilder {

    static get_md_button(md_key, md_name, svg_blob, cur_md, subtasks) {
        let sel = "";
        let href = ` href="#"`;
        if (cur_md == md_key) {
            sel = " sel";
            href = "";
        }
        let st_classes = "";
        for (const st_key in subtasks) {
            if (subtasks[st_key]["allowed_modes"].includes(md_key)) {
                st_classes += " md-en4--" + st_key;
            }
        }

        return `<div class="mode-opt">
            <a${href} id="md-btn--${md_key}" class="md-btn${sel}${st_classes} invert-this-svg" amdname="${md_name}">
                ${svg_blob}
            </a>
        </div>`;
    }

    static get_images_html(ulabel: ULabel) {
        let images_html: string = "";

        let display: string;
        for (let i = 0; i < ulabel.config["image_data"].frames.length; i++) {
            if (i != 0) {
                display = "none";
            }
            else {
                display = "block";
            }
            images_html += `
                <img id="${ulabel.config["image_id_pfx"]}__${i}" src="${ulabel.config["image_data"].frames[i]}" class="imwrap_cls ${ulabel.config["imgsz_class"]} image_frame" style="z-index: 50; display: ${display};" />
            `;
        }
        return images_html;
    }

    static get_frame_annotation_dialogs(ulabel: ULabel) {
        let frame_annotation_dialog: string = "";
        let tot: number = 0;
        for (const st_key in ulabel.subtasks) {
            if (
                !ulabel.subtasks[st_key].allowed_modes.includes('whole-image') &&
                !ulabel.subtasks[st_key].allowed_modes.includes('global')
            ) {
                continue;
            }
            tot += 1;
        }
        let ind: number = 0;
        for (const st_key in ulabel.subtasks) {
            if (
                !ulabel.subtasks[st_key].allowed_modes.includes('whole-image') &&
                !ulabel.subtasks[st_key].allowed_modes.includes('global')
            ) {
                continue;
            }
            frame_annotation_dialog += `
                <div id="fad_st__${st_key}" class="frame_annotation_dialog fad_st__${st_key} fad_ind__${tot - ind - 1}">
                    <div class="hide_overflow_container">
                        <div class="row_container">
                            <div class="fad_row name">
                                <div class="fad_row_inner">
                                    <div class="fad_st_name">${ulabel.subtasks[st_key].display_name}</div>
                                </div>
                            </div>
                            <div class="fad_row add">
                                <div class="fad_row_inner">
                                    <div class="fad_st_add">
                                        <a class="add-glob-button" href="#">+</a>
                                    </div>
                                </div>
                            </div><div class="fad_annotation_rows"></div>
                        </div>
                    </div>
                </div>
            `;
            ind += 1;
            if (ind > 4) {
                throw new Error("At most 4 subtasks can have allow 'whole-image' or 'global' annotations.");
            }
        }
        return frame_annotation_dialog;
    }
}