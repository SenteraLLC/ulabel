const express = require('express');
const app = express();
const port = 8080;

app.use(express.static('demo'));
app.use(express.static('dist'));
app.listen(port);

// Show URLs for the various demos
console.log(`http://localhost:${port}/single-class.html`);
console.log(`http://localhost:${port}/multi-class.html`);
console.log(`http://localhost:${port}/frames.html`);
