"use strict";

var log = require("../log"),
    sdk = require("../sdk");

module.exports = function(args, server_opts) {
	function whoami() {
		return sdk.request(server_opts, "whoami", {});
	}

	sdk.request(server_opts, "user/whoami", {})
		.then((user_info) => {
			if (args.full) {
				console.log(`${user_info.display_name}, ${user_info.organisation} <${user_info.email}>`);
			}
			else {
				console.log(user_info.email);
			}
		})
		.catch((error) => log.die("Unexpected error", error.message, error.stack));
};
