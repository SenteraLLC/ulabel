const { ULabel } = require("./testing-utils/build_loader");

describe.each([0.5, 0.666])("confidence card at dialog scale %s", (scale) => {
    test.each([false, true])("clamps both sides and recenters with read_only=%s", (read_only) => {
        document.body.innerHTML = `
            <div id="annbox">
                <div id="global_edit_suggestion__st" style="width: 120px;">
                    <a class="global_sub_suggestion" style="height: 60px;"></a>
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
            is_current_subtask_read_only: () => read_only,
            _get_compatible_class_ids: () => [1],
            reposition_dialogs: jest.fn(),
            set_hovered_annotation: jest.fn(),
            hide_id_dialog: jest.fn(),
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
                expect(Number.parseFloat(card.style.bottom)).toBeCloseTo(30 + 10 / scale);
            }
        }

        subtask.annotations.access.a0.containing_box = { tlx: 200, tly: 50, brx: 300, bry: 60 };
        ULabel.prototype.show_global_edit_suggestion.call(ulabel, "a0");
        expect(Number.parseFloat(card.style.top)).toBeCloseTo(30 + 10 / scale);
    });
});
