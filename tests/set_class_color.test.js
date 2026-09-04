// Unit tests for the public set_class_color API and RecolorActive's use of it
const { ULabel } = require("./testing-utils/build_loader");

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        st: {
            display_name: "A",
            classes: [
                { name: "Crop", id: 1, color: "green" },
                { name: "Weed", id: 2, color: "red" },
            ],
            allowed_modes: ["bbox"],
            resume_from: null,
        },
    },
};

// The DOM surfaces set_class_color syncs: the toolbox swatch and the
// id-dialog containers the pies are rebuilt into.
function scaffold_dom(ulabel) {
    document.body.innerHTML = `
        <div id="${ulabel.config.toolbox_id}_sel_1"><div style="background-color: green;"></div></div>
        <div id="dialogs__st"></div>
        <div id="front_dialogs__st"></div>
    `;
}

describe("set_class_color", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("writes color_info", () => {
        const ulabel = new ULabel(mock_config);
        scaffold_dom(ulabel);

        ulabel.set_class_color(1, "#123456", false);

        expect(ulabel.color_info[1]).toBe("#123456");
    });

    test("syncs the toolbox swatch", () => {
        const ulabel = new ULabel(mock_config);
        scaffold_dom(ulabel);

        ulabel.set_class_color(1, "rgb(18, 52, 86)", false);

        const swatch = document.querySelector(`#${ulabel.config.toolbox_id}_sel_1 > div`);
        expect(swatch.style.backgroundColor).toBe("rgb(18, 52, 86)");
    });

    test("rebuilds both id-dialog pies without duplicating them", () => {
        const ulabel = new ULabel(mock_config);
        scaffold_dom(ulabel);
        const idd_id = ulabel.subtasks.st.state.idd_id;
        const idd_id_front = ulabel.subtasks.st.state.idd_id_front;

        ulabel.set_class_color(1, "#123456", false);
        ulabel.set_class_color(2, "#654321", false);

        expect(document.querySelectorAll(`[id="${idd_id}"]`)).toHaveLength(1);
        expect(document.querySelectorAll(`[id="${idd_id_front}"]`)).toHaveLength(1);
        // The rebuilt pie html carries the new colors
        expect(document.getElementById(idd_id).innerHTML).toContain("#123456");
        expect(document.getElementById(idd_id).innerHTML).toContain("#654321");
    });

    test("redraw flag controls the redraw", () => {
        const ulabel = new ULabel(mock_config);
        scaffold_dom(ulabel);
        ulabel.redraw_all_annotations = jest.fn();

        ulabel.set_class_color(1, "#123456", false);
        expect(ulabel.redraw_all_annotations).not.toHaveBeenCalled();

        ulabel.set_class_color(1, "#abcdef");
        expect(ulabel.redraw_all_annotations).toHaveBeenCalledTimes(1);
    });
});
