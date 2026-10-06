// Unit tests for the `on_annotation_change` host callback (CVML-286): one call
// per recorded / undone / redone action that changes committed annotation state.
const { ULabel } = require("./testing-utils/build_loader");

const classes = [
    { name: "Crop", id: 1, color: "green" },
    { name: "Weed", id: 2, color: "red" },
];

function make_bbox(id, class_id = 1) {
    return {
        id,
        spatial_type: "bbox",
        spatial_payload: [[10, 10], [30, 30]],
        containing_box: { tlx: 10, tly: 10, brx: 30, bry: 30 },
        classification_payloads: [{ class_id, confidence: 1.0 }],
        deprecated: false,
        last_edited_at: "2026-01-01T00:00:00.000Z",
        last_edited_by: "host",
    };
}

function make_ulabel(resume = {}, config_overrides = {}) {
    const ulabel = new ULabel({
        container_id: "container",
        image_data: "test.jpg",
        username: "test_user",
        image_width: 100,
        image_height: 100,
        allow_annotations_outside_image: true,
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            gt: { display_name: "GT", classes, allowed_modes: ["bbox", "bitmask"], resume_from: resume.gt ?? null },
            pred: { display_name: "Pred", classes, allowed_modes: ["bbox", "bitmask"], resume_from: resume.pred ?? null },
        },
        ...config_overrides,
    });
    ulabel.state.current_subtask = "gt";
    for (const name of [
        "redraw_annotation",
        "redraw_all_annotations",
        "redraw_all_annotations_in_annotation_context",
        "rebuild_containing_box",
        "update_filter_distance",
        "update_filter_distance_during_polyline_move",
        "suggest_edits",
        "show_edit_suggestion",
        "destroy_polygon_ender",
        "destroy_annotation_context",
        "hide_id_dialog",
        "show_id_dialog",
        "update_frame",
    ]) {
        ulabel[name] = jest.fn();
    }
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
    return ulabel;
}

// Collapse a call into the fields most tests care about
function brief(call) {
    const { subtask_key, annotation_id, act_type, kind } = call[0];
    return { subtask_key, annotation_id, act_type, kind };
}

function make_ulabel_with_callback(resume = {}, config_overrides = {}) {
    const on_annotation_change = jest.fn();
    const ulabel = make_ulabel(resume, { on_annotation_change, ...config_overrides });
    return { ulabel, on_annotation_change };
}

describe("create / delete round trip", () => {
    test("create fires do, undo fires undo, redo fires redo", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback();

        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "a1");
        ulabel.undo();
        ulabel.redo();

        expect(on_annotation_change.mock.calls.map(brief)).toEqual([
            { subtask_key: "gt", annotation_id: "a1", act_type: "create_annotation", kind: "do" },
            { subtask_key: "gt", annotation_id: "a1", act_type: "create_annotation", kind: "undo" },
            { subtask_key: "gt", annotation_id: "a1", act_type: "create_annotation", kind: "redo" },
        ]);
        expect(on_annotation_change.mock.calls[0][0]).toEqual({
            subtask_key: "gt",
            annotation_id: "a1",
            act_type: "create_annotation",
            kind: "do",
            affected: [],
            previous_classification_payloads: null,
        });
    });

    test("delete fires for do / undo / redo", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [make_bbox("g1")] });

        ulabel.delete_annotation("g1");
        ulabel.undo();
        ulabel.redo();

        expect(on_annotation_change.mock.calls.map((call) => call[0].kind)).toEqual(["do", "undo", "redo"]);
        expect(on_annotation_change.mock.calls.every((call) => call[0].act_type === "delete_annotation")).toBe(true);
    });

    test("is silent without a callback", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });

        expect(() => {
            ulabel.delete_annotation("g1");
            ulabel.undo();
        }).not.toThrow();
    });
});

describe("class change", () => {
    function pick_class(ulabel, annotation_id, class_id) {
        ulabel.subtasks.gt.state.id_payload = classes.map((cls) => ({ class_id: cls.id, confidence: cls.id === class_id ? 1.0 : 0.0 }));
        ulabel.assign_annotation_id(annotation_id);
    }

    test("reports the payloads the annotation had before each event", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [make_bbox("g1", 1)] });
        const crop = [{ class_id: 1, confidence: 1.0 }, { class_id: 2, confidence: 0.0 }];
        const weed = [{ class_id: 1, confidence: 0.0 }, { class_id: 2, confidence: 1.0 }];

        pick_class(ulabel, "g1", 2);
        ulabel.undo();
        ulabel.redo();

        expect(on_annotation_change.mock.calls.map((call) => [call[0].kind, call[0].previous_classification_payloads])).toEqual([
            ["do", crop],
            ["undo", weed],
            ["redo", crop],
        ]);
        expect(on_annotation_change.mock.calls.every((call) => call[0].act_type === "assign_annotation_id")).toBe(true);
    });

    test("re-picking the current class fires nothing", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [make_bbox("g1", 1)] });

        pick_class(ulabel, "g1", 1);

        expect(on_annotation_change).not.toHaveBeenCalled();
    });
});

describe("edit", () => {
    function drag_corner(ulabel, annotation_id, to) {
        ulabel.get_global_mouse_x = () => to[0];
        ulabel.get_global_mouse_y = () => to[1];
        ulabel.subtasks.gt.state.edit_candidate = { annid: annotation_id, access: "11", point: to };
        ulabel.begin_edit({});
        ulabel.continue_edit({});
        ulabel.finish_edit();
    }

    test("begin_edit and continue_edit are silent on do; finish_edit fires; undo and redo report begin_edit", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [make_bbox("g1")] });

        drag_corner(ulabel, "g1", [50, 50]);
        expect(on_annotation_change.mock.calls.map(brief)).toEqual([
            { subtask_key: "gt", annotation_id: "g1", act_type: "finish_edit", kind: "do" },
        ]);

        ulabel.undo();
        expect(ulabel.subtasks.gt.annotations.access.g1.spatial_payload).toEqual([[10, 10], [30, 30]]);
        ulabel.redo();
        expect(ulabel.subtasks.gt.annotations.access.g1.spatial_payload).toEqual([[10, 10], [50, 50]]);

        expect(on_annotation_change.mock.calls.slice(1).map(brief)).toEqual([
            { subtask_key: "gt", annotation_id: "g1", act_type: "begin_edit", kind: "undo" },
            { subtask_key: "gt", annotation_id: "g1", act_type: "begin_edit", kind: "redo" },
        ]);
    });

    test("on_annotation_change_in_progress reports continue_edit too", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback(
            { gt: [make_bbox("g1")] },
            { on_annotation_change_in_progress: true },
        );

        drag_corner(ulabel, "g1", [50, 50]);

        // begin_edit itself runs one continue_edit, then the explicit one
        expect(on_annotation_change.mock.calls.map((call) => call[0].act_type)).toEqual([
            "continue_edit",
            "continue_edit",
            "finish_edit",
        ]);
    });
});

describe("drawing", () => {
    function setup(resume, config_overrides = {}) {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback(resume, config_overrides);
        for (const name of ["create_polygon_ender", "move_polygon_ender", "recolor_active_polygon_ender", "redraw_multiple_spatial_annotations", "draw_annotation_from_id"]) {
            ulabel[name] = jest.fn();
        }
        ulabel.subtasks.gt.state.annotation_contexts = { c0: { context: {}, annotation_ids: [] } };
        ulabel.get_image_aware_mouse_x_y = (mouse_event) => [mouse_event.x, mouse_event.y];
        ulabel.get_global_mouse_x = (mouse_event) => mouse_event.x;
        ulabel.get_global_mouse_y = (mouse_event) => mouse_event.y;
        return { ulabel, on_annotation_change };
    }

    function draw_bbox(ulabel, from, to) {
        ulabel.subtasks.gt.state.annotation_mode = "bbox";
        ulabel.begin_annotation({ x: from[0], y: from[1] });
        ulabel.continue_annotation({ x: to[0], y: to[1] });
        ulabel.finish_annotation();
        return ulabel.subtasks.gt.state.active_id ?? ulabel.subtasks.gt.annotations.ordering.at(-1);
    }

    function draw_polygon(ulabel, points) {
        ulabel.subtasks.gt.state.annotation_mode = "polygon";
        ulabel.begin_annotation({ x: points[0][0], y: points[0][1] });
        for (const [x, y] of points.slice(1)) {
            ulabel.continue_annotation({ x, y }, true);
        }
        // Close on the first point
        ulabel.continue_annotation({ x: points[0][0], y: points[0][1] }, true);
        ulabel.finish_annotation();
        return ulabel.subtasks.gt.annotations.ordering.at(-1);
    }

    test("a drawn bbox fires once on finish with its final geometry; undo and redo report begin_annotation", () => {
        const { ulabel, on_annotation_change } = setup();
        const seen = [];
        on_annotation_change.mockImplementation((change) => {
            seen.push(JSON.parse(JSON.stringify(ulabel.subtasks.gt.annotations.access[change.annotation_id]?.spatial_payload ?? null)));
        });

        const id = draw_bbox(ulabel, [10, 10], [40, 30]);

        expect(on_annotation_change.mock.calls.map(brief)).toEqual([
            { subtask_key: "gt", annotation_id: id, act_type: "finish_annotation", kind: "do" },
        ]);
        expect(seen).toEqual([[[10, 10], [40, 30]]]);

        ulabel.undo();
        expect(ulabel.subtasks.gt.annotations.access[id]).toBeUndefined();
        ulabel.redo();
        expect(ulabel.subtasks.gt.annotations.access[id].spatial_payload).toEqual([[10, 10], [40, 30]]);

        expect(on_annotation_change.mock.calls.slice(1).map(brief)).toEqual([
            { subtask_key: "gt", annotation_id: id, act_type: "begin_annotation", kind: "undo" },
            { subtask_key: "gt", annotation_id: id, act_type: "begin_annotation", kind: "redo" },
        ]);
    });

    test("a drawn polygon fires once, after simplify/merge, with the final geometry", () => {
        const { ulabel, on_annotation_change } = setup();
        const seen = [];
        on_annotation_change.mockImplementation((change) => {
            seen.push(JSON.parse(JSON.stringify(ulabel.subtasks.gt.annotations.access[change.annotation_id].spatial_payload)));
        });

        // The collinear midpoint on the top edge is what simplify removes
        const id = draw_polygon(ulabel, [[0, 0], [10, 0], [20, 0], [20, 20], [0, 20]]);

        expect(on_annotation_change.mock.calls.map(brief)).toEqual([
            { subtask_key: "gt", annotation_id: id, act_type: "finish_annotation", kind: "do" },
        ]);
        // The collapse leaves one action standing in for the whole draw
        expect(ulabel.subtasks.gt.actions.stream.map((action) => action.act_type)).toEqual(["finish_annotation"]);
        expect(seen).toHaveLength(1);
        expect(seen[0]).toEqual(ulabel.subtasks.gt.annotations.access[id].spatial_payload);
        expect(seen[0][0]).not.toContainEqual([10, 0]);

        ulabel.undo();
        expect(ulabel.subtasks.gt.annotations.access[id].deprecated).toBe(true);
        ulabel.redo();
        expect(ulabel.subtasks.gt.annotations.access[id].deprecated).toBe(false);

        expect(on_annotation_change.mock.calls.slice(1).map(brief)).toEqual([
            { subtask_key: "gt", annotation_id: id, act_type: "finish_annotation", kind: "undo" },
            { subtask_key: "gt", annotation_id: id, act_type: "finish_annotation", kind: "redo" },
        ]);
    });

    test("on_annotation_change_in_progress reports each continue_annotation", () => {
        const { ulabel, on_annotation_change } = setup({}, { on_annotation_change_in_progress: true });

        draw_bbox(ulabel, [10, 10], [40, 30]);

        expect(on_annotation_change.mock.calls.map((call) => call[0].act_type)).toEqual(["continue_annotation", "finish_annotation"]);
    });
});

describe("move", () => {
    function drag_body(ulabel, dx, dy) {
        ulabel.subtasks.gt.state.move_candidate = { annid: "g1", spatial_type: "bbox", access: 0, distance: 0, point: [20, 20], containing: true };
        ulabel.drag_state.move.mouse_start = [100, 100, 0];
        ulabel.begin_move({ clientX: 100, clientY: 100 });
        ulabel.finish_move({ clientX: 100 + dx, clientY: 100 + dy });
    }

    test("a drag fires finish_move; a zero-diff click fires nothing", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [make_bbox("g1")] });

        drag_body(ulabel, 0, 0);
        expect(on_annotation_change).not.toHaveBeenCalled();

        drag_body(ulabel, 20, 10);
        ulabel.undo();
        ulabel.redo();

        expect(on_annotation_change.mock.calls.map(brief)).toEqual([
            { subtask_key: "gt", annotation_id: "g1", act_type: "finish_move", kind: "do" },
            { subtask_key: "gt", annotation_id: "g1", act_type: "begin_move", kind: "undo" },
            { subtask_key: "gt", annotation_id: "g1", act_type: "begin_move", kind: "redo" },
        ]);
    });
});

describe("cross-subtask actions", () => {
    test("paste is reported on the target stream", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [make_bbox("g1")] });

        const new_id = ulabel.copy_annotation_to_subtask("g1", "gt", "pred");

        expect(on_annotation_change.mock.calls.map(brief)).toEqual([
            { subtask_key: "pred", annotation_id: new_id, act_type: "paste_annotation", kind: "do" },
        ]);
        expect(on_annotation_change.mock.calls[0][0].affected).toEqual([]);
    });

    test("move is reported on the source stream with the target copy in affected", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [make_bbox("g1")] });

        const new_id = ulabel.copy_annotation_to_subtask("g1", "gt", "pred", null, true);
        ulabel.undo();
        ulabel.redo();

        expect(on_annotation_change.mock.calls.map(brief)).toEqual([
            { subtask_key: "gt", annotation_id: "g1", act_type: "move_annotation", kind: "do" },
            { subtask_key: "gt", annotation_id: "g1", act_type: "move_annotation", kind: "undo" },
            { subtask_key: "gt", annotation_id: "g1", act_type: "move_annotation", kind: "redo" },
        ]);
        for (const call of on_annotation_change.mock.calls) {
            expect(call[0].affected).toEqual([{ annotation_id: new_id, subtask_key: "pred" }]);
        }
    });

    test("bitmask overlap edits carry the other masks in affected", () => {
        const mask = (id) => ({ ...make_bbox(id), spatial_type: "bitmask", spatial_payload: null, containing_box: null });
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [mask("m1"), mask("m2")], pred: [mask("p1")] });
        const edit = (annotation_id, subtask) => ({ annotation_id, subtask, before_rle: null, after_rle: null, after_empty: false });

        ulabel.bitmask_stroke__redo("m1", {
            before_rle: null,
            after_rle: null,
            was_new: false,
            after_empty: false,
            other_edits: [edit("m2", "gt"), edit("p1", "pred")],
        });

        expect(on_annotation_change).toHaveBeenCalledTimes(1);
        expect(brief(on_annotation_change.mock.calls[0])).toEqual({ subtask_key: "gt", annotation_id: "m1", act_type: "bitmask_stroke", kind: "redo" });
        expect(on_annotation_change.mock.calls[0][0].affected).toEqual([
            { annotation_id: "m2", subtask_key: "gt" },
            { annotation_id: "p1", subtask_key: "pred" },
        ]);
    });
});

describe("not reported", () => {
    test("edit_text_payload", () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [make_bbox("g1")] });

        ulabel.edit_text_payload("g1", "note");
        ulabel.undo();

        expect(on_annotation_change).not.toHaveBeenCalled();
    });

    test("set_annotations", async () => {
        const { ulabel, on_annotation_change } = make_ulabel_with_callback({ gt: [make_bbox("g1")] });
        ulabel._clear_subtask_annotation_canvases = jest.fn();
        ulabel.refresh_toolbox = jest.fn();

        await ulabel.set_annotations([make_bbox("g2")], "gt", false, false);

        expect(ulabel.subtasks.gt.annotations.ordering).toEqual(["g2"]);
        expect(on_annotation_change).not.toHaveBeenCalled();
    });
});

test("a throwing callback is logged and does not break the action", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { ulabel } = make_ulabel_with_callback({ gt: [make_bbox("g1")] }, {
        on_annotation_change: () => {
            throw new Error("host bug");
        },
    });

    expect(() => ulabel.delete_annotation("g1")).not.toThrow();

    expect(ulabel.subtasks.gt.annotations.access.g1.deprecated).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("host bug"));
    warn.mockRestore();
});
