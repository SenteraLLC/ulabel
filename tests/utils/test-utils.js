// Test utilities for ULabel testing
export class ULabelTestUtils {
    /**
   * Create a mock ULabel configuration for testing
   */
    static createMockConfig(overrides = {}) {
        return {
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
                    allowed_modes: ["bbox", "polygon", "point"],
                },
            },
            ...overrides,
        };
    }

    /**
   * Create a mock annotation object
   */
    static createMockAnnotation(type = "bbox", overrides = {}) {
        const baseAnnotation = {
            id: "test-annotation-" + Math.random().toString(36).substr(2, 9),
            spatial_type: type,
            classification_payloads: [{ class_id: 1, confidence: 1.0 }],
            created_by: "test-user",
            created_at: new Date().toISOString(),
            last_edited_by: "test-user",
            last_edited_at: new Date().toISOString(),
            deprecated: false,
            frame: 0,
            annotation_meta: {},
        };

        switch (type) {
            case "bbox":
                baseAnnotation.spatial_payload = [[10, 10], [50, 50]];
                break;
            case "point":
                baseAnnotation.spatial_payload = [[25, 25]];
                break;
            case "polygon":
                baseAnnotation.spatial_payload = [[[10, 10], [50, 10], [30, 50], [10, 10]]];
                break;
            case "polyline":
                baseAnnotation.spatial_payload = [[10, 10], [25, 25], [50, 10]];
                break;
        }

        return { ...baseAnnotation, ...overrides };
    }

    /**
   * Wait for ULabel to be fully initialized in browser tests
   */
    static async waitForULabelInit(page, timeout = 10000) {
        await page.waitForFunction(
            () => window.ulabel && window.ulabel.is_init,
            { timeout },
        );
    }

    /**
   * Get annotation count from current subtask
   */
    static async getAnnotationCount(page) {
        return await page.evaluate(() => {
            const currentSubtask = window.ulabel.get_current_subtask();
            return currentSubtask.annotations.ordering.length;
        });
    }

    /**
   * Switch to annotation mode in browser tests
   */
    static async switchToMode(page, mode) {
        await page.click(`a#md-btn--${mode}`);
        await page.waitForFunction(
            (mode) => {
                const currentSubtask = window.ulabel.get_current_subtask();
                return currentSubtask.state.annotation_mode === mode;
            },
            mode,
        );
    }

    /**
   * Create a bbox annotation via UI interaction
   */
    static async createBboxAnnotation(page, x1, y1, x2, y2) {
        await this.switchToMode(page, "bbox");
        const canvas = page.locator("canvas.front_canvas");
        await canvas.click({ position: { x: x1, y: y1 } });
        await canvas.click({ position: { x: x2, y: y2 } });
    }

    /**
   * Create a point annotation via UI interaction
   */
    static async createPointAnnotation(page, x, y) {
        await this.switchToMode(page, "point");
        const canvas = page.locator("canvas.front_canvas");
        await canvas.click({ position: { x, y } });
    }

    /**
   * Assert that DOM container exists
   */
    static setupDOMContainer(containerId = "test-container") {
        document.body.innerHTML = `<div id="${containerId}"></div>`;
    }

    /**
   * Mock canvas context for unit tests
   */
    static createMockCanvasContext() {
        return {
            fillStyle: "",
            strokeStyle: "",
            lineWidth: 1,
            globalCompositeOperation: "source-over",
            imageSmoothingEnabled: false,
            lineJoin: "round",
            lineCap: "round",
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            arc: jest.fn(),
            stroke: jest.fn(),
            fill: jest.fn(),
            closePath: jest.fn(),
            clearRect: jest.fn(),
            drawImage: jest.fn(),
        };
    }
}
