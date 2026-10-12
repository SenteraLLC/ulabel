// Deprecated focus: with `focus_deprecated`, only deprecated annotations are in focus; Restore undeletes
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

function ann(ulabel, id) {
    return ulabel.subtasks.gt.annotations.access[id];
}

function defocused(ulabel, id) {
    return ulabel.is_annotation_defocused(ann(ulabel, id), "gt");
}

function reclassify(ulabel, id) {
    ulabel.subtasks.gt.state.id_payload = [{ class_id: 1, confidence: 0.0 }, { class_id: 2, confidence: 1.0 }];
    ulabel.assign_annotation_id(id);
}

describe("deprecated focus", () => {
    test("is off by default and read from the subtask config", () => {
        expect(make_ulabel().subtasks.gt.focus_deprecated).toBe(false);
        expect(make_ulabel([], {}, { focus_deprecated: true }).subtasks.gt.focus_deprecated).toBe(true);
    });

    test("swaps which of live and deprecated annotations are in focus", () => {
        const ulabel = make_ulabel([make_annotation("live"), make_annotation("gone", { deprecated: true })]);
        expect(defocused(ulabel, "live")).toBe(false);
        expect(defocused(ulabel, "gone")).toBe(true);

        ulabel.set_focus_deprecated("gt", true, false);

        expect(defocused(ulabel, "live")).toBe(true);
        expect(defocused(ulabel, "gone")).toBe(false);
    });

    test("with edit focus, keeps only deletions of loaded annotations", () => {
        const ulabel = make_ulabel(
            [
                make_annotation("deleted"),
                make_annotation("filtered", { deprecated: true, deprecated_by: { confidence_filter: true } }),
            ],
            {},
            { focus_deprecated: true, focus_edited: true },
        );
        ulabel.create_annotation("bbox", [[0, 0], [10, 10]], "fleeting");
        ulabel.delete_annotation("deleted");
        ulabel.delete_annotation("fleeting");

        expect(defocused(ulabel, "deleted")).toBe(false);
        expect(defocused(ulabel, "filtered")).toBe(true);
        expect(defocused(ulabel, "fleeting")).toBe(true);
    });

    test("set_focus_deprecated reports only changes and releases a deprecated isolation when turned off", () => {
        const on_focus_deprecated_change = jest.fn();
        const ulabel = make_ulabel(
            [make_annotation("gone", { deprecated: true })],
            { on_focus_deprecated_change },
        );
        expect(ulabel.isolate_annotation("gone")).toBe(false);

        ulabel.set_focus_deprecated("gt", true);
        ulabel.set_focus_deprecated("gt", true);
        expect(on_focus_deprecated_change).toHaveBeenCalledTimes(1);
        expect(on_focus_deprecated_change).toHaveBeenCalledWith("gt", true);
        expect(ulabel.isolate_annotation("gone")).toBe(true);

        ulabel.set_focus_deprecated("gt", false);
        expect(ulabel.get_isolated_annotation_id("gt")).toBeNull();
        expect(on_focus_deprecated_change).toHaveBeenLastCalledWith("gt", false);
    });

    test("navigation skips deprecated annotations outside deprecated focus", () => {
        const ulabel = make_ulabel([make_annotation("gone", { deprecated: true })]);
        expect(ulabel.fly_to_annotation_id("gone", "gt")).toBe(false);
    });

    test("locks user edits like read-only while Restore stays available", () => {
        const ulabel = make_ulabel([make_annotation("gone", { deprecated: true, deprecated_by: { human: true } })]);
        const canvas_click = { button: 0, target: { id: ulabel.subtasks.gt.canvas_fid } };
        expect(ulabel.is_subtask_edit_locked()).toBe(false);
        expect(ULabel.get_drag_key_start(canvas_click, ulabel)).toBe("annotation");

        ulabel.set_focus_deprecated("gt", true, false);

        expect(ulabel.is_subtask_edit_locked()).toBe(true);
        expect(ULabel.get_drag_key_start(canvas_click, ulabel)).toBeNull();
        expect(ulabel.can_restore_annotation("gone")).toBe(true);
    });

    test("turning deprecated focus on discards the drawing in progress", () => {
        const ulabel = make_ulabel([], {}, { allowed_modes: ["bbox", "polyline"] });
        const subtask = ulabel.subtasks.gt;
        ulabel.create_annotation("polyline", [[10, 10], [30, 30]], "draw");
        subtask.state.active_id = "draw";
        subtask.state.is_in_progress = true;

        ulabel.set_focus_deprecated("gt", true, false);

        expect(subtask.state.is_in_progress).toBe(false);
        expect(subtask.annotations.access.draw).toBeUndefined();
    });

    test("the polygon brush ignores live polygons dimmed by deprecated focus", () => {
        const square = [[[10, 10], [30, 10], [30, 30], [10, 30], [10, 10]]];
        const ulabel = make_ulabel(
            [make_annotation("g1", { spatial_type: "polygon", spatial_payload: square })],
            {},
            { allowed_modes: ["bbox", "polygon"], focus_deprecated: true },
        );
        for (const name of ["move_brush_circle", "update_id_toolbox_display", "recolor_brush_circle"]) {
            ulabel[name] = jest.fn();
        }
        ulabel.get_global_mouse_x = () => 20;
        ulabel.get_global_mouse_y = () => 20;
        ulabel.get_brush_circle_spatial_payload = () => [[[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]]];
        ulabel.subtasks.gt.state.is_in_erase_mode = true;

        ulabel.begin_brush({});

        expect(ann(ulabel, "g1").spatial_payload).toEqual(square);
        expect(ulabel.subtasks.gt.actions.stream).toEqual([]);
        expect(ulabel.subtasks.gt.state.active_id).toBeNull();
    });

    test("the bitmask brush ignores live masks dimmed by deprecated focus", () => {
        // Column 0, rows 0-49 of a 100x100 column-major RLE
        const mask = { counts: [0, 50, 100 * 100 - 50], size: [100, 100] };
        const ulabel = make_ulabel(
            [make_annotation("m1", { spatial_type: "bitmask", spatial_payload: mask })],
            {},
            { allowed_modes: ["bbox", "bitmask"] },
        );
        expect(ulabel.find_bitmask_under_brush(0, 10, 5)).toBe("m1");

        ulabel.set_focus_deprecated("gt", true, false);

        expect(ulabel.find_bitmask_under_brush(0, 10, 5)).toBeNull();
        expect(ulabel.find_bitmask_under_brush(0, 10, 5, 1)).toBeNull();
    });
});

describe("restore", () => {
    test("is offered only for human-only deletions on writable subtasks", () => {
        const ulabel = make_ulabel([
            make_annotation("live"),
            make_annotation("human", { deprecated: true, deprecated_by: { human: true } }),
            make_annotation("both", { deprecated: true, deprecated_by: { human: true, confidence_filter: true } }),
            make_annotation("filter", { deprecated: true, deprecated_by: { distance_from_row: true } }),
        ]);
        expect(ulabel.can_restore_annotation("live")).toBe(false);
        expect(ulabel.can_restore_annotation("human")).toBe(true);
        expect(ulabel.can_restore_annotation("both")).toBe(false);
        expect(ulabel.can_restore_annotation("filter")).toBe(false);

        ulabel.subtasks.gt.read_only = true;
        expect(ulabel.can_restore_annotation("human")).toBe(false);
        expect(ulabel.restore_annotation("human")).toBe(false);
        expect(ann(ulabel, "human").deprecated).toBe(true);
    });

    test("reverts the edit stamp to before the deletion; undo and redo follow", () => {
        const ulabel = make_ulabel([make_annotation("g1")]);
        ulabel.delete_annotation("g1");
        const deleted_at = ann(ulabel, "g1").last_edited_at;
        expect(deleted_at).not.toBe(LOADED_AT);

        expect(ulabel.restore_annotation("g1")).toBe(true);
        expect(ann(ulabel, "g1").deprecated).toBe(false);
        expect(ann(ulabel, "g1").last_edited_at).toBe(LOADED_AT);
        expect(ann(ulabel, "g1").last_edited_by).toBe("host");

        ulabel.undo();
        expect(ann(ulabel, "g1").deprecated).toBe(true);
        expect(ann(ulabel, "g1").last_edited_at).toBe(deleted_at);

        ulabel.redo();
        expect(ann(ulabel, "g1").deprecated).toBe(false);
        expect(ann(ulabel, "g1").last_edited_at).toBe(LOADED_AT);
    });

    test("keeps an edit made before the deletion", () => {
        const ulabel = make_ulabel([make_annotation("g1")], {}, { focus_edited: true });
        reclassify(ulabel, "g1");
        const edited_at = ann(ulabel, "g1").last_edited_at;
        ulabel.delete_annotation("g1");

        ulabel.restore_annotation("g1");

        expect(ann(ulabel, "g1").last_edited_at).toBe(edited_at);
        expect(defocused(ulabel, "g1")).toBe(false);
    });

    test("an unedited restore leaves the annotation out of edit focus", () => {
        const ulabel = make_ulabel([make_annotation("g1")], {}, { focus_edited: true });
        ulabel.delete_annotation("g1");

        ulabel.restore_annotation("g1");

        expect(defocused(ulabel, "g1")).toBe(true);
    });

    test("stamps now when no recorded action deleted it", () => {
        const ulabel = make_ulabel([make_annotation("g1", { deprecated: true, deprecated_by: { human: true } })]);

        ulabel.restore_annotation("g1");

        expect(ann(ulabel, "g1").deprecated).toBe(false);
        expect(ann(ulabel, "g1").last_edited_at).not.toBe(LOADED_AT);
        expect(ann(ulabel, "g1").last_edited_by).toBe("test_user");
    });

    test("is not offered for geometry that cannot stand alone", () => {
        const deleted = { deprecated: true, deprecated_by: { human: true } };
        const ulabel = make_ulabel([
            make_annotation("empty", { ...deleted, spatial_type: "polygon", spatial_payload: [] }),
            make_annotation("dot", { ...deleted, spatial_type: "polyline", spatial_payload: [[10, 10]] }),
            make_annotation("line", { ...deleted, spatial_type: "polyline", spatial_payload: [[10, 10], [30, 30]] }),
            make_annotation("eraser", { ...deleted, spatial_type: "delete_bbox" }),
        ], {}, { allowed_modes: ["bbox", "polygon", "polyline", "delete_bbox"] });

        expect(ulabel.can_restore_annotation("empty")).toBe(false);
        expect(ulabel.can_restore_annotation("dot")).toBe(false);
        expect(ulabel.can_restore_annotation("line")).toBe(true);
        expect(ulabel.can_restore_annotation("eraser")).toBe(false);
    });

    test("a vertex delete that removes the annotation restores its original shape, unedited", () => {
        const ulabel = make_ulabel(
            [make_annotation("p1", { spatial_type: "polyline", spatial_payload: [[10, 10], [30, 30]] })],
            {},
            { allowed_modes: ["bbox", "polyline"] },
        );
        ulabel.delete_vertex("p1", "0");
        expect(ann(ulabel, "p1").deprecated).toBe(true);
        expect(ann(ulabel, "p1").spatial_payload).toEqual([[10, 10], [30, 30]]);

        expect(ulabel.restore_annotation("p1")).toBe(true);
        expect(ann(ulabel, "p1").spatial_payload).toEqual([[10, 10], [30, 30]]);
        expect(ann(ulabel, "p1").last_edited_at).toBe(LOADED_AT);
        expect(ulabel.has_edits()).toBe(false);

        ulabel.undo();
        ulabel.undo();
        expect(ann(ulabel, "p1").deprecated).toBe(false);
        ulabel.redo();
        expect(ann(ulabel, "p1").deprecated).toBe(true);
    });

    test("a brush stroke that erases a polygon is one undo step and keeps the pre-stroke shape", () => {
        const square = [[[10, 10], [30, 10], [30, 30], [10, 30], [10, 10]]];
        const ulabel = make_ulabel(
            [make_annotation("g1", { spatial_type: "polygon", spatial_payload: square })],
            {},
            { allowed_modes: ["bbox", "polygon"] },
        );
        for (const name of ["move_brush_circle", "update_id_toolbox_display", "recolor_brush_circle"]) {
            ulabel[name] = jest.fn();
        }
        ulabel.get_global_mouse_x = () => 20;
        ulabel.get_global_mouse_y = () => 20;
        // Start the stroke across an edge, then sweep over the whole polygon
        ulabel.get_brush_circle_spatial_payload = () => [[[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]]];
        ulabel.subtasks.gt.state.is_in_erase_mode = true;
        ulabel.begin_brush({});
        expect(ann(ulabel, "g1").spatial_payload).not.toEqual(square);
        ulabel.get_brush_circle_spatial_payload = () => [[[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]]];
        ulabel.state.last_brush_stroke = null;
        ulabel.continue_brush({});

        expect(ulabel.subtasks.gt.actions.stream.map((action) => action.act_type)).toEqual(["delete_annotation"]);
        expect(ann(ulabel, "g1").deprecated).toBe(true);
        expect(ann(ulabel, "g1").spatial_payload).toEqual(square);
        expect(ulabel.can_restore_annotation("g1")).toBe(true);

        ulabel.undo();
        expect(ann(ulabel, "g1").deprecated).toBe(false);
        expect(ann(ulabel, "g1").spatial_payload).toEqual(square);
        expect(ann(ulabel, "g1").last_edited_at).toBe(LOADED_AT);
    });

    test("reports a restore_annotation change", () => {
        const on_annotation_change = jest.fn();
        const ulabel = make_ulabel([make_annotation("g1")], { on_annotation_change });
        ulabel.delete_annotation("g1");

        ulabel.restore_annotation("g1");

        expect(on_annotation_change).toHaveBeenLastCalledWith(expect.objectContaining({
            act_type: "restore_annotation",
            annotation_id: "g1",
            kind: "do",
        }));
    });
});

describe("cancel", () => {
    test("removes the drawing; undo brings it back in progress and redo removes it again", () => {
        const ulabel = make_ulabel([], {}, { allowed_modes: ["bbox", "polyline"] });
        const subtask = ulabel.subtasks.gt;
        ulabel.create_annotation("polyline", [[10, 10], [30, 30]], "draw");
        subtask.state.active_id = "draw";
        subtask.state.is_in_progress = true;

        ulabel.cancel_annotation();
        expect(subtask.annotations.access.draw).toBeUndefined();
        expect(subtask.annotations.ordering).not.toContain("draw");
        expect(subtask.state.is_in_progress).toBe(false);

        ulabel.undo();
        expect(ann(ulabel, "draw").deprecated).toBe(false);
        expect(subtask.annotations.ordering).toContain("draw");
        expect(subtask.state.active_id).toBe("draw");
        expect(subtask.state.is_in_progress).toBe(true);

        ulabel.redo();
        expect(subtask.annotations.access.draw).toBeUndefined();
        expect(subtask.annotations.ordering).not.toContain("draw");
    });
});
