/**
 * ULabel cookie utilities.
 */

export abstract class NightModeCookie {
    /**
     * The name of the cookie that stores the night mode preference.
     */
    public static readonly COOKIE_NAME: string = "nightmode";

    /**
     * Return whether the document has a night mode cookie.
     */
    public static exists_in_document(): boolean {
        const cookie_components = document.cookie.split(";");
        const night_mode_comp = cookie_components.find(
            (row) => row.trim().startsWith(`${NightModeCookie.COOKIE_NAME}=true`),
        );
        return night_mode_comp !== undefined;
    }

    /**
     * Set the night mode cookie.
     */
    public static set_cookie(): void {
        const d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));
        document.cookie = [
            NightModeCookie.COOKIE_NAME + "=true",
            "expires=" + d.toUTCString(),
            "path=/",
        ].join(";");
    }

    /**
     * Destroy the night mode cookie.
     */
    public static destroy_cookie() {
        document.cookie = [
            NightModeCookie.COOKIE_NAME + "=true",
            "expires=Thu, 01 Jan 1970 00:00:00 UTC",
            "path=/",
        ].join(";");
    }
}
