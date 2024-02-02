const turf = require('@turf/turf');

export type ULabelSpatialPayload2D = [number, number][]
export type ULabelSpatialPayload3D = [number, number, number][]

export class GeometricUtils {
    public static l2_norm(pt1: Array<number>, pt2: Array<number>): number {
        let ndim = pt1.length;
        let sq = 0;
        for (let i = 0; i < ndim; i++) {
            sq += (pt1[i] - pt2[i]) * (pt1[i] - pt2[i]);
        }
        return Math.sqrt(sq);
    }

    // Get the point at a certain proportion of the segment between two points in a polygon
    public static interpolate_poly_segment(pts: [number, number][], i: number, prop: number): Array<number> {
        const pt1 = pts[i%pts.length];
        const pt2 = pts[(i + 1)%pts.length];
        return [
            pt1[0]*(1.0 - prop) + pt2[0]*prop,
            pt1[1]*(1.0 - prop) + pt2[1]*prop
        ];
    }

    // Given two points, return the line that goes through them in the form of
    //    ax + by + c = 0
    public static get_line_equation_through_points(p1: Array<number>, p2: Array<number>): object {
        const a = (p2[1] - p1[1]);
        const b = (p1[0] - p2[0]);

        // If the points are the same, no line can be inferred. Return null
        if ((a === 0) && (b === 0)) return null;

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
    public static get_nearest_point_on_segment(ref_x: number, ref_y: number, eq: object, kp1: Array<number>, kp2: Array<number>): object {
        //check to make sure eq exists
        if (eq === null) return null

        // For convenience
        const a = eq["a"];
        const b = eq["b"];
        const c = eq["c"];
    
        // Where is that point on the line, exactly?
        let nrx = (b*(b*ref_x - a*ref_y) - a*c)/(a*a + b*b);
        let nry = (a*(a*ref_y - b*ref_x) - b*c)/(a*a + b*b);
    
        // Where along the segment is that point?
        let xprop = 0.0;
        if (kp2[0] != kp1[0]) {
            xprop = (nrx - kp1[0])/(kp2[0] - kp1[0]);
        }
        let yprop = 0.0;
        if (kp2[1] != kp1[1]) {
            yprop = (nry - kp1[1])/(kp2[1] - kp1[1]);
        }

        // If the point is at an end of the segment, just return null
        if ((xprop < 0) || (xprop > 1) || (yprop < 0) || (yprop > 1)) {
            return null;        
        }

        // Distance from point to line
        let dst = Math.abs(a*ref_x + b*ref_y + c)/Math.sqrt(a*a + b*b);
        
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
    public static get_nearest_point_on_polygon(ref_x: number, ref_y: number, spatial_payload: ULabelSpatialPayload2D, dstmax: number = Infinity, include_segments: boolean = false): object {
        const poly_pts = spatial_payload;

        // Initialize return value to null object
        let ret = {
            "access": null,
            "distance": null,
            "point": null
        };
        if (!include_segments) {
            // Look through polygon points one by one 
            //    no need to look at last, it's the same as first
            for (let kpi = 0; kpi < poly_pts.length; kpi++) {
                let kp = poly_pts[kpi];
                // Distance is measured with l2 norm
                let kpdst = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
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
            for (let kpi = 0; kpi < poly_pts.length-1; kpi++) {
                let kp1 = poly_pts[kpi];
                let kp2 = poly_pts[kpi+1];
                let eq = GeometricUtils.get_line_equation_through_points(kp1, kp2);
                let nr = GeometricUtils.get_nearest_point_on_segment(ref_x, ref_y, eq, kp1, kp2);
                if ((nr != null) && (nr["dst"] < dstmax) && (ret["distance"] === null || nr["dst"] < ret["distance"])) {
                    ret["access"] = "" + (kpi + nr["prop"]);
                    ret["distance"] = nr["dst"];
                    ret["point"] = GeometricUtils.interpolate_poly_segment(poly_pts, kpi, nr["prop"]);
                }
            }
            return ret;
        }
    }

    // Return a list of polygons that define all intersections between a list of polygons
    public static get_polygon_intersections(polygons: ULabelSpatialPayload2D[]): ULabelSpatialPayload2D[] {
        let ret: ULabelSpatialPayload2D[] = [];
        for (let i = 0; i < polygons.length; i++) {
            for (let j = i+1; j < polygons.length; j++) {
                let poly1 = polygons[i];
                let poly2 = polygons[j];
                // Ensure both polygons are closed
                if (GeometricUtils.is_polygon_closed(poly1) && GeometricUtils.is_polygon_closed(poly2)) {
                    let intersection = GeometricUtils.get_polygon_intersection_single(poly1, poly2);
                    if (intersection != null) {
                        ret.push(intersection);
                    }
                }
            }
        }
        return ret;
    }

    // Return the intersection of two polygons
    public static get_polygon_intersection_single(poly1: ULabelSpatialPayload2D, poly2: ULabelSpatialPayload2D): ULabelSpatialPayload2D {
        // Convert to turf polygons
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
    }


    // Check if polygon is closed, i.e. first and last points are the same and there are at least 3 points
    public static is_polygon_closed(poly: ULabelSpatialPayload2D): boolean {
        let ret = false;
        if (poly.length > 2) {
            try {
                return poly[0][0] === poly.at(-1)[0] && poly[0][1] === poly.at(-1)[1];
            } catch (e) {}
        }
        return ret;
    }

    public static get_nearest_point_on_bounding_box(ref_x: number, ref_y: number, spatial_payload: ULabelSpatialPayload2D, dstmax: number = Infinity): object {
        let ret = {
            "access": null,
            "distance": null,
            "point": null
        };
        for (let bbi = 0; bbi < 2; bbi++) {
            for (let bbj = 0; bbj < 2; bbj++) {
                let kp = [spatial_payload[bbi][0], spatial_payload[bbj][1]];
                let kpdst = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
                if (kpdst < dstmax && (ret["distance"] === null || kpdst < ret["distance"])) {
                    ret["access"] = `${bbi}${bbj}`;
                    ret["distance"] = kpdst;
                    ret["point"] = kp;
                }
            }
        }
        return ret;
    }
  
    public static get_nearest_point_on_bbox3(ref_x: number, ref_y: number, frame: number, spatial_payload: ULabelSpatialPayload3D, dstmax=Infinity): object {
        let ret = {
            "access": null,
            "distance": null,
            "point": null
        };
        for (let bbi = 0; bbi < 2; bbi++) {
            for (let bbj = 0; bbj < 2; bbj++) {
                let kp = [spatial_payload[bbi][0], spatial_payload[bbj][1]];
                let kpdst = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
                if (kpdst < dstmax && (ret["distance"] === null || kpdst < ret["distance"])) {
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

        if (frame === min) {
            ret["access"] += "" + min_k;
        }
        else if (frame === max) {
            ret["access"] += "" + max_k;
        }
        return ret;
    }

    public static get_nearest_point_on_tbar(ref_x: number, ref_y: number, spatial_payload: ULabelSpatialPayload2D, dstmax=Infinity): object {
        // TODO intelligently test against three grabbable points
        let ret = {
            "access": null,
            "distance": null,
            "point": null
        };
        for (let tbi = 0; tbi < 2; tbi++) {
            let kp = [spatial_payload[tbi][0], spatial_payload[tbi][1]];
            let kpdst = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
            if (kpdst < dstmax && (ret["distance"] === null || kpdst < ret["distance"])) {
                ret["access"] = `${tbi}${tbi}`;
                ret["distance"] = kpdst;
                ret["point"] = kp;
            }
        }
        return ret;        
    }
}