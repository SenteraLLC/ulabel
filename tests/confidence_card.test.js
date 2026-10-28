const { ULabel } = require("./testing-utils/build_loader");

describe.each([0.5, 0.666])("confidence card at dialog scale %s", (scale) => {
    test("clamps both sides, recenters, and hugs the containing box", () => {
        document.body.innerHTML = `
            <div id="annbox">
                <div id="global_edit_suggestion__st" style="width: 120px;">
                    <div id="global_annotation_confidence__st" style="width: 160px; height: 80px;"></div>
                </div>
            </div>
        `;
        const annbox = document.getElementById("annbox");
        annbox.getBoundingClientRect = () => ({ left: 125 });
        Object.defineProperties(annbox, {
            clientLeft: { value: 2 },
            clientWidth: { value: 400 },
        });
        annbox.scrollLeft = 200;
        annbox.scrollTop = 100;

        const subtask = {
            single_class_mode: false,
            annotations: {
                access: {
                    a0: { containing_box: { tlx: 200, tly: 200, brx: 300, bry: 300 } },
                },
            },
            state: {
                visible_dialogs: { global_edit_suggestion__st: {} },
            },
        };
        const ulabel = {
            config: { annbox_id: "annbox", image_width: 1000, image_height: 1000 },
            state: { zoom_val: 2 },
            subtasks: { st: subtask },
            get_current_subtask_key: () => "st",
            get_current_subtask: () => subtask,
            reposition_dialogs: jest.fn(),
            set_hovered_annotation: jest.fn(),
        };
        const dialog = document.getElementById("global_edit_suggestion__st");
        Object.defineProperty(dialog, "offsetWidth", { value: 120 });
        const card = document.getElementById("global_annotation_confidence__st");

        for (const [anchor_x, expected_shift] of [[137, 80], [517, -80], [327, 0]]) {
            dialog.getBoundingClientRect = () => ({
                left: anchor_x - 60 * scale,
                width: 120 * scale,
            });
            for (let repeat = 0; repeat < 3; repeat++) {
                ULabel.prototype.show_global_edit_suggestion.call(ulabel, "a0");

                const shift = Number.parseFloat(card.style.transform.match(/\+ ([-\d.]+)px/)[1]);
                expect(shift).toBeCloseTo(expected_shift);
                // Half the box's on-screen height (100 * zoom 2 / 2) plus the gap, in local units
                expect(Number.parseFloat(card.style.bottom)).toBeCloseTo((100 + 10) / scale);
            }
        }

        subtask.annotations.access.a0.containing_box = { tlx: 200, tly: 50, brx: 300, bry: 60 };
        ULabel.prototype.show_global_edit_suggestion.call(ulabel, "a0");
        expect(Number.parseFloat(card.style.top)).toBeCloseTo((10 + 10) / scale);
    });
});

describe("class confidences on the card and the pie", () => {
    const classes = [
        { name: "Crop", id: 1, color: "green" },
        { name: "Weed", id: 2, color: "red" },
        { name: "Sedge", id: 3, color: "blue" },
    ];

    function make_ulabel(classification_payloads, extra_config = {}) {
        // Same structure as build_confidence_dialog's card
        document.body.innerHTML = `
            <div id="global_annotation_confidence__st">
                <p class="annotation-confidence-classname"></p>
                <p class="annotation-confidence-value"></p>
                <div class="annotation-confidence-others" style="display: none;"></div>
                <div class="annotation-confidence-host-text" style="display: none;"></div>
            </div>
        `;
        const ulabel = new ULabel({
            container_id: "container",
            image_data: "test.jpg",
            username: "test_user",
            submit_buttons: [{ name: "Submit", hook: jest.fn() }],
            subtasks: {
                st: {
                    display_name: "A",
                    classes,
                    allowed_modes: ["bbox"],
                    resume_from: [{
                        id: "a0",
                        spatial_type: "bbox",
                        spatial_payload: [[0, 0], [10, 10]],
                        classification_payloads,
                    }],
                },
            },
            ...extra_config,
        });
        ulabel.state.current_subtask = "st";
        ulabel.subtasks.st.state.edit_candidate = { annid: "a0" };
        return ulabel;
    }

    function card_text(selector) {
        return document.querySelector(`#global_annotation_confidence__st ${selector}`);
    }

    function runner_ups() {
        return Array.from(card_text(".annotation-confidence-others").children).map((el) => el.textContent);
    }

    const soft = [{ class_id: 1, confidence: 0.1 }, { class_id: 2, confidence: 0.6 }, { class_id: 3, confidence: 0.3 }];

    test("the card shows only the top class by default", () => {
        const ulabel = make_ulabel(soft);
        ulabel.update_confidence_dialog();

        expect(card_text(".annotation-confidence-classname").textContent).toBe("Weed");
        expect(card_text(".annotation-confidence-value").textContent).toBe("Confidence: 0.60");
        expect(runner_ups()).toEqual([]);
        expect(card_text(".annotation-confidence-others").style.display).toBe("none");
    });

    test("confidence_card_classes adds non-zero runner-ups, highest first", () => {
        const ulabel = make_ulabel(soft, { confidence_card_classes: 3 });
        ulabel.update_confidence_dialog();
        expect(runner_ups()).toEqual(["Sedge: 0.30", "Crop: 0.10"]);
        expect(card_text(".annotation-confidence-others").style.display).toBe("block");

        ulabel.config.confidence_card_classes = 2;
        ulabel.update_confidence_dialog();
        expect(runner_ups()).toEqual(["Sedge: 0.30"]);

        ulabel.subtasks.st.annotations.access.a0.classification_payloads = [
            { class_id: 1, confidence: 0 }, { class_id: 2, confidence: 1 }, { class_id: 3, confidence: 0 },
        ];
        ulabel.update_confidence_dialog();
        expect(runner_ups()).toEqual([]);
        expect(card_text(".annotation-confidence-others").style.display).toBe("none");
    });

    test("hovering a pie wedge shows its class name in the centre", () => {
        const ulabel = make_ulabel(soft);
        const state = ulabel.subtasks.st.state;
        // Same centre label get_idd_string renders
        document.body.insertAdjacentHTML("beforeend", `<div id="${state.idd_id}"><div class="centcirc"><span class="idd-class-name"></span></div></div>`);
        state.idd_which = "back";
        ulabel.update_id_dialog_display = jest.fn();
        const label = () => document.querySelector(`#${state.idd_id} .idd-class-name`).textContent;

        ulabel.handle_id_dialog_hover({}, { class_ind: 1, dist_prop: 1 });
        expect(label()).toBe("Weed");
        ulabel.handle_id_dialog_hover({}, { class_ind: 2, dist_prop: 1 });
        expect(label()).toBe("Sedge");
        ulabel.set_id_dialog_class_name("");
        expect(label()).toBe("");
    });

    function host_lines() {
        return Array.from(card_text(".annotation-confidence-host-text").children).map((el) => el.textContent);
    }

    test("hover_card_text adds plain-text lines, at most 5", () => {
        const hover_card_text = jest.fn((annotation, subtask_key) => [`${subtask_key}:${annotation.id}`, "<b>x</b>", null, "", 3, "a", "b", "c"]);
        const ulabel = make_ulabel(soft, { hover_card_text });
        ulabel.update_confidence_dialog();

        expect(hover_card_text).toHaveBeenCalledWith(ulabel.subtasks.st.annotations.access.a0, "st");
        expect(host_lines()).toEqual(["st:a0", "<b>x</b>", "3", "a", "b"]);
        expect(card_text(".annotation-confidence-host-text").querySelector("b")).toBeNull();
        expect(card_text(".annotation-confidence-host-text").style.display).toBe("block");
    });

    test("hover_card_text accepts a single string and hides the block for null", () => {
        let result = "Prediction: Weed";
        const ulabel = make_ulabel(soft, { hover_card_text: () => result });
        ulabel.update_confidence_dialog();
        expect(host_lines()).toEqual(["Prediction: Weed"]);

        result = null;
        ulabel.clear_hover_card_text_cache();
        ulabel.update_confidence_dialog();
        expect(host_lines()).toEqual([]);
        expect(card_text(".annotation-confidence-host-text").style.display).toBe("none");
    });

    test("hover_card_text is called once per hover, and again after the hover ends or the annotation is replaced", () => {
        const hover_card_text = jest.fn(() => "info");
        const ulabel = make_ulabel(soft, { hover_card_text });
        ulabel.update_confidence_dialog();
        ulabel.update_confidence_dialog();
        expect(hover_card_text).toHaveBeenCalledTimes(1);

        ulabel.hide_global_edit_suggestion();
        ulabel.update_confidence_dialog();
        expect(hover_card_text).toHaveBeenCalledTimes(2);

        // set_annotations swaps in a new object under the same id
        const access = ulabel.subtasks.st.annotations.access;
        access.a0 = { ...access.a0 };
        ulabel.update_confidence_dialog();
        expect(hover_card_text).toHaveBeenCalledTimes(3);
    });

    test("a throwing hover_card_text is logged and shows no extra text", () => {
        const warn_spy = jest.spyOn(console, "warn").mockImplementation(() => {});
        const ulabel = make_ulabel(soft, { hover_card_text: () => {
            throw new Error("boom");
        } });
        ulabel.update_confidence_dialog();

        expect(host_lines()).toEqual([]);
        expect(card_text(".annotation-confidence-classname").textContent).toBe("Weed");
        expect(warn_spy).toHaveBeenCalledWith(expect.stringContaining("boom"));
        warn_spy.mockRestore();
    });
});
