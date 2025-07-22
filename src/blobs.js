// z-indices for canvases
const FRONT_Z_INDEX = 100;
const BACK_Z_INDEX = 75;
const DEMO_ANNOTATION = { id: "7c64913a-9d8c-475a-af1a-658944e37c31", new: true, parent_id: null, created_by: "TestUser", created_at: "2020-12-21T02:41:47.304Z", deprecated: false, spatial_type: "contour", spatial_payload: [[4, 25], [4, 25], [4, 24], [4, 23], [4, 22], [4, 22], [5, 22], [5, 21], [5, 20], [6, 20], [6, 19], [7, 19], [7, 18], [8, 18], [8, 18], [10, 18], [11, 18], [11, 17], [12, 17], [12, 16], [12, 16], [13, 16], [14, 15], [16, 14], [16, 14], [17, 14], [18, 14], [18, 13], [19, 13], [20, 13], [20, 13], [21, 13], [22, 13], [23, 13], [24, 13], [24, 13], [25, 13], [26, 13], [27, 13], [28, 13], [28, 13], [29, 13], [30, 13], [31, 13], [32, 13], [34, 13], [36, 14], [36, 14], [37, 15], [40, 15], [40, 16], [41, 16], [42, 17], [43, 17], [44, 18], [44, 18], [45, 18], [46, 18], [47, 18], [47, 18], [48, 18], [48, 18], [49, 19], [50, 20], [52, 20], [52, 20], [53, 21], [54, 21], [55, 21], [56, 21], [57, 21], [58, 22], [59, 22], [60, 22], [60, 22], [61, 22], [63, 22], [64, 22], [64, 22], [65, 22], [66, 22], [67, 22], [68, 22], [68, 21], [69, 21], [70, 20], [70, 19], [71, 19], [71, 18], [72, 18], [72, 18], [72, 18], [73, 18], [75, 17], [75, 16], [76, 16], [76, 16], [76, 15], [77, 14], [78, 14], [79, 14], [79, 13], [79, 12], [80, 12], [81, 12], [82, 11], [83, 11], [84, 10], [85, 10], [86, 10], [87, 10], [88, 10], [88, 10], [89, 10], [90, 10], [91, 10], [92, 10], [92, 10], [93, 10], [94, 10], [94, 10], [95, 10], [96, 10], [96, 11], [96, 11], [98, 11], [98, 12], [99, 12], [100, 13], [100, 14], [101, 14], [101, 15], [102, 15], [104, 16], [104, 17], [104, 18], [105, 18], [106, 18], [106, 18], [107, 18], [107, 19], [107, 20], [108, 20], [108, 21], [108, 21], [108, 22], [109, 22], [109, 22], [109, 23]], classification_payloads: null, annotation_meta: "is_assigned_to_each_annotation" };
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
const DELETE_BBOX_SVG = `
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
  </g>
    <g id="dontSymbol">
      <path
         d="M 50,50 m -48,0 a 41,41 0 1,0 96,0 a 41,41 0 1,0 -96,0"
         style="fill:none;stroke:#ff0000;stroke-width:2"
      />
      <path
         d="M 16,16 L 84,84"
         style="fill:none;stroke:#ff0000;stroke-width:2"
      />
  </g>
</svg>
`;
const POINT_SVG = `
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
   sodipodi:docname="point.svg">
  <defs
     id="defs7238">
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1156"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path1154"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1152"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path1150"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1148"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path946"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
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
     inkscape:zoom="1.1443229"
     inkscape:cx="138.27833"
     inkscape:cy="159.299"
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
    <circle
       style="fill:#fedbdb;fill-opacity:0;stroke:#000000;stroke-width:3.34195209;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;paint-order:normal"
       id="path884"
       cx="50"
       cy="247"
       r="23.329023" />
    <circle
       style="fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:1.06185877;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;paint-order:normal"
       id="path886"
       cx="50"
       cy="247"
       r="6.9690704" />
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
const DELETE_POLYGON_SVG = `
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
  </g>
    <g id="dontSymbol">
      <path
         d="M 50,50 m -48,0 a 41,41 0 1,0 96,0 a 41,41 0 1,0 -96,0"
         style="fill:none;stroke:#ff0000;stroke-width:2"
      />
      <path
         d="M 16,16 L 84,84"
         style="fill:none;stroke:#ff0000;stroke-width:2"
      />
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
const GLOBAL_SVG = `
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
   sodipodi:docname="global_v2.svg">
  <defs
     id="defs7238">
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1156"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path1154"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1152"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path1150"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1148"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path946"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
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
     inkscape:cx="5.310344"
     inkscape:cy="177.26523"
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
       style="fill:none;stroke:#000000;stroke-width:1.27714288;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="M 30.000035,244.14279 V 226.99993 H 47.142863"
       id="path883"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.27714288;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="M 47.142863,286.99993 H 30.000035 v -17.14286"
       id="path883-3"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.27714288;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="m 89.999929,269.85707 v 17.14286 H 72.857102"
       id="path883-3-6"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.27714288;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="m 72.857102,226.99993 h 17.142827 v 17.14286"
       id="path883-3-7"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.27714133;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.66666669"
       d="M 20.000052,234.14279 V 216.99993 H 37.14284"
       id="path883-2"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.27714133;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.66666669"
       d="M 30,276.99993 H 20.000052 V 259.85707"
       id="path883-3-70"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.27714133;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.66666669"
       d="M 62.857016,216.99993 H 79.999804 V 227"
       id="path883-3-7-3"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.27714133;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.53431374"
       d="M 10.00007,224.14279 V 206.99993 H 27.142858"
       id="path883-2-6"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.27714133;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.53431374"
       d="M 19.5,266.99993 H 10.00007 V 249.85707"
       id="path883-3-70-0"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.27714133;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.53431374"
       d="M 52.857035,206.99993 H 69.999821 V 216.5"
       id="path883-3-7-3-2"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
  </g>
</svg>
`;
const WHOLE_IMAGE_SVG = `
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
   sodipodi:docname="whole_image.svg">
  <defs
     id="defs7238">
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1156"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path1154"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1152"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path1150"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1148"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path946"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
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
     inkscape:cx="102.54275"
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
       style="fill:none;stroke:#000000;stroke-width:1.49000001;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="M 15,232 V 212 H 35"
       id="path883"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.49000001;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="M 35,282 H 15 v -20"
       id="path883-3"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.49000001;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="m 85,262 v 20 H 65"
       id="path883-3-6"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
    <path
       style="fill:none;stroke:#000000;stroke-width:1.49000001;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
       d="m 65,212 h 20 v 20"
       id="path883-3-7"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="ccc" />
  </g>
</svg>
`;
const POLYLINE_SVG = `
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
       refY="0.0"
       refX="0.0"
       id="marker1156"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path1154"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1152"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path1150"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
    <marker
       inkscape:stockid="DotL"
       orient="auto"
       refY="0.0"
       refX="0.0"
       id="marker1148"
       style="overflow:visible"
       inkscape:isstock="true">
      <path
         id="path946"
         d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
         style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
         transform="scale(0.8) translate(7.4, 1)" />
    </marker>
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
     inkscape:cx="227.89989"
     inkscape:cy="182.97951"
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
       style="fill:none;stroke:#000000;stroke-width:1.49000001;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1;marker-start:url(#marker1148);marker-mid:url(#marker1152);marker-end:url(#marker1156)"
       d="M 15.497022,283.01488 28.915179,250.31994 67.657737,240.11458 87.879463,210.06547"
       id="path883"
       inkscape:connector-curvature="0"
       sodipodi:nodetypes="cccc" />
  </g>
</svg>
`;
const BBOX3_SVG = `
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
   sodipodi:docname="bbox3.svg">
<defs
  id="defs7338">
 <marker
    inkscape:isstock="true"
    style="overflow:visible"
    id="marker3387"
    refX="0"
    refY="0"
    orient="auto"
    inkscape:stockid="DotL">
   <path
      transform="matrix(0.8,0,0,0.8,5.92,0.8)"
      style="fill:#757575;fill-opacity:0.98039216;fill-rule:evenodd;stroke:#757575;stroke-width:1.00000003pt;stroke-opacity:0.98039216"
      d="m -2.5,-1 c 0,2.76 -2.24,5 -5,5 -2.76,0 -5,-2.24 -5,-5 0,-2.76 2.24,-5 5,-5 2.76,0 5,2.24 5,5 z"
      id="path3385"
      inkscape:connector-curvature="0" />
 </marker>
 <marker
    inkscape:isstock="true"
    style="overflow:visible"
    id="marker2383"
    refX="0"
    refY="0"
    orient="auto"
    inkscape:stockid="DotL">
   <path
      transform="matrix(0.8,0,0,0.8,5.92,0.8)"
      style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1.00000003pt;stroke-opacity:1"
      d="m -2.5,-1 c 0,2.76 -2.24,5 -5,5 -2.76,0 -5,-2.24 -5,-5 0,-2.76 2.24,-5 5,-5 2.76,0 5,2.24 5,5 z"
      id="path2381"
      inkscape:connector-curvature="0" />
 </marker>
 <marker
    inkscape:isstock="true"
    style="overflow:visible"
    id="marker2313"
    refX="0"
    refY="0"
    orient="auto"
    inkscape:stockid="DotL">
   <path
      transform="matrix(0.8,0,0,0.8,5.92,0.8)"
      style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1.00000003pt;stroke-opacity:1"
      d="m -2.5,-1 c 0,2.76 -2.24,5 -5,5 -2.76,0 -5,-2.24 -5,-5 0,-2.76 2.24,-5 5,-5 2.76,0 5,2.24 5,5 z"
      id="path2211"
      inkscape:connector-curvature="0" />
 </marker>
 <marker
    inkscape:stockid="DotL"
    orient="auto"
    refY="0.0"
    refX="0.0"
    id="marker1651"
    style="overflow:visible"
    inkscape:isstock="true">
   <path
      id="path1649"
      d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
      style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
      transform="scale(0.8) translate(7.4, 1)" />
 </marker>
 <marker
    inkscape:stockid="DotL"
    orient="auto"
    refY="0.0"
    refX="0.0"
    id="marker1315"
    style="overflow:visible"
    inkscape:isstock="true">
   <path
      id="path1313"
      d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
      style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
      transform="scale(0.8) translate(7.4, 1)" />
 </marker>
 <marker
    inkscape:stockid="DotL"
    orient="auto"
    refY="0.0"
    refX="0.0"
    id="marker1145"
    style="overflow:visible"
    inkscape:isstock="true">
   <path
      id="path943"
      d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
      style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
      transform="scale(0.8) translate(7.4, 1)" />
 </marker>
 <marker
    inkscape:stockid="DotL"
    orient="auto"
    refY="0.0"
    refX="0.0"
    id="marker1156"
    style="overflow:visible"
    inkscape:isstock="true">
   <path
      id="path1254"
      d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
      style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
      transform="scale(0.8) translate(7.4, 1)" />
 </marker>
 <marker
    inkscape:stockid="DotL"
    orient="auto"
    refY="0.0"
    refX="0.0"
    id="marker1152"
    style="overflow:visible"
    inkscape:isstock="true">
   <path
      id="path1160"
      d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
      style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
      transform="scale(0.8) translate(7.4, 1)" />
 </marker>
 <marker
    inkscape:stockid="DotL"
    orient="auto"
    refY="0.0"
    refX="0.0"
    id="marker1148"
    style="overflow:visible"
    inkscape:isstock="true">
   <path
      id="path951"
      d="M -2.5,-1.0 C -2.5,1.7600000 -4.7400000,4.0 -7.5,4.0 C -10.260000,4.0 -12.5,1.7600000 -12.5,-1.0 C -12.5,-3.7600000 -10.260000,-6.0 -7.5,-6.0 C -4.7400000,-6.0 -2.5,-3.7600000 -2.5,-1.0 z "
      style="fill-rule:evenodd;stroke:#000000;stroke-width:1pt;stroke-opacity:1;fill:#000000;fill-opacity:1"
      transform="scale(0.8) translate(7.4, 1)" />
 </marker>
 <marker
    inkscape:stockid="DotL"
    orient="auto"
    refY="0"
    refX="0"
    id="DotL"
    style="overflow:visible"
    inkscape:isstock="true"
    inkscape:collect="always">
   <path
      inkscape:connector-curvature="0"
      id="path4591"
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
      id="path7234"
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
  inkscape:cx="-23.528679"
  inkscape:cy="177.26523"
  inkscape:document-units="mm"
  inkscape:current-layer="layer2"
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
    style="fill:none;stroke:#454545;stroke-width:1.55600691;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1"
    d="M 10.756538,266.99254 H 70.756863"
    id="path2551"
    inkscape:connector-curvature="0"
    sodipodi:nodetypes="cc" />
 <path
    style="fill:none;stroke:#454545;stroke-width:1.55600691;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:0.98039216;marker-mid:url(#marker3387)"
    d="m 70.756864,206.99233 -10e-7,60.16215 18.4441,19.83814"
    id="path2553"
    inkscape:connector-curvature="0"
    sodipodi:nodetypes="ccc" />
</g>
<g
  inkscape:groupmode="layer"
  id="layer2"
  inkscape:label="Layer 2">
 <path
    style="fill:none;stroke:#000000;stroke-width:1.55600691;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1;marker-mid:url(#marker2383)"
    d="M 30.756486,89.992787 10.756538,69.992546 V 9.9923299 h 60.000325 l 18.44426,21.5559081"
    id="path973-1"
    inkscape:connector-curvature="0"
    sodipodi:nodetypes="ccccc" />
 <path
    style="fill:none;stroke:#000000;stroke-width:1.55600691;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1;marker-start:url(#marker1145);marker-mid:url(#marker1315);marker-end:url(#marker1651)"
    d="M 10.756538,9.9923299 30.756484,31.548238"
    id="path880"
    inkscape:connector-curvature="0" />
 <path
    style="fill:none;stroke:#000000;stroke-width:1.56000698;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1;marker-mid:url(#marker1145)"
    d="M 30.756646,89.992617 H 89.200963 V 31.548238"
    id="path2155"
    inkscape:connector-curvature="0"
    sodipodi:nodetypes="ccc" />
 <path
    style="fill:none;stroke:#000000;stroke-width:1.55600691;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1;marker-start:url(#marker1145);marker-mid:url(#marker1145);marker-end:url(#marker1145)"
    d="M 89.201121,31.548238 H 30.756484 l 2e-6,58.444549"
    id="path2153"
    inkscape:connector-curvature="0" />
</g>
</svg>
`;

let get_init_style = (prntid) => {
    const NONSP_SZ = 400;
    return `
div#${prntid} {
   display: none;
}
div#${prntid} * {
   box-sizing: content-box;
   text-align: center;
}
div#${prntid}.ulabel-night {
   background-color: black;
}
div#${prntid} div.full_ulabel_container_ {
   font-family: sans-serif;
}

div#${prntid} .ulabel-hidden {
   display: none !important;
}

div#${prntid} div.annbox_cls, div#${prntid} div.toolbox_cls {
   height: 100%;
}
div#${prntid} div.annbox_cls {
   width: calc(100% - 320px);
   background-color: black;
   overflow: scroll;
   position: absolute;
   top: 0;
   left: 0;
}
div#${prntid} div.annbox_cls img.image_frame {
   position: absolute;
   top: 0;
   left: 0;
   max-width: none;
   max-height: none;
}


/* Frame annotation dialog */
div#${prntid} div.frame_annotation_dialog {
   width: 60px;
   overflow: hidden;
   position: absolute;
   z-index: 80;
   background-color: rgb(255, 255, 255);
   border: 1px solid rgb(143, 143, 143);
   transition: opacity 0.1s, width 0.3s, height 0.3s, min-height 0.3s;
   opacity: 0.5;
   top: 40px;
}
div#${prntid} div.frame_annotation_dialog.fad_ind__0 {
   right: 360px;
}
div#${prntid} div.frame_annotation_dialog.fad_ind__1 {
   right: 445px;
}
div#${prntid} div.frame_annotation_dialog.fad_ind__2 {
   right: 530px;
}
div#${prntid} div.frame_annotation_dialog.fad_ind__3 {
   right: 615px;
}
div#${prntid} div.frame_annotation_dialog div.hide_overflow_container {
   width: 100%;
   /* position: absolute;
   right: 0; */
   overflow: hidden;
}
div#${prntid} div.frame_annotation_dialog.active:hover, div#${prntid} div.frame_annotation_dialog.active.permopen {
   max-width: none;
   width: ${NONSP_SZ}px;
   overflow: visible;
}
div#${prntid} div.frame_annotation_dialog.active {
   z-index: 125;
   opacity: 1.0;
}
div#${prntid}.ulabel-night div.frame_annotation_dialog {
   background-color: rgb(37, 37, 37);
   border: 1px solid rgb(102, 102, 102);
   text-align: right;
}
div.front_dialogs {
   position: absolute;
   top: 0;
   right: 0;
   z-index: -1;
}
div#${prntid} div.frame_annotation_dialog div.row_container {
   position: relative;
   width: ${NONSP_SZ}px;
   left: ${60 - NONSP_SZ}px;
   overflow: visible;
   transition: left 0.3s;
}
div#${prntid} div.frame_annotation_dialog:hover div.row_container, div#${prntid} div.frame_annotation_dialog.active.permopen div.row_container {
   left: 0;
   overflow: visible;
}
/* ROWS */
div#${prntid} div.frame_annotation_dialog div.fad_row {
   width: ${NONSP_SZ}px;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_row_inner {
   width: ${NONSP_SZ}px;
   text-align: right;
}

/* NAME */
div#${prntid} div.fad_st_name {
   font-size: 8px;
   padding: 4px;
   width: 52px;
   overflow: hidden;
   text-align: center;
   display: inline-block;
}
div#${prntid}.ulabel-night div.fad_st_name {
   color: white;
}

/* ADD BUTTON */
div#${prntid} div.fad_st_add {
   width: 60px;
   height: 50px;
   display: none;
   position: relative;
}
div#${prntid} div.frame_annotation_dialog.active div.fad_st_add {
   display: inline-block;
}
div#${prntid} div.frame_annotation_dialog div.fad_row.add a.add-glob-button {
   position: absolute;
   font-size: 20px;
   width: 25px;
   height: 25px;
   border-radius: 12.5px;
   text-decoration: none;
   background-color: rgba(128, 128, 128, 0.198);
   color: gray;
   border: 1px solid gray;
   top: 25px;
   left: 30px;
   transform: translateX(-50%) translateY(-50%);
   line-height: 25px;
   text-align: center;
}
/* div#${prntid} div.frame_annotation_dialog div.fad_row.add a.add-glob-button span.plus {
   display: block;
   text-align: center;
   width: 25px;
   height: 25px;
   position: absolute;
   top: 12.5px;
   left: 12.5px;
   transform: translateX(-50%) translateY(-50%);
   color: black;
} */
div#${prntid} div.frame_annotation_dialog div.fad_row.add a.add-glob-button:hover {
   border-color: black;
   color: black;
}
div#${prntid}.ulabel-night div.frame_annotation_dialog div.fad_row.add a.add-glob-button:hover {
   border-color: white;
   color: white;
}
div#${prntid}.ulabel-night div.frame_annotation_dialog div.fad_row.add a.add-glob-button span.plus {
   color: white;
}
div#${prntid} div.frame_annotation_dialog.active div.fad_row.add {
   display: inline-block;
}

div#${prntid} div.frame_annotation_dialog div.fad_annotation_rows {
   width: ${NONSP_SZ}px;
   display: inline-block;
}

div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons {
   display: inline-block;
   vertical-align: top;
   min-height: 60px;
   width: ${NONSP_SZ - 60}px;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_type_icon {
   display: inline-block;
   vertical-align: top;
   height: 60px;
   width: 60px;
   position: relative;
   text-align: center;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_type_icon svg {
   height: 50px;
   width: 50px;
   padding: 5px;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons div.fad_inp_container {
   display: inline-block;
   vertical-align: top;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons div.fad_inp_container.text {
   width: ${NONSP_SZ - 180}px;
   margin: 0;
   border: none;
   padding: none;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons div.fad_inp_container.text textarea {
   box-sizing: border-box;
   width: calc(100% - 2px);
   height: 58px;
   min-height: 58px;
   resize: vertical;
   background-color: rgba(0,0,0,0);
}
div#${prntid}.ulabel-night div.frame_annotation_dialog div.fad_row div.fad_buttons div.fad_inp_container.text textarea {
   color: white;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons div.fad_inp_container.button {
   width: 30px;
   height: 30px;
   padding: 15px;
   padding-right: 20px;
   padding-left: 0;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons div.fad_inp_container.button.frst {
   padding-left: 20px;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons a.fad_button {
   display: block;
   width: 28px;
   height: 28px;
   background-color: rgba(128, 128, 128, 0.198);
   border-radius: 14px;
   border: 1px solid gray;
   color: gray;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons a.fad_button:hover {
   border-color: black;
   color: black;
}
div#${prntid}.ulabel-night div.frame_annotation_dialog div.fad_row div.fad_buttons a.fad_button:hover {
   border-color: white;
   color: white;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons a.fad_button.reclf {
   position: relative;
}
div#${prntid} div.frame_annotation_dialog div.fad_row div.fad_buttons a.fad_button.delete {
   text-decoration: none;
   text-align: center;
   line-height: 28px;
   font-size: 22px;
}

div#${prntid} div.canvasses {
   position: absolute;
   top: 0; 
   left: 0;
   padding-right: 100%;
   padding-bottom: 100%;
}
div#${prntid} canvas.canvas_cls {
   position: absolute;
   top: 0;
   left: 0;
}
div#${prntid} canvas.annotation_canvas {
   pointer-events: none;
}

div#${prntid} .id_dialog {
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
div#${prntid} .ender_outer {
   display: block;
   position: absolute;
   width: 50px;
   height: 50px;
   background-color: transparent;
   box-shadow: 0 0 0 2px white;
   border-radius: 25px;
   z-index: ${FRONT_Z_INDEX};
}
div#${prntid} .ender_inner {
   display: block;
   position: absolute;
   left: 20px;
   top: 20px;
   width: 10px;
   height: 10px;
   background-color: transparent;
   border-radius: 10px;
}
div#${prntid} .brush_circle {
   display: block;
   position: absolute;
   width: 50px;
   height: 50px;
   background-color: white;
   opacity: 0.4;
   border-radius: 25px;
   z-index: ${FRONT_Z_INDEX};
}

/* ================== TOOLBOX ================== */

div#${prntid} div.zpcont {
   height: 90px;
   position: relative;
   background-color: white;
}

div#${prntid}.ulabel-night div.zpcont {
   background-color: rgb(24, 24, 24);
}

div#${prntid} div.zpcont:hover, div#${prntid}.ulabel-night div.zpcont:hover {
   background-color: rgba(0,0,0,0);
}

div#${prntid} div.linestyle {
   padding: 10px 30px;
}

div#${prntid} canvas.demo-canvas {
   width: 120px;
   height: 40px;
   border: 1px solid lightgray;
}
div#${prntid}.ulabel-night canvas.demo-canvas {
   border: 1px solid rgb(87, 87, 87);
}
div#${prntid} div.line-expl {
   width: 185px;
}

div#${prntid} div.line-expl a {
   display: inline-block;
   vertical-align: middle;
}
div#${prntid} div.line-expl canvas {
   display: inline-block;
   vertical-align: middle;
   width: 120px;
   height: 40px;
}
div#${prntid} div.lstyl-row div.line-expl, div#${prntid} div.lstyl-row div.setting {
   display: inline-block;
   vertical-align: middle;
}
div#${prntid} div.setting {
   width: calc(100% - 185px);
   text-align: right;
}
div#${prntid} div.lstyl-row div.setting a {
   display: inline-block;
   border-radius: 5px;
   padding: 3px 6px;
   margin-bottom: 5px;
   text-decoration: none;
   color: black;
   font-size: 14px;
}
div#${prntid}.ulabel-night div.lstyl-row div.setting a {
   color: white;
}
div#${prntid} div.lstyl-row div.setting a {
   background-color: rgba(100, 148, 237, 0.479);
   color: black;
}
div#${prntid} div.lstyl-row div.setting a[href="#"] {
   background-color: rgba(0,0,0,0);
   color: black;
}
div#${prntid}.ulabel-night div.lstyl-row div.setting a[href="#"] {
   color: white;
}
div#${prntid} div.lstyl-row div.setting a[href="#"]:hover {
   background-color: rgba(255, 181, 44, 0.397);
}

div#${prntid} div.dialogs_container {
   position: absolute;
   top: 0;
   left: 0;
}

div.toolbox_inner_cls {
   height: calc(100% - 38px);
   overflow-y: scroll;
   overflow-x: hidden;
}


/* ========== Tab Buttons ========== */

div#${prntid} div.toolbox-tabs {
   position: absolute;
   bottom: 0;
   width: 100%;
   opacity: 0.8;
}
div#${prntid} div.toolbox-tabs div.tb-st-tab {
   display: block;
   width: 100%;
   padding: 5px 0;
   background-color: rgba(0, 3, 161, 0.144);
}
div#${prntid} div.toolbox-tabs div.tb-st-tab.sel {
   display: block;
   width: 100%;
   background-color: rgba(0, 3, 161, 0.561);
}
div#${prntid} div.toolbox-tabs div.tb-st-tab * {
   vertical-align: middle;
}
div#${prntid} div.toolbox-tabs div.tb-st-tab a.tb-st-switch {
   display: inline-block;
   width: 70px;
   padding: 0 15px;
   text-decoration: none;
   color: rgb(37, 37, 37);
}
div#${prntid}.ulabel-night div.toolbox-tabs div.tb-st-tab a.tb-st-switch {
   color: rgb(150, 150, 150);
}
div#${prntid} div.toolbox-tabs div.tb-st-tab.sel a.tb-st-switch {
   color: rgb(238, 238, 238);
}
div#${prntid}.ulabel-night div.toolbox-tabs div.tb-st-tab.sel a.tb-st-switch {
   color: rgb(238, 238, 238);
}
div#${prntid} div.toolbox-tabs div.tb-st-tab a.tb-st-switch[href]:hover {
   color: cornflowerblue;
}
div#${prntid}.ulabel-night div.toolbox-tabs div.tb-st-tab a.tb-st-switch[href]:hover {
   color: rgb(238, 238, 238);
}
div#${prntid} div.toolbox-tabs div.tb-st-tab span.tb-st-range {
   display: inline-block;
   width: calc(100% - 100px);
   text-align: center;
}
div#${prntid} div.toolbox-tabs div.tb-st-tab span.tb-st-range input {
   width: 80%;
   transform: rotate(180deg);
}

/* ========== Annotation Box Dialogs ========== */

div#${prntid} div.global_edit_suggestion {
   display: none;
   position: absolute;
   width: 150px;
   /*height: 75px;*/
   height: 0px;
   text-align: center;
   z-index: 1;
   /* background-color: white; */
   transform: scale(0.66666);
   overflow: visible;
}
div#${prntid} div.global_edit_suggestion.mcm {
   width: 225px;
   transform: scale(0.5);
}
div#${prntid} a.global_sub_suggestion {
   width: 60px;
   height: 60px;
   margin-left: 7.5px;
   margin-right: 7.5px;
   display: inline-block;
   border-radius: 37.5px;
   background-color: white;
   overflow: hidden;
   transform: translateY(-50%);
}
div#${prntid} a.global_sub_suggestion img {
   display: block;
   width: 40px;
   height: 40px;
   padding: 10px;
}
div#${prntid} a.global_sub_suggestion span.bigx {
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
div#${prntid} a.global_sub_suggestion.reid_suggestion {
   opacity: 0.3;
   background-color: black;
}
div#${prntid} a.global_sub_suggestion.reid_suggestion:hover {
   opacity: 0; 
}

div#${prntid} a.tbid-opt {
   display: inline-block;
   text-decoration: none;
   padding: 5px 8px;
   border-radius: 5px;
   color: black;
}
div#${prntid} div.colprev {
   display: inline-block;
   vertical-align: middle;
   height: 15px;
   width: 15px;
}
div#${prntid} span.tb-cls-nam {
   display: inline-block;
   vertical-align: middle;
}
div#${prntid}.ulabel-night span.tb-cls-nam {
   color: white;
}
div#${prntid} a.tbid-opt:hover {
   background-color: rgba(255, 181, 44, 0.397);
}
div#${prntid} a.tbid-opt.sel {
   background-color: rgba(100, 148, 237, 0.459);
}
div#${prntid} div.toolbox-name-header {
   background-color: rgb(0, 128, 202);
   margin: 0;
}
div#${prntid}.ulabel-night div.toolbox-name-header {
   background-color: rgb(0, 60, 95);
}
div#${prntid} div.toolbox-name-header h1 {
   margin: 0;
   padding: 0;
   font-size: 15px;
   display: inline-block;
   padding: 10px 15px;
   width: calc(70% - 30px);
   vertical-align: middle;
}
div#${prntid} div.toolbox-name-header h1 a {
   color: white;
   font-weight: 100;
   text-decoration: none;
}
div#${prntid} div.toolbox-name-header h1 {
   color: rgb(212, 212, 212);
   font-size: 12px;
   font-weight: 100;
}
div#${prntid}.ulabel-night div.toolbox-name-header h1 span.version-number {
   color: rgb(190, 190, 190);
}
div#${prntid} div.night-button-cont {
   text-align: right;
   display: inline-block;
   vertical-align: middle;
   position: relative;
   padding-right: 10px;
   width: calc(30% - 10px);
}
div#${prntid} a.night-button {
   display: inline-block;
   padding: 10px;
   opacity: 0.7;
}
div#${prntid} div.night-button-track {
   width: 35px;
   height: 12px;
   border-radius: 6px;
   position: relative;
   display: inline-block;
   background-color: rgba(0, 0, 0, 0.52);
}
div#${prntid} div.night-status {
   width: 20px;
   height: 20px;
   border-radius: 10px;
   position: absolute;
   background-color: rgb(139, 139, 139);
   left: -4px;
   top: -4px;
   transition: left 0.2s;
}
div#${prntid} a.night-button:hover {
   opacity: 1;
}
div#${prntid}.ulabel-night div.night-button-track {
   background-color: rgba(255, 255, 255, 0.52);
}
div#${prntid}.ulabel-night div.night-status {
   left: 19px;
}


div#${prntid}.ulabel-night *::-webkit-scrollbar {
   background-color: black;
}
div#${prntid}.ulabel-night *::-webkit-scrollbar-track {
   background-color: black;
}
div#${prntid}.ulabel-night *::-webkit-scrollbar-thumb {
   border: 1px solid rgb(110, 110, 110);
   background-color: rgb(51, 51, 51);
}
div#${prntid}.ulabel-night *::-webkit-scrollbar-thumb:hover {
   background-color: rgb(90, 90, 90);
} 
div#${prntid}.ulabel-night *::-webkit-scrollbar-corner {
   background-color:rgb(0, 60, 95);
}

div#${prntid} a.repo-anchor {
   text-transform: uppercase;
}


div#${prntid} a.id-dialog-clickable-indicator {
   position: absolute; 
   top: 0;
   left: 0;
   display: block;
   border-radius: 200px;
   height: 400px;
   width: 400px;
   overflow: hidden;
}
div#${prntid} a.id-dialog-clickable-indicator svg {
   position: absolute;
   top: 0;
   left: 0;
}

div#${prntid} .editable {
   display: none;
   position: absolute;
   width: 50px;
   height: 50px;
   background-color: gray;
   opacity: 0.7;
   border-radius: 25px;
   z-index: 0;
}
div#${prntid} .editable.soft {
   opacity: 0.4;
}
div#${prntid} .editable:hover {
   background-color: white;
   opacity: 1.0;
}
div#${prntid} .editable.soft:hover {
   opacity: 0.7;
}

div#${prntid} div.toolbox-refs {
   text-align: center;
}
div#${prntid} div.toolbox-refs a {
   color: rgb(5, 50, 133);
   display: inline-block;
   margin-top: 10px;
}
div#${prntid} div.toolbox-refs a:hover {
   color: rgb(44, 77, 139);
}
div#${prntid}.ulabel-night div.toolbox-refs a {
   color: rgb(176, 202, 250);
}
div#${prntid}.ulabel-night div.toolbox-refs a:hover {
   color: rgb(123, 160, 228);
}

div#${prntid} .submit-button-container {
   display: flex;
   flex-direction: column;
}
div#${prntid} .submit-button-row {
   display: flex;
   align-items: center;
   gap: 0.5em;
   overflow-x: auto;
   margin-bottom: -0.5em;
}
div#${prntid} .submit-button {
   display: flex;
   justify-content: center;
   align-items: center;
   color: white;
   background-color: rgba(255, 166, 0, 0.739); 
   margin-right: auto;
   margin-left: auto;
   margin-top: 0.5em;
   margin-bottom: 0.5em;
   cursor: pointer;
}

/* Dual ring loader */
.lds-dual-ring {
    position: absolute;
    display: block;
    width: 18px;
    height: 18px;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
}
.lds-dual-ring:after {
    content: " ";
    display: block;
    width: 14.4px;
    height: 14.4px;
    margin: 1.8px;
    border-radius: 50%;
    border: 1.35px solid #fff;
    border-color: #fff transparent #fff transparent;
    animation: lds-dual-ring 1.2s linear infinite;
}
@keyframes lds-dual-ring {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}
`;
};

const BUTTON_LOADER_HTML = `<div class="lds-dual-ring"></div>`;

// TODO more of these
const COLORS = [
    "orange",
    "crimson",
    "dodgerblue",
    "midnightblue",
    "seagreen",
    "tan",
    "blueviolet",
    "chocolate",
    "darksalmon",
    "deeppink",
    "fuchsia",
];

export {
    BBOX_SVG, DELETE_BBOX_SVG, BBOX3_SVG, POINT_SVG, POLYGON_SVG, DELETE_POLYGON_SVG, CONTOUR_SVG, TBAR_SVG, POLYLINE_SVG, WHOLE_IMAGE_SVG, GLOBAL_SVG,
    DEMO_ANNOTATION,
    get_init_style,
    COLORS, BUTTON_LOADER_HTML,
    FRONT_Z_INDEX, BACK_Z_INDEX,
};
