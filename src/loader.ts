/**
 * Animated loader for initial loading screen.
 */
export class ULabelLoader {
    public static add_loader_div(
        container: HTMLElement,
    ) {
        const loader_overlay = document.createElement("div");
        loader_overlay.classList.add("ulabel-loader-overlay");

        const loader = document.createElement("div");
        loader.classList.add("ulabel-loader");

        const style = ULabelLoader.build_loader_style();

        loader_overlay.appendChild(loader);
        loader_overlay.appendChild(style);
        container.appendChild(loader_overlay);
    }

    public static remove_loader_div() {
        const loader = document.querySelector(".ulabel-loader-overlay");
        if (loader) {
            loader.remove();
        }
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
