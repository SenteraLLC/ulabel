// Tests for annotation processing and manipulation
// Import the built ULabel from the dist directory (webpack exports as default)
const ulabel_module = require("../dist/ulabel.js");
const ULabel = ulabel_module.ULabel;

describe("Annotation Processing", () => {
    let mock_config;
    const container_id = "test-container";
    const image_data = "test-image.png";
    const username = "test-user";
    const line_size = 2;

    beforeEach(() => {
        // Set up more complete DOM structure for ULabel
        document.body.innerHTML = `<div id="${container_id}">`;

        mock_config = {
            container_id: container_id,
            image_data: image_data,
            username: username,
            initial_line_size: line_size,
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
    });

    describe("Resume From Functionality", () => {
        test("should process valid resume_from annotations and set default values for missing properties", () => {
            const resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        resume_from: [
                            {
                                spatial_type: "point",
                                spatial_payload: [[0, 0]],
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            const ulabel_with_resume = new ULabel(resume_config);
            const annotations = ulabel_with_resume.subtasks.test_task.annotations;

            // Annotation ID
            expect(annotations.ordering).toHaveLength(1);
            const annotation_id = annotations.ordering[0];
            expect(typeof annotation_id).toBe("string");
            expect(annotation_id.length).toBeGreaterThan(0);
            const annotation = annotations.access[annotation_id];

            // Provided properties
            expect(annotation.spatial_type).toBe("point");
            expect(annotation.spatial_payload).toEqual([[0, 0]]);
            expect(annotation.classification_payloads).toEqual([{ class_id: 1, confidence: 1.0 }]);

            // Other properties
            expect(annotation.line_size).toBe(ulabel_with_resume.config.initial_line_size);
            expect(annotation.created_by).toBe("unknown");
            expect(annotation.created_at).toBe(null);
            expect(annotation.last_edited_by).toBe("unknown");
            expect(annotation.last_edited_at).toBe(null);
            expect(annotation.frame).toBe(0);
            expect(annotation.annotation_meta).toStrictEqual({});
            expect(annotation.deprecated).toBe(false);
        });

        test("should throw an error for missing spatial_type", () => {
            const invalid_resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        resume_from: [
                            {
                                spatial_payload: [[0, 0]],
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            expect(() => new ULabel(invalid_resume_config)).toThrow();
        });

        test("should throw an error for missing spatial_payload in spatial modes", () => {
            const invalid_resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        resume_from: [
                            {
                                spatial_type: "bbox",
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            expect(() => new ULabel(invalid_resume_config)).toThrow();
        });

        test("should throw an error for missing classification_payloads", () => {
            const invalid_resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        resume_from: [
                            {
                                spatial_type: "point",
                                spatial_payload: [[0, 0]],
                            },
                        ],
                    },
                },
            };

            expect(() => new ULabel(invalid_resume_config)).toThrow();
        });

        test("should throw an error for class_id not in allowed_classes", () => {
            const invalid_resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        resume_from: [
                            {
                                spatial_type: "point",
                                spatial_payload: [[0, 0]],
                                classification_payloads: [{ class_id: 999, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            expect(() => new ULabel(invalid_resume_config)).toThrow();
        });
    });

    describe("Annotation ID Generation", () => {
        test("should generate unique annotation IDs", () => {
            const ulabel = new ULabel(mock_config);
            const id1 = ulabel.make_new_annotation_id();
            const id2 = ulabel.make_new_annotation_id();

            expect(id1).not.toBe(id2);
            expect(typeof id1).toBe("string");
            expect(id1.length).toBeGreaterThan(0);
        });
    });
});
