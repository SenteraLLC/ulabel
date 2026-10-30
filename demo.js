const express = require('express');
const fs = require('fs');
const net = require('net');
const app = express();
// Override with PORT=... (Playwright reads the same variable). Falls through to the next
// free port when the requested one is busy, unless PORT was set explicitly.
const requested_port = Number(process.env.PORT) || 8080;
const port_is_explicit = Boolean(process.env.PORT);
const max_port_attempts = 20;

app.use(express.static('demo'));
app.use(express.static('dist'));

function show_demo_urls(port) {
    console.log(`ULabel demos: http://localhost:${port}/`);
    fs.readdirSync('demo')
        .filter((file) => file.endsWith('.html') && file !== 'index.html')
        .sort()
        .forEach((file) => console.log(`  http://localhost:${port}/${file}`));
}

// Windows lets us bind [::] while another server holds 127.0.0.1 or ::1 on the same port, so
// listen() would not report EADDRINUSE. Probe both loopback addresses first.
function is_port_answering(port) {
    const probe = (host) => new Promise((resolve) => {
        const socket = net.connect({ host, port });
        socket.setTimeout(300);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
        socket.once('error', () => resolve(false));
    });
    return Promise.all([probe('127.0.0.1'), probe('::1')]).then((results) => results.some(Boolean));
}

async function listen(port, attempts_left) {
    if (await is_port_answering(port)) {
        if (!port_is_explicit && attempts_left > 0) {
            listen(port + 1, attempts_left - 1);
        } else {
            console.error(`Could not start demo server on port ${port}: port is in use`);
            process.exit(1);
        }
        return;
    }
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