// Every human edit must stamp `last_edited_at`/`last_edited_by` on each annotation
// it touches, and undo must restore the previous stamp. These cover the paths that
// edit annotations other than the one the action is named after, plus text notes.
const { ULabel } = require("./testing-utils/build_loader");

let next_id = 0;

function make_annotation(overrides = {}) {
    return {
        id: `anno_${next_id++}`,
        spatial_type: "bbox",
        spatial_payload: [[0, 0], [10, 10]],
        containing_box: { tlx: 0, tly: 0, brx: 10, bry: 10 },
        classification_payloads: [{ class_id: 1, confidence: 1.0 }],
        deprecated: false,
        last_edited_at: "loaded",
        last_edited_by: "host",
        ...overrides,
    };
}

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    image_width: 8,
    image_height: 8,
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        st: {
            display_name: "A",
            classes: [{ name: "Crop", id: 1, color: "green" }],
            allowed_modes: ["bbox", "point", "polygon", "delete_polygon", "bitmask", "whole-image"],
            resume_from: null,
        },
        other: {
            display_name: "B",
            classes: [{ name: "Crop", id: 1, color: "green" }],
            allowed_modes: ["bitmask"],
            resume_from: null,
        },
    },
};

function load(ulabel, annotations, subtask_key = "st") {
    const access = {};
    const ordering = [];
    for (const annotation of annotations) {
        access[annotation.id] = annotation;
        ordering.push(annotation.id);
    }
    ulabel.subtasks[subtask_key].annotations = { access, ordering };
}

function make_ulabel() {
    const ulabel = new ULabel(mock_config);
    ulabel.state.current_subtask = "st";
    // Rendering/bookkeeping tail is not under test
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
        "update_frame",
    ]) {
        ulabel[name] = jest.fn();
    }
    ulabel.toolbox = { redraw_update_items: jest.fn() };
    return ulabel;
}

function expect_stamped(annotation) {
    expect(annotation.last_edited_at).not.toBe("loaded");
    expect(annotation.last_edited_at).toEqual(expect.any(String));
    expect(annotation.last_edited_by).toBe("test_user");
}

function expect_restored(annotation) {
    expect(annotation.last_edited_at).toBe("loaded");
    expect(annotation.last_edited_by).toBe("host");
}

describe("bitmask overwrite victims", () => {
    function make_mask(id, subtask_key) {
        return make_annotation({ id, spatial_type: "bitmask", spatial_payload: null, containing_box: null, subtask_key });
    }

    test("are stamped on redo and restored on undo, in their own subtask", () => {
        const ulabel = make_ulabel();
        const mask = make_mask("mask", "st");
        const sibling = make_mask("sibling", "st");
        const victim = make_mask("victim", "other");
        load(ulabel, [mask, sibling]);
        load(ulabel, [victim], "other");
        const edit = (annotation_id, subtask) => ({ annotation_id, subtask, before_rle: null, after_rle: null, after_empty: false });

        ulabel.bitmask_stroke__redo("mask", {
            before_rle: null,
            after_rle: null,
            was_new: false,
            after_empty: false,
            other_edits: [edit("sibling", "st"), edit("victim", "other")],
        });

        expect_stamped(mask);
        expect_stamped(sibling);
        expect_stamped(victim);
        const action = ulabel.subtasks.st.actions.stream.at(-1);
        expect(action.affected).toEqual([
            { annotation_id: "sibling", subtask_key: "st" },
            { annotation_id: "victim", subtask_key: "other" },
        ]);
        expect(action.affected_prev).toEqual([
            { prev_timestamp: "loaded", prev_user: "host" },
            { prev_timestamp: "loaded", prev_user: "host" },
        ]);

        ulabel.undo();

        expect_restored(mask);
        expect_restored(sibling);
        expect_restored(victim);
    });
});

describe("delete polygon victims", () => {
    function make_scene(ulabel) {
        const hit = make_annotation({ id: "hit", spatial_type: "point", spatial_payload: [[5, 5]] });
        const missed = make_annotation({ id: "missed", spatial_type: "point", spatial_payload: [[50, 50]] });
        const eraser = {
            id: "del0",
            spatial_type: "delete_polygon",
            spatial_payload: [[-1, -1], [20, -1], [20, 20], [-1, 20], [-1, -1]],
            classification_payloads: [{ class_id: -1, confidence: 1.0 }],
            deprecated: false,
        };
        load(ulabel, [hit, missed, eraser]);
        return { hit, missed };
    }

    test("are stamped, restored on undo, and stamped again on redo", () => {
        const ulabel = make_ulabel();
        const { hit, missed } = make_scene(ulabel);

        ulabel.delete_annotations_in_polygon("del0");

        expect(hit.deprecated).toBe(true);
        expect_stamped(hit);
        expect_restored(missed);
        // The delete polygon itself is gone; the victims carry the edit
        expect(ulabel.subtasks.st.annotations.access.del0).toBeUndefined();

        ulabel.undo();

        expect(hit.deprecated).toBe(false);
        expect_restored(hit);

        ulabel.redo();

        expect(hit.deprecated).toBe(true);
        expect_stamped(hit);
        expect_restored(missed);
    });
});

describe("edit_text_payload", () => {
    function make_note_ulabel() {
        const ulabel = make_ulabel();
        const note = make_annotation({ id: "note", spatial_type: "whole-image", spatial_payload: null, text_payload: "before" });
        load(ulabel, [note]);
        return { ulabel, note };
    }

    test("records an undoable, stamped action", () => {
        const { ulabel, note } = make_note_ulabel();

        ulabel.edit_text_payload("note", "after");

        expect(note.text_payload).toBe("after");
        expect_stamped(note);
        expect(ulabel.subtasks.st.actions.stream.at(-1).act_type).toBe("edit_text_payload");
        expect(ulabel.redraw_annotation).toHaveBeenCalledWith("note");

        ulabel.undo();

        expect(note.text_payload).toBe("before");
        expect_restored(note);

        ulabel.redo();

        expect(note.text_payload).toBe("after");
        expect_stamped(note);
    });

    test("ignores a change to the same text", () => {
        const { ulabel, note } = make_note_ulabel();

        ulabel.edit_text_payload("note", "before");

        expect(ulabel.subtasks.st.actions.stream).toHaveLength(0);
        expect_restored(note);
    });
});
