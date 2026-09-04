// npm "prepare" hook.
//
// This runs both for local development installs and when a consumer installs
// ULabel straight from git (e.g. `npm install github:SenteraLLC/ulabel#<sha>`).
// In the git case it is the only chance to turn the source checkout into an
// installable package: npm packs the result using the "files" field, so dist/
// must exist by the time this script exits.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root_dir = path.resolve(__dirname, "..");
const dist_entry = path.join(root_dir, "dist", "ulabel.min.js");
const dist_types = path.join(root_dir, "dist", "index.d.ts");

function run(command) {
    execSync(command, { cwd: root_dir, stdio: "inherit" });
}

function setup_git_hooks() {
    // Only meaningful in a working clone; consumers and CI have no use for it.
    if (process.env.CI || !fs.existsSync(path.join(root_dir, ".git"))) return;
    try {
        run("husky");
    } catch {
        console.warn("[prepare] skipping husky setup");
    }
}

function build_if_needed() {
    if (fs.existsSync(dist_entry) && fs.existsSync(dist_types)) return;
    console.log("[prepare] dist/ is missing, running build");
    run("npm run build");
}

setup_git_hooks();
build_if_needed();
