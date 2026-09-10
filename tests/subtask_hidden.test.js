// A subtask is "hidden" when vanished or when its layer opacity slider is at
// 0; hidden implies non-interactive, matching vanish mode's existing gates.
const { ULabel } = require("./testing-utils/build_loader");
// Require `configuration` before the toolbox so the `ToolboxItem` base class
// initializes first (circular-import note in class_counter.test.js).
require("../build/configuration");
const { AnnotationResizeItem } = require("../build/toolbox");

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        st: {
            display_name: "A",
            classes: [{ name: "Crop", id: 1, color: "green" }],
            allowed_modes: ["bbox"],
            resume_from: null,
        },
    },
};

function make_ulabel() {
    const ulabel = new ULabel(mock_config);
    ulabel.state.current_subtask = "st"; // normally set during init
    return ulabel;
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("is_subtask_hidden", () => {
    test("false by default (no slider in the DOM, not vanished)", () => {
        const ulabel = make_ulabel();

        expect(ulabel.is_subtask_hidden("st")).toBe(false);
    });

    test("true when the subtask is vanished", () => {
        const ulabel = make_ulabel();
        ulabel.subtasks.st.state.is_vanished = true;

        expect(ulabel.is_subtask_hidden("st")).toBe(true);
    });

    test("tracks the opacity slider: hidden at 0, visible above it", () => {
        const ulabel = make_ulabel();
        document.body.innerHTML = "<input id=\"tb-st-range--st\" type=\"range\" value=\"0\" />";

        expect(ulabel.is_subtask_hidden("st")).toBe(true);

        $("#tb-st-range--st").val(40);
        expect(ulabel.is_subtask_hidden("st")).toBe(false);
    });

    test("defaults to the current subtask and is false for unknown keys", () => {
        const ulabel = make_ulabel();
        ulabel.subtasks.st.state.is_vanished = true;

        expect(ulabel.is_subtask_hidden()).toBe(true);
        expect(ulabel.is_subtask_hidden("nope")).toBe(false);
    });
});

describe("hidden-subtask interaction gates", () => {
    test("create_annotation is a no-op when the opacity slider is at 0", () => {
        const ulabel = make_ulabel();
        ulabel.subtasks.st.annotations = { access: {}, ordering: [] };
        document.body.innerHTML = "<input id=\"tb-st-range--st\" type=\"range\" value=\"0\" />";

        ulabel.create_annotation("bbox", [[0, 0], [10, 10]]);

        expect(ulabel.subtasks.st.annotations.ordering).toHaveLength(0);
    });

    test("suggest_edits hides the dialogs instead of suggesting when hidden", () => {
        const ulabel = make_ulabel();
        ulabel.subtasks.st.state.is_vanished = true;
        ulabel.hide_edits = jest.fn();
        ulabel.show_global_edit_suggestion = jest.fn();

        ulabel.suggest_edits();

        expect(ulabel.hide_edits).toHaveBeenCalled();
        expect(ulabel.show_global_edit_suggestion).not.toHaveBeenCalled();
    });

    test("mousedown starts no drag when hidden, except pan/zoom", () => {
        const ulabel = make_ulabel();
        document.body.innerHTML = "<input id=\"tb-st-range--st\" type=\"range\" value=\"0\" />";
        // An active annotation makes button 0 an "annotation" drag and button 1 a pan
        ulabel.subtasks.st.state.active_id = "anno_x";
        ulabel.start_drag = jest.fn();

        ulabel.handle_mouse_down({ button: 0, preventDefault: jest.fn(), target: {} });
        expect(ulabel.start_drag).not.toHaveBeenCalled();

        ulabel.handle_mouse_down({ button: 1, preventDefault: jest.fn(), target: {} });
        expect(ulabel.start_drag).toHaveBeenCalledWith("pan", 1, expect.anything());
    });

    test("annotation resize is a no-op when hidden", () => {
        const ulabel = make_ulabel();
        ulabel.redraw_all_annotations = jest.fn();
        ulabel.subtasks.st.state.line_size = 4;
        ulabel.subtasks.st.state.is_vanished = true;

        AnnotationResizeItem.update_annotation_size(ulabel, "st", 10);

        expect(ulabel.subtasks.st.state.line_size).toBe(4);
        expect(ulabel.redraw_all_annotations).not.toHaveBeenCalled();

        ulabel.subtasks.st.state.is_vanished = false;
        AnnotationResizeItem.update_annotation_size(ulabel, "st", 10);

        expect(ulabel.subtasks.st.state.line_size).toBe(10);
        expect(ulabel.redraw_all_annotations).toHaveBeenCalled();
    });
});
