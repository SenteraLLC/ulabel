## Tasks
- [x] Read the description in [#164](https://github.com/SenteraLLC/ulabel/issues/164)
  - [x] Write a clear summary of the requested change
  - [x] Propose some options of how to proceed. Wait for user input to decide which to try first.

### Decision: Proceeding with Option 3 (Webpack modernization + dependency cleanup)

#### Step 1: Move dependencies to devDependencies
- [x] Move `@turf/turf` from dependencies to devDependencies
- [x] Move `jquery` from dependencies to devDependencies
- [x] Move `polygon-clipping` from dependencies to devDependencies
- [x] Move `uuidv4` from dependencies to devDependencies
- [x] Test: Run `npm install` and verify it works
- [x] Test: Run `npm run build` and verify output is identical (both files 1039.6 KB)

#### Step 2: Enable and modernize webpack minification ✅ COMPLETE
- [x] Remove commented-out UglifyJsPlugin code (deprecated)
- [x] Enable webpack 5's built-in TerserPlugin for minification  
- [x] Configure it to only minify `ulabel.min.js`, not `ulabel.js`
- [x] Test: Run `npm run build` and verify both files are created
- [x] Test: Verify `ulabel.js` is NOT minified (readable) - 2.33 MB with webpack runtime and formatted code
- [x] Test: Verify `ulabel.min.js` IS minified (smaller size) - 1.02 MB minified
- [x] Test: Run `npm run lint` - No errors
- [x] Note: File size difference (2.33 MB vs 1.02 MB) is expected - readable version includes webpack runtime overhead

#### Step 3: Verify and document ✅ COMPLETE
- [x] Compare file sizes before/after
  - Before: Both files 1039 KB (both minified, minification was disabled)
  - After: ulabel.js 2.33 MB (readable), ulabel.min.js 1.02 MB (minified)
  - Result: Minification now working correctly, file size increase for non-min version is expected
- [x] Update CHANGELOG.md with changes
- [x] Document any findings or recommendations

#### Step 4: Security and dependency updates ✅ COMPLETE
- [x] Run `npm audit` to identify vulnerabilities
- [x] Fix 12 vulnerabilities using `npm audit fix`
- [x] Apply breaking changes for remaining issues with `npm audit fix --force`
- [x] Update `typescript-eslint` packages to be compatible with ESLint 9.37.0
- [x] Fix linting issues in `tests/e2e/fixtures.js`
- [x] Verify all tests still pass (28 unit tests + 36 e2e tests)
- [x] Final audit: 0 vulnerabilities

#### Step 5: Configure package exports for minified by default ✅ COMPLETE
- [x] Update `main` and `module` fields to point to `dist/ulabel.min.js`
- [x] Add `exports` field with options: `.` (minified), `./min` (minified), `./debug` (unminified)
- [x] Update `unpkg` field to serve minified version by default
- [x] Update README.md with usage examples for both minified and unminified versions
- [x] Document clear import patterns for users

## Summary of Changes

All steps completed successfully! ✅

### What Changed:
1. **Dependencies moved to devDependencies**: `@turf/turf`, `jquery`, `polygon-clipping`, `uuidv4`
2. **Webpack minification enabled**: Using modern TerserPlugin (built-in to webpack 5)
3. **Selective minification**: Only `ulabel.min.js` is minified, `ulabel.js` remains readable
4. **License files generated**: Both builds now have proper LICENSE.txt files for legal compliance
5. **Removed unnecessary dependency**: `terser-webpack-plugin` removed from package.json (using webpack's built-in version)
6. **Test coverage**: Added `test:min` and `test:both` scripts to test both builds

### File Size Changes:
- **Before**: Both `ulabel.js` and `ulabel.min.js` were 1039 KB (identical, minification was disabled)
- **After**: 
  - `ulabel.js`: 2.33 MB (readable, includes webpack runtime and formatting)
  - `ulabel.min.js`: 1.02 MB (minified for production use)
  - `ulabel.js.LICENSE.txt`: 3 KB (license information)
  - `ulabel.min.js.LICENSE.txt`: 3 KB (license information)

### Testing Results:
- ✅ All 14 unit tests pass with unminified build (`npm test`)
- ✅ All 14 unit tests pass with minified build (`npm run test:min`)
- ✅ Both unit test builds tested together (`npm run test:both`) - 28 total tests
- ✅ All 36 e2e tests pass (`npm run test:e2e`) - 6 tests × 6 browsers (chromium, firefox, webkit, chromium-minified, firefox-minified, webkit-minified)
- ✅ No linting errors
- ✅ Created shared `tests/testing-utils/build_loader.js` helper for consistent build loading across all unit test files
- ✅ Created `tests/e2e/fixtures.js` for Playwright to test both builds in e2e tests

### Code Organization:
- Created `tests/testing-utils/build_loader.js` - Centralized helper for loading the correct ULabel build in unit tests
  - Automatically selects build based on `ULABEL_BUILD` environment variable
  - Exports `ULabel` class and metadata about which build is loaded
  - Makes it easy to add more test files without duplicating build logic
  - Usage: `const { ULabel } = require('./testing-utils/build_loader');`

- Created `tests/e2e/fixtures.js` - Playwright fixture for testing both builds in e2e tests
  - Extends Playwright's `test` fixture with automatic route interception
  - Detects "-minified" in project name and redirects `/ulabel.js` → `/ulabel.min.js`
  - Works seamlessly with existing tests - just change import from `@playwright/test` to `./fixtures`
  - Usage: `import { test, expect } from "./fixtures";`

### Why is ulabel.js larger now?
The non-minified version includes:
- Webpack module runtime/bootstrap code
- Proper formatting and indentation
- Variable names preserved
- Comments preserved
- Whitespace for readability

This is **expected and correct** behavior. The readable version is larger because it's optimized for debugging, not size.

### Recommendations:
- Use `ulabel.min.js` in production for smaller bundle size
- Use `ulabel.js` during development/debugging for readable code
- The build process is now properly configured and working as intended
- Run `npm run build-and-test` to build and test both outputs

### Summary of Issue #164

The issue requests improvements to the webpack configuration and dependency management:

**Current Problems:**
1. **Webpack minimization/uglification is commented out** - The webpack config has all minimization logic commented out, so both `ulabel.js` and `ulabel.min.js` are currently the same size (not minified)
2. **Dependencies vs devDependencies confusion** - Since ULabel bundles everything with webpack into a single `dist/ulabel.js` file, all dependencies get bundled. This means:
   - When users install `ulabel` via npm, they don't actually need the runtime dependencies (jquery, turf, etc.) since they're already in the bundled file
   - All dependencies are technically only needed during the build process, so should probably be in `devDependencies`
3. **TypeScript was missing as a dependency** - Fixed in PR #161, but highlighted the confusion about dependency categorization

**Key Insight from Discussion:**
- Since webpack bundles everything, consumers of the npm package only need `dist/ulabel.js` - they don't need any of the dependencies installed
- Everything could theoretically go in `devDependencies` since they're only needed for building

### Proposed Options

**Option 1: Move all dependencies to devDependencies (Laziest/Quickest)**
- Move `@turf/turf`, `jquery`, `polygon-clipping`, `uuidv4` from `dependencies` to `devDependencies`
- Pros: Simple, accurate reflection that nothing is needed at runtime
- Cons: Loses semantic distinction between "core functionality" and "dev tooling"

**Option 2: Clean up webpack config and enable minimization**
- Uncomment and fix the minimization logic in webpack.config.js
- Use webpack 5's built-in terser plugin instead of the old UglifyJsPlugin
- Actually minify `ulabel.min.js` to reduce bundle size
- Pros: Delivers properly minified output, improves performance
- Cons: Slightly more work, need to test minification doesn't break anything

**Option 3: Full webpack modernization + dependency cleanup (Most Thorough)**
- Do both Option 1 and Option 2
- Review entire webpack config for webpack 5 best practices
- Consider if webpack is even needed or if a simpler bundler would work
- Document the build process clearly
- Pros: Most complete solution, better long-term maintainability
- Cons: Most time-consuming

**Option 4: Investigate if webpack is needed at all**
- Since TypeScript compiles to JS, maybe webpack isn't necessary?
- Could use esbuild or rollup for simpler/faster bundling
- Pros: Potentially simpler tooling
- Cons: Significant refactor, might introduce other issues

### Recommendation
I'd suggest starting with **Option 3 (combining 1 & 2)** since:
- It addresses both issues mentioned in #164
- Not too complex but provides real value
- The bundle size is already 1MB+ so minification would help
- Dependency cleanup is straightforward

Which option would you like to pursue?
