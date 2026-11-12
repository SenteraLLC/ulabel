// Unit tests for multi-selection: the target of bulk actions. View-only
// state, so nothing is recorded, and only live, in-focus, 2D spatial
// annotations can be selected.
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
        canvas_id: "c0",
        ...overrides,
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
            allowed_modes: ["bbox", "whole-image"],
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
    ulabel.redraw_annotation = jest.fn();
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    return ulabel;
}

afterEach(() => {
    document.getElementById("annotation-selection-indicator")?.remove();
});

describe("select_annotations", () => {
    test("starts empty", () => {
        const ulabel = make_ulabel();

        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
    });

    test("replace, add, remove and toggle", () => {
        const ulabel = make_ulabel();
        const [a, b, c] = [make_annotation(), make_annotation(), make_annotation()];
        load(ulabel, [a, b, c]);

        expect(ulabel.select_annotations([a.id])).toEqual([a.id]);
        expect(ulabel.select_annotations([b.id], "add")).toEqual([a.id, b.id]);
        expect(ulabel.select_annotations([a.id], "remove")).toEqual([b.id]);
        expect(ulabel.select_annotations([b.id, c.id], "toggle")).toEqual([c.id]);
        expect(ulabel.select_annotations([a.id], "replace")).toEqual([a.id]);
    });

    test("returns ids in annotation order, not selection order", () => {
        const ulabel = make_ulabel();
        const [a, b, c] = [make_annotation(), make_annotation(), make_annotation()];
        load(ulabel, [a, b, c]);

        ulabel.select_annotations([c.id, a.id, b.id]);

        expect(ulabel.get_selected_annotation_ids()).toEqual([a.id, b.id, c.id]);
    });

    test("ignores unknown, deprecated, non-spatial, in-progress and dimmed annotations", () => {
        const ulabel = make_ulabel();
        const live = make_annotation();
        const gone = make_annotation({ deprecated: true });
        const whole = make_annotation({ spatial_type: "whole-image" });
        const drawing = make_annotation();
        load(ulabel, [live, gone, whole, drawing]);
        ulabel.subtasks.st.state.active_id = drawing.id;

        ulabel.select_annotations(["nope", gone.id, whole.id, drawing.id, live.id]);
        expect(ulabel.get_selected_annotation_ids()).toEqual([live.id]);

        // Isolating another annotation dims this one
        ulabel.isolate_annotation(drawing.id);
        expect(ulabel.select_annotations([live.id])).toEqual([]);
    });

    test("warns and does nothing for an unknown subtask", () => {
        const ulabel = make_ulabel();

        expect(ulabel.select_annotations(["x"], "replace", "no_such_subtask")).toEqual([]);
    });

    test("select_all_annotations selects every selectable annotation", () => {
        const ulabel = make_ulabel();
        const [a, b] = [make_annotation(), make_annotation()];
        const gone = make_annotation({ deprecated: true });
        load(ulabel, [a, gone, b]);

        expect(ulabel.select_all_annotations()).toEqual([a.id, b.id]);
    });

    test("clear_selection empties it", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a]);
        ulabel.select_annotations([a.id]);

        ulabel.clear_selection();

        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
    });

    test("is view-only: no action recorded, edited flag untouched", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a]);
        const edited_before = ulabel.edited;

        ulabel.select_annotations([a.id]);
        ulabel.clear_selection();

        expect(ulabel.subtasks.st.actions.stream).toEqual([]);
        expect(ulabel.edited).toBe(edited_before);
    });
});

describe("side effects", () => {
    test("on_selection_change fires with the ids, only on an actual change", () => {
        const on_selection_change = jest.fn();
        const ulabel = make_ulabel({ ...mock_config, on_selection_change });
        const [a, b] = [make_annotation(), make_annotation()];
        load(ulabel, [a, b]);

        ulabel.select_annotations([b.id, a.id]);
        ulabel.select_annotations([a.id], "add");
        ulabel.clear_selection();
        ulabel.clear_selection();

        expect(on_selection_change.mock.calls).toEqual([
            ["st", [a.id, b.id]],
            ["st", []],
        ]);
    });

    test("redraws each affected canvas once", () => {
        const ulabel = make_ulabel();
        const a = make_annotation({ canvas_id: "c0" });
        const b = make_annotation({ canvas_id: "c0" });
        const c = make_annotation({ canvas_id: "c1" });
        load(ulabel, [a, b, c]);

        ulabel.select_annotations([a.id, b.id, c.id]);

        expect(ulabel.redraw_annotation).toHaveBeenCalledTimes(2);
        expect(ulabel.redraw_annotation).toHaveBeenCalledWith(a.id, "st");
        expect(ulabel.redraw_annotation).toHaveBeenCalledWith(c.id, "st");
    });

    test("selected annotations get the hover highlight", () => {
        const ulabel = make_ulabel();
        const [a, b] = [make_annotation(), make_annotation()];
        load(ulabel, [a, b]);

        ulabel.select_annotations([a.id]);

        expect(ulabel.is_annotation_highlighted(a)).toBe(true);
        expect(ulabel.is_annotation_highlighted(b)).toBe(false);
    });

    test("the indicator shows the selected count, and goes away when empty", () => {
        const ulabel = make_ulabel();
        const [a, b, c] = [make_annotation(), make_annotation(), make_annotation()];
        load(ulabel, [a, b, c]);

        ulabel.select_annotations([a.id, b.id]);
        const indicator = document.getElementById("annotation-selection-indicator");
        expect(indicator.textContent).toBe("2 selected");
        expect(document.body.classList.contains("ulabel-selection-active")).toBe(true);

        ulabel.clear_selection();
        expect(document.getElementById("annotation-selection-indicator")).toBeNull();
        expect(document.body.classList.contains("ulabel-selection-active")).toBe(false);
    });

    test("annotation list rows get the selected class in place", () => {
        const ulabel = make_ulabel();
        const [a, b] = [make_annotation(), make_annotation()];
        load(ulabel, [a, b]);
        const rows = [a, b].map((annotation) => {
            const row = document.createElement("div");
            row.className = "annotation-list-item";
            row.dataset.annotationId = annotation.id;
            document.body.appendChild(row);
            return row;
        });

        ulabel.select_annotations([a.id]);
        expect(rows.map((row) => row.classList.contains("selected"))).toEqual([true, false]);
        ulabel.select_annotations([b.id], "toggle");
        expect(rows.map((row) => row.classList.contains("selected"))).toEqual([true, true]);
        ulabel.clear_selection();
        expect(rows.map((row) => row.classList.contains("selected"))).toEqual([false, false]);

        rows.forEach((row) => row.remove());
    });
});

describe("pruning", () => {
    test("deleting a selected annotation drops it", () => {
        const on_selection_change = jest.fn();
        const ulabel = make_ulabel({ ...mock_config, on_selection_change });
        const [a, b] = [make_annotation(), make_annotation()];
        load(ulabel, [a, b]);
        ulabel.suggest_edits = jest.fn();
        ulabel.destroy_polygon_ender = jest.fn();
        ulabel.select_annotations([a.id, b.id]);

        ulabel.delete_annotation(a.id);

        expect(ulabel.subtasks.st.state.selected_ids.has(a.id)).toBe(false);
        expect(on_selection_change).toHaveBeenLastCalledWith("st", [b.id]);
    });

    test("an annotation that becomes dimmed drops out and is not highlighted", () => {
        const ulabel = make_ulabel();
        const [a, b] = [make_annotation(), make_annotation()];
        load(ulabel, [a, b]);
        ulabel.select_annotations([a.id, b.id]);

        ulabel.isolate_annotation(b.id);

        expect(ulabel.is_annotation_highlighted(a)).toBe(false);
        expect(ulabel.get_selected_annotation_ids()).toEqual([b.id]);
    });

    test("an annotation deprecated by a filter drops out on refresh", () => {
        const ulabel = make_ulabel();
        const [a, b] = [make_annotation(), make_annotation()];
        load(ulabel, [a, b]);
        ulabel.select_annotations([a.id, b.id]);

        a.deprecated = true;
        ulabel.refresh_selection("st");
        a.deprecated = false;

        // Filtering it back in doesn't silently reselect it
        expect(ulabel.get_selected_annotation_ids()).toEqual([b.id]);
        expect(document.getElementById("annotation-selection-indicator").textContent).toBe("1 selected");
    });

    test("a vanished layer can't be selected from", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a]);
        ulabel.subtasks.st.state.is_vanished = true;

        expect(ulabel.select_annotations([a.id])).toEqual([]);
        expect(ulabel.select_all_annotations()).toEqual([]);
    });

    test("setting a layer's opacity to 0 clears its selection", () => {
        const ulabel = make_ulabel();
        const [a, b] = [make_annotation(), make_annotation()];
        load(ulabel, [a, b]);
        ulabel.select_annotations([a.id, b.id]);

        ulabel.set_subtask_opacity("st", 0.5);
        expect(ulabel.get_selected_annotation_ids()).toEqual([a.id, b.id]);

        ulabel.set_subtask_opacity("st", 0);
        expect(ulabel.subtasks.st.state.selected_ids.size).toBe(0);
        expect(document.getElementById("annotation-selection-indicator")).toBeNull();
    });

    test("undo leaves restored annotations unselected", () => {
        const ulabel = make_ulabel();
        const [a, b] = [make_annotation(), make_annotation()];
        load(ulabel, [a, b]);
        ulabel.suggest_edits = jest.fn();
        ulabel.destroy_polygon_ender = jest.fn();
        ulabel.hide_id_dialog = jest.fn();
        ulabel.select_annotations([a.id, b.id]);
        ulabel.delete_annotation(a.id);

        ulabel.undo();

        expect(a.deprecated).toBe(false);
        expect(ulabel.get_selected_annotation_ids()).toEqual([b.id]);
    });
});

describe("Ctrl+click", () => {
    function ctrl_click(ulabel, annid, dx = 0) {
        ulabel.suggest_edits = jest.fn();
        ulabel.subtasks.st.state.edit_candidate = annid === null ? null : { annid };
        ulabel.drag_state.active_key = "pan";
        ulabel.drag_state.release_button = 0;
        ulabel.drag_state.pan.mouse_start = [100, 100, 0];
        ulabel.end_drag({ clientX: 100 + dx, clientY: 100, button: 0 });
    }

    test("toggles the hovered annotation", () => {
        const ulabel = make_ulabel();
        const [a, b] = [make_annotation(), make_annotation()];
        load(ulabel, [a, b]);

        ctrl_click(ulabel, a.id);
        ctrl_click(ulabel, b.id);
        expect(ulabel.get_selected_annotation_ids()).toEqual([a.id, b.id]);

        ctrl_click(ulabel, a.id);
        expect(ulabel.get_selected_annotation_ids()).toEqual([b.id]);
    });

    test("a real pan, or a click on nothing, changes nothing", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a]);

        ctrl_click(ulabel, a.id, 20);
        ctrl_click(ulabel, null);

        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
    });

    test("a middle-button pan never selects", () => {
        const ulabel = make_ulabel();
        const a = make_annotation();
        load(ulabel, [a]);
        ulabel.subtasks.st.state.edit_candidate = { annid: a.id };
        ulabel.drag_state.active_key = "pan";
        ulabel.drag_state.release_button = 1;
        ulabel.drag_state.pan.mouse_start = [100, 100, 0];

        ulabel.end_drag({ clientX: 100, clientY: 100, button: 1 });

        expect(ulabel.get_selected_annotation_ids()).toEqual([]);
    });
});
