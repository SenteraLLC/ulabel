// Unit tests for the right-click context menu: which items show, what they
// call, how the menu closes, and that annotation data is rendered as text.
const { show_context_menu, hide_context_menu, is_context_menu_open } = require("../build/context_menu");

function make_annotation(overrides = {}) {
    return {
        id: "a0",
        spatial_type: "bbox",
        deprecated: false,
        classification_payloads: [{ class_id: 1, confidence: 0.2 }, { class_id: 2, confidence: 0.8 }],
        containing_box: { tlx: 10, tly: 20, brx: 30, bry: 60 },
        last_edited_by: "annotator",
        last_edited_at: "2026-09-28T00:00:00Z",
        annotation_meta: {},
        ...overrides,
    };
}

function make_ulabel({ read_only = false, compatible = [1, 2], annotation = make_annotation(), copy_targets = [], focus_deprecated = false, can_restore = true } = {}) {
    document.body.innerHTML = `<div id="container"></div>`;
    const subtask = {
        read_only,
        focus_deprecated,
        class_defs: [{ id: 1, name: "Crop" }, { id: 2, name: "Weed" }],
        annotations: { access: { [annotation.id]: annotation } },
        state: { edit_candidate: { annid: annotation.id }, move_candidate: null, isolated_annids: null },
    };
    const ulabel = {
        config: { container_id: "container" },
        state: { context_menu_annid: null },
        subtasks: {
            main: subtask,
            pred: { display_name: "Predictions" },
            review: { display_name: "Review" },
        },
        get_current_subtask: () => subtask,
        get_current_subtask_key: () => "main",
        is_current_subtask_read_only: () => read_only,
        is_subtask_edit_locked: (key = "main") => {
            const s = ulabel.subtasks[key];
            return s.read_only === true || s.focus_deprecated === true;
        },
        _get_compatible_class_ids: jest.fn(() => compatible),
        get_copy_target_subtask_keys: jest.fn(() => copy_targets),
        copy_annotation_to_subtask: jest.fn(() => "new_id"),
        copy_annotation_to_clipboard: jest.fn(() => ({ ulabel_annotation: 1, paste_counts: {} })),
        find_counterparts: jest.fn(() => []),
        delete_counterparts: jest.fn(() => []),
        get_counterpart_class_changes: jest.fn(() => ({})),
        set_counterparts_class: jest.fn(() => []),
        get_merge_options: jest.fn(() => []),
        apply_merge_options: jest.fn(() => []),
        get_class_name: jest.fn((class_id) => ({ 1: "Crop", 2: "Weed" })[class_id] ?? null),
        show_id_dialog: jest.fn(),
        delete_annotation: jest.fn(),
        is_annotation_defocused: jest.fn((ann) => ann.deprecated !== subtask.focus_deprecated),
        can_restore_annotation: jest.fn(() => can_restore),
        restore_annotation: jest.fn(),
        isolate_annotation: jest.fn((annid) => {
            subtask.state.isolated_annids = annid === null ? null : [annid];
            hide_context_menu(ulabel);
        }),
        hide_and_clear_action_candidates: jest.fn(() => {
            subtask.state.edit_candidate = null;
        }),
    };
    return ulabel;
}

function menu_element() {
    return document.getElementById("ulabel-context-menu__container");
}

function item_labels() {
    return Array.from(menu_element().querySelectorAll(".ulabel-context-menu-item")).map((el) => el.textContent);
}

function click_item(label) {
    const item = Array.from(menu_element().querySelectorAll(".ulabel-context-menu-item")).find((el) => el.textContent === label);
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("context menu items", () => {
    test("editable subtask with compatible classes shows all four", () => {
        const ulabel = make_ulabel();
        expect(show_context_menu(ulabel, "a0", 100, 100)).toBe(true);
        expect(item_labels()).toEqual(["Change class", "Delete", "Isolate", "Details"]);
        expect(is_context_menu_open(ulabel)).toBe(true);
        expect(menu_element().style.display).toBe("block");
    });

    test("fewer than two compatible classes hides Change class", () => {
        const ulabel = make_ulabel({ compatible: [2] });
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Delete", "Isolate", "Details"]);
    });

    test("read-only subtask shows only Isolate and Details", () => {
        const ulabel = make_ulabel({ read_only: true });
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Isolate", "Details"]);
    });

    test("the isolate item reads Show all while the target is isolated", () => {
        const ulabel = make_ulabel({ read_only: true });
        ulabel.get_current_subtask().state.isolated_annids = ["a0"];
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Show all", "Details"]);
    });

    test("unknown or deprecated target opens nothing", () => {
        const ulabel = make_ulabel();
        expect(show_context_menu(ulabel, "missing", 100, 100)).toBe(false);
        expect(is_context_menu_open(ulabel)).toBe(false);

        const deprecated = make_ulabel({ annotation: make_annotation({ deprecated: true }) });
        expect(show_context_menu(deprecated, "a0", 100, 100)).toBe(false);
    });

    test("deprecated target under deprecated focus offers Restore, Isolate, and Details", () => {
        const ulabel = make_ulabel({ annotation: make_annotation({ deprecated: true }), focus_deprecated: true });
        expect(show_context_menu(ulabel, "a0", 100, 100)).toBe(true);
        expect(item_labels()).toEqual(["Restore", "Isolate", "Details"]);

        click_item("Restore");
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.restore_annotation).toHaveBeenCalledWith("a0");
    });

    test("a deprecated target that cannot be restored has no Restore", () => {
        const ulabel = make_ulabel({
            annotation: make_annotation({ deprecated: true }),
            focus_deprecated: true,
            can_restore: false,
        });
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Isolate", "Details"]);
        expect(ulabel.can_restore_annotation).toHaveBeenCalledWith("a0");
    });

    test("one copy target is named on flat Copy to / Move to items", () => {
        const ulabel = make_ulabel({ copy_targets: ["pred"] });
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual([
            "Change class",
            "Copy to Predictions",
            "Move to Predictions",
            "Delete",
            "Isolate",
            "Details",
        ]);
        expect(ulabel.get_copy_target_subtask_keys).toHaveBeenCalledWith(ulabel.get_current_subtask().annotations.access.a0, "main");

        click_item("Copy to Predictions");
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.copy_annotation_to_subtask).toHaveBeenCalledWith("a0", "main", "pred", null, false, true);
    });

    test("several copy targets drill down to a list of subtask names", () => {
        const ulabel = make_ulabel({ copy_targets: ["pred", "review"] });
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual([
            "Change class",
            "Copy to\u2026",
            "Move to\u2026",
            "Delete",
            "Isolate",
            "Details",
        ]);

        click_item("Move to\u2026");
        expect(is_context_menu_open(ulabel)).toBe(true);
        expect(item_labels()).toEqual(["Predictions", "Review"]);

        click_item("Review");
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.copy_annotation_to_subtask).toHaveBeenCalledWith("a0", "main", "review", null, true, true);
    });

    test("read-only subtask offers Copy to but not Move to", () => {
        const ulabel = make_ulabel({ read_only: true, copy_targets: ["pred"] });
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Copy to Predictions", "Isolate", "Details"]);
    });

    test("a menu copy also arms the clipboard, counting as the first paste into the target", () => {
        const ulabel = make_ulabel({ copy_targets: ["pred"] });
        const write_text = jest.fn(() => Promise.resolve());
        Object.defineProperty(navigator, "clipboard", { value: { writeText: write_text }, configurable: true });
        show_context_menu(ulabel, "a0", 100, 100);

        click_item("Copy to Predictions");

        expect(ulabel.copy_annotation_to_clipboard).toHaveBeenCalledWith("a0");
        const envelope = ulabel.copy_annotation_to_clipboard.mock.results[0].value;
        expect(envelope.paste_counts).toEqual({ pred: 1 });
        expect(write_text).toHaveBeenCalledWith(JSON.stringify(envelope));
        delete navigator.clipboard;
    });

    test("a failed system clipboard write still arms the in-memory clipboard", async () => {
        const ulabel = make_ulabel({ copy_targets: ["pred"] });
        Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true });
        show_context_menu(ulabel, "a0", 100, 100);

        click_item("Copy to Predictions");
        await Promise.resolve();

        expect(ulabel.copy_annotation_to_clipboard).toHaveBeenCalledWith("a0");
        expect(ulabel.copy_annotation_to_subtask).toHaveBeenCalled();
        delete navigator.clipboard;
    });

    test("a target that already has the annotation asks first; cancelling skips the copy", () => {
        const ulabel = make_ulabel({ copy_targets: ["pred"] });
        ulabel.find_counterparts.mockReturnValue(["older_copy"]);
        ulabel.subtasks.pred.read_only = true;
        const confirm_spy = jest.spyOn(window, "confirm").mockReturnValue(false);

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Copy to Predictions");
        expect(ulabel.find_counterparts).toHaveBeenCalledWith("a0", "main", "pred");
        expect(confirm_spy).toHaveBeenCalledWith("Predictions already has this annotation. Copy it there anyway?");
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.copy_annotation_to_subtask).not.toHaveBeenCalled();
        expect(ulabel.copy_annotation_to_clipboard).not.toHaveBeenCalled();

        confirm_spy.mockReturnValue(true);
        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Move to Predictions");
        expect(confirm_spy).toHaveBeenLastCalledWith("Predictions already has this annotation. Move it there anyway?");
        expect(ulabel.copy_annotation_to_subtask).toHaveBeenCalledWith("a0", "main", "pred", null, true, true);
        confirm_spy.mockRestore();
    });

    test("Delete annotations from lists writable subtasks with counterparts, even from a read-only source", () => {
        const ulabel = make_ulabel({ read_only: true });
        ulabel.subtasks.pred.annotations = { access: { p1: { spatial_type: "bbox" } } };
        ulabel.subtasks.review.read_only = true;
        ulabel.find_counterparts.mockReturnValue(["p1"]);

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Delete annotation from Predictions", "Isolate", "Details"]);
        expect(ulabel.find_counterparts).not.toHaveBeenCalledWith("a0", "main", "review");

        click_item("Delete annotation from Predictions");
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.delete_counterparts).toHaveBeenCalledWith("a0", "main", "pred", false);
    });

    test("hide_copy_to_linked leaves out Copy to / Move to for subtasks with counterparts", () => {
        const ulabel = make_ulabel({ copy_targets: ["pred", "review"] });
        ulabel.config.hide_copy_to_linked = true;
        ulabel.find_counterparts.mockImplementation((annid, source_key, key) => (key === "pred" ? ["p1"] : []));

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual([
            "Change class",
            "Copy to Review",
            "Move to Review",
            "Delete annotation from Predictions",
            "Delete",
            "Isolate",
            "Details",
        ]);
    });

    test("Delete annotations from shows how many it would delete", () => {
        const ulabel = make_ulabel({ read_only: true });
        ulabel.find_counterparts.mockImplementation((annid, source_key, key) => (key === "pred" ? ["p1", "p2"] : ["r1"]));

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Delete annotations from\u2026");
        expect(item_labels()).toEqual(["Predictions (2)", "Review"]);

        ulabel.subtasks.review.read_only = true;
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Delete 2 annotations from Predictions", "Isolate", "Details"]);
    });

    test("a bitmask offers Erase pixels from where a counterpart is a bitmask, and Delete annotations from anywhere", () => {
        const ulabel = make_ulabel({ read_only: true, annotation: make_annotation({ spatial_type: "bitmask" }) });
        ulabel.subtasks.pred.annotations = { access: { p1: { spatial_type: "bitmask" } } };
        ulabel.subtasks.review.annotations = { access: { r1: { spatial_type: "polygon" } } };
        ulabel.find_counterparts.mockImplementation((annid, source_key, key) => (key === "pred" ? ["p1"] : ["r1"]));

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Erase pixels from Predictions", "Delete annotations from\u2026", "Isolate", "Details"]);
        const titles = Array.from(menu_element().querySelectorAll(".ulabel-context-menu-item")).map((el) => el.title);
        expect(titles[0]).toBe("Erase the overlapping pixels from the linked annotation in Predictions; the rest of it stays.");

        click_item("Erase pixels from Predictions");
        expect(ulabel.delete_counterparts).toHaveBeenCalledWith("a0", "main", "pred", true);
    });

    test("Set class in lists writable subtasks with counterparts to change, even from a read-only source", () => {
        const ulabel = make_ulabel({ read_only: true });
        ulabel.find_counterparts.mockImplementation((annid, source_key, key) => (key === "pred" ? ["p1"] : ["r1"]));
        ulabel.get_counterpart_class_changes.mockImplementation((annid, source_key, key) => (key === "pred" ? { p1: 2 } : {}));

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Set class in Predictions", "Delete annotations from\u2026", "Isolate", "Details"]);

        click_item("Set class in Predictions");
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.set_counterparts_class).toHaveBeenCalledWith("a0", "main", "pred");
    });

    test("Set class in skips read-only subtasks and opens a list for several", () => {
        const ulabel = make_ulabel();
        ulabel.find_counterparts.mockReturnValue(["x1"]);
        ulabel.get_counterpart_class_changes.mockReturnValue({ x1: 2 });

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Set class in\u2026");
        expect(item_labels()).toEqual(["Predictions", "Review"]);
        click_item("Review");
        expect(ulabel.set_counterparts_class).toHaveBeenCalledWith("a0", "main", "review");

        ulabel.subtasks.review.read_only = true;
        ulabel.get_counterpart_class_changes.mockClear();
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toContain("Set class in Predictions");
        expect(ulabel.get_counterpart_class_changes).not.toHaveBeenCalledWith("a0", "main", "review");
    });
});

describe("context menu actions", () => {
    test("Change class closes the menu and opens the pie at the box centre", () => {
        const ulabel = make_ulabel();
        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Change class");

        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.show_id_dialog).toHaveBeenCalledWith(20, 40, "a0", false);
    });

    test("Delete closes the menu and deletes the target", () => {
        const ulabel = make_ulabel();
        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Delete");

        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.delete_annotation).toHaveBeenCalledWith("a0");
    });

    test("Isolate and Show all toggle isolation of the target", () => {
        const ulabel = make_ulabel();
        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Isolate");
        expect(ulabel.isolate_annotation).toHaveBeenCalledWith("a0");
        expect(is_context_menu_open(ulabel)).toBe(false);

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Show all");
        expect(ulabel.isolate_annotation).toHaveBeenLastCalledWith(null);
        expect(is_context_menu_open(ulabel)).toBe(false);
    });

    test("Details replaces the items with read-only rows, text-escaped", () => {
        const ulabel = make_ulabel({
            annotation: make_annotation({
                annotation_meta: { source: "<b>model</b>", nested: { a: 1 } },
            }),
        });
        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Details");

        expect(is_context_menu_open(ulabel)).toBe(true);
        expect(item_labels()).toEqual([]);
        const rows = Array.from(menu_element().querySelectorAll(".ulabel-context-menu-detail")).map((row) => [
            row.querySelector(".ulabel-context-menu-detail-key").textContent,
            row.querySelector(".ulabel-context-menu-detail-value").textContent,
        ]);
        expect(rows).toEqual([
            ["id", "a0"],
            ["class", "Weed (2)"],
            ["confidences", "Weed 0.80, Crop 0.20"],
            ["type", "bbox"],
            ["edited by", "annotator"],
            ["edited at", "2026-09-28T00:00:00Z"],
            ["source", "<b>model</b>"],
            ["nested", "{\"a\":1}"],
        ]);
        expect(menu_element().querySelector("b")).toBeNull();
    });

    test("Details leaves out confidences when only one class has one", () => {
        const ulabel = make_ulabel({
            annotation: make_annotation({
                classification_payloads: [{ class_id: 1, confidence: 0 }, { class_id: 2, confidence: 1 }],
            }),
        });
        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Details");

        const keys = Array.from(menu_element().querySelectorAll(".ulabel-context-menu-detail-key")).map((el) => el.textContent);
        expect(keys).not.toContain("confidences");
    });

    test("Details lists what deprecated a deprecated target", () => {
        const ulabel = make_ulabel({
            annotation: make_annotation({
                deprecated: true,
                deprecated_by: { human: true, confidence_filter: true, distance_from_row: false },
            }),
            focus_deprecated: true,
        });
        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Details");

        const rows = Array.from(menu_element().querySelectorAll(".ulabel-context-menu-detail")).map((row) => [
            row.querySelector(".ulabel-context-menu-detail-key").textContent,
            row.querySelector(".ulabel-context-menu-detail-value").textContent,
        ]);
        expect(rows).toContainEqual(["deprecated by", "human, confidence_filter"]);
    });
});

describe("context menu close", () => {
    test("hide clears the held hover and is a no-op when closed", () => {
        const ulabel = make_ulabel();
        hide_context_menu(ulabel);
        expect(ulabel.hide_and_clear_action_candidates).not.toHaveBeenCalled();

        show_context_menu(ulabel, "a0", 100, 100);
        hide_context_menu(ulabel);
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(menu_element().style.display).toBe("none");
        expect(menu_element().childElementCount).toBe(0);
        expect(ulabel.hide_and_clear_action_candidates).toHaveBeenCalledTimes(1);
        expect(ulabel.get_current_subtask().state.edit_candidate).toBeNull();
    });

    test("a mousedown inside the menu does not reach the document", () => {
        const ulabel = make_ulabel();
        show_context_menu(ulabel, "a0", 100, 100);
        const seen = jest.fn();
        document.addEventListener("mousedown", seen);
        menu_element().dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        document.removeEventListener("mousedown", seen);
        expect(seen).not.toHaveBeenCalled();
    });

    test("reopening reuses the single element", () => {
        const ulabel = make_ulabel();
        show_context_menu(ulabel, "a0", 100, 100);
        show_context_menu(ulabel, "a0", 200, 200);
        expect(document.querySelectorAll(".ulabel-context-menu").length).toBe(1);
        expect(menu_element().style.left).toBe("200px");
    });
});

describe("selection menu", () => {
    function make_selection_ulabel(options = {}) {
        const ulabel = make_ulabel(options);
        const subtask = ulabel.get_current_subtask();
        subtask.annotations.access.a1 = make_annotation({ id: "a1" });
        subtask.state.selected_ids = new Set(["a0", "a1"]);
        Object.assign(ulabel, {
            get_selected_annotation_ids: jest.fn(() => ["a0", "a1"]),
            _get_annotations_center: jest.fn(() => [20, 40]),
            copy_annotations_to_clipboard: jest.fn(() => ({ ulabel_annotation: 2, paste_counts: {} })),
            copy_annotations_to_subtask: jest.fn(() => ["n0", "n1"]),
            delete_selected_annotations: jest.fn(() => true),
            clear_selection: jest.fn(),
            run_action_batch: jest.fn((fn) => fn()),
            set_subtask: jest.fn(),
        });
        return ulabel;
    }

    test("right-clicking a selected annotation shows the bulk items", () => {
        const ulabel = make_selection_ulabel({ copy_targets: ["pred"] });
        expect(show_context_menu(ulabel, "a0", 100, 100)).toBe(true);
        expect(item_labels()).toEqual(["Change class of 2", "Copy 2 to Predictions", "Move 2 to Predictions", "Delete 2", "Isolate 2", "Clear selection"]);
    });

    test("a read-only subtask offers only Copy N to, Isolate N and Clear selection", () => {
        const ulabel = make_selection_ulabel({ read_only: true, copy_targets: ["pred"] });
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Copy 2 to Predictions", "Isolate 2", "Clear selection"]);
    });

    test("an unselected target gets the single-annotation menu", () => {
        const ulabel = make_selection_ulabel();
        ulabel.get_current_subtask().state.selected_ids = new Set(["a1", "a2"]);
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Change class", "Delete", "Isolate", "Details"]);
        // Shortcuts must not keep targeting the old selection
        expect(ulabel.clear_selection).toHaveBeenCalled();
    });

    test("a selected target keeps the selection", () => {
        const ulabel = make_selection_ulabel();
        show_context_menu(ulabel, "a0", 100, 100);
        expect(ulabel.clear_selection).not.toHaveBeenCalled();
    });

    test("bulk items call the bulk methods", () => {
        const ulabel = make_selection_ulabel({ copy_targets: ["pred"] });

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Change class of 2");
        expect(ulabel.show_id_dialog).toHaveBeenCalledWith(20, 40, "a0", false, ["a0", "a1"]);

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Move 2 to Predictions");
        expect(ulabel.copy_annotations_to_subtask).toHaveBeenCalledWith(["a0", "a1"], "main", "pred", true, true);
        expect(ulabel.copy_annotations_to_clipboard).toHaveBeenCalledWith(["a0", "a1"]);

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Delete 2");
        expect(ulabel.delete_selected_annotations).toHaveBeenCalled();

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Clear selection");
        expect(ulabel.clear_selection).toHaveBeenCalled();
        expect(is_context_menu_open(ulabel)).toBe(false);
    });

    test("under deprecated focus a deprecated selection offers Restore N of the restorable ones, in one batch", () => {
        const ulabel = make_selection_ulabel({ annotation: make_annotation({ deprecated: true }), focus_deprecated: true, copy_targets: ["pred"] });
        ulabel.get_current_subtask().annotations.access.a1.deprecated = true;
        ulabel.can_restore_annotation = jest.fn((id) => id === "a1");

        expect(show_context_menu(ulabel, "a0", 100, 100)).toBe(true);
        expect(item_labels()).toEqual(["Restore 1", "Isolate 2", "Clear selection"]);
        click_item("Restore 1");
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.run_action_batch).toHaveBeenCalledTimes(1);
        expect(ulabel.restore_annotation).toHaveBeenCalledTimes(1);
        expect(ulabel.restore_annotation).toHaveBeenCalledWith("a1");
    });

    test("under deprecated focus with nothing restorable there is no Restore", () => {
        const ulabel = make_selection_ulabel({ annotation: make_annotation({ deprecated: true }), focus_deprecated: true, can_restore: false });
        ulabel.get_current_subtask().annotations.access.a1.deprecated = true;

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Isolate 2", "Clear selection"]);
    });

    test("Isolate N isolates the selection; with exactly the selection isolated it reads Show all", () => {
        const ulabel = make_selection_ulabel();
        ulabel.isolate_annotations = jest.fn();

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toContain("Isolate 2");
        click_item("Isolate 2");
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.isolate_annotations).toHaveBeenCalledWith(["a0", "a1"]);

        ulabel.get_current_subtask().state.isolated_annids = ["a1", "a0"];
        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Show all");
        expect(ulabel.isolate_annotations).toHaveBeenLastCalledWith(null);

        // A wider isolation narrows to the selection
        ulabel.get_current_subtask().state.isolated_annids = ["a0", "a1", "a2"];
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toContain("Isolate 2");
    });

    test("Delete annotations from N counts distinct counterparts and runs one batch over the linked selection", () => {
        const ulabel = make_selection_ulabel({ read_only: true });
        ulabel.subtasks.review.read_only = true;
        // a0 and a1 share p1; only a0 has p2
        ulabel.find_counterparts.mockImplementation((annid, source_key, key) => {
            if (key !== "pred") return [];
            return annid === "a0" ? ["p1", "p2"] : ["p1"];
        });
        ulabel.delete_counterparts.mockReturnValue(["p1"]);

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Delete 2 annotations from Predictions", "Isolate 2", "Clear selection"]);
        expect(ulabel.find_counterparts).not.toHaveBeenCalledWith("a0", "main", "review");

        click_item("Delete 2 annotations from Predictions");
        expect(is_context_menu_open(ulabel)).toBe(false);
        expect(ulabel.run_action_batch).toHaveBeenCalledTimes(1);
        expect(ulabel.delete_counterparts.mock.calls).toEqual([
            ["a0", "main", "pred", false, false],
            ["a1", "main", "pred", false, false],
        ]);
    });

    test("Delete annotations from N with several targets opens a list with counts", () => {
        const ulabel = make_selection_ulabel();
        ulabel.find_counterparts.mockImplementation((annid, source_key, key) => (key === "pred" ? [`p_${annid}`] : (annid === "a1" ? ["r1"] : [])));

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Delete annotations from\u2026");
        expect(item_labels()).toEqual(["Predictions (2)", "Review"]);
        click_item("Review");
        expect(ulabel.delete_counterparts.mock.calls).toEqual([["a1", "main", "review", false, false]]);
    });

    test("Set class in N runs only the selected annotations whose counterparts would change", () => {
        const ulabel = make_selection_ulabel();
        ulabel.subtasks.review.read_only = true;
        ulabel.find_counterparts.mockImplementation((annid, source_key, key) => (key === "pred" ? [`p_${annid}`] : []));
        ulabel.get_counterpart_class_changes.mockImplementation((annid) => (annid === "a1" ? { p_a1: 2 } : {}));
        ulabel.set_counterparts_class.mockReturnValue(["p_a1"]);

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Change class of 2", "Set class in Predictions", "Delete 2 annotations from Predictions", "Delete 2", "Isolate 2", "Clear selection"]);

        click_item("Set class in Predictions");
        expect(ulabel.run_action_batch).toHaveBeenCalledTimes(1);
        expect(ulabel.set_counterparts_class.mock.calls).toEqual([["a1", "main", "pred", false]]);
    });

    test("Erase pixels from N takes only the selected bitmasks with bitmask counterparts", () => {
        const ulabel = make_selection_ulabel({ read_only: true, annotation: make_annotation({ spatial_type: "bitmask" }) });
        ulabel.subtasks.review.read_only = true;
        ulabel.subtasks.pred.annotations = { access: { p_a0: { spatial_type: "bitmask" }, p_a1: { spatial_type: "bitmask" } } };
        ulabel.find_counterparts.mockImplementation((annid, source_key, key) => (key === "pred" ? [`p_${annid}`] : []));

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Erase pixels from Predictions", "Delete 2 annotations from Predictions", "Isolate 2", "Clear selection"]);
        const titles = Array.from(menu_element().querySelectorAll(".ulabel-context-menu-item")).map((el) => el.title);
        expect(titles.slice(0, 2)).toEqual([
            "Erase the overlapping pixels from the linked annotation in Predictions; the rest of it stays.",
            "Delete 2 linked annotations from Predictions entirely.",
        ]);

        // a1 is a bbox, so only a0 is erased
        click_item("Erase pixels from Predictions");
        expect(ulabel.delete_counterparts.mock.calls).toEqual([["a0", "main", "pred", true, false]]);
    });

    test("paste_switch_to_target switches once, after the batch, and only when something changed", () => {
        const ulabel = make_selection_ulabel({ read_only: true });
        ulabel.subtasks.review.read_only = true;
        ulabel.config.paste_switch_to_target = true;
        ulabel.find_counterparts.mockImplementation((annid, source_key, key) => (key === "pred" ? [`p_${annid}`] : []));

        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Delete 2 annotations from Predictions");
        expect(ulabel.set_subtask).not.toHaveBeenCalled();

        ulabel.delete_counterparts.mockReturnValue(["p_a0"]);
        show_context_menu(ulabel, "a0", 100, 100);
        click_item("Delete 2 annotations from Predictions");
        expect(ulabel.set_subtask).toHaveBeenCalledTimes(1);
        expect(ulabel.set_subtask).toHaveBeenCalledWith("pred");
    });

    test("bulk merge items group options by label and apply each distinct option once", () => {
        const ulabel = make_selection_ulabel({ read_only: true });
        ulabel.subtasks.review.read_only = true;
        set_gt(ulabel, { g1: 2, g2: 2, c1: 1, c2: 1 });
        const info = (id, label, target_ids, conflict_ids = []) => ({ id, label, subtask_key: "pred", target_ids, conflict_ids });
        ulabel.get_merge_options.mockImplementation((annid) => [
            info(`s_${annid}`, "Merge into GT", ["g1"], annid === "a0" ? ["c1"] : ["c1", "c2"]),
            info("full", "Merge prediction into GT", ["g1", "g2"]),
        ]);

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual([
            "Merge into GT (2 merges, overlaps 2 Crop)\u2026",
            "Merge prediction into GT (2 merges, joins 2 Weed objects)",
            "Isolate 2",
            "Clear selection",
        ]);

        click_item("Merge into GT (2 merges, overlaps 2 Crop)\u2026");
        click_item("Allow overlap");
        click_item_after_reopen(ulabel, "Merge prediction into GT (2 merges, joins 2 Weed objects)");
        expect(ulabel.apply_merge_options.mock.calls).toEqual([
            [[{ annotation_id: "a0", option_id: "s_a0" }, { annotation_id: "a1", option_id: "s_a1" }], "none"],
            [[{ annotation_id: "a0", option_id: "full" }], "none"],
        ]);
    });
});

/** Give the "pred" subtask live bitmasks with the given class ids. */
function set_gt(ulabel, classes) {
    const access = {};
    for (const [id, class_id] of Object.entries(classes)) {
        access[id] = make_annotation({ id, spatial_type: "bitmask", classification_payloads: [{ class_id, confidence: 1 }] });
    }
    ulabel.subtasks.pred.annotations = { access };
}

function click_item_after_reopen(ulabel, label) {
    show_context_menu(ulabel, "a0", 100, 100);
    click_item(label);
}

describe("merge items", () => {
    const info = (id, label, target_ids, conflict_ids = []) => ({ id, label, subtask_key: "pred", target_ids, conflict_ids });
    // Read-only source with a0 and a1 selected
    const make_merge_selection = () => {
        const selection = make_ulabel({ read_only: true });
        selection.subtasks.review.read_only = true;
        selection.get_current_subtask().annotations.access.a1 = make_annotation({ id: "a1" });
        selection.get_current_subtask().state.selected_ids = new Set(["a0", "a1"]);
        Object.assign(selection, { get_selected_annotation_ids: jest.fn(() => ["a0", "a1"]), clear_selection: jest.fn(), run_action_batch: jest.fn((fn) => fn()) });
        return selection;
    };

    test("one item per option; a join notes the object count and shared class", () => {
        const ulabel = make_ulabel({ read_only: true });
        set_gt(ulabel, { g1: 2, g2: 2, g3: 2, g4: 1 });
        ulabel.get_merge_options.mockReturnValue([
            info("s", "Merge into GT", ["g1"]),
            info("p", "Merge prediction into GT", ["g1", "g2", "g3"]),
            info("m", "Merge mixed", ["g1", "g4"]),
        ]);

        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual([
            "Merge into GT",
            "Merge prediction into GT (joins 3 Weed objects)",
            "Merge mixed (joins 2 objects)",
            "Isolate",
            "Details",
        ]);
        expect(ulabel.get_merge_options).toHaveBeenCalledWith("a0");
        const items = Array.from(menu_element().querySelectorAll(".ulabel-context-menu-item"));
        expect(items[0].title).toBe("");
        expect(items[1].title).toBe("Joins 3 Weed objects into one.");

        click_item("Merge into GT");
        expect(ulabel.apply_merge_options).toHaveBeenCalledWith([{ annotation_id: "a0", option_id: "s" }], "none");
        expect(is_context_menu_open(ulabel)).toBe(false);
    });

    test("same-label alternatives stay separate for one annotation, and a selection takes the first per annotation", () => {
        const ulabel = make_ulabel({ read_only: true });
        ulabel.get_merge_options.mockReturnValue([info("m", "Merge into GT", ["g1"]), info("m2", "Merge into GT", ["g1"])]);
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Merge into GT", "Merge into GT", "Isolate", "Details"]);
        Array.from(menu_element().querySelectorAll(".ulabel-context-menu-item"))[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(ulabel.apply_merge_options).toHaveBeenLastCalledWith([{ annotation_id: "a0", option_id: "m2" }], "none");

        const selection = make_ulabel({ read_only: true });
        selection.subtasks.review.read_only = true;
        selection.get_current_subtask().annotations.access.a1 = make_annotation({ id: "a1" });
        selection.get_current_subtask().state.selected_ids = new Set(["a0", "a1"]);
        Object.assign(selection, { get_selected_annotation_ids: jest.fn(() => ["a0", "a1"]), clear_selection: jest.fn(), run_action_batch: jest.fn((fn) => fn()) });
        selection.get_merge_options.mockImplementation((annid) => [
            info(`${annid}_m`, "Merge into GT", ["g1"]),
            info(`${annid}_m2`, "Merge into GT", ["g1"]),
        ]);
        show_context_menu(selection, "a0", 100, 100);
        click_item("Merge into GT (2 merges)");
        expect(selection.apply_merge_options).toHaveBeenLastCalledWith(
            [{ annotation_id: "a0", option_id: "a0_m" }, { annotation_id: "a1", option_id: "a1_m" }],
            "none",
        );

        // The same label into different target subtasks splits per target, naming it
        selection.get_merge_options.mockImplementation((annid) => [
            { ...info(`${annid}_m`, "Merge into GT", ["g1"]), subtask_key: annid === "a0" ? "pred" : "review" },
        ]);
        show_context_menu(selection, "a0", 100, 100);
        expect(item_labels().slice(0, 2)).toEqual(["Merge into GT in Predictions (1 merge)", "Merge into GT in Review (1 merge)"]);
        click_item("Merge into GT in Review (1 merge)");
        expect(selection.apply_merge_options).toHaveBeenLastCalledWith([{ annotation_id: "a1", option_id: "a1_m" }], "none");
    });

    test("one annotation's duplicate options show once; a selection keeps every label", () => {
        const ulabel = make_ulabel({ read_only: true });
        ulabel.get_merge_options.mockReturnValue([
            info("s", "Merge into GT", []),
            { ...info("p", "Merge full prediction into GT", []), duplicate_of: "s" },
        ]);
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Merge into GT", "Isolate", "Details"]);
        expect(menu_element().querySelector(".ulabel-context-menu-item").title).toBe("Adds a new object.");

        const selection = make_merge_selection();
        selection.get_merge_options.mockImplementation((annid) => (annid === "a0" ?
                [info("s0", "Merge into GT", []), { ...info("p0", "Merge full prediction into GT", []), duplicate_of: "s0" }] :
                [info("s1", "Merge into GT", ["g1"]), info("p1", "Merge full prediction into GT", ["g1"])]));
        show_context_menu(selection, "a0", 100, 100);
        expect(item_labels().slice(0, 2)).toEqual(["Merge into GT (2 merges)", "Merge full prediction into GT (2 merges)"]);
        click_item("Merge full prediction into GT (2 merges)");
        expect(selection.apply_merge_options).toHaveBeenLastCalledWith(
            [{ annotation_id: "a0", option_id: "p0" }, { annotation_id: "a1", option_id: "p1" }],
            "none",
        );
    });

    test("a selection item notes the selected annotations it leaves out", () => {
        const selection = make_merge_selection();
        selection.get_merge_options.mockImplementation((annid) => (annid === "a0" ? [info("s0", "Merge into GT", [])] : []));
        show_context_menu(selection, "a0", 100, 100);
        expect(item_labels()[0]).toBe("Merge into GT (1 of 2 merges)");
        expect(menu_element().querySelector(".ulabel-context-menu-item").title).toBe(
            "Applies to 1 of the 2 selected; 1 has no such merge. Adds a new object.",
        );
    });

    test("a conflicting option names the overlapped classes and opens the overlap choices", () => {
        const ulabel = make_ulabel({ read_only: true });
        set_gt(ulabel, { g1: 2, g2: 2, c1: 1, c2: 1, c3: 2 });
        ulabel.get_merge_options.mockReturnValue([info("s", "Merge into GT", ["g1", "g2"], ["c1", "c3", "c2"])]);
        const label = "Merge into GT (joins 2 Weed objects, overlaps 2 Crop, 1 Weed)\u2026";

        for (const [choice, overlap] of [["Allow overlap", "none"], ["Exclude other objects", "exclude"], ["Overwrite other objects", "overwrite"]]) {
            show_context_menu(ulabel, "a0", 100, 100);
            expect(item_labels()).toEqual([label, "Isolate", "Details"]);
            expect(menu_element().querySelector(".ulabel-context-menu-item").title).toBe(
                "Joins 2 Weed objects into one. Overlaps other objects (2 Crop, 1 Weed); choose how to resolve.",
            );
            click_item(label);
            expect(item_labels()).toEqual(["Allow overlap", "Exclude other objects", "Overwrite other objects"]);
            expect(Array.from(menu_element().querySelectorAll(".ulabel-context-menu-item")).every((el) => el.title.startsWith("Merge into the target"))).toBe(true);
            expect(ulabel.apply_merge_options).not.toHaveBeenCalledWith(expect.anything(), overlap);
            click_item(choice);
            expect(ulabel.apply_merge_options).toHaveBeenLastCalledWith([{ annotation_id: "a0", option_id: "s" }], overlap);
        }
    });
});
