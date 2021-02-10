const http = require('http');
const path = require('path');
const open = require('open');
var url = require('url');
var querystring = require('querystring');
var swig = require('swig');

const port = 8081;

var index_tpl = swig.compileFile(path.resolve(__dirname, 'index.tpl'));

const server = http.createServer(function(req, res) {
    const this_url = new url.URL("https://ulabel.pl:" + port + req.url);
    const query = url.parse(req.url,true).query;
    if (this_url.pathname == "/" && req.method == 'GET') {
        // Read configuration files contents
        // TODO

        // Render an HTML doc that contains the desired session
        // TODO
        res.end(index_tpl({msg: "Hello, world!"}));
    }
    else if (this_url.pathname == "/new" && req.method == 'POST') {
        // Get contents of the request
        var body = '';
        req.on('data', function(data) {
            console.log("DATA");
            body += data;
        })
        req.on('end', function() {
            console.log("END");
            let body_obj = {};
            try {
                body_obj = JSON.parse(body)
            } catch(err) {}
            console.log(JSON.stringify(body_obj, null, 2));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({hello: 'there'}));

            // Ensure that files exist and output can be written to
            // TODO

            // Create a URL that will work for accessing this session
            // TODO
            let sess_url = "http://localhost:" + port + "/?" + querystring.stringify(query);

            // If asked to open it, then open it
            // TODO
            if (false) {
                open();
            }
        });
    }
    else { // Assume this is now requesting the image
        res.statusCode = 404;
        res.end();
    }

});

server.listen(port, function() {});