const open = require('open');

var app = require('./app');

let port = 8080;
var server = app.listen(port, function(){
     console.log("Server is running on port " + port);
     open("http://localhost:" + port + "/");
});
