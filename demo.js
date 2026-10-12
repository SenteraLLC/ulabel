const express = require('express');
const app = express();
// Override with PORT=... (Playwright reads the same variable). Falls through to the next
// free port when the requested one is busy, unless PORT was set explicitly.
const requested_port = Number(process.env.PORT) || 8080;
const port_is_explicit = Boolean(process.env.PORT);
const max_port_attempts = 20;

app.use(express.static('demo'));
app.use(express.static('dist'));

function show_demo_urls(port) {
    console.log(`http://localhost:${port}/single-class.html`);
    console.log(`http://localhost:${port}/multi-class.html`);
    console.log(`http://localhost:${port}/frames.html`);
    console.log(`http://localhost:${port}/box-roi.html`);
    console.log(`http://localhost:${port}/resume-from.html`);
    console.log(`http://localhost:${port}/read-only.html`);
    console.log(`http://localhost:${port}/row-filtering-example.html`);
    console.log(`http://localhost:${port}/bitmask-example.html`);
    console.log(`http://localhost:${port}/set-annotations.html`);
    console.log(`http://localhost:${port}/class-focus.html`);
    console.log(`http://localhost:${port}/live_demo.html`);
    console.log(`http://localhost:${port}/offset-container.html`);
    console.log(`http://localhost:${port}/submit-payload.html`);
}

function listen(port, attempts_left) {
    const server = app.listen(port, () => {
        if (port !== requested_port) {
            console.log(`Port ${requested_port} is in use; using ${port} instead.`);
        }
        show_demo_urls(port);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && !port_is_explicit && attempts_left > 0) {
            listen(port + 1, attempts_left - 1);
        } else {
            console.error(`Could not start demo server on port ${port}: ${err.message}`);
            process.exit(1);
        }
    });
}

listen(requested_port, max_port_attempts);