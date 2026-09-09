// A subtask is "hidden" when vanished or when its layer opacity slider is at
// 0; hidden implies non-interactive, matching vanish mode's existing gates.
const { ULabel } = require("./testing-utils/build_loader");

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
});
