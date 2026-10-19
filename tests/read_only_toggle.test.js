// Unit tests for set_subtask_read_only and the read-only gates (CVML-287).
const { ULabel } = require("./testing-utils/build_loader");

const classes = [
    { name: "Crop", id: 1, color: "green" },
    { name: "Weed", id: 2, color: "red" },
];

function make_bbox(id) {
    return {
        id,
        spatial_type: "bbox",
        spatial_payload: [[10, 10], [30, 30]],
        containing_box: { tlx: 10, tly: 10, brx: 30, bry: 30 },
        classification_payloads: [{ class_id: 1, confidence: 1.0 }],
        deprecated: false,
    };
}

function make_ulabel(config_overrides = {}, gt_resume = null) {
    const ulabel = new ULabel({
        container_id: "container",
        image_data: "test.jpg",
        username: "test_user",
        image_width: 100,
        image_height: 100,
        allow_annotations_outside_image: true,
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            gt: { display_name: "GT", classes, allowed_modes: ["bbox", "polygon", "whole-image"], resume_from: gt_resume },
            pred: { display_name: "Pred", classes, allowed_modes: ["bbox", "polygon"], resume_from: null },
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
        "suggest_edits",
        "show_edit_suggestion",
        "destroy_polygon_ender",
        "destroy_annotation_context",
        "hide_id_dialog",
        "hide_context_menu",
        "hide_and_clear_action_candidates",
        "update_frame",
        "set_and_update_annotation_mode",
        "create_brush_circle",
        "destroy_brush_circle",
    ]) {
        ulabel[name] = jest.fn();
    }
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
    return ulabel;
}

describe("set_subtask_read_only", () => {
    test("unknown subtask key warns and changes nothing", () => {
        const ulabel = make_ulabel();
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

        ulabel.set_subtask_read_only("nope", true);

        expect(warn).toHaveBeenCalled();
        expect(ulabel.subtasks.gt.read_only).toBe(false);
        warn.mockRestore();
    });

    test("same value is a no-op", () => {
        const ulabel = make_ulabel();

        ulabel.set_subtask_read_only("gt", false);

        expect(ulabel.hide_id_dialog).not.toHaveBeenCalled();
    });

    test("is not recorded and fires no callback", () => {
        const on_annotation_change = jest.fn();
        const ulabel = make_ulabel({ on_annotation_change });
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "a1");
        on_annotation_change.mockClear();
        ulabel.set_saved(true);

        ulabel.set_subtask_read_only("gt", true);
        ulabel.set_subtask_read_only("gt", false);

        expect(ulabel.subtasks.gt.actions.stream).toHaveLength(1);
        expect(on_annotation_change).not.toHaveBeenCalled();
        expect(ulabel.state.edited).toBe(false);
    });

    test("a non-current subtask flips without teardown", () => {
        const ulabel = make_ulabel();

        ulabel.set_subtask_read_only("pred", true);

        expect(ulabel.subtasks.pred.read_only).toBe(true);
        expect(ulabel.hide_id_dialog).not.toHaveBeenCalled();
    });

    test("current subtask tears down in order while still editable", () => {
        const ulabel = make_ulabel();
        const state = ulabel.subtasks.gt.state;
        const calls = [];
        const track = (name, fn = () => {}) => {
            ulabel[name] = jest.fn((...args) => {
                calls.push([name, ulabel.subtasks.gt.read_only]);
                fn(...args);
            });
        };
        ulabel.drag_state.active_key = "annotation";
        ulabel.state.last_move = { fake: true };
        state.is_in_progress = true;
        state.is_in_brush_mode = true;
        track("end_drag", () => {
            ulabel.drag_state.active_key = null;
        });
        track("cancel_annotation", () => {
            state.is_in_progress = false;
        });
        track("disable_bitmask_brush");
        track("hide_id_dialog");
        track("hide_context_menu");
        track("hide_and_clear_action_candidates");

        ulabel.set_subtask_read_only("gt", true);

        expect(calls).toEqual([
            ["end_drag", false],
            ["cancel_annotation", false],
            ["disable_bitmask_brush", false],
            ["hide_id_dialog", false],
            ["hide_context_menu", false],
            ["hide_and_clear_action_candidates", false],
        ]);
        expect(ulabel.end_drag).toHaveBeenCalledWith(ulabel.state.last_move);
        expect(ulabel.subtasks.gt.read_only).toBe(true);
    });

    test("becoming editable runs no teardown", () => {
        const ulabel = make_ulabel();
        ulabel.set_subtask_read_only("gt", true);
        ulabel.hide_id_dialog.mockClear();

        ulabel.set_subtask_read_only("gt", false);

        expect(ulabel.subtasks.gt.read_only).toBe(false);
        expect(ulabel.hide_id_dialog).not.toHaveBeenCalled();
    });
});

describe("undo / redo gates", () => {
    test("user undo and redo do nothing on a read-only current subtask", () => {
        const ulabel = make_ulabel();
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "a1");
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "a2");
        ulabel.undo();
        const { stream, undone_stack } = ulabel.subtasks.gt.actions;

        ulabel.set_subtask_read_only("gt", true);
        ulabel.undo();
        ulabel.redo();

        expect(stream).toHaveLength(1);
        expect(undone_stack).toHaveLength(1);
        expect(ulabel.subtasks.gt.annotations.access.a1.deprecated).toBe(false);

        ulabel.set_subtask_read_only("gt", false);
        ulabel.redo();
        expect(stream).toHaveLength(2);
        ulabel.undo();
        ulabel.undo();
        expect(stream).toHaveLength(0);
    });

    test("user undo is blocked when the action touched a read-only subtask", () => {
        const ulabel = make_ulabel({}, [make_bbox("g1")]);
        const new_id = ulabel.copy_annotation_to_subtask("g1", "gt", "pred", null, true);
        const stream = ulabel.subtasks.gt.actions.stream;
        expect(stream[stream.length - 1].affected).toEqual([{ annotation_id: new_id, subtask_key: "pred" }]);

        ulabel.set_subtask_read_only("pred", true);
        ulabel.undo();
        expect(stream).toHaveLength(1);

        ulabel.set_subtask_read_only("pred", false);
        ulabel.undo();
        expect(stream).toHaveLength(0);

        ulabel.set_subtask_read_only("pred", true);
        ulabel.redo();
        expect(stream).toHaveLength(0);
    });
});

describe("brush gates", () => {
    test("toggle_brush_mode and toggle_erase_mode do nothing when read-only", () => {
        const ulabel = make_ulabel();
        ulabel.subtasks.gt.state.annotation_mode = "polygon";
        ulabel.set_subtask_read_only("gt", true);

        ulabel.toggle_brush_mode();
        ulabel.toggle_erase_mode();

        expect(ulabel.subtasks.gt.state.is_in_brush_mode).toBe(false);
        expect(ulabel.subtasks.gt.state.is_in_erase_mode).toBe(false);
    });

    test("a brush circle mousedown starts no brush drag when read-only", () => {
        const ulabel = make_ulabel();
        const mouse_event = { button: 0, target: { id: "brush_circle" } };

        expect(ULabel.get_drag_key_start(mouse_event, ulabel)).toBe("brush");
        ulabel.set_subtask_read_only("gt", true);
        expect(ULabel.get_drag_key_start(mouse_event, ulabel)).toBeNull();
    });
});

describe("non-spatial rows", () => {
    test("re-render with or without their controls", () => {
        const ulabel = make_ulabel();
        document.body.innerHTML = "<div id=\"fad_st__gt\"><div class=\"fad_annotation_rows\"></div></div>";
        const annotation = {
            id: "w1",
            spatial_type: "whole-image",
            spatial_payload: null,
            classification_payloads: [{ class_id: 1, confidence: 1.0 }],
            text_payload: "note",
            deprecated: false,
        };
        ulabel.subtasks.gt.annotations.access.w1 = annotation;
        ulabel.subtasks.gt.annotations.ordering.push("w1");
        ulabel.draw_whole_image_annotation(annotation, "gt");
        expect($("#delete__w1")).toHaveLength(1);

        ulabel.set_subtask_read_only("gt", true);
        expect($("#delete__w1")).toHaveLength(0);
        expect($("#reclf__w1")).toHaveLength(0);
        expect($("#note__w1").prop("readOnly")).toBe(true);
        expect($("#note__w1").val()).toBe("note");

        ulabel.set_subtask_read_only("gt", false);
        expect($("#delete__w1")).toHaveLength(1);
        expect($("#reclf__w1")).toHaveLength(1);
        expect($("#note__w1").prop("readOnly")).toBe(false);
    });
});
