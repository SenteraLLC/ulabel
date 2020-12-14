let dbserv = require('../services/database_service');

// Namespace
var query_ns = query_ns || {};

exports.query = (req, res) => {
    res.send(dbserv.query_db(JSON.stringify(req.body)));
}