// Unit tests for class focus driven by the active class: on subtasks with
// `focus_active_class`, the selected class is the focused class. Focus is
// derived state, so it has to survive annotation swaps and freeze across
// delete-mode selection churn.
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

// Same subtask with focus following the active class
const focus_config = {
    ...mock_config,
    subtasks: {
        st: { ...mock_config.subtasks.st, focus_active_class: true },
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

describe("set_active_class", () => {
    test("selection defaults to the first class", () => {
        const ulabel = new ULabel(mock_config);

        expect(ulabel.get_selected_class_id("st")).toBe(1);
    });

    test("changes the selected class", () => {
        const ulabel = new ULabel(mock_config);

        expect(ulabel.set_active_class(2, "st", false)).toBe(true);

        expect(ulabel.get_selected_class_id("st")).toBe(2);
    });

    test("rejects an unknown subtask key", () => {
        const ulabel = new ULabel(mock_config);

        expect(ulabel.set_active_class(1, "nope", false)).toBe(false);
    });

    test("rejects a class id the subtask doesn't declare", () => {
        const ulabel = new ULabel(mock_config);

        expect(ulabel.set_active_class(99, "st", false)).toBe(false);
        expect(ulabel.get_selected_class_id("st")).toBe(1);
    });

    test("writes the id payload so new annotations get the class", () => {
        const ulabel = new ULabel(mock_config);

        ulabel.set_active_class(2, "st", false);

        const payload = ulabel.subtasks.st.state.id_payload;
        expect(payload.find((p) => p.class_id === 2).confidence).toBe(1);
        expect(payload.find((p) => p.class_id === 1).confidence).toBe(0);
    });

    test("with focus_active_class, drops hover and fly-to position on a change", () => {
        const ulabel = new ULabel(focus_config);
        ulabel.subtasks.st.state.hovered_annid = "anno_x";
        ulabel.subtasks.st.state.fly_to_idx = 4;

        ulabel.set_active_class(2, "st", false);

        expect(ulabel.subtasks.st.state.hovered_annid).toBeNull();
        expect(ulabel.subtasks.st.state.fly_to_idx).toBeNull();
    });

    test("with focus_active_class, redraws the subtask unless told not to", () => {
        const ulabel = new ULabel(focus_config);
        ulabel.redraw_all_annotations = jest.fn();

        ulabel.set_active_class(2, "st");
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledWith("st");

        ulabel.redraw_all_annotations.mockClear();
        ulabel.set_active_class(1, "st", false);
        expect(ulabel.redraw_all_annotations).not.toHaveBeenCalled();
    });

    test("without focus_active_class, a selection change never redraws", () => {
        const ulabel = new ULabel(mock_config);
        ulabel.redraw_all_annotations = jest.fn();
        ulabel.subtasks.st.state.hovered_annid = "anno_x";

        ulabel.set_active_class(2, "st");

        expect(ulabel.redraw_all_annotations).not.toHaveBeenCalled();
        expect(ulabel.subtasks.st.state.hovered_annid).toBe("anno_x");
    });

    test("toolbox display sync falls back to the first class on init-time numeric payloads", () => {
        const ulabel = new ULabel(mock_config);
        ulabel.state.current_subtask = "st";

        // Pre-selection id_payload entries are plain numbers; the sync must
        // treat that as "first class" rather than set_active_class(undefined)
        ulabel.update_id_toolbox_display();

        expect(console.warn).not.toHaveBeenCalled();
        expect(ulabel.get_selected_class_id("st")).toBe(1);
    });
});

describe("delete modes freeze the selection", () => {
    const delete_config = {
        ...focus_config,
        subtasks: {
            st: {
                ...focus_config.subtasks.st,
                allowed_modes: ["bbox", "delete_polygon"],
            },
        },
    };

    test("selecting the delete class leaves the remembered selection", () => {
        const ulabel = new ULabel(delete_config);
        ulabel.set_active_class(2, "st", false);

        // The reserved delete class validates (its def is auto-added) but is
        // transient, so focus stays on the real class.
        expect(ulabel.set_active_class(-1, "st", false)).toBe(true);

        expect(ulabel.get_selected_class_id("st")).toBe(2);
        expect(ulabel.is_annotation_defocused(make_annotation(2), "st")).toBe(false);
        expect(ulabel.is_annotation_defocused(make_annotation(1), "st")).toBe(true);
    });
});

describe("set_focus_active_class", () => {
    test("toggles the focus behavior at runtime", () => {
        const ulabel = new ULabel(mock_config);
        const weed = make_annotation(2);

        expect(ulabel.is_annotation_defocused(weed, "st")).toBe(false);

        ulabel.set_focus_active_class("st", true, false);
        expect(ulabel.is_annotation_defocused(weed, "st")).toBe(true);

        ulabel.set_focus_active_class("st", false, false);
        expect(ulabel.is_annotation_defocused(weed, "st")).toBe(false);
    });

    test("drops hover, and redraws unless told not to", () => {
        const ulabel = new ULabel(mock_config);
        ulabel.redraw_all_annotations = jest.fn();
        ulabel.subtasks.st.state.hovered_annid = "anno_x";

        ulabel.set_focus_active_class("st", true);

        expect(ulabel.subtasks.st.state.hovered_annid).toBeNull();
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledWith("st");
    });

    test("ignores an unknown subtask key", () => {
        const ulabel = new ULabel(mock_config);

        expect(() => ulabel.set_focus_active_class("nope", true, false)).not.toThrow();
        expect(ulabel.subtasks.st.focus_active_class).toBe(false);
    });
});

describe("is_annotation_defocused", () => {
    test("passes everything through without focus_active_class", () => {
        const ulabel = new ULabel(mock_config);

        expect(ulabel.is_annotation_defocused(make_annotation(1), "st")).toBe(false);
        expect(ulabel.is_annotation_defocused(make_annotation(2), "st")).toBe(false);
    });

    test("excludes only classes other than the selected one", () => {
        const ulabel = new ULabel(focus_config);

        expect(ulabel.is_annotation_defocused(make_annotation(1), "st")).toBe(false);
        expect(ulabel.is_annotation_defocused(make_annotation(2), "st")).toBe(true);

        ulabel.set_active_class(2, "st", false);

        expect(ulabel.is_annotation_defocused(make_annotation(1), "st")).toBe(true);
        expect(ulabel.is_annotation_defocused(make_annotation(2), "st")).toBe(false);
    });

    test("passes everything through for an unknown subtask", () => {
        const ulabel = new ULabel(focus_config);

        expect(ulabel.is_annotation_defocused(make_annotation(2), "demo")).toBe(false);
    });
});

describe("defocused annotations are skipped by navigation", () => {
    test("fly_to_annotation refuses a defocused annotation", () => {
        const ulabel = new ULabel(focus_config);
        const weed = make_annotation(2);
        load(ulabel, [make_annotation(1), weed]);

        expect(ulabel.fly_to_annotation(weed, "st")).toBe(false);
    });
});

describe("the focus is derived state, not a per-annotation flag", () => {
    test("annotations swapped in afterwards are defocused on arrival", () => {
        const ulabel = new ULabel(focus_config);
        load(ulabel, [make_annotation(1)]);

        const swapped_in = make_annotation(2);
        load(ulabel, [swapped_in]);

        expect(ulabel.get_selected_class_id("st")).toBe(1);
        expect(ulabel.is_annotation_defocused(swapped_in, "st")).toBe(true);
    });
});

describe("bulk delete is focus-gated", () => {
    test("a delete polygon only removes focused-class annotations", () => {
        const ulabel = new ULabel({
            ...focus_config,
            subtasks: {
                st: {
                    ...focus_config.subtasks.st,
                    allowed_modes: ["point", "delete_polygon"],
                },
            },
        });
        const crop = { ...make_annotation(1), spatial_type: "point", spatial_payload: [[5, 5]] };
        const weed = { ...make_annotation(2), spatial_type: "point", spatial_payload: [[5, 5]] };
        const eraser = {
            id: "del0",
            spatial_type: "delete_polygon",
            spatial_payload: [[-1, -1], [20, -1], [20, 20], [-1, 20], [-1, -1]],
            classification_payloads: [{ class_id: -1, confidence: 1.0 }],
            deprecated: false,
        };
        load(ulabel, [crop, weed, eraser]);
        // delete_annotations_in_polygon resolves through the current subtask
        ulabel.state.current_subtask = "st";
        // Stub the rendering/bookkeeping tail; only the collection loop is under test
        ulabel.redraw_annotation = jest.fn();
        ulabel.update_filter_distance = jest.fn();
        ulabel.toolbox = { redraw_update_items: jest.fn() };
        ulabel.destroy_polygon_ender = jest.fn();
        ulabel.destroy_annotation_context = jest.fn();
        ulabel.remove_annotation_from_access_and_ordering = jest.fn();
        ulabel.remove_recorded_events_for_annotation = jest.fn();

        ulabel.delete_annotations_in_polygon("del0");

        expect(crop.deprecated).toBe(true);
        // Defocused annotation survives: never delete what's dimmed out of view
        expect(weed.deprecated).toBe(false);
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
        const ulabel = new ULabel(focus_config);
        const crop = make_annotation(1);
        const weed = make_annotation(2);
        // Defocused first in id order, so ordering alone wouldn't prove the split.
        const live = setup_context(ulabel, [weed, crop]);
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
        const ulabel = new ULabel(focus_config);
        const crop = make_annotation(1);
        const live = setup_context(ulabel, [make_annotation(2), crop]);
        ulabel.set_defocused_opacity("st", 0, false);
        const drawn = [];

        ulabel.draw_context_in_focus_passes("c0", "st", (id) => drawn.push(id));

        expect(drawn).toEqual([crop.id]);
        expect(live.drawImage).not.toHaveBeenCalled();
    });

    test("the live context is restored even if a draw throws", () => {
        const ulabel = new ULabel(focus_config);
        const live = setup_context(ulabel, [make_annotation(2), make_annotation(1)]);

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
        const ulabel = new ULabel(focus_config);
        const weed = make_annotation(2);
        load(ulabel, [weed]);
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
