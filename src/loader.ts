/**
 * Animated loader for initial loading screen.
 */
export class ULabelLoader {
    // Default delay before the loader becomes visible. Operations that finish
    // in less than this never flash a loader on screen. See CHANGELOG for rationale.
    public static readonly DEFAULT_REVEAL_DELAY_MS: number = 200;

    // Non-null while a loader is pending or shown. Static because ULabel currently
    // supports one instance per page (see api_spec.md); no per-instance tracking needed.
    private static reveal_timer: ReturnType<typeof setTimeout> | null = null;
    private static overlay: HTMLElement | null = null;

    public static add_loader_div(
        container: HTMLElement,
        delay_ms: number = ULabelLoader.DEFAULT_REVEAL_DELAY_MS,
    ) {
        // Tear down any prior overlay so overlapping ops don't stack DOM nodes.
        ULabelLoader.remove_loader_div();

        const loader_overlay = document.createElement("div");
        loader_overlay.classList.add("ulabel-loader-overlay");
        // Hidden until the reveal timer fires; fast ops never flash a loader.
        loader_overlay.style.visibility = "hidden";

        const loader = document.createElement("div");
        loader.classList.add("ulabel-loader");

        loader_overlay.appendChild(loader);
        loader_overlay.appendChild(ULabelLoader.build_loader_style());
        container.appendChild(loader_overlay);
        ULabelLoader.overlay = loader_overlay;

        if (delay_ms <= 0) {
            loader_overlay.style.visibility = "visible";
            return;
        }
        ULabelLoader.reveal_timer = setTimeout(() => {
            if (ULabelLoader.overlay) {
                ULabelLoader.overlay.style.visibility = "visible";
            }
            ULabelLoader.reveal_timer = null;
        }, delay_ms);
    }

    public static remove_loader_div() {
        if (ULabelLoader.reveal_timer != null) {
            clearTimeout(ULabelLoader.reveal_timer);
            ULabelLoader.reveal_timer = null;
        }
        if (ULabelLoader.overlay) {
            ULabelLoader.overlay.remove();
            ULabelLoader.overlay = null;
        }
        // Sweep any stray overlay (older code paths, hot reloads, etc.).
        const stray = document.querySelector(".ulabel-loader-overlay");
        if (stray) stray.remove();
    }

    /**
     * Resolve after the browser has had a chance to paint.
     *
     * Uses a double requestAnimationFrame so a freshly-added loader is actually rendered
     * before the caller runs heavy synchronous work. Races against a short timer so hidden
     * documents (where requestAnimationFrame is throttled or paused) don't block indefinitely.
     */
    public static wait_for_render(): Promise<void> {
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                resolve();
            };
            requestAnimationFrame(() => requestAnimationFrame(finish));
            setTimeout(finish, 50);
        });
    }

    public static build_loader_style(): HTMLStyleElement {
        const css = `
            .ulabel-loader-overlay {
                position: fixed;
                width: 100%;
                height: 100%;
                inset: 0;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 100;
            }
            .ulabel-loader {
                border: 16px solid #f3f3f3;
                border-top: 16px solid #3498db;
                border-radius: 50%;
                width: 120px;
                height: 120px;
                animation: spin 2s linear infinite;
                position: fixed;
                inset: 0;
                margin: auto;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        const style = document.createElement("style");
        style.innerHTML = css;
        return style;
    }
}
