/*
Uncertain Labeling Tool
Sentera Inc.
*/

import $ from 'jquery';
const jQuery = $;

const { v4: uuidv4 } = require('uuid');

import { 
    DEMO_ANNOTATION, 
    BBOX_SVG, 
    BBOX3_SVG,
    POINT_SVG,
    POLYGON_SVG, 
    CONTOUR_SVG, 
    get_init_style, 
    COLORS, 
    TBAR_SVG, 
    POLYLINE_SVG, 
    WHOLE_IMAGE_SVG, 
    GLOBAL_SVG ,
    BUTTON_LOADER_HTML
} from './blobs';
import { ULABEL_VERSION } from './version';

jQuery.fn.outer_html = function() {
    return jQuery('<div />').append(this.eq(0).clone()).html();
};

const MODES_3D = ["global", "bbox3"];
const NONSPATIAL_MODES = ["whole-image", "global"];

export class ULabel {

    // ================= Internal constants =================

    static get elvl_info() {return 0;}
    static get elvl_standard() {return 1;}
    static get elvl_fatal() {return 2;}
    static version() {return ULABEL_VERSION;}

    // ================= Static Utilities =================

    static add_style_to_document(ul) {
        let head = document.head || document.getElementsByTagName('head')[0];
        let style = document.createElement('style');
        head.appendChild(style);
        if (style.styleSheet) {
            style.styleSheet.cssText = get_init_style(ul.config["container_id"]);
        }
        else {
            style.appendChild(document.createTextNode(get_init_style(ul.config["container_id"])));
        }
    }

    // Returns current epoch time in milliseconds
    static get_time() {
        return (new Date()).toISOString();
    }
    
    static l2_norm(pt1, pt2) {
        let ndim = pt1.length;
        let sq = 0;
        for (var i = 0; i < ndim; i++) {
            sq += (pt1[i] - pt2[i])*(pt1[i] - pt2[i]);
        }
        return Math.sqrt(sq);
    }

    // Get the point at a certain proportion of the segment between two points in a polygon
    static interpolate_poly_segment(pts, i, prop) {
        const pt1 = pts[i%pts.length];
        const pt2 = pts[(i + 1)%pts.length];
        return [
            pt1[0]*(1.0 - prop) + pt2[0]*prop,
            pt1[1]*(1.0 - prop) + pt2[1]*prop
        ];
    }
    
    // Given two points, return the line that goes through them in the form of
    //    ax + by + c = 0
    static get_line_equation_through_points(p1, p2) {
        const a = (p2[1] - p1[1]);
        const b = (p1[0] - p2[0]);

        // If the points are the same, no line can be inferred. Return null
        if ((a == 0) && (b == 0)) return null;

        const c = p1[1]*(p2[0] - p1[0]) - p1[0]*(p2[1] - p1[1]);
        return {
            "a": a,
            "b": b,
            "c": c
        };
    }
    
    // Given a line segment in the form of ax + by + c = 0 and two endpoints for it,
    //   return the point on the segment that is closest to the reference point, as well
    //   as the distance away
    static get_nearest_point_on_segment(ref_x, ref_y, eq, kp1, kp2) {
        // For convenience
        const a = eq["a"];
        const b = eq["b"];
        const c = eq["c"];
    
        // Where is that point on the line, exactly?
        var nrx = (b*(b*ref_x - a*ref_y) - a*c)/(a*a + b*b);
        var nry = (a*(a*ref_y - b*ref_x) - b*c)/(a*a + b*b);
    
        // Where along the segment is that point?
        var xprop = 0.0;
        if (kp2[0] != kp1[0]) {
            xprop = (nrx - kp1[0])/(kp2[0] - kp1[0]);
        }
        var yprop = 0.0;
        if (kp2[1] != kp1[1]) {
            yprop = (nry - kp1[1])/(kp2[1] - kp1[1]);
        }

        // If the point is at an end of the segment, just return null
        if ((xprop < 0) || (xprop > 1) || (yprop < 0) || (yprop > 1)) {
            return null;        
        }

        // Distance from point to line
        var dst = Math.abs(a*ref_x + b*ref_y + c)/Math.sqrt(a*a + b*b);
        
        // Proportion of the length of segment from p1 to the nearest point
        const seg_length = Math.sqrt((kp2[0] - kp1[0])*(kp2[0] - kp1[0]) + (kp2[1] - kp1[1])*(kp2[1] - kp1[1]));
        const kprop = Math.sqrt((nrx - kp1[0])*(nrx - kp1[0]) + (nry - kp1[1])*(nry - kp1[1]))/seg_length;

        // return object with info about the point
        return {
            "dst": dst,
            "prop": kprop
        };
    }
    
    // Return the point on a polygon that's closest to a reference along with its distance
    static get_nearest_point_on_polygon(ref_x, ref_y, spatial_payload, dstmax=Infinity, include_segments=false) {
        const poly_pts = spatial_payload;

        // Initialize return value to null object
        var ret = {
            "access": null,
            "distance": null,
            "point": null
        };
        if (!include_segments) {
            // Look through polygon points one by one 
            //    no need to look at last, it's the same as first
            for (let kpi = 0; kpi < poly_pts.length; kpi++) {
                var kp = poly_pts[kpi];
                // Distance is measured with l2 norm
                let kpdst = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
                // If this a minimum distance so far, store it
                if (ret["distance"] == null || kpdst < ret["distance"]) {
                    ret["access"] = kpi;
                    ret["distance"] = kpdst;
                    ret["point"] = poly_pts[kpi];
                }
            }
            return ret;
        }
        else {
            for (let kpi = 0; kpi < poly_pts.length-1; kpi++) {
                var kp1 = poly_pts[kpi];
                var kp2 = poly_pts[kpi+1];
                var eq = ULabel.get_line_equation_through_points(kp1, kp2);
                var nr = ULabel.get_nearest_point_on_segment(ref_x, ref_y, eq, kp1, kp2);
                if ((nr != null) && (nr["dst"] < dstmax) && (ret["distance"] == null || nr["dst"] < ret["distance"])) {
                    ret["access"] = "" + (kpi + nr["prop"]);
                    ret["distance"] = nr["dst"];
                    ret["point"] = ULabel.interpolate_poly_segment(poly_pts, kpi, nr["prop"]);
                }
            }
            return ret;
        }
    }
    
    static get_nearest_point_on_bounding_box(ref_x, ref_y, spatial_payload, dstmax=Infinity) {
        var ret = {
            "access": null,
            "distance": null,
            "point": null
        };
        for (var bbi = 0; bbi < 2; bbi++) {
            for (var bbj = 0; bbj < 2; bbj++) {
                var kp = [spatial_payload[bbi][0], spatial_payload[bbj][1]];
                var kpdst = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
                if (kpdst < dstmax && (ret["distance"] == null || kpdst < ret["distance"])) {
                    ret["access"] = `${bbi}${bbj}`;
                    ret["distance"] = kpdst;
                    ret["point"] = kp;
                }
            }
        }
        return ret;
    }

    static get_nearest_point_on_bbox3(ref_x, ref_y, frame, spatial_payload, dstmax=Infinity) {
        var ret = {
            "access": null,
            "distance": null,
            "point": null
        };
        for (var bbi = 0; bbi < 2; bbi++) {
            for (var bbj = 0; bbj < 2; bbj++) {
                var kp = [spatial_payload[bbi][0], spatial_payload[bbj][1]];
                var kpdst = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
                if (kpdst < dstmax && (ret["distance"] == null || kpdst < ret["distance"])) {
                    ret["access"] = `${bbi}${bbj}`;
                    ret["distance"] = kpdst;
                    ret["point"] = kp;
                }
            }
        }
        let min_k = 0;
        let min = spatial_payload[0][2];
        let max_k = 1;
        let max = spatial_payload[1][2];
        if (max < min) {
            let tmp = min_k;
            min_k = max_k;
            max_k = tmp;
            tmp = min;
            min = max;
            max = tmp;
        }

        if (frame == min) {
            ret["access"] += "" + min_k;
        }
        else if (frame == max) {
            ret["access"] += "" + max_k;
        }
        return ret;
    }

    static get_nearest_point_on_tbar(ref_x, ref_y, spatial_payload, dstmax=Infinity) {
        // TODO intelligently test against three grabbable points
        var ret = {
            "access": null,
            "distance": null,
            "point": null
        };
        for (var tbi = 0; tbi < 2; tbi++) {
            var kp = [spatial_payload[tbi][0], spatial_payload[tbi][1]];
            var kpdst = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
            if (kpdst < dstmax && (ret["distance"] == null || kpdst < ret["distance"])) {
                ret["access"] = `${tbi}${tbi}`;
                ret["distance"] = kpdst;
                ret["point"] = kp;
            }
        }
        return ret;        
    }

    // =========================== NIGHT MODE COOKIES =======================================

    static has_night_mode_cookie() {
        if (document.cookie.split(";").find(row => row.trim().startsWith("nightmode=true"))) {
            return true;
        }
        return false;
    }

    static set_night_mode_cookie() {
        let d = new Date();
        d.setTime(d.getTime() + (10000*24*60*60*1000));
        document.cookie = "nightmode=true;expires="+d.toUTCString()+";path=/";
    }

    static destroy_night_mode_cookie() {
        document.cookie = "nightmode=true;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }

    /*
    Types of drags
        - annotation
            - Bare canvas left mousedown 
        - edit
            - Editable left mousedown
        - pan
            - Ctrl-left mousedown
            - Center mousedown
        - zoom
            - Right mousedown
            - Shift-left mousedown
    */
    static get_drag_key_start(mouse_event, ul) {
        if (ul.subtasks[ul.state["current_subtask"]]["state"]["active_id"] != null) {
            if (mouse_event.button == 2) {
                return "right";
            }
            return "annotation";
        }
        switch (mouse_event.button) {
            case 0:
                if (mouse_event.target.id == ul.subtasks[ul.state["current_subtask"]]["canvas_fid"]) {
                    if (mouse_event.ctrlKey || mouse_event.metaKey) {
                        return "pan";
                    }
                    if (mouse_event.shiftKey) {
                        return "zoom";
                    }
                    return "annotation";
                }
                else if ($(mouse_event.target).hasClass("editable")) {
                    return "edit";
                }
                else if ($(mouse_event.target).hasClass("movable")) {
                    mouse_event.preventDefault();
                    return "move";
                }
                else {
                    console.log("Unable to assign a drag key to click target:", mouse_event.target.id);
                    return null;
                }
            case 1:
                return "pan";
            case 2:
                return null;
        }
    }

    // ================= Init helpers =================

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

    static get_toolbox_tabs(ul) {
        let ret = "";
        for (const st_key in ul.subtasks) {
            let sel = "";
            let href = ` href="#"`;
            let val = 50;
            if (st_key == ul.state["current_subtask"] || ul.subtasks[st_key]["read_only"]) {
                href = "";
            }
            if (st_key == ul.state["current_subtask"]) {
                sel = " sel";
                val = 100;
            }
            ret += `
            <div class="tb-st-tab${sel}">
                <a${href} id="tb-st-switch--${st_key}" class="tb-st-switch">${ul.subtasks[st_key]["display_name"]}</a><!--
                --><span class="tb-st-range">
                    <input id="tb-st-range--${st_key}" type="range" min=0 max=100 value=${val} />
                </span>
            </div>
            `;
        }
        return ret;
    }
    

    static get_images_html(ul) {
        let ret = "";

        let dsply;
        for (let i = 0; i < ul.config["image_data"].frames.length; i++) {
            if (i != 0) {
                dsply = "none";
            }
            else {
                dsply = "block";
            }
            ret += `
                <img id="${ul.config["image_id_pfx"]}__${i}" src="${ul.config["image_data"].frames[i]}" class="imwrap_cls ${ul.config["imgsz_class"]} image_frame" style="z-index: 50; display: ${dsply};" />
            `;
        }
        return ret;
    }

    static get_frame_annotation_dialogs(ul) {
        let ret = "";
        let tot = 0;
        for (const st_key in ul.subtasks) {
            if (
                !ul.subtasks[st_key].allowed_modes.includes('whole-image') && 
                !ul.subtasks[st_key].allowed_modes.includes('global') 
            ) {
                continue;
            }
            tot += 1;
        }
        let ind = 0;
        for (const st_key in ul.subtasks) {
            if (
                !ul.subtasks[st_key].allowed_modes.includes('whole-image') && 
                !ul.subtasks[st_key].allowed_modes.includes('global') 
            ) {
                continue;
            }
            ret += `
                <div id="fad_st__${st_key}" class="frame_annotation_dialog fad_st__${st_key} fad_ind__${tot-ind-1}">
                    <div class="hide_overflow_container">
                        <div class="row_container">
                            <div class="fad_row name">
                                <div class="fad_row_inner">
                                    <div class="fad_st_name">${ul.subtasks[st_key].display_name}</div>
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
        return ret;
    }


    static prep_window_html(ul) {
        // Bring image and annotation scaffolding in
        // TODO multi-image with spacing etc.

        let instructions = "";
        if (ul.config["instructions_url"] != null) {
            instructions = `
                <a href="${ul.config["instructions_url"]}" target="_blank" rel="noopener noreferrer">Instructions</a>
            `;
        }

        const tabs = ULabel.get_toolbox_tabs(ul);

        const images = ULabel.get_images_html(ul);

        const frame_annotation_dialogs = ULabel.get_frame_annotation_dialogs(ul);

        let frame_range = `
        <div class="full-tb htbmain set-frame">
            <p class="shortcut-tip">scroll to switch frames</p>
            <div class="zpcont">
                <div class="lblpyldcont">
                    <span class="pzlbl htblbl">Frame</span> &nbsp;
                    <input class="frame_input" type="range" min=0 max=${ul.config["image_data"].frames.length-1} value=0 />
                </div>
            </div>
        </div>
        `;
        if (ul.config["image_data"]["frames"].length == 1) {
            frame_range = ``;
        }

        const tool_html = `
        <div class="full_ulabel_container_">
            ${frame_annotation_dialogs}
            <div id="${ul.config["annbox_id"]}" class="annbox_cls">
                <div id="${ul.config["imwrap_id"]}" class="imwrap_cls ${ul.config["imgsz_class"]}">
                    ${images}
                </div>
            </div>
            <div id="${ul.config["toolbox_id"]}" class="toolbox_cls">
                <div class="toolbox-name-header">
                    <h1 class="toolname"><a class="repo-anchor" href="https://github.com/SenteraLLC/ulabel">ULabel</a> <span class="version-number">v${ULABEL_VERSION}</span></h1><!--
                    --><div class="night-button-cont">
                        <a href="#" class="night-button">
                            <div class="night-button-track">
                                <div class="night-status"></div>
                            </div>
                        </a>
                    </div>
                </div>
                <div class="toolbox_inner_cls">
                    <div class="mode-selection">
                        <p class="current_mode_container">
                            <span class="cmlbl">Mode:</span>
                            <span class="current_mode"></span>
                        </p>
                    </div>
                    <div class="toolbox-divider"></div>
                    <div class="zoom-pan">
                        <div class="half-tb htbmain set-zoom">
                            <p class="shortcut-tip">ctrl+scroll or shift+drag</p>
                            <div class="zpcont">
                                <div class="lblpyldcont">
                                    <span class="pzlbl htblbl">Zoom</span>
                                    <span class="zinout htbpyld">
                                        <a href="#" class="zbutt zout">-</a>
                                        <a href="#" class="zbutt zin">+</a>
                                    </span>
                                </div>
                            </div>
                        </div><!--
                        --><div class="half-tb htbmain set-pan">
                            <p class="shortcut-tip">scrollclick+drag or ctrl+drag</p>
                            <div class="zpcont">
                                <div class="lblpyldcont">
                                    <span class="pzlbl htblbl">Pan</span>
                                    <span class="panudlr htbpyld">
                                        <a href="#" class="pbutt left"></a>
                                        <a href="#" class="pbutt right"></a>
                                        <a href="#" class="pbutt up"></a>
                                        <a href="#" class="pbutt down"></a>
                                        <span class="spokes"></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        ${frame_range}
                    </div>
                    <div class="toolbox-divider"></div>
                    <div class="linestyle">
                        <p class="tb-header">Line Width</p>
                        <div class="lstyl-row">
                            <div class="line-expl">
                                <a href="#" class="wbutt wout">-</a>
                                <canvas 
                                    id="${ul.config["canvas_did"]}" 
                                    class="demo-canvas" 
                                    width=${ul.config["demo_width"]*ul.config["px_per_px"]} 
                                    height=${ul.config["demo_height"]*ul.config["px_per_px"]}></canvas>
                                <a href="#" class="wbutt win">+</a>
                            </div><!--
                            --><div class="setting">
                                <a class="fixed-setting">Fixed</a><br>
                                <a href="#" class="dyn-setting">Dynamic</a>
                            </div>
                        </div>
                    </div>
                    <div class="toolbox-divider"></div>
                    <div class="classification">
                        <p class="tb-header">Annotation ID</p>
                        <div class="id-toolbox-app"></div>
                    </div>
                    <div class="toolbox-refs">
                        ${instructions}
                    </div>
                </div>
                <div class="toolbox-tabs">
                    ${tabs}
                </div>
            </div>
        </div>`;
        $("#" + ul.config["container_id"]).html(tool_html)


        // Build toolbox for the current subtask only
        const crst = Object.keys(ul.subtasks)[0];

        // Initialize toolbox based on configuration
        const sp_id = ul.config["toolbox_id"];
        let curmd = ul.subtasks[crst]["state"]["annotation_mode"];
        let md_buttons = [
            ULabel.get_md_button("bbox", "Bounding Box", BBOX_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("point", "Point", POINT_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("polygon", "Polygon", POLYGON_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("tbar", "T-Bar", TBAR_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("polyline", "Polyline", POLYLINE_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("contour", "Contour", CONTOUR_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("bbox3", "Bounding Cube", BBOX3_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("whole-image", "Whole Frame", WHOLE_IMAGE_SVG, curmd, ul.subtasks),
            ULabel.get_md_button("global", "Global", GLOBAL_SVG, curmd, ul.subtasks),
        ];

        // Append but don't wait
        $("#" + sp_id + " .toolbox_inner_cls .mode-selection").append(md_buttons.join("<!-- -->"));
        // TODO noconflict
        $("#" + sp_id + " .toolbox_inner_cls").append(`
            <a id="submit-button" href="#">${ul.config["done_button"]}</a>
        `);

        // Show current mode label
        ul.show_annotation_mode();

        // Make sure that entire toolbox is shown
        if ($("#" + ul.config["toolbox_id"] + " .toolbox_inner_cls").height() > $("#" + ul.config["container_id"]).height()) {
            $("#" + ul.config["toolbox_id"]).css("overflow-y", "scroll");
        }

    }
   
    static get_idd_string(idd_id, wdt, center_coord, cl_opacity, class_ids, inner_rad, outer_rad, class_defs) {
        // TODO noconflict
        let dialog_html = `
        <div id="${idd_id}" class="id_dialog" style="width: ${wdt}px; height: ${wdt}px;">
            <a class="id-dialog-clickable-indicator" href="#"></a>
            <svg width="${wdt}" height="${wdt}">
        `;

        for (var i = 0; i < class_ids.length; i++) {

            let srt_prop = 1/class_ids.length;

            let cum_prop = i/class_ids.length;
            let srk_prop = 1/class_ids.length;
            let gap_prop = 1.0 - srk_prop;

            let rad_back = inner_rad + 1.0*(outer_rad - inner_rad)/2;
            let rad_frnt = inner_rad + srt_prop*(outer_rad - inner_rad)/2;

            let wdt_back = 1.0*(outer_rad - inner_rad);
            let wdt_frnt = srt_prop*(outer_rad - inner_rad);

            let srk_back = 2*Math.PI*rad_back*srk_prop;
            let gap_back = 2*Math.PI*rad_back*gap_prop;
            let off_back = 2*Math.PI*rad_back*cum_prop;

            let srk_frnt = 2*Math.PI*rad_frnt*srk_prop;
            let gap_frnt = 2*Math.PI*rad_frnt*gap_prop;
            let off_frnt = 2*Math.PI*rad_frnt*cum_prop;

            let ths_id = class_ids[i];
            let ths_col = class_defs[i]["color"];
            // TODO should names also go on the id dialog?
            // let ths_nam = class_defs[i]["name"];
            dialog_html += `
            <circle
                r="${rad_back}" cx="${center_coord}" cy="${center_coord}" 
                stroke="${ths_col}" 
                fill-opacity="0"
                stroke-opacity="${cl_opacity}"
                stroke-width="${wdt_back}"; 
                stroke-dasharray="${srk_back} ${gap_back}" 
                stroke-dashoffset="${off_back}" />
            <circle
                id="${idd_id}__circ_${ths_id}"
                r="${rad_frnt}" cx="${center_coord}" cy="${center_coord}"
                fill-opacity="0"
                stroke="${ths_col}" 
                stroke-opacity="1.0"
                stroke-width="${wdt_frnt}" 
                stroke-dasharray="${srk_frnt} ${gap_frnt}" 
                stroke-dashoffset="${off_frnt}" />
            `;
        }
        dialog_html += `
            </svg>
            <div class="centcirc"></div>
        </div>`;

        return dialog_html;
    }

    static build_id_dialogs(ul) {
        var full_toolbox_html = `<div class="toolbox-id-app-payload">`;

        const wdt = ul.config["outer_diameter"];
        // TODO real names here!
        const inner_rad = ul.config["inner_prop"]*wdt/2;
        const inner_diam = inner_rad*2;
        const outer_rad = 0.5*wdt;
        const inner_top = outer_rad - inner_rad;
        const inner_lft = outer_rad - inner_rad;

        const cl_opacity = 0.4;
        let tbid = ul.config["toolbox_id"];

        const center_coord = wdt/2;

        for (const st in ul.subtasks) {
            const idd_id = ul.subtasks[st]["state"]["idd_id"];
            const idd_id_front = ul.subtasks[st]["state"]["idd_id_front"];

            let subtask_dialog_container_jq = $("#dialogs__" + st);
            let front_subtask_dialog_container_jq = $("#front_dialogs__" + st);

            let dialog_html_v2 = ULabel.get_idd_string(
                idd_id, wdt, center_coord, cl_opacity, ul.subtasks[st]["class_ids"], 
                inner_rad, outer_rad, ul.subtasks[st]["class_defs"]
            );
            let front_dialog_html_v2 = ULabel.get_idd_string(
                idd_id_front, wdt, center_coord, cl_opacity, ul.subtasks[st]["class_ids"], 
                inner_rad, outer_rad, ul.subtasks[st]["class_defs"]
            );

            // TODO noconflict
            var toolbox_html = `<div id="tb-id-app--${st}" class="tb-id-app">`;
            const class_ids = ul.subtasks[st]["class_ids"];
        
    
            for (var i = 0; i < class_ids.length; i++) {
    
                let ths_id = class_ids[i];
                let ths_col = ul.subtasks[st]["class_defs"][i]["color"];
                let ths_nam = ul.subtasks[st]["class_defs"][i]["name"];
                
                let sel = "";
                let href = ' href="#"';
                if (i == 0) {
                    sel = " sel";
                    href = "";
                }
                if (ul.config["allow_soft_id"]) {
                    let msg = "Only hard id is currently supported";
                    throw new Error(msg);
                }
                else {
                    toolbox_html += `
                        <a${href} id="${tbid}_sel_${ths_id}" class="tbid-opt${sel}">
                            <div class="colprev ${tbid}_colprev_${ths_id}" style="background-color: ${ths_col}"></div> <span class="tb-cls-nam">${ths_nam}</span>
                        </a>
                    `;
                }
            }
            toolbox_html += `
            </div>`;

            // Add dialog to the document
            // front_subtask_dialog_container_jq.append(dialog_html);
            // $("#" + ul.subtasks[st]["idd_id"]).attr("id", ul.subtasks[st]["idd_id_front"]);
            front_subtask_dialog_container_jq.append(front_dialog_html_v2); // TODO(new3d) MOVE THIS TO GLOB BOX -- superimpose atop thee anchor already there when needed, no remove and add back
            subtask_dialog_container_jq.append(dialog_html_v2);
            // console.log(dialog_html);
            // console.log(dialog_html_v2);
 
            // Wait to add full toolbox
            full_toolbox_html += toolbox_html;

            ul.subtasks[st]["state"]["visible_dialogs"][idd_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
        }

        // Add all toolbox html at once
        $("#" + ul.config["toolbox_id"] + " div.id-toolbox-app").html(full_toolbox_html);

        // Style revisions based on the size
        let idci = $("#" + ul.config["container_id"] + " a.id-dialog-clickable-indicator");
        idci.css({
            "height": `${wdt}px`,
            "width": `${wdt}px`,
            "border-radius": `${outer_rad}px`,
        });
        let ccirc = $("#" + ul.config["container_id"] + " div.centcirc");
        ccirc.css({
            "position": "absolute",
            "top": `${inner_top}px`,
            "left": `${inner_lft}px`,
            "width": `${inner_diam}px`,
            "height": `${inner_diam}px`,
            "background-color": "black",
            "border-radius": `${inner_rad}px`
        });

    }
    
    static build_edit_suggestion(ul) {
        // TODO noconflict
        // DONE Migrated to subtasks

        for (const stkey in ul.subtasks) {
            let local_id = `edit_suggestion__${stkey}`;
            let global_id = `global_edit_suggestion__${stkey}`;

            let subtask_dialog_container_jq = $("#dialogs__" + stkey);

            // Local edit suggestion
            subtask_dialog_container_jq.append(`
                <a href="#" id="${local_id}" class="edit_suggestion editable"></a>
            `);
            $("#" + local_id).css({
                "height": ul.config["edit_handle_size"]+"px",
                "width": ul.config["edit_handle_size"]+"px",
                "border-radius": ul.config["edit_handle_size"]/2+"px"
            });

            // Global edit suggestion
            let id_edit = "";
            let mcm_ind = "";
            if (!ul.subtasks[stkey]["single_class_mode"]) {
                id_edit = `--><a href="#" class="reid_suggestion global_sub_suggestion gedit-target"></a><!--`;
                mcm_ind= " mcm";
            }
            subtask_dialog_container_jq.append(`
                <div id="${global_id}" class="global_edit_suggestion glob_editable gedit-target${mcm_ind}">
                    <a href="#" class="move_suggestion global_sub_suggestion movable gedit-target">
                        <img class="movable gedit-target" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAdVBMVEX///8jHyAAAAD7+/sfGxwcFxhta2s3NDUEAABxcHBqaWnr6+seGRoSCw0yLzC0s7O6ubl4dncLAAN9fHz19fUsKCkWERInIyTW1dV5eHjBwMCko6ODgoJAPj7o5+jw7/BYVleLiopHRUXKysqtrK1PTE0/PD0MlkEbAAAF+ElEQVR4nO2d63aiMBRGIYJTWhyrKPZia2sv7/+IQ7QWYhLITcmXyf41yzWLOXs+GsDmHJLkqsz32X5+3X/yuhSkTEuyGLuMyzElKYVMxy7kUhRHwUaxGLuUyzA9CYaaYtEKhpkiIxii4pQVDO9ELc4FQ0uRSzC0FAUJhpXi7Y1QMJwUC5lgKClO5YJhpNgrGEKKwlU0pBQHEqTcQCv2LDIdReATVXqZOFO8HbtQU5QSRE5RMUHcFJUTRE1RYRVlFOFWVE1BPEVtQbRLv8Yig5miQYIHRZjlxijBgyLIRWMxdLMthzyOXbwKH+aCjeLH2OUrsJ1ZGM62Y5evwKK2MKwRTtNPq7P0c+zyFZisc2PBfD0Zu3wV7kpeUfSzyX+WZ3djF68Gr0jul5zO8v78dM5LEMFGMWUVyVMi+L1F8sR+mKcwgo1i1lUk98lEYDhJmBRhTtEj3RSbBCWGXUWoBCltik2CUsNWESxByinFg6DU8KQIlyDlrmwuB/lRUG7YKDb/EzOcVbTLakHI18Pxz3LD5OGLkMVqvDId0WMYCNEQn2iITzTEJxriEw3xiYb4REN8oiE+0RCfaIhPNMQnGuITDfGJhvhEQ3yiIT7RMABEe6LCojjfpzcD2pmvxC5flllLuSx3Y5d04KMqnh39uEy2L39aXrauDvtcVBZ7wxdkVpO1z5t5XteknpmP9Lk9LA95/uqyJqe85oetZcSwT+PU+VLWvqZ4V5fHEs0aitrOlzzzM8XOLlYTxW7vkp9bI5nN1vqKbHNWvvFP8Wyrta7iefeZf/s/2Y3W2op8e12+8eMKfWK34VoedAZQiPoH841Pe0BXqaBtRb0LVTwwZ+lT01UlbB9TTVE2rGN52aK1kJSolqJk5JFfjzvSGhVSlI5bqd8uXrc6b7LusWFFaYIpebhG6Yo8yMscUOwRvL9O7YpwbWGKijCCpopAgmaKUIImivI+euLn6N+5vGDhUz9YghS9FOWCMz8TpMylvf98inLB5naNqFPZ3p/vHjX+Nb67WJqixSwLlllp9zXhpLYZydCFTdGZYBP4u5XhticWTbqKfaeoLuWLleF36a6UVtFhgmma/bUy/Js5rOU0DMapoFeGPylWTgX9MkxJ1XdjYIZfhvRu5cvxIT0zLN8Sx0f0zTDNkr3D5flwRL8Msy+7kUCiQ/plSIcWBb+W/gfXwyR5DPaepjod1mWK5beVodP70qo9bpjPFlX3wO6eD3O758OVu+fDij2yq2f8wvYZf1U4esbnpvfJU8T8nqbi/3ZY37UJ5y+G9H2pIEEKWIq6CVKgFHsEJQlSgBTNBIEUTQVD+B3wgGCPIsjv8QcF0fdiKAhi7KeRzERXE0TeE6UoKNnXlvq/r01ZEHVvotZJ5v/+Uk5RJ0GK/3uEd+zccF1BhH3eTIr6ggh79Tspmggi9Fv8pqi3yLT43zOz29TmCVIeD31P/go2it+078niC8yL9a59v7vqIJ0v3v146OH7D326RXIB30Nq3FLnKfzN/M3YJbkl/F7uaIhPNMQnGuITDfGJhvhEQ3yiIT7REJ9oiE80xCca4hMN8YmG+ERDfKIhPtEQn2iISfDv5Q7+3eqnAapHRanhT9+Ef/tXB2kHqB4UZYa/jSF+bvDsoTsClzxJDTudL2ApsiNwmxTFhkxrD1SKZ0OMaYqidyM8sR8CpciMof5Jke/YXXLNWTnKisoLNpcD7hPRZyAn6mQt67oaJl8j3OhYDUuho0i8Z1FbGNbSDl6PeLcZijCzmzlxHeTtnQp41agqxWKkj3lbwXW5lfQ/DnJj+K6R6yPqX1QR1Bj9PzZGimavUhkL6WR3OepvNvAD7RSxEqRoKuIJJkmho4i0yLRoXDRwLhMsyiliJkhRTBE1QYpSirgJUhRWVMRVtMvgpR/tQs8zkCL2KXqkVxE/QUrPcqPzIjGfkV40wkiQIkkxlAQpwhTDSZAiGMwUUoIUbkUNK0HKWYqhJUhhFEMUZG7gwjtFj/ymGGaClJ8UQ02QsiBZmpm/KByB+T7bX3ko8T9Zz1H5wFZx8QAAAABJRU5ErkJggg==">
                    </a><!--
                    ${id_edit}
                    --><a href="#" class="delete_suggestion global_sub_suggestion gedit-target">
                        <span class="bigx gedit-target">&#215;</span>
                    </a>
                </div>
            `);

            // Register these dialogs with each subtask
            ul.subtasks[stkey]["state"]["visible_dialogs"][local_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
            ul.subtasks[stkey]["state"]["visible_dialogs"][global_id] = {
                "left": 0.0,
                "top": 0.0,
                "pin": "center"
            };
        }

    }

    static create_listeners(ul) {

        // ================= Mouse Events in the ID Dialog ================= 
        
        var iddg = $(".id_dialog");

        // Hover interactions

        iddg.on("mousemove", function(mouse_event) {
            let crst = ul.state["current_subtask"];
            if (!ul.subtasks[crst]["state"]["idd_thumbnail"]) {
                ul.handle_id_dialog_hover(mouse_event);
            }
        });
        
        // Clicks
        // TODO
        
        // ================= Mouse Events in the Annotation Container ================= 
        
        var annbox = $("#" + ul.config["annbox_id"]);
        
        // Detect and record mousedown
        annbox.mousedown(function(mouse_event) {
            ul.handle_mouse_down(mouse_event);
        });
        
        // Detect and record mouseup
        $(window).mouseup(function(mouse_event) {
            ul.handle_mouse_up(mouse_event);
        });

        $(window).on("click", (e) => {
            if (e.shiftKey) {
                e.preventDefault();
            }
        })
        
        // Mouse movement has meaning in certain cases
        annbox.mousemove(function(mouse_event) {
            ul.handle_mouse_move(mouse_event);
        });
        
        // Detection ctrl+scroll
        document.getElementById(ul.config["annbox_id"]).onwheel = function (wheel_event) {
            let fms = ul.config["image_data"].frames.length > 1;
            if (wheel_event.ctrlKey || wheel_event.shiftKey || wheel_event.metaKey) {
                // Prevent scroll-zoom
                wheel_event.preventDefault();

                // Don't rezoom if id dialog is visible
                if (ul.subtasks[ul.state["current_subtask"]]["state"]["idd_visible"] && !ul.subtasks[ul.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                    return;
                }
    
                // Get direction of wheel
                const dlta = Math.sign(wheel_event.deltaY);

                // Apply new zoom
                ul.state["zoom_val"] *= (1 - dlta/10);
                ul.rezoom(wheel_event.clientX, wheel_event.clientY);
            }
            else if (fms) {
                wheel_event.preventDefault();

                // Get direction of wheel
                const dlta = Math.sign(wheel_event.deltaY);
                ul.update_frame(dlta);
            }
            else {
                // Don't scroll if id dialog is visible
                if (ul.subtasks[ul.state["current_subtask"]]["state"]["idd_visible"] && !ul.subtasks[ul.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                    wheel_event.preventDefault();
                    return;
                }
            }
        };
        
        // TODO better understand which browsers support this (new Chrome does)
        new ResizeObserver(function() {
            ul.reposition_dialogs();
        }).observe(document.getElementById(ul.config["imwrap_id"]));
        new ResizeObserver(function() {
            ul.handle_toolbox_overflow();
        }).observe(document.getElementById(ul.config["container_id"]));

        // Buttons to change annotation mode
        $(document).on("click", "a.md-btn", (e) => {
            let tgt_jq = $(e.currentTarget);
            let crst = ul.state["current_subtask"];
            if (tgt_jq.hasClass("sel") || ul.subtasks[crst]["state"]["is_in_progress"]) return;
            var new_mode = tgt_jq.attr("id").split("--")[1];
            ul.subtasks[crst]["state"]["annotation_mode"] = new_mode;
            $("a.md-btn.sel").attr("href", "#");
            $("a.md-btn.sel").removeClass("sel");
            tgt_jq.addClass("sel");
            tgt_jq.removeAttr("href");
            ul.show_annotation_mode(tgt_jq);
        });

        $(document).on("click", "#" + ul.config["toolbox_id"] + " .zbutt", (e) => {
            let tgt_jq = $(e.currentTarget);
            if (tgt_jq.hasClass("zin")) {
                ul.state["zoom_val"] *= 1.1;
            }
            else if (tgt_jq.hasClass("zout")) {
                ul.state["zoom_val"] /= 1.1;
            }
            ul.rezoom();
        });
        $(document).on("click", "#" + ul.config["toolbox_id"] + " .pbutt", (e) => {
            let tgt_jq = $(e.currentTarget);
            let annbox = $("#" + ul.config["annbox_id"]);
            if (tgt_jq.hasClass("up")) {
                annbox.scrollTop(annbox.scrollTop() - 20);
            }
            else if (tgt_jq.hasClass("down")) {
                annbox.scrollTop(annbox.scrollTop() + 20);
            }
            else if (tgt_jq.hasClass("left")) {
                annbox.scrollLeft(annbox.scrollLeft() - 20);
            }
            else if (tgt_jq.hasClass("right")) {
                annbox.scrollLeft(annbox.scrollLeft() + 20);
            }
        });
        $(document).on("click", "#" + ul.config["toolbox_id"] + " .wbutt", (e) => {
            let tgt_jq = $(e.currentTarget);
            if (tgt_jq.hasClass("win")) {
                ul.state["line_size"] *= 1.1;
            }
            else if (tgt_jq.hasClass("wout")) {
                ul.state["line_size"] /= 1.1;
            }
            ul.redraw_demo();
        });
        $(document).on("click", "#" + ul.config["toolbox_id"] + " .setting a", (e) => {
            let tgt_jq = $(e.currentTarget);
            if (!e.currentTarget.hasAttribute("href")) return;
            if (tgt_jq.hasClass("fixed-setting")){
                $("#" + ul.config["toolbox_id"] + " .setting a.fixed-setting").removeAttr("href");
                $("#" + ul.config["toolbox_id"] + " .setting a.dyn-setting").attr("href", "#");
                ul.state["line_size"] = ul.state["line_size"]*ul.state["zoom_val"];
                ul.state["size_mode"] = "fixed";
            }
            else if (tgt_jq.hasClass("dyn-setting")) {
                $("#" + ul.config["toolbox_id"] + " .setting a.dyn-setting").removeAttr("href");
                $("#" + ul.config["toolbox_id"] + " .setting a.fixed-setting").attr("href", "#");
                ul.state["line_size"] = ul.get_line_size();
                ul.state["size_mode"] = "dynamic";
            }
            ul.redraw_demo();
        });

        // Listener for soft id toolbox buttons
        $(document).on("click", "#" + ul.config["toolbox_id"] + ' a.tbid-opt', (e) => {
            let tgt_jq = $(e.currentTarget);
            let pfx = "div#tb-id-app--" + ul.state["current_subtask"];
            let crst = ul.state["current_subtask"];
            if (tgt_jq.attr("href") == "#") {
                $(pfx + " a.tbid-opt.sel").attr("href", "#");
                $(pfx + " a.tbid-opt.sel").removeClass("sel");
                tgt_jq.addClass("sel");
                tgt_jq.removeAttr("href");
                let idarr = tgt_jq.attr("id").split("_");
                let rawid = parseInt(idarr[idarr.length - 1]);
                ul.set_id_dialog_payload_nopin(ul.subtasks[crst]["class_ids"].indexOf(rawid), 1.0);
                ul.update_id_dialog_display();
            }
        });

        $(document).on("click", "a.tb-st-switch[href]", (e) => {
            let switch_to = $(e.target).attr("id").split("--")[1];

            // Ignore if in the middle of annotation
            if (ul.subtasks[ul.state["current_subtask"]]["state"]["is_in_progress"]) {
                return;
            }

            ul.set_subtask(switch_to);
        });

        $(document).on("input", "input.frame_input", () => {
            ul.update_frame();
        });


        $(document).on("input", "span.tb-st-range input", () => {
            ul.readjust_subtask_opacities();
        });

        $(document).on("click", "div.fad_row.add a.add-glob-button", () => {
            ul.create_nonspatial_annotation();
        });
        $(document).on("focus", "textarea.nonspatial_note", () => {
            $("div.frame_annotation_dialog.active").addClass("permopen");
        });
        $(document).on("focusout", "textarea.nonspatial_note", () => {
            $("div.frame_annotation_dialog.permopen").removeClass("permopen");
        });
        $(document).on("input", "textarea.nonspatial_note", (e) => {
            // Update annotation's text field
            ul.subtasks[ul.state["current_subtask"]]["annotations"]["access"][e.target.id.substring("note__".length)]["text_payload"] = e.target.value;
        });
        $(document).on("click", "a.fad_button.delete", (e) => {
            ul.delete_annotation(e.target.id.substring("delete__".length));
        });
        $(document).on("click", "a.fad_button.reclf", (e) => {
            // Show idd
            ul.show_id_dialog(e.pageX, e.pageY, e.target.id.substring("reclf__".length), false, true);
        });
        $(document).on("mouseenter", "div.fad_annotation_rows div.fad_row", (e) => {
            // Show thumbnail for idd
            ul.suggest_edits(null, $(e.currentTarget).attr("id").substring("row__".length));
        });
        $(document).on("mouseleave", "div.fad_annotation_rows div.fad_row", () => {
            // Show thumbnail for idd
            if (ul.subtasks[ul.state["current_subtask"]]["state"]["idd_visible"] && !ul.subtasks[ul.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                return;
            }
            ul.suggest_edits(null);
        });

        // Listener for id_dialog click interactions
        $(document).on("click", "#" + ul.config["container_id"] + " a.id-dialog-clickable-indicator", (e) => {
            let crst = ul.state["current_subtask"];
            if (!ul.subtasks[crst]["state"]["idd_thumbnail"]) {
                ul.handle_id_dialog_click(e);
            }
            else {
                // It's always covered up as a thumbnail. See below
            }
        });
        $(document).on("click", ".global_edit_suggestion a.reid_suggestion", (e) => {
            let crst = ul.state["current_subtask"];
            let annid = ul.subtasks[crst]["state"]["idd_associated_annotation"];
            ul.hide_global_edit_suggestion();
            ul.show_id_dialog(
                ul.get_global_mouse_x(e),
                ul.get_global_mouse_y(e),
                annid,
                false
            );
        });

        $(document).on("click", "#" + ul.config["annbox_id"] + " .delete_suggestion", () => {
            let crst = ul.state["current_subtask"];
            ul.delete_annotation(ul.subtasks[crst]["state"]["move_candidate"]["annid"]);
        })

        // Button to save annotations
        $(document).on("click", `a#submit-button[href="#"]`, async () => {
            var submit_payload = {
                "task_meta": ul.config["task_meta"],
                "annotations": {}
            };
            for (const stkey in ul.subtasks) {
                submit_payload["annotations"][stkey] = [];
                for (var i = 0; i < ul.subtasks[stkey]["annotations"]["ordering"].length; i++) {
                    submit_payload["annotations"][stkey].push(
                        ul.subtasks[stkey]["annotations"]["access"][
                            ul.subtasks[stkey]["annotations"]["ordering"][i]
                        ]
                    );
                }
            }
            ul.set_saved(false, true);
            try {
                const save_success = await ul.config["done_callback"].bind(ul)(submit_payload);
                ul.set_saved(!(save_success === false));
            }
            catch (err) {
                console.log("Error waiting for submit script.")
                console.log(err);
                ul.set_saved(false);
            }
        });

        $(document).on("click", "#" + ul.config["toolbox_id"] + " a.night-button", function() {
            if ($("#" + ul.config["container_id"]).hasClass("ulabel-night")) {
                $("#" + ul.config["container_id"]).removeClass("ulabel-night");
                // Destroy any night cookie
                ULabel.destroy_night_mode_cookie();
            }
            else {
                $("#" + ul.config["container_id"]).addClass("ulabel-night");
                // Drop a night cookie
                ULabel.set_night_mode_cookie();
            }
        })

        // Keyboard only events
        document.addEventListener("keydown", (keypress_event) => {
            const shift = keypress_event.shiftKey;
            const ctrl = keypress_event.ctrlKey || keypress_event.metaKey;
            let fms = ul.config["image_data"].frames.length > 1;
            let annbox = $("#"+ul.config["annbox_id"]);
            if (ctrl &&
                (
                    keypress_event.key == "z" || 
                    keypress_event.key == "Z" ||
                    keypress_event.code == "KeyZ"
                )
            ) {
                keypress_event.preventDefault();
                if (shift) {
                    ul.redo();
                }
                else {
                    ul.undo();
                }
                return false;
            }
            else if (ctrl && 
                (
                    keypress_event.key == "s" ||
                    keypress_event.key == "S" ||
                    keypress_event.code == "KeyS"
                )
            ) {
                keypress_event.preventDefault();
                $("a#submit-button").trigger("click");
            }
            else if (keypress_event.key == "l") {
                // console.log("Listing annotations using the \"l\" key has been deprecated.");
                // console.log(ul.annotations);
            }
            else if (keypress_event.key == "ArrowRight") {
                if (fms) {
                    ul.update_frame(1);
                }
                else {
                    annbox.scrollLeft(annbox.scrollLeft() + 20);
                }
            }
            else if (keypress_event.key == "ArrowDown") {
                if (fms) {
                    ul.update_frame(1);
                }
                else {
                    annbox.scrollTop(annbox.scrollTop() + 20);
                }
            }
            else if (keypress_event.key == "ArrowLeft") {
                if (fms) {
                    ul.update_frame(-1);
                }
                else {
                    annbox.scrollLeft(annbox.scrollLeft() - 20);
                }
            }
            else if (keypress_event.key == "ArrowUp") {
                if (fms) {
                    ul.update_frame(-1);
                }
                else {
                    annbox.scrollTop(annbox.scrollTop() - 20);
                }
            }
            else {
                // console.log(keypress_event);
            }
        });

        window.addEventListener("beforeunload", function (e) {
            var confirmationMessage = '';
            if (ul.state["edited"]) {
                confirmationMessage = 'You have made unsave changes. Are you sure you would like to leave?';
                (e || window.event).returnValue = confirmationMessage; //Gecko + IE
                return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
            }
        });
    }


    static process_allowed_modes(ul, subtask_key, subtask) {
        // TODO(v1) check to make sure these are known modes
        ul.subtasks[subtask_key]["allowed_modes"] = subtask["allowed_modes"];
    }


    static process_classes(ul, subtask_key, subtask) {
        // Check to make sure allowed classes were provided
        if (!("classes" in subtask)) {
            throw new Error(`classes not specified for subtask "${subtask_key}"`);
        }
        if (typeof subtask["classes"] != 'object' || subtask["classes"].length == undefined || subtask["classes"].length == 0) {
            throw new Error(`classes has an invalid value for subtask "${subtask_key}"`);
        }

        // Set to single class mode if applicable
        ul.subtasks[subtask_key]["single_class_mode"] = (subtask["classes"].length == 1);

        // Populate allowed classes vars
        // TODO might be nice to recognize duplicate classes and assign same color... idk
        // TODO better handling of default class ids would definitely be a good idea
        ul.subtasks[subtask_key]["class_defs"] = [];
        ul.subtasks[subtask_key]["class_ids"] = [];
        for (let i = 0; i < subtask["classes"].length; i++) {
            if (typeof subtask["classes"][i] == "string") {
                let name = subtask["classes"][i];
                ul.subtasks[subtask_key]["class_defs"].push({
                    "name": name,
                    "color": COLORS[ul.tot_num_classes],
                    "id": ul.tot_num_classes
                });
                ul.subtasks[subtask_key]["class_ids"].push(ul.tot_num_classes);
            }
            else if (typeof subtask["classes"][i] == 'object') {
                // Start with default object
                let repl = {
                    "name": `Class ${ul.tot_num_classes}`,
                    "color": COLORS[ul.tot_num_classes],
                    "id": ul.tot_num_classes
                };

                // Populate with what we have
                if ("name" in subtask["classes"][i]) {
                    repl["name"] = subtask["classes"][i]["name"];
                }
                if ("color" in subtask["classes"][i]) {
                    repl["color"] = subtask["classes"][i]["color"];
                }
                if ("id" in subtask["classes"][i]) {
                    repl["id"] = subtask["classes"][i]["id"];
                }

                // Push finished product to list
                ul.subtasks[subtask_key]["class_defs"].push(repl);
                ul.subtasks[subtask_key]["class_ids"].push(repl["id"]);
            }
            else {
                throw new Error(`Entry in classes not understood: ${subtask["classes"][i]}`);
            }
            ul.tot_num_classes++;
        }
    }


    static process_resume_from(ul, subtask_key, subtask) {
        // Initialize to no annotations
        ul.subtasks[subtask_key]["annotations"] = {
            "ordering": [],
            "access": {}
        };
        if (subtask["resume_from"] != null) {
            for (var i = 0; i < subtask["resume_from"].length; i++) {
                // Push to ordering and add to access
                ul.subtasks[subtask_key]["annotations"]["ordering"].push(subtask["resume_from"][i]["id"]);
                ul.subtasks[subtask_key]["annotations"]["access"][subtask["resume_from"][i]["id"]] = subtask["resume_from"][i];

                // Set new to false
                ul.subtasks[subtask_key]["annotations"]["access"][subtask["resume_from"][i]["id"]]["new"] = false;

                // Test for line_size
                if (ul.subtasks[subtask_key]["annotations"]["access"][subtask["resume_from"][i]["id"]]["line_size"] == null) {
                    ul.subtasks[subtask_key]["annotations"]["access"][subtask["resume_from"][i]["id"]]["line_size"] = ul.state["line_size"];
                }

                // Ensure that spatial type is allowed
                // TODO do I really want to do this?

                // Ensure that classification payloads are compatible with config
                // TODO

                // Same for regression payloads
                // TODO
            }
        }
    }

    static initialize_subtasks(ul, stcs) {
        let first_non_ro = null;
        for (const subtask_key in stcs) {
            // For convenience, make a raw subtask var
            let raw_subtask = stcs[subtask_key];

            // Initialize subtask config to null
            ul.subtasks[subtask_key] = {
                "display_name": raw_subtask["display_name"] || subtask_key,
                "read_only": ("read_only" in raw_subtask) && (raw_subtask["read_only"] === true),
                "inactive_opacity": 0.4
            };

            if ("inactive_opacity" in raw_subtask && typeof raw_subtask["inactive_opacity"] == "number") {
                ul.subtasks[subtask_key]["inactive_opacity"] = Math.min(Math.max(raw_subtask["inactive_opacity"], 0.0), 1.0);
            }

            if (first_non_ro == null && !ul.subtasks[subtask_key]["read_only"]) {
                first_non_ro = subtask_key;
            }

            //  Initialize an empty action stream for each subtask
            ul.subtasks[subtask_key]["actions"] = {
                "stream": [],
                "undone_stack": []
            };

            // Process allowed_modes
            // They are placed in ul.subtasks[subtask_key]["allowed_modes"]
            ULabel.process_allowed_modes(ul, subtask_key, raw_subtask);
            // Process allowed classes
            // They are placed in ul.subtasks[subtask_key]["class_defs"]
            ULabel.process_classes(ul, subtask_key, raw_subtask);
            // Process imported annoations
            // They are placed in ul.subtasks[subtask_key]["annotations"]
            ULabel.process_resume_from(ul, subtask_key, raw_subtask);
            
            // Label canvasses and initialize context with null
            ul.subtasks[subtask_key]["canvas_fid"] = ul.config["canvas_fid_pfx"] + "__" + subtask_key;
            ul.subtasks[subtask_key]["canvas_bid"] = ul.config["canvas_bid_pfx"] + "__" + subtask_key;

            // Store state of ID dialog element
            // TODO much more here when full interaction is built
            let id_payload = [];
            for (var i = 0; i < ul.subtasks[subtask_key]["class_ids"].length; i++) {
                id_payload.push(1/ul.subtasks[subtask_key]["class_ids"].length);
            }
            ul.subtasks[subtask_key]["state"] = {
                // Id dialog state
                "idd_id": "id_dialog__" + subtask_key,
                "idd_id_front": "id_dialog_front__" + subtask_key,
                "idd_visible": false,
                "idd_associated_annotation": null,
                "idd_thumbnail": false,
                "id_payload": id_payload,
                "first_explicit_assignment": false,

                // Annotation state
                "annotation_mode": ul.subtasks[subtask_key]["allowed_modes"][0],
                "active_id": null,
                "is_in_progress": false,
                "is_in_edit": false,
                "is_in_move": false,
                "edit_candidate": null,
                "move_candidate": null,

                // Rendering context
                "front_context": null,
                "back_context": null,

                // Generic dialogs
                "visible_dialogs": {}
            };
        }
        if (first_non_ro == null) {
            ul.raise_error("You must have at least one subtask without 'read_only' set to true.", ULabel.elvl_fatal);
        }
    }

    static expand_image_data(ul, raw_img_dat) {
        if (typeof raw_img_dat == "string") {
            return {
                spacing: {
                    x: 1,
                    y: 1,
                    z: 1,
                    units: "pixels"
                },
                frames: [
                    raw_img_dat
                ]
            }
        }
        else if (Array.isArray(raw_img_dat)) {
            return {
                spacing: {
                    x: 1,
                    y: 1,
                    z: 1,
                    units: "pixels"
                },
                frames: raw_img_dat
            }
        }
        else if ("spacing" in raw_img_dat && "frames" in raw_img_dat) {
            return raw_img_dat;
        }
        else {
            ul.raise_error(`Image data object not understood. Must be of form "http://url.to/img" OR ["img1", "img2", ...] OR {spacing: {x: <num>, y: <num>, z: <num>, units: <str>}, frames: ["img1", "img2", ...]}. Provided: ${JSON.stringify(raw_img_dat)}`, ULabel.elvl_fatal);
            return null;
        }
    }

    static load_image_promise(img_el) {
        return new Promise((resolve, reject) => {
            try {
                img_el.onload = () => {
                    resolve(img_el);
                };
            }
            catch (err) {
                reject(err);
            }
        });
    }

    // ================= Construction/Initialization =================
        
    constructor(
        container_id, 
        image_data, 
        username, 
        on_submit,
        subtasks,
        task_meta=null,
        annotation_meta=null,
        px_per_px=1,
        initial_crop=null,
        initial_line_size=4,
        instructions_url=null
    ) {
        // Unroll safe default arguments
        if (task_meta == null) {task_meta = {};}
        if (annotation_meta == null) {annotation_meta = {};}

        // Unroll submit button
        let on_submit_unrolled;
        if (typeof on_submit == "function") {
            on_submit_unrolled = {
                name: "Submit",
                hook: on_submit
            };
        }
        else {
            on_submit_unrolled = on_submit;
        }

        // If on_submit hook is not async, wrap it in an async func
        let fin_on_submit_hook;
        if (on_submit_unrolled.hook.constructor.name == "AsyncFunction") {
            fin_on_submit_hook = on_submit_unrolled.hook;
        }
        else {
            fin_on_submit_hook = async function(annotations) {
                return on_submit_unrolled.hook(annotations);
            };
        }

        // TODO 
        // Allow for importing spacing data -- a measure tool would be nice too
        // Much of this is hardcoded defaults, 
        //   some might be offloaded to the constructor eventually...
        this.config = {
            // Values useful for generating HTML for tool
            // TODO(v1) Make sure these don't conflict with other page elements
            "container_id": container_id,
            "annbox_id": "annbox",
            "imwrap_id": "imwrap",
            "canvas_fid_pfx": "front-canvas",
            "canvas_bid_pfx": "back-canvas",
            "canvas_did": "demo-canvas",
            "canvas_class": "easel",
            "image_id_pfx": "ann_image",
            "imgsz_class": "imgsz",
            "toolbox_id": "toolbox",
            "px_per_px": px_per_px,
            "initial_crop": initial_crop,

            // Configuration for the annotation task itself
            "image_data": ULabel.expand_image_data(this, image_data),
            "annotator": username,
            "allow_soft_id": false, // TODO allow soft eventually
            "default_annotation_color": "#fa9d2a",

            // Dimensions of various components of the tool
            "image_width": null,
            "image_height": null,
            "demo_width": 120,
            "demo_height": 40,
            "polygon_ender_size": 30,
            "edit_handle_size": 30,

            // Behavior on special interactions
            "done_callback": fin_on_submit_hook,
            "done_button": on_submit_unrolled.name,
            "instructions_url": instructions_url,

            // ID Dialog config
            "cl_opacity": 0.4,
            "outer_diameter": 200,
            "inner_prop": 0.3,

            // Passthrough
            "task_meta": task_meta,
            "annotation_meta": annotation_meta
        };

        // Useful for the efficient redraw of nonspatial annotations
        this.tmp_nonspatial_element_ids = {};

        // Create object for current ulabel state
        this.state = {
            // Viewer state
            // Add and handle a value for current image
            "zoom_val": 1.0,
            "last_move": null,
            "current_frame": 0,

            // Global annotation state (subtasks also maintain an annotation state)
            "current_subtask": null,
            "line_size": initial_line_size,
            "size_mode": "fixed",

            // Renderings state
            "demo_canvas_context": null,
            "edited": false
        };

        // Populate these in an external "static" function
        this.subtasks = {};
        this.tot_num_classes = 0;
        ULabel.initialize_subtasks(this, subtasks);

        // Create object for dragging interaction state
        // TODO(v1)
        // There can only be one drag, yes? Maybe pare this down...
        // Would be nice to consolidate this with global state also
        this.drag_state = {
            "active_key": null,
            "release_button": null,
            "annotation": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "edit": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "pan": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "zoom": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "move": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "right": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            }
        };

        for (const st in this.subtasks) {
            for (let i = 0; i < this.subtasks[st]["annotations"]["ordering"].length; i++) {
                let aid = this.subtasks[st]["annotations"]["ordering"][i];
                let amd = this.subtasks[st]["annotations"]["access"][aid]["spatial_type"];
                if (!NONSPATIAL_MODES.includes(amd)) {
                    this.rebuild_containing_box(this.subtasks[st]["annotations"]["ordering"][i], false, st);
                }
            }
        }
                
        // Indicate that object must be "init" before use!
        this.is_init = false;
    }

    init(callback) {
        // Add stylesheet
        ULabel.add_style_to_document(this);

        var that = this;
        that.state["current_subtask"] = Object.keys(that.subtasks)[0];

        // Place image element
        ULabel.prep_window_html(this);

        // Detect night cookie
        if (ULabel.has_night_mode_cookie()) {
            $("#" + this.config["container_id"]).addClass("ulabel-night");
        }
        
        var images = [document.getElementById(`${this.config["image_id_pfx"]}__0`)];
        let mappable_images = [];
        for (let i = 0; i < images.length; i++) {
            mappable_images.push(images[i]);
            break;
        }
        let image_promises = mappable_images.map(ULabel.load_image_promise);
        Promise.all(image_promises).then((loaded_imgs) => {
            // Store image dimensions
            that.config["image_height"] = loaded_imgs[0].naturalHeight;
            that.config["image_width"] = loaded_imgs[0].naturalWidth;
    
            // Add canvasses for each subtask and get their rendering contexts
            for (const st in that.subtasks) {
                $("#" + that.config["imwrap_id"]).append(`
                <div id="canvasses__${st}" class="canvasses">
                    <canvas 
                        id="${that.subtasks[st]["canvas_bid"]}" 
                        class="${that.config["canvas_class"]} ${that.config["imgsz_class"]} canvas_cls" 
                        height=${that.config["image_height"]*this.config["px_per_px"]} 
                        width=${that.config["image_width"]*this.config["px_per_px"]}></canvas>
                    <canvas 
                        id="${that.subtasks[st]["canvas_fid"]}" 
                        class="${that.config["canvas_class"]} ${that.config["imgsz_class"]} canvas_cls" 
                        height=${that.config["image_height"]*this.config["px_per_px"]} 
                        width=${that.config["image_width"]*this.config["px_per_px"]} 
                        oncontextmenu="return false"></canvas>
                    <div id="dialogs__${st}" class="dialogs_container"></div>
                </div>
                `);
                $("#" + that.config["container_id"] + ` div#fad_st__${st}`).append(`
                    <div id="front_dialogs__${st}" class="front_dialogs"></div>
                `);
        
                // Get canvas contexts
                that.subtasks[st]["state"]["back_context"] = document.getElementById(
                    that.subtasks[st]["canvas_bid"]
                ).getContext("2d");
                that.subtasks[st]["state"]["front_context"] = document.getElementById(
                    that.subtasks[st]["canvas_fid"]
                ).getContext("2d");
            }
            // Get rendering context for demo canvas
            that.state["demo_canvas_context"] = document.getElementById(
                that.config["canvas_did"]
            ).getContext("2d");

            // Add the ID dialogs' HTML to the document
            ULabel.build_id_dialogs(that);
            
            // Add the HTML for the edit suggestion to the window
            ULabel.build_edit_suggestion(that);
            
            // Create listers to manipulate and export this object
            ULabel.create_listeners(that);

            that.handle_toolbox_overflow();
            
            // Set the canvas elements in the correct stacking order given current subtask
            that.set_subtask(that.state["current_subtask"]);

            // Indicate that the object is now init!
            that.is_init = true;
            $(`div#${this.config["container_id"]}`).css("display", "block");
    
            this.show_initial_crop();
            this.update_frame();

            // Draw demo annotation
            that.redraw_demo();

            // Draw resumed from annotations
            that.redraw_all_annotations();

            // Call the user-provided callback
            callback();
        }).catch((err) => {
            console.log(err);
            this.raise_error("Unable to load images: " + JSON.stringify(err), ULabel.elvl_fatal);
        });
    }

    version() {
        return ULabel.version();
    }

    handle_toolbox_overflow() {
        let tabs_height = $("#"+this.config["container_id"] + " div.toolbox-tabs").height();
        $("#"+this.config["container_id"] + " div.toolbox_inner_cls").css("height", `calc(100% - ${tabs_height+38}px)`);
        let view_height = $("#"+this.config["container_id"] + " div.toolbox_cls")[0].scrollHeight - 38 - tabs_height;
        let want_height = $("#"+this.config["container_id"] + " div.toolbox_inner_cls")[0].scrollHeight;
        if (want_height <= view_height) {
            $("#"+this.config["container_id"] + " div.toolbox_inner_cls").css("overflow-y", "hidden");
        }
        else {
            $("#"+this.config["container_id"] + " div.toolbox_inner_cls").css("overflow-y", "scroll");
        }
    }

    // A ratio of viewport height to image height
	get_viewport_height_ratio(hgt) {
		return $("#" + this.config["annbox_id"]).height()/hgt;
	}

	// A ratio of viewport width to image width
	get_viewport_width_ratio(wdt) {
		return $("#" + this.config["annbox_id"]).width()/wdt;
	}

	// The zoom ratio which fixes the entire image exactly in the viewport
	show_initial_crop() {
        let wdt = this.config["image_width"];
        let hgt = this.config["image_height"];
        let lft_cntr = 0;
        let top_cntr = 0;
        let initcrp = this.config["initial_crop"];
        if (initcrp != null) {
            if (
                "width" in initcrp && 
                "height" in initcrp &&
                "left" in initcrp &&
                "top" in initcrp
            ) {
                wdt = initcrp["width"];
                hgt = initcrp["height"];
                lft_cntr = initcrp["left"] + initcrp["width"]/2;
                top_cntr = initcrp["top"] + initcrp["height"]/2;
            }
            else {
                this.raise_error(`Initial crop must contain properties "width", "height", "left", and "top". Ignoring.`, ULabel.elvl_info);
            }
        }
        this.state["zoom_val"] = Math.min(this.get_viewport_height_ratio(hgt), this.get_viewport_width_ratio(wdt));
        this.rezoom(lft_cntr, top_cntr, true);
        return;
	}

    // ================== Cursor Helpers ====================
    update_cursor() {
        let color = this.get_annotation_color(null, true);
        let thr_width = this.get_line_size()*this.state["zoom_val"]
        let width = Math.max(Math.min(thr_width, 64), 6);
        let cursor_svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${width}px" height="${width}px" viewBox="0 0 ${width} ${width}">
            <circle cx="${width/2}" cy="${width/2}" r="${width/2}" opacity="0.8" stroke="white" fill="${color}" />
        </svg>`;

        let bk_width = Math.max(Math.min(thr_width, 32), 6);
        let bk_cursor_svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${bk_width}px" height="${bk_width}px" viewBox="0 0 ${bk_width} ${bk_width}">
            <circle cx="${bk_width/2}" cy="${bk_width/2}" r="${bk_width/2}" opacity="0.8" stroke="${color}" fill="${color}" />
        </svg>`;
        
        let cursor_b64 = btoa(cursor_svg);
        let bk_cursor_b64 = btoa(bk_cursor_svg);
        $("#"+this.config["annbox_id"]).css(
            "cursor",
            `url(data:image/svg+xml;base64,${cursor_b64}) ${width/2} ${width/2}, url(data:image/svg+xml;base64,${bk_cursor_b64}) ${bk_width/2} ${bk_width/2}, auto`
        );
    }

    // ================== Subtask Helpers ===================

    readjust_subtask_opacities() {
        for (const st_key in this.subtasks) {
            let sliderval = $("#tb-st-range--" + st_key).val();
            $("div#canvasses__" + st_key).css("opacity", sliderval/100);
        }
    }

    set_subtask(st_key) {
        let old_st = this.state["current_subtask"];

        // Change object state
        this.state["current_subtask"] = st_key;

        // Bring new set of canvasses out to front
        $("div.canvasses").css("z-index", 75);
        $("div#canvasses__" + this.state["current_subtask"]).css("z-index", 100);

        // Show appropriate set of dialogs
        $("div.dialogs_container").css("display", "none");
        $("div#dialogs__" + this.state["current_subtask"]).css("display", "block");

        // Show appropriate set of annotation modes
        $("a.md-btn").css("display", "none");
        $("a.md-btn.md-en4--" + st_key).css("display", "inline-block");

        // Show appropriate set of class options
        $("div.tb-id-app").css("display", "none");
        $("div#tb-id-app--" + this.state["current_subtask"]).css("display", "block");

        // Adjust tab buttons in toolbox
        $("a#tb-st-switch--" + old_st).attr("href", "#");
        $("a#tb-st-switch--" + old_st).parent().removeClass("sel");
        $("input#tb-st-range--" + old_st).val(Math.round(100*this.subtasks[old_st]["inactive_opacity"]));
        $("a#tb-st-switch--" + st_key).removeAttr("href");
        $("a#tb-st-switch--" + st_key).parent().addClass("sel");
        $("input#tb-st-range--" + st_key).val(100);

        // Update toolbox opts
        this.update_annotation_mode();
        this.update_current_class();

        // Set transparancy for inactive layers
        this.readjust_subtask_opacities();

        // Redraw demo
        this.redraw_demo();
    }

    // ================= Toolbox Functions ==================

    update_annotation_mode() {
        $("a.md-btn.sel").attr("href", "#");
        $("a.md-btn.sel").removeClass("sel");
        $("a#md-btn--" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).addClass("sel");
        $("a#md-btn--" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).removeAttr("href");
        this.show_annotation_mode();
    }

    update_current_class() {
        this.update_id_toolbox_display();
        // $("a.tbid-opt.sel").attr("href", "#");
        // $("a.tbid-opt.sel").removeClass("sel");
        // $("a#toolbox_sel_" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).addClass("sel");
        // $("a#toolbox_sel_" + this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"]).removeAttr("href");
    }

    // Show annotation mode
    show_annotation_mode(el=null) {
        if (el == null) {
            el = $("a.md-btn.sel");
        }
        let new_name = el.attr("amdname");
        $("#" + this.config["toolbox_id"] + " .current_mode").html(new_name);
        $(`div.frame_annotation_dialog:not(.fad_st__${this.state["current_subtask"]})`).removeClass("active");
        if (["whole-image", "global"].includes(this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"])) {
            $(`div.frame_annotation_dialog.fad_st__${this.state["current_subtask"]}`).addClass("active");
        }
        else {
            $("div.frame_annotation_dialog").removeClass("active");
        }
    }

    // Draw demo annotation in demo canvas
    redraw_demo() {
        this.state["demo_canvas_context"].clearRect(0, 0, this.config["demo_width"]*this.config["px_per_px"], this.config["demo_height"]*this.config["px_per_px"]);
        this.draw_annotation(DEMO_ANNOTATION, "demo_canvas_context", true, null, "demo");
        this.update_cursor();
    }


    // ================= Instance Utilities =================

    // A robust measure of zoom
    get_empirical_scale() {
        // Simple ratio of canvas width to image x-dimension
        return $("#" + this.config["imwrap_id"]).width()/this.config["image_width"];
    }

    // Get a unique ID for new annotations
    make_new_annotation_id() {
        var unq_str = uuidv4();
        return unq_str;
    }

    // Get the start of a spatial payload based on mouse event and current annotation mode
    get_init_spatial(gmx, gmy, annotation_mode) {
        switch (annotation_mode) {
            case "point":
                return [
                    [gmx, gmy]
                ];
            case "bbox":
            case "polygon":
            case "polyline":
            case "contour":
            case "tbar":
                return [
                    [gmx, gmy],
                    [gmx, gmy]
                ];
            case "bbox3":
                return [
                    [gmx, gmy, this.state["current_frame"]],
                    [gmx, gmy, this.state["current_frame"]]
                ];
            default:
                // TODO broader refactor of error handling and detecting/preventing corruption
                this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                return null;
        }
    }

    get_init_id_payload() {
        this.set_id_dialog_payload_to_init(null);
        return JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]));
    }

    // ================= Access string utilities =================

    // Access a point in a spatial payload using access string
    // Optional arg at the end is for finding position of a moved splice point through its original access string
    get_with_access_string(annid, access_str, as_though_pre_splice=false) {
        // TODO(3d)
        let bbi, bbj, bbk, bbox_pts, ret, bas, dif, tbi, tbj, tbar_pts;
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"]) {
            case "bbox":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                bbox_pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"];
                return [bbox_pts[bbi][0], bbox_pts[bbj][1]];
            case "point":
                return JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"]));
            case "bbox3":
                // TODO(3d)
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                bbox_pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"];
                ret = [bbox_pts[bbi][0], bbox_pts[bbj][1]];
                if (access_str.length > 2) {
                    bbk = parseInt(access_str[2], 10);
                    ret.push(bbox_pts[bbk][2]);
                }
                return ret;
            case "polygon":
            case "polyline":
                bas = parseInt(access_str, 10);
                dif = parseFloat(access_str) - bas;
                if (dif < 0.005) {
                    return this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bas];
                }
                else {
                    if (as_though_pre_splice) {
                        dif = 0;
                        bas += 1;
                        return this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bas];
                    }
                    else {
                        return ULabel.interpolate_poly_segment(
                            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"], 
                            bas, dif
                        );
                    }
                }
            case "tbar":
                // TODO 3 point method
                tbi = parseInt(access_str[0], 10);
                tbj = parseInt(access_str[1], 10);
                tbar_pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"];
                return [tbar_pts[tbi][0], tbar_pts[tbj][1]];
            default:
                this.raise_error(
                    "Unable to apply access string to annotation of type " + this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"],
                    ULabel.elvl_standard
                );
        }
    }
    
    // Set a point in a spatial payload using access string
    set_with_access_string(annid, access_str, val, undoing=null) {
        // Ensure the values are ints
        // val[0] = Math.round(val[0]);
        // val[1] = Math.round(val[1]);
        // TODO(3d)
        let bbi, bbj, bbk;
        const styp = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"];
        switch (styp) {
            case "bbox":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbj][1] = val[1];
                break;
            case "point":
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                break;
            case "bbox3":
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbj][1] = val[1];
                if (access_str.length > 2 && val.length > 2) {
                    bbk = parseInt(access_str[2], 10);
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbk][2] = val[2];
                }
                break;
            case "tbar":
                // TODO 3 points
                bbi = parseInt(access_str[0], 10);
                bbj = parseInt(access_str[1], 10);
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbi][0] = val[0];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][bbj][1] = val[1];
                break;
            case "polygon":
            case "polyline":
                var bas = parseInt(access_str, 10);
                var dif = parseFloat(access_str) - bas;
                if (dif < 0.005) {
                    var acint = parseInt(access_str, 10);
                    var npts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"].length;
                    if ((styp == "polygon") && ((acint == 0) || (acint == (npts - 1)))) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][0] = [val[0], val[1]];
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][npts - 1] = [val[0], val[1]];
                    }
                    else {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"][acint] = val;
                    }
                }
                else {
                    if (undoing === true) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"].splice(bas+1, 1);
                    }
                    else if (undoing === false) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"].splice(bas+1, 0, [val[0], val[1]]);
                    }
                    else {
                        var newpt = ULabel.interpolate_poly_segment(
                            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"], 
                            bas, dif
                        );
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_payload"].splice(bas+1, 0, newpt);
                    }
                }
                break;
            default:
                this.raise_error(
                    "Unable to apply access string to annotation of type " + this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["spatial_type"],
                    ULabel.elvl_standard
                );
        }
    }

    get_annotation_color(clf_payload, demo=false, subtask=null) {
        if (this.config["allow_soft_id"]) {
            // not currently supported;
            return this.config["default_annotation_color"];
        }
        let crst = this.state["current_subtask"];
        if (subtask != null && !demo) {
            crst = subtask;
        }
        let col_payload = JSON.parse(JSON.stringify(this.subtasks[crst]["state"]["id_payload"])); // BOOG
        if (demo) {
            let dist_prop = 1.0;
            let class_ids = this.subtasks[crst]["class_ids"];
            let pfx = "div#tb-id-app--" + this.state["current_subtask"];
            let idarr = $(pfx + " a.tbid-opt.sel").attr("id").split("_");
            let class_ind = class_ids.indexOf(parseInt(idarr[idarr.length - 1]));
            // Recompute and render opaque pie slices
            for (var i = 0; i < class_ids.length; i++) {
                if (i == class_ind) {
                    col_payload[i] = {
                        "class_id": class_ids[i],
                        "confidence": dist_prop
                    };
                }
                else {
                    col_payload[i] = {
                        "class_id": class_ids[i],
                        "confidence": (1 - dist_prop)/(class_ids.length - 1)
                    };
                }
            }
        }
        else {
            if (clf_payload != null) {
                col_payload = clf_payload;
            }
        }

        for (let i = 0; i < col_payload.length; i++) {
            if (col_payload[i]["confidence"] > 0.5) {
                return this.subtasks[crst]["class_defs"][i]["color"];
            }
        }
        return this.config["default_annotation_color"];
    }

    // ================= Drawing Functions =================

    draw_bounding_box(annotation_object, ctx, demo=false, offset=null, subtask=null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
    
        // Prep for bbox drawing
        let color = this.get_annotation_color(annotation_object["classification_payloads"], false, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size*px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const sp = annotation_object["spatial_payload"][0];
        const ep = annotation_object["spatial_payload"][1];
        ctx.beginPath();
        ctx.moveTo((sp[0] + diffX)*px_per_px, (sp[1] + diffY)*px_per_px);
        ctx.lineTo((sp[0] + diffX)*px_per_px, (ep[1] + diffY)*px_per_px);
        ctx.lineTo((ep[0] + diffX)*px_per_px, (ep[1] + diffY)*px_per_px);
        ctx.lineTo((ep[0] + diffX)*px_per_px, (sp[1] + diffY)*px_per_px);
        ctx.lineTo((sp[0] + diffX)*px_per_px, (sp[1] + diffY)*px_per_px);
        ctx.closePath();
        ctx.stroke();
    }

    draw_point(annotation_object, ctx, demo=false, offset=null, subtask=null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
    
        // Prep for bbox drawing
        let color = this.get_annotation_color(annotation_object["classification_payloads"], false, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size*px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const sp = annotation_object["spatial_payload"][0];
        ctx.beginPath();
        ctx.arc((sp[0] + diffX)*px_per_px, (sp[1] + diffY)*px_per_px, line_size*px_per_px*0.75, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.beginPath();
        ctx.arc((sp[0] + diffX)*px_per_px, (sp[1] + diffY)*px_per_px, line_size*px_per_px*3, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
    }

    draw_bbox3(annotation_object, ctx, demo=false, offset=null, subtask=null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        let diffZ = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
            if ("diffZ" in offset) {
                diffZ = offset["diffZ"];
            }
        }

        let curfrm = this.state["current_frame"];
        const sp = annotation_object["spatial_payload"][0];
        const ep = annotation_object["spatial_payload"][1];
        if (curfrm < (Math.min(sp[2], ep[2]) + diffZ) || curfrm > (Math.max(sp[2], ep[2]) + diffZ)) {
            return;
        }
        let fill = false;
        if (curfrm == (Math.min(sp[2], ep[2]) + diffZ) || curfrm == (Math.max(sp[2], ep[2]) + diffZ)) {
            fill = true;
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
    
        // Prep for bbox drawing
        let color = this.get_annotation_color(annotation_object["classification_payloads"], false, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size*px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        ctx.beginPath();
        ctx.moveTo((sp[0] + diffX)*px_per_px, (sp[1] + diffY)*px_per_px);
        ctx.lineTo((sp[0] + diffX)*px_per_px, (ep[1] + diffY)*px_per_px);
        ctx.lineTo((ep[0] + diffX)*px_per_px, (ep[1] + diffY)*px_per_px);
        ctx.lineTo((ep[0] + diffX)*px_per_px, (sp[1] + diffY)*px_per_px);
        ctx.lineTo((sp[0] + diffX)*px_per_px, (sp[1] + diffY)*px_per_px);
        ctx.closePath();
        ctx.stroke();
        if (fill) {
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
    
    draw_polygon(annotation_object, ctx, demo=false, offset=null, subtask=null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }


        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }

        
        // Prep for bbox drawing
        let color = this.get_annotation_color(annotation_object["classification_payloads"], demo, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size*px_per_px;
        ctx.lineCap = "round";
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const pts = annotation_object["spatial_payload"];
        ctx.beginPath();
        ctx.moveTo((pts[0][0] + diffX)*px_per_px, (pts[0][1] + diffY)*px_per_px);
        for (var pti = 1; pti < pts.length; pti++) {
            ctx.lineTo((pts[pti][0] + diffX)*px_per_px, (pts[pti][1] + diffY)*px_per_px);
        }
        ctx.stroke();
    }
    
    draw_contour(annotation_object, ctx, demo=false, offset=null, subtask=null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }

    
        // Prep for bbox drawing
        let color = this.get_annotation_color(annotation_object["classification_payloads"], demo, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size*px_per_px;
        ctx.lineCap = "round";
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const pts = annotation_object["spatial_payload"];
        ctx.beginPath();
        ctx.moveTo((pts[0][0] + diffX)*px_per_px, (pts[0][1] + diffY)*px_per_px);
        for (var pti = 1; pti < pts.length; pti++) {
            ctx.lineTo((pts[pti][0] + diffX)*px_per_px, (pts[pti][1] + diffY)*px_per_px);
        }
        ctx.stroke();
    }

    draw_tbar(annotation_object, ctx, demo=false, offset=null, subtask=null) {
        const px_per_px = this.config["px_per_px"];
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let line_size = null;
        if ("line_size" in annotation_object) {
            line_size = annotation_object["line_size"];
        }
        else {
            line_size = this.get_line_size(demo);
        }
    
        // Prep for tbar drawing
        let color = this.get_annotation_color(annotation_object["classification_payloads"], demo, subtask);
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size*px_per_px;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the tall part of the tbar
        const sp = annotation_object["spatial_payload"][0];
        const ep = annotation_object["spatial_payload"][1];
        ctx.beginPath();
        ctx.moveTo((sp[0] + diffX)*px_per_px, (sp[1] + diffY)*px_per_px);
        ctx.lineTo((ep[0] + diffX)*px_per_px, (ep[1] + diffY)*px_per_px);
        ctx.stroke();

        // Draw the cross of the tbar
        let halflen = Math.sqrt(
            (sp[0] - ep[0])*(sp[0] - ep[0]) + (sp[1] - ep[1])*(sp[1] - ep[1])
        )/2;
        let theta = Math.atan((ep[1] - sp[1])/(ep[0] - sp[0]));
        let sb = [
            sp[0] + halflen*Math.sin(theta),
            sp[1] - halflen*Math.cos(theta)
        ];
        let eb = [
            sp[0] - halflen*Math.sin(theta),
            sp[1] + halflen*Math.cos(theta)
        ];

        ctx.lineCap = "square";
        ctx.beginPath();
        ctx.moveTo((sb[0] + diffX)*px_per_px, (sb[1] + diffY)*px_per_px);
        ctx.lineTo((eb[0] + diffX)*px_per_px, (eb[1] + diffY)*px_per_px);
        ctx.stroke();
        ctx.lineCap = "round";

    }

    register_nonspatial_redraw_start(subtask) {
        // TODO(3d)
        this.tmp_nonspatial_element_ids[subtask] = [];
        let nonsp_window  = $(`div#fad_st__${subtask}`);
        if (nonsp_window.length) {
            $(`div#fad_st__${subtask} div.fad_annotation_rows div.fad_row`).each((idx, val) => {
                this.tmp_nonspatial_element_ids[subtask].push($(val).attr("id"));
            });
        }
    }


    draw_nonspatial_annotation(annotation_object, svg_obj, subtask=null) {
        if (subtask == null) {
            subtask = this.state["current_subtask"];
        }
        let found = false;
        for (let i = 0; i < this.tmp_nonspatial_element_ids[subtask].length; i++) {
            if ("row__"+annotation_object["id"] == this.tmp_nonspatial_element_ids[subtask][i]) {
                this.tmp_nonspatial_element_ids[subtask][i] = null;
                found = true;
            }
        }
        if (!found) {
            $(`div#fad_st__${subtask} div.fad_annotation_rows`).append(`
            <div id="row__${annotation_object["id"]}" class="fad_row">
                <div class="fad_buttons">
                    <div class="fad_inp_container text">
                        <textarea id="note__${annotation_object["id"]}" class="nonspatial_note" placeholder="Notes...">${annotation_object["text_payload"]}</textarea>
                    </div><!--
                    --><div class="fad_inp_container button frst">
                        <a href="#" id="reclf__${annotation_object["id"]}" class="fad_button reclf"></a>
                    </div><!--
                    --><div class="fad_inp_container button">
                        <a href="#" id="delete__${annotation_object["id"]}" class="fad_button delete">&#215;</a>
                    </div>
                </div><!--
                --><div id="icon__${annotation_object["id"]}" class="fad_type_icon invert-this-svg" style="background-color: ${this.get_annotation_color(annotation_object["classification_payloads"], false, subtask)};">
                    ${svg_obj}
                </div>
            </div>
            `);
        }
        else {
            $(`textarea#note__${annotation_object["id"]}`).val(annotation_object["text_payload"]);
            $(`div#icon__${annotation_object["id"]}`).css("background-color", this.get_annotation_color(annotation_object["classification_payloads"], false, subtask));
        }
    }


    draw_whole_image_annotation(annotation_object, subtask=null) {
        this.draw_nonspatial_annotation(annotation_object, WHOLE_IMAGE_SVG, subtask);

    }

    draw_global_annotation(annotation_object, subtask=null) {
        this.draw_nonspatial_annotation(annotation_object, GLOBAL_SVG, subtask);
    }

    handle_nonspatial_redraw_end(subtask) {
        // TODO(3d)
        for (let i = 0; i < this.tmp_nonspatial_element_ids[subtask].length; i++) {
            $(`#${this.tmp_nonspatial_element_ids[subtask][i]}`).remove();
        }
        this.tmp_nonspatial_element_ids[subtask] = [];
    }

    
    draw_annotation(annotation_object, cvs_ctx="front_context", demo=false, offset=null, subtask=null) {
        // DEBUG left here for refactor reference, but I don't think it's needed moving forward
        //    there may be a use case for drawing depreacted annotations 
        // Don't draw if deprecated
        if (annotation_object["deprecated"]) return;

        // Get actual context from context key and subtask
        let ctx = null;
        if (subtask == "demo") {
            // Must be demo
            if (cvs_ctx != "demo_canvas_context") {
                throw new Error("Error drawing demo annotation.")
            }
            ctx = this.state["demo_canvas_context"];
        }
        else {
            ctx = this.subtasks[subtask]["state"][cvs_ctx];
        }
    
        // Dispatch to annotation type's drawing function
        switch (annotation_object["spatial_type"]) {
            case "bbox":
                this.draw_bounding_box(annotation_object, ctx, demo, offset, subtask);
                break;
            case "point":
                this.draw_point(annotation_object, ctx, demo, offset, subtask);
                break;
            case "bbox3":
                // TODO(new3d)
                this.draw_bbox3(annotation_object, ctx, demo, offset, subtask);
                break;
            case "polygon":
            case "polyline":
                this.draw_polygon(annotation_object, ctx, demo, offset, subtask);
                break;
            case "contour":
                this.draw_contour(annotation_object, ctx, demo, offset, subtask);
                break;
            case "tbar":
                this.draw_tbar(annotation_object, ctx, demo, offset, subtask);
                break;
            case "whole-image":
                this.draw_whole_image_annotation(annotation_object, subtask);
                break;
            case "global":
                this.draw_global_annotation(annotation_object, subtask);
                break;
            default:
                this.raise_error("Warning: Annotation " + annotation_object["id"] + " not understood", ULabel.elvl_info);
                break;
        }
    }

    draw_annotation_from_id(id, cvs_ctx="front_context", offset=null, subtask=null) {
        if (subtask == null) {
            // Should never be here tbh
            subtask = this.state["current_subtask"];
        }
        let frame = this.subtasks[subtask]["annotations"]["access"][id]["frame"];
        if (frame == null || frame == "undefined" || frame == this.state["current_frame"]) {
            this.draw_annotation(this.subtasks[subtask]["annotations"]["access"][id], cvs_ctx, false, offset, subtask);
        }
    }
    
    // Draws the first n annotations on record
    draw_n_annotations(n, cvs_ctx="front_context", offset=null, subtask=null, spatial_only=false) {
        if (subtask == null) {
            // Should never be here tbh
            subtask = this.state["current_subtask"];
        }
        for (var i = 0; i < n; i++) {
            let annid = this.subtasks[subtask]["annotations"]["ordering"][i];
            if (spatial_only && NONSPATIAL_MODES.includes(this.subtasks[subtask]["annotations"]["access"][annid]["spatial_type"])) {
                continue;
            }
            if (offset != null && offset["id"] == annid) {
                this.draw_annotation_from_id(annid, cvs_ctx, offset, subtask);
            }
            else {
                this.draw_annotation_from_id(annid, cvs_ctx, null, subtask);
            }
        }
    }
    

    redraw_all_annotations_in_subtask(subtask, offset=null, spatial_only=false) {
        // Clear the canvas
        this.subtasks[subtask]["state"]["front_context"].clearRect(0, 0, this.config["image_width"]*this.config["px_per_px"], this.config["image_height"]*this.config["px_per_px"]);
    
        if (!spatial_only) {
            this.register_nonspatial_redraw_start(subtask);
        }

        // Draw them all again
        this.draw_n_annotations(this.subtasks[subtask]["annotations"]["ordering"].length, "front_context", offset, subtask, spatial_only);

        if (!spatial_only) {
            this.handle_nonspatial_redraw_end(subtask);
        }

    }

    redraw_all_annotations(subtask=null, offset=null, spatial_only=false) {
        // TODO(3d)
        if (subtask == null) {
            for (const st in this.subtasks) {
                this.redraw_all_annotations_in_subtask(st, offset, spatial_only);
            }
        }
        else {
            this.redraw_all_annotations_in_subtask(subtask, offset, spatial_only);
        }
    }

    // ================= On-Canvas HTML Dialog Utilities =================

    // When a dialog is created or its position changes, make sure all
    // dialogs that are meant to be visible are in their correct positions
    reposition_dialogs() {
        // Get info about image wrapper
        var imwrap = $("#" + this.config["imwrap_id"]);
        const new_dimx = imwrap.width();
        const new_dimy = imwrap.height();

        // Get current subtask for convenience
        let crst = this.state["current_subtask"];

        // Iterate over all visible dialogs and apply new positions
        for (var id in this.subtasks[crst]["state"]["visible_dialogs"]) {
            let el = this.subtasks[crst]["state"]["visible_dialogs"][id];
            let jqel = $("#" + id);
            let new_left = el["left"]*new_dimx;
            let new_top = el["top"]*new_dimy;
            switch(el["pin"]) {
                case "center":
                    new_left -= jqel.width()/2;
                    new_top -= jqel.height()/2;
                    break;
                case "top-left":
                    // No need to adjust for a top left pin
                    break;
                default:
                    // TODO top-right, bottom-left, bottom-right
                    // top/bottom-center? center-left/right?
                    break;
            }
            
            // Enforce that position be on the underlying image
            // TODO
            
            // Apply new position
            jqel.css("left", new_left + "px");
            jqel.css("top",  new_top + "px");    
        }
    }

    create_polygon_ender(gmx, gmy, polygon_id) {
        // Create ender id
        const ender_id = "ender_" + polygon_id;
    
        // Build ender html
        const ender_html = `
        <a href="#" id="${ender_id}" class="ender_outer">
            <span id="${ender_id}_inner" class="ender_inner"></span>
        </a>
        `;
        $("#dialogs__" + this.state["current_subtask"]).append(ender_html);
        $("#" + ender_id).css({
            "width": this.config["polygon_ender_size"]+"px",
            "height": this.config["polygon_ender_size"]+"px",
            "border-radius": this.config["polygon_ender_size"]/2+"px"
        });
        $("#" + ender_id+"_inner").css({
            "width": this.config["polygon_ender_size"]/5+"px",
            "height": this.config["polygon_ender_size"]/5+"px",
            "border-radius": this.config["polygon_ender_size"]/10+"px",
            "top": 2*this.config["polygon_ender_size"]/5+"px",
            "left": 2*this.config["polygon_ender_size"]/5+"px"
        });
    
        // Add this id to the list of dialogs with managed positions
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][ender_id] = {
            "left": gmx/this.config["image_width"],
            "top": gmy/this.config["image_height"],
            "pin": "center"
        };
        this.reposition_dialogs();
    }
    destroy_polygon_ender(polygon_id) {
        // Create ender id
        const ender_id = "ender_" + polygon_id;
        $("#" + ender_id).remove();
        delete this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][ender_id];
        this.reposition_dialogs();
    }
    
    show_edit_suggestion(nearest_point, currently_exists) {
        let esid = "edit_suggestion__" + this.state["current_subtask"];
        var esjq = $("#" + esid);
        esjq.css("display", "block");
        if (currently_exists) {
            esjq.removeClass("soft");
        }
        else {
            esjq.addClass("soft");
        }
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["left"] = nearest_point["point"][0]/this.config["image_width"];
        this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["top"] = nearest_point["point"][1]/this.config["image_height"];
        this.reposition_dialogs();
    }
    
    hide_edit_suggestion() {
        $(".edit_suggestion").css("display", "none");
    }

    show_global_edit_suggestion(annid, offset=null, nonspatial_id=null) {
        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let idd_x;
        let idd_y;
        if (nonspatial_id == null) {
            let esid = "global_edit_suggestion__" + this.state["current_subtask"];
            var esjq = $("#" + esid);
            esjq.css("display", "block");
            let cbox = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["containing_box"];
            let new_lft = (cbox["tlx"] + cbox["brx"] + 2*diffX)/(2*this.config["image_width"]);
            let new_top = (cbox["tly"] + cbox["bry"] + 2*diffY)/(2*this.config["image_height"]);
            this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["left"] = new_lft;
            this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][esid]["top"] = new_top;
            this.reposition_dialogs();
            idd_x = (cbox["tlx"] + cbox["brx"] + 2*diffX)/2;
            idd_y = (cbox["tly"] + cbox["bry"] + 2*diffY)/2;
        }
        else {
            // TODO(new3d)
            idd_x = $("#reclf__" + nonspatial_id).offset().left-85;//this.get_global_element_center_x($("#reclf__" + nonspatial_id));
            idd_y = $("#reclf__" + nonspatial_id).offset().top-85;//this.get_global_element_center_y($("#reclf__" + nonspatial_id));
        }


        // let placeholder = $("#global_edit_suggestion a.reid_suggestion");
        if (!this.subtasks[this.state["current_subtask"]]["single_class_mode"]) {
            this.show_id_dialog(idd_x, idd_y, annid, true, nonspatial_id != null);
        }
    }

    hide_global_edit_suggestion() {
        $(".global_edit_suggestion").css("display", "none");
        this.hide_id_dialog();
    }

    show_id_dialog(gbx, gby, active_ann, thumbnail=false, nonspatial=false) {
        let stkey = this.state["current_subtask"];

        // Record which annotation this dialog is associated with
        // TODO
        // am_dialog_associated_ann = active_ann;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] = true;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"] = thumbnail;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_associated_annotation"] = active_ann;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_which"] = "back";

        let idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
        let idd_niu_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
        let new_height = $(`#global_edit_suggestion__${stkey} a.reid_suggestion`)[0].getBoundingClientRect().height;

        if (nonspatial) {
            this.subtasks[this.state["current_subtask"]]["state"]["idd_which"] = "front";
            idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
            idd_niu_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
            new_height = 28;
        }
        else {
            // Add this id to the list of dialogs with managed positions
            // TODO actually only do this when calling append()
            this.subtasks[this.state["current_subtask"]]["state"]["visible_dialogs"][idd_id] = {
                "left": gbx/this.config["image_width"],
                "top": gby/this.config["image_height"],
                "pin": "center"
            };
        }
        let idd = $("#" + idd_id);
        let idd_niu = $("#" + idd_niu_id);
        if (nonspatial) {
            let new_home = $(`#reclf__${active_ann}`);
            let fad_st = $(`#fad_st__${stkey} div.front_dialogs`);
            let ofst = -100;
            let zidx = 2000;
            if (thumbnail) {
                zidx = -1;
                // ofst = -100;
            }
            let top_c = new_home.offset().top - fad_st.offset().top + ofst + new_height/2;
            let left_c = new_home.offset().left - fad_st.offset().left + ofst + 1 + new_height/2;
            idd.css({
                "display": "block",
                "position": "absolute",
                "top": (top_c)+"px",
                "left": (left_c)+"px",
                "z-index": zidx
            });
            idd.parent().css({
                "z-index": zidx
            });

        }

        // Add or remove thumbnail class if necessary
        let scale_ratio = new_height/this.config["outer_diameter"];
        if (thumbnail) {
            if (!idd.hasClass("thumb")) {
                idd.addClass("thumb");
            }
            $("#" + idd_id + ".thumb").css({
                "transform": `scale(${scale_ratio})`
            });
        }
        else {
            $("#" + idd_id + ".thumb").css({
                "transform": `scale(1.0)`
            });
            if (idd.hasClass("thumb")) {
                idd.removeClass("thumb");
            }
        }

        this.reposition_dialogs();

        // Configure the dialog to show the current information for this ann
        this.set_id_dialog_payload_to_init(active_ann);
        this.update_id_dialog_display(nonspatial);
        if (!thumbnail) {
            this.update_id_toolbox_display();
        }

        // Show the dialog
        idd.css("display", "block");
        idd_niu.css("display", "none");
        // TODO(new3d)
        // if (nonspatial) {
        //     idd.css("z-index", 2000);
        // }
    }

    hide_id_dialog() {
        let idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
        let idd_id_front = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
        this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] = false;
        this.subtasks[this.state["current_subtask"]]["state"]["idd_associated_annotation"] = null;
        $("#" + idd_id).css("display", "none");
        $("#" + idd_id_front).css("display", "none");
    }


    // ================= Annotation Utilities =================
    
    undo() {
        if (!this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
            this.hide_id_dialog();
        }
        if (this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length > 0) {
            if (this.subtasks[this.state["current_subtask"]]["actions"]["stream"][this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length-1].redo_payload.finished === false) {
                this.finish_action(this.subtasks[this.state["current_subtask"]]["actions"]["stream"][this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length-1]);
            }
            this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].push(this.subtasks[this.state["current_subtask"]]["actions"]["stream"].pop());
            let newact = this.undo_action(this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"][this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].length - 1]);
            if (newact != null) {
                this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"][this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].length - 1] = newact
            }
        }
        // console.log("AFTER UNDO", this.subtasks[this.state["current_subtask"]]["actions"]["stream"], this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"]);
    }

    redo() {
        if (this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].length > 0) {
            this.redo_action(this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"].pop());
        }
        // console.log("AFTER REDO", this.subtasks[this.state["current_subtask"]]["actions"]["stream"], this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"]);
    }

    delete_annotation(aid, redo_payload=null) {
        let annid = aid;
        let old_id = annid;
        let new_id = old_id;
        let redoing = false;
        if (redo_payload != null) {
            redoing = true;
            annid = redo_payload.annid;
            old_id = redo_payload.old_id;
        }

        let annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["spatial_type"];
        
        let deprecate_old = false;
        if (!this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["new"]) {
            // Make new id and record that you did
            deprecate_old = true;
            if (!redoing) {
                new_id = this.make_new_annotation_id();
            }
            else {
                new_id = redo_payload.new_id;
            }

            // Make new annotation (copy of old)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["id"] = new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["parent_id"] = old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(new_id);

            // Set parent_id and deprecated = true
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["deprecated"] = true;

            // Work with new annotation from now on
            annid = new_id;
        }

        if (this.subtasks[this.state["current_subtask"]]["state"]["active_id"] != null) {
            this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
            this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"] = false;
            this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"] = false;
            this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = false;
        }
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["deprecated"] = true;
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.hide_global_edit_suggestion();

        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        // TODO add this action to the undo stack
        this.record_action({
            act_type: "delete_annotation",
            frame: frame,
            undo_payload: {
                annid: annid,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            },
            redo_payload: {
                annid: annid,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            }
        }, redoing);
    }
    delete_annotation__undo(undo_payload) {
        let actid = undo_payload.annid;
        if (undo_payload.deprecate_old) {
            actid = undo_payload.old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["deprecated"] = false;
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.new_id];
            // remove from ordering
            let ind = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].indexOf(undo_payload.new_id)
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].splice(ind, 1);
        }
        else {
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.annid]["deprecated"] = false;
        }
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.suggest_edits(this.state["last_move"]);
    }
    delete_annotation__redo(redo_payload) {
        this.delete_annotation(null, redo_payload);
    }


    get_nearest_active_keypoint(global_x, global_y, max_dist, candidates=null) {
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist/this.get_empirical_scale(),
            "point": null
        };
        if (candidates == null) {
            candidates = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"];
        }
        // Iterate through and find any close enough defined points
        var edid = null;
        for (var edi = 0; edi < candidates.length; edi++) {
            edid = candidates[edi];
            let npi = null;
            let curfrm, pts;
            switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_type"]) {
                case "bbox":
                    npi = ULabel.get_nearest_point_on_bounding_box(
                        global_x, global_y, 
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"],
                        max_dist
                    );
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "bbox3":
                    curfrm = this.state["current_frame"];
                    pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"];
                    if ((curfrm >= Math.min(pts[0][2], pts[1][2])) && (curfrm <= Math.max(pts[0][2], pts[1][2]))) {
                        // TODO(new3d) Make sure this function works for bbox3 too
                        npi = ULabel.get_nearest_point_on_bbox3(
                            global_x, global_y, curfrm,
                            pts,
                            max_dist
                        );
                        if (npi["distance"] < ret["distance"]) {
                            ret["annid"] = edid;
                            ret["access"] = npi["access"];
                            ret["distance"] = npi["distance"];
                            ret["point"] = npi["point"];
                        }
                    }
                    break;
                case "polygon":
                case "polyline":
                    npi = ULabel.get_nearest_point_on_polygon(
                        global_x, global_y, 
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"],
                        max_dist, false
                    );
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "tbar":
                    npi = ULabel.get_nearest_point_on_tbar(
                        global_x, global_y,
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"],
                        max_dist
                    );
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "contour":
                case "point":
                    // Not editable at the moment
                    break;
                }
        }
        // TODO(3d)
        // Iterate through 3d annotations here (e.g., bbox3)
        if (ret["annid"] == null) {
            return null;
        }
        return ret;
    }
    
    get_nearest_segment_point(global_x, global_y, max_dist, candidates=null) {
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist/this.get_empirical_scale(),
            "point": null
        };
        if (candidates == null) {
            candidates = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"];
        }
        for (var edi = 0; edi < candidates.length; edi++) {
            var edid = candidates[edi];
            switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_type"]) {
                case "bbox":
                case "bbox3":
                case "point":
                    // Can't propose new bounding box or keypoint points
                    break;
                case "polygon":
                case "polyline":
                    var npi = ULabel.get_nearest_point_on_polygon(
                        global_x, global_y, 
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][edid]["spatial_payload"],
                        max_dist/this.get_empirical_scale(), true
                    );
                    if (npi["distance"] != null && npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "contour":
                    // Not editable at the moment (TODO)
                    break;
                case "tbar":
                    // Can't propose new tbar points
                    break;
            }
        }
        if (ret["annid"] == null) {
            return null;
        }
        return ret;
    }
    
    get_line_size(demo=false) {
        let line_size = this.state["line_size"]*this.config["px_per_px"];
        if (demo) {
            if (this.state["size_mode"] == "dynamic") {
                line_size *= this.state["zoom_val"];
            }
            return line_size;
        }
        else {
            if (this.state["size_mode"] == "fixed") {
                line_size /= this.state["zoom_val"];
            }
            return line_size;
        }
    }

    // Action Stream Events

    set_saved(saved, in_progress=false) {
        if (saved) {
            $("#"+this.config["container_id"] + " a#submit-button").removeAttr("href");
            $("#"+this.config["container_id"] + " a#submit-button").html(this.config["done_button"]);
        }
        else {
            $("#"+this.config["container_id"] + " a#submit-button").attr("href", "#");
            if (in_progress) {
                $("#"+this.config["container_id"] + " a#submit-button").html(BUTTON_LOADER_HTML);
            }
            else {
                $("#"+this.config["container_id"] + " a#submit-button").html(this.config["done_button"]);
            }
        }
        this.state["edited"] = !saved;
    }

    record_action(action, is_redo=false) {
        this.set_saved(false);

        // After a new action, you can no longer redo old actions
        if (!is_redo) {
            this.subtasks[this.state["current_subtask"]]["actions"]["undone_stack"] = [];
        }

        // Add to stream
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"].push(action);
    }

    record_finish(actid) {
        // TODO(3d) 
        let i = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.init_spatial = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.finished = true;
    }

    record_finish_edit(actid) {
        // TODO(3d) 
        let i = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1;
        let fin_pt = this.get_with_access_string(
            actid, 
            this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.edit_candidate["access"],
            true
        );
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.ending_x = fin_pt[0];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.ending_y = fin_pt[1];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.ending_frame = this.state["current_frame"];
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.finished = true;
    }

    record_finish_move(diffX, diffY, diffZ=0) {
        // TODO(3d) 
        let i = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length - 1;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.diffX = diffX;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.diffY = diffY;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.diffZ = diffZ;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].undo_payload.diffX = -diffX;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].undo_payload.diffY = -diffY;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].undo_payload.diffZ = -diffZ;
        this.subtasks[this.state["current_subtask"]]["actions"]["stream"][i].redo_payload.finished = true;
    }

    undo_action(action) {
        this.update_frame(null, action.frame);
        switch(action.act_type) {
            case "begin_annotation":
                this.begin_annotation__undo(action.undo_payload);
                break;
            case "continue_annotation":
                this.continue_annotation__undo(action.undo_payload);
                break;
            case "finish_annotation":
                this.finish_annotation__undo(action.undo_payload);
                break;
            case "edit_annotation":
                this.edit_annotation__undo(action.undo_payload);
                break;
            case "move_annotation":
                this.move_annotation__undo(action.undo_payload);
                break;
            case "delete_annotation":
                this.delete_annotation__undo(action.undo_payload);
                break;
            case "assign_annotation_id":
                this.assign_annotation_id__undo(action.undo_payload);
                break;
            case "create_nonspatial_annotation":
                this.create_nonspatial_annotation__undo(action.undo_payload);
                break;
            default:
                console.log("Undo error :(");
                break;
        }
    }

    redo_action(action) {
        this.update_frame(null, action.frame);
        switch(action.act_type) {
            case "begin_annotation":
                this.begin_annotation(null, action.redo_payload);
                break;
            case "continue_annotation":
                this.continue_annotation(null, null, action.redo_payload);
                break;
            case "finish_annotation":
                this.finish_annotation(null, action.redo_payload);
                break;
            case "edit_annotation":
                this.edit_annotation__redo(action.redo_payload);
                break;
            case "move_annotation":
                this.move_annotation__redo(action.redo_payload);
                break;
            case "delete_annotation":
                this.delete_annotation__redo(action.redo_payload);
                break;
            case "assign_annotation_id":
                this.assign_annotation_id(null, action.redo_payload);
                break;
            case "create_nonspatial_annotation":
                this.create_nonspatial_annotation(action.redo_payload);
                break;    
            default:
                console.log("Redo error :(");
                break;
        }
    }

    finish_action(action) {
        switch(action.act_type) {
            case "begin_annotation":
            case "edit_annotation":
            case "move_annotation":
                this.end_drag(this.state["last_move"]);
                break;
            default:
                console.log("Finish error :(");
                break;
        }
    }

    create_nonspatial_annotation(redo_payload=null) {
        let redoing = false;
        let unq_id = null;
        let annotation_mode = null;
        let init_idpyld = null;
        if (redo_payload == null) {
            unq_id = this.make_new_annotation_id();
            annotation_mode = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
            init_idpyld = this.get_init_id_payload();
        }
        else {
            redoing = true;
            unq_id = redo_payload.unq_id;
            annotation_mode = redo_payload.annotation_mode;
            init_idpyld = redo_payload.init_payload;
        }

        // Add this annotation to annotations object
        let annframe = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            annframe = null;
        }
        
        let new_annotation = {
            "id": unq_id,
            "new": true,
            "parent_id": null,
            "created_by": this.config["annotator"],
            "created_at": ULabel.get_time(),
            "deprecated": false,
            "spatial_type": annotation_mode,
            "spatial_payload": null,
            "classification_payloads": JSON.parse(JSON.stringify(init_idpyld)),
            "line_size": null,
            "containing_box": null,
            "frame": annframe,
            "text_payload": ""
        };

        let undo_frame = this.state["current_frame"];
        let ann_str;

        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id] = new_annotation;
        if (redoing) {
            this.set_id_dialog_payload_to_init(unq_id, init_idpyld);
        }
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["annotation_meta"] = this.config["annotation_meta"];
        this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(unq_id);
        ann_str = JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]);

        // Draw new annotation
        this.redraw_all_annotations(this.state["current_subtask"], null);

        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        // Record for potential undo/redo
        this.record_action({
            act_type: "create_nonspatial_annotation",
            frame: frame,
            redo_payload: {
                unq_id: unq_id,
                annotation_mode: annotation_mode,
                init_spatial: null,
                finished: true,
                init_payload: JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]))
            },
            undo_payload: {
                ann_str: ann_str,
                frame: undo_frame
            },
        }, redoing);
        this.suggest_edits(this.state["last_move"]);
    }
    create_nonspatial_annotation__undo(undo_payload) {
        let ann = JSON.parse(undo_payload.ann_str);
        let unq_id = ann["id"];

        let end_ann;
        end_ann = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].pop();

        if (end_ann != unq_id) {
            console.log("We may have a problem... undo replication");
            console.log(end_ann, unq_id);
        }

        // Remove from access
        if (unq_id in this.subtasks[this.state["current_subtask"]]["annotations"]["access"]) {
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id];
        }
        else {
            console.log("We may have a problem... undo replication");
        }

        // Delete from view
        this.redraw_all_annotations(this.state["current_subtask"], null);
        this.suggest_edits(this.state["last_move"]);
    }

    begin_annotation(mouse_event, redo_payload=null) {
        // Give the new annotation a unique ID
        let unq_id = null;
        let line_size = null;
        let annotation_mode = null;
        let redoing = false;
        let gmx = null;
        let gmy = null;
        let init_spatial = null;
        let init_idpyld = null;
        if (redo_payload == null) {
            unq_id = this.make_new_annotation_id();
            line_size = this.get_line_size();
            annotation_mode = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
            gmx = this.get_global_mouse_x(mouse_event);
            gmy = this.get_global_mouse_y(mouse_event);
            init_spatial = this.get_init_spatial(gmx, gmy, annotation_mode);
            init_idpyld = this.get_init_id_payload();
            this.hide_edit_suggestion();
            this.hide_global_edit_suggestion();
        }
        else {
            unq_id = redo_payload.unq_id;
            line_size = redo_payload.line_size;
            mouse_event = redo_payload.mouse_event;
            annotation_mode = redo_payload.annotation_mode;
            redoing = true;
            gmx = redo_payload.gmx;
            gmy = redo_payload.gmy;
            init_spatial = redo_payload.init_spatial;
            init_idpyld = redo_payload.init_payload;
        }

        // TODO(3d) 
        let containing_box = {
            "tlx": gmx,
            "tly": gmy,
            "brx": gmx,
            "bry": gmy
        };
        if (NONSPATIAL_MODES.includes(annotation_mode)) {
            containing_box = null;
            line_size = null;
            init_spatial = null;
        }
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        // Add this annotation to annotations object
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id] = {
            "id": unq_id,
            "new": true,
            "parent_id": null,
            "created_by": this.config["annotator"],
            "created_at": ULabel.get_time(),
            "deprecated": false,
            "spatial_type": annotation_mode,
            "spatial_payload": init_spatial,
            "classification_payloads": JSON.parse(JSON.stringify(init_idpyld)),
            "line_size": line_size,
            "containing_box": containing_box,
            "frame": frame,
            "text_payload": ""
        };
        if (redoing) {
            this.set_id_dialog_payload_to_init(unq_id, init_idpyld);
        }

        // TODO(3d)
        // Load annotation_meta into annotation
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["annotation_meta"] = this.config["annotation_meta"];
        this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(unq_id);
    
        // If a polygon was just started, we need to add a clickable to end the shape
        if (annotation_mode == "polygon") {
            this.create_polygon_ender(gmx, gmy, unq_id);
        }
        else if (annotation_mode == "polyline") {
            // Create enders to connect to the ends of other polylines
            // TODO
        }
    
        // Draw annotation, and set state to annotation in progress
        this.draw_annotation_from_id(unq_id);
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = unq_id;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = true;

        // Record for potential undo/redo
        this.record_action({
            act_type: "begin_annotation",
            frame: frame,
            redo_payload: {
                mouse_event: mouse_event,
                unq_id: unq_id,
                line_size: line_size,
                annotation_mode: annotation_mode,
                gmx: gmx,
                gmy: gmy,
                init_spatial: JSON.parse(JSON.stringify(init_spatial)),
                finished: redoing || annotation_mode == "point", // Did I mean != here???
                init_payload: JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]))
            },
            undo_payload: {
                // TODO(3d)
                ann_str: JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id])
            },
        }, redoing);
        if (redoing) {
            if (annotation_mode == "polygon" || annotation_mode == "polyline") {
                this.continue_annotation(this.state["last_move"]);
            }
            else {
                redo_payload.actid = redo_payload.unq_id;
                this.finish_annotation(null, redo_payload);
                this.rebuild_containing_box(unq_id);
                this.suggest_edits(this.state["last_move"]);
            }
        }
        else if (annotation_mode == "point") {
            this.finish_annotation(null);
            this.rebuild_containing_box(unq_id);
            this.suggest_edits(this.state["last_move"]);
        }
    }
    begin_annotation__undo(undo_payload) {
        // Parse necessary data
        let ann = JSON.parse(undo_payload.ann_str);
        let unq_id = ann["id"];

        // Set annotation state not in progress, nullify active id
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = false;
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;

        // Destroy ender
        // TODO(3d)
        if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["spatial_type"] == "polygon") {
            this.destroy_polygon_ender(unq_id);
        }
        else if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id]["spatial_type"] == "polyline") {
            // Destroy enders/linkers for polyline
            // TODO 
        }

        // Remove from ordering
        // TODO(3d)
        let end_ann = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].pop();
        if (end_ann != unq_id) {
            console.log("We may have a problem... undo replication");
            console.log(end_ann, unq_id);
        }

        // Remove from access
        // TODO(3d)
        if (unq_id in this.subtasks[this.state["current_subtask"]]["annotations"]["access"]) {
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][unq_id];
        }
        else {
            console.log("We may have a problem... undo replication");
        }

        // Delete from view
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.suggest_edits(this.state["last_move"]);
    }

    update_containing_box(ms_loc, actid, subtask=null) {
        if (subtask == null) {
            subtask = this.state["current_subtask"];
        }
        // TODO(3d)
        if (ms_loc[0] < this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"] = ms_loc[0];
        }
        else if (ms_loc[0] > this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"] = ms_loc[0];
        }
        if (ms_loc[1] < this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"] = ms_loc[1];
        }
        else if (ms_loc[1] > this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"]) {
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"] = ms_loc[1];
        }
        // console.log(ms_loc, this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]);
    }

    rebuild_containing_box(actid, ignore_final=false, subtask=null) {
        if (subtask == null) {
            subtask = this.state["current_subtask"];
        }
        let init_pt = this.subtasks[subtask]["annotations"]["access"][actid]["spatial_payload"][0];
        this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"] = {
            "tlx": init_pt[0],
            "tly": init_pt[1],
            "brx": init_pt[0],
            "bry": init_pt[1]
        }
        let npts = this.subtasks[subtask]["annotations"]["access"][actid]["spatial_payload"].length;
        if (ignore_final) {
            npts -= 1;
        }
        for (var pti = 1; pti < npts; pti++) {
            this.update_containing_box(this.subtasks[subtask]["annotations"]["access"][actid]["spatial_payload"][pti], actid, subtask);
        }
        if (this.subtasks[subtask]["annotations"]["access"][actid]["spatial_type"]) {
            let line_size = this.subtasks[subtask]["annotations"]["access"][actid]["line_size"];
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tlx"] -= 3*line_size;
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["tly"] -= 3*line_size;
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["brx"] += 3*line_size;
            this.subtasks[subtask]["annotations"]["access"][actid]["containing_box"]["bry"] += 3*line_size;
        }
        // TODO modification here for T-Bar would be nice too
    }

    continue_annotation(mouse_event, isclick=false, redo_payload=null) {
        // Convenience
        let actid = null;
        let redoing = false;
        let gmx = null;
        let gmy = null;
        let frm = this.state["current_frame"];
        if (redo_payload == null) {
            actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
            gmx = this.get_global_mouse_x(mouse_event);
            gmy = this.get_global_mouse_y(mouse_event);
        }
        else {
            mouse_event = redo_payload.mouse_event;
            isclick = redo_payload.isclick;
            actid = redo_payload.actid;
            redoing = true;
            gmx = redo_payload.gmx;
            gmy = redo_payload.gmy;
            frm = redo_payload.frame;
        }

        // TODO big performance gains with buffered canvasses
        if (actid && (actid)) {
            const ms_loc = [
                gmx, 
                gmy
            ];
            // Handle annotation continuation based on the annotation mode
            // TODO(3d)
            // TODO(3d--META) -- This is the farthest I got tagging places that will need to be fixed.
            let n_kpts, ender_pt, ender_dist, ender_thresh, inp;
            switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
                case "bbox":
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][1] = ms_loc;
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    break;
                case "bbox3":
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][1] = [
                        ms_loc[0],
                        ms_loc[1],
                        frm
                    ];
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    break;
                case "polygon":
                case "polyline":
                    // Store number of keypoints for easy access
                    n_kpts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length;

                    // If hovering over the ender, snap to its center
                    ender_pt = [
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][0][0],
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][0][1]
                    ];
                    ender_dist = Math.pow(Math.pow(ms_loc[0] - ender_pt[0], 2) + Math.pow(ms_loc[1] - ender_pt[1], 2), 0.5);
                    ender_thresh = $("#ender_" + actid).width()/(2*this.get_empirical_scale());
                    if (ender_dist < ender_thresh) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][n_kpts-1] = ender_pt;
                    }
                    else { // Else, just redirect line to mouse position
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][n_kpts-1] = ms_loc;
                    }

                    // If this mouse event is a click, add a new member to the list of keypoints 
                    //    ender clicks are filtered before they get here
                    if (isclick) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].push(ms_loc);
                        this.update_containing_box(ms_loc, actid);

                        let frame = this.state["current_frame"];

                        // Only an undoable action if placing a polygon keypoint
                        this.record_action({
                            act_type: "continue_annotation",
                            frame: frame,
                            redo_payload: {
                                mouse_event: mouse_event,
                                isclick: isclick,
                                actid: actid,
                                gmx: gmx,
                                gmy: gmy
                            },
                            undo_payload: {
                                actid: actid
                            }
                        }, redoing);
                        if (redoing) {
                            this.continue_annotation(this.state["last_move"]);
                        }
                    }
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    break;
                case "contour":
                    if (ULabel.l2_norm(ms_loc, this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length-1])*this.config["px_per_px"] > 3) {
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].push(ms_loc);
                        this.update_containing_box(ms_loc, actid);
                        this.redraw_all_annotations(this.state["current_subtask"], null, true); // TODO tobuffer, no need to redraw here, can just draw over
                    }
                    break;
                case "tbar":
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][1] = ms_loc;
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    break;
                default:
                    inp = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"];
                    this.raise_error(`Annotation mode is not understood: ${inp}`, ULabel.elvl_info);
                    break;
            }
        }
    }
    continue_annotation__undo(undo_payload) {
        // TODO(3d)
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"].pop();
        this.rebuild_containing_box(undo_payload.actid, true);
        this.continue_annotation(this.state["last_move"]);
    }
    
    begin_edit(mouse_event) {
        // Handle case of editing an annotation that was not originally created by you
        let deprecate_old = false;
        let old_id = this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"];
        let new_id = old_id;
        // TODO(3d)
        if (!this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["new"]) {
            // Make new id and record that you did
            deprecate_old = true;
            new_id = this.make_new_annotation_id();

            // Make new annotation (copy of old)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["id"] = new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["parent_id"] = old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(new_id);

            // Set parent_id and deprecated = true
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["deprecated"] = true;

            // Change edit candidate to new id
            this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"] = new_id;
        }

        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"];
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"] = true;
        let ec = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]));
        let stpt = this.get_with_access_string(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"], ec["access"]);
        this.edit_annotation(mouse_event);
        this.suggest_edits(mouse_event);
        let gmx = this.get_global_mouse_x(mouse_event);
        let gmy = this.get_global_mouse_y(mouse_event);

        let annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        this.record_action({
            act_type: "edit_annotation",
            frame: frame,
            undo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                edit_candidate: ec,
                starting_x: stpt[0],
                starting_y: stpt[1],
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            },
            redo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                edit_candidate: ec,
                ending_x: gmx,
                ending_y: gmy,
                finished: false,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            }
        });
    }
    
    edit_annotation(mouse_event) {
        // Convenience
        const actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        // TODO big performance gains with buffered canvasses
        if (actid && (actid !== null)) {
            var ms_loc = [
                this.get_global_mouse_x(mouse_event),
                this.get_global_mouse_y(mouse_event)
            ];
            // Clicks are handled elsewhere
            // TODO(3d)
            switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
                case "bbox":
                    this.set_with_access_string(actid, this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["access"], ms_loc);
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"]);
                    break;
                case "bbox3":
                    // TODO(new3d) Will not always want to set 3rd val -- editing is possible within an intermediate frame or frames
                    this.set_with_access_string(actid, this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["access"], [ms_loc[0], ms_loc[1], this.state["current_frame"]]);
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(null, null, true); // tobuffer
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"]);
                    break;
                case "polygon":
                case "polyline":
                    this.set_with_access_string(actid, this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["access"], ms_loc);
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"]);
                    // this.suggest_edits(mouse_event);
                    break;
                case "contour":
                    // TODO contour editing
                    this.raise_error("Annotation mode is not currently editable", ULabel.elvl_info);
                    break;
                case "tbar":
                    this.set_with_access_string(actid, this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["access"], ms_loc);
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"]["annid"]);
                    break;
                default:
                    this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                    break;
            }
        }
    }
    edit_annotation__undo(undo_payload) {
        let actid = undo_payload.actid;
        if (undo_payload.deprecate_old) {
            actid = undo_payload.old_id;
            // TODO(3d)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["deprecated"] = false;
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.new_id];
            // remove from ordering
            let ind = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].indexOf(undo_payload.new_id)
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].splice(ind, 1);
        }
        const ms_loc = [
            undo_payload.starting_x,
            undo_payload.starting_y
        ];
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
            case "bbox":
                this.set_with_access_string(actid, undo_payload.edit_candidate["access"], ms_loc, true);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "bbox3":
                ms_loc.push(undo_payload.starting_frame);
                this.set_with_access_string(actid, undo_payload.edit_candidate["access"], ms_loc, true);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "polygon":
            case "polyline":
                this.set_with_access_string(actid, undo_payload.edit_candidate["access"], ms_loc, true);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "tbar":
                this.set_with_access_string(actid, undo_payload.edit_candidate["access"], ms_loc, true);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
        }
    }
    edit_annotation__redo(redo_payload) {
        let actid = redo_payload.actid;
        if (redo_payload.deprecate_old) {
            actid = redo_payload.new_id;
            // TODO(3d)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["id"] = redo_payload.new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["parent_id"] = redo_payload.old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.old_id]["deprecated"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(redo_payload.new_id);
        }
        const ms_loc = [
            redo_payload.ending_x,
            redo_payload.ending_y
        ];
        const cur_loc = this.get_with_access_string(redo_payload.actid, redo_payload.edit_candidate["access"]);
        // TODO(3d)
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
            case "bbox":
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "bbox3":
                ms_loc.push(redo_payload.ending_frame);
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "polygon":
            case "polyline":
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc, false);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
            case "tbar":
                this.set_with_access_string(actid, redo_payload.edit_candidate["access"], ms_loc, false);
                this.rebuild_containing_box(actid);
                this.redraw_all_annotations(this.state["current_subtask"], null, true); // tobuffer
                this.suggest_edits(this.state["last_move"]);
                break;
    
        }
        let annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }
        this.record_action({
            act_type: "edit_annotation",
            frame: frame,
            undo_payload: {
                actid: redo_payload.actid,
                edit_candidate: JSON.parse(JSON.stringify(redo_payload.edit_candidate)),
                starting_x: cur_loc[0],
                starting_y: cur_loc[1],
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            },
            redo_payload: {
                actid: redo_payload.actid,
                edit_candidate: JSON.parse(JSON.stringify(redo_payload.edit_candidate)),
                ending_x: redo_payload.ending_x,
                ending_y: redo_payload.ending_y,
                finished: true,
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            }
        }, true);
    }

    begin_move(mouse_event) {

        let deprecate_old = false;
        let old_id = this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"];
        let new_id = old_id;
        // TODO(3d)
        if (!this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["new"]) {
            // Make new id and record that you did
            deprecate_old = true;
            new_id = this.make_new_annotation_id();

            // Make new annotation (copy of old)
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["id"] = new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["parent_id"] = old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(new_id);

            // Set parent_id and deprecated = true
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][old_id]["deprecated"] = true;

            // Change edit candidate to new id
            this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"] = new_id;
        }

        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"];
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"] = true;

        // Revise start to current button center
        // TODO
        /*
        this.drag_state["move"]["mouse_start"][0] = mouse_event.target.pageX 
        this.drag_state["move"]["mouse_start"][1] +=
        */
        let mc = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]));
        let annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][new_id]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        this.record_action({
            act_type: "move_annotation",
            frame: frame,
            undo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                move_candidate: mc,
                diffX: 0,
                diffY: 0,
                diffZ: 0,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            },
            redo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                move_candidate: mc,
                diffX: 0,
                diffY: 0,
                diffZ: 0,
                finished: false,
                deprecate_old: deprecate_old,
                old_id: old_id,
                new_id: new_id
            }
        });
        // Hide point edit suggestion
        $(".edit_suggestion").css("display", "none");

        this.move_annotation(mouse_event);
    }

    move_annotation(mouse_event) {
        // Convenience
        const actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        // TODO big performance gains with buffered canvasses
        if (actid && (actid !== null)) {
            let offset = {
                "id": this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"],
                "diffX": (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0])/this.state["zoom_val"],
                "diffY": (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1])/this.state["zoom_val"],
                "diffZ": this.state["current_frame"] - this.drag_state["move"]["mouse_start"][2]
            };
            this.redraw_all_annotations(null, offset, true); // tobuffer
            this.show_global_edit_suggestion(this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"]["annid"], offset); // TODO handle offset
            this.reposition_dialogs();
            return;
        }
    }
    
    finish_annotation(mouse_event, redo_payload=null) {
        // Convenience
        let actid = null;
        let redoing = false;
        if (redo_payload == null) {
            actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        }
        else {
            actid = redo_payload.actid;
            redoing = true;
        }

        // Record last point and redraw if necessary
        // TODO(3d)
        let n_kpts, start_pt, popped;
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
            case "polygon":
                n_kpts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length;
                start_pt = [
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][0][0],
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][0][1]
                ];
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][n_kpts-1] = start_pt;
                this.redraw_all_annotations(this.state["current_subtask"]); // tobuffer
                this.record_action({
                    act_type: "finish_annotation",
                    frame: this.state["current_frame"],
                    undo_payload: {
                        actid: actid,
                        ender_html: $("#ender_" + actid).outer_html()
                    },
                    redo_payload: {
                        actid: actid
                    }
                }, redoing);
                $("#ender_" + actid).remove(); // TODO remove from visible dialogs
                break;
            case "polyline":
                // TODO handle the case of merging with existing annotation
                // Remove last point
                n_kpts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length;
                if (n_kpts > 2) {
                    popped = true;
                    n_kpts -= 1;
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].pop();
                }
                else {
                    popped = false;
                    this.rebuild_containing_box(actid, false, this.state["current_subtask"]);
                }
                console.log(
                    "At finish...", 
                    JSON.stringify(
                        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"],
                        null, 2
                    )
                );
                this.redraw_all_annotations(this.state["current_subtask"]); // tobuffer
                this.record_action({
                    act_type: "finish_annotation",
                    frame: this.state["current_frame"],
                    undo_payload: {
                        actid: actid,
                        popped: popped
                        // ender_html: $("#ender_" + actid).outer_html()
                    },
                    redo_payload: {
                        actid: actid,
                        popped: popped,
                        fin_pt: JSON.parse(JSON.stringify(
                            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][n_kpts - 1]
                        ))
                    }
                }, redoing);
                // TODO remove all enders/mergers for this polyline
                // $("#ender_" + actid).remove(); // TODO remove from visible dialogs
                break;
            case "bbox":
            case "bbox3":
            case "contour":
            case "tbar":
            case "point":
                this.record_finish(actid);
                // tobuffer this is where the annotation moves to back canvas
                break;
            default:
                break;
        }
    
        // If ID has not been assigned to this annotation, build a dialog for it
        // if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] == null) {
        //     this.show_id_dialog(mouse_event, actid);
        // }
        // TODO build a dialog here when necessary -- will also need to integrate with undo
        // TODO(3d)
        if (this.subtasks[this.state["current_subtask"]]["single_class_mode"]) {
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] = [
                {
                    "class_id": this.subtasks[this.state["current_subtask"]]["class_defs"][0]["id"],
                    "confidence": 1.0
                }
            ]
        }
        else {
            if (!redoing) {
                // Uncommenting would show id dialog after every annotation finishes. Currently this is not desired
                // this.subtasks[this.state["current_subtask"]]["state"]["first_explicit_assignment"] = true;
                // this.show_id_dialog(this.get_global_mouse_x(mouse_event), this.get_global_mouse_y(mouse_event), actid);
            }
        }
    
        // Set mode to no active annotation
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = false;
    }
    finish_annotation__undo(undo_payload) {
        // This is only ever invoked for polygons and polylines

        // TODO(3d)
        let n_kpts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"].length;
        let amd = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_type"];
        if (amd == "polyline" && undo_payload.popped) {
            let new_pt = JSON.parse(JSON.stringify(
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"][n_kpts - 1]
            ));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"].push(new_pt);
            n_kpts += 1;
        }
        if (!NONSPATIAL_MODES.includes(amd)) {
            let pt = [
                this.get_global_mouse_x(this.state["last_move"]),
                this.get_global_mouse_y(this.state["last_move"]),
            ];
            if (MODES_3D.includes(amd)) {
                pt.push(this.state["current_frame"])
            }
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.actid]["spatial_payload"][n_kpts-1] = pt;
        }

        // Note that undoing a finish should not change containing box
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"] = true;
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = undo_payload.actid;
        this.redraw_all_annotations(this.state["current_subtask"]);
        if (undo_payload.ender_html) {
            $("#dialogs__" + this.state["current_subtask"]).append(undo_payload.ender_html);
        }
        this.hide_edit_suggestion();
        this.hide_global_edit_suggestion();
        this.reposition_dialogs();
    }
    
    finish_edit() {
        // Record last point and redraw if necessary
        let actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"];
        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]) {
            case "polygon":
            case "polyline":
            case "bbox":
            case "bbox3":
            case "tbar":
                this.record_finish_edit(actid);
                break;
            case "contour":
            case "point":
                // tobuffer this is where the annotation moves to back canvas
                break;
            default:
                break;
        }
    
        // Set mode to no active annotation
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"] = false;
    }

    finish_move(mouse_event) {
        // Actually edit spatial payload this time
        const diffX = (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0])/this.state["zoom_val"];
        const diffY = (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1])/this.state["zoom_val"];
        const diffZ = this.state["current_frame"] - this.drag_state["move"]["mouse_start"][2];

        // TODO(3d)
        for (let spi = 0; spi < this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"].length; spi++) {
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"][spi][0] += diffX;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"][spi][1] += diffY;
        }
        if (MODES_3D.includes(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_type"])) {
            for (let spi = 0; spi < this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"].length; spi++) {
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_payload"][spi][2] += diffZ;
            }
        }
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["containing_box"]["tlx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["containing_box"]["brx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["containing_box"]["tly"] += diffY;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["containing_box"]["bry"] += diffY;

        switch (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][this.subtasks[this.state["current_subtask"]]["state"]["active_id"]]["spatial_type"]) {
            case "polygon":
            case "polyline":
            case "bbox":
            case "bbox3":
            case "contour":
            case "tbar":
            case "point":
                // tobuffer this is where the annotation moves to back canvas
                break;
            default:
                break;
        }
        this.subtasks[this.state["current_subtask"]]["state"]["active_id"] = null;
        this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"] = false;

        this.redraw_all_annotations(this.state["current_subtask"]);

        this.record_finish_move(diffX, diffY, diffZ);
    }
    move_annotation__undo(undo_payload) {
        const diffX = undo_payload.diffX;
        const diffY = undo_payload.diffY;
        const diffZ = undo_payload.diffZ;

        let actid = undo_payload.move_candidate["annid"];
        // TODO(3d)
        if (undo_payload.deprecate_old) {
            actid = undo_payload.old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["deprecated"] = false;
            delete this.subtasks[this.state["current_subtask"]]["annotations"]["access"][undo_payload.new_id];
            let ind = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].indexOf(undo_payload.new_id);
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].splice(ind, 1);
        }
        else {
            for (var spi = 0; spi < this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length; spi++) {
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][0] += diffX;
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][1] += diffY;
                if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi].length > 2) {
                    this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][2] += diffZ;
                }
            }
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["tlx"] += diffX;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["brx"] += diffX;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["tly"] += diffY;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["bry"] += diffY;
        }

        this.redraw_all_annotations(this.state["current_subtask"]);
        this.hide_edit_suggestion();
        this.hide_global_edit_suggestion();
        this.reposition_dialogs();
        this.suggest_edits(this.state["last_move"]);
        this.update_frame(diffZ);
    }
    move_annotation__redo(redo_payload) {
        const diffX = redo_payload.diffX;
        const diffY = redo_payload.diffY;
        const diffZ = redo_payload.diffZ;

        let actid = redo_payload.move_candidate["annid"];
        // TODO(3d)
        if (redo_payload.deprecate_old) {
            actid = redo_payload.new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid] = JSON.parse(JSON.stringify(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.old_id]));
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["id"] = redo_payload.new_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["created_by"] = this.config["annotator"];
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["new"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.new_id]["parent_id"] = redo_payload.old_id;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][redo_payload.old_id]["deprecated"] = true;
            this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].push(redo_payload.new_id);
        }

        // TODO(3d)
        for (var spi = 0; spi < this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"].length; spi++) {
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][0] += diffX;
            this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][1] += diffY;
            if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi].length > 2) {
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_payload"][spi][2] += diffZ;
            }
        }
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["tlx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["brx"] += diffX;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["tly"] += diffY;
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["containing_box"]["bry"] += diffY;

        this.redraw_all_annotations(this.state["current_subtask"]);
        this.hide_edit_suggestion();
        this.hide_global_edit_suggestion();
        this.reposition_dialogs();
        this.suggest_edits(this.state["last_move"]);

        let annotation_mode = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"];
        let frame = this.state["current_frame"];
        if (MODES_3D.includes(annotation_mode)) {
            frame = null;
        }

        this.record_action({
            act_type: "move_annotation",
            frame: frame,
            undo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                move_candidate: redo_payload.move_candidate,
                diffX: -diffX,
                diffY: -diffY,
                diffZ: -diffZ,
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            },
            redo_payload: {
                actid: this.subtasks[this.state["current_subtask"]]["state"]["active_id"],
                move_candidate: redo_payload.move_candidate,
                diffX: diffX,
                diffY: diffY,
                diffZ: diffZ,
                finished: true,
                deprecate_old: redo_payload.deprecate_old,
                old_id: redo_payload.old_id,
                new_id: redo_payload.new_id
            }
        }, true);
        this.update_frame(diffZ);
    }

    get_edit_candidates(gblx, gbly, dst_thresh) {
        dst_thresh /= this.get_empirical_scale();
        let ret = {
            "candidate_ids": [],
            "best": null
        };
        let minsize = Infinity;
        // TODO(3d)
        for (var edi = 0; edi < this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"].length; edi++) {
            let id = this.subtasks[this.state["current_subtask"]]["annotations"]["ordering"][edi];
            if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["deprecated"]) continue;
            let cbox = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["containing_box"];
            let frame = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["frame"];
            if (cbox) {
                cbox["tlz"] = this.state["current_frame"];
                cbox["brz"] = this.state["current_frame"];
                if (frame != null) {
                    cbox["tlz"] = frame;
                    cbox["brz"] = frame;
                }
                else {
                    if (this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["spatial_type"] == "bbox3") {
                        let pts = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][id]["spatial_payload"];
                        cbox["tlz"] = Math.min(pts[0][2], pts[1][2]);
                        cbox["brz"] = Math.max(pts[0][2], pts[1][2]);
                    }
                }
            }
            // TODO(new3d) bbox3 will have different rules here 
            if (
                cbox &&
                (gblx >= cbox["tlx"] - dst_thresh) && 
                (gblx <= cbox["brx"] + dst_thresh) &&
                (gbly >= cbox["tly"] - dst_thresh) && 
                (gbly <= cbox["bry"] + dst_thresh) &&
                (this.state["current_frame"] >= cbox["tlz"]) && 
                (this.state["current_frame"] <= cbox["brz"])
            ) {
                ret["candidate_ids"].push(id);
                let boxsize = (cbox["brx"] - cbox["tlx"])*(cbox["bry"] - cbox["tly"]);
                if (boxsize < minsize) {
                    minsize = boxsize;
                    ret["best"] = {
                        "annid": id
                    };
                }
            }
        }
        return ret;
    }
    
    suggest_edits(mouse_event=null, nonspatial_id=null) {
        let best_candidate;
        if (nonspatial_id == null) {
            if (mouse_event == null) {
                mouse_event = this.state["last_move"];
            }

            const dst_thresh = this.config["edit_handle_size"]/2;
            const global_x = this.get_global_mouse_x(mouse_event);
            const global_y = this.get_global_mouse_y(mouse_event);

            if ($(mouse_event.target).hasClass("gedit-target")) return;

            const edit_candidates = this.get_edit_candidates(
                global_x,
                global_y,
                dst_thresh
            );

            if (edit_candidates["best"] == null) {
                this.hide_global_edit_suggestion();
                this.hide_edit_suggestion();
                this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"] = null;
                return;
            }
            
            // Look for an existing point that's close enough to suggest editing it
            const nearest_active_keypoint = this.get_nearest_active_keypoint(global_x, global_y, dst_thresh, edit_candidates["candidate_ids"]);
            if (nearest_active_keypoint != null && nearest_active_keypoint.point != null) {
                this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"] = nearest_active_keypoint;
                this.show_edit_suggestion(nearest_active_keypoint, true);
                edit_candidates["best"] = nearest_active_keypoint;
            }
            else { // If none are found, look for a point along a segment that's close enough
                const nearest_segment_point = this.get_nearest_segment_point(global_x, global_y, dst_thresh, edit_candidates["candidate_ids"]);
                if (nearest_segment_point != null && nearest_segment_point.point != null) {
                    this.subtasks[this.state["current_subtask"]]["state"]["edit_candidate"] = nearest_segment_point;
                    this.show_edit_suggestion(nearest_segment_point, false);
                    edit_candidates["best"] = nearest_segment_point;
                }
                else {
                    this.hide_edit_suggestion();
                }
            }

            // Show global edit dialogs for "best" candidate
            this.subtasks[this.state["current_subtask"]]["state"]["move_candidate"] = edit_candidates["best"];
            best_candidate = edit_candidates["best"]["annid"];
        }
        else {
            this.hide_global_edit_suggestion();
            this.hide_edit_suggestion();
            best_candidate = nonspatial_id;
        }
        this.show_global_edit_suggestion(best_candidate, null, nonspatial_id);
    }


    // ================= Error handlers =================
    
    // Notify the user of information at a given level
    raise_error(message, level=ULabel.elvl_standard) {
        switch (level) {
            // TODO less crude here
            case ULabel.elvl_info:
                console.log("[info] " + message);
                break;
            case ULabel.elvl_standard:
                alert("[error] " + message);
                break;
            case ULabel.elvl_fatal:
                alert("[fatal] " + message);
                throw new Error(message);
        }
    }

    // ================= Mouse event interpreters =================
    
    // Get the mouse position on the screen
    get_global_mouse_x(mouse_event) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (mouse_event.pageX - annbox.offset().left + annbox.scrollLeft())/scale;
        // return Math.round(raw);
        return raw;
    }
    get_global_mouse_y(mouse_event) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (mouse_event.pageY - annbox.offset().top + annbox.scrollTop())/scale;
        // return Math.round(raw);
        return raw;
    }
    get_global_element_center_x(jqel) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (jqel.offset().left + jqel.width()/2 - annbox.offset().left + annbox.scrollLeft())/scale;
        // return Math.round(raw);
        return raw;
    }
    get_global_element_center_y(jqel) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        const raw = (jqel.offset().top + jqel.height()/2 - annbox.offset().top + annbox.scrollTop())/scale;
        // return Math.round();
        return raw;
    }

    // ================= Dialog Interaction Handlers =================

    // ----------------- ID Dialog -----------------

    lookup_id_dialog_mouse_pos(mouse_event, front) {
        let idd = $("#" + this.subtasks[this.state["current_subtask"]]["state"]["idd_id"]);
        if (front) {
            idd = $("#" + this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"]);
        }

        // Get mouse position relative to center of div
        const idd_x = mouse_event.pageX - idd.offset().left - idd.width()/2;
        const idd_y = mouse_event.pageY - idd.offset().top - idd.height()/2;

        // Useful for interpreting mouse loc
        const inner_rad = this.config["inner_prop"]*this.config["outer_diameter"]/2;
        const outer_rad = 0.5*this.config["outer_diameter"];
    
        // Get radius
        const mouse_rad = Math.sqrt(Math.pow(idd_x, 2) + Math.pow(idd_y, 2));
    
        // If not inside, return
        if (mouse_rad > outer_rad) {
            return null;
        }
    
        // If in the core, return
        if (mouse_rad < inner_rad) {
            return null;
        }
    
        // Get array of classes by name in the dialog
        //    TODO handle nesting case
        //    TODO this is not efficient
        let class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
    
        // Get the index of that class currently hovering over
        const class_ind = (
            -1*Math.floor(
                Math.atan2(idd_y, idd_x)/(2*Math.PI)*class_ids.length
            ) + class_ids.length
        )%class_ids.length;
    
        // Get the distance proportion of the hover
        let dist_prop = (mouse_rad - inner_rad)/(outer_rad - inner_rad);

        return {
            class_ind: class_ind,
            dist_prop: dist_prop,
        }
    }

    set_id_dialog_payload_nopin(class_ind, dist_prop) {
        let class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
        // Recompute and render opaque pie slices
        for (var i = 0; i < class_ids.length; i++) {
            if (i == class_ind) {
                this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                    "class_id": class_ids[i],
                    "confidence": dist_prop
                };
            }
            else {
                this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                    "class_id": class_ids[i],
                    "confidence": (1 - dist_prop)/(class_ids.length - 1)
                };
            }
        }
    }

    set_id_dialog_payload_to_init(annid, pyld=null) {
        // TODO(3D)
        let crst = this.state["current_subtask"];
        if (pyld != null) {
            this.subtasks[this.state["current_subtask"]]["state"]["id_payload"] = JSON.parse(JSON.stringify(pyld));
            this.update_id_toolbox_display();
        }
        else {
            if (annid != null) {
                let anpyld = this.subtasks[this.state["current_subtask"]]["annotations"]["access"][annid]["classification_payloads"];
                if (anpyld != null) {
                    this.subtasks[this.state["current_subtask"]]["state"]["id_payload"] = JSON.parse(JSON.stringify(anpyld));
                    return;
                }
            }
            // TODO currently assumes soft
            if (!this.config["allow_soft_id"]) {
                let dist_prop = 1.0;
                let class_ids = this.subtasks[crst]["class_ids"];
                let pfx = "div#tb-id-app--" + this.state["current_subtask"];
                let idarr = $(pfx + " a.tbid-opt.sel").attr("id").split("_");
                let class_ind = class_ids.indexOf(parseInt(idarr[idarr.length - 1]));
                // Recompute and render opaque pie slices
                for (var i = 0; i < class_ids.length; i++) {
                    if (i == class_ind) {
                        this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                            "class_id": class_ids[i],
                            "confidence": dist_prop
                        };
                    }
                    else {
                        this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i] = {
                            "class_id": class_ids[i],
                            "confidence": (1 - dist_prop)/(class_ids.length - 1)
                        };
                    }
                }
            }
            else {
                // Not currently supported
            }
        }
    }

    update_id_dialog_display(front=false) {
        const inner_rad = this.config["inner_prop"]*this.config["outer_diameter"]/2;
        const outer_rad = 0.5*this.config["outer_diameter"];
        let class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
        for (var i = 0; i < class_ids.length; i++) {

            let srt_prop = this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i]["confidence"];

            let cum_prop = i/class_ids.length;
            let srk_prop = 1/class_ids.length;
            let gap_prop = 1.0 - srk_prop;

            let rad_frnt = inner_rad + srt_prop*(outer_rad - inner_rad)/2;

            let wdt_frnt = srt_prop*(outer_rad - inner_rad);

            let srk_frnt = 2*Math.PI*rad_frnt*srk_prop;
            let gap_frnt = 2*Math.PI*rad_frnt*gap_prop;
            let off_frnt = 2*Math.PI*rad_frnt*cum_prop;

            // TODO this is kind of a mess. If it works as is, the commented region below should be deleted
            // var circ = document.getElementById("circ_" + class_ids[i]);
            // circ.setAttribute("r", rad_frnt);
            // circ.setAttribute("stroke-dasharray", `${srk_frnt} ${gap_frnt}`);
            // circ.setAttribute("stroke-dashoffset", off_frnt);
            // circ.setAttribute("stroke-width", wdt_frnt);
            let idd_id;
            if (!front) {
                idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id"];
            }
            else {
                idd_id = this.subtasks[this.state["current_subtask"]]["state"]["idd_id_front"];
            }
            var circ = $(`#${idd_id}__circ_` + class_ids[i])
            // circ.attr("r", rad_frnt);
            // circ.attr("stroke-dasharray", `${srk_frnt} ${gap_frnt}`)
            // circ.attr("stroke-dashoffset", off_frnt)
            // circ.attr("stroke-width", wdt_frnt)
            // circ = $(`#${idd_id}__circ_` + class_ids[i])
            circ.attr("r", rad_frnt);
            circ.attr("stroke-dasharray", `${srk_frnt} ${gap_frnt}`)
            circ.attr("stroke-dashoffset", off_frnt)
            circ.attr("stroke-width", wdt_frnt)
        }
        this.redraw_demo();
    }
    update_id_toolbox_display() {
        if (this.config["allow_soft_id"]) {
            // Not supported yet
        }
        else {
            let pfx = "div#tb-id-app--" + this.state["current_subtask"];
            let class_ids = this.subtasks[this.state["current_subtask"]]["class_ids"];
            for (var i = 0; i < class_ids.length; i++) {
                let cls = class_ids[i];
                if (this.subtasks[this.state["current_subtask"]]["state"]["id_payload"][i]["confidence"] > 0.5) {
                    if (!($(pfx + " #" + this.config["toolbox_id"] + " a#toolbox_sel_" + cls).hasClass("sel"))) {
                        $(pfx + " #" + this.config["toolbox_id"] + " a.tbid-opt.sel").attr("href", "#");
                        $(pfx + " #" + this.config["toolbox_id"] + " a.tbid-opt.sel").removeClass("sel");
                        $(pfx + " #" + this.config["toolbox_id"] + " a#toolbox_sel_" + cls).addClass("sel");
                        $(pfx + " #" + this.config["toolbox_id"] + " a#toolbox_sel_" + cls).removeAttr("href");
                    }
                }
            }
        }
    }

    handle_id_dialog_hover(mouse_event) {
        // Determine which dialog
        let front = false;
        if (this.subtasks[this.state["current_subtask"]]["state"]["idd_which"] == "front") {
            front = true;
        }
        let pos_evt = this.lookup_id_dialog_mouse_pos(mouse_event, front);
        if (pos_evt != null) {
            if (!this.config["allow_soft_id"]) {
                pos_evt.dist_prop = 1.0;
            }
            // TODO This assumes no pins
            this.set_id_dialog_payload_nopin(pos_evt.class_ind, pos_evt.dist_prop);
            this.update_id_dialog_display(front);
            this.update_id_toolbox_display()
        }
    }

    assign_annotation_id(actid=null, redo_payload=null) {
        let new_payload = null;
        let old_payload = null;
        let redoing = false;
        // TODO(3d)
        if (redo_payload == null) {
            if (actid == null) {
                actid = this.subtasks[this.state["current_subtask"]]["state"]["idd_associated_annotation"];
            }
            old_payload = JSON.parse(JSON.stringify(
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"]
            ));
            new_payload = JSON.parse(JSON.stringify(
                this.subtasks[this.state["current_subtask"]]["state"]["id_payload"]
            ));
        }
        else {
            redoing = true;
            old_payload = JSON.parse(JSON.stringify(redo_payload.old_id_payload));
            new_payload = JSON.parse(JSON.stringify(redo_payload.new_id_payload));
            actid = redo_payload.actid;
        }

        // Perform assignment
        // TODO(3d)
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] = JSON.parse(JSON.stringify(new_payload));

        // Redraw with correct color and hide id_dialog if applicable
        if (!redoing) {
            this.hide_id_dialog();
        }
        else {
            this.suggest_edits();
        }
        this.redraw_all_annotations(this.state["current_subtask"]);

        // Explicit changes are undoable
        // First assignments are treated as though they were done all along
        // TODO(3d)
        if (this.subtasks[this.state["current_subtask"]]["state"]["first_explicit_assignment"]) {
            let n = this.subtasks[this.state["current_subtask"]]["actions"]["stream"].length;
            for (var i = 0; i < n; i++) {
                if (this.subtasks[this.state["current_subtask"]]["actions"]["stream"][n-i-1].act_type == "begin_annotation") {
                    this.subtasks[this.state["current_subtask"]]["actions"]["stream"][n-i-1].redo_payload.init_payload = JSON.parse(JSON.stringify(
                        new_payload
                    ));
                    break;
                }
            }
        }
        else {
            this.record_action({
                act_type: "assign_annotation_id",
                undo_payload: {
                    actid: actid,
                    old_id_payload: JSON.parse(JSON.stringify(old_payload))
                },
                redo_payload: {
                    actid: actid,
                    old_id_payload: JSON.parse(JSON.stringify(old_payload)),
                    new_id_payload: JSON.parse(JSON.stringify(new_payload))
                }
            }, redoing);
        }
    }
    assign_annotation_id__undo(undo_payload) {
        let actid = undo_payload.actid;
        let new_payload = JSON.parse(JSON.stringify(undo_payload.old_id_payload));
        // TODO(3d)
        this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["classification_payloads"] = JSON.parse(JSON.stringify(new_payload));
        this.redraw_all_annotations(this.state["current_subtask"]);
        this.suggest_edits();
    }

    handle_id_dialog_click(mouse_event) {
        this.handle_id_dialog_hover(mouse_event);
        // TODO need to differentiate between first click and a reassign -- potentially with global state
        this.assign_annotation_id();
        this.subtasks[this.state["current_subtask"]]["state"]["first_explicit_assignment"] = false;
        this.suggest_edits(this.state["last_move"]);
    }
    
    // ================= Viewer/Annotation Interaction Handlers  ================= 
    
    handle_mouse_down(mouse_event) {
        const drag_key = ULabel.get_drag_key_start(mouse_event, this);
        if (drag_key != null) {
            // Don't start new drag while id_dialog is visible
            if (this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] && !this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                return;
            }
            mouse_event.preventDefault();
            if (this.drag_state["active_key"] == null) {
                this.start_drag(drag_key, mouse_event.button, mouse_event);
            }
        }
    }
    
    handle_mouse_move(mouse_event) {
        this.state["last_move"] = mouse_event;
        // If the ID dialog is visible, let it's own handler take care of this
        // If not dragging...
        if (this.drag_state["active_key"] == null) {
            if (this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] && !this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                return;
            }    
            // If polygon is in progress, redirect last segment
            if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"]) {
                if (
                    (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polygon") ||
                    (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polyline") 
                ) { 
                    this.continue_annotation(mouse_event);
                }
            }
            else { // Nothing in progress. Maybe show editable queues
                this.suggest_edits(mouse_event);                
            }
        }
        else { // Dragging
            switch(this.drag_state["active_key"]) {
                case "pan":
                    this.drag_repan(mouse_event);
                    break;
                case "zoom":
                    this.drag_rezoom(mouse_event);
                    break;
                case "annotation":
                    if (!this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] || this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                        this.continue_annotation(mouse_event);
                    }
                    break;
                case "edit":
                    if (!this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] || this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                        this.edit_annotation(mouse_event);
                    }
                    break;
                case "move":
                    if (!this.subtasks[this.state["current_subtask"]]["state"]["idd_visible"] || this.subtasks[this.state["current_subtask"]]["state"]["idd_thumbnail"]) {
                        this.move_annotation(mouse_event);
                    }
                    break;
            }
        }
    }

    handle_mouse_up(mouse_event) {
        if (mouse_event.button == this.drag_state["release_button"]) {
            this.end_drag(mouse_event);            
        }
    }

    // Start dragging to pan around image
    // Called when mousedown fires within annbox
    start_drag(drag_key, release_button, mouse_event) {
        // Convenience
        const annbox = $("#" + this.config["annbox_id"]);
        
        this.drag_state["active_key"] = drag_key;
        this.drag_state["release_button"] = release_button;
        this.drag_state[drag_key]["mouse_start"] = [
            mouse_event.clientX,
            mouse_event.clientY,
            this.state["current_frame"]
        ];
        this.drag_state[drag_key]["zoom_val_start"] = this.state["zoom_val"];
        this.drag_state[drag_key]["offset_start"] = [
            annbox.scrollLeft(), 
            annbox.scrollTop()
        ];
        $(`textarea`).trigger("blur");
        $("div.permopen").removeClass("permopen");
        // TODO handle this drag start
        let annmd;
        switch (drag_key) {
            case "annotation":
                annmd = this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"];
                if (annmd != "polygon" && annmd != "polyline" && !NONSPATIAL_MODES.includes(annmd)) {
                    this.begin_annotation(mouse_event);
                }
                break;
            case "edit":
                this.begin_edit(mouse_event);
                break;
            case "move":
                this.begin_move(mouse_event);
                break;
            default:
                // No handling necessary for pan and zoom until mousemove
                break;
        }
    }
    
    end_drag(mouse_event) {
        // TODO handle this drag end
        switch (this.drag_state["active_key"]) {
            case "annotation":
                if (this.subtasks[this.state["current_subtask"]]["state"]["active_id"] != null) {
                    if (
                        (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] != "polygon") &&
                        (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] != "polyline")
                    ) {
                        this.finish_annotation(mouse_event);
                    }
                    else {
                        if (
                            (mouse_event.target.id == "ender_" + this.subtasks[this.state["current_subtask"]]["state"]["active_id"]) ||
                            (mouse_event.target.id == "ender_" + this.subtasks[this.state["current_subtask"]]["state"]["active_id"] + "_inner")
                        ) {
                            this.finish_annotation(mouse_event);
                        }
                        else {
                            this.continue_annotation(mouse_event, true);
                        }
                    }
                }
                else {
                    if (
                        (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polygon") || 
                        (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polyline")
                    ) {
                        this.begin_annotation(mouse_event);
                    }
                }
                break;
            case "right":
                if (this.subtasks[this.state["current_subtask"]]["state"]["active_id"] != null) {
                    if (this.subtasks[this.state["current_subtask"]]["state"]["annotation_mode"] == "polyline") {
                        this.finish_annotation(mouse_event);
                    }
                }
                break;
            case "edit":
                // TODO should be finish edit, right?
                this.finish_edit();
                break;
            case "move":
                this.finish_move(mouse_event);
                break;
            default:
                // No handling necessary for pan and zoom until mousemove
                break;
        }

        this.drag_state["active_key"] = null;
        this.drag_state["release_button"] = null;
    }
    
    // Pan to correct location given mouse dragging
    drag_repan(mouse_event) {
        // Convenience
        var annbox = $("#" + this.config["annbox_id"]);

        // Pan based on mouse position
        const aX = mouse_event.clientX;
        const aY = mouse_event.clientY;
        annbox.scrollLeft(
            this.drag_state["pan"]["offset_start"][0] + (this.drag_state["pan"]["mouse_start"][0] - aX)
        );
        annbox.scrollTop(
            this.drag_state["pan"]["offset_start"][1] + (this.drag_state["pan"]["mouse_start"][1] - aY)
        );
    }
    
    // Handle zooming by click-drag
    drag_rezoom(mouse_event) {
        const aY = mouse_event.clientY;
        this.state["zoom_val"] = (
            this.drag_state["zoom"]["zoom_val_start"]*Math.pow(
                1.1, -(aY - this.drag_state["zoom"]["mouse_start"][1])/10
            )
        );
        this.rezoom(this.drag_state["zoom"]["mouse_start"][0], this.drag_state["zoom"]["mouse_start"][1]);
    }
    
    // Handle zooming at a certain focus
    rezoom(foc_x=null, foc_y=null, abs=false) {
        // JQuery convenience
        var imwrap = $("#" + this.config["imwrap_id"]);
        var annbox = $("#" + this.config["annbox_id"]);

        if (foc_x == null) {
            foc_x = annbox.width()/2;
        }
        if (foc_y == null) {
            foc_y = annbox.height()/2;
        }

        // Get old size and position
        let old_width = imwrap.width();
        let old_height = imwrap.height();
        let old_left = annbox.scrollLeft();
        let old_top = annbox.scrollTop();
        if (abs) {
            old_width = this.config["image_width"];
            old_height = this.config["image_height"];
        }

        const viewport_width = annbox.width();
        const viewport_height = annbox.height();

        // Compute new size
        const new_width = Math.round(this.config["image_width"]*this.state["zoom_val"]);
        const new_height = Math.round(this.config["image_height"]*this.state["zoom_val"]);

        // Apply new size
        var toresize = $("." + this.config["imgsz_class"]);
        toresize.css("width", new_width + "px");
        toresize.css("height", new_height + "px");

        // Compute and apply new position
        let new_left, new_top;
        if (abs) {
            new_left = foc_x*new_width/old_width - viewport_width/2;
            new_top = foc_y*new_height/old_height - viewport_height/2;
        }
        else {
            new_left = (old_left + foc_x)*new_width/old_width - foc_x;
            new_top = (old_top + foc_y)*new_height/old_height - foc_y;
        }
        annbox.scrollLeft(new_left);
        annbox.scrollTop(new_top);

        // Redraw demo annotation
        this.redraw_demo();
    }

    swap_frame_image(new_src, frame=0) {
        const ret = $(`img#${this.config["image_id_pfx"]}__${frame}`).attr("src");
        $(`img#${this.config["image_id_pfx"]}__${frame}`).attr("src", new_src);
        return ret;
    }

    // Swap annotation box background color
    swap_anno_bg_color(new_bg_color) {
        const annbox = $("#" + this.config["annbox_id"]);
        const ret = annbox.css("background-color");
        annbox.css("background-color", new_bg_color);
        return ret
    }


    reset_interaction_state(subtask=null) {
        let q = [];
        if (subtask == null) {
            for (let st in this.subtasks) {
                q.push(st);
            }
        }
        else {
            q.push(subtask);
        }
        for (let i = 0; i < q.length; i++) {
            if (this.subtasks[q[i]]["state"]["active_id"] != null) {
                // Delete polygon ender if exists
                $("#ender_" + this.subtasks[q[i]]["state"]["active_id"]).remove();
            }
            this.subtasks[q[i]]["state"]["is_in_edit"] = false;
            this.subtasks[q[i]]["state"]["is_in_move"] = false;
            this.subtasks[q[i]]["state"]["is_in_progress"] = false;
            this.subtasks[q[i]]["state"]["active_id"] = null;
            this.show
        }
        this.drag_state = {
            "active_key": null,
            "release_button": null,
            "annotation": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "edit": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "pan": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "zoom": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "move": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            },
            "right": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            }
        };
    }

    // Allow for external access and modification of annotations within a subtask
    get_annotations(subtask) {
        let ret = [];
        for (let i = 0; i < this.subtasks[subtask]["annotations"]["ordering"].length; i++) {
            let id = this.subtasks[subtask]["annotations"]["ordering"][i];
            if (id != this.subtasks[this.state["current_subtask"]]["state"]["active_id"]) {
                ret.push(this.subtasks[subtask]["annotations"]["access"][id]);
            }
        }
        return JSON.parse(JSON.stringify(ret));
    }
    set_annotations(new_annotations, subtask) {
        // Undo/redo won't work through a get/set
        this.reset_interaction_state();
        this.subtasks[subtask]["actions"]["stream"] = [];
        this.subtasks[subtask]["actions"]["undo_stack"] = [];
        let newanns = JSON.parse(JSON.stringify(new_annotations));
        let new_ordering = [];
        let new_access = {};
        for (let i = 0; i < newanns.length; i++) {
            new_ordering.push(newanns[i]["id"]);
            new_access[newanns[i]["id"]] = newanns[i];
        }
        this.subtasks[subtask]["annotations"]["ordering"] = new_ordering;
        this.subtasks[subtask]["annotations"]["access"] = new_access;
        for (let i = 0; i < new_ordering.length; i++) {
            this.rebuild_containing_box(new_ordering[i], false, subtask);
        }
        this.redraw_all_annotations(subtask);
    }


    // Change frame

    update_frame(delta=null, new_frame=null) {
        if (this.config["image_data"]["frames"].length == 1) {
            return;
        }
        let actid = this.subtasks[this.state["current_subtask"]]["state"]["active_id"]
        if (actid != null) {
            if (!MODES_3D.includes(this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"])) {
                return;
            }
        }
        if (new_frame == null) {
            new_frame = parseInt($(`div#${this.config["toolbox_id"]} input.frame_input`).val());
            if (delta != null) {
                new_frame = Math.min(Math.max(new_frame+delta, 0), this.config["image_data"].frames.length-1);
            }
        }
        else {
            new_frame = Math.min(Math.max(new_frame, 0), this.config["image_data"].frames.length-1);
        }
        // Change the val above
        $(`div#${this.config["toolbox_id"]} input.frame_input`).val(new_frame);
        let old_frame = this.state["current_frame"];
        this.state["current_frame"] = new_frame;
        // $(`img#${this.config["image_id_pfx"]}__${old_frame}`).css("z-index", "initial");
        $(`img#${this.config["image_id_pfx"]}__${old_frame}`).css("display", "none");
        // $(`img#${this.config["image_id_pfx"]}__${new_frame}`).css("z-index", 50);
        $(`img#${this.config["image_id_pfx"]}__${new_frame}`).css("display", "block");
        if (
            actid && 
            MODES_3D.includes(
                this.subtasks[this.state["current_subtask"]]["annotations"]["access"][actid]["spatial_type"]
            )
        ) {
            if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_edit"]) {
                this.edit_annotation(this.state["last_move"]);
            }
            else if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_move"]) {
                this.move_annotation(this.state["last_move"]);
            }
            else if (this.subtasks[this.state["current_subtask"]]["state"]["is_in_progress"]) {
                this.continue_annotation(this.state["last_move"]);
            }
            else {
                this.redraw_all_annotations();
            }
        }
        else {
            this.redraw_all_annotations();
        }
        if (this.state["last_move"] != null) {
            this.suggest_edits(this.state["last_move"]);
        }
    }

    // Generic Callback Support
    on(fn, callback) {
        var old_fn = fn.bind(this);
        this[fn.name] = (...args) => {
            old_fn(...args);
            callback();
        }
    }
}

window.ULabel = ULabel;
