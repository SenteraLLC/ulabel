/**
 * Animated loader for initial loading screen.
 */
export class ULabelLoader {
    
    public static add_loader(
        container: HTMLElement
    ) {
        const loader = document.createElement('div');
        loader.classList.add('ulabel-loader');
        container.appendChild(loader);
    }
    
    public static remove_loader() {
        const loader = document.querySelector('.ulabel-loader');
        if (loader) {
            loader.remove();
        }
    }
    
    public static add_css() {
        const css = `
            .ulabel-loader {
                border: 16px solid #f3f3f3;
                border-top: 16px solid #3498db;
                border-radius: 50%;
                width: 120px;
                height: 120px;
                animation: spin 2s linear infinite;
                position: fixed;
                z-index: 100;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        const style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    }
}