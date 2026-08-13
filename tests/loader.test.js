// Tests for the loader overlay's delay-before-show behavior.
const { ULabelLoader } = require("../build/loader");

describe("ULabelLoader", () => {
    let container;

    beforeEach(() => {
        jest.useFakeTimers();
        document.body.innerHTML = "";
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        ULabelLoader.remove_loader_div();
        jest.useRealTimers();
    });

    test("appends the overlay hidden, then reveals it after the delay", () => {
        ULabelLoader.add_loader_div(container, 200);
        const overlay = container.querySelector(".ulabel-loader-overlay");
        expect(overlay).not.toBeNull();
        expect(overlay.style.visibility).toBe("hidden");

        jest.advanceTimersByTime(199);
        expect(overlay.style.visibility).toBe("hidden");

        jest.advanceTimersByTime(1);
        expect(overlay.style.visibility).toBe("visible");
    });

    test("remove before the delay fires never shows the loader", () => {
        ULabelLoader.add_loader_div(container, 200);
        const overlay = container.querySelector(".ulabel-loader-overlay");
        expect(overlay.style.visibility).toBe("hidden");

        // Op finishes fast; caller removes the loader.
        ULabelLoader.remove_loader_div();
        expect(container.querySelector(".ulabel-loader-overlay")).toBeNull();

        // Timer should be cancelled: advancing time doesn't resurrect anything.
        jest.advanceTimersByTime(500);
        expect(container.querySelector(".ulabel-loader-overlay")).toBeNull();
    });

    test("delay_ms=0 reveals synchronously (opt-out for callers who want immediate feedback)", () => {
        ULabelLoader.add_loader_div(container, 0);
        const overlay = container.querySelector(".ulabel-loader-overlay");
        expect(overlay.style.visibility).toBe("visible");
    });

    test("calling add twice tears down the first overlay so only one is in the DOM", () => {
        ULabelLoader.add_loader_div(container, 200);
        ULabelLoader.add_loader_div(container, 200);
        expect(container.querySelectorAll(".ulabel-loader-overlay").length).toBe(1);
    });

    test("uses DEFAULT_REVEAL_DELAY_MS when no delay is given", () => {
        expect(ULabelLoader.DEFAULT_REVEAL_DELAY_MS).toBe(200);
        ULabelLoader.add_loader_div(container);
        const overlay = container.querySelector(".ulabel-loader-overlay");
        jest.advanceTimersByTime(ULabelLoader.DEFAULT_REVEAL_DELAY_MS - 1);
        expect(overlay.style.visibility).toBe("hidden");
        jest.advanceTimersByTime(1);
        expect(overlay.style.visibility).toBe("visible");
    });
});
