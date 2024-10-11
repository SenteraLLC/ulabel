/**
 * ULabel cookie utilities.
 */

import { ULabelSubtask } from "./subtask";

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

/**
 * Cookie utilities for tracking annotation display size.
 */
export abstract class AnnotationSizeCookie {
    /**
     * Produce the name of the cookie for a given subtask.
     * Swaps spaces for underscores and lowercases the name.
     *
     * @param subtask ULabelSubtask to generate the cookie name for.
     */
    private static cookie_name(subtask: ULabelSubtask): string {
        const subtask_name = subtask.display_name.replaceLowerConcat(" ", "_");
        return `${subtask_name}_size`;
    }

    /**
     * Set the annotation size cookie for a given subtask.
     *
     * @param cookie_value Cookie value to set.
     * @param subtask Subtask to set the cookie for.
     */
    public static set_size_cookie(
        cookie_value: number,
        subtask: ULabelSubtask,
    ) {
        const cookie_name = AnnotationSizeCookie.cookie_name(subtask);
        const d = new Date();
        d.setTime(d.getTime() + (10000 * 24 * 60 * 60 * 1000));

        document.cookie = `${cookie_name}=${cookie_value};expires=${d.toUTCString()};path=/`;
    }

    /**
     * Retrieve the annotation size cookie for a given subtask, if it exists.
     * Resolves NaN to null.
     *
     * @param subtask Subtask to read the cookie for.
     * @returns The cookie value if it exists, otherwise null.
     */
    public static read_size_cookie(subtask: ULabelSubtask): number | null {
        const cookie_name = AnnotationSizeCookie.cookie_name(subtask);
        console.log(cookie_name);
        const cookie_array = document.cookie.split(";");

        for (let cookie of cookie_array) {
            // Trim whitespace at the beginning
            cookie = cookie.trim();
            if (cookie.startsWith(cookie_name)) {
                let cookie_value = parseInt(cookie.split("=")[1]);
                if (cookie_value === undefined || isNaN(cookie_value)) {
                    cookie_value = null;
                }
                return cookie_value;
            }
        };

        return null;
    }
}
