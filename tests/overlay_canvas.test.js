// Tests for add_overlay_canvas() / remove_overlay_canvas()
const { ULabel } = require("./testing-utils/build_loader");

describe("overlay canvases", () => {
    const container_id = "test-container";
    const mock_config = {
        container_id,
        image_data: "test-image.png",
        username: "test-user",
        px_per_px: 2,
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            test_task: {
                display_name: "Test Task",
                classes: [{ name: "TestClass", id: 1, color: "red" }],
                allowed_modes: ["bbox"],
                resume_from: null,
            },
        },
    };

    // Stand in for an init-ed instance: the image wrapper, init-time dimensions, and zoom.
    function scaffold_instance() {
        const ulabel = new ULabel(mock_config);
        document.body.innerHTML = `
            <div id="${container_id}">
                <div id="${ulabel.config.annbox_id}">
                    <div id="${ulabel.config.imwrap_id}"></div>
                </div>
            </div>
        `;
        ulabel._owned_container = document.getElementById(container_id);
        ulabel.config.image_width = 100;
        ulabel.config.image_height = 50;
        ulabel.state.zoom_val = 1.5;
        ulabel.is_init = true;
        return ulabel;
    }

    function imwrap(ulabel) {
        return document.getElementById(ulabel.config.imwrap_id);
    }

    test("creates one pointer-free canvas in the image wrapper", () => {
        const ulabel = scaffold_instance();

        const canvas = ulabel.add_overlay_canvas();

        expect(canvas.parentElement).toBe(imwrap(ulabel));
        expect(imwrap(ulabel).querySelectorAll("canvas")).toHaveLength(1);
        expect(canvas.width).toBe(200);
        expect(canvas.height).toBe(100);
        expect(canvas.classList.contains(ulabel.config.imgsz_class)).toBe(true);
        expect(canvas.style.pointerEvents).toBe("none");
        expect(canvas.style.imageRendering).toBe("pixelated");
        expect(canvas.style.position).toBe("absolute");
        expect(canvas.style.width).toBe("150px");
        expect(canvas.style.height).toBe("75px");
        expect(ulabel.overlay_canvases).toEqual([canvas]);
    });

    test("stacks below_annotations by default and above_annotations on request", () => {
        const ulabel = scaffold_instance();

        const below = Number(ulabel.add_overlay_canvas().style.zIndex);
        const above = Number(ulabel.add_overlay_canvas("above_annotations").style.zIndex);

        // Image frames are 50; subtask canvas groups are 75 (back) and 100 (front).
        expect(below).toBeGreaterThan(50);
        expect(below).toBeLessThan(75);
        expect(above).toBeGreaterThan(100);
    });

    test("rejects an unknown layer", () => {
        const ulabel = scaffold_instance();

        expect(() => ulabel.add_overlay_canvas("sideways")).toThrow(/Unknown overlay layer/);
        expect(ulabel.overlay_canvases).toEqual([]);
    });

    test("throws before init and after destroy", () => {
        const ulabel = scaffold_instance();
        ulabel.is_init = false;
        expect(() => ulabel.add_overlay_canvas()).toThrow(/before init/);

        ulabel.is_init = true;
        ulabel.destroy();
        expect(() => ulabel.add_overlay_canvas()).toThrow(/after destroy/);
    });

    test("resize_overlay_canvases sets the CSS size of every overlay", () => {
        const ulabel = scaffold_instance();
        const first = ulabel.add_overlay_canvas();
        const second = ulabel.add_overlay_canvas("above_annotations");

        ulabel.resize_overlay_canvases(300, 150);

        for (const canvas of [first, second]) {
            expect(canvas.style.width).toBe("300px");
            expect(canvas.style.height).toBe("150px");
            expect(canvas.width).toBe(200);
        }
    });

    test("remove_overlay_canvas detaches the canvas and drops the reference", () => {
        const ulabel = scaffold_instance();
        const first = ulabel.add_overlay_canvas();
        const second = ulabel.add_overlay_canvas();

        ulabel.remove_overlay_canvas(first);

        expect(first.isConnected).toBe(false);
        expect(ulabel.overlay_canvases).toEqual([second]);
        // Unknown or already-removed canvases are ignored.
        ulabel.remove_overlay_canvas(first);
        ulabel.remove_overlay_canvas(document.createElement("canvas"));
        expect(ulabel.overlay_canvases).toEqual([second]);
    });

    test("destroy removes remaining overlay canvases", () => {
        const ulabel = scaffold_instance();
        const canvas = ulabel.add_overlay_canvas();

        ulabel.destroy();

        expect(canvas.isConnected).toBe(false);
        expect(ulabel.overlay_canvases).toEqual([]);
    });
});
