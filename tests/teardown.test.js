// Tests for destroy() and the opt-in auto-teardown observer.
const { ULabel } = require("./testing-utils/build_loader");
const { ULabelMask } = require("../build/mask_utils");

describe("Teardown", () => {
    let base_config;
    const container_id = "test-container";

    beforeEach(() => {
        document.body.innerHTML = `<div id="${container_id}"></div>`;
        base_config = {
            container_id: container_id,
            image_data: "test-image.png",
            username: "test-user",
            initial_line_size: 2,
            submit_buttons: [{ name: "Submit", hook: jest.fn() }],
            subtasks: {
                test_task: {
                    display_name: "Test Task",
                    classes: [{ name: "TestClass", id: 1, color: "red" }],
                    allowed_modes: ["bbox", "polygon", "point", "bitmask"],
                    resume_from: null,
                },
            },
        };
    });

    function build_ulabel_with_bitmask() {
        const mask = ULabelMask.create_empty(8, 6);
        mask.paint_circle(4, 3, 2, 1);
        const config = {
            ...base_config,
            subtasks: {
                test_task: {
                    ...base_config.subtasks.test_task,
                    resume_from: [
                        {
                            spatial_type: "bitmask",
                            spatial_payload: mask.to_rle(),
                            classification_payloads: [{ class_id: 1, confidence: 1.0 }],
                        },
                    ],
                },
            },
        };
        return new ULabel(config);
    }

    describe("destroy()", () => {
        test("releases bitmask caches on every annotation", () => {
            const ulabel = build_ulabel_with_bitmask();
            const anno_id = ulabel.subtasks.test_task.annotations.ordering[0];
            const annotation = ulabel.subtasks.test_task.annotations.access[anno_id];

            // Force the mask cache to be populated.
            ulabel.get_bitmask(annotation);
            expect(annotation._mask).toBeDefined();

            ulabel.destroy();

            // subtasks were wiped, but we still hold `annotation` from before.
            expect(annotation._mask).toBeUndefined();
            expect(annotation._mask_render).toBeUndefined();
            expect(annotation._bitmask_box_hint).toBeUndefined();
        });

        test("empties subtasks.annotations and action streams", () => {
            const ulabel = build_ulabel_with_bitmask();
            // Seed a fake action so we can prove the stream is emptied.
            ulabel.subtasks.test_task.actions.stream.push({ act_type: "noop" });
            ulabel.subtasks.test_task.actions.undone_stack.push({ act_type: "noop" });

            ulabel.destroy();

            expect(ulabel.subtasks.test_task.annotations.ordering).toEqual([]);
            expect(ulabel.subtasks.test_task.annotations.access).toEqual({});
            expect(ulabel.subtasks.test_task.actions.stream).toEqual([]);
            expect(ulabel.subtasks.test_task.actions.undone_stack).toEqual([]);
        });

        test("is idempotent", () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.destroy();
            expect(ulabel.is_destroyed).toBe(true);
            // Second call must not throw.
            expect(() => ulabel.destroy()).not.toThrow();
        });

        test("wipes the container DOM", () => {
            const ulabel = build_ulabel_with_bitmask();
            const container = document.getElementById(container_id);
            container.appendChild(document.createElement("canvas"));
            expect(container.children.length).toBeGreaterThan(0);

            ulabel.destroy();

            expect(container.children.length).toBe(0);
        });
    });

    describe("post-destroy guards", () => {
        test("get_annotations returns [] and does not throw", () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.destroy();
            expect(ulabel.get_annotations("test_task")).toEqual([]);
        });

        test("redraw_all_annotations is a no-op", () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.destroy();
            expect(() => ulabel.redraw_all_annotations()).not.toThrow();
        });

        test("set_annotations is a no-op", async () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.destroy();
            await expect(ulabel.set_annotations([], "test_task")).resolves.toBeUndefined();
        });
    });

    describe("auto-teardown observer", () => {
        function wait_microtask() {
            return new Promise((resolve) => setTimeout(resolve, 0));
        }
        function wait_frame() {
            return new Promise((resolve) => {
                if (typeof requestAnimationFrame === "function") {
                    requestAnimationFrame(() => resolve());
                } else {
                    setTimeout(resolve, 16);
                }
            });
        }

        test("does not install an observer when the flag is explicitly off", () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.config.auto_destroy_on_detach = false;
            ulabel._install_auto_destroy_observer();
            expect(ulabel.mutation_observer).toBeNull();
        });

        test("installs an observer when the flag is on and calls destroy() on container removal", async () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.config.auto_destroy_on_detach = true;
            ulabel._install_auto_destroy_observer();
            expect(ulabel.mutation_observer).not.toBeNull();

            // Remove the container from the DOM.
            document.getElementById(container_id).remove();

            // The observer callback runs on a microtask, then defers the destroy decision
            // by one animation frame. Wait for both.
            await wait_microtask();
            await wait_frame();
            await wait_microtask();

            expect(ulabel.is_destroyed).toBe(true);
        });

        test("does not destroy when the container is reparented within a frame", async () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.config.auto_destroy_on_detach = true;
            ulabel._install_auto_destroy_observer();

            const container = document.getElementById(container_id);
            const holder = document.createElement("div");
            document.body.appendChild(holder);

            // Detach and reattach synchronously; observer fires once but by the time
            // its rAF check runs the container is connected again.
            container.remove();
            holder.appendChild(container);

            await wait_microtask();
            await wait_frame();
            await wait_microtask();

            expect(ulabel.is_destroyed).toBe(false);
        });

        test("destroy() disconnects the observer", () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.config.auto_destroy_on_detach = true;
            ulabel._install_auto_destroy_observer();
            const observer = ulabel.mutation_observer;
            const disconnect_spy = jest.spyOn(observer, "disconnect");

            ulabel.destroy();

            expect(disconnect_spy).toHaveBeenCalled();
            expect(ulabel.mutation_observer).toBeNull();
        });

        test("is idempotent: calling _install_auto_destroy_observer twice keeps a single observer", () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.config.auto_destroy_on_detach = true;
            ulabel._install_auto_destroy_observer();
            const first = ulabel.mutation_observer;
            expect(first).not.toBeNull();

            ulabel._install_auto_destroy_observer();
            expect(ulabel.mutation_observer).toBe(first);
        });

        test("does not install an observer on a destroyed instance", () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.config.auto_destroy_on_detach = true;
            ulabel.destroy();
            ulabel._install_auto_destroy_observer();
            expect(ulabel.mutation_observer).toBeNull();
        });

        test("still destroys when the container is replaced with a same-id node", async () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.config.auto_destroy_on_detach = true;
            ulabel._install_auto_destroy_observer();

            // SPA-style swap: remove ours, mount a fresh element with the same id.
            const original = document.getElementById(container_id);
            original.remove();
            const replacement = document.createElement("div");
            replacement.id = container_id;
            const sentinel = document.createElement("span");
            sentinel.textContent = "replacement content";
            replacement.appendChild(sentinel);
            document.body.appendChild(replacement);

            await wait_microtask();
            await wait_frame();
            await wait_microtask();

            // Old instance was torn down (our node isn't connected any more).
            expect(ulabel.is_destroyed).toBe(true);
            // The replacement's DOM was NOT nuked by our destroy path.
            expect(document.getElementById(container_id)).toBe(replacement);
            expect(replacement.contains(sentinel)).toBe(true);
        });

        test("manual destroy() does not clear a same-id replacement", () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.config.auto_destroy_on_detach = true;
            ulabel._install_auto_destroy_observer();

            const original = document.getElementById(container_id);
            original.remove();
            const replacement = document.createElement("div");
            replacement.id = container_id;
            const sentinel = document.createElement("span");
            replacement.appendChild(sentinel);
            document.body.appendChild(replacement);

            ulabel.destroy();

            expect(replacement.contains(sentinel)).toBe(true);
        });

        test("manual destroy() (auto flag off) also spares a same-id replacement", () => {
            const ulabel = build_ulabel_with_bitmask();
            ulabel.config.auto_destroy_on_detach = false;
            // Simulate what ulabel_init does: capture the owned container node before use.
            ulabel._owned_container = document.getElementById(container_id);

            const original = ulabel._owned_container;
            original.remove();
            const replacement = document.createElement("div");
            replacement.id = container_id;
            const sentinel = document.createElement("span");
            replacement.appendChild(sentinel);
            document.body.appendChild(replacement);

            ulabel.destroy();

            expect(replacement.contains(sentinel)).toBe(true);
        });
    });
});
