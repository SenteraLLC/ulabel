let dbserv = require('../services/database_service');

var browse_ns = browse_ns ||{};

exports.get_browse = function(req, res) {
    res.render("browse");
};