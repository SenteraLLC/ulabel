// Host callbacks fire from the single writers (`set_active_class`,
// `set_subtask`), so every path — API call, toolbox click, keybind — notifies
// the host, and only when the value actually changes.
const { ULabel } = require("./testing-utils/build_loader");

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        first: {
            display_name: "A",
            classes: [
                { name: "Crop", id: 1, color: "green" },
                { name: "Weed", id: 2, color: "red" },
            ],
            allowed_modes: ["bbox", "delete_polygon"],
            resume_from: null,
        },
        second: {
            display_name: "B",
            classes: [{ name: "Sign", id: 3, color: "blue" }],
            allowed_modes: ["point"],
            resume_from: null,
        },
    },
};

describe("on_active_class_change", () => {
    test("fires with the subtask key and class id on a real change", () => {
        const on_active_class_change = jest.fn();
        const ulabel = new ULabel({ ...mock_config, on_active_class_change });

        ulabel.set_active_class(2, "first", false);

        expect(on_active_class_change).toHaveBeenCalledTimes(1);
        expect(on_active_class_change).toHaveBeenCalledWith("first", 2);
    });

    test("does not fire when the class is already selected", () => {
        const on_active_class_change = jest.fn();
        const ulabel = new ULabel({ ...mock_config, on_active_class_change });

        // Class 1 is the initial selection
        ulabel.set_active_class(1, "first", false);

        expect(on_active_class_change).not.toHaveBeenCalled();
    });

    test("does not fire on rejected ids or delete-mode toggles", () => {
        const on_active_class_change = jest.fn();
        const ulabel = new ULabel({ ...mock_config, on_active_class_change });

        ulabel.set_active_class(99, "first", false); // not in the subtask
        ulabel.set_active_class(-1, "first", false); // delete class freezes the selection

        expect(on_active_class_change).not.toHaveBeenCalled();
    });
});

describe("on_focus_active_class_change", () => {
    test("fires with the subtask key and new flag value on a real change", () => {
        const on_focus_active_class_change = jest.fn();
        const ulabel = new ULabel({ ...mock_config, on_focus_active_class_change });

        ulabel.set_focus_active_class("first", true, false);

        expect(on_focus_active_class_change).toHaveBeenCalledTimes(1);
        expect(on_focus_active_class_change).toHaveBeenCalledWith("first", true);
    });

    test("does not fire when the flag is already at the target value", () => {
        const on_focus_active_class_change = jest.fn();
        const ulabel = new ULabel({ ...mock_config, on_focus_active_class_change });

        ulabel.set_focus_active_class("first", false, false); // false is the default

        expect(on_focus_active_class_change).not.toHaveBeenCalled();
    });

    test("re-syncing another subtask from the callback converges", () => {
        const ulabel = new ULabel({
            ...mock_config,
            on_focus_active_class_change: (subtask_key, enabled) => {
                const other = subtask_key === "first" ? "second" : "first";
                ulabel.set_focus_active_class(other, enabled, false);
            },
        });

        ulabel.set_focus_active_class("first", true, false);

        expect(ulabel.subtasks.first.focus_active_class).toBe(true);
        expect(ulabel.subtasks.second.focus_active_class).toBe(true);
    });
});

describe("on_subtask_change", () => {
    // `set_subtask` reconciles toolbox DOM that unit tests don't build
    function make_switchable_ulabel(config) {
        const ulabel = new ULabel(config);
        ulabel.state.current_subtask = "first"; // normally set during init
        ulabel.toolbox = { redraw_update_items: jest.fn(), tabs: [] };
        ulabel.update_annotation_mode = jest.fn();
        ulabel.update_current_class = jest.fn();
        ulabel.toggle_delete_class_id_in_toolbox = jest.fn();
        ulabel.sync_annotation_modes_to_active_class = jest.fn();
        ulabel.readjust_subtask_opacities = jest.fn();
        ulabel.redraw_demo = jest.fn();
        return ulabel;
    }

    test("fires with the new and old subtask keys", () => {
        const on_subtask_change = jest.fn();
        const ulabel = make_switchable_ulabel({ ...mock_config, on_subtask_change });

        ulabel.set_subtask("second");

        expect(on_subtask_change).toHaveBeenCalledTimes(1);
        expect(on_subtask_change).toHaveBeenCalledWith("second", "first");
    });

    test("does not fire when the subtask is already current", () => {
        const on_subtask_change = jest.fn();
        const ulabel = make_switchable_ulabel({ ...mock_config, on_subtask_change });

        ulabel.set_subtask("first");

        expect(on_subtask_change).not.toHaveBeenCalled();
    });
});
