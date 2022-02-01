"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeometricUtils = void 0;
var GeometricUtils = /** @class */ (function () {
    function GeometricUtils() {
    }
    GeometricUtils.l2_norm = function (pt1, pt2) {
        var ndim = pt1.length;
        var sq = 0;
        for (var i = 0; i < ndim; i++) {
            sq += (pt1[i] - pt2[i]) * (pt1[i] - pt2[i]);
        }
        return Math.sqrt(sq);
    };
    // Get the point at a certain proportion of the segment between two points in a polygon
    GeometricUtils.interpolate_poly_segment = function (pts, i, prop) {
        var pt1 = pts[i % pts.length];
        var pt2 = pts[(i + 1) % pts.length];
        return [
            pt1[0] * (1.0 - prop) + pt2[0] * prop,
            pt1[1] * (1.0 - prop) + pt2[1] * prop
        ];
    };
    // Given two points, return the line that goes through them in the form of
    //    ax + by + c = 0
    GeometricUtils.get_line_equation_through_points = function (p1, p2) {
        var a = (p2[1] - p1[1]);
        var b = (p1[0] - p2[0]);
        // If the points are the same, no line can be inferred. Return null
        if ((a == 0) && (b == 0))
            return null;
        var c = p1[1] * (p2[0] - p1[0]) - p1[0] * (p2[1] - p1[1]);
        return {
            "a": a,
            "b": b,
            "c": c
        };
    };
    // Given a line segment in the form of ax + by + c = 0 and two endpoints for it,
    //   return the point on the segment that is closest to the reference point, as well
    //   as the distance away
    GeometricUtils.get_nearest_point_on_segment = function (ref_x, ref_y, eq, kp1, kp2) {
        // For convenience
        var a = eq["a"];
        var b = eq["b"];
        var c = eq["c"];
        // Where is that point on the line, exactly?
        var nrx = (b * (b * ref_x - a * ref_y) - a * c) / (a * a + b * b);
        var nry = (a * (a * ref_y - b * ref_x) - b * c) / (a * a + b * b);
        // Where along the segment is that point?
        var xprop = 0.0;
        if (kp2[0] != kp1[0]) {
            xprop = (nrx - kp1[0]) / (kp2[0] - kp1[0]);
        }
        var yprop = 0.0;
        if (kp2[1] != kp1[1]) {
            yprop = (nry - kp1[1]) / (kp2[1] - kp1[1]);
        }
        // If the point is at an end of the segment, just return null
        if ((xprop < 0) || (xprop > 1) || (yprop < 0) || (yprop > 1)) {
            return null;
        }
        // Distance from point to line
        var dst = Math.abs(a * ref_x + b * ref_y + c) / Math.sqrt(a * a + b * b);
        // Proportion of the length of segment from p1 to the nearest point
        var seg_length = Math.sqrt((kp2[0] - kp1[0]) * (kp2[0] - kp1[0]) + (kp2[1] - kp1[1]) * (kp2[1] - kp1[1]));
        var kprop = Math.sqrt((nrx - kp1[0]) * (nrx - kp1[0]) + (nry - kp1[1]) * (nry - kp1[1])) / seg_length;
        // return object with info about the point
        return {
            "dst": dst,
            "prop": kprop
        };
    };
    // Return the point on a polygon that's closest to a reference along with its distance
    GeometricUtils.get_nearest_point_on_polygon = function (ref_x, ref_y, spatial_payload, dstmax, include_segments) {
        if (dstmax === void 0) { dstmax = Infinity; }
        if (include_segments === void 0) { include_segments = false; }
        var poly_pts = spatial_payload;
        // Initialize return value to null object
        var ret = {
            "access": null,
            "distance": null,
            "point": null
        };
        if (!include_segments) {
            // Look through polygon points one by one 
            //    no need to look at last, it's the same as first
            for (var kpi = 0; kpi < poly_pts.length; kpi++) {
                var kp = poly_pts[kpi];
                // Distance is measured with l2 norm
                var kpdst = Math.sqrt(Math.pow(kp[0] - ref_x, 2) + Math.pow(kp[1] - ref_y, 2));
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
            for (var kpi = 0; kpi < poly_pts.length - 1; kpi++) {
                var kp1 = poly_pts[kpi];
                var kp2 = poly_pts[kpi + 1];
                var eq = GeometricUtils.get_line_equation_through_points(kp1, kp2);
                var nr = GeometricUtils.get_nearest_point_on_segment(ref_x, ref_y, eq, kp1, kp2);
                if ((nr != null) && (nr["dst"] < dstmax) && (ret["distance"] == null || nr["dst"] < ret["distance"])) {
                    ret["access"] = "" + (kpi + nr["prop"]);
                    ret["distance"] = nr["dst"];
                    ret["point"] = GeometricUtils.interpolate_poly_segment(poly_pts, kpi, nr["prop"]);
                }
            }
            return ret;
        }
    };
    GeometricUtils.get_nearest_point_on_bounding_box = function (ref_x, ref_y, spatial_payload, dstmax) {
        if (dstmax === void 0) { dstmax = Infinity; }
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
                    ret["access"] = "" + bbi + bbj;
                    ret["distance"] = kpdst;
                    ret["point"] = kp;
                }
            }
        }
        return ret;
    };
    GeometricUtils.get_nearest_point_on_bbox3 = function (ref_x, ref_y, frame, spatial_payload, dstmax) {
        if (dstmax === void 0) { dstmax = Infinity; }
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
                    ret["access"] = "" + bbi + bbj;
                    ret["distance"] = kpdst;
                    ret["point"] = kp;
                }
            }
        }
        var min_k = 0;
        var min = spatial_payload[0][2];
        var max_k = 1;
        var max = spatial_payload[1][2];
        if (max < min) {
            var tmp = min_k;
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
    };
    GeometricUtils.get_nearest_point_on_tbar = function (ref_x, ref_y, spatial_payload, dstmax) {
        if (dstmax === void 0) { dstmax = Infinity; }
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
                ret["access"] = "" + tbi + tbi;
                ret["distance"] = kpdst;
                ret["point"] = kp;
            }
        }
        return ret;
    };
    return GeometricUtils;
}());
exports.GeometricUtils = GeometricUtils;
