// Unit tests for Ctrl+drag box selection: touch hit-testing per spatial type,
// adding to the selection, live preview, and cancelling. Escape is covered by e2e.
const { ULabel } = require("./testing-utils/build_loader");

let next_id = 0;

function make_annotation(overrides = {}) {
    return {
        id: `anno_${next_id++}`,
        spatial_type: "bbox",
        spatial_payload: [[0, 0], [10, 10]],
        containing_box: { tlx: 0, tly: 0, brx: 10, bry: 10 },
        classification_payloads: [{ class_id: 1, confidence: 1.0 }],
        deprecated: false,
        frame: 0,
        canvas_id: "c0",
        ...overrides,
    };
}

function containing_box_of(points) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    return { tlx: Math.min(...xs), tly: Math.min(...ys), brx: Math.max(...xs), bry: Math.max(...ys) };
}

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        st: {
            display_name: "A",
            classes: [{ name: "Crop", id: 1, color: "green" }],
            allowed_modes: ["bbox", "polygon", "polyline", "point", "tbar", "contour"],
            resume_from: null,
        },
    },
};

let frame_callbacks = [];

function flush_frames() {
    const callbacks = frame_callbacks;
    frame_callbacks = [];
    callbacks.forEach((cb) => cb());
}

function make_ulabel(annotations, config = mock_config) {
    const ulabel = new ULabel(config);
    ulabel.state.current_subtask = "st";
    ulabel.redraw_all_annotations = jest.fn();
    ulabel.redraw_annotation = jest.fn();
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    ulabel.suggest_edits = jest.fn();
    // Screen and image coordinates coincide
    ulabel.get_global_mouse_x = (e) => e.clientX;
    ulabel.get_global_mouse_y = (e) => e.clientY;
    ulabel.get_empirical_scale = () => 1;
    ulabel.get_annbox_content_origin = () => ({ left: 0, top: 0 });
    const access = {};
    const ordering = [];
    for (const annotation of annotations) {
        access[annotation.id] = annotation;
        ordering.push(annotation.id);
    }
    ulabel.subtasks.st.annotations = { access, ordering };
    return ulabel;
}

function at([x, y]) {
    return { clientX: x, clientY: y, button: 0 };
}

function begin(ulabel, from) {
    ulabel.start_drag("select_box", 0, at(from));
}

function move(ulabel, to) {
    ulabel.continue_select_box(at(to));
}

function box_select(ulabel, from, to) {
    begin(ulabel, from);
    move(ulabel, to);
    ulabel.end_drag(at(to));
}

beforeEach(() => {
    frame_callbacks = [];
    global.requestAnimationFrame = (cb) => frame_callbacks.push(cb);
    global.cancelAnimationFrame = jest.fn();
});

afterEach(() => {
    document.getElementById("annotation-selection-indicator")?.remove();
    document.querySelectorAll(".ulabel-select-box").forEach((el) => el.remove());
});

describe("hit-testing (touch)", () => {
    test("bbox: overlap selects, a gap does not", () => {
        const touched = make_annotation({ spatial_payload: [[10, 10], [30, 30]], containing_box: { tlx: 10, tly: 10, brx: 30, bry: 30 } });
        const missed = make_annotation({ spatial_payload: [[60, 60], [80, 80]], containing_box: { tlx: 60, tly: 60, brx: 80, bry: 80 } });
        const ulabel = make_ulabel([touched, missed]);

        box_select(ulabel, [0, 0], [15, 15]);

        expect(ulabel.get_selected_annotation_ids()).toEqual([touched.id]);
    });

    test("corners may come in any order", () => {
        const a = make_annotation();
        const ulabel = make_ulabel([a]);

        box_select(ulabel, [20, 20], [5, 5]);

        expect(ulabel.get_selected_annotation_ids()).toEqual([a.id]);
    });

    test("point: inside only", () => {
        const inside = make_annotation({ spatial_type: "point", spatial_payload: [[5, 5]], containing_box: { tlx: 5, tly: 5, brx: 5, bry: 5 } });
        const outside = make_annotation({ spatial_type: "point", spatial_payload: [[50, 5]], containing_box: { tlx: 50, tly: 5, brx: 50, bry: 5 } });
        const ulabel = make_ulabel([inside, outside]);

        box_select(ulabel, [0, 0], [10, 10]);

        expect(ulabel.get_selected_annotation_ids()).toEqual([inside.id]);
    });

    test("polyline: a crossing segment selects even with no vertex inside", () => {
        const line = [[0, 50], [100, 50]];
        const crossing = make_annotation({ spatial_type: "polyline", spatial_payload: line, containing_box: containing_box_of(line) });
        const corner = [[0, 0], [100, 0], [100, 100]];
        // Its containing box overlaps the selection box, but its segments run along the edges
        const beside = make_annotation({ spatial_type: "polyline", spatial_payload: corner, containing_box: containing_box_of(corner) });
        const ulabel = make_ulabel([crossing, beside]);

        box_select(ulabel, [40, 40], [60, 60]);

        expect(ulabel.get_selected_annotation_ids()).toEqual([crossing.id]);
    });

    test("polygon: an edge, or a box wholly inside, selects; a box inside a hole does not", () => {
        const outer = [[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]];
        const hole = [[30, 30], [70, 30], [70, 70], [30, 70], [30, 30]];
        const donut = make_annotation({
            spatial_type: "polygon",
            spatial_payload: [outer, hole],
            spatial_payload_holes: [false, true],
            spatial_payload_child_indices: [[1], []],
            containing_box: containing_box_of(outer),
        });
        const ulabel = make_ulabel([donut]);

        // Inside the hole
        box_select(ulabel, [40, 40], [60, 60]);
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);

        // Inside the filled ring
        box_select(ulabel, [5, 5], [20, 20]);
        expect(ulabel.get_selected_annotation_ids()).toEqual([donut.id]);

        ulabel.clear_selection();
        // Crossing the hole's edge
        box_select(ulabel, [40, 40], [80, 60]);
        expect(ulabel.get_selected_annotation_ids()).toEqual([donut.id]);
    });

    test("tbar: the cross bar counts, beyond the stem's containing box", () => {
        // Stem (50,50) -> (50,90); cross bar spans x 30..70 at y 50
        const tbar = make_annotation({
            spatial_type: "tbar",
            spatial_payload: [[50, 50], [50, 90]],
            containing_box: { tlx: 50, tly: 50, brx: 50, bry: 90 },
        });
        const ulabel = make_ulabel([tbar]);

        box_select(ulabel, [32, 45], [40, 55]);

        expect(ulabel.get_selected_annotation_ids()).toEqual([tbar.id]);
    });

    test("skips annotations on other frames, deprecated and non-spatial ones", () => {
        const here = make_annotation();
        const other_frame = make_annotation({ frame: 3 });
        const gone = make_annotation({ deprecated: true });
        const whole = make_annotation({ spatial_type: "whole-image", spatial_payload: null, containing_box: null });
        const ulabel = make_ulabel([here, other_frame, gone, whole]);

        box_select(ulabel, [0, 0], [10, 10]);

        expect(ulabel.get_selected_annotation_ids()).toEqual([here.id]);
    });

    test("bitmask: only painted pixels count, not the containing box", () => {
        const size = 64;
        const data = new Uint8Array(size * size);
        for (const [x0, y0] of [[2, 2], [58, 58]]) {
            for (let y = y0; y < y0 + 4; y++) {
                for (let x = x0; x < x0 + 4; x++) data[y * size + x] = 1;
            }
        }
        const mask = make_annotation({
            spatial_type: "bitmask",
            spatial_payload: { data, size: [size, size] },
            containing_box: { tlx: 2, tly: 2, brx: 61, bry: 61 },
        });
        const ulabel = make_ulabel([mask]);

        // Wholly in the empty space between the painted corners
        box_select(ulabel, [20, 20], [30, 30]);
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);

        // Pixel 5 covers [5, 6), so a box starting at 5.5 touches it
        box_select(ulabel, [5.5, 5.5], [12, 12]);
        expect(ulabel.get_selected_annotation_ids()).toEqual([mask.id]);
    });
});

describe("box selection behaviour", () => {
    test("adds to the existing selection", () => {
        const a = make_annotation();
        const far = make_annotation({ spatial_payload: [[60, 60], [80, 80]], containing_box: { tlx: 60, tly: 60, brx: 80, bry: 80 } });
        const ulabel = make_ulabel([a, far]);
        ulabel.select_annotations([far.id]);

        box_select(ulabel, [0, 0], [10, 10]);

        expect(ulabel.get_selected_annotation_ids()).toEqual([a.id, far.id]);
    });

    test("previews while dragging, at most once per frame, and drops what the box leaves", () => {
        const a = make_annotation();
        const ulabel = make_ulabel([a]);

        begin(ulabel, [50, 50]);
        move(ulabel, [5, 5]);
        move(ulabel, [6, 6]);
        expect(frame_callbacks.length).toBe(1);
        flush_frames();
        expect(ulabel.get_selected_annotation_ids()).toEqual([a.id]);

        move(ulabel, [40, 40]);
        flush_frames();
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);

        ulabel.end_drag(at([40, 40]));
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
    });

    test("draws a box overlay only once the drag passes the click tolerance, and removes it", () => {
        const ulabel = make_ulabel([make_annotation()]);

        begin(ulabel, [50, 50]);
        move(ulabel, [52, 51]);
        expect(document.querySelector(".ulabel-select-box")).toBeNull();

        move(ulabel, [80, 70]);
        const el = document.querySelector(".ulabel-select-box");
        expect(el).not.toBeNull();
        expect([el.style.left, el.style.top, el.style.width, el.style.height]).toEqual(["50px", "50px", "30px", "20px"]);

        ulabel.end_drag(at([80, 70]));
        expect(document.querySelector(".ulabel-select-box")).toBeNull();
    });

    test("notifies on_selection_change once, on mouse-up", () => {
        const on_selection_change = jest.fn();
        const a = make_annotation();
        const ulabel = make_ulabel([a], { ...mock_config, on_selection_change });

        begin(ulabel, [50, 50]);
        move(ulabel, [5, 5]);
        flush_frames();
        expect(on_selection_change).not.toHaveBeenCalled();

        ulabel.end_drag(at([5, 5]));
        expect(on_selection_change).toHaveBeenCalledTimes(1);
        expect(on_selection_change).toHaveBeenCalledWith("st", [a.id]);
    });

    test("cancel restores the starting selection without notifying", () => {
        const on_selection_change = jest.fn();
        const a = make_annotation();
        const ulabel = make_ulabel([a], { ...mock_config, on_selection_change });

        begin(ulabel, [50, 50]);
        move(ulabel, [5, 5]);
        flush_frames();
        expect(ulabel.get_selected_annotation_ids()).toEqual([a.id]);

        expect(ulabel.cancel_select_box()).toBe(true);
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
        expect(ulabel.drag_state.active_key).toBeNull();
        expect(document.querySelector(".ulabel-select-box")).toBeNull();
        expect(on_selection_change).not.toHaveBeenCalled();
        expect(ulabel.cancel_select_box()).toBe(false);
    });

    test("a starting selection pruned mid-drag stays pruned, and the host isn't told twice", () => {
        const on_selection_change = jest.fn();
        const a = make_annotation();
        const ulabel = make_ulabel([a], { ...mock_config, on_selection_change });
        ulabel.select_annotations([a.id]);

        begin(ulabel, [50, 50]);
        move(ulabel, [60, 60]);
        flush_frames();
        // e.g. isolating another annotation: `a` is no longer selectable
        a.deprecated = true;
        ulabel.refresh_selection();
        a.deprecated = false;
        expect(on_selection_change).toHaveBeenLastCalledWith("st", []);
        on_selection_change.mockClear();

        move(ulabel, [70, 70]);
        flush_frames();
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);

        expect(ulabel.cancel_select_box()).toBe(true);
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
        expect(on_selection_change).not.toHaveBeenCalled();
    });

    test("a mid-drag notification is followed by one on release even if the result matches the start", () => {
        const on_selection_change = jest.fn();
        const a = make_annotation();
        const b = make_annotation({ spatial_payload: [[12, 12], [20, 20]], containing_box: { tlx: 12, tly: 12, brx: 20, bry: 20 } });
        const ulabel = make_ulabel([a, b], { ...mock_config, on_selection_change });

        begin(ulabel, [50, 50]);
        move(ulabel, [5, 5]);
        flush_frames();
        expect(ulabel.get_selected_annotation_ids()).toEqual([a.id, b.id]);
        // A refresh prunes `b` from the preview: the host hears of `[a]`
        b.deprecated = true;
        ulabel.refresh_selection();
        b.deprecated = false;
        expect(on_selection_change).toHaveBeenLastCalledWith("st", [a.id]);
        on_selection_change.mockClear();

        // The box leaves both, ending where it started
        move(ulabel, [40, 40]);
        ulabel.end_drag(at([40, 40]));
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
        expect(on_selection_change).toHaveBeenCalledTimes(1);
        expect(on_selection_change).toHaveBeenCalledWith("st", []);
    });
});

describe("ctrl+shift deselect box", () => {
    function shift_at(point) {
        return { ...at(point), shiftKey: true };
    }

    test("removes what the box touches and keeps the rest, live and on release", () => {
        const on_selection_change = jest.fn();
        const a = make_annotation();
        const far = make_annotation({ spatial_payload: [[60, 60], [80, 80]], containing_box: { tlx: 60, tly: 60, brx: 80, bry: 80 } });
        const ulabel = make_ulabel([a, far], { ...mock_config, on_selection_change });
        ulabel.select_annotations([a.id, far.id]);
        on_selection_change.mockClear();

        ulabel.start_drag("select_box", 0, shift_at([0, 0]));
        // Shift released mid-drag: the mode was fixed at mousedown
        move(ulabel, [10, 10]);
        flush_frames();
        expect(ulabel.get_selected_annotation_ids()).toEqual([far.id]);
        expect(document.querySelector(".ulabel-select-box-remove")).not.toBeNull();
        expect(on_selection_change).not.toHaveBeenCalled();

        ulabel.end_drag(at([10, 10]));
        expect(ulabel.get_selected_annotation_ids()).toEqual([far.id]);
        expect(on_selection_change).toHaveBeenCalledTimes(1);
    });

    test("a ctrl+shift click only deselects", () => {
        const a = make_annotation();
        const ulabel = make_ulabel([a]);
        ulabel.subtasks.st.state.edit_candidate = { annid: a.id };

        ulabel.start_drag("select_box", 0, shift_at([5, 5]));
        ulabel.end_drag(shift_at([5, 5]));
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);

        ulabel.select_annotations([a.id]);
        ulabel.start_drag("select_box", 0, shift_at([5, 5]));
        ulabel.end_drag(shift_at([5, 5]));
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
    });

    test.each(["release", "cancel"])("a base id pruned while already deselected is still reported on %s", (how) => {
        const on_selection_change = jest.fn();
        const a = make_annotation();
        const ulabel = make_ulabel([a], { ...mock_config, on_selection_change });
        ulabel.select_annotations([a.id]);
        on_selection_change.mockClear();

        ulabel.start_drag("select_box", 0, shift_at([0, 0]));
        move(ulabel, [10, 10]);
        flush_frames();
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
        // Pruning finds nothing selected, so the host isn't told; the host still thinks `[a]`
        a.deprecated = true;
        ulabel.refresh_selection();
        a.deprecated = false;
        expect(on_selection_change).not.toHaveBeenCalled();

        if (how === "release") {
            ulabel.end_drag(at([10, 10]));
        } else {
            ulabel.cancel_select_box();
        }
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
        expect(on_selection_change).toHaveBeenCalledTimes(1);
        expect(on_selection_change).toHaveBeenCalledWith("st", []);
    });
});

describe("box notifications across instances", () => {
    test("another instance's selection change doesn't make an unchanged box notify", () => {
        const first_change = jest.fn();
        const first = make_ulabel([make_annotation()], { ...mock_config, on_selection_change: first_change });
        const other = make_annotation();
        const second = make_ulabel([other], { ...mock_config, on_selection_change: jest.fn() });

        begin(first, [50, 50]);
        move(first, [60, 60]);
        flush_frames();
        second.select_annotations([other.id]);
        expect(first.cancel_select_box()).toBe(true);

        expect(first_change).not.toHaveBeenCalled();
    });
});
