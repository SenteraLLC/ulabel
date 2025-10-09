// Unit tests for ULabel core functionality
// Import the built ULabel from the dist directory (webpack exports as default)
const ulabel_module = require("../dist/ulabel.js");
const ULabel = ulabel_module.ULabel;

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
});
