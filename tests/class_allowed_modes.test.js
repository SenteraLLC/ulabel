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
