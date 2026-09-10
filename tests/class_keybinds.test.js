// Class keybinds are id-keyed everywhere (localStorage, init-time restore), so
// live edits and resets from the Keybinds toolbox item must write to every
// subtask holding the class id — not just the current one. Regression test for
// GT-edited keybinds staying null on the prediction subtask's shared classes.
const { ULabel } = require("./testing-utils/build_loader");
// Require `configuration` before the toolbox item so the `ToolboxItem` base
// class initializes first (circular-import note in class_counter.test.js).
require("../build/configuration");
const { KeybindsToolboxItem } = require("../build/toolbox_items/keybinds");

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        gt: {
            display_name: "GT",
            classes: [
                { name: "Crop", id: 1, color: "green", keybind: null },
                { name: "Weed", id: 2, color: "red", keybind: null },
            ],
            allowed_modes: ["bbox"],
            resume_from: null,
        },
        pred: {
            display_name: "Pred",
            classes: [
                { name: "Crop", id: 1, color: "green", keybind: null },
                { name: "Weed", id: 2, color: "red", keybind: null },
            ],
            allowed_modes: ["bbox"],
            resume_from: null,
            read_only: true,
        },
    },
};

function keybind_of(ulabel, subtask_key, class_id) {
    return ulabel.subtasks[subtask_key].class_defs.find((cd) => cd.id === class_id).keybind;
}

function make_item() {
    const ulabel = new ULabel(mock_config);
    ulabel.state.current_subtask = "gt"; // normally set during init
    // Normally captured during init, before customizations apply
    ulabel.state.original_class_keybinds = { 1: null, 2: null };
    const item = new KeybindsToolboxItem(ulabel);
    return { ulabel, item };
}

afterEach(() => {
    localStorage.removeItem("ulabel_custom_class_keybinds");
});

describe("class keybind edits span subtasks", () => {
    test("set_class_keybind_in_all_subtasks writes every subtask holding the id", () => {
        const { ulabel, item } = make_item();

        const changed = item.set_class_keybind_in_all_subtasks(1, "5");

        expect(changed).toBe(true);
        expect(keybind_of(ulabel, "gt", 1)).toBe("5");
        expect(keybind_of(ulabel, "pred", 1)).toBe("5");
        expect(keybind_of(ulabel, "gt", 2)).toBeNull();
    });

    test("returns false for an id no subtask declares", () => {
        const { item } = make_item();

        expect(item.set_class_keybind_in_all_subtasks(99, "5")).toBe(false);
    });

    test("reset restores the original default in every subtask", () => {
        const { ulabel, item } = make_item();
        item.set_class_keybind_in_all_subtasks(1, "5");

        item.reset_class_keybind_to_default(1);

        expect(keybind_of(ulabel, "gt", 1)).toBeNull();
        expect(keybind_of(ulabel, "pred", 1)).toBeNull();
    });
});
