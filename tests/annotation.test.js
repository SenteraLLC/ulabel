// Tests for annotation processing and manipulation
const { ULabel } = require("./testing-utils/build_loader");
const { ULabelMask } = require("../build/mask_utils");

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
            expect(annotation.created_by).toBe("unknown");
            expect(annotation.created_at).toBe(null);
            expect(annotation.last_edited_by).toBe("unknown");
            expect(annotation.last_edited_at).toBe(null);
            expect(annotation.frame).toBe(0);
            expect(annotation.annotation_meta).toStrictEqual({});
            expect(annotation.deprecated).toBe(false);
        });

        test("should round-trip a bitmask annotation through resume_from without data loss", () => {
            // Build a mask and encode it to an RLE payload (the "saved" form)
            const mask = ULabelMask.create_empty(8, 6);
            mask.paint_circle(4, 3, 2, 1);
            mask.set_pixel(0, 0, 1);
            mask.set_pixel(7, 5, 1);
            const saved_payload = mask.to_rle();

            const resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        allowed_modes: ["bbox", "polygon", "point", "bitmask"],
                        resume_from: [
                            {
                                spatial_type: "bitmask",
                                // Deep copy so the input isn't mutated by processing
                                spatial_payload: JSON.parse(JSON.stringify(saved_payload)),
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            const ulabel_with_resume = new ULabel(resume_config);
            const annotations = ulabel_with_resume.subtasks.test_task.annotations;

            expect(annotations.ordering).toHaveLength(1);
            const annotation = annotations.access[annotations.ordering[0]];
            expect(annotation.spatial_type).toBe("bitmask");
            expect(annotation.deprecated).toBe(false);

            // Emulate an export/save: JSON round-trip strips the non-enumerable `_mask` cache
            const exported = JSON.parse(JSON.stringify(annotation));

            // The RLE payload survived the load unchanged (no data lost)
            expect(exported.spatial_payload.size).toEqual(saved_payload.size);
            expect(exported.spatial_payload.counts).toEqual(saved_payload.counts);
            // The runtime mask cache must not leak into the export
            expect(exported._mask).toBeUndefined();

            // The decoded mask matches the original pixel-for-pixel
            const restored = ULabelMask.from_rle(exported.spatial_payload);
            expect(Array.from(restored.data)).toEqual(Array.from(mask.data));

            // The containing box was rebuilt from the mask's foreground bounds
            expect(annotation.containing_box).toEqual({ tlx: 0, tly: 0, brx: 7, bry: 5 });
        });

        test("should accept a raw Uint8Array bitmask payload and export it as RLE", () => {
            // Build the same mask as the RLE test above, but pass the raw pixel buffer.
            const mask = ULabelMask.create_empty(8, 6);
            mask.paint_circle(4, 3, 2, 1);
            mask.set_pixel(0, 0, 1);
            mask.set_pixel(7, 5, 1);
            const original_bytes = new Uint8Array(mask.data);
            const expected_rle = mask.to_rle();

            const raw_payload = { data: original_bytes, size: [6, 8] };
            const resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        allowed_modes: ["bbox", "polygon", "point", "bitmask"],
                        resume_from: [
                            {
                                spatial_type: "bitmask",
                                spatial_payload: raw_payload,
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            const ulabel_with_resume = new ULabel(resume_config);
            const annotations = ulabel_with_resume.subtasks.test_task.annotations;
            expect(annotations.ordering).toHaveLength(1);
            const annotation = annotations.access[annotations.ordering[0]];
            expect(annotation.spatial_type).toBe("bitmask");
            expect(annotation.deprecated).toBe(false);

            // Payload is still raw internally (no RLE encode has happened yet)
            expect(annotation.spatial_payload.data).toBeInstanceOf(Uint8Array);
            expect(annotation.spatial_payload.size).toEqual([6, 8]);

            // Defensive copy: mutating the caller's buffer must not corrupt the internal mask.
            original_bytes[0] = 0;
            expect(annotation.spatial_payload.data[0]).toBe(1);

            // get_annotations reads state.current_subtask, which init() would set.
            ulabel_with_resume.state.current_subtask = "test_task";
            // Emulate export: get_annotations materializes RLE before JSON round-trip.
            const exported = ulabel_with_resume.get_annotations("test_task")[0];
            expect(exported.spatial_payload.counts).toEqual(expected_rle.counts);
            expect(exported.spatial_payload.size).toEqual(expected_rle.size);
            expect(exported.spatial_payload.data).toBeUndefined();
            expect(exported._mask).toBeUndefined();

            // The containing box was rebuilt from the mask's foreground bounds
            expect(annotation.containing_box).toEqual({ tlx: 0, tly: 0, brx: 7, bry: 5 });
        });

        test("should skip a bitmask annotation with a malformed raw payload", () => {
            const resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        allowed_modes: ["bbox", "polygon", "point", "bitmask"],
                        resume_from: [
                            {
                                spatial_type: "bitmask",
                                // Length doesn't match 6*8=48
                                spatial_payload: { data: new Uint8Array(10), size: [6, 8] },
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };
            const ulabel_with_resume = new ULabel(resume_config);
            expect(ulabel_with_resume.subtasks.test_task.annotations.ordering).toHaveLength(0);
        });

        test("should skip a bitmask annotation with a malformed RLE payload", () => {
            const resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        allowed_modes: ["bbox", "polygon", "point", "bitmask"],
                        resume_from: [
                            {
                                spatial_type: "bitmask",
                                // Counts under-run the 8x6 mask (sum 5 != 48)
                                spatial_payload: { counts: [1, 4], size: [6, 8] },
                                classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                            },
                        ],
                    },
                },
            };

            const ulabel_with_resume = new ULabel(resume_config);
            // The malformed annotation is skipped rather than partially decoded
            expect(ulabel_with_resume.subtasks.test_task.annotations.ordering).toHaveLength(0);
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

    describe("Annotation Classification", () => {
        test("classification_payloads should determine class_id correctly", () => {
            const resume_config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        ...mock_config.subtasks.test_task,
                        resume_from: [
                            {
                                spatial_type: "point",
                                spatial_payload: [[10, 10]],
                                classification_payloads: [
                                    { class_id: 1, confidence: 0.9 },
                                ],
                            },
                        ],
                    },
                },
            };

            const ulabel = new ULabel(resume_config);
            const annotation = ulabel.subtasks.test_task.annotations.access[
                ulabel.subtasks.test_task.annotations.ordering[0]
            ];

            // classification_payloads should be preserved exactly
            expect(annotation.classification_payloads).toEqual([
                { class_id: 1, confidence: 0.9 },
            ]);
        });
    });
});
