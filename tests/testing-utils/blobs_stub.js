// Test stub for the ESM `src/blobs.js` module (SVG icon strings).
// The real file uses ESM `export` syntax which jest does not transform, and the SVG contents are
// irrelevant to unit tests. Any named import resolves to an empty string. See jest.config.js
// `moduleNameMapper`.
module.exports = new Proxy({}, { get: () => "" });
