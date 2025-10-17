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