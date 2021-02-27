const DEMO_ANNOTATION = {"id":"7c64913a-9d8c-475a-af1a-658944e37c31","new":true,"parent_id":null,"created_by":"TestUser","created_at":"2020-12-21T02:41:47.304Z","deprecated":false,"spatial_type":"contour","spatial_payload":[[4,25],[4,25],[4,24],[4,23],[4,22],[4,22],[5,22],[5,21],[5,20],[6,20],[6,19],[7,19],[7,18],[8,18],[8,18],[10,18],[11,18],[11,17],[12,17],[12,16],[12,16],[13,16],[14,15],[16,14],[16,14],[17,14],[18,14],[18,13],[19,13],[20,13],[20,13],[21,13],[22,13],[23,13],[24,13],[24,13],[25,13],[26,13],[27,13],[28,13],[28,13],[29,13],[30,13],[31,13],[32,13],[34,13],[36,14],[36,14],[37,15],[40,15],[40,16],[41,16],[42,17],[43,17],[44,18],[44,18],[45,18],[46,18],[47,18],[47,18],[48,18],[48,18],[49,19],[50,20],[52,20],[52,20],[53,21],[54,21],[55,21],[56,21],[57,21],[58,22],[59,22],[60,22],[60,22],[61,22],[63,22],[64,22],[64,22],[65,22],[66,22],[67,22],[68,22],[68,21],[69,21],[70,20],[70,19],[71,19],[71,18],[72,18],[72,18],[72,18],[73,18],[75,17],[75,16],[76,16],[76,16],[76,15],[77,14],[78,14],[79,14],[79,13],[79,12],[80,12],[81,12],[82,11],[83,11],[84,10],[85,10],[86,10],[87,10],[88,10],[88,10],[89,10],[90,10],[91,10],[92,10],[92,10],[93,10],[94,10],[94,10],[95,10],[96,10],[96,11],[96,11],[98,11],[98,12],[99,12],[100,13],[100,14],[101,14],[101,15],[102,15],[104,16],[104,17],[104,18],[105,18],[106,18],[106,18],[107,18],[107,19],[107,20],[108,20],[108,21],[108,21],[108,22],[109,22],[109,22],[109,23]],"classification_payloads": null,"annotation_meta":"is_assigned_to_each_annotation"};
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
   sodipodi:docname="bbox.svg"
   aria-labelledby="unique-title-id-bbox unique-desc-id-bbox">
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
const POLYGON_SVG = `
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
   sodipodi:docname="polygon.svg"
   aria-labelledby="unique-title-id-polygon unique-desc-id-polygon">
  <defs
     id="defs7239">
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0"
       refX="0"
       id="DotL2"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         inkscape:connector-curvature="0"
         id="path4588"
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
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:1.48994207;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;marker-start:url(#DotL2);marker-mid:url(#DotL2);paint-order:stroke fill markers"
       d="m 41.284493,204.35565 -33.5734849,28.74943 7.6220859,56.71655 76.946838,-12.1256 -41.921509,-38.137 z"
       id="path3715"
       inkscape:connector-curvature="0" />
  </g>
</svg>
`;
const CONTOUR_SVG = `
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
     id="defs7240">
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
         id="path4589"
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
const TBAR_SVG = `
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
   sodipodi:docname="tbar.svg">
  <defs
     id="defs7241">
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
         id="path4590"
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
     inkscape:window-width="1920"
     inkscape:window-height="1043"
     inkscape:window-x="0"
     inkscape:window-y="0"
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
       style="fill:none;stroke:#000000;stroke-width:5.54668236;stroke-linecap:round;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="m 34.757974,262.61957 54.396902,-54.3973"
       id="path848"
       inkscape:connector-curvature="0" />
    <path
       style="fill:none;stroke:#000000;stroke-width:5.92665672;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="M 7.3110211,235.09974 63.120496,290.9085"
       id="path850"
       inkscape:connector-curvature="0" />
  </g>
</svg>
`;
const INIT_STYLE = `
div.ulabel-night {
   background-color: black;
}
div.full_ulabel_container_ {
   font-family: sans-serif;
}

div.annbox_cls, div.toolbox_cls {
   height: 100%;
}
div.annbox_cls {
   width: calc(100% - 320px);
   background-color: black;
   overflow: scroll;
   position: absolute;
   top: 0;
   left: 0;
}
div.annbox_cls img {
   position: absolute;
   top: 0;
   left: 0;   
}

div.toolbox_cls {
   width: 320px;
   background-color: white;
   overflow-y: hidden;
   position: absolute;
   top: 0;
   right: 0;
}
div.ulabel-night div.toolbox_cls {
   background-color: rgb(24, 24, 24);
}
div.ulabel-night div.toolbox_cls p, div.ulabel-night div.toolbox_cls a {
   color: white;
}
div.ulabel-night a.md-btn svg {
   filter: invert(80%);
}

div.canvasses {
   position: absolute;
   top: 0; 
   left: 0;
}
canvas.canvas_cls {
   position: absolute;
   top: 0;
   left: 0;
}

.id_dialog {
   width: 400px;
   height: 400px;
   background-color: rgba(0, 0, 0, 0.0);
   position: absolute;
   display: none;
}
/* .id_dialog.thumb {
   transform: scale(0.375);
   opacity: 0.5;
}
.id_dialog.thumb:hover {
   opacity: 1.0;
} */
.ender_outer {
   display: block;
   position: absolute;
   width: 50px;
   height: 50px;
   background-color: white;
   border-radius: 25px;
   z-index: 0;
}
.ender_inner {
   display: block;
   position: absolute;
   left: 20px;
   top: 20px;
   width: 10px;
   height: 10px;
   background-color: black;
   border-radius: 10px;
}

/* ================== TOOLBOX ================== */

div.toolbox-divider {
   width: 90%;
   margin: 0 auto;
   height: 1px;
   background-color: lightgray;
}
div.ulabel-night div.toolbox-divider {
   background-color: gray;
}


div.mode-selection, div.zoom-pan {
   padding: 10px 30px;
}

/* === Annotation Mode === */
p.current_mode_container {
   margin-top: 0px;
   margin-bottom: 5px;
}
span.current_mode {
   color: cornflowerblue;
}
div.mode-opt {
   display: inline-block;
}
a.md-btn {
   display: block;
   text-align: center;
   height: 30px;
   width: 30px;
   padding: 10px;
   margin: 0 auto;
   text-decoration: none;
   /* background-color: rgba(231, 231, 231, 1); */
   color: black;
   font-size: 1.2em;
   font-family: sans-serif;
}

a.md-btn svg {
   height: 30px;
   width: 30px;
}

a.md-btn:hover {
   background-color: rgba(255, 181, 44, 0.397);
}

a.md-btn.sel {
   background-color: rgba(100, 148, 237, 0.459);
}

/* === Pan & Zoom === */

div.zoom-pan {
   padding-bottom: 0;
   padding-top: 0;
}
div.half-tb {
   display: inline-block;    
   width: 50%;
   vertical-align: middle;
}
span.htblbl {
   display: inline-block;
   /* font-weight: bold; */
   vertical-align: middle;
}
span.htbpyld {
   display: inline-block;
   vertical-align: middle;
}

span.panudlr {
   display: inline-block;
   position: relative;
   width: 60px;
   height: 60px;
   border-radius: 30px;
}

a.zbutt, a.wbutt {
   display: inline-block;
   height: 20px;
   width: 20px;
   background-color: lightgray;
   vertical-align: middle;
   text-align: center;
   text-decoration: none;
   color: white;
   border-radius: 11px;
   line-height: 20px;
   border: 1px solid rgb(168, 168, 168);
}
span.panudlr {
   transform: rotate(-45deg);
}
a.pbutt {
   display: block;
   position: absolute;
   width: 28px;
   height: 28px;
   border-radius: 0;
   border: 1px solid rgb(168, 168, 168);
   background-color: lightgray;
}
a.pbutt.up {
   right: 0;
   top: 0;
   border-top-right-radius: 30px;
}
a.pbutt.down {
   left: 0;
   bottom: 0;
   border-bottom-left-radius: 30px;
}
a.pbutt.left {
   left: 0;
   top: 0;
   border-top-left-radius: 30px;
}
a.pbutt.right {
   right: 0;
   bottom: 0;
   border-bottom-right-radius: 30px;
}
a.pbutt:hover, a.zbutt:hover, a.wbutt:hover {
   background-color: rgba(100, 148, 237, 0.486);
}
a.pbutt:active, a.zbutt:active, a.wbutt:active {
   background-color:cornflowerblue;
}
span.spokes {
   position: absolute;
   left: 19px;
   top: 19px;
   height: 20px;
   width: 20px;
   background-color: white;
   border-radius: 10px;
   border: 1px solid gray;
}
div.ulabel-night span.spokes {
   background-color:rgb(24, 24, 24);
   /* border: 1px solid black; */
}

div.zpcont {
   height: 90px;
   position: relative;
   background-color: white;
}
div.ulabel-night div.zpcont {
   background-color: rgb(24, 24, 24);
}
div.zpcont:hover, div.ulabel-night div.zpcont:hover {
   background-color: rgba(0,0,0,0);
}
div.zpcont div.lblpyldcont {
   position: absolute;
   top: 50%;
   -ms-transform: translateY(-50%);
   transform: translateY(-50%);
}
div.ulabel-night div.zpcont div.lblpyldcont {
   color: white;
}
div.ulabel-night a.zbutt, div.ulabel-night a.wbutt {
   border: 1px solid black;
   color: black !important;
}


div.htbmain {
   position: relative;
}
p.shortcut-tip {
   font-size: 10px;
   text-align: left;
   color: gray;
   position: absolute;
   bottom: 3px;
   margin: 0;
}
div.linestyle {
   padding: 10px 30px;
}
div.linestyle p.tb-header {
   margin: 0;
   margin-bottom: 5px;
}
canvas.demo-canvas {
   width: 120px;
   height: 40px;
   border: 1px solid lightgray;
}
div.ulabel-night canvas.demo-canvas {
   border: 1px solid rgb(87, 87, 87);
}
div.line-expl {
   width: 175px;
}
div.line-expl a {
   display: inline-block;
   vertical-align: middle;
}
div.line-expl canvas {
   display: inline-block;
   vertical-align: middle;
}
div.lstyl-row div.line-expl, div.lstyl-row div.setting {
   display: inline-block;
   vertical-align: middle;
}
div.setting {
   width: calc(100% - 175px);
   text-align: right;
}
div.lstyl-row div.setting a {
   display: inline-block;
   border-radius: 5px;
   padding: 3px 6px;
   margin-bottom: 5px;
   text-decoration: none;
   color: black;
   font-size: 14px;
}
div.ulabel-night div.lstyl-row div.setting a {
   color: white;
}
div.lstyl-row div.setting a {
   background-color: rgba(100, 148, 237, 0.479);
   color: black;
}
div.lstyl-row div.setting a[href="#"] {
   background-color: rgba(0,0,0,0);
   color: black;
}
div.lstyl-row div.setting a[href="#"]:hover {
   background-color: rgba(255, 181, 44, 0.397);
}

div.dialogs_container {
   position: absolute;
   top: 0;
   left: 0;
}

/* ========== Tab Buttons ========== */

div.toolbox-tabs {
   position: absolute;
   bottom: 0;
   width: 100%;
   opacity: 0.8;
}
div.toolbox-tabs div.tb-st-tab {
   display: block;
   width: 100%;
   padding: 5px 0;
   background-color: rgba(0, 3, 161, 0.144);
}
div.toolbox-tabs div.tb-st-tab.sel {
   display: block;
   width: 100%;
   background-color: rgba(0, 3, 161, 0.561);
}
div.toolbox-tabs div.tb-st-tab * {
   vertical-align: middle;
}
div.toolbox-tabs div.tb-st-tab a.tb-st-switch {
   display: inline-block;
   width: 70px;
   padding: 0 15px;
   text-decoration: none;
   color: rgb(37, 37, 37);
}
div.ulabel-night div.toolbox-tabs div.tb-st-tab a.tb-st-switch {
   color: rgb(150, 150, 150);
}
div.toolbox-tabs div.tb-st-tab.sel a.tb-st-switch {
   color: rgb(238, 238, 238);
}
div.ulabel-night div.toolbox-tabs div.tb-st-tab.sel a.tb-st-switch {
   color: rgb(238, 238, 238);
}
div.toolbox-tabs div.tb-st-tab a.tb-st-switch[href]:hover {
   color: cornflowerblue;
}
div.ulabel-night div.toolbox-tabs div.tb-st-tab a.tb-st-switch[href]:hover {
   color: rgb(238, 238, 238);
}
div.toolbox-tabs div.tb-st-tab span.tb-st-range {
   display: inline-block;
   width: calc(100% - 100px);
   text-align: center;
}
div.toolbox-tabs div.tb-st-tab span.tb-st-range input {
   width: 80%;
   transform: rotate(180deg);
}

/* ========== Annotation Box Dialogs ========== */

div.global_edit_suggestion {
   display: none;
   position: absolute;
   width: 150px;
   height: 75px;
   text-align: center;
   z-index: 1;
   /* background-color: white; */
   transform: scale(0.66666);
}
div.global_edit_suggestion.mcm {
   width: 225px;
   transform: scale(0.5);
}
a.global_sub_suggestion {
   width: 60px;
   height: 60px;
   margin: 7.5px;
   display: inline-block;
   border-radius: 37.5px;
   background-color: white;
   overflow: hidden;
}
a.global_sub_suggestion img {
   display: block;
   width: 40px;
   height: 40px;
   padding: 10px;
}
a.global_sub_suggestion span.bigx {
   position: absolute;
   display: block;
   font-size: 4em;
   text-align: center;
   width: 60px;
   top: 50%;
   -ms-transform: translateY(-50%);
   transform: translateY(-50%);
   color: black;
   text-decoration: none;
}
a.global_sub_suggestion.reid_suggestion {
   opacity: 0.3;
   background-color: black;
}
a.global_sub_suggestion.reid_suggestion:hover {
   opacity: 0; 
}
div.classification {
   padding: 10px 30px;
}
div.classification p.tb-header {
   margin: 0;
   margin-bottom: 5px;
}

a.tbid-opt {
   display: inline-block;
   text-decoration: none;
   padding: 5px 8px;
   border-radius: 5px;
   color: black;
}
div.colprev {
   display: inline-block;
   vertical-align: middle;
   height: 15px;
   width: 15px;
}
span.tb-cls-nam {
   display: inline-block;
   vertical-align: middle;
}
a.tbid-opt:hover {
   background-color: rgba(255, 181, 44, 0.397);
}
a.tbid-opt.sel {
   background-color: rgba(100, 148, 237, 0.459);
}
div.toolbox-name-header {
   background-color: rgb(0, 128, 202);
   margin: 0;
}
div.ulabel-night div.toolbox-name-header {
   background-color: rgb(0, 60, 95);
}
div.toolbox-name-header h1 {
   margin: 0;
   padding: 0;
   font-size: 15px;
   display: inline-block;
   padding: 10px 15px;
   width: calc(50% - 30px);
   vertical-align: middle;
}
div.toolbox-name-header h1 a {
   color: white;
   font-weight: 100;
   text-decoration: none;
}
div.night-button-cont {
   text-align: right;
   display: inline-block;
   vertical-align: middle;
   position: relative;
   padding-right: 10px;
   width: calc(50% - 10px);
}
a.night-button {
   display: inline-block;
   padding: 10px;
   opacity: 0.7;
}
div.night-button-track {
   width: 35px;
   height: 12px;
   border-radius: 6px;
   position: relative;
   display: inline-block;
   background-color: rgba(0, 0, 0, 0.52);
}
div.night-status {
   width: 20px;
   height: 20px;
   border-radius: 10px;
   position: absolute;
   background-color: rgb(139, 139, 139);
   left: -4px;
   top: -4px;
   transition: left 0.2s;
}
a.night-button:hover {
   opacity: 1;
}
div.ulabel-night div.night-button-track {
   background-color: rgba(255, 255, 255, 0.52);
}
div.ulabel-night div.night-status {
   left: 19px;
}


div.ulabel-night div.annbox_cls::-webkit-scrollbar {
   background-color: black;
}
div.ulabel-night div.annbox_cls::-webkit-scrollbar-track {
   background-color: black;
}
div.ulabel-night div.annbox_cls::-webkit-scrollbar-thumb {
   border: 1px solid rgb(110, 110, 110);
   background-color: rgb(51, 51, 51);
}
div.ulabel-night div.annbox_cls::-webkit-scrollbar-thumb:hover {
   background-color: rgb(90, 90, 90);
} 
div.ulabel-night div.annbox_cls::-webkit-scrollbar-corner {
   background-color:rgb(0, 60, 95);
}


a.id-dialog-clickable-indicator {
   position: absolute; 
   top: 0;
   left: 0;
   display: block;
   border-radius: 200px;
   height: 400px;
   width: 400px;
   overflow: hidden;
}
a.id-dialog-clickable-indicator svg {
   position: absolute;
   top: 0;
   left: 0;
}

.editable {
   display: none;
   position: absolute;
   width: 50px;
   height: 50px;
   background-color: gray;
   opacity: 0.7;
   border-radius: 25px;
   z-index: 0;
}
.editable.soft {
   opacity: 0.4;
}
.editable:hover {
   background-color: white;
   opacity: 1.0;
}
.editable.soft:hover {
   opacity: 0.7;
}

div.toolbox-refs {
   text-align: center;
}
div.toolbox-refs a {
   color: rgb(5, 50, 133);
   display: inline-block;
   margin-top: 10px;
}
div.toolbox-refs a:hover {
   color: rgb(44, 77, 139);
}
div.ulabel-night div.toolbox-refs a {
   color: rgb(176, 202, 250);
}
div.ulabel-night div.toolbox-refs a:hover {
   color: rgb(123, 160, 228);
}

#submit-button {
   display: block;
   padding: 20px;
   border-radius: 10px;
   color: white;
   background-color: rgba(255, 166, 0, 0.739);
   text-decoration: none;
   font-size: 1.5em;
   text-align: center;
   width: 150px;
   margin: 30px auto;
}
#submit-button:hover {
   background-color: rgba(255, 166, 0, 1.0);
}
#submit-button:active {
   box-shadow: 0 0 3px black;
}
div.ulabel-night #submit-button:active {
   box-shadow: 0 0 8px white;
}
`;

// TODO more of these
const COLORS = [
   "orange", "crimson", "dodgerblue", "midnightblue", "seagreen", "tan", "blueviolet", "chocolate",
   "darksalmon", "deeppink", "fuchsia"
];

export { BBOX_SVG, POLYGON_SVG, CONTOUR_SVG, TBAR_SVG, DEMO_ANNOTATION, INIT_STYLE, COLORS };