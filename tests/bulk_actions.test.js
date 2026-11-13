// Unit tests for bulk actions on a multi-selection (CVML-358): delete, copy /
// cut / paste, copy / move to another subtask, and change class. Each runs as
// one batch, so a single undo / redo reverts / repeats all of it.
const { ULabel } = require("./testing-utils/build_loader");

const classes = [
    { name: "Crop", id: 1, color: "green" },
    { name: "Weed", id: 2, color: "red" },
];

function make_bbox(id, class_id = 1, offset = 0) {
    return {
        id,
        spatial_type: "bbox",
        spatial_payload: [[10 + offset, 10 + offset], [30 + offset, 30 + offset]],
        classification_payloads: [{ class_id, confidence: 1.0 }],
        deprecated: false,
        canvas_id: "c0",
    };
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
            gt: { display_name: "GT", classes, allowed_modes: ["bbox"], resume_from: resume.gt ?? null },
            pred: { display_name: "Pred", classes, allowed_modes: ["bbox"], resume_from: resume.pred ?? null },
            // No Crop here, so Crop copies need a class choice
            weeds: {
                display_name: "Weeds",
                classes: [classes[1], { name: "Other", id: 3, color: "blue" }],
                allowed_modes: ["bbox"],
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
        "redraw_multiple_spatial_annotations",
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

function live_ids(ulabel, subtask_key) {
    const { access, ordering } = ulabel.subtasks[subtask_key].annotations;
    return ordering.filter((id) => !access[id].deprecated);
}

function class_of(ulabel, subtask_key, id) {
    const payloads = ulabel.subtasks[subtask_key].annotations.access[id].classification_payloads;
    return payloads.find((payload) => payload.confidence === 1.0)?.class_id;
}

afterEach(() => {
    document.getElementById("annotation-selection-indicator")?.remove();
});

describe("run_action_batch", () => {
    test("stamps one batch id on every recorded action and clears it afterwards", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b")] });

        ulabel.run_action_batch(() => {
            ulabel.delete_annotation("a");
            ulabel.delete_annotation("b");
        });

        const stream = ulabel.subtasks.gt.actions.stream;
        expect(stream).toHaveLength(2);
        expect(stream[0].batch_id).toBeTruthy();
        expect(stream[1].batch_id).toBe(stream[0].batch_id);
        expect(ulabel.state.action_batch_id).toBeNull();
    });

    test("nested batches join the outer one", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b")] });

        ulabel.run_action_batch(() => {
            ulabel.delete_annotation("a");
            ulabel.run_action_batch(() => ulabel.delete_annotation("b"));
        });

        const stream = ulabel.subtasks.gt.actions.stream;
        expect(stream[1].batch_id).toBe(stream[0].batch_id);
    });

    test("unbatched actions undo one at a time", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b")] });
        ulabel.delete_annotation("a");
        ulabel.delete_annotation("b");

        ulabel.undo();

        expect(live_ids(ulabel, "gt")).toEqual(["b"]);
    });
});

describe("delete_selected_annotations", () => {
    test("deletes the selection; one undo restores it and one redo deletes it again", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b"), make_bbox("c")] });
        ulabel.select_annotations(["a", "c"]);

        expect(ulabel.delete_selected_annotations()).toBe(true);
        expect(live_ids(ulabel, "gt")).toEqual(["b"]);
        expect(ulabel.get_selected_annotation_ids()).toEqual([]);

        ulabel.undo();
        expect(live_ids(ulabel, "gt")).toEqual(["a", "b", "c"]);

        ulabel.redo();
        expect(live_ids(ulabel, "gt")).toEqual(["b"]);
        ulabel.undo();
        expect(live_ids(ulabel, "gt")).toEqual(["a", "b", "c"]);
    });

    test("an empty selection is a no-op", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a")] });

        expect(ulabel.delete_selected_annotations()).toBe(false);
        expect(live_ids(ulabel, "gt")).toEqual(["a"]);
    });

    test("a read-only subtask's selection is not deleted", () => {
        const ulabel = make_ulabel({ ro: [make_bbox("a"), make_bbox("b")] }, "ro");
        ulabel.select_annotations(["a", "b"]);

        expect(ulabel.delete_selected_annotations()).toBe(false);
        expect(live_ids(ulabel, "ro")).toEqual(["a", "b"]);
    });
});

describe("clipboard", () => {
    test("copying a selection builds a multi envelope", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b", 2)] });
        ulabel.select_annotations(["a", "b"]);

        const envelope = ulabel.copy_annotation_to_clipboard();

        expect(envelope).toMatchObject({
            ulabel_annotation: 2,
            image_width: 100,
            image_height: 100,
            source_subtask_key: "gt",
            annotations: [
                { annotation: { id: "a" }, source_class_name: "Crop" },
                { annotation: { id: "b" }, source_class_name: "Weed" },
            ],
        });
        expect(ulabel.state.clipboard).toBe(envelope);
        expect(live_ids(ulabel, "gt")).toEqual(["a", "b"]);
    });

    test("without a selection, copy still takes the hovered annotation", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a")] });
        ulabel.subtasks.gt.state.edit_candidate = { annid: "a", spatial_type: "bbox" };

        expect(ulabel.copy_annotation_to_clipboard()).toMatchObject({ ulabel_annotation: 1, annotation: { id: "a" } });
    });

    test("cutting a selection deletes it as one undo step", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b")] });
        ulabel.select_annotations(["a", "b"]);

        ulabel.copy_annotation_to_clipboard(null, true);
        expect(live_ids(ulabel, "gt")).toEqual([]);

        ulabel.undo();
        expect(live_ids(ulabel, "gt")).toEqual(["a", "b"]);
    });

    test("a read-only selection can be copied but not cut", () => {
        const ulabel = make_ulabel({ ro: [make_bbox("a"), make_bbox("b")] }, "ro");
        ulabel.select_annotations(["a", "b"]);

        expect(ulabel.copy_annotation_to_clipboard(null, true)).toBeNull();
        expect(ulabel.copy_annotation_to_clipboard()).toMatchObject({ ulabel_annotation: 2 });
        expect(live_ids(ulabel, "ro")).toEqual(["a", "b"]);
    });

    test("pasting a multi envelope adds every copy; one undo removes them all", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b", 2)] });
        ulabel.select_annotations(["a", "b"]);
        ulabel.copy_annotation_to_clipboard();
        ulabel.state.current_subtask = "pred";

        const new_ids = ulabel.paste_annotation_from_clipboard();

        expect(new_ids).toHaveLength(2);
        expect(live_ids(ulabel, "pred")).toEqual(new_ids);
        expect(new_ids.map((id) => class_of(ulabel, "pred", id))).toEqual([1, 2]);
        // Same coordinates in another subtask
        expect(ulabel.subtasks.pred.annotations.access[new_ids[0]].spatial_payload).toEqual([[10, 10], [30, 30]]);

        ulabel.undo();
        expect(live_ids(ulabel, "pred")).toEqual([]);
        ulabel.redo();
        expect(live_ids(ulabel, "pred")).toHaveLength(2);
    });

    test("unmatched copies share one class pie", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b"), make_bbox("c", 2)] });
        ulabel.select_annotations(["a", "b", "c"]);
        ulabel.copy_annotation_to_clipboard();
        ulabel.state.current_subtask = "weeds";

        const new_ids = ulabel.paste_annotation_from_clipboard();

        expect(new_ids).toHaveLength(3);
        // The Weed copy matched; the two Crop copies share one pie
        expect(ulabel.show_id_dialog).toHaveBeenCalledTimes(1);
        expect(ulabel.show_id_dialog).toHaveBeenCalledWith(
            expect.any(Number),
            expect.any(Number),
            new_ids[0],
            false,
            [new_ids[1]],
        );
    });

    test("a single-annotation envelope still pastes as before", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a")] });
        ulabel.subtasks.gt.state.edit_candidate = { annid: "a", spatial_type: "bbox" };
        ulabel.copy_annotation_to_clipboard();
        ulabel.state.current_subtask = "pred";

        const new_id = ulabel.paste_annotation_from_clipboard();

        expect(typeof new_id).toBe("string");
        expect(live_ids(ulabel, "pred")).toEqual([new_id]);
    });
});

describe("copy_annotations_to_subtask", () => {
    test("copies to the target's stream as one undo step", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b")] });

        const new_ids = ulabel.copy_annotations_to_subtask(["a", "b"], "gt", "pred");

        expect(new_ids).toHaveLength(2);
        expect(live_ids(ulabel, "pred")).toEqual(new_ids);
        expect(live_ids(ulabel, "gt")).toEqual(["a", "b"]);

        ulabel.state.current_subtask = "pred";
        ulabel.undo();
        expect(live_ids(ulabel, "pred")).toEqual([]);
    });

    test("a move deletes the sources and undoes as one step on the source stream", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b"), make_bbox("c")] });

        const new_ids = ulabel.copy_annotations_to_subtask(["a", "b"], "gt", "pred", true);

        expect(live_ids(ulabel, "gt")).toEqual(["c"]);
        expect(live_ids(ulabel, "pred")).toEqual(new_ids);

        ulabel.state.current_subtask = "gt";
        ulabel.undo();
        expect(live_ids(ulabel, "gt")).toEqual(["a", "b", "c"]);
        expect(live_ids(ulabel, "pred")).toEqual([]);
    });

    test("a move from a read-only source falls back to a copy", () => {
        const ulabel = make_ulabel({ ro: [make_bbox("a"), make_bbox("b")] }, "ro");

        expect(ulabel.copy_annotations_to_subtask(["a", "b"], "ro", "gt", true)).toHaveLength(2);
        expect(live_ids(ulabel, "ro")).toEqual(["a", "b"]);
        expect(live_ids(ulabel, "gt")).toHaveLength(2);
    });
});

describe("bulk counterpart menu items", () => {
    function click_menu_item(label) {
        const items = Array.from(document.querySelectorAll(".ulabel-context-menu-item"));
        const item = items.find((el) => el.textContent === label);
        if (item == null) throw new Error(`No "${label}" in ${items.map((el) => el.textContent)}`);
        item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }

    function make_linked_ulabel() {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b", 2), make_bbox("c")] });
        if (document.getElementById("container") == null) {
            document.body.insertAdjacentHTML("beforeend", "<div id=\"container\"></div>");
        }
        ulabel.copy_annotations_to_subtask(["a", "b"], "gt", "pred");
        ulabel.select_annotations(["a", "b"]);
        return ulabel;
    }

    test("Delete N from removes every selected annotation's counterparts as one undo step", () => {
        const ulabel = make_linked_ulabel();
        expect(live_ids(ulabel, "pred")).toHaveLength(2);

        expect(ulabel.show_context_menu("a", 10, 10)).toBe(true);
        click_menu_item("Delete 2 from Pred");

        expect(live_ids(ulabel, "pred")).toEqual([]);
        expect(live_ids(ulabel, "gt")).toEqual(["a", "b", "c"]);
        expect(ulabel.get_selected_annotation_ids()).toEqual(["a", "b"]);

        ulabel.state.current_subtask = "pred";
        ulabel.undo();
        expect(live_ids(ulabel, "pred")).toHaveLength(2);
        ulabel.redo();
        expect(live_ids(ulabel, "pred")).toEqual([]);
    });

    test("Set class in sets every changed counterpart as one undo step", () => {
        const ulabel = make_linked_ulabel();
        const [copy_a, copy_b] = live_ids(ulabel, "pred");
        const access = ulabel.subtasks.gt.annotations.access;
        access.a.classification_payloads = [{ class_id: 1, confidence: 0 }, { class_id: 2, confidence: 1 }];
        access.b.classification_payloads = [{ class_id: 1, confidence: 1 }, { class_id: 2, confidence: 0 }];
        // pred copies: a -> Crop, b -> Weed; sources now: a -> Weed, b -> Crop
        expect([class_of(ulabel, "pred", copy_a), class_of(ulabel, "pred", copy_b)]).toEqual([1, 2]);

        ulabel.show_context_menu("a", 10, 10);
        click_menu_item("Set class in Pred");
        expect([class_of(ulabel, "pred", copy_a), class_of(ulabel, "pred", copy_b)]).toEqual([2, 1]);

        ulabel.state.current_subtask = "pred";
        ulabel.undo();
        expect([class_of(ulabel, "pred", copy_a), class_of(ulabel, "pred", copy_b)]).toEqual([1, 2]);
    });

    test("Restore N under deprecated focus restores the selection as one undo step", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b"), make_bbox("c")] });
        if (document.getElementById("container") == null) {
            document.body.insertAdjacentHTML("beforeend", "<div id=\"container\"></div>");
        }
        ["a", "b", "c"].forEach((id) => ulabel.delete_annotation(id));
        ulabel.subtasks.gt.focus_deprecated = true;
        expect(ulabel.select_annotations(["a", "b"])).toEqual(["a", "b"]);

        expect(ulabel.show_context_menu("a", 10, 10)).toBe(true);
        click_menu_item("Restore 2");
        expect(live_ids(ulabel, "gt")).toEqual(["a", "b"]);

        ulabel.subtasks.gt.focus_deprecated = false;
        ulabel.undo();
        expect(live_ids(ulabel, "gt")).toEqual([]);
    });
});

describe("bulk change class", () => {
    test("a pie pick applies to the dialog's batch as one undo step", () => {
        const ulabel = make_ulabel({ gt: [make_bbox("a"), make_bbox("b"), make_bbox("c", 2)] });
        const state = ulabel.subtasks.gt.state;
        state.idd_associated_annotation = "a";
        state.idd_batch_ids = ["b", "c"];
        // The Weed wedge
        ulabel.lookup_id_dialog_mouse_pos = jest.fn().mockReturnValue({ class_ind: 1, dist_prop: 1.0 });
        // The real dialog teardown after an assignment resets the payload
        const assign = ulabel.assign_annotation_id.bind(ulabel);
        ulabel.assign_annotation_id = jest.fn((...args) => {
            assign(...args);
            state.id_payload = [{ class_id: 1, confidence: 1.0 }];
        });

        ulabel.handle_id_dialog_click({});

        expect(["a", "b", "c"].map((id) => class_of(ulabel, "gt", id))).toEqual([2, 2, 2]);
        // c was already Weed, so only a and b were recorded
        expect(ulabel.subtasks.gt.actions.stream).toHaveLength(2);

        ulabel.undo();
        expect(["a", "b", "c"].map((id) => class_of(ulabel, "gt", id))).toEqual([1, 1, 2]);
    });
});
