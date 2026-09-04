// Unit tests for the ClassCounter toolbox item
// NOTE: require `configuration` before `toolbox` so the `ToolboxItem` base class is
// initialized before `ClassCounterToolboxItem extends ToolboxItem` evaluates (see the
// circular-import note in confidence_slider.test.js).
require("../build/configuration");
const { ClassCounterToolboxItem } = require("../build/toolbox");

let next_id = 0;

function make_annotation(class_id, extra = {}) {
    return {
        id: `anno_${next_id++}`,
        spatial_type: "bbox",
        classification_payloads: [{ class_id, confidence: 1.0 }],
        deprecated: false,
        ...extra,
    };
}

function make_subtask(display_name, class_defs, annotations) {
    const access = {};
    const ordering = [];
    for (const annotation of annotations) {
        access[annotation.id] = annotation;
        ordering.push(annotation.id);
    }
    return {
        display_name,
        class_defs,
        class_ids: class_defs.map((class_def) => class_def.id),
        annotations: { access, ordering },
    };
}

function make_ulabel(subtasks, current_subtask, config = {}) {
    return {
        config: { class_counter_toolbox_item: config, toolbox_id: "toolbox" },
        subtasks,
        get_current_subtask_key: () => current_subtask,
    };
}

const CROP = { name: "Crop", id: 1, color: "green" };
const WEED = { name: "Weed", id: 2, color: "red" };

describe("ClassCounterToolboxItem", () => {
    describe("current behavior (backfill)", () => {
        test("counts the current subtask's annotations per class", () => {
            const ulabel = make_ulabel({
                st: make_subtask("A", [CROP, WEED], [
                    make_annotation(1),
                    make_annotation(1),
                    make_annotation(2),
                ]),
            }, "st");
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML).toContain("Crop: 2");
            expect(item.inner_HTML).toContain("Weed: 1");
        });

        test("skips deprecated annotations", () => {
            const ulabel = make_ulabel({
                st: make_subtask("A", [CROP], [
                    make_annotation(1),
                    make_annotation(1, { deprecated: true }),
                ]),
            }, "st");
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML).toContain("Crop: 1");
        });

        test("counts an annotation toward its first payload with confidence > 0", () => {
            const ulabel = make_ulabel({
                st: make_subtask("A", [CROP, WEED], [{
                    id: "multi",
                    spatial_type: "bbox",
                    deprecated: false,
                    classification_payloads: [
                        { class_id: 1, confidence: 0.0 },
                        { class_id: 2, confidence: 0.7 },
                    ],
                }]),
            }, "st");
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML).toContain("Crop: 0");
            expect(item.inner_HTML).toContain("Weed: 1");
        });

        test("hides OVERWRITE classes", () => {
            const ulabel = make_ulabel({
                st: make_subtask("A", [CROP, { name: "OVERWRITE_ME", id: 9, color: "black" }], [
                    make_annotation(1),
                    make_annotation(9),
                ]),
            }, "st");
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML).toContain("Crop: 1");
            expect(item.inner_HTML).not.toContain("OVERWRITE");
        });
    });

    describe("subtasks option", () => {
        const two_subtask_ulabel = (config) => make_ulabel({
            crop: make_subtask("Crop ST", [CROP], [make_annotation(1), make_annotation(1)]),
            weed: make_subtask("Weed ST", [WEED], [make_annotation(2)]),
        }, "crop", config);

        test("defaults to the current subtask only", () => {
            const ulabel = two_subtask_ulabel({});
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML).toContain("Crop: 2");
            expect(item.inner_HTML).not.toContain("Weed");
        });

        test("counts the configured subtasks regardless of the current one", () => {
            const ulabel = two_subtask_ulabel({ subtasks: ["crop", "weed"] });
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML).toContain("Crop: 2");
            expect(item.inner_HTML).toContain("Weed: 1");
        });

        test("ignores unknown subtask keys", () => {
            const ulabel = two_subtask_ulabel({ subtasks: ["weed", "nope"] });
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML).toContain("Weed: 1");
            expect(item.inner_HTML).not.toContain("Crop");
        });
    });

    describe("layout option", () => {
        // Shared class id 1 across both subtasks to exercise flat merging
        const shared_class_ulabel = (config) => make_ulabel({
            gt: make_subtask("GT", [CROP], [make_annotation(1), make_annotation(1)]),
            pred: make_subtask("Pred", [CROP], [make_annotation(1)]),
        }, "gt", { subtasks: ["gt", "pred"], ...config });

        test("grouped adds a heading per subtask", () => {
            const ulabel = shared_class_ulabel({ layout: "grouped" });
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML).toContain(`<p class="tb-counter-subtask-header">GT</p>`);
            expect(item.inner_HTML).toContain(`<p class="tb-counter-subtask-header">Pred</p>`);
            // One count line per subtask
            expect(item.inner_HTML.match(/Crop: \d+/g)).toEqual(["Crop: 2", "Crop: 1"]);
        });

        test("flat merges shared class ids into one summed line", () => {
            const ulabel = shared_class_ulabel({ layout: "flat" });
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML.match(/Crop: \d+/g)).toEqual(["Crop: 3"]);
            expect(item.inner_HTML).not.toContain("tb-counter-subtask-header");
        });

        test("current keeps one plain line per counted subtask", () => {
            const ulabel = shared_class_ulabel({});
            const item = new ClassCounterToolboxItem(ulabel);

            item.update_toolbox_counter(ulabel);

            expect(item.inner_HTML.match(/Crop: \d+/g)).toEqual(["Crop: 2", "Crop: 1"]);
            expect(item.inner_HTML).not.toContain("tb-counter-subtask-header");
        });
    });

    describe("set_options", () => {
        test("changes options at runtime and leaves omitted ones alone", () => {
            const ulabel = make_ulabel({
                st: make_subtask("A", [CROP], [make_annotation(1)]),
            }, "st", { layout: "grouped" });
            const item = new ClassCounterToolboxItem(ulabel);

            item.set_options({ subtasks: ["st"] });

            expect(item.subtasks).toEqual(["st"]);
            expect(item.layout).toBe("grouped");
        });
    });
});

describe("ULabel.set_class_counter_options", () => {
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

    test("forwards options to the ClassCounter item and redraws", () => {
        const ulabel = new ULabel(mock_config);
        const item = new ClassCounterToolboxItem(ulabel);
        item.redraw_update = jest.fn();
        ulabel.toolbox = { items: [item] };

        const found = ulabel.set_class_counter_options({ subtasks: ["st"], layout: "flat" });

        expect(found).toBe(true);
        expect(item.subtasks).toEqual(["st"]);
        expect(item.layout).toBe("flat");
        expect(item.redraw_update).toHaveBeenCalledWith(ulabel);
    });

    test("redraw = false defers rendering", () => {
        const ulabel = new ULabel(mock_config);
        const item = new ClassCounterToolboxItem(ulabel);
        item.redraw_update = jest.fn();
        ulabel.toolbox = { items: [item] };

        ulabel.set_class_counter_options({ layout: "grouped" }, false);

        expect(item.redraw_update).not.toHaveBeenCalled();
    });

    test("returns false when no ClassCounter item exists", () => {
        const ulabel = new ULabel(mock_config);
        ulabel.toolbox = { items: [] };

        expect(ulabel.set_class_counter_options({ layout: "flat" })).toBe(false);
    });
});
