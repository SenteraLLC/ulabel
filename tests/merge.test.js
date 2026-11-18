// Unit tests for merge options (merge_options_meta_key): get_merge_options
// resolution and conflicts, apply_merge_options joins, overlap modes, bulk
// dedupe/chaining, and undo/redo on the target stream.
const { ULabel } = require("./testing-utils/build_loader");

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

// Column-major RLE on a 100x100 image: column 0, rows [start, start + length)
function column_rle(start, length) {
    return { counts: [start, length, 100 * 100 - start - length], size: [100, 100] };
}

function make_bitmask(id, start, length, meta = {}) {
    return make_annotation(id, "bitmask", column_rle(start, length), meta);
}

function option(id, start, length, targets, extra = {}) {
    return { id, label: `Merge ${id}`, subtask_key: "gt", mask: column_rle(start, length), targets, ...extra };
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
        merge_options_meta_key: "merge",
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
        "destroy_annotation_context",
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

function rows(ulabel, id) {
    const box = ulabel.get_bitmask(gt(ulabel, id)).get_bounding_box();
    return box === null ? null : [box.tly, box.bry];
}

function action_types(ulabel, subtask_key) {
    return ulabel.subtasks[subtask_key].actions.stream.map((action) => action.act_type);
}

// g1 rows 0-9 (h1), g2 rows 20-29 (h2), c1 rows 40-49 (h3)
function base_gt() {
    return [
        make_bitmask("g1", 0, 10, { hash: "h1" }),
        make_bitmask("g2", 20, 10, { hash: "h2" }),
        make_bitmask("c1", 40, 10, { hash: "h3" }),
    ];
}

describe("get_merge_options", () => {
    test("targets match an annotation id as well as a link value", () => {
        const ulabel = make_ulabel({
            gt: [make_bitmask("g1", 0, 10), ...base_gt().slice(1)],
            diff: [make_bitmask("d1", 12, 3, { merge: [option("by_id", 10, 5, ["g1"]), option("by_hash", 10, 5, ["g1", "h2"])] })],
        }, { annotation_link_meta_key: null });
        // Without a link key only ids resolve, so the hash target drops its option
        expect(ulabel.get_merge_options("d1").map((info) => [info.id, info.target_ids])).toEqual([["by_id", ["g1"]]]);

        const linked = make_ulabel({
            gt: [make_bitmask("g1", 0, 10), ...base_gt().slice(1)],
            diff: [make_bitmask("d1", 12, 3, { merge: [option("by_hash", 10, 5, ["g1", "h2"])] })],
        });
        expect(linked.get_merge_options("d1").map((info) => info.target_ids)).toEqual([["g1", "g2"]]);
    });

    test("only targets and conflicts on the source's frame count", () => {
        const on_frame = (annotation, frame) => ({ ...annotation, frame });
        const ulabel = make_ulabel({
            gt: [
                on_frame(make_bitmask("g0", 0, 10, { hash: "track" }), 0),
                on_frame(make_bitmask("g1", 20, 10, { hash: "track" }), 1),
                on_frame(make_bitmask("c1", 10, 5, { hash: "other" }), 1),
            ],
            diff: [on_frame(make_bitmask("d1", 10, 5, { merge: [option("m", 10, 5, ["track"])] }), 0)],
        }, { image_data: ["a.jpg", "b.jpg"] });

        expect(ulabel.get_merge_options("d1")).toEqual([
            { id: "m", label: "Merge m", subtask_key: "gt", target_ids: ["g0"], conflict_ids: [] },
        ]);
        ulabel.apply_merge_options([{ annotation_id: "d1", option_id: "m" }]);
        expect(rows(ulabel, "g0")).toEqual([0, 14]);
        expect(gt(ulabel, "g1").deprecated).toBe(false);
        expect(rows(ulabel, "g1")).toEqual([20, 29]);
    });

    test("resolves targets in order and reports conflicts", () => {
        const ulabel = make_ulabel({
            gt: base_gt(),
            diff: [make_bitmask("d1", 12, 3, {
                merge: [option("sliver", 10, 5, ["h1"]), option("full", 10, 10, ["h2", "h1"]), option("wide", 10, 35, ["h1"])],
            })],
        });

        expect(ulabel.get_merge_options("d1")).toEqual([
            { id: "sliver", label: "Merge sliver", subtask_key: "gt", target_ids: ["g1"], conflict_ids: [] },
            { id: "full", label: "Merge full", subtask_key: "gt", target_ids: ["g2", "g1"], conflict_ids: [] },
            { id: "wide", label: "Merge wide", subtask_key: "gt", target_ids: ["g1"], conflict_ids: ["g2", "c1"] },
        ]);
    });

    test("drops options that cannot apply", () => {
        const ulabel = make_ulabel({
            gt: [...base_gt(), make_annotation("box", "bbox", [[0, 0], [5, 5]], { hash: "hb" })],
            ro: [make_bitmask("r1", 0, 5, { hash: "hr" })],
            diff: [make_bitmask("d1", 12, 3, {
                merge: [
                    option("missing", 10, 5, ["nope"]),
                    option("partly_missing", 10, 5, ["h1", "nope"]),
                    option("not_bitmask", 10, 5, ["hb"]),
                    option("read_only", 10, 5, ["hr"], { subtask_key: "ro" }),
                    option("no_subtask", 10, 5, ["h1"], { subtask_key: "zzz" }),
                    option("bad_mask", 10, 5, ["h1"], { mask: { counts: [1], size: [5, 5] } }),
                    { id: "no_targets", label: "x", subtask_key: "gt", mask: column_rle(0, 1), targets: [] },
                    option("ok", 10, 5, ["h1"]),
                    option("ok", 10, 5, ["h2"]),
                ],
            })],
        });

        expect(ulabel.get_merge_options("d1").map((info) => info.id)).toEqual(["ok"]);
        expect(ulabel.get_merge_options("d1")[0].target_ids).toEqual(["g1"]);
    });

    test("nothing without the config key, or for a deleted target", () => {
        const resume = {
            gt: base_gt(),
            diff: [make_bitmask("d1", 12, 3, { merge: [option("sliver", 10, 5, ["h1"])] })],
        };
        expect(make_ulabel(resume, { merge_options_meta_key: null }).get_merge_options("d1")).toEqual([]);

        const ulabel = make_ulabel(resume);
        ulabel.state.current_subtask = "gt";
        ulabel.delete_annotation("g1");
        expect(ulabel.get_merge_options("d1", "diff")).toEqual([]);
    });
});

describe("apply_merge_options", () => {
    test("grows the target by the mask; undo/redo on the target stream", () => {
        const ulabel = make_ulabel({
            gt: base_gt(),
            diff: [make_bitmask("d1", 12, 3, { merge: [option("sliver", 10, 5, ["h1"])] })],
        });

        expect(ulabel.apply_merge_options([{ annotation_id: "d1", option_id: "sliver" }])).toEqual(["g1"]);
        expect(rows(ulabel, "g1")).toEqual([0, 14]);
        expect(gt(ulabel, "g1").containing_box).toEqual({ tlx: 0, tly: 0, brx: 0, bry: 14 });
        expect(action_types(ulabel, "gt")).toEqual(["apply_merge_option"]);
        expect(action_types(ulabel, "diff")).toEqual([]);

        ulabel.state.current_subtask = "gt";
        ulabel.undo();
        expect(rows(ulabel, "g1")).toEqual([0, 9]);
        ulabel.redo();
        expect(rows(ulabel, "g1")).toEqual([0, 14]);
    });

    test("joins every target into the first and deletes the rest", () => {
        const ulabel = make_ulabel({
            gt: base_gt(),
            diff: [make_bitmask("d1", 12, 3, { merge: [option("full", 10, 10, ["h2", "h1"])] })],
        });

        expect(ulabel.apply_merge_options([{ annotation_id: "d1", option_id: "full" }]).sort()).toEqual(["g1", "g2"]);
        expect(rows(ulabel, "g2")).toEqual([0, 29]);
        expect(gt(ulabel, "g1").deprecated).toBe(true);
        expect(gt(ulabel, "c1").deprecated).toBe(false);

        ulabel.state.current_subtask = "gt";
        ulabel.undo();
        expect(rows(ulabel, "g2")).toEqual([20, 29]);
        expect(gt(ulabel, "g1").deprecated).toBe(false);
        expect(rows(ulabel, "g1")).toEqual([0, 9]);

        ulabel.redo();
        expect(rows(ulabel, "g2")).toEqual([0, 29]);
        expect(gt(ulabel, "g1").deprecated).toBe(true);
    });

    test("overlap none / exclude / overwrite against other bitmasks", () => {
        const resume = {
            gt: base_gt(),
            diff: [make_bitmask("d1", 12, 3, { merge: [option("wide", 10, 35, ["h1"])] })],
        };
        const merge = [{ annotation_id: "d1", option_id: "wide" }];

        const none = make_ulabel(resume);
        expect(none.apply_merge_options(merge)).toEqual(["g1"]);
        expect(rows(none, "g1")).toEqual([0, 44]);
        expect(rows(none, "g2")).toEqual([20, 29]);

        const exclude = make_ulabel(resume);
        exclude.apply_merge_options(merge, "exclude");
        const g1_mask = exclude.get_bitmask(gt(exclude, "g1"));
        expect(rows(exclude, "g1")).toEqual([0, 39]);
        expect(g1_mask.get_pixel(0, 25)).toBe(0);
        expect(g1_mask.get_pixel(0, 35)).toBe(1);
        expect(rows(exclude, "c1")).toEqual([40, 49]);

        const overwrite = make_ulabel(resume);
        expect(overwrite.apply_merge_options(merge, "overwrite").sort()).toEqual(["c1", "g1", "g2"]);
        expect(rows(overwrite, "g1")).toEqual([0, 44]);
        expect(rows(overwrite, "c1")).toEqual([45, 49]);
        expect(overwrite.get_bitmask(gt(overwrite, "g2")).is_empty()).toBe(true);
        expect(gt(overwrite, "g2").deprecated).toBe(true);

        overwrite.state.current_subtask = "gt";
        overwrite.undo();
        expect(rows(overwrite, "g1")).toEqual([0, 9]);
        expect(rows(overwrite, "c1")).toEqual([40, 49]);
        expect(rows(overwrite, "g2")).toEqual([20, 29]);
        expect(gt(overwrite, "g2").deprecated).toBe(false);
    });

    test("bulk applies a shared option once and chains joins, as one undo step", () => {
        const ulabel = make_ulabel({
            gt: base_gt(),
            diff: [
                make_bitmask("d1", 12, 3, { merge: [option("full", 10, 10, ["h1", "h2"])] }),
                make_bitmask("d2", 16, 3, { merge: [option("full", 10, 10, ["h1", "h2"])] }),
                make_bitmask("d3", 31, 2, { merge: [option("tail", 30, 5, ["h2"])] }),
            ],
        });

        ulabel.apply_merge_options([
            { annotation_id: "d1", option_id: "full" },
            { annotation_id: "d2", option_id: "full" },
            { annotation_id: "d3", option_id: "tail" },
        ]);
        expect(action_types(ulabel, "gt")).toEqual(["apply_merge_option", "apply_merge_option"]);
        // tail's target g2 was merged into g1, so it grows g1
        expect(rows(ulabel, "g1")).toEqual([0, 34]);
        expect(gt(ulabel, "g2").deprecated).toBe(true);

        ulabel.state.current_subtask = "gt";
        ulabel.undo();
        expect(rows(ulabel, "g1")).toEqual([0, 9]);
        expect(rows(ulabel, "g2")).toEqual([20, 29]);
        expect(gt(ulabel, "g2").deprecated).toBe(false);
    });

    test("records nothing for an unknown option, a bad overlap, or no change", () => {
        const ulabel = make_ulabel({
            gt: base_gt(),
            diff: [make_bitmask("d1", 2, 3, { merge: [option("inside", 2, 3, ["h1"])] })],
        });

        expect(ulabel.apply_merge_options([{ annotation_id: "d1", option_id: "nope" }])).toEqual([]);
        expect(ulabel.apply_merge_options([{ annotation_id: "d1", option_id: "inside" }], "bogus")).toEqual([]);
        expect(ulabel.apply_merge_options([{ annotation_id: "d1", option_id: "inside" }])).toEqual([]);
        expect(action_types(ulabel, "gt")).toEqual([]);
    });

    test("reports the change and switches to the target with paste_switch_to_target", () => {
        const on_annotation_change = jest.fn();
        const ulabel = make_ulabel({
            gt: base_gt(),
            diff: [make_bitmask("d1", 12, 3, { merge: [option("full", 10, 10, ["h1", "h2"])] })],
        }, { on_annotation_change, paste_switch_to_target: true });
        ulabel.set_subtask = jest.fn();

        ulabel.apply_merge_options([{ annotation_id: "d1", option_id: "full" }]);
        expect(on_annotation_change).toHaveBeenCalledWith(expect.objectContaining({
            subtask_key: "gt",
            annotation_id: "d1",
            act_type: "apply_merge_option",
            kind: "do",
            affected: expect.arrayContaining([
                { annotation_id: "g1", subtask_key: "gt" },
                { annotation_id: "g2", subtask_key: "gt" },
            ]),
        }));
        expect(ulabel.set_subtask).toHaveBeenCalledWith("gt");
    });

    test("copies drop the merge options", () => {
        const ulabel = make_ulabel({
            diff: [make_bitmask("d1", 12, 3, { merge: [option("sliver", 10, 5, ["h1"])], other: 1 })],
        });

        const copy_id = ulabel.copy_annotation("d1", "gt");
        expect(gt(ulabel, copy_id).annotation_meta.merge).toBeUndefined();
        expect(gt(ulabel, copy_id).annotation_meta.other).toBe(1);
    });
});
