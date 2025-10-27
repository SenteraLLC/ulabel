module.exports = {
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
    testMatch: [
        "<rootDir>/tests/**/*.test.js",
    ],
    testPathIgnorePatterns: [
        "<rootDir>/tests/e2e/",
        "<rootDir>/tests/utils/",
    ],
    collectCoverageFrom: [
        "src/**/*.{js,ts}",
        "build/**/*.js",
        "!src/version.js",
        "!build/version.js",
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    transform: {
        "^.+\\.(js|ts)$": "babel-jest",
    },
    transformIgnorePatterns: [
        "node_modules/(?!(uuid)/)",
    ],
    // Optimize memory usage
    maxWorkers: 4,
    workerIdleMemoryLimit: "512MB",
    // Clear cache between runs
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    // Reduce noise in error output
    verbose: false,
    // Suppress stack traces
    noStackTrace: true,
    // Suppress console output during tests
    silent: true,
};
