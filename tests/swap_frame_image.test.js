// Tests for the swap_frame_image dimension guard
const { ULabel } = require("./testing-utils/build_loader");

describe("swap_frame_image", () => {
    const container_id = "test-container";
    const mock_config = {
        container_id,
        image_data: "old-image.png",
        username: "test-user",
        submit_buttons: [{ name: "Submit", hook: jest.fn() }],
        subtasks: {
            test_task: {
                display_name: "Test Task",
                classes: [{ name: "TestClass", id: 1, color: "red" }],
                allowed_modes: ["bbox"],
                resume_from: null,
            },
        },
    };

    // swap_frame_image normally runs on an init-ed instance; provide the frame
    // image element and init-time dimensions it expects.
    function scaffold_instance(natural_dims) {
        const ulabel = new ULabel(mock_config);
        ulabel.config.image_width = 100;
        ulabel.config.image_height = 50;
        document.body.innerHTML = `
            <div id="${container_id}"></div>
            <img id="${ulabel.config.image_id_pfx}__0" src="old-image.png">
        `;
        const img = document.getElementById(`${ulabel.config.image_id_pfx}__0`);
        img.decode = jest.fn().mockResolvedValue(undefined);
        Object.defineProperty(img, "naturalWidth", { get: () => natural_dims[0] });
        Object.defineProperty(img, "naturalHeight", { get: () => natural_dims[1] });
        return { ulabel, img };
    }

    test("resolves with the old src when dimensions match", async () => {
        const { ulabel, img } = scaffold_instance([100, 50]);

        const old_src = await ulabel.swap_frame_image("new-image.png");

        expect(old_src).toContain("old-image.png");
        expect(img.getAttribute("src")).toBe("new-image.png");
    });

    test("rejects and restores the old image when dimensions differ", async () => {
        const { ulabel, img } = scaffold_instance([200, 50]);

        await expect(ulabel.swap_frame_image("new-image.png")).rejects.toThrow(/rejected/);
        expect(img.getAttribute("src")).toBe("old-image.png");
    });
});
