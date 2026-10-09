// Outline spatial annotations created or modified since load (resume_from / set_annotations)
const { ULabel } = require("./testing-utils/build_loader");

const LOADED_AT = "2026-01-01T00:00:00.000Z";
// Complements of the default class colors: green (class 1) and red (class 2)
const GREEN_CONTRAST = "hsl(300, 100%, 50%)";
const RED_CONTRAST = "hsl(180, 100%, 50%)";

function make_annotation(id, overrides = {}) {
    return {
        id,
        spatial_type: "bbox",
        spatial_payload: [[10, 10], [30, 30]],
        containing_box: { tlx: 10, tly: 10, brx: 30, bry: 30 },
        classification_payloads: [{ class_id: 1, confidence: 1.0 }],
        deprecated: false,
        last_edited_at: LOADED_AT,
        last_edited_by: "host",
        ...overrides,
    };
}

function make_ulabel(resume = [], config_overrides = {}) {
    const classes = [
        { name: "Crop", id: 1, color: "green" },
        { name: "Weed", id: 2, color: "red" },
    ];
    const ulabel = new ULabel({
        container_id: "container",
        image_data: "test.jpg",
        username: "test_user",
        image_width: 100,
        image_height: 100,
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            gt: { display_name: "GT", classes, allowed_modes: ["bbox", "bitmask", "whole-image"], resume_from: resume },
            other: { display_name: "Other", classes, allowed_modes: ["bitmask"], resume_from: null },
        },
        ...config_overrides,
    });
    ulabel.state.current_subtask = "gt";
    for (const name of [
        "redraw_annotation",
        "redraw_all_annotations",
        "rebuild_containing_box",
        "update_filter_distance",
        "suggest_edits",
        "destroy_polygon_ender",
        "destroy_annotation_context",
        "hide_id_dialog",
        "update_frame",
        "recolor_active_polygon_ender",
        "recolor_brush_circle",
    ]) {
        ulabel[name] = jest.fn();
    }
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
    return ulabel;
}

function outline(ulabel, id, subtask_key = "gt") {
    return ulabel.get_annotation_outline_color(ulabel.subtasks[subtask_key].annotations.access[id], subtask_key);
}

function reclassify(ulabel, id) {
    ulabel.subtasks.gt.state.id_payload = [{ class_id: 1, confidence: 0.0 }, { class_id: 2, confidence: 1.0 }];
    ulabel.assign_annotation_id(id);
}

describe("get_annotation_outline_color", () => {
    test("is null while the highlight is off", () => {
        const ulabel = make_ulabel([make_annotation("g1")]);
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "new1");

        expect(ulabel.get_highlight_edits()).toBe(false);
        expect(outline(ulabel, "new1")).toBeNull();
    });

    test("defaults to a contrasting hue of the class color for created and modified, not unchanged", () => {
        const ulabel = make_ulabel([make_annotation("g1"), make_annotation("g2")], { highlight_edits: true });
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "new1");
        reclassify(ulabel, "g1");

        expect(outline(ulabel, "new1")).toBe(GREEN_CONTRAST);
        expect(outline(ulabel, "g1")).toBe(RED_CONTRAST);
        expect(outline(ulabel, "g2")).toBeNull();
    });

    test("undo back to the loaded state clears the highlight", () => {
        const ulabel = make_ulabel([make_annotation("g1")], { highlight_edits: true });
        reclassify(ulabel, "g1");
        ulabel.undo();

        expect(outline(ulabel, "g1")).toBeNull();
    });

    test("uses the configured colors", () => {
        const ulabel = make_ulabel([make_annotation("g1")], {
            highlight_edits: true,
            highlight_created_color: "blue",
            highlight_modified_color: "orange",
        });
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "new1");
        reclassify(ulabel, "g1");

        expect(outline(ulabel, "new1")).toBe("blue");
        expect(outline(ulabel, "g1")).toBe("orange");
    });

    test("a set color overrides only its own kind", () => {
        const ulabel = make_ulabel([make_annotation("g1")], { highlight_edits: true, highlight_created_color: "blue" });
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "new1");
        reclassify(ulabel, "g1");

        expect(outline(ulabel, "new1")).toBe("blue");
        expect(outline(ulabel, "g1")).toBe(RED_CONTRAST);
    });

    test("gray, short-hex, and named class colors get a usable contrast", () => {
        const ulabel = make_ulabel([], { highlight_edits: true });
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "new1");

        ulabel.color_info[1] = "gray";
        expect(outline(ulabel, "new1")).toBe("#ffd400");
        ulabel.color_info[1] = "#00f";
        expect(outline(ulabel, "new1")).toBe("hsl(60, 100%, 50%)");
        ulabel.color_info[1] = "pink";
        expect(outline(ulabel, "new1")).toBe("hsl(170, 100%, 50%)");
    });

    test("hover wins over the highlight", () => {
        const ulabel = make_ulabel([], { highlight_edits: true });
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "new1");
        ulabel.subtasks.gt.state.hovered_annid = "new1";

        expect(outline(ulabel, "new1")).toBe("white");
    });

    test("non-spatial annotations are never highlighted", () => {
        const note = make_annotation("note", { spatial_type: "whole-image", spatial_payload: null, containing_box: null });
        const ulabel = make_ulabel([note], { highlight_edits: true });
        ulabel.edit_text_payload("note", "changed");

        expect(outline(ulabel, "note")).toBeNull();
    });

    test("set_annotations re-baselines", async () => {
        const ulabel = make_ulabel([make_annotation("g1")], { highlight_edits: true });
        reclassify(ulabel, "g1");
        ulabel._clear_subtask_annotation_canvases = jest.fn();
        ulabel.refresh_toolbox = jest.fn();
        ulabel.reset_interaction_state = jest.fn();

        await ulabel.set_annotations([make_annotation("g1")], "gt", false, false);

        expect(outline(ulabel, "g1")).toBeNull();
    });

    test("draw_annotation passes the color to the shape's draw function", () => {
        const ulabel = make_ulabel([], { highlight_edits: true });
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "new1");
        const context = {};
        ulabel.subtasks.gt.state.annotation_contexts = { c0: { context } };
        ulabel.draw_bounding_box = jest.fn();

        ulabel.draw_annotation(ulabel.subtasks.gt.annotations.access.new1, null, "gt");

        expect(ulabel.draw_bounding_box).toHaveBeenCalledWith(expect.anything(), context, null, GREEN_CONTRAST);
    });
});

describe("set_highlight_edits", () => {
    test("redraws and notifies only on a change", () => {
        const on_highlight_edits_change = jest.fn();
        const ulabel = make_ulabel([], { on_highlight_edits_change });

        ulabel.set_highlight_edits(true);
        ulabel.set_highlight_edits(true);
        ulabel.set_highlight_edits(false);

        expect(ulabel.get_highlight_edits()).toBe(false);
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledTimes(2);
        expect(on_highlight_edits_change.mock.calls).toEqual([[true], [false]]);
    });

    test("config sets the initial state without notifying", () => {
        const on_highlight_edits_change = jest.fn();
        const ulabel = make_ulabel([], { highlight_edits: true, on_highlight_edits_change });

        expect(ulabel.get_highlight_edits()).toBe(true);
        expect(on_highlight_edits_change).not.toHaveBeenCalled();
    });
});

describe("affected annotations", () => {
    function make_mask(id) {
        return make_annotation(id, { spatial_type: "bitmask", spatial_payload: null, containing_box: null });
    }

    test("are redrawn after the stamp that makes them modified", () => {
        const ulabel = make_ulabel([make_mask("mask")], { highlight_edits: true });
        ulabel.subtasks.other.annotations.access.victim = make_mask("victim");
        ulabel.subtasks.other.annotations.ordering.push("victim");
        ulabel.subtasks.other.annotations.loaded_edited_at.victim = LOADED_AT;
        const outlines_at_redraw = [];
        ulabel.redraw_annotation.mockImplementation((id, subtask_key) => {
            if (id === "victim") outlines_at_redraw.push(outline(ulabel, id, subtask_key));
        });

        ulabel.bitmask_stroke__redo("mask", {
            before_rle: null,
            after_rle: null,
            was_new: false,
            after_empty: false,
            other_edits: [{ annotation_id: "victim", subtask: "other", before_rle: null, after_rle: null, after_empty: false }],
        });

        expect(outlines_at_redraw.at(-1)).toBe(GREEN_CONTRAST);
    });

    test("are not redrawn again when the highlight is off", () => {
        const ulabel = make_ulabel([make_mask("mask")]);
        ulabel.subtasks.other.annotations.access.victim = make_mask("victim");
        ulabel.subtasks.other.annotations.ordering.push("victim");
        ulabel.subtasks.other.annotations.loaded_edited_at.victim = LOADED_AT;

        ulabel.bitmask_stroke__redo("mask", {
            before_rle: null,
            after_rle: null,
            was_new: false,
            after_empty: false,
            other_edits: [{ annotation_id: "victim", subtask: "other", before_rle: null, after_rle: null, after_empty: false }],
        });

        expect(ulabel.redraw_annotation.mock.calls.filter(([id]) => id === "victim")).toHaveLength(1);
    });
});
