// Tests for annotation processing and manipulation
// Import the built ULabel from the dist directory (webpack exports as default)
const ulabelModule = require("../dist/ulabel.js");
const ULabel = ulabelModule.ULabel || ulabelModule;

describe("Annotation Processing", () => {
    let ulabel;
    let mockConfig;

    beforeEach(() => {
        document.body.innerHTML = "<div id=\"test-container\"></div>";

        mockConfig = {
            container_id: "test-container",
            image_data: "test-image.png",
            username: "test-user",
            submit_buttons: [{ name: "Submit", hook: jest.fn() }],
            subtasks: {
                test_task: {
                    display_name: "Test Task",
                    classes: [{ name: "TestClass", id: 1, color: "red" }],
                    allowed_modes: ["bbox", "polygon", "point"],
                    resume_from: null,
                },
            },
        };

        ulabel = new ULabel(mockConfig);
    });

    describe("Spatial Payload Generation", () => {
        test("should generate correct spatial payload for point", () => {
            const spatial = ulabel.get_init_spatial(100, 200, "point", {});
            expect(spatial).toEqual([[100, 200]]);
        });

        test("should generate correct spatial payload for bbox", () => {
            const spatial = ulabel.get_init_spatial(100, 200, "bbox", {});
            expect(spatial).toEqual([[100, 200], [100, 200]]);
        });

        test("should generate correct spatial payload for polygon", () => {
            const spatial = ulabel.get_init_spatial(100, 200, "polygon", {});
            expect(spatial).toEqual([[[100, 200], [100, 200]]]);
        });
    });

    describe("Resume From Functionality", () => {
        test("should process resume_from annotations correctly", () => {
            const resumeConfig = {
                ...mockConfig,
                subtasks: {
                    test_task: {
                        ...mockConfig.subtasks.test_task,
                        resume_from: [
                            {
                                id: "test-annotation-1",
                                spatial_type: "bbox",
                                spatial_payload: [[10, 10], [50, 50]],
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            const ulabelWithResume = new ULabel(resumeConfig);
            const annotations = ulabelWithResume.subtasks.test_task.annotations;

            expect(annotations.ordering).toHaveLength(1);
            expect(annotations.access["test-annotation-1"]).toBeDefined();
            expect(annotations.access["test-annotation-1"].spatial_type).toBe("bbox");
        });

        test("should generate new ID for annotations without ID", () => {
            const resumeConfig = {
                ...mockConfig,
                subtasks: {
                    test_task: {
                        ...mockConfig.subtasks.test_task,
                        resume_from: [
                            {
                                spatial_type: "point",
                                spatial_payload: [[25, 25]],
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            const ulabelWithResume = new ULabel(resumeConfig);
            const annotations = ulabelWithResume.subtasks.test_task.annotations;

            expect(annotations.ordering).toHaveLength(1);
            const annotationId = annotations.ordering[0];
            expect(typeof annotationId).toBe("string");
            expect(annotationId.length).toBeGreaterThan(0);
        });

        test("should set default values for missing annotation properties", () => {
            const resumeConfig = {
                ...mockConfig,
                subtasks: {
                    test_task: {
                        ...mockConfig.subtasks.test_task,
                        resume_from: [
                            {
                                id: "minimal-annotation",
                                spatial_type: "point",
                                spatial_payload: [[0, 0]],
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            const ulabelWithResume = new ULabel(resumeConfig);
            const annotation = ulabelWithResume.subtasks.test_task.annotations.access["minimal-annotation"];

            expect(annotation.created_by).toBe("unknown");
            expect(annotation.last_edited_by).toBe("unknown");
            expect(annotation.frame).toBe(0);
            expect(annotation.annotation_meta).toEqual({});
            expect(annotation.deprecated).toBe(false);
        });
    });

    describe("ID Payload Generation", () => {
        test("should generate correct ID payload for normal modes", () => {
            const payload = ulabel.get_init_id_payload("bbox");
            expect(Array.isArray(payload)).toBe(true);
            expect(payload.length).toBeGreaterThan(0);
        });

        test("should generate delete ID payload for delete modes", () => {
            const payload = ulabel.get_init_id_payload("delete_bbox");
            expect(payload).toEqual([{ class_id: -1, confidence: 1.0 }]);
        });
    });
});
