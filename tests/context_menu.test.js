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

function make_ulabel({ read_only = false, compatible = [1, 2], annotation = make_annotation() } = {}) {
    document.body.innerHTML = `<div id="container"></div>`;
    const subtask = {
        read_only,
        class_defs: [{ id: 1, name: "Crop" }, { id: 2, name: "Weed" }],
        annotations: { access: { [annotation.id]: annotation } },
        state: { edit_candidate: { annid: annotation.id }, move_candidate: null },
    };
    const ulabel = {
        config: { container_id: "container" },
        state: { context_menu_annid: null },
        get_current_subtask: () => subtask,
        is_current_subtask_read_only: () => read_only,
        _get_compatible_class_ids: jest.fn(() => compatible),
        show_id_dialog: jest.fn(),
        delete_annotation: jest.fn(),
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
    test("editable subtask with compatible classes shows all three", () => {
        const ulabel = make_ulabel();
        expect(show_context_menu(ulabel, "a0", 100, 100)).toBe(true);
        expect(item_labels()).toEqual(["Change class", "Delete", "Details"]);
        expect(is_context_menu_open(ulabel)).toBe(true);
        expect(menu_element().style.display).toBe("block");
    });

    test("fewer than two compatible classes hides Change class", () => {
        const ulabel = make_ulabel({ compatible: [2] });
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Delete", "Details"]);
    });

    test("read-only subtask shows only Details", () => {
        const ulabel = make_ulabel({ read_only: true });
        show_context_menu(ulabel, "a0", 100, 100);
        expect(item_labels()).toEqual(["Details"]);
    });

    test("unknown or deprecated target opens nothing", () => {
        const ulabel = make_ulabel();
        expect(show_context_menu(ulabel, "missing", 100, 100)).toBe(false);
        expect(is_context_menu_open(ulabel)).toBe(false);

        const deprecated = make_ulabel({ annotation: make_annotation({ deprecated: true }) });
        expect(show_context_menu(deprecated, "a0", 100, 100)).toBe(false);
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
            ["type", "bbox"],
            ["edited by", "annotator"],
            ["edited at", "2026-09-28T00:00:00Z"],
            ["source", "<b>model</b>"],
            ["nested", "{\"a\":1}"],
        ]);
        expect(menu_element().querySelector("b")).toBeNull();
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
