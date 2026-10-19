// Unit tests for set_subtask_opacity, the runtime layer-dimming API
const { ULabel } = require("./testing-utils/build_loader");

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        st: {
            display_name: "A",
            classes: [{ name: "Crop", id: 1, color: "green" }],
            allowed_modes: ["bbox"],
            resume_from: null,
        },
    },
};

// The two nodes the opacity API drives: the toolbox slider and the canvas group.
function scaffold_dom() {
    document.body.innerHTML = `
        <input id="tb-st-range--st" type="range" min=0 max=100 value=100 />
        <div id="canvasses__st"></div>
    `;
}

function canvas_opacity() {
    return document.getElementById("canvasses__st").style.opacity;
}

function slider_value() {
    return document.getElementById("tb-st-range--st").value;
}

describe("set_subtask_opacity", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("dims the subtask's canvases", () => {
        const ulabel = new ULabel(mock_config);
        scaffold_dom();

        ulabel.set_subtask_opacity("st", 0.25);

        expect(canvas_opacity()).toBe("0.25");
    });

    test("keeps the toolbox slider in sync", () => {
        const ulabel = new ULabel(mock_config);
        scaffold_dom();

        ulabel.set_subtask_opacity("st", 0.25);

        expect(slider_value()).toBe("25");
    });

    test("clamps out of range values", () => {
        const ulabel = new ULabel(mock_config);
        scaffold_dom();

        ulabel.set_subtask_opacity("st", 4);
        expect(canvas_opacity()).toBe("1");

        ulabel.set_subtask_opacity("st", -1);
        expect(canvas_opacity()).toBe("0");
    });

    test("ignores an unknown subtask key", () => {
        const ulabel = new ULabel(mock_config);
        scaffold_dom();

        expect(() => ulabel.set_subtask_opacity("nope", 0.5)).not.toThrow();
        expect(canvas_opacity()).toBe("");
    });

    test("survives the slider reset a subtask switch performs", () => {
        const ulabel = new ULabel(mock_config);
        scaffold_dom();

        ulabel.set_subtask_opacity("st", 0.4);

        // What set_subtask does to a subtask that is no longer current
        const reset = Math.round(100 * ulabel.subtasks.st.inactive_opacity);
        document.getElementById("tb-st-range--st").value = reset;
        ulabel.readjust_subtask_opacities();

        expect(canvas_opacity()).toBe("0.4");
    });
});
