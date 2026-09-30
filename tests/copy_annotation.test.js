// Unit tests for copying / cutting annotations between subtasks (CVML-261):
// eligibility, field carry-over, class resolution, undo/redo on the target
// stream, cut on the source stream, and the clipboard envelope.
const { ULabel } = require("./testing-utils/build_loader");

const classes = [
    { name: "Crop", id: 1, color: "green" },
    { name: "Weed", id: 2, color: "red" },
];
const other_class = { name: "Other", id: 3, color: "blue" };

function make_bbox(id, class_id = 1, extra = {}) {
    return {
        id,
        spatial_type: "bbox",
        spatial_payload: [[10, 10], [30, 30]],
        classification_payloads: [{ class_id, confidence: 1.0 }],
        deprecated: false,
        text_payload: "note",
        annotation_meta: { source: "model" },
        last_edited_at: "2026-01-01T00:00:00.000Z",
        last_edited_by: "host",
        created_at: "2026-01-01T00:00:00.000Z",
        created_by: "host",
        ...extra,
    };
}

// Column-major RLE: column 0, rows 0-9 set on a 100x100 image
const MASK_RLE = { counts: [0, 10, 100 * 100 - 10], size: [100, 100] };

function make_bitmask(id) {
    return make_bbox(id, 1, { spatial_type: "bitmask", spatial_payload: JSON.parse(JSON.stringify(MASK_RLE)) });
}

function make_config(resume) {
    return {
        container_id: "container",
        image_data: "test.jpg",
        username: "test_user",
        image_width: 100,
        image_height: 100,
        allow_annotations_outside_image: true,
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            gt: { display_name: "GT", classes, allowed_modes: ["bbox", "polygon", "bitmask", "whole-image"], resume_from: resume.gt ?? null },
            pred: { display_name: "Pred", classes, allowed_modes: ["bbox", "bitmask"], resume_from: resume.pred ?? null },
            // No Crop class here, so a Crop bbox has to change class
            weeds: { display_name: "Weeds", classes: [classes[1], other_class], allowed_modes: ["bbox"], resume_from: resume.weeds ?? null },
            // Per-class modes: only Weed may be a bbox
            mixed: {
                display_name: "Mixed",
                classes: [
                    { ...classes[0], allowed_modes: ["polygon"] },
                    { ...classes[1], allowed_modes: ["bbox"] },
                ],
                allowed_modes: ["polygon", "bbox"],
                resume_from: null,
            },
            ro: { display_name: "RO", classes, allowed_modes: ["bbox"], read_only: true, resume_from: resume.ro ?? null },
        },
    };
}

function make_ulabel(resume = {}, current = "gt") {
    const ulabel = new ULabel(make_config(resume));
    ulabel.state.current_subtask = current;
    for (const name of [
        "redraw_annotation",
        "redraw_all_annotations",
        "update_filter_distance",
        "suggest_edits",
        "destroy_polygon_ender",
        "destroy_annotation_context",
        "hide_id_dialog",
        "hide_context_menu",
        "show_id_dialog",
        "update_frame",
    ]) {
        ulabel[name] = jest.fn();
    }
    ulabel.set_subtask = jest.fn((key) => {
        ulabel.state.current_subtask = key;
    });
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
    return ulabel;
}

function only_annotation(ulabel, subtask_key) {
    const subtask = ulabel.subtasks[subtask_key];
    expect(subtask.annotations.ordering).toHaveLength(1);
    return subtask.annotations.access[subtask.annotations.ordering[0]];
}

function action_types(ulabel, subtask_key) {
    return ulabel.subtasks[subtask_key].actions.stream.map((action) => action.act_type);
}

describe("eligibility", () => {
    test("targets are the other writable subtasks with a class that allows the spatial type", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });
        const bbox = ulabel.subtasks.gt.annotations.access.g1;

        expect(ulabel.get_copy_target_subtask_keys(bbox)).toEqual(["pred", "weeds", "mixed"]);
        expect(ulabel.get_copy_target_subtask_keys(bbox, "pred")).toEqual(["gt", "weeds", "mixed"]);
    });

    test("a polygon is only offered where some class allows polygons", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("poly", 1, { spatial_type: "polygon", spatial_payload: [[[0, 0], [10, 0], [10, 10], [0, 0]]] })] });

        expect(ulabel.get_copy_target_subtask_keys(ulabel.subtasks.gt.annotations.access.poly)).toEqual(["mixed"]);
    });

    test("nonspatial and delete-shape annotations have no targets", () => {
        const ulabel = make_ulabel();

        expect(ulabel.get_copy_target_subtask_keys({ spatial_type: "whole-image", spatial_payload: null })).toEqual([]);
        expect(ulabel.get_copy_target_subtask_keys({ spatial_type: "delete_bbox", spatial_payload: [[0, 0], [1, 1]] })).toEqual([]);
    });

    test("a read-only subtask is never a target", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });

        expect(ulabel.can_paste_into_subtask(ulabel.subtasks.gt.annotations.access.g1, "ro")).toBe(false);
    });
});

describe("copy_annotation", () => {
    test("copies geometry and metadata with a fresh id, stamps and deprecation state", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1", 2, { edit_type: "modified" })] });

        const new_id = ulabel.copy_annotation("g1", "pred");

        const copy = only_annotation(ulabel, "pred");
        const source = ulabel.subtasks.gt.annotations.access.g1;
        expect(new_id).toBe(copy.id);
        expect(new_id).not.toBe("g1");
        expect(copy.spatial_payload).toEqual(source.spatial_payload);
        expect(copy.spatial_payload).not.toBe(source.spatial_payload);
        expect(copy.classification_payloads).toEqual([
            { class_id: 1, confidence: 0.0 },
            { class_id: 2, confidence: 1.0 },
        ]);
        expect(copy.text_payload).toBe("note");
        expect(copy.annotation_meta).toEqual({ source: "model" });
        expect(copy.deprecated).toBe(false);
        expect(copy.deprecated_by).toEqual({ human: false });
        expect(copy.created_by).toBe("test_user");
        expect(copy.last_edited_by).toBe("test_user");
        expect(copy.created_at).not.toBe(source.created_at);
        expect(copy.edit_type).toBeUndefined();
        expect(copy.canvas_id).toBe("c0");
        ulabel.rebuild_containing_box("g1", false, "gt");
        expect(copy.containing_box).toEqual(source.containing_box);
        // Source is untouched
        expect(source.deprecated).toBe(false);
        expect(source.last_edited_at).toBe("2026-01-01T00:00:00.000Z");
    });

    test("records paste_annotation on the target stream only", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });

        ulabel.copy_annotation("g1", "pred");

        expect(action_types(ulabel, "gt")).toEqual([]);
        expect(action_types(ulabel, "pred")).toEqual(["paste_annotation"]);
        expect(ulabel.redraw_annotation).toHaveBeenCalledWith(expect.any(String), "pred");
        expect(ulabel.toolbox.redraw_update_items).toHaveBeenCalled();
    });

    test("copying from a read-only subtask is allowed", () => {
        const ulabel = make_ulabel({ ro: [make_bbox("r1")] }, "ro");

        expect(ulabel.copy_annotation("r1", "gt")).not.toBeNull();
        expect(only_annotation(ulabel, "gt").spatial_payload).toEqual([[10, 10], [30, 30]]);
    });

    test("refuses a target without a compatible class", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });

        expect(ulabel.copy_annotation("g1", "ro")).toBeNull();
        expect(ulabel.subtasks.ro.annotations.ordering).toEqual([]);
    });

    test("refuses an explicit class that cannot take the spatial type", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });

        expect(ulabel.copy_annotation("g1", "mixed", 1)).toBeNull();
        expect(ulabel.subtasks.mixed.annotations.ordering).toEqual([]);
    });

    test("the copy is not hidden by an isolation in the target", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")], pred: [make_bbox("p1")] });
        ulabel.isolate_annotation("p1", "pred", false);

        ulabel.copy_annotation("g1", "pred");

        expect(ulabel.get_isolated_annotation_id("pred")).toBeNull();
    });
});

describe("class resolution", () => {
    test("keeps the source class when the target allows it", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1", 2)] });
        ulabel.set_active_class(1, "pred", false);

        ulabel.copy_annotation("g1", "pred");

        expect(ulabel.resolve_paste_class_id(ulabel.subtasks.gt.annotations.access.g1, "pred")).toBe(2);
        expect(only_annotation(ulabel, "pred").classification_payloads[1]).toEqual({ class_id: 2, confidence: 1.0 });
    });

    test("falls back to the target's active class", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1", 1)] });
        ulabel.set_active_class(3, "weeds", false);

        ulabel.copy_annotation("g1", "weeds");

        expect(only_annotation(ulabel, "weeds").classification_payloads).toEqual([
            { class_id: 2, confidence: 0.0 },
            { class_id: 3, confidence: 1.0 },
        ]);
    });

    test("falls back to the first compatible class when the active class cannot take the type", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1", 1)] });
        ulabel.set_active_class(1, "mixed", false);

        ulabel.copy_annotation("g1", "mixed");

        expect(only_annotation(ulabel, "mixed").classification_payloads).toEqual([
            { class_id: 1, confidence: 0.0 },
            { class_id: 2, confidence: 1.0 },
        ]);
    });

    test("an explicit class wins", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1", 1)] });

        ulabel.copy_annotation("g1", "pred", 2);

        expect(only_annotation(ulabel, "pred").classification_payloads[1]).toEqual({ class_id: 2, confidence: 1.0 });
    });
});

describe("undo / redo", () => {
    test("undo on the target removes the copy; redo restores it with the same id and class", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1", 2)] });
        const new_id = ulabel.copy_annotation("g1", "pred");

        ulabel.state.current_subtask = "pred";
        ulabel.undo();

        expect(ulabel.subtasks.pred.annotations.ordering).toEqual([]);
        expect(ulabel.subtasks.pred.annotations.access[new_id]).toBeUndefined();
        expect(ulabel.destroy_annotation_context).toHaveBeenCalledWith(new_id, "pred");

        ulabel.redo();

        const restored = only_annotation(ulabel, "pred");
        expect(restored.id).toBe(new_id);
        expect(restored.classification_payloads[1]).toEqual({ class_id: 2, confidence: 1.0 });
        expect(restored.spatial_payload).toEqual([[10, 10], [30, 30]]);
        expect(action_types(ulabel, "pred")).toEqual(["paste_annotation"]);
    });

    test("undo on the source stream has nothing to undo after a copy", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });
        ulabel.copy_annotation("g1", "pred");

        ulabel.undo();

        expect(ulabel.subtasks.pred.annotations.ordering).toHaveLength(1);
    });
});

describe("cut", () => {
    test("is one move_annotation action on the source stream; undo reverts both halves", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });

        const new_id = ulabel.copy_annotation_to_subtask("g1", "gt", "pred", null, true);

        expect(new_id).not.toBeNull();
        expect(ulabel.subtasks.gt.annotations.access.g1.deprecated).toBe(true);
        expect(ulabel.subtasks.gt.annotations.access.g1.deprecated_by.human).toBe(true);
        expect(action_types(ulabel, "gt")).toEqual(["move_annotation"]);
        expect(action_types(ulabel, "pred")).toEqual([]);
        expect(ulabel.subtasks.gt.actions.stream[0].affected).toEqual([{ annotation_id: new_id, subtask_key: "pred" }]);

        ulabel.undo();
        expect(ulabel.subtasks.gt.annotations.access.g1.deprecated).toBe(false);
        expect(ulabel.subtasks.gt.annotations.access.g1.last_edited_at).toBe("2026-01-01T00:00:00.000Z");
        expect(ulabel.subtasks.pred.annotations.ordering).toEqual([]);
        expect(ulabel.destroy_annotation_context).toHaveBeenCalledWith(new_id, "pred");

        ulabel.redo();
        expect(ulabel.subtasks.gt.annotations.access.g1.deprecated).toBe(true);
        const restored = only_annotation(ulabel, "pred");
        expect(restored.id).toBe(new_id);
        expect(restored.spatial_payload).toEqual([[10, 10], [30, 30]]);
        expect(action_types(ulabel, "gt")).toEqual(["move_annotation"]);
        expect(action_types(ulabel, "pred")).toEqual([]);
    });

    test("undoing the move forgets the target's history about the copy", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1", 1)] });
        const new_id = ulabel.copy_annotation_to_subtask("g1", "gt", "pred", null, true);

        // Edit the copy twice in the target and undo one edit
        ulabel.state.current_subtask = "pred";
        ulabel.edit_text_payload(new_id, "first");
        ulabel.subtasks.pred.state.id_payload = [{ class_id: 1, confidence: 0.0 }, { class_id: 2, confidence: 1.0 }];
        ulabel.assign_annotation_id(new_id);
        ulabel.undo();
        expect(action_types(ulabel, "pred")).toEqual(["edit_text_payload"]);
        expect(ulabel.subtasks.pred.actions.undone_stack.map((action) => action.act_type)).toEqual(["assign_annotation_id"]);

        // Undo the move from the source: the copy and its history are gone
        ulabel.state.current_subtask = "gt";
        ulabel.undo();
        expect(ulabel.subtasks.pred.annotations.access[new_id]).toBeUndefined();
        expect(ulabel.subtasks.pred.actions.stream).toEqual([]);
        expect(ulabel.subtasks.pred.actions.undone_stack).toEqual([]);

        // Nothing left to replay in the target
        ulabel.state.current_subtask = "pred";
        expect(() => ulabel.undo()).not.toThrow();
        expect(() => ulabel.redo()).not.toThrow();
        expect(ulabel.subtasks.pred.annotations.ordering).toEqual([]);
    });

    test("undoing the first of chained moves also drops the copies made by later moves", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });
        const c1 = ulabel.copy_annotation_to_subtask("g1", "gt", "pred", null, true);
        ulabel.state.current_subtask = "pred";
        const c2 = ulabel.copy_annotation_to_subtask(c1, "pred", "gt", null, true);
        expect(ulabel.subtasks.gt.annotations.ordering).toEqual(["g1", c2]);

        ulabel.state.current_subtask = "gt";
        ulabel.undo();

        expect(ulabel.subtasks.gt.annotations.ordering).toEqual(["g1"]);
        expect(ulabel.subtasks.gt.annotations.access.g1.deprecated).toBe(false);
        expect(ulabel.subtasks.pred.annotations.ordering).toEqual([]);
        expect(action_types(ulabel, "gt")).toEqual([]);
        expect(action_types(ulabel, "pred")).toEqual([]);
        expect(ulabel.destroy_annotation_context).toHaveBeenCalledWith(c2, "gt");

        // Redo replays only the first move
        ulabel.redo();
        expect(ulabel.subtasks.gt.annotations.ordering).toEqual(["g1"]);
        expect(ulabel.subtasks.gt.annotations.access.g1.deprecated).toBe(true);
        expect(ulabel.subtasks.pred.annotations.ordering).toEqual([c1]);
    });

    test("a cut from a read-only source only copies", () => {
        const ulabel = make_ulabel({ ro: [make_bbox("r1")] }, "ro");

        expect(ulabel.copy_annotation_to_subtask("r1", "ro", "gt", null, true)).not.toBeNull();

        expect(ulabel.subtasks.ro.annotations.access.r1.deprecated).toBe(false);
        expect(action_types(ulabel, "ro")).toEqual([]);
        expect(action_types(ulabel, "gt")).toEqual(["paste_annotation"]);
        expect(ulabel.subtasks.gt.annotations.ordering).toHaveLength(1);
    });
});

describe("class choice", () => {
    test("several compatible classes switch to the target and open the class pie on the copy", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });

        const new_id = ulabel.copy_annotation_to_subtask("g1", "gt", "pred", null, false, true);

        expect(ulabel.set_subtask).toHaveBeenCalledWith("pred");
        expect(ulabel.show_id_dialog).toHaveBeenCalledWith(20, 20, new_id, false);
    });

    test("a single compatible class stays in the source subtask without a pie", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });

        ulabel.copy_annotation_to_subtask("g1", "gt", "mixed", null, false, true);

        expect(ulabel.set_subtask).not.toHaveBeenCalled();
        expect(ulabel.show_id_dialog).not.toHaveBeenCalled();
        expect(ulabel.state.current_subtask).toBe("gt");
    });
});

describe("bitmask", () => {
    test("the copy gets its own mask, re-encoded and optionally shifted", () => {
        const ulabel = make_ulabel({ gt: [make_bitmask("m1")] });
        const source = ulabel.subtasks.gt.annotations.access.m1;

        const new_id = ulabel.paste_annotation(source, "pred", null, [20, 20]);

        const copy = ulabel.subtasks.pred.annotations.access[new_id];
        expect(copy.containing_box).toEqual({ tlx: 20, tly: 20, brx: 20, bry: 29 });
        expect(ulabel.get_bitmask(copy)).not.toBe(ulabel.get_bitmask(source));
        expect(source.containing_box).toEqual({ tlx: 0, tly: 0, brx: 0, bry: 9 });
        expect(source.spatial_payload).toEqual(MASK_RLE);
        expect(copy.spatial_payload).not.toEqual(MASK_RLE);
    });
});

describe("clipboard", () => {
    function hover(ulabel, subtask_key, annid) {
        ulabel.subtasks[subtask_key].state.edit_candidate = { annid, spatial_type: "bbox" };
    }

    test("copy fills the envelope from the hovered annotation", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });
        hover(ulabel, "gt", "g1");

        const envelope = ulabel.copy_annotation_to_clipboard();

        expect(envelope).toMatchObject({
            ulabel_annotation: 1,
            image_width: 100,
            image_height: 100,
            source_subtask_key: "gt",
            annotation: { id: "g1", spatial_type: "bbox" },
        });
        expect(ulabel.state.clipboard).toBe(envelope);
        expect(ulabel.subtasks.gt.annotations.access.g1.deprecated).toBe(false);
    });

    test("copy without a hovered annotation is a no-op", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });

        expect(ulabel.copy_annotation_to_clipboard()).toBeNull();
        expect(ulabel.state.clipboard).toBeNull();
    });

    test("cut deletes the source; cut on a read-only subtask does nothing", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")], ro: [make_bbox("r1")] });
        hover(ulabel, "gt", "g1");

        expect(ulabel.copy_annotation_to_clipboard(null, true)).not.toBeNull();
        expect(ulabel.subtasks.gt.annotations.access.g1.deprecated).toBe(true);
        expect(action_types(ulabel, "gt")).toEqual(["delete_annotation"]);

        ulabel.state.current_subtask = "ro";
        hover(ulabel, "ro", "r1");
        expect(ulabel.copy_annotation_to_clipboard(null, true)).toBeNull();
        expect(ulabel.subtasks.ro.annotations.access.r1.deprecated).toBe(false);
    });

    test("paste into another subtask keeps the coordinates", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });
        hover(ulabel, "gt", "g1");
        ulabel.copy_annotation_to_clipboard();

        ulabel.state.current_subtask = "pred";
        const new_id = ulabel.paste_annotation_from_clipboard();

        expect(ulabel.subtasks.pred.annotations.access[new_id].spatial_payload).toEqual([[10, 10], [30, 30]]);
        // Two compatible classes: the pie opens on the copy
        expect(ulabel.show_id_dialog).toHaveBeenCalledWith(20, 20, new_id, false);
    });

    test("paste back into the source subtask is offset and keeps the class without a pie", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });
        hover(ulabel, "gt", "g1");
        ulabel.copy_annotation_to_clipboard();

        const new_id = ulabel.paste_annotation_from_clipboard();

        expect(ulabel.subtasks.gt.annotations.access[new_id].spatial_payload).toEqual([[30, 30], [50, 50]]);
        expect(ulabel.subtasks.gt.annotations.ordering).toEqual(["g1", new_id]);
        expect(ulabel.show_id_dialog).not.toHaveBeenCalled();
    });

    test("repeated pastes cascade per target subtask; a new copy resets the offset", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });
        hover(ulabel, "gt", "g1");
        ulabel.copy_annotation_to_clipboard();

        ulabel.paste_annotation_from_clipboard();
        const second = ulabel.paste_annotation_from_clipboard();
        expect(ulabel.subtasks.gt.annotations.access[second].spatial_payload).toEqual([[50, 50], [70, 70]]);

        // Another subtask: the first paste keeps the coordinates, repeats are nudged
        ulabel.state.current_subtask = "pred";
        const first_pred = ulabel.paste_annotation_from_clipboard();
        const second_pred = ulabel.paste_annotation_from_clipboard();
        expect(ulabel.subtasks.pred.annotations.access[first_pred].spatial_payload).toEqual([[10, 10], [30, 30]]);
        expect(ulabel.subtasks.pred.annotations.access[second_pred].spatial_payload).toEqual([[30, 30], [50, 50]]);

        // The counts are independent
        ulabel.state.current_subtask = "gt";
        const third = ulabel.paste_annotation_from_clipboard();
        expect(ulabel.subtasks.gt.annotations.access[third].spatial_payload).toEqual([[70, 70], [90, 90]]);

        hover(ulabel, "gt", "g1");
        ulabel.copy_annotation_to_clipboard();
        const fresh = ulabel.paste_annotation_from_clipboard();
        expect(ulabel.subtasks.gt.annotations.access[fresh].spatial_payload).toEqual([[30, 30], [50, 50]]);
    });

    test("pastes of the same copy read back from the system clipboard still cascade", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });
        hover(ulabel, "gt", "g1");
        const text = JSON.stringify(ulabel.copy_annotation_to_clipboard());

        ulabel.paste_annotation_from_clipboard(JSON.parse(text));
        const second = ulabel.paste_annotation_from_clipboard(JSON.parse(text));
        expect(ulabel.subtasks.gt.annotations.access[second].spatial_payload).toEqual([[50, 50], [70, 70]]);

        // A newer copy of the same annotation from another instance is not the cached one
        const parsed = JSON.parse(text);
        const newer = {
            ...parsed,
            copy_id: "another-copy",
            annotation: { ...parsed.annotation, text_payload: "edited", spatial_payload: [[0, 0], [5, 5]] },
        };
        const third = ulabel.paste_annotation_from_clipboard(newer);
        expect(ulabel.subtasks.gt.annotations.access[third].text_payload).toBe("edited");
        expect(ulabel.subtasks.gt.annotations.access[third].spatial_payload).toEqual([[20, 20], [25, 25]]);
        expect(ulabel.state.clipboard).toBe(newer);
    });

    test("paste refuses an envelope for a different image size", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("g1")] });
        hover(ulabel, "gt", "g1");
        const envelope = ulabel.copy_annotation_to_clipboard();

        expect(ulabel.paste_annotation_from_clipboard({ ...envelope, image_width: 200 })).toBeNull();
        expect(ulabel.subtasks.gt.annotations.ordering).toEqual(["g1"]);
    });

    test("paste refuses when no class in the current subtask fits", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("poly", 1, { spatial_type: "polygon", spatial_payload: [[[0, 0], [10, 0], [10, 10], [0, 0]]] })] });
        hover(ulabel, "gt", "poly");
        ulabel.copy_annotation_to_clipboard();

        ulabel.state.current_subtask = "pred";
        expect(ulabel.paste_annotation_from_clipboard()).toBeNull();
        expect(ulabel.subtasks.pred.annotations.ordering).toEqual([]);
    });

    test("paste with an empty clipboard is a no-op", () => {
        const ulabel = make_ulabel();

        expect(ulabel.paste_annotation_from_clipboard()).toBeNull();
    });
});
