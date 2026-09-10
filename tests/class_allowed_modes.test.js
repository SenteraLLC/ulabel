// Unit tests for per-class allowed_modes: the binding that stops a class being
// drawn as the wrong spatial type in a multi-class subtask.
const { ULabel } = require("./testing-utils/build_loader");
const { findAllClassDefinitions } = require("../build/annotation_operators");

function make_config(classes, allowed_modes = ["bbox", "polygon", "polyline"]) {
    return {
        container_id: "container",
        image_data: "test.jpg",
        username: "test_user",
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            st: {
                display_name: "A",
                classes,
                allowed_modes,
                resume_from: null,
            },
        },
    };
}

const CROP = { name: "Crop", id: 1, color: "green", allowed_modes: ["bbox"] };
const ROW = { name: "Row", id: 2, color: "red", allowed_modes: ["polyline"] };
const ANY = { name: "Any", id: 3, color: "blue" };

// `current_subtask` is only set by init()/set_subtask, which need a real DOM.
function make_ulabel(config) {
    const ulabel = new ULabel(config);
    ulabel.state.current_subtask = "st";
    return ulabel;
}

// The mode buttons the sync drives, plus the class buttons it reads through.
function scaffold_dom(modes = ["bbox", "polygon", "polyline"]) {
    document.body.innerHTML = modes
        .map((mode) => `<a id="md-btn--${mode}" class="md-btn"></a>`)
        .join("");
}

function is_hidden(mode) {
    return document.getElementById(`md-btn--${mode}`).style.display === "none";
}

// Point the subtask at a class without going through the toolbox DOM.
function activate_class(ulabel, class_id) {
    const idx = ulabel.subtasks.st.class_ids.indexOf(class_id);
    ulabel.subtasks.st.state.id_payload = ulabel.subtasks.st.class_ids.map((id, i) => ({
        class_id: id,
        confidence: i === idx ? 1 : 0,
    }));
}

describe("per-class allowed_modes", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("is recorded on the class definition", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));

        expect(ulabel.subtasks.st.class_defs[0].allowed_modes).toEqual(["bbox"]);
        expect(ulabel.subtasks.st.class_defs[1].allowed_modes).toEqual(["polyline"]);
    });

    test("a class without it inherits the subtask's modes", () => {
        const ulabel = make_ulabel(make_config([CROP, ANY]));

        expect(ulabel.get_class_allowed_modes(3)).toEqual(["bbox", "polygon", "polyline"]);
    });

    test("cannot widen past the subtask's modes", () => {
        const ulabel = make_ulabel(make_config(
            [{ name: "Crop", id: 1, color: "green", allowed_modes: ["bbox", "bitmask"] }],
            ["bbox", "polygon"],
        ));

        expect(ulabel.get_class_allowed_modes(1)).toEqual(["bbox"]);
    });

    test("falls back to the subtask when every declared mode is invalid", () => {
        const ulabel = make_ulabel(make_config(
            [{ name: "Crop", id: 1, color: "green", allowed_modes: ["bitmask"] }],
            ["bbox", "polygon"],
        ));

        expect(ulabel.get_class_allowed_modes(1)).toEqual(["bbox", "polygon"]);
    });
});

describe("sync_annotation_modes_to_active_class", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("hides the modes the active class disallows", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        scaffold_dom();
        activate_class(ulabel, 1);

        ulabel.sync_annotation_modes_to_active_class();

        expect(is_hidden("bbox")).toBe(false);
        expect(is_hidden("polygon")).toBe(true);
        expect(is_hidden("polyline")).toBe(true);
    });

    test("restores every mode for a class that doesn't narrow", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        scaffold_dom();
        activate_class(ulabel, 1);
        ulabel.sync_annotation_modes_to_active_class();

        activate_class(ulabel, 3);
        ulabel.sync_annotation_modes_to_active_class();

        expect(is_hidden("bbox")).toBe(false);
        expect(is_hidden("polygon")).toBe(false);
        expect(is_hidden("polyline")).toBe(false);
    });

    test("switches away from a mode the active class disallows", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        scaffold_dom();
        ulabel.subtasks.st.state.annotation_mode = "polygon";
        activate_class(ulabel, 2);
        const clicked = [];
        for (const mode of ["bbox", "polygon", "polyline"]) {
            document.getElementById(`md-btn--${mode}`).addEventListener("click", () => clicked.push(mode));
        }

        ulabel.sync_annotation_modes_to_active_class();

        expect(clicked).toEqual(["polyline"]);
    });

    test("leaves an already-allowed mode alone", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        scaffold_dom();
        ulabel.subtasks.st.state.annotation_mode = "bbox";
        activate_class(ulabel, 1);
        const clicked = [];
        document.getElementById("md-btn--bbox").addEventListener("click", () => clicked.push("bbox"));

        ulabel.sync_annotation_modes_to_active_class();

        expect(clicked).toEqual([]);
    });
});

describe("set_and_update_annotation_mode", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("rejects a mode the active class disallows", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        scaffold_dom();
        activate_class(ulabel, 1);

        expect(ulabel.set_and_update_annotation_mode("polygon")).toBe(false);
    });

    test("still accepts a mode the active class allows", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        scaffold_dom();
        activate_class(ulabel, 1);

        expect(ulabel.set_and_update_annotation_mode("bbox")).toBe(true);
    });

    test("still rejects a mode the subtask disallows", () => {
        const ulabel = make_ulabel(make_config([ANY], ["bbox"]));
        scaffold_dom(["bbox"]);

        expect(ulabel.set_and_update_annotation_mode("polygon")).toBe(false);
    });
});

describe("findAllClassDefinitions", () => {
    test("filters by the class's modes, not just the subtask's", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));

        const names = findAllClassDefinitions(ulabel, ["polyline"]).map((def) => def.name);

        // Crop is bbox-only, so it drops out even though the subtask allows polyline
        expect(names).toEqual(["Row", "Any"]);
    });

    test("returns every class when no modes are given", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));

        const names = findAllClassDefinitions(ulabel).map((def) => def.name);

        expect(names).toEqual(["Crop", "Row", "Any"]);
    });
});

describe("reclassification gate", () => {
    // A polyline Row annotation: Crop (bbox-only) must refuse it
    function load_polyline(ulabel) {
        const annotation = {
            id: "row0",
            spatial_type: "polyline",
            spatial_payload: [[0, 0], [10, 10]],
            classification_payloads: [
                { class_id: 1, confidence: 0 },
                { class_id: 2, confidence: 1 },
                { class_id: 3, confidence: 0 },
            ],
            deprecated: false,
        };
        ulabel.subtasks.st.annotations = {
            access: { row0: annotation },
            ordering: ["row0"],
        };
        return annotation;
    }

    function make_gated_ulabel() {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        ulabel.assign_annotation_id = jest.fn();
        return ulabel;
    }

    test("blocks an explicit reclass to a class that disallows the spatial type", () => {
        const ulabel = make_gated_ulabel();
        load_polyline(ulabel);

        // Crop is index 0 (bbox only)
        ulabel.handle_id_dialog_click(null, "row0", 0);

        expect(ulabel.assign_annotation_id).not.toHaveBeenCalled();
    });

    test("allows a reclass the class's modes permit", () => {
        const ulabel = make_gated_ulabel();
        load_polyline(ulabel);

        // Any inherits the subtask's modes, which include polyline
        ulabel.handle_id_dialog_click(null, "row0", 2);

        expect(ulabel.assign_annotation_id).toHaveBeenCalledWith("row0");
    });

    test("blocks a pie click resolved from the mouse position", () => {
        const ulabel = make_gated_ulabel();
        load_polyline(ulabel);
        ulabel.subtasks.st.state.idd_associated_annotation = "row0";
        // Wedge under the cursor is Crop
        ulabel.lookup_id_dialog_mouse_pos = jest.fn().mockReturnValue({ class_ind: 0, dist_prop: 1.0 });

        ulabel.handle_id_dialog_click({});

        expect(ulabel.assign_annotation_id).not.toHaveBeenCalled();
    });

    test("a pie click assigns the clicked wedge, not the stale hovered payload", () => {
        const ulabel = make_gated_ulabel();
        load_polyline(ulabel);
        ulabel.subtasks.st.state.idd_associated_annotation = "row0";
        // Stale hover left the payload pointing at Crop; the click lands on Any
        activate_class(ulabel, 1);
        ulabel.lookup_id_dialog_mouse_pos = jest.fn().mockReturnValue({ class_ind: 2, dist_prop: 1.0 });

        ulabel.handle_id_dialog_click({});

        expect(ulabel.assign_annotation_id).toHaveBeenCalled();
        const payload = ulabel.subtasks.st.state.id_payload;
        expect(payload.find((p) => p.class_id === 3).confidence).toBe(1);
        expect(payload.find((p) => p.class_id === 1).confidence).toBe(0);
    });

    test("a pie click outside every wedge is a no-op", () => {
        const ulabel = make_gated_ulabel();
        load_polyline(ulabel);
        ulabel.subtasks.st.state.idd_associated_annotation = "row0";
        ulabel.lookup_id_dialog_mouse_pos = jest.fn().mockReturnValue(null);

        ulabel.handle_id_dialog_click({});

        expect(ulabel.assign_annotation_id).not.toHaveBeenCalled();
    });

    test("a dialog click with no associated annotation is a safe no-op", () => {
        const ulabel = make_gated_ulabel();
        load_polyline(ulabel);
        ulabel.subtasks.st.state.idd_associated_annotation = null;

        expect(() => ulabel.handle_id_dialog_click({})).not.toThrow();
        expect(ulabel.assign_annotation_id).not.toHaveBeenCalled();
    });

    test("undo/redo path stays ungated", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        const annotation = load_polyline(ulabel);
        // Replaying redraws the annotation and toolbox; only the gate bypass is under test
        ulabel.redraw_annotation = jest.fn();
        ulabel.toolbox = { redraw_update_items: jest.fn() };

        // Replaying history writes the payload regardless of class modes
        ulabel.assign_annotation_id("row0", {
            old_id_payload: annotation.classification_payloads,
            new_id_payload: [
                { class_id: 1, confidence: 1 },
                { class_id: 2, confidence: 0 },
                { class_id: 3, confidence: 0 },
            ],
        });

        expect(annotation.classification_payloads[0].confidence).toBe(1);
    });
});

describe("pie class exclusion", () => {
    function load_annotation(ulabel, spatial_type) {
        const annotation = {
            id: "a0",
            spatial_type,
            spatial_payload: [[0, 0], [10, 10]],
            classification_payloads: [
                { class_id: 1, confidence: 0 },
                { class_id: 2, confidence: 1 },
                { class_id: 3, confidence: 0 },
            ],
            deprecated: false,
        };
        ulabel.subtasks.st.annotations = {
            access: { a0: annotation },
            ordering: ["a0"],
        };
        return annotation;
    }

    // show_id_dialog's non-suppressed path needs the reid button + dialog DOM
    function scaffold_dialog_dom(ulabel) {
        const idd_id = ulabel.subtasks.st.state.idd_id;
        const idd_id_front = ulabel.subtasks.st.state.idd_id_front;
        document.body.innerHTML = `
            <div id="dialogs__st"><div id="${idd_id}" class="id_dialog"></div></div>
            <div id="front_dialogs__st"><div id="${idd_id_front}" class="id_dialog"></div></div>
            <div id="global_edit_suggestion__st"><a class="reid_suggestion global_sub_suggestion"></a></div>
        `;
    }

    test("the pie only offers classes compatible with the annotation", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        load_annotation(ulabel, "polyline");
        scaffold_dialog_dom(ulabel);

        ulabel.show_id_dialog(10, 10, "a0", true);

        // Crop (bbox-only) is excluded; Row and Any remain
        expect(ulabel.subtasks.st.state.idd_displayed_class_ids).toEqual([2, 3]);
        const idd_id = ulabel.subtasks.st.state.idd_id;
        expect(document.querySelector(`#${idd_id}__circ_1`)).toBeNull();
        expect(document.querySelector(`#${idd_id}__circ_2`)).not.toBeNull();
        expect(ulabel.subtasks.st.state.idd_visible).toBe(true);
    });

    test("no dialog appears when only one class can take the type", () => {
        // Crop is the only bbox-capable class here
        const ulabel = make_ulabel(make_config([CROP, ROW], ["bbox", "polyline"]));
        load_annotation(ulabel, "bbox");
        scaffold_dialog_dom(ulabel);

        ulabel.show_id_dialog(10, 10, "a0", true);

        expect(ulabel.subtasks.st.state.idd_visible).toBe(false);
    });

    test("wedge hit-testing maps back to the full class list", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        load_annotation(ulabel, "polyline");
        // Pie shows [2, 3]; the wedge math must return full-list indices
        ulabel.subtasks.st.state.idd_displayed_class_ids = [2, 3];
        const idd_id = ulabel.subtasks.st.state.idd_id;
        document.body.innerHTML = `<div id="${idd_id}" style="width: 200px; height: 200px;"></div>`;
        const dialog = document.getElementById(idd_id);
        dialog.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 });

        // Hover on the right side of the ring (angle 0 -> first wedge = class 2)
        const pos_evt = ulabel.lookup_id_dialog_mouse_pos({ pageX: 180, pageY: 100 }, false);

        expect(pos_evt).not.toBeNull();
        // class 2 sits at index 1 of the full class list
        expect(pos_evt.class_ind).toBe(1);
    });

    test("the button ring collapses like single-class mode when nothing can be reassigned", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        // bbox: only Crop and Any qualify (2 targets); polyline: Row and Any (2 targets);
        // narrow Any to make bbox single-target
        ulabel.subtasks.st.class_defs[2].allowed_modes = ["polyline"];
        const annotation = load_annotation(ulabel, "bbox");
        annotation.classification_payloads = [
            { class_id: 1, confidence: 1 },
            { class_id: 2, confidence: 0 },
            { class_id: 3, confidence: 0 },
        ];
        annotation.containing_box = { tlx: 0, tly: 0, brx: 10, bry: 10 };
        document.body.innerHTML = `
            <div id="global_edit_suggestion__st" class="global_edit_suggestion mcm">
                <a class="move_suggestion global_sub_suggestion"></a>
                <a class="reid_suggestion global_sub_suggestion"></a>
                <a class="delete_suggestion global_sub_suggestion"></a>
            </div>
        `;
        ulabel.subtasks.st.state.visible_dialogs["global_edit_suggestion__st"] = { left: 0, top: 0, pin: "center" };
        ulabel.config.image_width = 100;
        ulabel.config.image_height = 100;

        // bbox can only be Crop -> compact ring, no reid button
        ulabel.show_global_edit_suggestion("a0");

        const container = document.getElementById("global_edit_suggestion__st");
        expect(container.classList.contains("mcm")).toBe(false);
        expect(document.querySelector("a.reid_suggestion").style.display).toBe("none");
    });

    test("a thumbnail from the previous hover hides when the next annotation has no targets", () => {
        const ulabel = make_ulabel(make_config([CROP, ROW, ANY]));
        ulabel.subtasks.st.class_defs[2].allowed_modes = ["polyline"];
        const annotation = load_annotation(ulabel, "bbox");
        annotation.classification_payloads = [{ class_id: 1, confidence: 1 }];
        annotation.containing_box = { tlx: 0, tly: 0, brx: 10, bry: 10 };
        document.body.innerHTML = `<div id="global_edit_suggestion__st" class="global_edit_suggestion mcm"></div>`;
        ulabel.subtasks.st.state.visible_dialogs["global_edit_suggestion__st"] = { left: 0, top: 0, pin: "center" };
        ulabel.config.image_width = 100;
        ulabel.config.image_height = 100;
        // A pie left visible by the previously hovered annotation
        ulabel.subtasks.st.state.idd_visible = true;
        ulabel.subtasks.st.state.idd_associated_annotation = "other";

        ulabel.show_global_edit_suggestion("a0");

        expect(ulabel.subtasks.st.state.idd_visible).toBe(false);
        expect(ulabel.subtasks.st.state.idd_associated_annotation).toBeNull();
    });
});

describe("load-time class/type validation", () => {
    test("warns when an imported annotation's class disallows its spatial type", () => {
        const config = make_config([CROP, ROW, ANY]);
        // A polyline claiming to be Crop (bbox-only)
        config.subtasks.st.resume_from = [{
            spatial_type: "polyline",
            spatial_payload: [[0, 0], [10, 10]],
            classification_payloads: [{ class_id: 1, confidence: 1 }],
        }];

        const ulabel = new ULabel(config);

        // Warn, never drop: the data must round-trip on export
        expect(ulabel.subtasks.st.annotations.ordering).toHaveLength(1);
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("does not allow"));
    });

    test("stays quiet for a compatible import", () => {
        const config = make_config([CROP, ROW, ANY]);
        config.subtasks.st.resume_from = [{
            spatial_type: "polyline",
            spatial_payload: [[0, 0], [10, 10]],
            classification_payloads: [{ class_id: 2, confidence: 1 }],
        }];

        new ULabel(config);

        expect(console.warn).not.toHaveBeenCalled();
    });
});
