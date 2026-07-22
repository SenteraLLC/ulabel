// Unit tests for the ConfidenceSlider toolbox item
// NOTE: require `configuration` before `confidence_slider`. `configuration` pulls in `toolbox`
// (which defines the `ToolboxItem` base class) and then `confidence_slider`, ensuring the base
// class is initialized before `ConfidenceSlider extends ToolboxItem` evaluates. Requiring
// `confidence_slider` first hits the circular import before `ToolboxItem` is defined.
const { Configuration, AllowedToolboxItem } = require("../build/configuration");
const { ConfidenceSlider } = require("../build/toolbox_items/confidence_slider");
// Loaded from the bundled build to exercise the ULabel public API method directly.
const { ULabel } = require("./testing-utils/build_loader");

/**
 * Build a minimal annotation-like object.
 */
function make_annotation(id, spatial_type, payloads, extra = {}) {
    return {
        id,
        spatial_type,
        classification_payloads: payloads,
        deprecated: false,
        deprecated_by: { human: false },
        ...extra,
    };
}

/**
 * Build a minimal mock ULabel object with a single subtask.
 */
function make_ulabel(annotations, config = {}) {
    const access = {};
    for (const annotation of annotations) {
        access[annotation.id] = annotation;
    }
    return {
        config: { confidence_slider_toolbox_item: config },
        subtasks: {
            st: {
                annotations: { access },
                allowed_modes: ["bbox", "polygon", "point", "polyline"],
                class_defs: [
                    { name: "Car", id: 10, color: "red", keybind: null },
                    { name: "Truck", id: 11, color: "blue", keybind: null },
                ],
            },
        },
        redraw_multiple_spatial_annotations: jest.fn(),
        toolbox: { redraw_update_items: jest.fn() },
    };
}

describe("ConfidenceSlider", () => {
    beforeEach(() => {
        // Reset the DOM so slider lookups fall back to defaults
        document.body.innerHTML = "";
    });

    describe("construction and config resolution", () => {
        test("applies defaults and identifies as ConfidenceSlider", () => {
            const cs = new ConfidenceSlider(make_ulabel([], { filter_on_load: false }));

            expect(cs.get_toolbox_item_type()).toBe("ConfidenceSlider");
            expect(cs.filter_min).toBe(0);
            expect(cs.filter_max).toBe(100);
            expect(cs.step_value).toBe(1);
            expect(cs.deprecated_by_key).toBe("confidence_slider");
        });

        test("class_filter_mode 'toggle' shows the toggle and starts in all mode", () => {
            const cs = new ConfidenceSlider(make_ulabel([], { class_filter_mode: "toggle", filter_on_load: false }));
            expect(cs.show_class_toggle).toBe(true);
            expect(cs.is_class_mode).toBe(false);
        });

        test("class_filter_mode 'all-only' hides the toggle and stays in all mode", () => {
            const cs = new ConfidenceSlider(make_ulabel([], { class_filter_mode: "all-only", filter_on_load: false }));
            expect(cs.show_class_toggle).toBe(false);
            expect(cs.is_class_mode).toBe(false);
        });

        test("class_filter_mode 'class-only' hides the toggle and starts in class mode", () => {
            const cs = new ConfidenceSlider(make_ulabel([], { class_filter_mode: "class-only", filter_on_load: false }));
            expect(cs.show_class_toggle).toBe(false);
            expect(cs.is_class_mode).toBe(true);
        });

        test("merges partial config with the defaults", () => {
            const cs = new ConfidenceSlider(make_ulabel([], { filter_max: 50, filter_on_load: false }));
            expect(cs.filter_max).toBe(50); // provided
            expect(cs.filter_min).toBe(0); // default
            expect(cs.step_value).toBe(1); // default
        });
    });

    describe("filter_annotations - all mode", () => {
        test("deprecates annotations below the threshold and shows those at/above", () => {
            const high = make_annotation("high", "bbox", [{ class_id: 10, confidence: 0.9 }]);
            const mid = make_annotation("mid", "bbox", [{ class_id: 10, confidence: 0.5 }]);
            const low = make_annotation("low", "bbox", [{ class_id: 10, confidence: 0.1 }]);
            const ulabel = make_ulabel([high, mid, low], {
                class_filter_mode: "all-only",
                default_values: { all: 60 },
                filter_on_load: false,
            });
            const cs = new ConfidenceSlider(ulabel);

            cs.filter_annotations(false);

            expect(high.deprecated).toBe(false);
            expect(mid.deprecated).toBe(true);
            expect(low.deprecated).toBe(true);
            expect(mid.deprecated_by.confidence_slider).toBe(true);
        });

        test("a threshold of 0 deprecates nothing", () => {
            const low = make_annotation("low", "bbox", [{ class_id: 10, confidence: 0.1 }]);
            const cs = new ConfidenceSlider(make_ulabel([low], {
                class_filter_mode: "all-only",
                default_values: { all: 0 },
                filter_on_load: false,
            }));

            cs.filter_annotations(false);

            expect(low.deprecated).toBe(false);
        });

        test("lowering the threshold un-deprecates previously filtered annotations", () => {
            const low = make_annotation("low", "bbox", [{ class_id: 10, confidence: 0.1 }]);
            const cs = new ConfidenceSlider(make_ulabel([low], {
                class_filter_mode: "all-only",
                default_values: { all: 50 },
                filter_on_load: false,
            }));

            cs.filter_annotations(false);
            expect(low.deprecated).toBe(true);

            // Lower the threshold and re-filter
            cs.default_values.all = 0;
            cs.filter_annotations(false);

            expect(low.deprecated).toBe(false);
            expect(low.deprecated_by.confidence_slider).toBe(false);
        });
    });

    describe("filter_annotations - class mode", () => {
        test("filters each class by its own threshold and ignores untargeted classes", () => {
            const car = make_annotation("car", "bbox", [{ class_id: 10, confidence: 0.5 }]);
            const truck = make_annotation("truck", "bbox", [{ class_id: 11, confidence: 0.5 }]);
            const other = make_annotation("other", "bbox", [{ class_id: 12, confidence: 0.5 }]);
            const cs = new ConfidenceSlider(make_ulabel([car, truck, other], {
                class_filter_mode: "class-only",
                default_values: { all: 0, 10: 60, 11: 30 },
                filter_on_load: false,
            }));

            cs.filter_annotations(false);

            expect(car.deprecated).toBe(true); // 50 < 60
            expect(truck.deprecated).toBe(false); // 50 >= 30
            expect(other.deprecated).toBe(false); // class 12 has no slider
        });

        test("targets an annotation by its highest-confidence (argmax) class", () => {
            // argmax class is 11 (0.8); the class-11 threshold should apply
            const anno = make_annotation("multi", "bbox", [
                { class_id: 10, confidence: 0.3 },
                { class_id: 11, confidence: 0.8 },
            ]);
            const cs = new ConfidenceSlider(make_ulabel([anno], {
                class_filter_mode: "class-only",
                default_values: { all: 0, 10: 90, 11: 50 },
                filter_on_load: false,
            }));

            cs.filter_annotations(false);

            // 80 >= 50 (class-11 threshold) -> shown, even though 80 would fail class 10's 90
            expect(anno.deprecated).toBe(false);
        });

        test("does not filter classes excluded from target_class_ids, even if present in default_values", () => {
            const targeted = make_annotation("targeted", "bbox", [{ class_id: 10, confidence: 0.1 }]);
            const untargeted = make_annotation("untargeted", "bbox", [{ class_id: 11, confidence: 0.1 }]);
            const cs = new ConfidenceSlider(make_ulabel([targeted, untargeted], {
                class_filter_mode: "class-only",
                target_class_ids: [10],
                // class 11 has a threshold but is NOT targeted (no slider is rendered for it)
                default_values: { all: 0, 10: 50, 11: 90 },
                filter_on_load: false,
            }));

            cs.filter_annotations(false);

            expect(targeted.deprecated).toBe(true); // class 10 targeted: 10% < 50%
            expect(untargeted.deprecated).toBe(false); // class 11 not targeted: must be ignored
        });
    });

    describe("target_spatial_types", () => {
        test("only filters the configured spatial types", () => {
            const point = make_annotation("p", "point", [{ class_id: 10, confidence: 0.1 }]);
            const box = make_annotation("b", "bbox", [{ class_id: 10, confidence: 0.1 }]);
            const cs = new ConfidenceSlider(make_ulabel([point, box], {
                class_filter_mode: "all-only",
                default_values: { all: 50 },
                target_spatial_types: ["bbox"],
                filter_on_load: false,
            }));

            cs.filter_annotations(false);

            expect(box.deprecated).toBe(true);
            expect(point.deprecated).toBe(false);
            expect(point.deprecated_by.confidence_slider).toBeUndefined();
        });
    });

    describe("deprecated_by OR-logic", () => {
        test("does not un-deprecate an annotation deprecated by a human", () => {
            const anno = make_annotation("h", "bbox", [{ class_id: 10, confidence: 0.9 }], {
                deprecated: true,
                deprecated_by: { human: true },
            });
            const cs = new ConfidenceSlider(make_ulabel([anno], {
                class_filter_mode: "all-only",
                default_values: { all: 0 },
                filter_on_load: false,
            }));

            cs.filter_annotations(false);

            expect(anno.deprecated_by.confidence_slider).toBe(false);
            expect(anno.deprecated).toBe(true); // still deprecated by human
        });
    });

    describe("filter_on_load", () => {
        test("filters during construction when filter_on_load is true", () => {
            const low = make_annotation("low", "bbox", [{ class_id: 10, confidence: 0.1 }]);
            new ConfidenceSlider(make_ulabel([low], {
                class_filter_mode: "all-only",
                default_values: { all: 50 },
                filter_on_load: true,
            }));

            expect(low.deprecated).toBe(true);
        });

        test("does not filter during construction when filter_on_load is false", () => {
            const low = make_annotation("low", "bbox", [{ class_id: 10, confidence: 0.1 }]);
            new ConfidenceSlider(make_ulabel([low], {
                class_filter_mode: "all-only",
                default_values: { all: 50 },
                filter_on_load: false,
            }));

            expect(low.deprecated).toBe(false);
        });
    });

    describe("redraw", () => {
        test("redraws changed annotations and updates toolbox items when redraw is true", () => {
            const low = make_annotation("low", "bbox", [{ class_id: 10, confidence: 0.1 }]);
            const ulabel = make_ulabel([low], {
                class_filter_mode: "all-only",
                default_values: { all: 50 },
                filter_on_load: false,
            });
            const cs = new ConfidenceSlider(ulabel);

            cs.filter_annotations(true);

            expect(ulabel.redraw_multiple_spatial_annotations).toHaveBeenCalledWith(["low"], "st");
            expect(ulabel.toolbox.redraw_update_items).toHaveBeenCalled();
        });
    });

    describe("get_current_values", () => {
        test("returns null when no sliders are in the DOM", () => {
            const cs = new ConfidenceSlider(make_ulabel([], { filter_on_load: false }));
            expect(cs.get_current_values()).toBeNull();
        });

        test("reads the single 'all' slider value", () => {
            const cs = new ConfidenceSlider(make_ulabel([], { class_filter_mode: "all-only", filter_on_load: false }));
            document.body.innerHTML = `<input id="confidence-slider-all" class="confidence-slider-input" type="range" min="0" max="100" value="40">`;

            expect(cs.get_current_values()).toEqual({ all: 40 });
        });

        test("reads per-class slider values in class mode", () => {
            const cs = new ConfidenceSlider(make_ulabel([], { class_filter_mode: "class-only", filter_on_load: false }));
            document.body.innerHTML = `
                <input id="confidence-slider-all" class="confidence-slider-input" type="range" min="0" max="100" value="40">
                <input id="confidence-slider-10" class="confidence-slider-input" type="range" min="0" max="100" value="30">
            `;

            expect(cs.get_current_values()).toEqual({
                all: 40,
                10: 30,
            });
        });
    });

    describe("get_html", () => {
        test("renders the multi-class toggle only in toggle mode", () => {
            const toggle = new ConfidenceSlider(make_ulabel([], { class_filter_mode: "toggle", filter_on_load: false }));
            expect(toggle.get_html()).toContain("confidence-slider-multi-checkbox");

            const allOnly = new ConfidenceSlider(make_ulabel([], { class_filter_mode: "all-only", filter_on_load: false }));
            expect(allOnly.get_html()).not.toContain("confidence-slider-multi-checkbox");
        });

        test("target_class_ids limits which per-class sliders are rendered", () => {
            const cs = new ConfidenceSlider(make_ulabel([], {
                class_filter_mode: "class-only",
                target_class_ids: [10],
                filter_on_load: false,
            }));
            const html = cs.get_html();

            expect(html).toContain("confidence-slider-all");
            expect(html).toContain("confidence-slider-10");
            expect(html).not.toContain("confidence-slider-11");
        });
    });
});

describe("Default toolbox order", () => {
    test("includes ConfidenceSlider and not the deprecated KeypointSlider", () => {
        const config = new Configuration();
        expect(config.toolbox_order).toContain(AllowedToolboxItem.ConfidenceSlider);
        expect(config.toolbox_order).not.toContain(AllowedToolboxItem.KeypointSlider);
    });
});

describe("get_confidence_slider_value (tuple-safe lookup)", () => {
    const slider_item = {
        get_toolbox_item_type: () => "ConfidenceSlider",
        get_current_values: () => ({ all: 25 }),
    };
    const invoke = (toolbox_order, items) =>
        ULabel.prototype.get_confidence_slider_value.call({
            config: { toolbox_order },
            toolbox: { items },
        });

    test("finds the item when configured as a plain enum entry", () => {
        expect(invoke([AllowedToolboxItem.ConfidenceSlider], [slider_item]))
            .toEqual({ all: 25 });
    });

    test("finds the item when configured as an [enum, kwargs] tuple", () => {
        expect(invoke([[AllowedToolboxItem.ConfidenceSlider, { step_value: 5 }]], [slider_item]))
            .toEqual({ all: 25 });
    });

    test("returns null when the item is not active", () => {
        expect(invoke([AllowedToolboxItem.ConfidenceSlider], [])).toBeNull();
    });
});
