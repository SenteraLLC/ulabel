const http = require('http');
const finalhandler = require('finalhandler');
const servestatic = require('serve-static');
const path = require('path');
const open = require('open');
var URL = require('url').URL

const port = 8080;

const base_dir = path.dirname(__filename).split(path.sep).slice(0, -1).join(path.sep);
let static_ulabel_server = servestatic(path.resolve(base_dir, "src"), { 'index': false });
let static_demo_server = servestatic(path.resolve(base_dir, "demo"), { 'index': false });
let static_sagemaker_server = servestatic(path.resolve(base_dir, "sagemaker/dist"), { 'index': false });

const server = http.createServer(function(req, res) {
    var url = new URL("https://ulabel.pl:" + port + req.url);
    switch (url.pathname) {
        case "/male_female.html":
        case "/single_class.html":
        case "/demo_image.jpg":
        case "/kits21.html":
                static_demo_server(req, res, finalhandler(req, res));
            break;
        case "/ulabel.js":
        case "/ulabel.css":
        case "/media/polygon.svg":
        case "/media/bbox.svg":
        case "/media/contour.svg":
                    static_ulabel_server(req, res, finalhandler(req, res));
            break;
        case "/favicon.ico":
            res.statusCode = 302;
            res.setHeader('Location', 'https://sentera.com/wp-content/uploads/2018/03/Favicon.png');
            res.end()
        case "/template.liquid.html":
        case "/ulabel-0.0.5-dev.liquid.html":
        case "/ulabel-0.0.6.liquid.html":
                static_sagemaker_server(req, res, finalhandler(req, res));
            break;    
        default:
            res.statusCode = 404;
            res.end();
            break;
    }
});

server.listen(port, function() {
    console.log("Demo running at");
    console.log(" http://localhost:" + port + "/male_female.html");
    console.log(" http://localhost:" + port + "/single_class.html");
    open("http://localhost:" + port + "/male_female.html");
});