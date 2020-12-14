var express = require('express');
var router = express.Router();

// Pages
var browse_controller = require('./controllers/browse_controller');
var annotate_controller = require('./controllers/annotate_controller');
var query_controller = require('./controllers/query_controller');

// Route GET requests
router.get('/', browse_controller.get_browse);
router.get('/annotate', annotate_controller.get_annotate);
router.post('/query', query_controller.query);

module.exports = router;