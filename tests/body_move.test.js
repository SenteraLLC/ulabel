// Unit tests for body-drag move: a plain left-drag on an annotation's body
// moves it, a modifier forces a draw, and a click with no drag leaves no trace.
const { ULabel } = require("./testing-utils/build_loader");

function make_config(overrides = {}) {
    return {
        container_id: "container",
        image_data: "test.jpg",
        username: "test_user",
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            st: {
                display_name: "A",
                classes: [{ name: "Crop", id: 1, color: "green" }],
                allowed_modes: ["bbox", "polygon", "delete_bbox"],
                resume_from: null,
            },
        },
        ...overrides,
    };
}

// `current_subtask` is only set by init()/set_subtask, which need a real DOM.
function make_ulabel(config = make_config()) {
    const ulabel = new ULabel(config);
    ulabel.state.current_subtask = "st";
    return ulabel;
}

function canvas_mousedown(ulabel, modifiers = {}) {
    return {
        button: 0,
        target: { id: ulabel.subtasks.st.canvas_fid },
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        ...modifiers,
    };
}

function hover(ulabel, containing) {
    ulabel.subtasks.st.state.move_candidate = {
        annid: "a0",
        spatial_type: "bbox",
        access: 0,
        distance: 0,
        point: [5, 5],
        containing,
    };
}

describe("get_drag_key_start body move", () => {
    test("a containing hit starts a move", () => {
        const ulabel = make_ulabel();
        hover(ulabel, true);

        expect(ULabel.get_drag_key_start(canvas_mousedown(ulabel), ulabel)).toBe("move");
    });

    test("a near-miss on the containing box starts a draw", () => {
        const ulabel = make_ulabel();
        hover(ulabel, false);

        expect(ULabel.get_drag_key_start(canvas_mousedown(ulabel), ulabel)).toBe("annotation");
    });

    test("no hover candidate starts a draw", () => {
        const ulabel = make_ulabel();
        ulabel.subtasks.st.state.move_candidate = null;

        expect(ULabel.get_drag_key_start(canvas_mousedown(ulabel), ulabel)).toBe("annotation");
    });

    test("the force-draw modifier draws over a containing hit", () => {
        const ulabel = make_ulabel();
        hover(ulabel, true);

        expect(ULabel.get_drag_key_start(canvas_mousedown(ulabel, { altKey: true }), ulabel)).toBe("annotation");
    });

    test("allow_body_move: false restores draw-everywhere", () => {
        const ulabel = make_ulabel(make_config({ allow_body_move: false }));
        hover(ulabel, true);

        expect(ULabel.get_drag_key_start(canvas_mousedown(ulabel), ulabel)).toBe("annotation");
    });

    test("delete modes drag over bodies without moving them", () => {
        const ulabel = make_ulabel();
        hover(ulabel, true);
        ulabel.subtasks.st.state.annotation_mode = "delete_bbox";

        expect(ULabel.get_drag_key_start(canvas_mousedown(ulabel), ulabel)).toBe("annotation");
    });

    test("read-only subtasks are inert", () => {
        const ulabel = make_ulabel();
        hover(ulabel, true);
        ulabel.subtasks.st.read_only = true;

        expect(ULabel.get_drag_key_start(canvas_mousedown(ulabel), ulabel)).toBeNull();
    });

    test("ctrl pans and shift zooms before body move is considered", () => {
        const ulabel = make_ulabel();
        hover(ulabel, true);

        expect(ULabel.get_drag_key_start(canvas_mousedown(ulabel, { ctrlKey: true }), ulabel)).toBe("pan");
        expect(ULabel.get_drag_key_start(canvas_mousedown(ulabel, { shiftKey: true }), ulabel)).toBe("zoom");
    });

    test("a vertex handle under the cursor still edits", () => {
        const ulabel = make_ulabel();
        hover(ulabel, true);
        const handle = document.createElement("a");
        handle.className = "editable";

        expect(ULabel.get_drag_key_start({ button: 0, target: handle }, ulabel)).toBe("edit");
    });
});

describe("get_edit_candidates containing hits per spatial type", () => {
    function load(ulabel, annotation) {
        ulabel.subtasks.st.annotations = {
            access: { [annotation.id]: annotation },
            ordering: [annotation.id],
        };
        ulabel.get_empirical_scale = () => 1;
        ulabel.get_subtask_line_size = () => 4;
        ulabel.state.current_frame = 0;
    }

    function containing_at(ulabel, x, y) {
        return ulabel.get_edit_candidates(x, y, 20).best?.containing ?? null;
    }

    test("contour: on the stroke moves, inside its box but off the stroke does not", () => {
        const ulabel = make_ulabel();
        load(ulabel, {
            id: "c", spatial_type: "contour", deprecated: false,
            spatial_payload: [[10, 10], [50, 10], [50, 50]],
            containing_box: { tlx: 10, tly: 10, brx: 50, bry: 50 },
            classification_payloads: [{ class_id: 1, confidence: 1 }],
        });

        expect(containing_at(ulabel, 30, 11)).toBe(true);
        expect(containing_at(ulabel, 20, 40)).toBe(false);
    });

    test("tbar: stem and cross bar move, the empty quadrant does not", () => {
        const ulabel = make_ulabel();
        // Stem from (400,300) straight down to (400,600); cross bar spans x 250..550 at y=300
        load(ulabel, {
            id: "t", spatial_type: "tbar", deprecated: false,
            spatial_payload: [[400, 300], [400, 600]],
            containing_box: null,
            classification_payloads: [{ class_id: 1, confidence: 1 }],
        });
        ulabel.rebuild_containing_box("t", false, "st");

        const box = ulabel.subtasks.st.annotations.access.t.containing_box;
        expect(box.tlx).toBeLessThanOrEqual(250);
        expect(box.brx).toBeGreaterThanOrEqual(550);

        expect(containing_at(ulabel, 400, 450)).toBe(true);
        expect(containing_at(ulabel, 280, 300)).toBe(true);
        expect(containing_at(ulabel, 520, 300)).toBe(true);
        expect(containing_at(ulabel, 500, 500)).toBe(false);
    });

    test("bbox3: inside the x/y box on a covered frame moves", () => {
        const ulabel = make_ulabel();
        load(ulabel, {
            id: "b3", spatial_type: "bbox3", deprecated: false,
            spatial_payload: [[10, 10, 0], [50, 50, 2]],
            containing_box: { tlx: 10, tly: 10, brx: 50, bry: 50 },
            classification_payloads: [{ class_id: 1, confidence: 1 }],
        });

        expect(containing_at(ulabel, 30, 30)).toBe(true);
        expect(containing_at(ulabel, 55, 30)).toBe(false);
    });
});

describe("zero-diff body click", () => {
    function load_bbox(ulabel) {
        const annotation = {
            id: "a0",
            spatial_type: "bbox",
            spatial_payload: [[10, 10], [50, 50]],
            containing_box: { tlx: 10, tly: 10, brx: 50, bry: 50 },
            classification_payloads: [{ class_id: 1, confidence: 1 }],
            deprecated: false,
            last_edited_at: "before",
            last_edited_by: "someone",
        };
        ulabel.subtasks.st.annotations = {
            access: { a0: annotation },
            ordering: ["a0"],
        };
        return annotation;
    }

    function stub_rendering(ulabel) {
        ulabel.redraw_annotation = jest.fn();
        ulabel.redraw_all_annotations_in_annotation_context = jest.fn();
        ulabel.rebuild_containing_box = jest.fn();
        ulabel.update_filter_distance_during_polyline_move = jest.fn();
        ulabel.update_filter_distance = jest.fn();
        ulabel.suggest_edits = jest.fn();
        ulabel.toolbox = { redraw_update_items: jest.fn() };
    }

    function click_body(ulabel, dx = 0, dy = 0) {
        hover(ulabel, true);
        ulabel.drag_state.move.mouse_start = [100, 100, 0];
        ulabel.begin_move({ clientX: 100, clientY: 100 });
        ulabel.finish_move({ clientX: 100 + dx, clientY: 100 + dy });
    }

    test("leaves the undo stream, redo stack and saved state untouched", () => {
        const ulabel = make_ulabel();
        const annotation = load_bbox(ulabel);
        stub_rendering(ulabel);
        const undone = { act_type: "delete_annotation", annotation_id: "zz", undo_payload: "{}", redo_payload: "{}" };
        ulabel.subtasks.st.actions.undone_stack = [undone];
        ulabel.set_saved(true);

        click_body(ulabel);

        expect(ulabel.subtasks.st.actions.stream).toEqual([]);
        expect(ulabel.subtasks.st.actions.undone_stack).toEqual([undone]);
        expect(ulabel.state.edited).toBe(false);
        expect(annotation.last_edited_at).toBe("before");
        expect(annotation.last_edited_by).toBe("someone");
        expect(annotation.spatial_payload).toEqual([[10, 10], [50, 50]]);
        expect(ulabel.subtasks.st.state.active_id).toBeNull();
        expect(ulabel.subtasks.st.state.is_in_move).toBe(false);
    });

    test("a real drag still records one begin_move and marks the state edited", () => {
        const ulabel = make_ulabel();
        const annotation = load_bbox(ulabel);
        stub_rendering(ulabel);
        ulabel.set_saved(true);

        click_body(ulabel, 20, 10);

        expect(ulabel.subtasks.st.actions.stream.map((a) => a.act_type)).toEqual(["begin_move"]);
        expect(ulabel.state.edited).toBe(true);
        expect(annotation.spatial_payload).toEqual([[30, 20], [70, 60]]);
    });

    // Ctrl+Z while the mouse is still held finishes the pending begin_move
    // first; with no movement that drops it, and undo must stop there.
    function hold_body(ulabel) {
        hover(ulabel, true);
        ulabel.drag_state.move.mouse_start = [100, 100, 0];
        ulabel.drag_state.active_key = "move";
        ulabel.state.last_move = { clientX: 100, clientY: 100 };
        ulabel.begin_move({ clientX: 100, clientY: 100 });
    }

    test("undo during a stationary body click with no history does not throw", () => {
        const ulabel = make_ulabel();
        load_bbox(ulabel);
        stub_rendering(ulabel);
        ulabel.hide_id_dialog = jest.fn();

        hold_body(ulabel);
        expect(() => ulabel.undo()).not.toThrow();

        expect(ulabel.subtasks.st.actions.stream).toEqual([]);
        expect(ulabel.subtasks.st.actions.undone_stack).toEqual([]);
        expect(ulabel.subtasks.st.state.is_in_move).toBe(false);
    });

    test("undo during a stationary body click leaves the preceding action and its redo intact", () => {
        const ulabel = make_ulabel();
        load_bbox(ulabel);
        stub_rendering(ulabel);
        ulabel.hide_id_dialog = jest.fn();
        ulabel.destroy_annotation_context = jest.fn();
        ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
        ulabel.subtasks.st.state.annotation_contexts = { c0: { context: {}, annotation_ids: [] } };
        ulabel.create_annotation("bbox", [[60, 60], [80, 80]], "a1");
        expect(ulabel.subtasks.st.actions.stream.map((a) => a.act_type)).toEqual(["create_annotation"]);

        hold_body(ulabel);
        ulabel.undo();

        // Only the pending move was cancelled; a1 is still there
        expect(ulabel.subtasks.st.actions.stream.map((a) => a.act_type)).toEqual(["create_annotation"]);
        expect(ulabel.subtasks.st.annotations.access.a1).toBeDefined();
        expect(ulabel.subtasks.st.actions.undone_stack).toEqual([]);

        // A second undo then removes a1, and redo brings it back
        ulabel.undo();
        expect(ulabel.subtasks.st.annotations.access.a1).toBeUndefined();
        ulabel.redo();
        expect(ulabel.subtasks.st.annotations.access.a1).toBeDefined();
    });
});
