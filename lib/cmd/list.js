"use strict";

var log = require("../log"),
    sdk = require("../sdk");

function byExternalId(a, b) {
	if (a.external_id < b.external_id) return -1;
	if (a.external_id > b.external_id) return +1;
	return 0;
}

module.exports = function(args, server_opts) {
	sdk.request(server_opts, "template/list", {})
		.then((result) => {
			for (let t of result.templates.sort(byExternalId)) {
				console.log(t.external_id);
			}
		})
		.catch((error) => log.die("Failed to list templates", error.message, error.stack));
};
