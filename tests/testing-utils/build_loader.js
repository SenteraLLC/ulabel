/**
 * Helper utility for loading the correct ULabel build based on environment variables.
 *
 * Usage:
 *   const { ULabel } = require('./testing-utils/build_loader');
 *
 * By default, loads the unminified build (dist/ulabel.js).
 * Set ULABEL_BUILD=min to test the minified build (dist/ulabel.min.js).
 *
 * Example:
 *   npm test              # Tests unminified build
 *   npm run test:min      # Tests minified build
 *   npm run test:both     # Tests both builds
 */

const buildType = process.env.ULABEL_BUILD === "min" ? "min" : "";
const buildFile = buildType ? `ulabel.${buildType}.js` : "ulabel.js";
const buildPath = `../../dist/${buildFile}`;

// Load the module
const ulabel_module = require(buildPath);

// Export both the module and the ULabel class for convenience
module.exports = {
    ulabel_module,
    ULabel: ulabel_module.ULabel,
    buildFile,
    buildType: buildType || "unminified",
    // Helper to get a human-readable description of which build is loaded
    getBuildDescription: () => `${buildType || "unminified"} (dist/${buildFile})`,
};
