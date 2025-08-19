## General Instructions
- Keep it simple.
- Work in small, incremental changes.
- Whenever you run a command in the terminal, pipe the output to a file, output.txt, that you can read from. Make sure to overwrite each time so that it doesn't grow too big. There is a bug in the current version of Copilot that causes it to not read the output of commands correctly. This workaround allows you to read the output from the temporary file instead.
- Ensure changes pass linting checks by running `npm run lint` and waiting for it to complete. Read the linting errors and resolve them manually.
- Ensure changes build successfully by running `npm run build`.
- Do not add new dependencies unless given explicit permission.
- Do not modify the `package.json` or `package-lock.json` files unless instructed.


## Task Tracking
- Always start each step by referencing and updating your tasks in `.github/tasks.md`.
- Use checkboxes to track progress.
- Work on one task at a time.
- Do not mark tasks as complete until they are fully done. Ask for confirmation if unsure.