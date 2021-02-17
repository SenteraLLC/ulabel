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

let check_session_data = (req_body, callback) => {
    // Make a new obj to return with modified vals
    let new_body = JSON.parse(JSON.stringify(req_body));

    // Ensure image file exists
    let img_path = path.resolve(req_body["image_data"]);
    fs.access(img_path, fs.F_OK, (err) => {
        if (err) {
            callback(2, `Input image ${req_body["image_data"]} could not be found.`, req_body);
            return;
        }
        // Ensure output file can be written to, and overwriting is okay if applicable
        let dst_path = path.resolve(req_body["output_file"]);
        // Fully qualified path names
        new_body["image_data"] = img_path;
        new_body["output_file"] = dst_path;
        fs.access(img_path, fs.F_OK, (err) => {
            if (err) {
                let dst_parent = dst_path.substring(0, dst_path.length - path.basename(dst_path).length);
                fs.access(dst_parent, (err) => {
                    if (err) {
                        // Callback so response can be sent
                        callback(4, `Parent of output file ${dst_path} doesn't exist.`, new_body);
                        return;
                    }
                    // Callback so response can be sent
                    callback(null, null, new_body);
                });
            }
            else {
                if (!("allow_overwrite" in req_body) || !(req_body["allow_overwrite"])) {
                    callback(3, `Output file ${dst_path} exists and allow_overwrite not set to true.`, new_body);
                    return;
                }
                else {
                    // Callback so response can be sent
                    callback(null, null, new_body);
                }
            }
        });
    });

};


let process_task_queue = (rq, tq, cb) => {
    if (tq.length == 0) {
        cb(rq);
        return;
    }
    let task = tq.pop();
    fs.readFile(rq["subtasks"][task]["resume_from"], (err, data) => {
        if (err) {
            rq["subtasks"][task]["resume_from"] = null;
        }
        else {
            try {
                rq["subtasks"][task]["resume_from"] = JSON.parse(data);
            }
            catch (err) {
                rq["subtasks"][task]["resume_from"] = null;
            }
        }
        process_task_queue(rq, tq, cb);
    });
    return;
};


let expand_resume_from_files = (rq, cb) => {
    // Detect which subtasks need resume_from expansion
    let task_queue = [];
    for (const st in rq["subtasks"]) {
        if (typeof rq["subtasks"][st]["resume_from"] == "string") {
            task_queue.push(st);
        }
    }
    process_task_queue(rq, task_queue, (new_rq) => {
        cb(new_rq);
    });
};

let process_session_data = (req_body, callback) => {
    // For each subtask
    // If resume_from is a string, interpret it as a file and load its contents
    expand_resume_from_files(req_body, (expanded_req) => {
        // Callback so response can be sent
        callback(null, expanded_req);
    });
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
        process_session_data(orig_body, (err, new_body) => {
            // Produce a render object
            let render_obj = {
                msg: "Hello, world!",
                image_data: "http://localhost:" + port + "/image?path=" + new_body["image_data"],
                username: new_body["username"],
                subtasks: new_body["subtasks"],
                output_file: new_body["output_file"]
            };

            // Render an HTML doc that contains the desired session
            res.end(index_tpl(render_obj));
        });
    }
    else if (this_url.pathname == "/save" && req.method == "POST") {
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
            if (body_obj.allow_overwrite == false) {
                // Check to make sure file doesn't exist
                fs.access(body_obj.destination, fs.constants.F_OK, (err) => {
                    if (!err) {
                        res.end(JSON.stringify({
                            err: err,
                            err_msg: `File "${body_obj.destination}" exists and overwrite set to not allowed.`,
                            url: null
                        }));
                        return;
                    }
                    else {
                        fs.writeFile(body_obj.destination, JSON.stringify(body_obj.annotations, null, 2), (err) => {
                            res.setHeader('Content-Type', 'application/json');
                            if (err) {
                                res.end(JSON.stringify({
                                    err: 1,
                                    err_msg: `Could not write data to ${body_obj.destination}`,
                                    url: null
                                }));
                            }
                            else {
                                res.end(JSON.stringify({
                                    err: null,
                                    err_msg: `Wrote data to ${body_obj.destination}`,
                                    url: null
                                }));
                            }
                            return;
                        });            
                    }
                });
            }
            else {
                fs.writeFile(body_obj.destination, JSON.stringify(body_obj.annotations, null, 2), (err) => {
                    res.setHeader('Content-Type', 'application/json');
                    if (err) {
                        res.end(JSON.stringify({
                            err: 1,
                            err_msg: `Could not write data to ${body_obj.destination}`,
                            url: null
                        }));
                    }
                    else {
                        res.end(JSON.stringify({
                            err: null,
                            err_msg: `Wrote data to ${body_obj.destination}`,
                            url: null
                        }));
                    }
                    return;
                });
            }
        });
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
            check_session_data(body_obj, (err, err_msg, new_body) => {
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
                        req: JSON.stringify(new_body)
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
                    if ("open" in new_body && new_body["open"]) {
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