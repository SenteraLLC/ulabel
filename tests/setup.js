// Jest setup file
require("jest-canvas-mock");

// Mock jQuery globally since ULabel depends on it
const $ = require("jquery");
global.$ = global.jQuery = $;

// Mock DOM elements and methods commonly used by ULabel
Object.defineProperty(window, "HTMLCanvasElement", {
    value: class HTMLCanvasElement {
        getContext() {
            return {
                fillStyle: "",
                strokeStyle: "",
                lineWidth: 1,
                beginPath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                arc: jest.fn(),
                stroke: jest.fn(),
                fill: jest.fn(),
                closePath: jest.fn(),
                clearRect: jest.fn(),
                drawImage: jest.fn(),
            };
        }
    },
});

// Mock image loading
global.Image = class {
    constructor() {
        setTimeout(() => {
            this.onload && this.onload();
        }, 0);
    }

    set src(value) {
        this._src = value;
    }

    get src() {
        return this._src;
    }
};

// Suppress console warnings in tests unless explicitly testing them
const original_warn = console.warn;
const original_error = console.error;
global.console.warn = jest.fn();
global.console.error = jest.fn();

// Restore for specific tests that need to check console output
global.restoreConsole = () => {
    global.console.warn = original_warn;
    global.console.error = original_error;
};
