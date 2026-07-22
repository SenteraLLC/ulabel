// Unit tests for confidence-slider-related annotation operators
const {
    get_annotation_confidence_for_class,
    get_spatial_annotations_with_confidence,
    findAllClassDefinitions,
    findAllPolylineClassDefinitions,
} = require("../build/annotation_operators");

function make_annotation(spatial_type, classification_payloads, extra = {}) {
    return {
        spatial_type,
        classification_payloads,
        deprecated: false,
        ...extra,
    };
}

function make_ulabel(subtasks) {
    return { subtasks };
}

describe("get_annotation_confidence_for_class", () => {
    test("returns the confidence for the matching class id", () => {
        const annotation = make_annotation("bbox", [
            { class_id: 1, confidence: 0.9 },
            { class_id: 2, confidence: 0.1 },
        ]);
        expect(get_annotation_confidence_for_class(annotation, 1)).toBe(0.9);
        expect(get_annotation_confidence_for_class(annotation, 2)).toBe(0.1);
    });

    test("returns -1 when the class id is not present", () => {
        const annotation = make_annotation("bbox", [{ class_id: 1, confidence: 0.9 }]);
        expect(get_annotation_confidence_for_class(annotation, 99)).toBe(-1);
    });
});

describe("get_spatial_annotations_with_confidence", () => {
    test("collects spatial annotations with confidence across all subtasks and sets subtask_key", () => {
        const bbox = make_annotation("bbox", [{ class_id: 1, confidence: 0.8 }], { id: "a" });
        const polygon = make_annotation("polygon", [{ class_id: 2, confidence: 0.5 }], { id: "b" });
        const ulabel = make_ulabel({
            st1: { annotations: { access: { a: bbox } } },
            st2: { annotations: { access: { b: polygon } } },
        });

        const result = get_spatial_annotations_with_confidence(ulabel);

        expect(result).toHaveLength(2);
        expect(bbox.subtask_key).toBe("st1");
        expect(polygon.subtask_key).toBe("st2");
    });

    test("excludes non-spatial modes (whole-image and global)", () => {
        const whole_image = make_annotation("whole-image", [{ class_id: 1, confidence: 1 }], { id: "a" });
        const global = make_annotation("global", [{ class_id: 1, confidence: 1 }], { id: "b" });
        const point = make_annotation("point", [{ class_id: 1, confidence: 1 }], { id: "c" });
        const ulabel = make_ulabel({
            st1: { annotations: { access: { a: whole_image, b: global, c: point } } },
        });

        const result = get_spatial_annotations_with_confidence(ulabel);

        expect(result).toHaveLength(1);
        expect(result[0].spatial_type).toBe("point");
    });

    test("excludes annotations without a classification payload", () => {
        const with_payload = make_annotation("bbox", [{ class_id: 1, confidence: 1 }], { id: "a" });
        const without_payload = make_annotation("bbox", [], { id: "b" });
        const null_payload = make_annotation("bbox", null, { id: "c" });
        const ulabel = make_ulabel({
            st1: { annotations: { access: { a: with_payload, b: without_payload, c: null_payload } } },
        });

        const result = get_spatial_annotations_with_confidence(ulabel);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("a");
    });

    test("respects the spatial_types filter argument", () => {
        const bbox = make_annotation("bbox", [{ class_id: 1, confidence: 1 }], { id: "a" });
        const polygon = make_annotation("polygon", [{ class_id: 2, confidence: 1 }], { id: "b" });
        const ulabel = make_ulabel({
            st1: { annotations: { access: { a: bbox, b: polygon } } },
        });

        const result = get_spatial_annotations_with_confidence(ulabel, ["polygon"]);

        expect(result).toHaveLength(1);
        expect(result[0].spatial_type).toBe("polygon");
    });
});

describe("findAllClassDefinitions", () => {
    const ulabel = make_ulabel({
        st1: {
            allowed_modes: ["bbox", "polygon"],
            class_defs: [
                { name: "Car", id: 1, color: "red", keybind: "1" },
                { name: "Truck", id: 2, color: "blue", keybind: "2" },
                { name: "Delete", id: -1, color: "gray", keybind: null },
            ],
        },
        st2: {
            allowed_modes: ["polyline"],
            class_defs: [
                { name: "Car", id: 1, color: "red", keybind: "1" }, // duplicate id
                { name: "Row", id: 3, color: "green", keybind: "3" },
            ],
        },
    });

    test("returns de-duplicated class defs across subtasks and skips the delete class", () => {
        const result = findAllClassDefinitions(ulabel);
        const ids = result.map((cd) => cd.id);

        expect(ids).toEqual([1, 2, 3]);
        expect(ids).not.toContain(-1);
    });

    test("restricts to subtasks that allow one of the provided modes", () => {
        const result = findAllClassDefinitions(ulabel, ["polyline"]);
        const ids = result.map((cd) => cd.id);

        expect(ids).toEqual([1, 3]);
    });

    test("findAllPolylineClassDefinitions only includes polyline subtasks", () => {
        const result = findAllPolylineClassDefinitions(ulabel);
        const ids = result.map((cd) => cd.id);

        expect(ids).toEqual([1, 3]);
    });
});
