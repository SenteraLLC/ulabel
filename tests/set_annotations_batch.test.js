// Unit tests for set_annotations_batch: the batching contract (one loader
// cycle, one toolbox refresh) rather than the per-subtask swap body, which is
// unchanged code covered by the bitmask e2e specs.
const { ULabel } = require("./testing-utils/build_loader");

const mock_config = {
    container_id: "container",
    image_data: "test.jpg",
    username: "test_user",
    submit_buttons: [{ name: "Submit", hook: jest.fn() }],
    subtasks: {
        a: {
            display_name: "A",
            classes: [{ name: "Crop", id: 1, color: "green" }],
            allowed_modes: ["bbox"],
            resume_from: null,
        },
        b: {
            display_name: "B",
            classes: [{ name: "Weed", id: 2, color: "red" }],
            allowed_modes: ["bbox"],
            resume_from: null,
        },
    },
};

// Stand in for the swap body so the batching logic can be tested without a
// canvas, and so each subtask's swap is observable.
function stub_swap(ulabel, result = true) {
    ulabel._swap_subtask_annotations = jest.fn().mockResolvedValue(result);
    ulabel.refresh_toolbox = jest.fn();
    return ulabel;
}

function make_ulabel(result = true) {
    document.body.innerHTML = `<div id="container"></div>`;
    return stub_swap(new ULabel(mock_config), result);
}

describe("set_annotations_batch", () => {
    test("swaps every named subtask", async () => {
        const ulabel = make_ulabel();

        await ulabel.set_annotations_batch({ a: [], b: [] });

        expect(ulabel._swap_subtask_annotations).toHaveBeenCalledTimes(2);
        const swapped = ulabel._swap_subtask_annotations.mock.calls.map((call) => call[1]);
        expect(swapped).toEqual(["a", "b"]);
    });

    test("refreshes the toolbox once for the whole batch", async () => {
        const ulabel = make_ulabel();

        await ulabel.set_annotations_batch({ a: [], b: [] });

        expect(ulabel.refresh_toolbox).toHaveBeenCalledTimes(1);
    });

    test("shows one loader for the whole batch", async () => {
        const ulabel = make_ulabel();
        let peak_loaders = 0;
        ulabel._swap_subtask_annotations = jest.fn().mockImplementation(async () => {
            peak_loaders = Math.max(peak_loaders, document.querySelectorAll(".ulabel-loader").length);
            return true;
        });

        await ulabel.set_annotations_batch({ a: [], b: [] });

        expect(peak_loaders).toBe(1);
        expect(document.querySelectorAll(".ulabel-loader")).toHaveLength(0);
    });

    test("skips unknown subtask keys but still applies the known ones", async () => {
        const ulabel = make_ulabel();

        await ulabel.set_annotations_batch({ a: [], nope: [] });

        const swapped = ulabel._swap_subtask_annotations.mock.calls.map((call) => call[1]);
        expect(swapped).toEqual(["a"]);
        expect(ulabel.refresh_toolbox).toHaveBeenCalledTimes(1);
    });

    test("does nothing when no key is known", async () => {
        const ulabel = make_ulabel();

        await ulabel.set_annotations_batch({ nope: [] });

        expect(ulabel._swap_subtask_annotations).not.toHaveBeenCalled();
        expect(ulabel.refresh_toolbox).not.toHaveBeenCalled();
        expect(document.querySelectorAll(".ulabel-loader")).toHaveLength(0);
    });

    test("abandons the batch and removes the loader if the instance is destroyed mid-swap", async () => {
        const ulabel = make_ulabel(false);

        await ulabel.set_annotations_batch({ a: [], b: [] });

        expect(ulabel._swap_subtask_annotations).toHaveBeenCalledTimes(1);
        expect(ulabel.refresh_toolbox).not.toHaveBeenCalled();
        expect(document.querySelectorAll(".ulabel-loader")).toHaveLength(0);
    });

    test("is a no-op on a destroyed instance", async () => {
        const ulabel = make_ulabel();
        ulabel.is_destroyed = true;

        await ulabel.set_annotations_batch({ a: [] });

        expect(ulabel._swap_subtask_annotations).not.toHaveBeenCalled();
    });

    test("leaves class focus in place, so a swapped-in layer arrives scoped", async () => {
        const ulabel = make_ulabel();
        ulabel.subtasks.a.focus_active_class = true;

        await ulabel.set_annotations_batch({ a: [], b: [] });

        // Selection (and therefore focus) survives the swap untouched
        expect(ulabel.get_selected_class_id("a")).toBe(1);
        expect(ulabel.subtasks.a.focus_active_class).toBe(true);
    });
});
