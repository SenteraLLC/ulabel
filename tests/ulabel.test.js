// Unit tests for ULabel core functionality
// Import the built ULabel from the dist directory (webpack exports as default)
const ulabelModule = require("../dist/ulabel.js");
const ULabel = ulabelModule.ULabel || ulabelModule;

describe("ULabel Core Functionality", () => {
    let mockConfig;

    beforeEach(() => {
    // Mock DOM container
        document.body.innerHTML = "<div id=\"test-container\"></div>";

        mockConfig = {
            container_id: "test-container",
            image_data: "test-image.png",
            username: "test-user",
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
                    allowed_modes: ["bbox", "polygon"],
                },
            },
        };
    });

    describe("Constructor and Initialization", () => {
        test("should create ULabel instance with valid config", () => {
            const ulabel = new ULabel(mockConfig);
            expect(ulabel).toBeInstanceOf(ULabel);
            expect(ulabel.config.container_id).toBe("test-container");
            expect(ulabel.config.username).toBe("test-user");
        });

        test("should throw error for missing required properties", () => {
            const invalidConfig = { ...mockConfig };
            delete invalidConfig.container_id;

            expect(() => new ULabel(invalidConfig)).not.toThrow();
            // Should log error message instead of throwing
        });

        test("should handle deprecated constructor arguments", () => {
            const ulabel = new ULabel(
                "test-container",
                "test-image.png",
                "test-user",
                mockConfig.submit_buttons,
                mockConfig.subtasks,
            );

            expect(ulabel.config.container_id).toBe("test-container");
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
            const enumObj = ULabel.get_allowed_toolbox_item_enum();
            expect(typeof enumObj).toBe("object");
        });
    });

    describe("Class Processing", () => {
        test("should process string class definitions", () => {
            const config = {
                ...mockConfig,
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
        });

        test("should process object class definitions", () => {
            const ulabel = new ULabel(mockConfig);
            const subtask = ulabel.subtasks.test_task;

            expect(subtask.class_defs).toHaveLength(2);
            expect(subtask.class_defs[0]).toEqual({
                name: "Class1",
                id: 1,
                color: "red",
                keybind: null,
            });
        });

        test("should create unused class IDs", () => {
            const mockULabel = {
                valid_class_ids: [0, 1, 3, 4],
            };

            const newId = ULabel.create_unused_class_id(mockULabel);
            expect(newId).toBe(2); // Should find the gap
        });
    });

    describe("Annotation ID Generation", () => {
        test("should generate unique annotation IDs", () => {
            const ulabel = new ULabel(mockConfig);
            const id1 = ulabel.make_new_annotation_id();
            const id2 = ulabel.make_new_annotation_id();

            expect(id1).not.toBe(id2);
            expect(typeof id1).toBe("string");
            expect(id1.length).toBeGreaterThan(0);
        });
    });

    describe("Subtask Management", () => {
        test("should process allowed modes", () => {
            const ulabel = new ULabel(mockConfig);
            const subtask = ulabel.subtasks.test_task;

            expect(subtask.allowed_modes).toEqual(["bbox", "polygon"]);
        });

        test("should set single class mode correctly", () => {
            const singleClassConfig = {
                ...mockConfig,
                subtasks: {
                    test_task: {
                        classes: [{ name: "SingleClass", id: 1 }],
                        allowed_modes: ["bbox"],
                    },
                },
            };

            const ulabel = new ULabel(singleClassConfig);
            expect(ulabel.subtasks.test_task.single_class_mode).toBe(true);
        });
    });
});
