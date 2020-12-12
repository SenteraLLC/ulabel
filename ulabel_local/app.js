var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var path = require('path');
var swig = require('swig');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configure static server
app.use('/public', express.static(path.resolve(__dirname + '/public')));

// Configure templating
app.engine('tpl', swig.renderFile);
app.set('view engine', 'tpl');
app.set('views', __dirname + '/views');

var routes = require('./routes');
app.use('/', routes);

module.exports = app;