// Unit tests for ULabel core functionality
const { ULabel } = require("./testing-utils/build_loader");

describe("ULabel Core Functionality", () => {
    let mock_config;
    const container_id = "test-container";
    const image_data = "test-image.png";
    const username = "test-user";

    beforeEach(() => {
        // Mock DOM container
        document.body.innerHTML = `<div id="${container_id}"></div>`;

        mock_config = {
            container_id: container_id,
            image_data: image_data,
            username: username,
            submit_buttons: [{
                name: "Submit",
                hook: jest.fn(),
            }],
            subtasks: {
                test_task: {
                    display_name: "Test Task",
                    classes: [
                        { name: "Class1", id: 1, color: "red" },
                        { name: "Class2", id: 2, color: "blue" },
                    ],
                    allowed_modes: ["contour", "polygon", "polyline", "bbox", "tbar", "bbox3", "whole-image", "global", "point"],
                },
                single_class_task: {
                    display_name: "Single Class Task",
                    classes: [
                        { name: "SingleClass", id: 1, color: "green" },
                    ],
                    allowed_modes: ["bbox", "polygon"],
                },
            },
        };
    });

    describe("Constructor", () => {
        test("should create ULabel instance with valid config", () => {
            const ulabel = new ULabel(mock_config);
            expect(ulabel).toBeInstanceOf(ULabel);
            // Validate config properties
            expect(ulabel.config.container_id).toBe(container_id);
            expect(ulabel.config.username).toBe(username);
            // Validate subtask properties
            expect(ulabel.subtasks.test_task.class_defs).toHaveLength(2);
            expect(ulabel.subtasks.test_task.class_defs[0]).toEqual({
                name: "Class1",
                id: 1,
                color: "red",
                keybind: null,
            });
            // Correctly set single class mode
            expect(ulabel.subtasks.single_class_task.single_class_mode).toBe(true);
            expect(ulabel.subtasks.single_class_task.allowed_modes).toEqual(["bbox", "polygon"]);
        });

        test("should throw error for missing required properties", () => {
            const invalid_config = { ...mock_config };
            delete invalid_config.container_id;

            expect(() => new ULabel(invalid_config)).toThrow();
        });

        test("should handle deprecated constructor arguments", () => {
            const ulabel = new ULabel(
                container_id,
                image_data,
                username,
                mock_config.submit_buttons,
                mock_config.subtasks,
            );

            expect(ulabel).toBeInstanceOf(ULabel);
            expect(ulabel.config.container_id).toBe(container_id);
            expect(ulabel.config.username).toBe(username);
        });
    });

    describe("Static Utility Methods", () => {
        test("should return version", () => {
            const version = ULabel.version();
            expect(typeof version).toBe("string");
        });

        test("should return current time in ISO format", () => {
            const time = ULabel.get_time();
            expect(time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        });

        test("should return allowed toolbox item enum", () => {
            const enum_obj = ULabel.get_allowed_toolbox_item_enum();
            expect(typeof enum_obj).toBe("object");
        });

        test("should return resize toolbox item class", () => {
            const resize_item_class = ULabel.get_resize_toolbox_item();
            expect(typeof resize_item_class).toBe("function");
            // Verify class methods
            expect(typeof resize_item_class.update_annotation_size).toBe("function");
            expect(typeof resize_item_class.update_subtask_line_size).toBe("function");
            expect(typeof resize_item_class.toggle_subtask_vanished).toBe("function");
        });
    });

    describe("Class Processing", () => {
        test("should process string class definitions", () => {
            const config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        classes: ["Class1", "Class2"],
                        allowed_modes: ["bbox"],
                    },
                },
            };

            const ulabel = new ULabel(config);
            const subtask = ulabel.subtasks.test_task;

            expect(subtask.class_defs).toHaveLength(2);
            expect(subtask.class_defs[0].name).toBe("Class1");
            expect(subtask.class_defs[1].name).toBe("Class2");
            // IDs should be assigned and unique
            expect(subtask.class_defs[0].id).toBeDefined();
            expect(subtask.class_defs[1].id).toBeDefined();
            expect(subtask.class_defs[0].id).not.toBe(subtask.class_defs[1].id);
        });

        test("should create unused class IDs", () => {
            const mock_ulabel = {
                valid_class_ids: [0, 1, 3, 4],
            };

            const new_id = ULabel.create_unused_class_id(mock_ulabel);
            // The new ID should not be in the existing list
            expect(mock_ulabel.valid_class_ids).not.toContain(new_id);
            expect(typeof new_id).toBe("number");
        });
    });

    describe("Class Keybind Storage", () => {
        test("class_def.keybind should be null when not provided", () => {
            const ulabel = new ULabel(mock_config);
            const class_defs = ulabel.subtasks.test_task.class_defs;

            // Class without keybind should have null, not undefined or ""
            expect(class_defs[0].keybind).toBe(null);
        });

        test("class_def.keybind should preserve provided value", () => {
            const config = {
                ...mock_config,
                subtasks: {
                    test_task: {
                        display_name: "Test Task",
                        classes: [
                            { name: "Class1", id: 1, color: "red", keybind: "1" },
                            { name: "Class2", id: 2, color: "blue", keybind: "2" },
                        ],
                        allowed_modes: ["bbox", "polygon", "point"],
                    },
                },
            };
            const ulabel = new ULabel(config);
            const class_defs = ulabel.subtasks.test_task.class_defs;

            expect(class_defs[0].keybind).toBe("1");
            expect(class_defs[1].keybind).toBe("2");
        });
    });

    describe("Configuration Defaults", () => {
        test("task_meta should default to empty object when not configured", () => {
            const ulabel = new ULabel(mock_config);
            expect(ulabel.config.task_meta).toEqual({});
        });

        test("task_meta should preserve configured value", () => {
            const config_with_meta = {
                ...mock_config,
                task_meta: { project: "test" },
            };
            const ulabel = new ULabel(config_with_meta);
            expect(ulabel.config.task_meta).toEqual({ project: "test" });
        });

        test("task_meta null should be preserved when explicitly set", () => {
            const config_with_null_meta = {
                ...mock_config,
                task_meta: null,
            };
            const ulabel = new ULabel(config_with_null_meta);
            expect(ulabel.config.task_meta).toBeNull();
        });
    });

    describe("String.prototype.replaceLowerConcat", () => {
        // This method was changed from replaceAll to split/join
        // Ensure behavior is identical for the patterns used in the codebase
        beforeAll(() => {
            // Loading ULabel attaches replaceLowerConcat to String.prototype
            require("./testing-utils/build_loader");
        });

        test("should replace spaces with dashes and lowercase", () => {
            const result = "Keypoint Slider".replaceLowerConcat(" ", "-");
            expect(result).toBe("keypoint-slider");
        });

        test("should replace spaces with underscores and concat suffix", () => {
            const result = "Keypoint Slider".replaceLowerConcat(" ", "_", "_default_value");
            expect(result).toBe("keypoint_slider_default_value");
        });

        test("should handle strings with no match for before", () => {
            const result = "noSpaces".replaceLowerConcat(" ", "-");
            expect(result).toBe("nospaces");
        });

        test("should handle multiple spaces", () => {
            const result = "Filter Point Distance".replaceLowerConcat(" ", "-");
            expect(result).toBe("filter-point-distance");
        });

        test("should return lowercase without concat when concat_string is null", () => {
            const result = "Test String".replaceLowerConcat(" ", "-", null);
            expect(result).toBe("test-string");
        });
    });
});
