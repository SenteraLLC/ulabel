/**
 * Error handling utilities for ULabel.
 */

export enum LogLevel {
    VERBOSE = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3,
}

/**
 * Log a message to the console at a level.
 * This was ported from code that didn't use the console log levels,
 * and is kept for compatibility.
 *
 * @param message Message to log
 * @param log_level Level to log at
 */
export function log_message(
    message: string,
    log_level: LogLevel = LogLevel.INFO,
) {
    switch (log_level) {
        case LogLevel.VERBOSE:
            console.debug(message);
            break;
        case LogLevel.INFO:
            console.log(message);
            break;
        case LogLevel.WARNING:
            console.warn(message);
            alert("[WARNING] " + message);
            break;
        case LogLevel.ERROR:
            console.error(message);
            alert("[ERROR] " + message);
            throw new Error(message);
    }
}
