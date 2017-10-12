"use strict";

var log = require("../log"),
    sdk = require("../sdk");

function whoami(args, server_opts) {
	sdk.request(server_opts, "user/whoami", {})
		.then((user_info) => {
			if (args.full) {
				console.log(JSON.stringify(user_info, null, 4));
			}
			else {
				console.log(user_info.username);
			}
		})
		.catch((error) => log.die("Unexpected error", error.message, error.stack));
}

whoami.help = `
flourish [--full] whoami

With no options, prints the username of the currently logged-in account.

With the --full option, prints all the account metadata in JSON format.
`;

module.exports = whoami;
