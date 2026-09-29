// Unit tests for the per-button submit payload options: `subtasks` whitelist
// and `edits_only` (new / deleted / modified relative to what the host loaded).
// NOTE: require `configuration` before `submit_buttons` so the `ToolboxItem`
// base class is initialized first (see confidence_slider.test.js).
require("../build/configuration");
const { SubmitButtons } = require("../build/toolbox_items/submit_buttons");
const { mark_deprecated } = require("../build/annotation_operators");
const { ULabel } = require("./testing-utils/build_loader");

function make_bbox(id, class_id = 1, extra = {}) {
    return {
        id,
        spatial_type: "bbox",
        spatial_payload: [[0, 0], [10, 10]],
        classification_payloads: [{ class_id, confidence: 1.0 }],
        deprecated: false,
        last_edited_at: "2026-01-01T00:00:00.000Z",
        last_edited_by: "host",
        ...extra,
    };
}

function make_polygon(id) {
    return make_bbox(id, 1, {
        spatial_type: "polygon",
        spatial_payload: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
    });
}

function make_note(id) {
    return make_bbox(id, 1, { spatial_type: "whole-image", spatial_payload: null, text_payload: "before" });
}

const classes = [
    { name: "Crop", id: 1, color: "green" },
    { name: "Weed", id: 2, color: "red" },
];

function make_config(gt, pred) {
    return {
        container_id: "container",
        image_data: "test.jpg",
        username: "test_user",
        image_width: 100,
        image_height: 100,
        allow_annotations_outside_image: true,
        task_meta: { job: 7 },
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            gt: { display_name: "GT", classes, allowed_modes: ["bbox", "point", "polygon", "delete_polygon", "bitmask", "whole-image"], resume_from: gt },
            pred: { display_name: "Pred", classes, allowed_modes: ["bbox", "bitmask"], resume_from: pred },
        },
    };
}

function make_ulabel(gt = [], pred = []) {
    const ulabel = new ULabel(make_config(gt, pred));
    ulabel.state.current_subtask = "gt";
    for (const name of [
        "redraw_annotation",
        "redraw_all_annotations",
        "redraw_multiple_spatial_annotations",
        "rebuild_containing_box",
        "update_filter_distance",
        "suggest_edits",
        "destroy_polygon_ender",
        "destroy_annotation_context",
        "remove_recorded_events_for_annotation",
        "hide_id_dialog",
        "hide_context_menu",
        "update_frame",
        "recolor_active_polygon_ender",
        "recolor_brush_circle",
    ]) {
        ulabel[name] = jest.fn();
    }
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
    ulabel.subtasks.gt.state.annotation_contexts = { c0: { context: {}, annotation_ids: [] } };
    return ulabel;
}

function ids(payload, subtask_key) {
    return payload.annotations[subtask_key].map((annotation) => annotation.id);
}

function edit_types(payload, subtask_key) {
    return Object.fromEntries(payload.annotations[subtask_key].map((annotation) => [annotation.id, annotation.edit_type]));
}

function reclassify(ulabel, annotation_id, class_id) {
    ulabel.subtasks.gt.state.id_payload = [{ class_id, confidence: 1.0 }];
    ulabel.assign_annotation_id(annotation_id);
}

describe("build_submit_payload without options", () => {
    test("matches the legacy payload: every subtask, every annotation, task_meta", () => {
        const ulabel = make_ulabel([make_bbox("g1"), make_bbox("g2", 1, { deprecated: true })], [make_bbox("p1")]);

        const payload = SubmitButtons.build_submit_payload(ulabel);

        expect(payload.task_meta).toEqual({ job: 7 });
        expect(Object.keys(payload.annotations)).toEqual(["gt", "pred"]);
        expect(ids(payload, "gt")).toEqual(["g1", "g2"]);
        expect(ids(payload, "pred")).toEqual(["p1"]);
        expect(payload.annotations.gt[1].deprecated).toBe(true);
        for (const annotation of [...payload.annotations.gt, ...payload.annotations.pred]) {
            expect(annotation.edit_type).toBeUndefined();
        }
    });

    test("strips an edit_type a host round-tripped through resume_from", () => {
        const ulabel = make_ulabel([make_bbox("g1", 1, { edit_type: "modified" })]);

        const payload = SubmitButtons.build_submit_payload(ulabel);

        expect(payload.annotations.gt[0].edit_type).toBeUndefined();
    });

    test("skips nonspatial annotations with a null spatial payload", () => {
        const ulabel = make_ulabel([make_note("note"), make_bbox("g1")]);

        expect(ids(SubmitButtons.build_submit_payload(ulabel), "gt")).toEqual(["g1"]);
    });
});

describe("subtasks whitelist", () => {
    test("keeps only the listed subtask keys, in config order", () => {
        const ulabel = make_ulabel([make_bbox("g1")], [make_bbox("p1")]);

        const payload = SubmitButtons.build_submit_payload(ulabel, { subtasks: ["pred"] });

        expect(Object.keys(payload.annotations)).toEqual(["pred"]);
        expect(ids(payload, "pred")).toEqual(["p1"]);
    });

    test("ignores unknown keys", () => {
        const ulabel = make_ulabel([make_bbox("g1")], [make_bbox("p1")]);

        const payload = SubmitButtons.build_submit_payload(ulabel, { subtasks: ["gt", "nope"] });

        expect(Object.keys(payload.annotations)).toEqual(["gt"]);
    });
});

describe("edits_only", () => {
    const edits_only = { edits_only: true };

    test("is empty when nothing was touched, including loaded-deprecated annotations", () => {
        const ulabel = make_ulabel([make_bbox("g1"), make_bbox("g2", 1, { deprecated: true })]);

        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);
    });

    test("loaded annotations without a host timestamp still count as loaded", () => {
        const ulabel = make_ulabel([make_bbox("g1", 1, { last_edited_at: undefined, last_edited_by: undefined })]);

        expect(ulabel.subtasks.gt.annotations.access.g1.last_edited_at).toBeNull();
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);

        ulabel.delete_annotation("g1");

        expect(edit_types(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual({ g1: "deleted" });
    });

    test("new: an in-session creation is included until it is deleted or undone", () => {
        const ulabel = make_ulabel([make_bbox("g1")]);

        ulabel.create_annotation("bbox", [[1, 1], [5, 5]], "fresh");
        expect(edit_types(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual({ fresh: "created" });

        ulabel.delete_annotation("fresh");
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);

        ulabel.undo();
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual(["fresh"]);

        ulabel.undo();
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);
    });

    test("deleted: a loaded annotation is reported once deleted and dropped again on undo", () => {
        const ulabel = make_ulabel([make_bbox("g1"), make_bbox("g2")]);

        ulabel.delete_annotation("g2");
        const payload = SubmitButtons.build_submit_payload(ulabel, edits_only);
        expect(edit_types(payload, "gt")).toEqual({ g2: "deleted" });
        expect(payload.annotations.gt[0].deprecated).toBe(true);

        ulabel.undo();
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);

        ulabel.redo();
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual(["g2"]);
    });

    test("modified: reclassifying a loaded annotation reports it, undo drops it", () => {
        const ulabel = make_ulabel([make_bbox("g1"), make_bbox("g2")]);

        reclassify(ulabel, "g1", 2);
        const payload = SubmitButtons.build_submit_payload(ulabel, edits_only);
        expect(edit_types(payload, "gt")).toEqual({ g1: "modified" });
        expect(payload.annotations.gt[0].classification_payloads[0].class_id).toBe(2);

        ulabel.undo();
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);
    });

    test("modified: a delete polygon reports its victims, not the eraser", () => {
        const ulabel = make_ulabel([
            make_bbox("hit", 1, { spatial_type: "point", spatial_payload: [[5, 5]] }),
            make_bbox("missed", 1, { spatial_type: "point", spatial_payload: [[50, 50]] }),
        ]);
        ulabel.create_annotation("delete_polygon", [[-1, -1], [20, -1], [20, 20], [-1, 20], [-1, -1]], "del0");

        ulabel.delete_annotations_in_polygon("del0");
        expect(edit_types(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual({ hit: "deleted" });

        ulabel.undo();
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);
    });

    test("modified: a bitmask overwrite reports the carved mask in another whitelisted subtask", () => {
        const mask = (id) => make_bbox(id, 1, { spatial_type: "bitmask", spatial_payload: { counts: [100 * 100], size: [100, 100] } });
        const ulabel = make_ulabel([mask("active")], [mask("victim")]);

        ulabel.bitmask_stroke__redo("active", {
            before_rle: null,
            after_rle: ulabel.subtasks.gt.annotations.access.active.spatial_payload,
            was_new: false,
            after_empty: false,
            other_edits: [{
                annotation_id: "victim",
                subtask: "pred",
                before_rle: null,
                after_rle: ulabel.subtasks.pred.annotations.access.victim.spatial_payload,
                after_empty: false,
            }],
        });

        const payload = SubmitButtons.build_submit_payload(ulabel, edits_only);
        expect(edit_types(payload, "gt")).toEqual({ active: "modified" });
        expect(edit_types(payload, "pred")).toEqual({ victim: "modified" });

        ulabel.undo();
        const after_undo = SubmitButtons.build_submit_payload(ulabel, edits_only);
        expect(ids(after_undo, "gt")).toEqual([]);
        expect(ids(after_undo, "pred")).toEqual([]);
    });

    test("a filter hiding a loaded annotation is not an edit", () => {
        const ulabel = make_ulabel([make_bbox("g1")]);
        const g1 = ulabel.subtasks.gt.annotations.access.g1;
        g1.deprecated_by = { human: false, confidence_filter: true };
        g1.deprecated = true;

        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);
    });

    test("a filter hiding a modified annotation keeps it modified and not deprecated", () => {
        const ulabel = make_ulabel([make_bbox("g1")]);
        reclassify(ulabel, "g1", 2);
        mark_deprecated(ulabel.subtasks.gt.annotations.access.g1, true, "confidence_slider");
        expect(ulabel.subtasks.gt.annotations.access.g1.deprecated).toBe(true);

        const payload = SubmitButtons.build_submit_payload(ulabel, edits_only);

        expect(edit_types(payload, "gt")).toEqual({ g1: "modified" });
        expect(payload.annotations.gt[0].deprecated).toBe(false);
        expect(payload.annotations.gt[0].deprecated_by.confidence_slider).toBe(true);
    });

    test("a filter hiding a created annotation keeps it created", () => {
        const ulabel = make_ulabel([]);
        ulabel.create_annotation("bbox", [[1, 1], [5, 5]], "fresh");
        mark_deprecated(ulabel.subtasks.gt.annotations.access.fresh, true, "confidence_slider");

        const payload = SubmitButtons.build_submit_payload(ulabel, edits_only);

        expect(edit_types(payload, "gt")).toEqual({ fresh: "created" });
        expect(payload.annotations.gt[0].deprecated).toBe(false);
    });

    test("a human deletion under a filter is still a deletion", () => {
        const ulabel = make_ulabel([make_bbox("g1")]);
        ulabel.delete_annotation("g1");
        mark_deprecated(ulabel.subtasks.gt.annotations.access.g1, true, "confidence_slider");

        const payload = SubmitButtons.build_submit_payload(ulabel, edits_only);

        expect(edit_types(payload, "gt")).toEqual({ g1: "deleted" });
        expect(payload.annotations.gt[0].deprecated).toBe(true);
    });

    test("a loaded polygon erased to nothing still yields a deletion record", () => {
        const ulabel = make_ulabel([make_polygon("poly")]);
        // What continue_brush leaves behind after the last fill is erased
        ulabel.delete_annotation("poly");
        ulabel.subtasks.gt.annotations.access.poly.spatial_payload = [];

        expect(ids(SubmitButtons.build_submit_payload(ulabel), "gt")).toEqual([]);
        const payload = SubmitButtons.build_submit_payload(ulabel, edits_only);
        expect(edit_types(payload, "gt")).toEqual({ poly: "deleted" });
        expect(payload.annotations.gt[0].deprecated).toBe(true);
        expect(payload.annotations.gt[0].spatial_type).toBe("polygon");
    });

    test("a created polygon erased to nothing is omitted", () => {
        const ulabel = make_ulabel([]);
        ulabel.create_annotation("polygon", [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]], "fresh");
        ulabel.delete_annotation("fresh");
        ulabel.subtasks.gt.annotations.access.fresh.spatial_payload = [];

        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);
    });

    test("an edited or created nonspatial note does not reach the payload", () => {
        const ulabel = make_ulabel([make_note("note")]);
        ulabel.edit_text_payload("note", "after");
        ulabel.create_annotation("whole-image", null, "fresh_note");

        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);
    });

    test.each([
        ["a string baseline", "2026-01-01T00:00:00.000Z"],
        ["a null baseline", null],
    ])("modified: a finished complex layer drops out on undo and returns on redo with %s", (_label, loaded_at) => {
        const ulabel = make_ulabel([make_bbox("poly", 1, {
            spatial_type: "polygon",
            spatial_payload: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
            last_edited_at: loaded_at,
        })]);
        expect(ulabel.subtasks.gt.annotations.access.poly.last_edited_at).toBe(loaded_at);
        ulabel.subtasks.gt.state.active_id = "poly";
        ulabel.start_complex_polygon();
        ulabel.subtasks.gt.annotations.access.poly.spatial_payload[1] = [[20, 20], [30, 20], [30, 30], [20, 30], [20, 30]];
        ulabel.finish_annotation();

        const stream = ulabel.subtasks.gt.actions.stream;
        expect(stream[stream.length - 1].act_type).toBe("finish_modify_annotation");
        expect(stream[stream.length - 1].prev_timestamp).toBe(loaded_at);
        expect(edit_types(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual({ poly: "modified" });

        ulabel.undo();
        expect(ulabel.subtasks.gt.annotations.access.poly.last_edited_at).toBe(loaded_at);
        expect(ulabel.subtasks.gt.annotations.access.poly.spatial_payload.length).toBe(1);
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);

        ulabel.redo();
        expect(edit_types(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual({ poly: "modified" });

        ulabel.undo();
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);
    });

    test("set_annotations re-baselines the replaced subtask", async () => {
        const ulabel = make_ulabel([make_bbox("g1")]);
        ulabel.delete_annotation("g1");
        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual(["g1"]);
        ulabel._clear_subtask_annotation_canvases = jest.fn();
        ulabel.refresh_toolbox = jest.fn();
        ulabel.reset_interaction_state = jest.fn();

        await ulabel.set_annotations([make_bbox("g1"), make_bbox("g3")], "gt", false, false);

        expect(ids(SubmitButtons.build_submit_payload(ulabel, edits_only), "gt")).toEqual([]);
        expect(ulabel.subtasks.gt.annotations.loaded_edited_at).toEqual({
            g1: "2026-01-01T00:00:00.000Z",
            g3: "2026-01-01T00:00:00.000Z",
        });
    });

    test("combines with the subtasks whitelist", () => {
        const ulabel = make_ulabel([make_bbox("g1")], [make_bbox("p1")]);
        ulabel.delete_annotation("g1");

        const payload = SubmitButtons.build_submit_payload(ulabel, { subtasks: ["pred"], edits_only: true });

        expect(Object.keys(payload.annotations)).toEqual(["pred"]);
        expect(ids(payload, "pred")).toEqual([]);
    });
});
