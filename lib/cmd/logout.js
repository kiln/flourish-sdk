"use strict";

var log = require("../log"),
    sdk = require("../sdk");

module.exports = function(args, server_opts) {
	sdk.deleteApiTokens()
		.then(() => log.victory("Deleted all API tokens"))
		.catch((error) => log.die(error));
};
