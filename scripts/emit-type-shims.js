// Build helper: assemble the published type declarations under dist/.
//
// The hand-written root index.d.ts is the source of truth for the public API,
// but it imports the concrete classes from ./src/* (so ULabel's own source
// build type-checks against a single identity). Publishing it as-is would drag
// raw .ts source into consumers, so instead we:
//
//   1. Emit generated declarations from src into dist/types/ (see
//      tsconfig.types.json), and
//   2. Write a published entry dist/index.d.ts that is the root index.d.ts with
//      its "./src/" imports rewritten to the generated "./types/" siblings.
//
// The generated declarations preserve their source import specifiers, so files
// under dist/types/ still reference "..", "../index" and "../src/index" (which
// point at the root index.d.ts / src bridge in the source tree). We add small
// shims so those specifiers resolve to the published entry within dist/.
//
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const root_dir = path.resolve(__dirname, "..");
const dist_dir = path.join(root_dir, "dist");
const types_dir = path.join(dist_dir, "types");
const src_dir = path.join(dist_dir, "src");

fs.mkdirSync(types_dir, { recursive: true });
fs.mkdirSync(src_dir, { recursive: true });

// Published entry: root index.d.ts with concrete-class imports repointed at the
// generated declarations. Nothing here resolves back into raw .ts source.
const root_types = fs.readFileSync(path.join(root_dir, "index.d.ts"), "utf8");
const published_entry = root_types.replace(/\.\/src\//g, "./types/");
fs.writeFileSync(path.join(dist_dir, "index.d.ts"), published_entry);

// Shims so generated declarations resolve to the published entry:
// - dist/types/*.d.ts import shared types from ".." and ULabel from "../index".
// - dist/types/**/*.d.ts import ULabel from "../src/index" (and "../../src/index").
fs.writeFileSync(path.join(types_dir, "index.d.ts"), "export * from \"..\";\n");
fs.writeFileSync(path.join(src_dir, "index.d.ts"), "export * from \"../index\";\n");

