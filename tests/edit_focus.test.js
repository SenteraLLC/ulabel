// Edit focus: with `focus_edited`, annotations unchanged since load are defocused
const { ULabel } = require("./testing-utils/build_loader");

const LOADED_AT = "2026-01-01T00:00:00.000Z";

function make_annotation(id, overrides = {}) {
    return {
        id,
        spatial_type: "bbox",
        spatial_payload: [[10, 10], [30, 30]],
        containing_box: { tlx: 10, tly: 10, brx: 30, bry: 30 },
        classification_payloads: [{ class_id: 1, confidence: 1.0 }],
        deprecated: false,
        last_edited_at: LOADED_AT,
        last_edited_by: "host",
        ...overrides,
    };
}

function make_ulabel(resume = [], config_overrides = {}, subtask_overrides = {}) {
    const ulabel = new ULabel({
        container_id: "container",
        image_data: "test.jpg",
        username: "test_user",
        image_width: 100,
        image_height: 100,
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            gt: {
                display_name: "GT",
                classes: [
                    { name: "Crop", id: 1, color: "green" },
                    { name: "Weed", id: 2, color: "red" },
                ],
                allowed_modes: ["bbox"],
                resume_from: resume,
                ...subtask_overrides,
            },
        },
        ...config_overrides,
    });
    ulabel.state.current_subtask = "gt";
    for (const name of [
        "redraw_annotation",
        "redraw_all_annotations",
        "rebuild_containing_box",
        "update_filter_distance",
        "suggest_edits",
        "destroy_polygon_ender",
        "destroy_annotation_context",
        "hide_id_dialog",
        "update_frame",
        "recolor_active_polygon_ender",
        "recolor_brush_circle",
    ]) {
        ulabel[name] = jest.fn();
    }
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
    return ulabel;
}

function defocused(ulabel, id) {
    return ulabel.is_annotation_defocused(ulabel.subtasks.gt.annotations.access[id], "gt");
}

function reclassify(ulabel, id) {
    ulabel.subtasks.gt.state.id_payload = [{ class_id: 1, confidence: 0.0 }, { class_id: 2, confidence: 1.0 }];
    ulabel.assign_annotation_id(id);
}

describe("edit focus", () => {
    test("is off by default and read from the subtask config", () => {
        expect(make_ulabel().subtasks.gt.focus_edited).toBe(false);
        expect(make_ulabel([], {}, { focus_edited: true }).subtasks.gt.focus_edited).toBe(true);
    });

    test("defocuses only annotations unchanged since load", () => {
        const ulabel = make_ulabel([make_annotation("g1"), make_annotation("g2")], {}, { focus_edited: true });
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "new1");
        reclassify(ulabel, "g1");

        expect(defocused(ulabel, "new1")).toBe(false);
        expect(defocused(ulabel, "g1")).toBe(false);
        expect(defocused(ulabel, "g2")).toBe(true);
    });

    test("an undone edit drops back out of focus", () => {
        const ulabel = make_ulabel([make_annotation("g1")], {}, { focus_edited: true });
        reclassify(ulabel, "g1");
        expect(defocused(ulabel, "g1")).toBe(false);

        ulabel.undo();

        expect(defocused(ulabel, "g1")).toBe(true);
    });

    test("composes with class focus", () => {
        const ulabel = make_ulabel(
            [make_annotation("g1"), make_annotation("g2")],
            {},
            { focus_edited: true, focus_active_class: true },
        );
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "new1");
        reclassify(ulabel, "g1");

        // Selected class is still 1: g1 is edited but now class 2
        expect(defocused(ulabel, "new1")).toBe(false);
        expect(defocused(ulabel, "g1")).toBe(true);
        expect(defocused(ulabel, "g2")).toBe(true);
    });

    test("set_focus_edited toggles, drops hover, redraws, and reports only changes", () => {
        const on_focus_edited_change = jest.fn();
        const ulabel = make_ulabel([make_annotation("g1")], { on_focus_edited_change });
        ulabel.subtasks.gt.state.hovered_annid = "g1";
        expect(defocused(ulabel, "g1")).toBe(false);

        ulabel.set_focus_edited("gt", true);

        expect(defocused(ulabel, "g1")).toBe(true);
        expect(ulabel.subtasks.gt.state.hovered_annid).toBeNull();
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledWith("gt");
        expect(ulabel.toolbox.redraw_update_items).toHaveBeenCalled();
        expect(on_focus_edited_change).toHaveBeenCalledWith("gt", true);

        ulabel.set_focus_edited("gt", true, false);
        expect(on_focus_edited_change).toHaveBeenCalledTimes(1);
    });

    test("ignores an unknown subtask key", () => {
        const ulabel = make_ulabel();

        expect(() => ulabel.set_focus_edited("nope", true, false)).not.toThrow();
        expect(ulabel.subtasks.gt.focus_edited).toBe(false);
    });

    test("an annotation edited into focus is redrawn after it is stamped", () => {
        const ulabel = make_ulabel([make_annotation("g1")], {}, { focus_edited: true });
        const defocused_at_redraw = [];
        ulabel.redraw_annotation = jest.fn((id) => defocused_at_redraw.push(defocused(ulabel, id)));

        reclassify(ulabel, "g1");

        expect(defocused_at_redraw.at(-1)).toBe(false);
    });

    test("navigation skips unchanged annotations", () => {
        const ulabel = make_ulabel([make_annotation("g1")], {}, { focus_edited: true });

        expect(ulabel.fly_to_annotation_id("g1", "gt")).toBe(false);
    });
});
