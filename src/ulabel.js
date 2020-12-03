/*
Uncertain Labeling Tool
Sentera Inc.
*/

/* global $ */
/* global Image */
/* global ResizeObserver */
/* global uuidv4 */

class ULabel {

    // ================= Internal constants =================

    static get elvl_info() {return 0;}
    static get elvl_standard() {return 1;}
    static get elvl_fatal() {return 2;}

    // ================= Static Utilities =================
    
    static get_dialog_colors(taxonomy) {
        if (taxonomy == null) return [];
        var colors = [];
        for (var txi = 0; txi < taxonomy.length; txi++) {
            colors.push(taxonomy[txi]["color"]);
        }
        return colors;
    }
    
    static get_dialog_names(taxonomy) {
        if (taxonomy == null) return [];
        // TODO real names here, not colors!
        var colors = [];
        for (var txi = 0; txi < taxonomy.length; txi++) {
            colors.push(taxonomy[txi]["color"]);
        }
        return colors;
    }

    // Returns current epoch time in milliseconds
    static get_time() {
        return (new Date()).toISOString();
    }
    
    // Get the point at a certain proportion of the segment between two points in a polygon
    static interpolate_poly_segment(pts, i, prop) {
        const pt1 = pts[i%(pts.length - 1)];
        const pt2 = pts[(i + 1)%(pts.length - 1)];
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
            for (var kpi = 0; kpi < poly_pts.length-1; kpi++) {
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
            for (var kpi = 0; kpi < poly_pts.length-1; kpi++) {
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
                if (ret["distance"] == null || kpdst < ret["distance"]) {
                    ret["access"] = `${bbi}${bbj}`;
                    ret["distance"] = kpdst;
                    ret["point"] = kp;
                }
            }
        }
        return ret;
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
        if (ul.annotation_state["active_id"] != null) {
            return "annotation";
        }
        switch (mouse_event.button) {
            case 0:
                if (mouse_event.target.id == ul.config["canvas_fid"]) {
                    if (mouse_event.ctrlKey) {
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
                else {
                    return null;
                }
            case 1:
                return "pan";
            case 2:
                return "zoom";
        }
    }

    // ================= Init helpers =================
    
    static prep_window_html(ul) {
        // Bring image and annotation scaffolding in
        const tool_html = `
        <div id="${ul.config["annbox_id"]}" class="annbox_cls">
            <div id="${ul.config["imwrap_id"]}" class="imwrap_cls ${ul.config["imgsz_class"]}">
                <img id="${ul.config["image_id"]}" src="${ul.config["image_url"]}" class="imwrap_cls ${ul.config["imgsz_class"]}" />
            </div>
        </div>
        <div id="${ul.config["toolbox_id"]}" class="toolbox_cls"><div class="toolbox_inner_cls"></div></div>`;
        $("#" + ul.container_id).html(tool_html);

        // Initialize toolbox based on configuration
        const sp_id = ul.config["toolbox_id"];
        for (var ami = 0; ami < ul.config["allowed_modes"].length; ami++) {
            let sel = "";
            let ap_html = "";
            switch (ul.config["allowed_modes"][ami]) {
                case "bbox":
                    if (ul.annotation_state["mode"] == "bbox") {
                        sel = " sel";
                    }
                    ap_html = `
                        <a href="#" id="md-btn--bbox" class="md-btn${sel}">Bounding Box</a>
                    `;
                    break;
                case "polygon":
                    if (ul.annotation_state["mode"] == "polygon") {
                        sel = " sel";
                    }
                    ap_html = `
                        <a href="#" id="md-btn--polygon" class="md-btn${sel}">Polygon</a>
                    `;
                    break;
                case "contour":
                    if (ul.annotation_state["mode"] == "contour") {
                        sel = " sel";
                    }
                    ap_html = `
                        <a href="#" id="md-btn--contour" class="md-btn${sel}">Contour</a>
                    `;
                    break;
            }
            $("#" + sp_id + " .toolbox_inner_cls").append(ap_html);
        }
        // TODO noconflict
        $("#" + sp_id + " .toolbox_inner_cls").append(`
            <a href="#" id="submit-button">Submit</a>
        `);

        // Make sure that entire toolbox is shown
        if ($("#" + ul.config["toolbox_id"] + " .toolbox_inner_cls").height() > $("#" + ul.container_id).height()) {
            $("#" + ul.config["toolbox_id"]).css("overflow-y", "scroll");
        }
    }
    
    static build_id_dialog(ul) {
        const id = ul.id_dialog_config["id"];
        const wdt = ul.id_dialog_config["outer_diameter"];
        // TODO noconflict
        var dialog_html = `
        <div id="${id}" class="id_dialog" style="width: ${wdt}px; height: ${wdt}px;">
            <svg width="${wdt}" height="${wdt}">
        `;
        const center_coord = wdt/2;
        var colors = [];
        if (ul.config["taxonomy"] != null) {
            for (var txi = 0; txi < ul.config["taxonomy"].length; txi++) {
                colors.push(ul.config["taxonomy"][txi]["color"]);
            }
        }

        // TODO real names here!
        const names = ul.id_dialog_config["names"];
        const inner_rad = 0.25*wdt;
        const outer_rad = 0.5*wdt;
        const totdist = 2*Math.PI*inner_rad;

        const ths_pct = totdist/colors.length;
        const gap_pct = totdist - ths_pct;
        const srt_wdt = 2*(outer_rad - inner_rad)/colors.length;
        const ful_wdt = 2*(outer_rad - inner_rad);
        const cl_opacity = 0.4;
        for (var i = 0; i < colors.length; i++) {
            let cum_pct = i*ths_pct;
            let ths_col = colors[i];
            let ths_nam = names[i];
            dialog_html += `
            <circle
                r="${inner_rad}" cx="${center_coord}" cy="${center_coord}" 
                stroke="${ths_col}" 
                stroke-opacity="${cl_opacity}"
                stroke-width="${ful_wdt}"; 
                stroke-dasharray="${ths_pct} ${gap_pct}" 
                stroke-dashoffset="${cum_pct}" />
            <circle
                id="circ_${ths_nam}"
                r="${inner_rad}" cx="${center_coord}" cy="${center_coord}"
                stroke="${ths_col}" 
                stroke-opacity="1"
                stroke-width="${srt_wdt}" 
                stroke-dasharray="${ths_pct} ${gap_pct}" 
                stroke-dashoffset="${cum_pct}" />
            `;
        }
        dialog_html += `
                <circle fill="black" class="centcirc" r="${inner_rad}" cx="${center_coord}" cy="${center_coord}" />
            </svg>
        </div>`;
        $("#" + ul.config["imwrap_id"]).append(dialog_html);
        ul.viewer_state["visible_dialogs"].push({
            "id": "id_dialog",
            "left": 0.0,
            "top": 0.0,
            "pin": "center"
        });
    }
    
    static build_edit_suggestion(ul) {
        // TODO noconflict
        $("#" + ul.config["imwrap_id"]).append(`
            <a href="#" id="edit_suggestion" class="editable"></a>
        `);
        ul.viewer_state["visible_dialogs"].push({
            "id": "edit_suggestion",
            "left": 0.0,
            "top": 0.0,
            "pin": "center"
        });
    }

    static create_listeners(ul) {

        // ================= Mouse Events in the ID Dialog ================= 
        
        var iddg = $("#" + ul.id_dialog_config["id"]);

        // Hover interactions

        iddg.on("mousemove", function(mouse_event) {
            ul.handle_id_dialog_hover(mouse_event);
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
        
        // Mouse movement has meaning in certain cases
        annbox.mousemove(function(mouse_event) {
            ul.handle_mouse_move(mouse_event);
        });
        
        // Detection ctrl+scroll
        document.getElementById(ul.config["annbox_id"]).onwheel = function (wheel_event) {
            if (wheel_event.ctrlKey) {
                // Prevent scroll-zoom
                wheel_event.preventDefault();

                // Get direction of wheel
                const dlta = Math.sign(wheel_event.deltaY);

                // Apply new zoom
                ul.viewer_state["zoom_val"] *= (1 + dlta/10);
                ul.rezoom(wheel_event.screenX, wheel_event.screenY);
            } 
        };
        
        // TODO better understand which browsers support this (new Chrome does)
        new ResizeObserver(function() {
            ul.reposition_dialogs();
        }).observe(document.getElementById(ul.config["imwrap_id"]));


        // Buttons to change annotation mode
        $("a.md-btn").click(function(mouse_event) {
            var new_mode = mouse_event.target.id.split("--")[1];
            ul.annotation_state["mode"] = new_mode;
            $("a.md-btn.sel").removeClass("sel");
            $("#" + mouse_event.target.id).addClass("sel");
        });

        // Button to save annotations
        $("a#submit-button").on("click", function() {
            var submit_payload = {
                "task_meta": ul.config["task_meta"],
                "annotations": []
            };
            for (var i = 0; i < ul.annotations["ordering"].length; i++) {
                submit_payload["annotations"].push(ul.annotations["access"][ul.annotations["ordering"][i]]);
            }
            ul.config["done_callback"](submit_payload);
        });

        // Keyboard only events
        document.onkeypress = function(keypress_event) {
            const shift = keypress_event.shiftKey;
            const ctrl = keypress_event.ctrlKey;
            if ((keypress_event.key == "z" || keypress_event.key == "Z") && ctrl) {
                if (shift) {
                    ul.redo();
                }
                else {
                    ul.undo();
                }
            }
        };
    }

    static compile_configuration(ul) {
        // Make sure taxonomy exists, and 
        // determine whether we're in single class mode
        let ret = {};
        if (ul.config["taxonomy"] == null) {
            // TODO this error should probably be the behavior sometime in the future.
            // let msg = "Taxonomy must be non-null";
            // console.log(msg);
            // throw new Error(msg);

            // For now, default to weed detection
            ret["single_class_mode"] = true;
            ul.config["taxonomy"] = [
                {
                    "type": "class",
                    "id": 2
                }
            ];
            ul.config["class_defs"] = {
                "1": {
                    "name": "Weed",
                    "color": "orange"
                }
            };
        }
        else {
            ret["single_class_mode"] = (
                (ul.config["taxonomy"].length == 1) && 
                (ul.config["taxonomy"][0]["type"] == "class")
            );
        }
        if (!ret["single_class_mode"]) {
            let msg = "Currently only single class mode is supported";
            console.log(msg);
            throw new Error(msg);
        }
        return ret;
    }

    // ================= Construction/Initialization =================
        
    constructor(container_id, image_url, annotator, taxonomy, class_defs, save_callback, exit_callback, done_callback, allowed_modes, resume_from=null, task_meta=null, annotation_meta=null) {
        // Store config data
        this.container_id = container_id; // TODO make sure the element exists, and get its dimensions
        this.taxonomy = taxonomy; // TODO make sure classes are defined in class defs
        this.allowed_modes = allowed_modes; // TODO error check -- make sure they exist
        this.resume_from = resume_from; // TODO validate
        this.image_url = image_url; // TODO make sure image exists and load it
        this.image = null;

        if (task_meta == null) {
            task_meta = {};
        }
        if (annotation_meta == null) {
            annotation_meta = {};
        }

        // Store tool configuration
        this.config = {
            "container_id": container_id,
            "annbox_id": "annbox", // TODO noconfict
            "imwrap_id": "imwrap", // TODO noconfict
            "canvas_fid": "front-canvas", // TODO noconflict
            "canvas_bid": "back-canvas", // TODO noconflict
            "canvas_class": "easel", // TODO noconflict
            "image_id": "ann_image", // TODO noconflict
            "imgsz_class": "imgsz", // TODO noconflict
            "toolbox_id": "toolbox", // TODO noconflict
            "image_url": image_url,
            "image_width": null,
            "image_height": null,
            "annotator": annotator,
            "class_defs": class_defs,
            "taxonomy": taxonomy,
            "save_callback": save_callback,
            "exit_callback": exit_callback,
            "done_callback": done_callback,
            "resume_from": resume_from,
            "allowed_modes": allowed_modes,
            "default_annotation_color": "#fa9d2a",
            "annotation_meta": annotation_meta,
            "task_meta": task_meta
        };

        // Store ID dialog configuration
        this.id_dialog_config = {
            "id": "id_dialog", // TODO noconflict
            "names": ULabel.get_dialog_names(this.config["taxonomy"]),
            "colors": ULabel.get_dialog_colors(this.config["taxonomy"]),
            "cl_opacity": 0.4,
            "outer_diameter": 400
        };

        // Finished storing configuration. Make sure it's valid
        // Store frequent check values for performance
        this.compiled_config = ULabel.compile_configuration(this);
        
        // Store state of ID dialog element
        // TODO much more here when full interaction is built
        this.id_dialog_state = {
            "associated_annotation": null,
            "edit_suggestion_point": null
        };

        // Create object for current ulabel state
        this.viewer_state = {
            "zoom_val": 1.0,
            "visible_dialogs": []
        };

        // Create object for dragging interaction state
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
            }
        };
        
        // Canvasses' display/drawing states
        this.canvas_state = {
            "front_context": null,
            "back_context": null
        };
        
        // State data for annotation interactions
        this.annotation_state = {
            "mode": this.config["allowed_modes"][0],
            "active_id": null,
            "is_in_progress": false,
            "is_in_edit": false,
            "edit_candidate": null,
            "undone_stack": []
        };
        
        // Create holder for annotations
        this.annotations = {
            "ordering": [],
            "access": {}
        };
        // If resuming from not null, then set and draw prior annotations        
        if (this.config["resume_from"] != null) {
            for (var i = 0; i < this.config["resume_from"]["annotations"].length; i++) {
                this.annotations["ordering"].push(this.config["resume_from"][i]["id"]);
                this.annotations["access"][this.config["resume_from"][i]["id"]] = this.config["resume_from"][i];
                this.annotations["access"][this.config["resume_from"][i]["id"]]["new"] = false;
            }
            this.redraw_all_annotations();
        }

        // Indicate that object must be "init" before use!
        this.is_init = false;
    }

    init(callback) {
        // Place image element
        ULabel.prep_window_html(this);        

        // Get image details
        var image = document.getElementById(this.config["image_id"]);

        var that = this;
        image.onload = function() {
            that.config["image_height"] = image.naturalHeight;
            that.config["image_width"] = image.naturalWidth;
    
            $("#" + that.config["imwrap_id"]).append(`
                <canvas 
                    id="${that.config["canvas_bid"]}" 
                    class="${that.config["canvas_class"]} ${that.config["imgsz_class"]} canvas_cls" 
                    height=${that.config["image_height"]} 
                    width=${that.config["image_width"]}></canvas>
                <canvas 
                    id="${that.config["canvas_fid"]}" 
                    class="${that.config["canvas_class"]} ${that.config["imgsz_class"]} canvas_cls" 
                    height=${that.config["image_height"]} 
                    width=${that.config["image_width"]} 
                    oncontextmenu="return false"></canvas>
            `);
    
            // Get canvas contexts
            that.canvas_state["front_context"] = document.getElementById(
                that.config["canvas_fid"]
            ).getContext("2d");
            that.canvas_state["back_context"] = document.getElementById(
                that.config["canvas_bid"]
            ).getContext("2d");
    
            // Add the HTML for the ID dialog to the window
            ULabel.build_id_dialog(that);
            
            // Add the HTML for the edit suggestion to the window
            ULabel.build_edit_suggestion(that);
            
            // Create listers to manipulate and export this object
            ULabel.create_listeners(that);
            
            // Indicate that the object is now init!
            that.is_init = true;
    
            // TODO why is this necessary?
            // that.viewer_state["zoom_val"] = that.get_empirical_scale();
            that.rezoom(0, 0);
    
            // Call the user-provided callback
            callback.bind(that);
        }
    }

    // ================= Instance Utilities =================

    // A robust measure of zoom
    get_empirical_scale() {
        // Simple ratio of canvas width to image x-dimension
        return $("#" + this.config["canvas_fid"]).width()/this.config["image_width"];
    }

    // Get a unique ID for new annotations
    make_new_annotation_id() {
        var unq_str = uuidv4();
        return unq_str;
    }

    // Get the start of a spatial payload based on mouse event and current annotation mode
    get_init_spatial(mouse_event, annotation_mode) {
        var mouse_loc = [
            this.get_global_mouse_x(mouse_event),
            this.get_global_mouse_y(mouse_event)
        ];
        switch (annotation_mode) {
            case "bbox":
                return [
                    mouse_loc,
                    mouse_loc
                ];
            case "polygon":
            case "contour":
                return [
                    mouse_loc,
                    mouse_loc
                ];
            default:
                // TODO broader refactor of error handling and detecting/preventing corruption
                this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                return null;
        }
    }

    // ================= Access string utilities =================

    // Access a point in a spatial payload using access string
    get_with_access_string(annid, access_str) {
        switch (this.annotations["access"][annid]["spatial_type"]) {
            case "bbox":
                const bbi = parseInt(access_str[0], 10);
                const bbj = parseInt(access_str[1], 10);
                let bbox_pts = this.annotations["access"][annid]["spatial_payload"];
                return [bbox_pts[bbi][0], bbox_pts[bbj][1]];
            case "polygon":
                const bas = parseInt(access_str, 10);
                const dif = parseFloat(access_str) - bas;
                if (dif < 0.005) {
                    return this.annotations["access"][annid]["spatial_payload"][bas];
                }
                else {
                    return ULabel.interpolate_poly_segment(
                        this.annotations["access"][annid]["spatial_payload"], 
                        bas, dif
                    );
                }
            default:
                this.raise_error(
                    "Unable to apply access string to annotation of type " + this.annotations["access"][annid]["spatial_type"],
                    ULabel.elvl_standard
                );
        }
    }
    
    // Set a point in a spatial payload using access string
    set_with_access_string(annid, access_str, val) {
        switch (this.annotations["access"][annid]["spatial_type"]) {
            case "bbox":
                var bbi = parseInt(access_str[0], 10);
                var bbj = parseInt(access_str[1], 10);
                this.annotations["access"][annid]["spatial_payload"][bbi][0] = val[0];
                this.annotations["access"][annid]["spatial_payload"][bbj][1] = val[1];
                break;
            case "polygon":
                var bas = parseInt(access_str, 10);
                var dif = parseFloat(access_str) - bas;
                if (dif < 0.005) {
                    var acint = parseInt(access_str, 10);
                    var npts = this.annotations["access"][annid]["spatial_payload"].length;
                    if ((acint == 0) || (acint == (npts - 1))) {
                        this.annotations["access"][annid]["spatial_payload"][0] = val;
                        this.annotations["access"][annid]["spatial_payload"][npts - 1] = val;
                    }
                    else {
                        this.annotations["access"][annid]["spatial_payload"][acint] = val;
                    }
                }
                else {
                    var newpt = ULabel.interpolate_poly_segment(
                        this.annotations["access"][annid]["spatial_payload"], 
                        bas, dif
                    );
                    this.annotations["access"][annid]["spatial_payload"].splice(bas+1, 0, newpt);
                }
                break;
            default:
                this.raise_error(
                    "Unable to apply access string to annotation of type " + this.annotations["access"][annid]["spatial_type"],
                    ULabel.elvl_standard
                );
        }
    }

    // ================= Drawing Functions =================

    draw_bounding_box(annotation_object) {
        // TODO buffered contexts
        let ctx = this.canvas_state["front_context"];
    
        // TODO do we want variable widths?
        const lnwidth = 10.0;
    
        // TODO draw annotation according to id payload colors
        // Prep for bbox drawing
        ctx.fillStyle = this.config["default_annotation_color"];
        ctx.strokeStyle = this.config["default_annotation_color"];
        ctx.lineJoin = "round";
        ctx.lineWidth = lnwidth;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const sp = annotation_object["spatial_payload"][0];
        const ep = annotation_object["spatial_payload"][1];
        ctx.beginPath();
        ctx.moveTo(sp[0], sp[1]);
        ctx.lineTo(sp[0], ep[1]);
        ctx.lineTo(ep[0], ep[1]);
        ctx.lineTo(ep[0], sp[1]);
        ctx.lineTo(sp[0], sp[1]);
        ctx.closePath();
        ctx.stroke();
    }
    
    draw_polygon(annotation_object) {
        // TODO buffered contexts
        let ctx = this.canvas_state["front_context"];
    
        // TODO do we want variable widths?
        const lnwidth = 10.0;
    
        // TODO draw annotation according to id payload colors
        // Prep for bbox drawing
        ctx.fillStyle = this.config["default_annotation_color"];
        ctx.strokeStyle = this.config["default_annotation_color"];
        ctx.lineJoin = "round";
        ctx.lineWidth = lnwidth;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const pts = annotation_object["spatial_payload"];
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var pti = 1; pti < pts.length; pti++) {
            ctx.lineTo(pts[pti][0], pts[pti][1]);
        }
        ctx.stroke();
    }
    
    draw_contour(annotation_object) {
        // TODO buffered contexts
        let ctx = this.canvas_state["front_context"];
    
        // TODO do we want variable widths?
        const lnwidth = 10.0;
    
        // TODO draw annotation according to id payload colors
        // Prep for bbox drawing
        ctx.fillStyle = this.config["default_annotation_color"];
        ctx.strokeStyle = this.config["default_annotation_color"];
        ctx.lineJoin = "round";
        ctx.lineWidth = lnwidth;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const pts = annotation_object["spatial_payload"];
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var pti = 1; pti < pts.length; pti++) {
            ctx.lineTo(pts[pti][0], pts[pti][1]);
        }
        ctx.stroke();
    }
    
    draw_annotation(annotation_id) {
        // Get actual annotation object
        var annotation_object = this.annotations["access"][annotation_id];
    
        // DEBUG left here for refactor reference, but I don't think it's needed moving forward
        //    there may be a use case for drawing depreacted annotations 
        // Don't draw if deprecated
        if (annotation_object["deprecated"]) return;
    
        // Dispatch to annotation type's drawing function
        switch (annotation_object["spatial_type"]) {
            case "bbox":
                this.draw_bounding_box(annotation_object);
                break;
            case "polygon":
                this.draw_polygon(annotation_object);
                break;
            case "contour":
                this.draw_contour(annotation_object);
                break;
            default:
                this.raise_error("Warning: Annotation " + annotation_object["id"] + " not understood", ULabel.elvl_info);
                break;
        }
    }
    
    // Draws the first n annotations on record
    draw_n_annotations(n) {
        for (var i = 0; i < n; i++) {
            this.draw_annotation(this.annotations["ordering"][i]);
        }
    }
    
    redraw_all_annotations() {
        // Clear the canvas
        this.canvas_state["front_context"].clearRect(0, 0, this.config["image_width"], this.config["image_height"]);
    
        // Draw them all again
        this.draw_n_annotations(this.annotations["ordering"].length);
    }

    // ================= On-Canvas HTML Dialog Utilities =================

    // When a dialog is created or its position changes, make sure all
    // dialogs that are meant to be visible are in their correct positions
    reposition_dialogs() {
        // Get info about image wrapper
        var imwrap = $("#" + this.config["imwrap_id"]);
        const new_dimx = imwrap.width();
        const new_dimy = imwrap.height();

        // Iterate over all visible dialogs and apply new positions
        // TODO convert this to dict, only reposition the necessary ones
        for (var i = 0; i < this.viewer_state["visible_dialogs"].length; i++) {
            let el = this.viewer_state["visible_dialogs"][i];
            let jqel = $("#" + el["id"]);
            let new_left = el["left"]*new_dimx;
            let new_top = el["top"]*new_dimy;
            switch(el["pin"]) {
                case "center":
                    new_left -= jqel.width()/2;
                    new_top -= jqel.height()/2;
                    break;
                case "top-left":
                    // No need to adjust for a top left pin
                default:
                    break;
            }
            
            // Enforce that position be on the underlying image
            // TODO
            
            // Apply new position
            jqel.css("left", new_left + "px");
            jqel.css("top",  new_top + "px");    
        }
    }

    create_polygon_ender(mouse_event, polygon_id) {
        // Create ender id
        const ender_id = "ender_" + polygon_id;
    
        // Build ender html
        const ender_html = `
        <a href="#" id="${ender_id}" class="ender_outer">
            <span id="${ender_id}" class="ender_inner"></span>
        </a>
        `;
        $("#" + this.config["imwrap_id"]).append(ender_html);
    
        // Add this id to the list of dialogs with managed positions
        this.viewer_state["visible_dialogs"].push({
            "id": ender_id,
            "left": this.get_global_mouse_x(mouse_event)/this.config["image_width"],
            "top": this.get_global_mouse_y(mouse_event)/this.config["image_height"],
            "pin": "center"
        });
        this.reposition_dialogs();
    }
    
    show_edit_suggestion(nearest_point, currently_exists) {
        var esjq = $("#edit_suggestion");
        esjq.css("display", "block");
        if (currently_exists) {
            esjq.removeClass("soft");
        }
        else {
            esjq.addClass("soft");
        }
        for (var vdgi = 0; vdgi < this.viewer_state["visible_dialogs"].length; vdgi++) {
            if (this.viewer_state["visible_dialogs"][vdgi]["id"] == "edit_suggestion") {
                this.viewer_state["visible_dialogs"][vdgi]["left"] = nearest_point["point"][0]/this.config["image_width"];
                this.viewer_state["visible_dialogs"][vdgi]["top"] = nearest_point["point"][1]/this.config["image_height"];
                break;
            }
        }
        this.reposition_dialogs();
    }
    
    hide_edit_suggestion() {
        $("#edit_suggestion").css("display", "none");
    }


    // ================= Annotation Utilities =================
    
    undo() {
        if (this.annotation_state["active_id"] != null) {
            this.annotation_state["active_id"] = null;
            this.annotation_state["is_in_edit"] = false;
            this.annotation_state["is_in_progress"] = false;
        }
        if (this.annotations["ordering"].length > 0) {
            this.annotation_state["undone_stack"].push(this.annotations["ordering"].pop());
            this.redraw_all_annotations();
        }
    }

    redo() {
        if (this.annotation_state["undone_stack"].length > 0) {
            this.annotations["ordering"].push(this.annotation_state["undone_stack"].pop());
            this.redraw_all_annotations();
        }
    }

    get_nearest_active_keypoint(global_x, global_y, max_dist) {
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist/this.get_empirical_scale(),
            "point": null
        };
        // Iterate through and find any close enough defined points
        var edid = null;
        for (var edi = 0; edi < this.annotations["ordering"].length; edi++) {
            edid = this.annotations["ordering"][edi];
            let npi = null;
            switch (this.annotations["access"][edid]["spatial_type"]) {
                case "bbox":
                    npi = ULabel.get_nearest_point_on_bounding_box(
                        global_x, global_y, 
                        this.annotations["access"][edid]["spatial_payload"],
                        max_dist
                    );
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "polygon":
                    npi = ULabel.get_nearest_point_on_polygon(
                        global_x, global_y, 
                        this.annotations["access"][edid]["spatial_payload"],
                        max_dist, false
                    );
                    if (npi["distance"] < ret["distance"]) {
                        ret["annid"] = edid;
                        ret["access"] = npi["access"];
                        ret["distance"] = npi["distance"];
                        ret["point"] = npi["point"];
                    }
                    break;
                case "contour":
                    // Not editable at the moment (TODO)
                    break;
            }
        }
        if (ret["annid"] == null) {
            return null;
        }
        return ret;
    }
    
    get_nearest_segment_point(global_x, global_y, max_dist) {
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist/this.get_empirical_scale(),
            "point": null
        };
        for (var edi = 0; edi < this.annotations["ordering"].length; edi++) {
            var edid = this.annotations["ordering"][edi];
            switch (this.annotations["access"][edid]["spatial_type"]) {
                case "bbox":
                    // Can't propose new bounding box points
                    break;
                case "polygon":
                    var npi = ULabel.get_nearest_point_on_polygon(
                        global_x, global_y, 
                        this.annotations["access"][edid]["spatial_payload"],
                        max_dist, true
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
            }
        }
        if (ret["annid"] == null) {
            return null;
        }
        return ret;
    }
    
    begin_annotation(mouse_event) {
        this.annotation_state["undone_stack"] = [];

        // Give the new annotation a unique ID
        const unq_id = this.make_new_annotation_id();

        // Add this annotation to annotations object
        this.annotations["access"][unq_id] = {
            "id": unq_id,
            "new": true,
            "parent_id": null,
            "created_by": this.config["annotator"],
            "created_at": ULabel.get_time(),
            "deprecated": false,
            "spatial_type": this.annotation_state["mode"],
            "spatial_payload": this.get_init_spatial(mouse_event, this.annotation_state["mode"]),
            "classification_payloads": null
        };
        for (const [key, value] of Object.entries(this.config["annotation_meta"])) {
            this.annotations["access"][unq_id][key] = value;
        }
        this.annotations["ordering"].push(unq_id);
    
        // If a polygon was just started, we need to add a clickable to end the shape
        if (this.annotation_state["mode"] == "polygon") {
            this.create_polygon_ender(mouse_event, unq_id);
        }
    
        // Draw annotation, and set state to annotation in progress
        this.draw_annotation(unq_id);
        this.annotation_state["active_id"] = unq_id;
        this.annotation_state["is_in_progress"] = true;
    }

    continue_annotation(mouse_event, isclick=false) {
        // Convenience
        const actid = this.annotation_state["active_id"];
        // TODO big performance gains with buffered canvasses
        if (actid && (actid)) {
            const ms_loc = [
                this.get_global_mouse_x(mouse_event),
                this.get_global_mouse_y(mouse_event)
            ];
            // Handle annotation continuation based on the annotation mode
            switch (this.annotations["access"][actid]["spatial_type"]) {
                case "bbox":
                    this.annotations["access"][actid]["spatial_payload"][1] = ms_loc;
                    this.redraw_all_annotations(); // tobuffer
                    break;
                case "polygon":
                    // Store number of keypoints for easy access
                    const n_kpts = this.annotations["access"][actid]["spatial_payload"].length;

                    // If hovering over the ender, snap to its center
                    const ender_pt = this.annotations["access"][actid]["spatial_payload"][0];
                    const ender_dist = Math.pow(Math.pow(ms_loc[0] - ender_pt[0], 2) + Math.pow(ms_loc[1] - ender_pt[1], 2), 0.5);
                    const ender_thresh = $("#ender_" + actid).width()/(2*this.get_empirical_scale());
                    if (ender_dist < ender_thresh) {
                        this.annotations["access"][actid]["spatial_payload"][n_kpts-1] = ender_pt;
                    }
                    else { // Else, just redirect line to mouse position
                        this.annotations["access"][actid]["spatial_payload"][n_kpts-1] = ms_loc;
                    }

                    // If this mouse event is a click, add a new member to the list of keypoints 
                    //    ender clicks are filtered before they get here
                    if (isclick) {
                        this.annotations["access"][actid]["spatial_payload"].push(ms_loc);
                    }
                    this.redraw_all_annotations(); // tobuffer
                    break;
                case "contour":
                    this.annotations["access"][actid]["spatial_payload"].push(ms_loc);
                    this.redraw_all_annotations(); // TODO tobuffer, no need to redraw here, can just draw over
                    break;
                default:
                    this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                    break;
            }
        }
    }
    
    begin_edit(mouse_event) {
        this.annotation_state["active_id"] = this.annotation_state["edit_candidate"]["annid"];
        this.annotation_state["is_in_edit"] = true;
        this.edit_annotation(mouse_event);
        this.suggest_edits(mouse_event);
    }
    
    edit_annotation(mouse_event, isclick=false) {
        // Convenience
        const actid = this.annotation_state["active_id"];
        // TODO big performance gains with buffered canvasses
        if (actid && (actid !== null)) {
            var ms_loc = [
                this.get_global_mouse_x(mouse_event),
                this.get_global_mouse_y(mouse_event)
            ];
            // Clicks are handled elsewhere
            switch (this.annotations["access"][actid]["spatial_type"]) {
                case "bbox":
                    this.set_with_access_string(actid, this.annotation_state["edit_candidate"]["access"], ms_loc);
                    this.redraw_all_annotations(); // tobuffer
                    this.annotation_state["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.annotation_state["edit_candidate"], true);
                    break;
                case "polygon":
                    this.set_with_access_string(actid, this.annotation_state["edit_candidate"]["access"], ms_loc);
                    this.redraw_all_annotations(); // tobuffer
                    this.annotation_state["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.annotation_state["edit_candidate"], true);
                    // this.suggest_edits(mouse_event);
                    break;
                case "contour":
                    // TODO contour editing
                    this.raise_error("Annotation mode is not currently editable", ULabel.elvl_info);
                    break;
                default:
                    this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                    break;
            }
        }
    }
    
    finish_annotation(mouse_event) {
        // Convenience
        const actid = this.annotation_state["active_id"];
        // Record last point and redraw if necessary
        switch (this.annotations["access"][actid]["spatial_type"]) {
            case "polygon":
                const n_kpts = this.annotations["access"][actid]["spatial_payload"].length;
                const start_pt = this.annotations["access"][actid]["spatial_payload"][0];
                this.annotations["access"][actid]["spatial_payload"][n_kpts-1] = start_pt;
                this.redraw_all_annotations(); // tobuffer
                $("#ender_" + actid).remove(); // TODO remove from visible dialogs
            case "bbox":
            case "contour":
                 // tobuffer this is where the annotation moves to back canvas
            default:
                break;
        }
    
        // If ID has not been assigned to this annotation, build a dialog for it
        // if (this.annotations["access"][actid]["classification_payloads"] == null) {
        //     this.show_id_dialog(mouse_event, actid);
        // }
        // TODO build a dialog here when necessary
        if (this.compiled_config["single_class_mode"]) {
            this.annotations["access"][actid]["classification_payloads"] = [
                {
                    "class_id": this.config["taxonomy"][0]["id"],
                    "confidence": 1.0
                }
            ]
        }
    
        // Set mode to no active annotation
        this.annotation_state["active_id"] = null;
        this.annotation_state["is_in_progress"] = false;
    }
    
    finish_edit(mouse_event) {
        // Record last point and redraw if necessary
        switch (this.annotations["access"][this.annotation_state["active_id"]]["spatial_type"]) {
            case "polygon":
            case "bbox":
            case "contour":
                 // tobuffer this is where the annotation moves to back canvas
            default:
                break;
        }
    
        // Set mode to no active annotation
        this.annotation_state["active_id"] = null;
        this.annotation_state["is_in_edit"] = false;
    }
    
    suggest_edits(mouse_event) {
        // TODO better dynamic handling of the size of the suggestion queue
        const dst_thresh = 20;
        const global_x = this.get_global_mouse_x(mouse_event);
        const global_y = this.get_global_mouse_y(mouse_event);
        
        // Look for an existing point that's close enough to suggest editing it
        const nearest_active_keypoint = this.get_nearest_active_keypoint(global_x, global_y, dst_thresh);
        if (nearest_active_keypoint != null) {
            this.annotation_state["edit_candidate"] = nearest_active_keypoint;
            this.show_edit_suggestion(nearest_active_keypoint, true);
        }
        else { // If none are found, look for a point along a segment that's close enough
            const nearest_segment_point = this.get_nearest_segment_point(global_x, global_y, dst_thresh);
            if (nearest_segment_point != null) {
                this.annotation_state["edit_candidate"] = nearest_segment_point;
                this.show_edit_suggestion(nearest_segment_point, false);
            }
            else {
                this.hide_edit_suggestion();
            }
        }
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
                break;
        }
    }

    // ================= Mouse event interpreters =================
    
    // Get the mouse position on the screen
    get_global_mouse_x(mouse_event) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        return (mouse_event.pageX - annbox.offset().left + annbox.scrollLeft())/scale;
    }
    get_global_mouse_y(mouse_event) {
        const scale = this.get_empirical_scale();
        const annbox = $("#" + this.config["annbox_id"]);
        return (mouse_event.pageY - annbox.offset().top + annbox.scrollTop())/scale;
    }

    // ================= Dialog Interaction Handlers =================

    // ----------------- ID Dialog -----------------

    handle_id_dialog_hover(mouse_event) {
        // Get mouse position relative to center of div
        const idd_x = mouse_event.offsetX - this.id_dialog_config["outer_diameter"]/2;
        const idd_y = mouse_event.offsetY - this.id_dialog_config["outer_diameter"]/2;
    
        // Useful for interpreting mouse loc
        const inner_rad = 0.25*this.id_dialog_config["outer_diameter"];
        const outer_rad = 0.5*this.id_dialog_config["outer_diameter"];
    
        // Get radius
        const mouse_rad = Math.sqrt(Math.pow(idd_x, 2) + Math.pow(idd_y, 2));
    
        // If not inside, return
        if (mouse_rad > outer_rad) {
            return;
        }
    
        // If in the core, return
        if (mouse_rad < inner_rad) {
            return;
        }
    
        // Get array of classes by name in the dialog
        //    TODO handle nesting case
        const names = this.id_dialog_config["names"];
    
        // Get the index of that class currently hovering over
        const class_ind = (
            -1*Math.floor(
                Math.atan2(idd_y, idd_x)/(2*Math.PI)*names.length
            ) + names.length
        )%names.length;
    
        // Get the distance proportion of the hover
        const dist_prop = (mouse_rad - inner_rad)/(outer_rad - inner_rad);
    
        // Recompute and render opaque pie slices
        for (var i = 0; i < names.length; i++) {
            var circ = document.getElementById("circ_" + names[i]);
            if (i == class_ind) {
                circ.setAttribute("stroke-width", dist_prop*(outer_rad - inner_rad)*2);
            }
            else {
                circ.setAttribute("stroke-width", (1-dist_prop)/(names.length-1)*(outer_rad - inner_rad)*2);
            }
        }
    }
    
    // ================= Viewer/Annotation Interaction Handlers  ================= 
    
    handle_mouse_down(mouse_event) {
        const drag_key = ULabel.get_drag_key_start(mouse_event, this);
        if (drag_key != null) {
            mouse_event.preventDefault();
            if (this.drag_state["active_key"] == null) {
                this.start_drag(drag_key, mouse_event.button, mouse_event);
            }
        }
    }
    
    handle_mouse_move(mouse_event) {
        // If the ID dialog is visible, let it's own handler take care of this
        if (this.id_dialog_state["visible"]) {
            return;
        }
        // If not dragging...
        if (this.drag_state["active_key"] == null) {
            // If polygon is in progress, redirect last segment
            if (this.annotation_state["is_in_progress"]) {
                if (this.annotation_state["mode"] == "polygon") { 
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
                    this.continue_annotation(mouse_event);
                    break;
                case "edit":
                    this.edit_annotation(mouse_event);
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
            mouse_event.screenX,
            mouse_event.screenY
        ];
        this.drag_state[drag_key]["zoom_val_start"] = this.viewer_state["zoom_val"];
        this.drag_state[drag_key]["offset_start"] = [
            annbox.scrollLeft(), 
            annbox.scrollTop()
        ];
        
        // TODO handle this drag start
        switch (drag_key) {
            case "annotation":
                if (this.annotation_state["mode"] != "polygon") {
                    this.begin_annotation(mouse_event);
                }
                break;
            case "edit":
                this.begin_edit(mouse_event);
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
                if (this.annotation_state["active_id"] != null) {
                    if (this.annotation_state["mode"] != "polygon") {
                        this.finish_annotation(mouse_event);
                    }
                    else {
                        if (mouse_event.target.id == "ender_" + this.annotation_state["active_id"]) {
                            this.finish_annotation(mouse_event);
                        }
                        else {
                            this.continue_annotation(mouse_event, true);
                        }
                    }
                }
                else {
                    if (this.annotation_state["mode"] == "polygon") {
                        this.begin_annotation(mouse_event);
                    }
                }
                break;
            case "edit":
                // TODO should be finish edit, right?
                this.finish_edit(mouse_event);
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
        const aX = mouse_event.screenX;
        const aY = mouse_event.screenY;
        annbox.scrollLeft(
            this.drag_state["pan"]["offset_start"][0] + (this.drag_state["pan"]["mouse_start"][0] - aX)
        );
        annbox.scrollTop(
            this.drag_state["pan"]["offset_start"][1] + (this.drag_state["pan"]["mouse_start"][1] - aY)
        );
    }
    
    // Handle zooming by click-drag
    drag_rezoom(mouse_event) {
        const aY = mouse_event.screenY;
        this.viewer_state["zoom_val"] = (
            this.drag_state["zoom"]["zoom_val_start"]*Math.pow(
                1.1, (aY - this.drag_state["zoom"]["mouse_start"][1])/10
            )
        );
        this.rezoom(this.drag_state["zoom"]["mouse_start"][0], this.drag_state["zoom"]["mouse_start"][1]);
    }
    
    // Handle zooming at a certain focus
    rezoom(foc_x, foc_y) {
        // Get old size and position
        var imwrap = $("#" + this.config["imwrap_id"]);
        var annbox = $("#" + this.config["annbox_id"]);
        const old_width = imwrap.width();
        const old_height = imwrap.height();
        const old_left = annbox.scrollLeft();
        const old_top = annbox.scrollTop();

        // Compute new size
        const new_width = Math.round(this.config["image_width"]*this.viewer_state["zoom_val"]);
        const new_height = Math.round(this.config["image_height"]*this.viewer_state["zoom_val"]);

        // Apply new size
        var toresize = $("." + this.config["imgsz_class"]);
        toresize.css("width", new_width + "px");
        toresize.css("height", new_height + "px");

        // Compute and apply new position
        annbox.scrollLeft(Math.round((old_left + foc_x)*new_width/old_width - foc_x));
        annbox.scrollTop(Math.round((old_top + foc_y)*new_height/old_height - foc_y));
    }
}
