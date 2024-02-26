const turf = require('@turf/turf');
const polygonClipping = require('polygon-clipping');

export type Point2D = [number, number]
export type Point3D = [number, number, number]
export type LineSegment2D = [Point2D, Point2D]
export type ULabelSpatialPayload2D = Point2D[]
export type ULabelSpatialPayload3D = Point3D[]
export type PointAccessObject = {
    "access": String | number, // Access string or number that acts as the index of the point in the original spatial payload
    "distance": number,
    "point": Point2D
}
export type LineEquation = {
    "a": number,
    "b": number,
    "c": number
}

export class GeometricUtils {
    public static l2_norm(pt1: Point2D, pt2: Point2D): number {
        let ndim: number = pt1.length;
        let sq: number = 0;
        for (let i: number = 0; i < ndim; i++) {
            sq += (pt1[i] - pt2[i]) * (pt1[i] - pt2[i]);
        }
        return Math.sqrt(sq);
    }

    // Get the point at a certain proportion of the segment between two points in a polygon
    public static interpolate_poly_segment(pts: ULabelSpatialPayload2D, i: number, prop: number): Point2D {
        const pt1: Point2D = pts[i%pts.length];
        const pt2: Point2D = pts[(i + 1)%pts.length];
        return [
            pt1[0]*(1.0 - prop) + pt2[0]*prop,
            pt1[1]*(1.0 - prop) + pt2[1]*prop
        ];
    }

    // Check if two points are equal
    public static points_are_equal(pt1: Point2D, pt2: Point2D): boolean {
        return (pt1[0] === pt2[0]) && (pt1[1] === pt2[1]);
    }

    // Given two points, return the line that goes through them in the form of
    //    ax + by + c = 0
    public static get_line_equation_through_points(p1: Point2D, p2: Point2D): LineEquation {
        const a: number = (p2[1] - p1[1]);
        const b: number = (p1[0] - p2[0]);

        // If the points are the same, no line can be inferred. Return null
        if ((a === 0) && (b === 0)) return null;

        const c: number = p1[1]*(p2[0] - p1[0]) - p1[0]*(p2[1] - p1[1]);
        return {
            "a": a,
            "b": b,
            "c": c
        };
    }

    // Given a line segment in the form of ax + by + c = 0 and two endpoints for it,
    //   return the point on the segment that is closest to the reference point, as well
    //   as the distance away
    public static get_nearest_point_on_segment(
        ref_x: number, 
        ref_y: number, 
        eq: LineEquation, 
        kp1: Point2D, 
        kp2: Point2D
    // Return
    ): {"dst": number, "prop": number} {
        // Check to make sure eq exists
        if (eq === null) return null

        // For convenience
        const a: number = eq["a"];
        const b: number = eq["b"];
        const c: number = eq["c"];
    
        // Where is that point on the line, exactly?
        let nrx: number = (b*(b*ref_x - a*ref_y) - a*c)/(a*a + b*b);
        let nry: number = (a*(a*ref_y - b*ref_x) - b*c)/(a*a + b*b);
    
        // Where along the segment is that point?
        let xprop: number = 0.0;
        if (kp2[0] != kp1[0]) {
            xprop = (nrx - kp1[0])/(kp2[0] - kp1[0]);
        }
        let yprop: number = 0.0;
        if (kp2[1] != kp1[1]) {
            yprop = (nry - kp1[1])/(kp2[1] - kp1[1]);
        }

        // If the point is at an end of the segment, just return null
        if ((xprop < 0) || (xprop > 1) || (yprop < 0) || (yprop > 1)) {
            return null;        
        }

        // Distance from point to line
        let dst: number = Math.abs(a*ref_x + b*ref_y + c)/Math.sqrt(a*a + b*b);
        
        // Proportion of the length of segment from p1 to the nearest point
        const seg_length: number = Math.sqrt((kp2[0] - kp1[0])*(kp2[0] - kp1[0]) + (kp2[1] - kp1[1])*(kp2[1] - kp1[1]));
        const kprop: number = Math.sqrt((nrx - kp1[0])*(nrx - kp1[0]) + (nry - kp1[1])*(nry - kp1[1]))/seg_length;

        // Return object with info about the point
        return {
            "dst": dst,
            "prop": kprop
        };
    }

    // Check if two line segments are on the same line
    public static line_segments_are_on_same_line(line1: LineSegment2D, line2: LineSegment2D): boolean {
        const eq1: LineEquation = GeometricUtils.get_line_equation_through_points(line1[0], line1[1]);
        const eq2: LineEquation = GeometricUtils.get_line_equation_through_points(line2[0], line2[1]);
        return (
            (eq1["a"] === eq2["a"]) &&
            (eq1["b"] === eq2["b"]) &&
            (eq1["c"] === eq2["c"])
        );
    }

    // Merge parts of poly2 into poly1 if possible by finding their intersection. Returns a new poly1 and poly2, or null on failure.
    public static merge_polygons_at_intersection(poly1: ULabelSpatialPayload2D, poly2: ULabelSpatialPayload2D): ULabelSpatialPayload2D[] {
        // Find the intersection, if it exists
        let intersection: ULabelSpatialPayload2D = GeometricUtils.get_polygon_intersection_single(poly1, poly2);
        // If there's no intersection, return null
        if (intersection === null) {
            return null;
        }
        // If there is an intersection, add the non-intersecting parts of poly2 to poly1
        let non_intersection: ULabelSpatialPayload2D[] = polygonClipping.difference([poly2], [intersection]);
        let new_poly: [ULabelSpatialPayload2D[]] = polygonClipping.union([poly1], non_intersection);
        return [new_poly[0][0], intersection];
    }

    // Return the point on a polygon that's closest to a reference along with its distance
    public static get_nearest_point_on_polygon(
        ref_x: number, 
        ref_y: number, 
        spatial_payload: ULabelSpatialPayload2D, 
        dstmax: number = Infinity, 
        include_segments: boolean = false
    // Return
    ): PointAccessObject {
        const poly_pts: ULabelSpatialPayload2D = spatial_payload;

        // Initialize return value to null object
        let ret: PointAccessObject = {
            "access": null,
            "distance": null,
            "point": null
        };
        if (!include_segments) {
            // Look through polygon points one by one 
            //    no need to look at last, it's the same as first
            for (let kpi: number = 0; kpi < poly_pts.length; kpi++) {
                let kp: Point2D = poly_pts[kpi];
                // Distance is measured with l2 norm
                let kpdst: number = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
                // If this a minimum distance so far, store it
                if (ret["distance"] === null || kpdst < ret["distance"]) {
                    ret["access"] = kpi;
                    ret["distance"] = kpdst;
                    ret["point"] = poly_pts[kpi];
                }
            }
            return ret;
        }
        else {
            for (let kpi: number = 0; kpi < poly_pts.length-1; kpi++) {
                let kp1: Point2D = poly_pts[kpi];
                let kp2: Point2D = poly_pts[kpi+1];
                let eq: {a: number, b: number, c: number} = GeometricUtils.get_line_equation_through_points(kp1, kp2);
                let nr: {"dst": number, "prop": number} = GeometricUtils.get_nearest_point_on_segment(ref_x, ref_y, eq, kp1, kp2);
                if ((nr != null) && (nr["dst"] < dstmax) && (ret["distance"] === null || nr["dst"] < ret["distance"])) {
                    ret["access"] = "" + (kpi + nr["prop"]);
                    ret["distance"] = nr["dst"];
                    ret["point"] = GeometricUtils.interpolate_poly_segment(poly_pts, kpi, nr["prop"]);
                }
            }
            return ret;
        }
    }

    // Return the intersection of two polygons
    public static get_polygon_intersection_single(poly1: ULabelSpatialPayload2D, poly2: ULabelSpatialPayload2D): ULabelSpatialPayload2D {
        // Convert to turf polygons
        try {
            let poly1_turf = turf.polygon([poly1]);
            let poly2_turf = turf.polygon([poly2]);
            
            // Find intersection
            let intersection = turf.intersect(poly1_turf, poly2_turf);
            if (intersection === null) {
                return null;
            } else {
                // Convert back to ULabelSpatialPayload2D
                return intersection.geometry.coordinates[0];
            }
        } catch (e) {
            return null;
        }
    }

    // Check if polygon is closed, i.e. first and last points are the same and there are at least 3 points
    public static is_polygon_closed(poly: ULabelSpatialPayload2D): boolean {
        let ret: boolean = false;
        if (poly.length > 2) {
            try {
                ret = poly[0][0] === poly.at(-1)[0] && poly[0][1] === poly.at(-1)[1];
            } catch (e) {}
        }
        return ret;
    }

    // Check if poly1 is completely within poly2 by checking if any line segment of poly1 intersects with poly2
    public static polygon_is_within_polygon(poly1: ULabelSpatialPayload2D, poly2: ULabelSpatialPayload2D): boolean {
        if (GeometricUtils.is_polygon_closed(poly1) && GeometricUtils.is_polygon_closed(poly2)) {
            return turf.booleanWithin(turf.polygon([poly1]), turf.polygon([poly2]));
        } else {
            return false;
        }
    }

    // Check if a point is within a polygon
    public static point_is_within_polygon(point: Point2D, poly: ULabelSpatialPayload2D): boolean {
        // https://stackoverflow.com/questions/42457842/calculate-if-point-coordinates-is-inside-polygon-with-concave-and-convex-angles?rq=3
        let is_within: boolean = false;
        let test_x: number, test_y: number, p1_x: number, p1_y: number, p2_x: number, p2_y: number; 
        [test_x, test_y] = point;

        for (let i: number = 0; i < poly.length-1; i++) {
            [p1_x, p1_y] = poly[i];
            [p2_x, p2_y] = poly[i+1];
            if ((p1_y<test_y && p2_y>=test_y) || (p2_y<test_y && p1_y>=test_y)) { // This edge is crossing the horizontal ray of testpoint
                if ((p1_x+(test_y-p1_y)/(p2_y-p1_y)*(p2_x-p1_x)) < test_x) { // Checking special cases (holes, self-crossings, self-overlapping, horizontal edges, etc.)
                    is_within = !is_within;
                }
            }
        }
        return is_within
    }

    public static get_nearest_point_on_bounding_box(ref_x: number, ref_y: number, spatial_payload: ULabelSpatialPayload2D, dstmax: number = Infinity): PointAccessObject {
        let ret: PointAccessObject = {
            "access": null,
            "distance": null,
            "point": null
        };
        for (let bbi: number = 0; bbi < 2; bbi++) {
            for (let bbj: number = 0; bbj < 2; bbj++) {
                let kp: Point2D = [spatial_payload[bbi][0], spatial_payload[bbj][1]];
                let kpdst: number = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
                if (kpdst < dstmax && (ret["distance"] === null || kpdst < ret["distance"])) {
                    ret["access"] = `${bbi}${bbj}`;
                    ret["distance"] = kpdst;
                    ret["point"] = kp;
                }
            }
        }
        return ret;
    }
  
    public static get_nearest_point_on_bbox3(ref_x: number, ref_y: number, frame: number, spatial_payload: ULabelSpatialPayload3D, dstmax=Infinity): PointAccessObject {
        let ret: PointAccessObject = {
            "access": null,
            "distance": null,
            "point": null
        };
        for (let bbi: number = 0; bbi < 2; bbi++) {
            for (let bbj: number = 0; bbj < 2; bbj++) {
                let kp: Point2D = [spatial_payload[bbi][0], spatial_payload[bbj][1]];
                let kpdst: number = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
                if (kpdst < dstmax && (ret["distance"] === null || kpdst < ret["distance"])) {
                    ret["access"] = `${bbi}${bbj}`;
                    ret["distance"] = kpdst;
                    ret["point"] = kp;
                }
            }
        }
        let min_k: number = 0;
        let min: number = spatial_payload[0][2];
        let max_k: number = 1;
        let max: number = spatial_payload[1][2];
        if (max < min) {
            let tmp: number = min_k;
            min_k = max_k;
            max_k = tmp;
            tmp = min;
            min = max;
            max = tmp;
        }

        if (frame === min) {
            ret["access"] += "" + min_k;
        }
        else if (frame === max) {
            ret["access"] += "" + max_k;
        }
        return ret;
    }

    public static get_nearest_point_on_tbar(ref_x: number, ref_y: number, spatial_payload: ULabelSpatialPayload2D, dstmax=Infinity): PointAccessObject {
        // TODO intelligently test against three grabbable points
        let ret: PointAccessObject = {
            "access": null,
            "distance": null,
            "point": null
        };
        for (let tbi: number = 0; tbi < 2; tbi++) {
            let kp: Point2D = [spatial_payload[tbi][0], spatial_payload[tbi][1]];
            let kpdst: number = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
            if (kpdst < dstmax && (ret["distance"] === null || kpdst < ret["distance"])) {
                ret["access"] = `${tbi}${tbi}`;
                ret["distance"] = kpdst;
                ret["point"] = kp;
            }
        }
        return ret;        
    }
}