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

    
}