// Brush state is per-subtask while the Brush toolbox buttons are global, so
// set_subtask must tear down the outgoing subtask's brush (state, buttons,
// circle) instead of leaving it lit for a subtask that is no longer current.
const { ULabel } = require("./testing-utils/build_loader");

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        first: {
            display_name: "A",
            classes: [{ name: "Crop", id: 1, color: "green" }],
            allowed_modes: ["bitmask"],
            resume_from: null,
        },
        second: {
            display_name: "B",
            classes: [{ name: "Weed", id: 2, color: "red" }],
            allowed_modes: ["bitmask"],
            resume_from: null,
        },
    },
};

// `set_subtask` reconciles toolbox DOM that unit tests don't build
function make_switchable_ulabel() {
    const ulabel = new ULabel(mock_config);
    ulabel.state.current_subtask = "first"; // normally set during init
    ulabel.toolbox = { redraw_update_items: jest.fn(), tabs: [] };
    ulabel.update_annotation_mode = jest.fn();
    ulabel.update_current_class = jest.fn();
    ulabel.toggle_delete_class_id_in_toolbox = jest.fn();
    ulabel.sync_annotation_modes_to_active_class = jest.fn();
    ulabel.readjust_subtask_opacities = jest.fn();
    ulabel.redraw_demo = jest.fn();
    ulabel.destroy_brush_circle = jest.fn();
    return ulabel;
}

describe("set_subtask brush teardown", () => {
    test("disables the outgoing subtask's brush and erase state", () => {
        const ulabel = make_switchable_ulabel();
        ulabel.subtasks.first.state.is_in_brush_mode = true;
        ulabel.subtasks.first.state.is_in_erase_mode = true;

        ulabel.set_subtask("second");

        expect(ulabel.subtasks.first.state.is_in_brush_mode).toBe(false);
        expect(ulabel.subtasks.first.state.is_in_erase_mode).toBe(false);
        expect(ulabel.destroy_brush_circle).toHaveBeenCalled();
    });

    test("leaves the brush circle alone when the outgoing brush was off", () => {
        const ulabel = make_switchable_ulabel();

        ulabel.set_subtask("second");

        expect(ulabel.destroy_brush_circle).not.toHaveBeenCalled();
    });
});
