// Tests for geometric utility functions
const { GeometricUtils } = require("../build/geometric_utils");

describe("GeometricUtils", () => {
    describe("subtract_simple_polygon_from_polyline", () => {
        test("should return empty array when polyline is entirely inside polygon", () => {
            // A polyline completely inside a large polygon
            const polyline = [[2, 2], [3, 3], [4, 4]];
            const polygon = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];

            const result = GeometricUtils.subtract_simple_polygon_from_polyline(polyline, polygon);
            expect(result).toEqual([]);
        });

        test("should return the polyline unchanged when entirely outside polygon", () => {
            // A polyline completely outside the polygon
            const polyline = [[20, 20], [30, 30], [40, 40]];
            const polygon = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];

            const result = GeometricUtils.subtract_simple_polygon_from_polyline(polyline, polygon);
            expect(result).toEqual(polyline);
        });

        test("should return partial polyline when it crosses through the polygon", () => {
            // A polyline that crosses through the polygon
            const polyline = [[-5, 5], [5, 5], [15, 5]];
            const polygon = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];

            const result = GeometricUtils.subtract_simple_polygon_from_polyline(polyline, polygon);
            // Should return a portion of the line (the longest part outside the polygon)
            expect(result.length).toBeGreaterThan(0);
        });

        test("should not throw when all split segments are inside the polygon", () => {
            // A polyline that enters and exits but the remaining parts after split
            // are all inside — edge case that previously caused a crash
            const polyline = [[1, 5], [5, 5], [9, 5]];
            const polygon = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];

            // Should not throw, should return empty array
            expect(() => {
                const result = GeometricUtils.subtract_simple_polygon_from_polyline(polyline, polygon);
                expect(result).toEqual([]);
            }).not.toThrow();
        });
    });
});
