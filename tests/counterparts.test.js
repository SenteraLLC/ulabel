// Unit tests for cross-subtask counterparts: find_counterparts (copied_from and
// annotation_link_meta_key), link-key stripping on copy, and delete_counterparts
// (vector delete, bitmask erase) with undo/redo on the target stream.
const { ULabel } = require("./testing-utils/build_loader");
const { mark_deprecated } = require("../build/annotation_operators");

const classes = [
    { name: "Crop", id: 1, color: "green" },
    { name: "Weed", id: 2, color: "red" },
];

function make_annotation(id, spatial_type, spatial_payload, meta = {}) {
    return {
        id,
        spatial_type,
        spatial_payload,
        classification_payloads: [{ class_id: 1, confidence: 1.0 }],
        deprecated: false,
        annotation_meta: meta,
    };
}

function make_bbox(id, meta = {}) {
    return make_annotation(id, "bbox", [[10, 10], [30, 30]], meta);
}

// Column-major RLE on a 100x100 image: column 0, rows [start, start + length)
function column_rle(start, length) {
    return { counts: [start, length, 100 * 100 - start - length], size: [100, 100] };
}

function make_bitmask(id, start, length, meta = {}) {
    return make_annotation(id, "bitmask", column_rle(start, length), meta);
}

function make_ulabel(resume = {}, extra_config = {}) {
    const modes = ["bbox", "bitmask", "point"];
    const ulabel = new ULabel({
        container_id: "container",
        image_data: "test.jpg",
        username: "test_user",
        image_width: 100,
        image_height: 100,
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        annotation_link_meta_key: "hash",
        subtasks: {
            gt: { display_name: "GT", classes, allowed_modes: modes, resume_from: resume.gt ?? null },
            diff: { display_name: "Diff", classes, allowed_modes: modes, read_only: true, resume_from: resume.diff ?? null },
            ro: { display_name: "RO", classes, allowed_modes: modes, read_only: true, resume_from: resume.ro ?? null },
        },
        ...extra_config,
    });
    ulabel.state.current_subtask = "diff";
    for (const name of [
        "redraw_annotation",
        "redraw_multiple_spatial_annotations",
        "update_filter_distance",
        "hide_id_dialog",
        "hide_context_menu",
        "update_frame",
    ]) {
        ulabel[name] = jest.fn();
    }
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    ulabel.get_init_canvas_context_id = jest.fn(() => "c0");
    return ulabel;
}

function gt(ulabel, id) {
    return ulabel.subtasks.gt.annotations.access[id];
}

function action_types(ulabel, subtask_key) {
    return ulabel.subtasks[subtask_key].actions.stream.map((action) => action.act_type);
}

describe("find_counterparts", () => {
    test("links by a shared string or array value", () => {
        const ulabel = make_ulabel({
            gt: [make_bbox("g1", { hash: "h1" }), make_bbox("g2", { hash: "h2" }), make_bbox("g3", { hash: "h3" })],
            diff: [make_bbox("d1", { hash: ["h1", "h2"] }), make_bbox("d2", { hash: "h3" }), make_bbox("d3", {})],
        });

        expect(ulabel.find_counterparts("d1", "diff", "gt")).toEqual(["g1", "g2"]);
        expect(ulabel.find_counterparts("d2", "diff", "gt")).toEqual(["g3"]);
        expect(ulabel.find_counterparts("d3", "diff", "gt")).toEqual([]);
        expect(ulabel.find_counterparts("d1", "diff", "diff")).toEqual([]);
        expect(ulabel.find_counterparts("missing", "diff", "gt")).toEqual([]);
    });

    test("without a link key only copied_from links", () => {
        const ulabel = make_ulabel({
            gt: [make_bbox("g1", { hash: "h1" })],
            diff: [make_bbox("d1", { hash: "h1" })],
        }, { annotation_link_meta_key: null });

        expect(ulabel.find_counterparts("d1", "diff", "gt")).toEqual([]);
        const copy_id = ulabel.copy_annotation("d1", "gt");
        expect(ulabel.find_counterparts("d1", "diff", "gt")).toEqual([copy_id]);
    });

    test("copied_from links both ways", () => {
        const ulabel = make_ulabel({ diff: [make_bbox("d1")] });
        const copy_id = ulabel.copy_annotation("d1", "gt");

        expect(ulabel.find_counterparts("d1", "diff", "gt")).toEqual([copy_id]);
        expect(ulabel.find_counterparts(copy_id, "gt", "diff")).toEqual(["d1"]);
    });

    test("human-deleted counterparts are skipped; filter-hidden ones count", () => {
        const ulabel = make_ulabel({
            gt: [make_bbox("g1", { hash: "h1" })],
            diff: [make_bbox("d1", { hash: "h1" })],
        });

        mark_deprecated(gt(ulabel, "g1"), true, "confidence_filter");
        expect(ulabel.find_counterparts("d1", "diff", "gt")).toEqual(["g1"]);
        mark_deprecated(gt(ulabel, "g1"), true, "human");
        expect(ulabel.find_counterparts("d1", "diff", "gt")).toEqual([]);
    });
});

describe("copy", () => {
    test("drops the link key and keeps the rest of annotation_meta", () => {
        const ulabel = make_ulabel({ diff: [make_bbox("d1", { hash: ["h1"], area: 4 })] });

        const copy_id = ulabel.copy_annotation("d1", "gt");

        expect(gt(ulabel, copy_id).annotation_meta).toEqual({ area: 4, copied_from: { subtask_key: "diff", annotation_id: "d1" } });
        expect(ulabel.subtasks.diff.annotations.access.d1.annotation_meta.hash).toEqual(["h1"]);
    });
});

describe("delete_counterparts", () => {
    test("deletes vector counterparts as one undoable action on the target stream", () => {
        const on_annotation_change = jest.fn();
        const ulabel = make_ulabel({
            gt: [make_bbox("g1", { hash: "h1" }), make_bbox("g2", { hash: "h2" }), make_bbox("g3", {})],
            diff: [make_bbox("d1", { hash: ["h1", "h2"] })],
        }, { on_annotation_change });

        expect(ulabel.delete_counterparts("d1", "diff", "gt")).toEqual(["g1", "g2"]);

        expect(gt(ulabel, "g1").deprecated).toBe(true);
        expect(gt(ulabel, "g2").deprecated).toBe(true);
        expect(gt(ulabel, "g3").deprecated).toBe(false);
        expect(action_types(ulabel, "gt")).toEqual(["delete_counterparts"]);
        expect(action_types(ulabel, "diff")).toEqual([]);
        expect(on_annotation_change).toHaveBeenLastCalledWith(expect.objectContaining({
            subtask_key: "gt",
            annotation_id: "d1",
            act_type: "delete_counterparts",
            kind: "do",
            affected: [{ annotation_id: "g1", subtask_key: "gt" }, { annotation_id: "g2", subtask_key: "gt" }],
        }));
        expect(gt(ulabel, "g1").last_edited_by).toBe("test_user");

        ulabel.state.current_subtask = "gt";
        ulabel.undo();
        expect(gt(ulabel, "g1").deprecated).toBe(false);
        expect(gt(ulabel, "g2").deprecated).toBe(false);
        expect(action_types(ulabel, "gt")).toEqual([]);

        ulabel.redo();
        expect(gt(ulabel, "g1").deprecated).toBe(true);
        expect(gt(ulabel, "g2").deprecated).toBe(true);
        expect(action_types(ulabel, "gt")).toEqual(["delete_counterparts"]);
        expect(on_annotation_change).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "redo", subtask_key: "gt" }));
    });

    test("erases a bitmask from its bitmask counterparts; an emptied mask is deleted", () => {
        const ulabel = make_ulabel({
            gt: [
                make_bitmask("partial", 0, 10, { hash: "h1" }),
                make_bitmask("covered", 2, 3, { hash: "h2" }),
                make_bbox("box", { hash: "h1" }),
            ],
            diff: [make_bitmask("d1", 0, 5, { hash: ["h1", "h2"] })],
        });

        expect(ulabel.delete_counterparts("d1", "diff", "gt")).toEqual(["partial", "covered"]);

        expect(gt(ulabel, "partial").deprecated).toBe(false);
        expect(gt(ulabel, "partial").containing_box).toEqual({ tlx: 0, tly: 5, brx: 0, bry: 9 });
        expect(ulabel.get_bitmask(gt(ulabel, "partial")).get_bounding_box()).toMatchObject({ tly: 5, bry: 9 });
        expect(gt(ulabel, "covered").deprecated).toBe(true);
        expect(ulabel.get_bitmask(gt(ulabel, "covered")).is_empty()).toBe(true);
        expect(gt(ulabel, "box").deprecated).toBe(false);
        expect(ulabel.get_bitmask(ulabel.subtasks.diff.annotations.access.d1).get_bounding_box()).toMatchObject({ tly: 0, bry: 4 });

        ulabel.state.current_subtask = "gt";
        ulabel.undo();
        expect(gt(ulabel, "partial").containing_box).toEqual({ tlx: 0, tly: 0, brx: 0, bry: 9 });
        expect(gt(ulabel, "covered").deprecated).toBe(false);
        expect(gt(ulabel, "covered").containing_box).toEqual({ tlx: 0, tly: 2, brx: 0, bry: 4 });

        ulabel.redo();
        expect(gt(ulabel, "partial").containing_box).toEqual({ tlx: 0, tly: 5, brx: 0, bry: 9 });
        expect(gt(ulabel, "covered").deprecated).toBe(true);
    });

    test("records nothing when no counterpart changes", () => {
        const ulabel = make_ulabel({
            gt: [make_bitmask("far", 50, 10, { hash: "h1" })],
            diff: [make_bitmask("d1", 0, 5, { hash: "h1" }), make_bbox("d2", {})],
        });

        expect(ulabel.delete_counterparts("d1", "diff", "gt")).toEqual([]);
        expect(ulabel.delete_counterparts("d2", "diff", "gt")).toEqual([]);
        expect(action_types(ulabel, "gt")).toEqual([]);
    });

    test("a read-only target is left alone", () => {
        const ulabel = make_ulabel({
            ro: [make_bbox("r1", { hash: "h1" })],
            gt: [make_bbox("g1", { hash: "h1" })],
        });
        ulabel.state.current_subtask = "gt";

        expect(ulabel.delete_counterparts("g1", "gt", "ro")).toEqual([]);
        expect(ulabel.subtasks.ro.annotations.access.r1.deprecated).toBe(false);
        expect(action_types(ulabel, "ro")).toEqual([]);
    });
});
