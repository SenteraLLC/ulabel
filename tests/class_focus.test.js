// Unit tests for the class focus: subtask state that dims other classes and
// scopes input to one. Deliberately not a per-annotation flag, so it has to
// survive annotation swaps.
const { ULabel } = require("./testing-utils/build_loader");

let next_id = 0;

function make_annotation(class_id) {
    return {
        id: `anno_${next_id++}`,
        spatial_type: "bbox",
        spatial_payload: [[0, 0], [10, 10]],
        containing_box: { tlx: 0, tly: 0, brx: 10, bry: 10 },
        classification_payloads: [{ class_id, confidence: 1.0 }],
        deprecated: false,
    };
}

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        st: {
            display_name: "A",
            classes: [
                { name: "Crop", id: 1, color: "green" },
                { name: "Weed", id: 2, color: "red" },
            ],
            allowed_modes: ["bbox"],
            resume_from: null,
        },
    },
};

function load(ulabel, annotations) {
    const access = {};
    const ordering = [];
    for (const annotation of annotations) {
        access[annotation.id] = annotation;
        ordering.push(annotation.id);
    }
    ulabel.subtasks.st.annotations = { access, ordering };
}

describe("set_class_focus", () => {
    test("defaults to null", () => {
        const ulabel = new ULabel(mock_config);

        expect(ulabel.subtasks.st.state.focused_class).toBeNull();
    });

    test("sets and clears the focus", () => {
        const ulabel = new ULabel(mock_config);

        ulabel.set_class_focus("st", 2, false);
        expect(ulabel.subtasks.st.state.focused_class).toBe(2);

        ulabel.set_class_focus("st", null, false);
        expect(ulabel.subtasks.st.state.focused_class).toBeNull();
    });

    test("ignores an unknown subtask key", () => {
        const ulabel = new ULabel(mock_config);

        expect(() => ulabel.set_class_focus("nope", 1, false)).not.toThrow();
        expect(ulabel.subtasks.st.state.focused_class).toBeNull();
    });

    test("ignores a class id the subtask doesn't declare", () => {
        const ulabel = new ULabel(mock_config);

        ulabel.set_class_focus("st", 99, false);

        expect(ulabel.subtasks.st.state.focused_class).toBeNull();
    });

    test("drops hover and fly-to position, which may now be off screen", () => {
        const ulabel = new ULabel(mock_config);
        ulabel.subtasks.st.state.hovered_annid = "anno_x";
        ulabel.subtasks.st.state.fly_to_idx = 4;

        ulabel.set_class_focus("st", 1, false);

        expect(ulabel.subtasks.st.state.hovered_annid).toBeNull();
        expect(ulabel.subtasks.st.state.fly_to_idx).toBeNull();
    });

    test("redraws the subtask unless told not to", () => {
        const ulabel = new ULabel(mock_config);
        ulabel.redraw_all_annotations = jest.fn();

        ulabel.set_class_focus("st", 1);
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledWith("st");

        ulabel.redraw_all_annotations.mockClear();
        ulabel.set_class_focus("st", 2, false);
        expect(ulabel.redraw_all_annotations).not.toHaveBeenCalled();
    });
});

describe("is_annotation_defocused", () => {
    test("passes everything through when no focus is set", () => {
        const ulabel = new ULabel(mock_config);

        expect(ulabel.is_annotation_defocused(make_annotation(1), "st")).toBe(false);
        expect(ulabel.is_annotation_defocused(make_annotation(2), "st")).toBe(false);
    });

    test("excludes only other classes", () => {
        const ulabel = new ULabel(mock_config);
        ulabel.set_class_focus("st", 1, false);

        expect(ulabel.is_annotation_defocused(make_annotation(1), "st")).toBe(false);
        expect(ulabel.is_annotation_defocused(make_annotation(2), "st")).toBe(true);
    });

    test("passes everything through for an unknown subtask", () => {
        const ulabel = new ULabel(mock_config);

        expect(ulabel.is_annotation_defocused(make_annotation(2), "demo")).toBe(false);
    });
});

describe("defocused annotations are skipped by navigation", () => {
    test("fly_to_annotation refuses a defocused annotation", () => {
        const ulabel = new ULabel(mock_config);
        const weed = make_annotation(2);
        load(ulabel, [make_annotation(1), weed]);

        ulabel.set_class_focus("st", 1, false);

        expect(ulabel.fly_to_annotation(weed, "st")).toBe(false);
    });
});

describe("the focus is state, not a per-annotation flag", () => {
    test("annotations swapped in afterwards are defocused on arrival", () => {
        const ulabel = new ULabel(mock_config);
        load(ulabel, [make_annotation(1)]);
        ulabel.set_class_focus("st", 1, false);

        const swapped_in = make_annotation(2);
        load(ulabel, [swapped_in]);

        expect(ulabel.subtasks.st.state.focused_class).toBe(1);
        expect(ulabel.is_annotation_defocused(swapped_in, "st")).toBe(true);
    });
});

describe("set_defocused_opacity", () => {
    test("defaults to 0.4", () => {
        const ulabel = new ULabel(mock_config);

        expect(ulabel.subtasks.st.state.defocused_opacity).toBe(0.4);
    });

    test("reads an override off the subtask spec", () => {
        const ulabel = new ULabel({
            ...mock_config,
            subtasks: {
                st: { ...mock_config.subtasks.st, defocused_opacity: 0 },
            },
        });

        expect(ulabel.subtasks.st.state.defocused_opacity).toBe(0);
    });

    test("clamps to 0..1", () => {
        const ulabel = new ULabel(mock_config);

        ulabel.set_defocused_opacity("st", 5, false);
        expect(ulabel.subtasks.st.state.defocused_opacity).toBe(1);

        ulabel.set_defocused_opacity("st", -1, false);
        expect(ulabel.subtasks.st.state.defocused_opacity).toBe(0);
    });

    test("ignores an unknown subtask key", () => {
        const ulabel = new ULabel(mock_config);

        expect(() => ulabel.set_defocused_opacity("nope", 0.5, false)).not.toThrow();
        expect(ulabel.subtasks.st.state.defocused_opacity).toBe(0.4);
    });
});

describe("draw passes", () => {
    // Canvases pack annotations by fill order, so a defocused annotation can sit
    // after a focused one. Both must still land in the right pass.
    function setup_context(ulabel, annotations) {
        load(ulabel, annotations);
        const live = { globalAlpha: 1, drawImage: jest.fn(), canvas: { width: 10, height: 10 } };
        ulabel.subtasks.st.state.annotation_contexts = {
            c0: { context: live, annotation_ids: annotations.map((a) => a.id) },
        };
        // `resetMocks` strips jest-canvas-mock's getContext, so seed the scratch.
        ulabel.state.defocus_scratch = {
            clearRect: jest.fn(),
            canvas: { width: 10, height: 10 },
        };
        return live;
    }

    test("no focus draws everything in one pass", () => {
        const ulabel = new ULabel(mock_config);
        const live = setup_context(ulabel, [make_annotation(1), make_annotation(2)]);
        const drawn = [];

        ulabel.draw_context_in_focus_passes("c0", "st", (id) => drawn.push(id));

        expect(drawn.length).toBe(2);
        expect(live.drawImage).not.toHaveBeenCalled();
    });

    test("defocused annotations are blitted back as one dimmed layer, underneath", () => {
        const ulabel = new ULabel(mock_config);
        const crop = make_annotation(1);
        const weed = make_annotation(2);
        // Defocused first in id order, so ordering alone wouldn't prove the split.
        const live = setup_context(ulabel, [weed, crop]);
        ulabel.set_class_focus("st", 1, false);
        const alpha_at_blit = [];
        live.drawImage = jest.fn(() => alpha_at_blit.push(live.globalAlpha));
        const drawn = [];

        ulabel.draw_context_in_focus_passes("c0", "st", (id) => drawn.push(id));

        expect(alpha_at_blit).toEqual([0.4]);
        expect(live.globalAlpha).toBe(1);
        // Focused draws last so it sits on top of the blitted layer.
        expect(drawn).toEqual([weed.id, crop.id]);
    });

    test("zero opacity skips the defocused pass entirely", () => {
        const ulabel = new ULabel(mock_config);
        const crop = make_annotation(1);
        const live = setup_context(ulabel, [make_annotation(2), crop]);
        ulabel.set_class_focus("st", 1, false);
        ulabel.set_defocused_opacity("st", 0, false);
        const drawn = [];

        ulabel.draw_context_in_focus_passes("c0", "st", (id) => drawn.push(id));

        expect(drawn).toEqual([crop.id]);
        expect(live.drawImage).not.toHaveBeenCalled();
    });

    test("the live context is restored even if a draw throws", () => {
        const ulabel = new ULabel(mock_config);
        const live = setup_context(ulabel, [make_annotation(2), make_annotation(1)]);
        ulabel.set_class_focus("st", 1, false);

        expect(() =>
            ulabel.draw_context_in_focus_passes("c0", "st", () => {
                throw new Error("boom");
            }),
        ).toThrow("boom");

        expect(ulabel.subtasks.st.state.annotation_contexts.c0.context).toBe(live);
        expect(ulabel.state.drawing_defocused).toBe(false);
    });
});

describe("draw_annotation gate", () => {
    test("a defocused annotation only draws inside the defocus pass", () => {
        const ulabel = new ULabel(mock_config);
        const weed = make_annotation(2);
        load(ulabel, [weed]);
        ulabel.set_class_focus("st", 1, false);
        ulabel.draw_bounding_box = jest.fn();
        ulabel.subtasks.st.state.annotation_contexts = {
            c0: { context: {}, annotation_ids: [weed.id] },
        };
        weed.canvas_id = "c0";

        ulabel.draw_annotation(weed, null, "st");
        expect(ulabel.draw_bounding_box).not.toHaveBeenCalled();

        ulabel.state.drawing_defocused = true;
        ulabel.draw_annotation(weed, null, "st");
        expect(ulabel.draw_bounding_box).toHaveBeenCalledTimes(1);
    });
});
