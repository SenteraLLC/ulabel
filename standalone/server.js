const http = require('http');
const path = require('path');
const open = require('open');
var url = require('url');
var querystring = require('querystring');
var swig = require('swig');
var fs = require('fs');

const port = 8081;

const index_tpl = swig.compileFile(path.resolve(__dirname, 'index.tpl'));
const ulabel_path = path.resolve(path.resolve(path.resolve(__dirname, ".."), "dist"), "ulabel.js");

let error_check_session_data = (req_body, callback) => {
    // TODO
    callback(null, null);
};


let serve_single_static_file = (file_path, mime_type, res) => {
    fs.readFile(file_path, (err, data) => {
        if(err) {
          // if the file is not found, return 404
          res.statusCode = 404;
          res.end(`File ${file_path} could not be retrieved.`);
          return;
        }
        res.setHeader('Content-type', mime_type);
        res.end(data);
    });
};


const server = http.createServer(function(req, res) {
    const this_url = new url.URL("https://ulabel.pl:" + port + req.url);
    const query = url.parse(req.url,true).query;
    if (this_url.pathname == "/" && req.method == 'GET') {
        // Get raw original request data
        let orig_body = JSON.parse(query.req);

        // Produce a render object
        let render_obj = {
            msg: "Hello, world!",
            image_data: "http://localhost:" + port + "/image?path=" + orig_body["image_data"]
        };

        // Render an HTML doc that contains the desired session
        res.end(index_tpl(render_obj));
    }
    else if (this_url.pathname == "/save" && req.method == "POST") {
        // Save this data in desired location
        // TODO
    }
    else if (this_url.pathname == "/new" && req.method == 'POST') {
        // Get contents of the request
        var body = '';
        req.on('data', (data) => {
            // TODO maybe limit the size of this for security...
            // I mean it is an internal tool -- *shrug*
            body += data;
        });
        req.on('end', () => {
            let body_obj = {};
            try {
                body_obj = JSON.parse(body)
            } catch(err) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    err: 1,
                    err_msg: "Request body could not be parsed as JSON.",
                    url: null
                }));
                return;
            }

            // Ensure that files exist and output can be written to
            error_check_session_data(body_obj, (err, err_msg) => {
                if (err != null) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        err: err,
                        err_msg: err_msg,
                        url: null
                    }));
                    return;
                }
                else {
                    // Create a URL that will work for accessing this session
                    let url_data = {
                        req: JSON.stringify(body_obj)
                    };
                    let sess_url = "http://localhost:" + port + "/?" + querystring.stringify(url_data);

                    // Send response
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        err: null,
                        err_msg: "",
                        url: sess_url
                    }));

                    // If asked to open it, then open it
                    if ("open" in body_obj && body_obj["open"]) {
                        open(sess_url);
                    }
                }
            });
        });
    }
    else if (this_url.pathname == "/image" && req.method == "GET") {
        // Retrieve and serve an arbitrary image from disk
        const ext = path.parse(query.path).ext;
        let mime = "image/jpeg";
        switch (ext) {
            case ".png":
                mime = "image/png";
            break;
        }
        serve_single_static_file(query.path, mime, res);
    }
    else if (this_url.pathname == "/ulabel.js" && req.method == "GET") {
        // Retrieve and serve ULabel build
        serve_single_static_file(ulabel_path, "text/javascript", res);
    }
    else { // Assume this is now requesting the image
        console.log("404:", this_url.pathname);
        res.statusCode = 404;
        res.end();
    }

});

server.listen(port, function() {});