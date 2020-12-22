/*
Uncertain Labeling Tool
Sentera Inc.
*/

/* global $ */
/* global Image */
/* global ResizeObserver */
/* global uuidv4 */

const DEMO_ANNOTATION = {"id":"7c64913a-9d8c-475a-af1a-658944e37c31","new":true,"parent_id":null,"created_by":"TestUser","created_at":"2020-12-21T02:41:47.304Z","deprecated":false,"spatial_type":"contour","spatial_payload":[[4,25],[4,25],[4,24],[4,23],[4,22],[4,22],[5,22],[5,21],[5,20],[6,20],[6,19],[7,19],[7,18],[8,18],[8,18],[10,18],[11,18],[11,17],[12,17],[12,16],[12,16],[13,16],[14,15],[16,14],[16,14],[17,14],[18,14],[18,13],[19,13],[20,13],[20,13],[21,13],[22,13],[23,13],[24,13],[24,13],[25,13],[26,13],[27,13],[28,13],[28,13],[29,13],[30,13],[31,13],[32,13],[34,13],[36,14],[36,14],[37,15],[40,15],[40,16],[41,16],[42,17],[43,17],[44,18],[44,18],[45,18],[46,18],[47,18],[47,18],[48,18],[48,18],[49,19],[50,20],[52,20],[52,20],[53,21],[54,21],[55,21],[56,21],[57,21],[58,22],[59,22],[60,22],[60,22],[61,22],[63,22],[64,22],[64,22],[65,22],[66,22],[67,22],[68,22],[68,21],[69,21],[70,20],[70,19],[71,19],[71,18],[72,18],[72,18],[72,18],[73,18],[75,17],[75,16],[76,16],[76,16],[76,15],[77,14],[78,14],[79,14],[79,13],[79,12],[80,12],[81,12],[82,11],[83,11],[84,10],[85,10],[86,10],[87,10],[88,10],[88,10],[89,10],[90,10],[91,10],[92,10],[92,10],[93,10],[94,10],[94,10],[95,10],[96,10],[96,11],[96,11],[98,11],[98,12],[99,12],[100,13],[100,14],[101,14],[101,15],[102,15],[104,16],[104,17],[104,18],[105,18],[106,18],[106,18],[107,18],[107,19],[107,20],[108,20],[108,21],[108,21],[108,22],[109,22],[109,22],[109,23]],"classification_payloads":[{"class_id":2,"confidence":1}],"annotation_meta":"is_assigned_to_each_annotation"};
const BBOX_SVG = `
<svg
   xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmlns:cc="http://creativecommons.org/ns#"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   width="100mm"
   height="100mm"
   viewBox="0 0 100 100"
   version="1.1"
   id="svg7244"
   inkscape:version="0.92.5 (2060ec1f9f, 2020-04-08)"
   sodipodi:docname="bbox.svg">
  <defs
     id="defs7238">
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0"
       refX="0"
       id="DotL"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         inkscape:connector-curvature="0"
         id="path4587"
         d="m -2.5,-1 c 0,2.76 -2.24,5 -5,5 -2.76,0 -5,-2.24 -5,-5 0,-2.76 2.24,-5 5,-5 2.76,0 5,2.24 5,5 z"
         style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1.00000003pt;stroke-opacity:1"
         transform="matrix(0.8,0,0,0.8,5.92,0.8)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0"
       refX="0"
       id="marker7235"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         inkscape:connector-curvature="0"
         id="path7233"
         d="m -2.5,-1 c 0,2.76 -2.24,5 -5,5 -2.76,0 -5,-2.24 -5,-5 0,-2.76 2.24,-5 5,-5 2.76,0 5,2.24 5,5 z"
         style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1.00000003pt;stroke-opacity:1"
         transform="matrix(0.8,0,0,0.8,5.92,0.8)" />
    </marker>
  </defs>
  <sodipodi:namedview
     id="base"
     pagecolor="#ffffff"
     bordercolor="#666666"
     borderopacity="1.0"
     inkscape:pageopacity="0.0"
     inkscape:pageshadow="2"
     inkscape:zoom="1.4"
     inkscape:cx="319.49724"
     inkscape:cy="182.97951"
     inkscape:document-units="mm"
     inkscape:current-layer="layer1"
     showgrid="false"
     inkscape:window-width="1848"
     inkscape:window-height="1016"
     inkscape:window-x="1992"
     inkscape:window-y="111"
     inkscape:window-maximized="1" />
  <metadata
     id="metadata7241">
    <rdf:RDF>
      <cc:Work
         rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type
           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
        <dc:title />
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="layer1"
     transform="translate(0,-197)">
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:1.48994207;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;marker-start:url(#DotL);marker-mid:url(#DotL);paint-order:stroke fill markers"
       d="m 10,207 v 80 h 80 v -80 z"
       id="path3715"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccccc" />
  </g>
</svg>
`;
POLYGON_SVG = `
<svg
   xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmlns:cc="http://creativecommons.org/ns#"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   width="100mm"
   height="100mm"
   viewBox="0 0 100 100"
   version="1.1"
   id="svg7244"
   inkscape:version="0.92.5 (2060ec1f9f, 2020-04-08)"
   sodipodi:docname="polygon.svg">
  <defs
     id="defs7238">
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0"
       refX="0"
       id="DotL"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         inkscape:connector-curvature="0"
         id="path4587"
         d="m -2.5,-1 c 0,2.76 -2.24,5 -5,5 -2.76,0 -5,-2.24 -5,-5 0,-2.76 2.24,-5 5,-5 2.76,0 5,2.24 5,5 z"
         style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1.00000003pt;stroke-opacity:1"
         transform="matrix(0.8,0,0,0.8,5.92,0.8)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0"
       refX="0"
       id="marker7235"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         inkscape:connector-curvature="0"
         id="path7233"
         d="m -2.5,-1 c 0,2.76 -2.24,5 -5,5 -2.76,0 -5,-2.24 -5,-5 0,-2.76 2.24,-5 5,-5 2.76,0 5,2.24 5,5 z"
         style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1.00000003pt;stroke-opacity:1"
         transform="matrix(0.8,0,0,0.8,5.92,0.8)" />
    </marker>
  </defs>
  <sodipodi:namedview
     id="base"
     pagecolor="#ffffff"
     bordercolor="#666666"
     borderopacity="1.0"
     inkscape:pageopacity="0.0"
     inkscape:pageshadow="2"
     inkscape:zoom="1.4"
     inkscape:cx="446.28295"
     inkscape:cy="182.97951"
     inkscape:document-units="mm"
     inkscape:current-layer="layer1"
     showgrid="false"
     inkscape:window-width="1848"
     inkscape:window-height="1016"
     inkscape:window-x="1992"
     inkscape:window-y="111"
     inkscape:window-maximized="1" />
  <metadata
     id="metadata7241">
    <rdf:RDF>
      <cc:Work
         rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type
           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
        <dc:title></dc:title>
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="layer1"
     transform="translate(0,-197)">
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:1.48994207;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;marker-start:url(#DotL);marker-mid:url(#DotL);paint-order:stroke fill markers"
       d="m 41.284493,204.35565 -33.5734849,28.74943 7.6220859,56.71655 76.946838,-12.1256 -41.921509,-38.137 z"
       id="path3715"
       inkscape:connector-curvature="0" />
  </g>
</svg>
`;
CONTOUR_SVG = `
<svg
   xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmlns:cc="http://creativecommons.org/ns#"
   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
   xmlns:svg="http://www.w3.org/2000/svg"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   width="100mm"
   height="100mm"
   viewBox="0 0 100 100"
   version="1.1"
   id="svg7244"
   inkscape:version="0.92.5 (2060ec1f9f, 2020-04-08)"
   sodipodi:docname="contour.svg">
  <defs
     id="defs7238">
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0"
       refX="0"
       id="DotL"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         inkscape:connector-curvature="0"
         id="path4587"
         d="m -2.5,-1 c 0,2.76 -2.24,5 -5,5 -2.76,0 -5,-2.24 -5,-5 0,-2.76 2.24,-5 5,-5 2.76,0 5,2.24 5,5 z"
         style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1.00000003pt;stroke-opacity:1"
         transform="matrix(0.8,0,0,0.8,5.92,0.8)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0"
       refX="0"
       id="marker7235"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         inkscape:connector-curvature="0"
         id="path7233"
         d="m -2.5,-1 c 0,2.76 -2.24,5 -5,5 -2.76,0 -5,-2.24 -5,-5 0,-2.76 2.24,-5 5,-5 2.76,0 5,2.24 5,5 z"
         style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1.00000003pt;stroke-opacity:1"
         transform="matrix(0.8,0,0,0.8,5.92,0.8)" />
    </marker>
  </defs>
  <sodipodi:namedview
     id="base"
     pagecolor="#ffffff"
     bordercolor="#666666"
     borderopacity="1.0"
     inkscape:pageopacity="0.0"
     inkscape:pageshadow="2"
     inkscape:zoom="1.4"
     inkscape:cx="194.1401"
     inkscape:cy="180.12237"
     inkscape:document-units="mm"
     inkscape:current-layer="layer1"
     showgrid="false"
     inkscape:window-width="1848"
     inkscape:window-height="1016"
     inkscape:window-x="1992"
     inkscape:window-y="111"
     inkscape:window-maximized="1" />
  <metadata
     id="metadata7241">
    <rdf:RDF>
      <cc:Work
         rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type
           rdf:resource="http://purl.org/dc/dcmitype/StillImage" />
        <dc:title />
      </cc:Work>
    </rdf:RDF>
  </metadata>
  <g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="layer1"
     transform="translate(0,-197)">
    <path
       style="fill:none;stroke:#000000;stroke-width:5.465;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="m 81.075893,208.17559 c -34.584822,16.06399 -59.342262,13.60715 -61.988096,34.01786 -2.645833,20.41071 1.700893,48.38095 11.150298,49.51488 9.449403,1.13393 31.938986,1.13393 37.986607,-6.4256 6.047618,-7.55952 12.284226,-19.65476 12.095237,-30.80505 -0.188987,-11.1503 -6.425594,-34.01786 -34.206844,-52.34971"
       id="path865"
       inkscape:connector-curvature="0" />
  </g>
</svg>
`;


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
                else if ($(mouse_event.target).hasClass("movable")) {
                    mouse_event.preventDefault();
                    return "move";
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
        <div class="full_ulabel_container_">
            <div id="${ul.config["annbox_id"]}" class="annbox_cls">
                <div id="${ul.config["imwrap_id"]}" class="imwrap_cls ${ul.config["imgsz_class"]}">
                    <img id="${ul.config["image_id"]}" src="${ul.config["image_url"]}" class="imwrap_cls ${ul.config["imgsz_class"]}" />
                </div>
            </div>
            <div id="${ul.config["toolbox_id"]}" class="toolbox_cls">
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
                                    width=${ul.config["demo_width"]} 
                                    height=${ul.config["demo_height"]}></canvas>
                                <a href="#" class="wbutt win">+</a>
                            </div><!--
                            --><div class="setting">
                                <a class="fixed-setting">Fixed</a><br>
                                <a href="#" class="dyn-setting">Dynamic</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        $("#" + ul.config["container_id"]).html(tool_html);

        // Initialize toolbox based on configuration
        const sp_id = ul.config["toolbox_id"];
        let md_buttons = [];
        for (var ami = 0; ami < ul.config["allowed_modes"].length; ami++) {
            let href=` href="#"`;
            let sel = "";
            let ap_html = "";
            switch (ul.config["allowed_modes"][ami]) {
                case "bbox":
                    if (ul.annotation_state["mode"] == "bbox") {
                        sel = " sel";
                        href = "";
                    }
                    md_buttons.push(`<div class="mode-opt">
                        <a${href} id="md-btn--bbox" class="md-btn${sel}" amdname="Bounding Box">
                            ${BBOX_SVG}
                        </a>
                    </div>`);
                    break;
                case "polygon":
                    if (ul.annotation_state["mode"] == "polygon") {
                        sel = " sel";
                        href = "";
                    }
                    md_buttons.push(`<div class="mode-opt">
                        <a${href} id="md-btn--polygon" class="md-btn${sel}" amdname="Polygon">
                            ${POLYGON_SVG}
                        </a>
                    </div>`);
                    break;
                case "contour":
                    if (ul.annotation_state["mode"] == "contour") {
                        sel = " sel";
                        href = "";
                    }
                    md_buttons.push(`<div class="mode-opt">
                        <a${href} id="md-btn--contour" class="md-btn${sel}" amdname="Contour">
                            ${CONTOUR_SVG}
                        </a>
                    </div>`);
                    break;
            }
        }
        $("#" + sp_id + " .toolbox_inner_cls .mode-selection").append(md_buttons.join("<!-- -->"));
        // TODO noconflict
        $("#" + sp_id + " .toolbox_inner_cls").append(`
            <a href="#" id="submit-button">Submit</a>
        `);
        // Show current mode label
        ul.show_annotation_mode();

        // Make sure that entire toolbox is shown
        if ($("#" + ul.config["toolbox_id"] + " .toolbox_inner_cls").height() > $("#" + ul.config["container_id"]).height()) {
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

        // Local
        $("#" + ul.config["imwrap_id"]).append(`
            <a href="#" id="edit_suggestion" class="editable"></a>
        `);
        ul.viewer_state["visible_dialogs"].push({
            "id": "edit_suggestion",
            "left": 0.0,
            "top": 0.0,
            "pin": "center"
        });

        // Global
        $("#" + ul.config["imwrap_id"]).append(`
            <div id="global_edit_suggestion" class="glob_editable">
                <a href="#" class="move_suggestion global_sub_suggestion movable">
                    <img class="movable" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAdVBMVEX///8jHyAAAAD7+/sfGxwcFxhta2s3NDUEAABxcHBqaWnr6+seGRoSCw0yLzC0s7O6ubl4dncLAAN9fHz19fUsKCkWERInIyTW1dV5eHjBwMCko6ODgoJAPj7o5+jw7/BYVleLiopHRUXKysqtrK1PTE0/PD0MlkEbAAAF+ElEQVR4nO2d63aiMBRGIYJTWhyrKPZia2sv7/+IQ7QWYhLITcmXyf41yzWLOXs+GsDmHJLkqsz32X5+3X/yuhSkTEuyGLuMyzElKYVMxy7kUhRHwUaxGLuUyzA9CYaaYtEKhpkiIxii4pQVDO9ELc4FQ0uRSzC0FAUJhpXi7Y1QMJwUC5lgKClO5YJhpNgrGEKKwlU0pBQHEqTcQCv2LDIdReATVXqZOFO8HbtQU5QSRE5RMUHcFJUTRE1RYRVlFOFWVE1BPEVtQbRLv8Yig5miQYIHRZjlxijBgyLIRWMxdLMthzyOXbwKH+aCjeLH2OUrsJ1ZGM62Y5evwKK2MKwRTtNPq7P0c+zyFZisc2PBfD0Zu3wV7kpeUfSzyX+WZ3djF68Gr0jul5zO8v78dM5LEMFGMWUVyVMi+L1F8sR+mKcwgo1i1lUk98lEYDhJmBRhTtEj3RSbBCWGXUWoBCltik2CUsNWESxByinFg6DU8KQIlyDlrmwuB/lRUG7YKDb/EzOcVbTLakHI18Pxz3LD5OGLkMVqvDId0WMYCNEQn2iITzTEJxriEw3xiYb4REN8oiE+0RCfaIhPNMQnGuITDfGJhvhEQ3yiIT7RMABEe6LCojjfpzcD2pmvxC5flllLuSx3Y5d04KMqnh39uEy2L39aXrauDvtcVBZ7wxdkVpO1z5t5XteknpmP9Lk9LA95/uqyJqe85oetZcSwT+PU+VLWvqZ4V5fHEs0aitrOlzzzM8XOLlYTxW7vkp9bI5nN1vqKbHNWvvFP8Wyrta7iefeZf/s/2Y3W2op8e12+8eMKfWK34VoedAZQiPoH841Pe0BXqaBtRb0LVTwwZ+lT01UlbB9TTVE2rGN52aK1kJSolqJk5JFfjzvSGhVSlI5bqd8uXrc6b7LusWFFaYIpebhG6Yo8yMscUOwRvL9O7YpwbWGKijCCpopAgmaKUIImivI+euLn6N+5vGDhUz9YghS9FOWCMz8TpMylvf98inLB5naNqFPZ3p/vHjX+Nb67WJqixSwLlllp9zXhpLYZydCFTdGZYBP4u5XhticWTbqKfaeoLuWLleF36a6UVtFhgmma/bUy/Js5rOU0DMapoFeGPylWTgX9MkxJ1XdjYIZfhvRu5cvxIT0zLN8Sx0f0zTDNkr3D5flwRL8Msy+7kUCiQ/plSIcWBb+W/gfXwyR5DPaepjod1mWK5beVodP70qo9bpjPFlX3wO6eD3O758OVu+fDij2yq2f8wvYZf1U4esbnpvfJU8T8nqbi/3ZY37UJ5y+G9H2pIEEKWIq6CVKgFHsEJQlSgBTNBIEUTQVD+B3wgGCPIsjv8QcF0fdiKAhi7KeRzERXE0TeE6UoKNnXlvq/r01ZEHVvotZJ5v/+Uk5RJ0GK/3uEd+zccF1BhH3eTIr6ggh79Tspmggi9Fv8pqi3yLT43zOz29TmCVIeD31P/go2it+078niC8yL9a59v7vqIJ0v3v146OH7D326RXIB30Nq3FLnKfzN/M3YJbkl/F7uaIhPNMQnGuITDfGJhvhEQ3yiIT7REJ9oiE80xCca4hMN8YmG+ERDfKIhPtEQn2iISfDv5Q7+3eqnAapHRanhT9+Ef/tXB2kHqB4UZYa/jSF+bvDsoTsClzxJDTudL2ApsiNwmxTFhkxrD1SKZ0OMaYqidyM8sR8CpciMof5Jke/YXXLNWTnKisoLNpcD7hPRZyAn6mQt67oaJl8j3OhYDUuho0i8Z1FbGNbSDl6PeLcZijCzmzlxHeTtnQp41agqxWKkj3lbwXW5lfQ/DnJj+K6R6yPqX1QR1Bj9PzZGimavUhkL6WR3OepvNvAD7RSxEqRoKuIJJkmho4i0yLRoXDRwLhMsyiliJkhRTBE1QYpSirgJUhRWVMRVtMvgpR/tQs8zkCL2KXqkVxE/QUrPcqPzIjGfkV40wkiQIkkxlAQpwhTDSZAiGMwUUoIUbkUNK0HKWYqhJUhhFEMUZG7gwjtFj/ymGGaClJ8UQ02QsiBZmpm/KByB+T7bX3ko8T9Zz1H5wFZx8QAAAABJRU5ErkJggg==">
                </a><!--
                --><a href="#" class="delete_suggestion global_sub_suggestion">
                    <span class="bigx">&#215;</span>
                </a>
            </div>
        `);
        ul.viewer_state["visible_dialogs"].push({
            "id": "global_edit_suggestion",
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
                ul.rezoom(wheel_event.clientX, wheel_event.clientY);
            } 
        };
        
        // TODO better understand which browsers support this (new Chrome does)
        new ResizeObserver(function() {
            ul.reposition_dialogs();
        }).observe(document.getElementById(ul.config["imwrap_id"]));

        // Buttons to change annotation mode
        $("a.md-btn").click(function(mouse_event) {
            if ($(this).hasClass("sel")) return;
            var new_mode = $(this).attr("id").split("--")[1];
            ul.annotation_state["mode"] = new_mode;
            $("a.md-btn.sel").attr("href", "#");
            $("a.md-btn.sel").removeClass("sel");
            $(this).addClass("sel");
            $(this).removeAttr("href");
            ul.show_annotation_mode($(this));
        });

        $("#" + ul.config["toolbox_id"] + " .zbutt").click(function(mouse_event) {
            if ($(this).hasClass("zin")) {
                ul.viewer_state["zoom_val"] *= 1.1;
            }
            else if ($(this).hasClass("zout")) {
                ul.viewer_state["zoom_val"] /= 1.1;
            }
            ul.rezoom();
        });
        $("#" + ul.config["toolbox_id"] + " .pbutt").click(function(mouse_event) {
            let annbox = $("#" + ul.config["annbox_id"]);
            if ($(this).hasClass("up")) {
                annbox.scrollTop(annbox.scrollTop() - 20);
            }
            else if ($(this).hasClass("down")) {
                annbox.scrollTop(annbox.scrollTop() + 20);
            }
            else if ($(this).hasClass("left")) {
                annbox.scrollLeft(annbox.scrollLeft() - 20);
            }
            else if ($(this).hasClass("right")) {
                annbox.scrollLeft(annbox.scrollLeft() + 20);
            }
        });
        $("#" + ul.config["toolbox_id"] + " .wbutt").click(function(mouse_event) {
            if ($(this).hasClass("win")) {
                ul.annotation_state["line_size"] *= 1.1;
            }
            else if ($(this).hasClass("wout")) {
                ul.annotation_state["line_size"] /= 1.1;
            }
            ul.redraw_demo();
        });
        $("#" + ul.config["toolbox_id"] + " .setting a").click(function(mouse_event) {
            if (!this.hasAttribute("href")) return;
            if ($(this).hasClass("fixed-setting")){
                $("#" + ul.config["toolbox_id"] + " .setting a.fixed-setting").removeAttr("href");
                $("#" + ul.config["toolbox_id"] + " .setting a.dyn-setting").attr("href", "#");
                ul.annotation_state["line_size"] = ul.annotation_state["line_size"]*ul.viewer_state["zoom_val"];
                ul.annotation_state["size_mode"] = "fixed";
            }
            else if ($(this).hasClass("dyn-setting")) {
                $("#" + ul.config["toolbox_id"] + " .setting a.dyn-setting").removeAttr("href");
                $("#" + ul.config["toolbox_id"] + " .setting a.fixed-setting").attr("href", "#");
                ul.annotation_state["line_size"] = ul.get_line_size();
                ul.annotation_state["size_mode"] = "dynamic";
            }
            ul.redraw_demo();
        });
        $("#" + ul.config["annbox_id"] + " .delete_suggestion").click(function() {
            ul.delete_annotation(ul.annotation_state["move_candidate"]);
        })

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
            if (ctrl &&
                (
                    keypress_event.key == "z" || 
                    keypress_event.key == "Z" ||
                    keypress_event.code == "KeyZ"
                )
            ) {
                if (shift) {
                    ul.redo();
                }
                else {
                    ul.undo();
                }
            }
            else {
                console.log(keypress_event);
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
        
    constructor(
        container_id,
        image_data,
        annotator,
        taxonomy,
        class_defs,
        save_callback,
        exit_callback,
        done_callback,
        allowed_modes,
        resume_from=null,
        task_meta=null,
        annotation_meta=null
    ) {
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
            "canvas_did": "demo-canvas", // TODO noconflict
            "canvas_class": "easel", // TODO noconflict
            "image_id": "ann_image", // TODO noconflict
            "imgsz_class": "imgsz", // TODO noconflict
            "toolbox_id": "toolbox", // TODO noconflict
            "image_url": image_data,
            "image_width": null,
            "image_height": null,
            "demo_width": 120,
            "demo_height": 40,
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
            "visible_dialogs": [],
            "last_move": null
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
            },
            "move": {
                "mouse_start": null, // Screen coordinates where the current mouse drag started
                "offset_start": null, // Scroll values where the current mouse drag started
                "zoom_val_start": null // zoom_val when the dragging interaction started
            }
        };
        
        // Canvasses' display/drawing states
        this.canvas_state = {
            "front_context": null,
            "back_context": null,
            "demo_context": null
        };
        
        // State data for annotation interactions
        this.annotation_state = {
            "mode": this.config["allowed_modes"][0],
            "active_id": null,
            "is_in_progress": false,
            "is_in_edit": false,
            "edit_candidate": null,
            "move_candidate": null,
            "line_size": 10.0,
            "size_mode": "fixed"
        };
        
        // Create holder for annotations
        this.annotations = {
            "ordering": [],
            "access": {}
        };

        // Create holder for actions
        this.actions = {
            "stream": [],
            "undone_stack": []
        }
        this.action_stream = [];

        // If resuming from not null, then set and draw prior annotations        
        if (this.config["resume_from"] != null) {
            for (var i = 0; i < this.config["resume_from"].length; i++) {
                this.annotations["ordering"].push(this.config["resume_from"][i]["id"]);
                this.annotations["access"][this.config["resume_from"][i]["id"]] = this.config["resume_from"][i];
                this.annotations["access"][this.config["resume_from"][i]["id"]]["new"] = false;
            }
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
            that.canvas_state["demo_context"] = document.getElementById(
                that.config["canvas_did"]
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
            that.viewer_state["zoom_val"] = that.get_empirical_scale();
            that.rezoom(0, 0);

            // Draw demo annotation
            that.redraw_demo();

            // Draw resumed from annotations
            if (that.config["resume_from"] != null) {
                that.redraw_all_annotations();
            }
    
            // Call the user-provided callback
            callback.bind(that);
        }
    }

    // ================= Toolbox Functions ==================
    // Show annotation mode
    show_annotation_mode(el=null) {
        if (el == null) {
            el = $("a.md-btn.sel");
        }
        let new_name = el.attr("amdname");
        $("#" + this.config["toolbox_id"] + " .current_mode").html(new_name);
    }

    // Draw demo annotation in demo canvas
    redraw_demo() {
        this.canvas_state["demo_context"].clearRect(0, 0, this.config["demo_width"], this.config["demo_height"]);
        this.draw_annotation(DEMO_ANNOTATION, "demo_context", true);
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
    get_init_spatial(gmx, gmy, annotation_mode) {
        var mouse_loc = [gmx, gmy];
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

    draw_bounding_box(annotation_object, cvs_ctx="front_context", demo=false, offset=null) {
        // TODO buffered contexts
        let ctx = this.canvas_state[cvs_ctx];

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
    
        // TODO draw annotation according to id payload colors
        // Prep for bbox drawing
        ctx.fillStyle = this.config["default_annotation_color"];
        ctx.strokeStyle = this.config["default_annotation_color"];
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const sp = annotation_object["spatial_payload"][0];
        const ep = annotation_object["spatial_payload"][1];
        ctx.beginPath();
        ctx.moveTo(sp[0] + diffX, sp[1] + diffY);
        ctx.lineTo(sp[0] + diffX, ep[1] + diffY);
        ctx.lineTo(ep[0] + diffX, ep[1] + diffY);
        ctx.lineTo(ep[0] + diffX, sp[1] + diffY);
        ctx.lineTo(sp[0] + diffX, sp[1] + diffY);
        ctx.closePath();
        ctx.stroke();
    }
    
    draw_polygon(annotation_object, cvs_ctx="front_context", demo=false, offset=null) {
        // TODO buffered contexts
        let ctx = this.canvas_state[cvs_ctx];

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

        
        // TODO draw annotation according to id payload colors
        // Prep for bbox drawing
        ctx.fillStyle = this.config["default_annotation_color"];
        ctx.strokeStyle = this.config["default_annotation_color"];
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const pts = annotation_object["spatial_payload"];
        ctx.beginPath();
        ctx.moveTo(pts[0][0] + diffX, pts[0][1] + diffY);
        for (var pti = 1; pti < pts.length; pti++) {
            ctx.lineTo(pts[pti][0] + diffX, pts[pti][1] + diffY);
        }
        ctx.stroke();
    }
    
    draw_contour(annotation_object, cvs_ctx="front_context", demo=false, offset=null) {
        // TODO buffered contexts
        let ctx = this.canvas_state[cvs_ctx];

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

    
        // TODO draw annotation according to id payload colors
        // Prep for bbox drawing
        ctx.fillStyle = this.config["default_annotation_color"];
        ctx.strokeStyle = this.config["default_annotation_color"];
        ctx.lineJoin = "round";
        ctx.lineWidth = line_size;
        ctx.imageSmoothingEnabled = false;
        ctx.globalCompositeOperation = "source-over";
    
        // Draw the box
        const pts = annotation_object["spatial_payload"];
        ctx.beginPath();
        ctx.moveTo(pts[0][0] + diffX, pts[0][1] + diffY);
        for (var pti = 1; pti < pts.length; pti++) {
            ctx.lineTo(pts[pti][0] + diffX, pts[pti][1] + diffY);
        }
        ctx.stroke();
    }
    
    draw_annotation(annotation_object, cvs_ctx="front_context", demo=false, offset=null) {
        // DEBUG left here for refactor reference, but I don't think it's needed moving forward
        //    there may be a use case for drawing depreacted annotations 
        // Don't draw if deprecated
        if (annotation_object["deprecated"]) return;
    
        // Dispatch to annotation type's drawing function
        switch (annotation_object["spatial_type"]) {
            case "bbox":
                this.draw_bounding_box(annotation_object, cvs_ctx, demo, offset);
                break;
            case "polygon":
                this.draw_polygon(annotation_object, cvs_ctx, demo, offset);
                break;
            case "contour":
                this.draw_contour(annotation_object, cvs_ctx, demo, offset);
                break;
            default:
                this.raise_error("Warning: Annotation " + annotation_object["id"] + " not understood", ULabel.elvl_info);
                break;
        }
    }

    draw_annotation_from_id(id, cvs_ctx="front_context", offset=null) {
        this.draw_annotation(this.annotations["access"][id], cvs_ctx, false, offset);
    }
    
    // Draws the first n annotations on record
    draw_n_annotations(n, cvs_ctx="front_context", offset=null) {
        for (var i = 0; i < n; i++) {
            if (offset != null && offset["id"] == this.annotations["ordering"][i]) {
                this.draw_annotation_from_id(this.annotations["ordering"][i], cvs_ctx, offset);
            }
            else {
                this.draw_annotation_from_id(this.annotations["ordering"][i]);
            }
        }
    }
    
    redraw_all_annotations(offset=null) {
        // Clear the canvas
        this.canvas_state["front_context"].clearRect(0, 0, this.config["image_width"], this.config["image_height"]);
    
        // Draw them all again
        this.draw_n_annotations(this.annotations["ordering"].length, "front_context", offset);
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
    destroy_polygon_ender(polygon_id) {
        // Create ender id
        const ender_id = "ender_" + polygon_id;
        $("#" + ender_id).remove();
        for (var vsi = 0; vsi < this.viewer_state["visible_dialogs"].length; vsi++) {
            if (this.viewer_state["visible_dialogs"][vsi]["id"] == ender_id) {
                this.viewer_state["visible_dialogs"].splice(vsi, 1);
                break;
            }
        }
        this.reposition_dialogs();
    };
    
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

    show_global_edit_suggestion(annid, offset=null) {
        var esjq = $("#global_edit_suggestion");
        esjq.css("display", "block");

        let diffX = 0;
        let diffY = 0;
        if (offset != null) {
            diffX = offset["diffX"];
            diffY = offset["diffY"];
        }

        let cbox = this.annotations["access"][annid]["containing_box"];

        for (var vdgi = 0; vdgi < this.viewer_state["visible_dialogs"].length; vdgi++) {
            if (this.viewer_state["visible_dialogs"][vdgi]["id"] == "global_edit_suggestion") {
                this.viewer_state["visible_dialogs"][vdgi]["left"] = (cbox["tlx"] + cbox["brx"] + 2*diffX)/(2*this.config["image_width"]);
                this.viewer_state["visible_dialogs"][vdgi]["top"] = (cbox["tly"] + cbox["bry"] + 2*diffY)/(2*this.config["image_height"]);
                break;
            }
        }
        this.reposition_dialogs();
    }

    hide_global_edit_suggestion() {
        $("#global_edit_suggestion").css("display", "none");
    }

    show_id_dialog(mouse_e, active_ann) {
        // Record which annotation this dialog is associated with
        // TODO
        // am_dialog_associated_ann = active_ann;
        this.id_dialog_state["visible"] = true;

        // Intelligently choose the position (global point) where the dialog should be shown
        // TODO
        var gbpt = [
            this.get_global_mouse_x(mouse_e),
            this.get_global_mouse_y(mouse_e)
        ];

        // Add this id to the list of dialogs with managed positions
        // TODO actually only do this when calling append()
        this.viewer_state["visible_dialogs"].push({
            "id": this.id_dialog_config["id"],
            "left": gbpt[0]/this.config["image_width"],
            "top": gbpt[1]/this.config["image_height"],
            "pin": "center"
        });
        this.reposition_dialogs();

        // Configure the dialog to show the current information for this ann
        // TODO toid

        // Show the dialog
        $("#" + this.id_dialog_config["id"]).css("display", "block");
    }

    hide_id_dialog() {
        this.id_dialog_state["visible"] = false;
        $("#" + this.id_dialog_config["id"]).css("display", "none");
    }


    // ================= Annotation Utilities =================
    
    undo() {
        if (this.actions["stream"].length > 0) {
            this.actions["undone_stack"].push(this.actions["stream"].pop());
            this.undo_action(this.actions["undone_stack"][this.actions["undone_stack"].length - 1]);
        }
    }

    redo() {
        if (this.actions["undone_stack"].length > 0) {
            this.redo_action(this.actions["undone_stack"].pop());
        }
    }

    delete_annotation(aid) {
        if (this.annotation_state["active_id"] != null) {
            this.annotation_state["active_id"] = null;
            this.annotation_state["is_in_edit"] = false;
            this.annotation_state["is_in_progress"] = false;
        }
        this.annotations["access"][aid]["deprecated"] = true;
        this.redraw_all_annotations();
        this.hide_global_edit_suggestion();
        // TODO add this action to the undo stack
    }

    get_nearest_active_keypoint(global_x, global_y, max_dist, candidates=null) {
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist/this.get_empirical_scale(),
            "point": null
        };
        if (candidates == null) {
            candidates = this.annotations["ordering"];
        }
        // Iterate through and find any close enough defined points
        var edid = null;
        for (var edi = 0; edi < candidates.length; edi++) {
            edid = candidates[edi];
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
    
    get_nearest_segment_point(global_x, global_y, max_dist, candidates=null) {
        var ret = {
            "annid": null,
            "access": null,
            "distance": max_dist/this.get_empirical_scale(),
            "point": null
        };
        if (candidates == null) {
            candidates = this.annotations["ordering"];
        }
        for (var edi = 0; edi < candidates.length; edi++) {
            var edid = candidates[edi];
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
    
    get_line_size(demo=false) {
        let line_size = this.annotation_state["line_size"];
        if (demo) {
            if (this.annotation_state["size_mode"] == "dynamic") {
                line_size *= this.viewer_state["zoom_val"];
            }
            return line_size;
        }
        else {
            if (this.annotation_state["size_mode"] == "fixed") {
                line_size /= this.viewer_state["zoom_val"];
            }
            return line_size;
        }
    }

    // Action Stream Events

    record_action(action, is_redo=false) {
        // After a new action, you can no longer redo old actions
        if (!is_redo) {
            this.actions["undone_stack"] = [];
        }

        // Add to strea
        this.actions["stream"].push(action);
    }

    undo_action(action) {
        switch(action.act_type) {
            case "begin_annotation":
                this.begin_annotation__undo(action.undo_payload);
                break;
            case "continue_annotation":
                this.continue_annotation__undo(action.undo_payload);
                break;
            default:
                console.log("Undo error :(");
                break;
        }
    }

    redo_action(action) {
        switch(action.act_type) {
            case "begin_annotation":
                this.begin_annotation(null, action.redo_payload);
                break;
            case "continue_annotation":
                this.continue_annotation(null, null, action.redo_payload);
                break;
            default:
                console.log("Redo error :(");
                break;
        }
    }

    begin_annotation(mouse_event, redo_payload=null) {
        // Give the new annotation a unique ID
        let unq_id = null;
        let line_size = null;
        let annotation_mode = null;
        let redoing = false;
        if (redo_payload == null) {
            unq_id = this.make_new_annotation_id();
            line_size = this.get_line_size();
            annotation_mode = this.annotation_state["mode"];
        }
        else {
            unq_id = redo_payload.unq_id;
            line_size = redo_payload.line_size;
            mouse_event = redo_payload.mouse_event;
            annotation_mode = redo_payload.annotation_mode;
            redoing = true;
        }

        const gmx = this.get_global_mouse_x(mouse_event);
        const gmy = this.get_global_mouse_y(mouse_event);

        // Add this annotation to annotations object
        this.annotations["access"][unq_id] = {
            "id": unq_id,
            "new": true,
            "parent_id": null,
            "created_by": this.config["annotator"],
            "created_at": ULabel.get_time(),
            "deprecated": false,
            "spatial_type": annotation_mode,
            "spatial_payload": this.get_init_spatial(gmx, gmy, annotation_mode),
            "classification_payloads": null,
            "line_size": line_size,
            "containing_box": {
                "tlx": gmx,
                "tly": gmy,
                "brx": gmx,
                "bry": gmy
            }
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
        this.draw_annotation_from_id(unq_id);
        this.annotation_state["active_id"] = unq_id;
        this.annotation_state["is_in_progress"] = true;

        // Record for potential undo/redo
        this.record_action({
            act_type: "begin_annotation",
            redo_payload: {
                mouse_event: mouse_event,
                unq_id: unq_id,
                line_size: line_size,
                annotation_mode: annotation_mode
            },
            undo_payload: {
                ann_str: JSON.stringify(this.annotations["access"][unq_id])
            }
        }, redoing);
        if (redoing) {
            this.continue_annotation(this.viewer_state["last_move"]);
        }
    }
    begin_annotation__undo(undo_payload) {
        // Parse necessary data
        let ann = JSON.parse(undo_payload.ann_str);
        let unq_id = ann["id"];

        // Set annotation state not in progress, nullify active id
        this.annotation_state["is_in_progress"] = false;
        this.annotation_state["active_id"] = null;

        // Destroy ender
        this.destroy_polygon_ender(unq_id);

        // Remove from ordering
        let end_ann = this.annotations["ordering"].pop();
        if (end_ann != unq_id) {
            console.log("We may have a problem... undo replication");
            console.log(end_ann, unq_id);
        }

        // Remove from access
        if (this.annotations["access"].hasOwnProperty(unq_id)) {
            delete this.annotations["access"][unq_id];
        }
        else {
            console.log("We may have a problem... undo replication");
        }

        // Delete from view
        this.redraw_all_annotations();
    }

    update_containing_box(ms_loc, actid) {
        // console.log(ms_loc, this.annotations["access"][actid]["containing_box"]);
        if (ms_loc[0] < this.annotations["access"][actid]["containing_box"]["tlx"]) {
            this.annotations["access"][actid]["containing_box"]["tlx"] = ms_loc[0];
        }
        else if (ms_loc[0] > this.annotations["access"][actid]["containing_box"]["brx"]) {
            this.annotations["access"][actid]["containing_box"]["brx"] = ms_loc[0];
        }
        if (ms_loc[1] < this.annotations["access"][actid]["containing_box"]["tly"]) {
            this.annotations["access"][actid]["containing_box"]["tly"] = ms_loc[1];
        }
        else if (ms_loc[1] > this.annotations["access"][actid]["containing_box"]["bry"]) {
            this.annotations["access"][actid]["containing_box"]["bry"] = ms_loc[1];
        }
        // console.log(ms_loc, this.annotations["access"][actid]["containing_box"]);
    }

    rebuild_containing_box(actid) {
        let init_pt = this.annotations["access"][actid]["spatial_payload"][0];
        this.annotations["access"][actid]["containing_box"] = {
            "tlx": init_pt[0],
            "tly": init_pt[1],
            "brx": init_pt[0],
            "bry": init_pt[1]
        }
        for (var pti = 1; pti < this.annotations["access"][actid]["spatial_payload"].length; pti++) {
            this.update_containing_box(this.annotations["access"][actid]["spatial_payload"][pti], actid);
        }
    }

    continue_annotation(mouse_event, isclick=false, redo_payload=null) {
        // Convenience
        let actid = null;
        let redoing = false;
        if (redo_payload == null) {
            actid = this.annotation_state["active_id"];
        }
        else {
            mouse_event = redo_payload.mouse_event;
            isclick = redo_payload.isclick;
            actid = redo_payload.actid;
            redoing = true;
        }

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
                    this.update_containing_box(ms_loc, actid);
                    this.redraw_all_annotations(); // tobuffer
                    break;
                case "polygon":
                    // Store number of keypoints for easy access
                    const n_kpts = this.annotations["access"][actid]["spatial_payload"].length;

                    // If hovering over the ender, snap to its center
                    const ender_pt = [
                        this.annotations["access"][actid]["spatial_payload"][0][0],
                        this.annotations["access"][actid]["spatial_payload"][0][1]
                    ];
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
                        this.update_containing_box(ms_loc, actid);
                        // Only an undoable action if placing a polygon keypoint
                        this.record_action({
                            act_type: "continue_annotation",
                            redo_payload: {
                                mouse_event: mouse_event,
                                isclick: isclick,
                                actid: actid
                            },
                            undo_payload: {
                                actid: actid
                            }
                        }, redoing);
                        if (redoing) {
                            this.continue_annotation(this.viewer_state["last_move"]);
                        }
                    }
                    this.redraw_all_annotations(); // tobuffer
                    break;
                case "contour":
                    this.annotations["access"][actid]["spatial_payload"].push(ms_loc);
                    this.update_containing_box(ms_loc, actid);
                    this.redraw_all_annotations(); // TODO tobuffer, no need to redraw here, can just draw over
                    break;
                default:
                    this.raise_error("Annotation mode is not understood", ULabel.elvl_info);
                    break;
            }
        }
    }
    continue_annotation__undo(undo_payload) {
        this.annotations["access"][undo_payload.actid]["spatial_payload"].pop();
        this.rebuild_containing_box(undo_payload.actid);
        this.continue_annotation(this.viewer_state["last_move"]);
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
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(); // tobuffer
                    this.annotation_state["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.annotation_state["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.annotation_state["edit_candidate"]["annid"]);
                    break;
                case "polygon":
                    this.set_with_access_string(actid, this.annotation_state["edit_candidate"]["access"], ms_loc);
                    this.rebuild_containing_box(actid);
                    this.redraw_all_annotations(); // tobuffer
                    this.annotation_state["edit_candidate"]["point"] = ms_loc;
                    this.show_edit_suggestion(this.annotation_state["edit_candidate"], true);
                    this.show_global_edit_suggestion(this.annotation_state["edit_candidate"]["annid"]);
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

    begin_move(mouse_event) {
        this.annotation_state["active_id"] = this.annotation_state["move_candidate"];

        // Revise start to current button center
        // TODO
        /*
        this.drag_state["move"]["mouse_start"][0] = mouse_event.target.pageX 
        this.drag_state["move"]["mouse_start"][1] +=
        */

        this.move_annotation(mouse_event);
    }

    move_annotation(mouse_event, isclick=false) {
        // Convenience
        const actid = this.annotation_state["active_id"];
        // TODO big performance gains with buffered canvasses
        if (actid && (actid !== null)) {
            let offset = {
                "id": this.annotation_state["edit_candidate"]["annid"],
                "diffX": (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0])/this.viewer_state["zoom_val"],
                "diffY": (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1])/this.viewer_state["zoom_val"]
            };
            this.redraw_all_annotations(offset); // tobuffer
            this.show_global_edit_suggestion(this.annotation_state["edit_candidate"]["annid"], offset); // TODO handle offset
            this.reposition_dialogs();
            return;
        }
    }
    
    finish_annotation(mouse_event) {
        // Convenience
        const actid = this.annotation_state["active_id"];
        // Record last point and redraw if necessary
        switch (this.annotations["access"][actid]["spatial_type"]) {
            case "polygon":
                const n_kpts = this.annotations["access"][actid]["spatial_payload"].length;
                const start_pt = [
                    this.annotations["access"][actid]["spatial_payload"][0][0],
                    this.annotations["access"][actid]["spatial_payload"][0][1]
                ];
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

    finish_move(mouse_event) {
        // Actually edit spatial payload this time
        const diffX = (mouse_event.clientX - this.drag_state["move"]["mouse_start"][0])/this.viewer_state["zoom_val"];
        const diffY = (mouse_event.clientY - this.drag_state["move"]["mouse_start"][1])/this.viewer_state["zoom_val"];

        for (var spi = 0; spi < this.annotations["access"][this.annotation_state["active_id"]]["spatial_payload"].length; spi++) {
            this.annotations["access"][this.annotation_state["active_id"]]["spatial_payload"][spi][0] += diffX;
            this.annotations["access"][this.annotation_state["active_id"]]["spatial_payload"][spi][1] += diffY;
        }
        this.annotations["access"][this.annotation_state["active_id"]]["containing_box"]["tlx"] += diffX;
        this.annotations["access"][this.annotation_state["active_id"]]["containing_box"]["brx"] += diffX;
        this.annotations["access"][this.annotation_state["active_id"]]["containing_box"]["tly"] += diffY;
        this.annotations["access"][this.annotation_state["active_id"]]["containing_box"]["bry"] += diffY;

        switch (this.annotations["access"][this.annotation_state["active_id"]]["spatial_type"]) {
            case "polygon":
            case "bbox":
            case "contour":
                 // tobuffer this is where the annotation moves to back canvas
            default:
                break;
        }
        this.annotation_state["active_id"] = null;

        this.redraw_all_annotations();
    }

    get_edit_candidates(gblx, gbly, dst_thresh) {
        let ret = {
            "candidate_ids": [],
            "best": null
        };
        let minsize = Infinity;
        for (var edi = 0; edi < this.annotations["ordering"].length; edi++) {
            let id = this.annotations["ordering"][edi];
            if (this.annotations["access"][id]["deprecated"]) continue;
            let cbox = this.annotations["access"][id]["containing_box"];
            if (
                (gblx >= cbox["tlx"] - dst_thresh) && 
                (gblx <= cbox["brx"] + dst_thresh) &&
                (gbly >= cbox["tly"] - dst_thresh) && 
                (gbly <= cbox["bry"] + dst_thresh)
            ) {
                ret["candidate_ids"].push(id);
                let boxsize = (cbox["brx"] - cbox["tlx"])*(cbox["bry"] - cbox["tly"]);
                if (boxsize < minsize) {
                    minsize = boxsize;
                    ret["best"] = id;
                }
            }
        }
        return ret;
    }
    
    suggest_edits(mouse_event) {
        // TODO better dynamic handling of the size of the suggestion queue
        const dst_thresh = 20;
        const global_x = this.get_global_mouse_x(mouse_event);
        const global_y = this.get_global_mouse_y(mouse_event);

        const edit_candidates = this.get_edit_candidates(
            global_x,
            global_y,
            dst_thresh
        );

        if (edit_candidates["best"] == null) {
            this.hide_global_edit_suggestion();
            this.annotation_state["move_candidate"] = null;
            return;
        }
        
        // Look for an existing point that's close enough to suggest editing it
        const nearest_active_keypoint = this.get_nearest_active_keypoint(global_x, global_y, dst_thresh, edit_candidates["candidate_ids"]);
        if (nearest_active_keypoint != null) {
            this.annotation_state["edit_candidate"] = nearest_active_keypoint;
            this.show_edit_suggestion(nearest_active_keypoint, true);
            edit_candidates["best"] = nearest_active_keypoint["annid"];
        }
        else { // If none are found, look for a point along a segment that's close enough
            const nearest_segment_point = this.get_nearest_segment_point(global_x, global_y, dst_thresh, edit_candidates["candidate_ids"]);
            if (nearest_segment_point != null) {
                this.annotation_state["edit_candidate"] = nearest_segment_point;
                this.show_edit_suggestion(nearest_segment_point, false);
                edit_candidates["best"] = nearest_segment_point["annid"];
            }
            else {
                this.hide_edit_suggestion();
            }
        }

        // Show global edit dialogs for "best" candidate
        this.annotation_state["move_candidate"] = edit_candidates["best"];
        this.show_global_edit_suggestion(edit_candidates["best"]);
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
        this.viewer_state["last_move"] = mouse_event;
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
                case "move":
                    this.move_annotation(mouse_event);
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
            mouse_event.clientY
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
        this.viewer_state["zoom_val"] = (
            this.drag_state["zoom"]["zoom_val_start"]*Math.pow(
                1.1, (aY - this.drag_state["zoom"]["mouse_start"][1])/10
            )
        );
        this.rezoom(this.drag_state["zoom"]["mouse_start"][0], this.drag_state["zoom"]["mouse_start"][1]);
    }
    
    // Handle zooming at a certain focus
    rezoom(foc_x=null, foc_y=null) {
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
        const new_left = (old_left + foc_x)*new_width/old_width - foc_x;
        const new_top = (old_top + foc_y)*new_height/old_height - foc_y;
        annbox.scrollLeft(new_left);
        annbox.scrollTop(new_top);

        // Redraw demo annotation
        this.redraw_demo();
    }
}
