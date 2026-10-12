// Unit tests for isolating one annotation: every other annotation in the
// subtask is hidden from the canvas and from input until the isolation
// clears. View-only state, so nothing is recorded and the data is untouched.
const { ULabel } = require("./testing-utils/build_loader");

let next_id = 0;

function make_annotation(class_id = 1) {
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

function load(ulabel, annotations, subtask_key = "st") {
    const access = {};
    const ordering = [];
    for (const annotation of annotations) {
        access[annotation.id] = annotation;
        ordering.push(annotation.id);
    }
    ulabel.subtasks[subtask_key].annotations = { access, ordering };
}

function make_ulabel(config = mock_config) {
    const ulabel = new ULabel(config);
    ulabel.state.current_subtask = "st";
    ulabel.redraw_all_annotations = jest.fn();
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    return ulabel;
}

describe("isolate_annotation", () => {
    test("starts with nothing isolated", () => {
        const ulabel = make_ulabel();

        expect(ulabel.subtasks.st.state.isolated_annid).toBeNull();
        expect(ulabel.get_isolated_annotation_id("st")).toBeNull();
    });

    test("writes the state and reports it", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a, make_annotation()]);

        expect(ulabel.isolate_annotation(a.id)).toBe(true);

        expect(ulabel.subtasks.st.state.isolated_annid).toBe(a.id);
        expect(ulabel.get_isolated_annotation_id()).toBe(a.id);
    });

    test("rejects unknown and deprecated ids without touching state", () => {
        const ulabel = make_ulabel();
        const gone = { ...make_annotation(), deprecated: true };
        load(ulabel, [gone]);

        expect(ulabel.isolate_annotation("nope")).toBe(false);
        expect(ulabel.isolate_annotation(gone.id)).toBe(false);
        expect(ulabel.isolate_annotation("x", "no_such_subtask")).toBe(false);

        expect(ulabel.subtasks.st.state.isolated_annid).toBeNull();
    });

    test("drops hover, candidates, and fly-to position", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        const b = make_annotation();
        load(ulabel, [a, b]);
        const state = ulabel.subtasks.st.state;
        state.hovered_annid = b.id;
        state.edit_candidate = { annid: b.id };
        state.move_candidate = { annid: b.id };
        state.fly_to_idx = 1;

        ulabel.isolate_annotation(a.id);

        expect(state.hovered_annid).toBeNull();
        expect(state.edit_candidate).toBeNull();
        expect(state.move_candidate).toBeNull();
        expect(state.fly_to_idx).toBeNull();
    });

    test("redraws the subtask and the toolbox unless told not to", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a]);

        ulabel.isolate_annotation(a.id);
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledWith("st");
        expect(ulabel.toolbox.redraw_update_items).toHaveBeenCalledTimes(1);

        ulabel.isolate_annotation(null, "st", false);
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledTimes(1);
    });

    test("is view-only: no action recorded, edited flag untouched", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a]);
        ulabel.state.edited = false;

        ulabel.isolate_annotation(a.id);
        ulabel.isolate_annotation(null);

        expect(ulabel.subtasks.st.actions.stream).toEqual([]);
        expect(ulabel.state.edited).toBe(false);
    });

    test("does not change get_annotations()", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a, make_annotation(), make_annotation()]);

        ulabel.isolate_annotation(a.id);

        expect(ulabel.get_annotations("st").length).toBe(3);
    });
});

describe("on_isolate_change", () => {
    test("fires only on an actual change, with the new id or null", () => {
        const on_isolate_change = jest.fn();
        const ulabel = make_ulabel({ ...mock_config, on_isolate_change });
        const a = make_annotation();
        load(ulabel, [a]);

        ulabel.isolate_annotation(a.id);
        ulabel.isolate_annotation(a.id);
        ulabel.isolate_annotation("nope");
        ulabel.isolate_annotation(null);
        ulabel.isolate_annotation(null);

        expect(on_isolate_change.mock.calls).toEqual([["st", a.id], ["st", null]]);
    });
});

describe("gates", () => {
    test("is_annotation_defocused is true for everything but the isolated one", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        const b = make_annotation();
        load(ulabel, [a, b]);

        ulabel.isolate_annotation(a.id);

        expect(ulabel.is_annotation_defocused(a, "st")).toBe(false);
        expect(ulabel.is_annotation_defocused(b, "st")).toBe(true);
    });

    test("draw_annotation skips isolated-out annotations even inside the defocus pass", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        const b = make_annotation();
        load(ulabel, [a, b]);
        ulabel.draw_bounding_box = jest.fn();
        ulabel.subtasks.st.state.annotation_contexts = {
            c0: { context: {}, annotation_ids: [a.id, b.id] },
        };
        a.canvas_id = "c0";
        b.canvas_id = "c0";
        ulabel.isolate_annotation(a.id);

        ulabel.draw_annotation(b, null, "st");
        ulabel.state.drawing_defocused = true;
        ulabel.draw_annotation(b, null, "st");
        ulabel.state.drawing_defocused = false;
        expect(ulabel.draw_bounding_box).not.toHaveBeenCalled();

        ulabel.draw_annotation(a, null, "st");
        expect(ulabel.draw_bounding_box).toHaveBeenCalledTimes(1);
    });

    test("draw passes never send isolated-out annotations to the dimming layer", () => {
        const ulabel = make_ulabel({
            ...mock_config,
            subtasks: { ...mock_config.subtasks, st: { ...mock_config.subtasks.st, focus_active_class: true } },
        });
        const crop = make_annotation(1);
        const weed = make_annotation(2);
        load(ulabel, [weed, crop]);
        const live = { globalAlpha: 1, drawImage: jest.fn(), canvas: { width: 10, height: 10 } };
        ulabel.subtasks.st.state.annotation_contexts = {
            c0: { context: live, annotation_ids: [weed.id, crop.id] },
        };
        ulabel.state.defocus_scratch = { clearRect: jest.fn(), canvas: { width: 10, height: 10 } };
        ulabel.isolate_annotation(crop.id);
        const drawn = [];

        ulabel.draw_context_in_focus_passes("c0", "st", (id) => drawn.push(id));

        expect(drawn).toEqual([crop.id]);
        expect(live.drawImage).not.toHaveBeenCalled();
    });

    test("isolated annotation in a defocused class draws nothing", () => {
        const ulabel = make_ulabel({
            ...mock_config,
            subtasks: { ...mock_config.subtasks, st: { ...mock_config.subtasks.st, focus_active_class: true } },
        });
        const weed = make_annotation(2);
        load(ulabel, [weed]);
        ulabel.draw_bounding_box = jest.fn();
        ulabel.subtasks.st.state.annotation_contexts = { c0: { context: {}, annotation_ids: [weed.id] } };
        weed.canvas_id = "c0";
        ulabel.isolate_annotation(weed.id);

        // Selected class is Crop (1); Weed stays defocused and out of the live pass
        ulabel.draw_annotation(weed, null, "st");

        expect(ulabel.draw_bounding_box).not.toHaveBeenCalled();
    });

    test("fly_to_annotation refuses an isolated-out annotation", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        const b = make_annotation();
        load(ulabel, [a, b]);
        ulabel.isolate_annotation(a.id);

        expect(ulabel.fly_to_annotation(b, "st", 1)).toBe(false);
    });
});

describe("clears", () => {
    test("deleting the isolated annotation clears the isolation with a full redraw", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a, make_annotation()]);
        ulabel.redraw_annotation = jest.fn();
        ulabel.suggest_edits = jest.fn();
        ulabel.destroy_polygon_ender = jest.fn();
        ulabel.isolate_annotation(a.id);
        ulabel.redraw_all_annotations.mockClear();

        ulabel.delete_annotation(a.id);

        expect(ulabel.subtasks.st.state.isolated_annid).toBeNull();
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledWith("st");
        expect(a.deprecated).toBe(true);
    });

    test("deleting another annotation leaves the isolation alone", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        const b = make_annotation();
        load(ulabel, [a, b]);
        ulabel.redraw_annotation = jest.fn();
        ulabel.suggest_edits = jest.fn();
        ulabel.destroy_polygon_ender = jest.fn();
        ulabel.isolate_annotation(a.id);

        ulabel.delete_annotation(b.id);

        expect(ulabel.subtasks.st.state.isolated_annid).toBe(a.id);
    });

    // set_subtask and set_annotations need the full DOM/canvas init; the e2e
    // spec covers those clear paths.

    test("creating a new annotation clears the isolation so it is visible", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a]);
        ulabel.isolate_annotation(a.id);
        ulabel.redraw_annotation = jest.fn();
        ulabel.rebuild_containing_box = jest.fn();
        ulabel.update_filter_distance = jest.fn();
        ulabel.suggest_edits = jest.fn();
        ulabel.destroy_polygon_ender = jest.fn();
        ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
        ulabel.subtasks.st.state.annotation_contexts = { c0: { context: {}, annotation_ids: [] } };

        ulabel.create_annotation("bbox", [[0, 0], [5, 5]]);

        expect(ulabel.subtasks.st.state.isolated_annid).toBeNull();
    });

    test("undoing the creation of the isolated annotation clears the isolation", () => {
        const on_isolate_change = jest.fn();
        const ulabel = make_ulabel({ ...mock_config, on_isolate_change });
        const base = make_annotation();
        load(ulabel, [base]);
        ulabel.redraw_annotation = jest.fn();
        ulabel.rebuild_containing_box = jest.fn();
        ulabel.update_filter_distance = jest.fn();
        ulabel.suggest_edits = jest.fn();
        ulabel.destroy_polygon_ender = jest.fn();
        ulabel.destroy_annotation_context = jest.fn();
        ulabel.hide_id_dialog = jest.fn();
        ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
        ulabel.subtasks.st.state.annotation_contexts = { c0: { context: {}, annotation_ids: [] } };
        ulabel.create_annotation("bbox", [[0, 0], [5, 5]], "fresh");
        ulabel.isolate_annotation("fresh");
        ulabel.redraw_all_annotations.mockClear();

        ulabel.undo();

        expect(ulabel.subtasks.st.annotations.access.fresh).toBeUndefined();
        expect(ulabel.subtasks.st.state.isolated_annid).toBeNull();
        expect(ulabel.is_annotation_defocused(base, "st")).toBe(false);
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledWith("st");
        expect(on_isolate_change).toHaveBeenLastCalledWith("st", null);
    });

    test("undoing finish_annotation on the isolated polygon clears the isolation", () => {
        const on_isolate_change = jest.fn();
        const ulabel = make_ulabel({ ...mock_config, on_isolate_change });
        const base = make_annotation();
        const poly = { ...make_annotation(), id: "poly", spatial_type: "polygon", spatial_payload: [[[0, 0], [5, 0], [5, 5], [0, 0]]] };
        load(ulabel, [base, poly]);
        ulabel.isolate_annotation("poly");
        ulabel.redraw_all_annotations.mockClear();

        ulabel.finish_annotation__undo("poly");

        expect(poly.deprecated).toBe(true);
        expect(ulabel.subtasks.st.state.isolated_annid).toBeNull();
        expect(ulabel.is_annotation_defocused(base, "st")).toBe(false);
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledWith("st");
        expect(on_isolate_change).toHaveBeenLastCalledWith("st", null);
    });
});

describe("isolation follows bitmask deprecation", () => {
    function make_mask(id) {
        return { ...make_annotation(), id, spatial_type: "bitmask", spatial_payload: null, containing_box: null };
    }

    function make_bitmask_ulabel() {
        const on_isolate_change = jest.fn();
        const ulabel = make_ulabel({ ...mock_config, on_isolate_change });
        ulabel.config.image_width = 8;
        ulabel.config.image_height = 8;
        ulabel.redraw_annotation = jest.fn();
        const base = make_annotation();
        const mask = make_mask("mask");
        load(ulabel, [base, mask]);
        return { ulabel, base, mask, on_isolate_change };
    }

    function expect_cleared({ ulabel, base, on_isolate_change }, subtask_key = "st") {
        expect(ulabel.subtasks[subtask_key].state.isolated_annid).toBeNull();
        expect(ulabel.is_annotation_defocused(base, subtask_key)).toBe(false);
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledWith(subtask_key);
        expect(on_isolate_change).toHaveBeenLastCalledWith(subtask_key, null);
    }

    test("undoing the first stroke of the isolated mask clears the isolation", () => {
        const fixture = make_bitmask_ulabel();
        const { ulabel, mask } = fixture;
        ulabel.isolate_annotation("mask");
        ulabel.redraw_all_annotations.mockClear();

        ulabel.bitmask_stroke__undo("mask", { was_new: true, before_rle: null, other_edits: [] });

        expect(mask.deprecated).toBe(true);
        expect_cleared(fixture);
    });

    test("redoing a stroke that erased the isolated mask clears the isolation", () => {
        const fixture = make_bitmask_ulabel();
        const { ulabel, mask } = fixture;
        ulabel.isolate_annotation("mask");
        ulabel.redraw_all_annotations.mockClear();

        ulabel.bitmask_stroke__redo("mask", { after_rle: null, after_empty: true, other_edits: [] });

        expect(mask.deprecated).toBe(true);
        expect_cleared(fixture);
    });

    test("finishing a stroke that erases the whole isolated mask clears the isolation", () => {
        const fixture = make_bitmask_ulabel();
        const { ulabel, mask } = fixture;
        ulabel.isolate_annotation("mask");
        ulabel.redraw_all_annotations.mockClear();
        ulabel.subtasks.st.state.active_id = "mask";
        ulabel.subtasks.st.state.bitmask_stroke = { is_erase: true, was_new: false, before_rle: null };

        ulabel.finish_bitmask();

        expect(mask.deprecated).toBe(true);
        expect_cleared(fixture);
    });

    test("redoing an overwrite that empties an isolated mask in another subtask clears that subtask's isolation", () => {
        const fixture = make_bitmask_ulabel();
        const { ulabel } = fixture;
        ulabel.subtasks.other = { ...ulabel.subtasks.st, state: { ...ulabel.subtasks.st.state }, read_only: false };
        const other_base = make_annotation();
        const victim = make_mask("victim");
        load(ulabel, [other_base, victim], "other");
        ulabel.isolate_annotation("victim", "other");
        ulabel.redraw_all_annotations.mockClear();

        ulabel.bitmask_stroke__redo("mask", {
            after_rle: null,
            after_empty: false,
            other_edits: [{ annotation_id: "victim", subtask: "other", after_rle: null, after_empty: true }],
        });

        expect(victim.deprecated).toBe(true);
        expect_cleared({ ...fixture, base: other_base }, "other");
        expect(ulabel.subtasks.st.state.isolated_annid).toBeNull();
    });
});
