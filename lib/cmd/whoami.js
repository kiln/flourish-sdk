"use strict";

var log = require("../log"),
    sdk = require("../sdk");

exports.command = function whoami(args) {
	sdk.request(args, "user/whoami", {})
		.then((user_info) => {
			if (args.full) {
				console.log(JSON.stringify(user_info, null, 4));
			}
			else {
				console.log(user_info.username);
			}
		})
		.catch((error) => log.die("Unexpected error", error.message, error.stack));
};

exports.help = `
flourish [--full] whoami

With no options, prints the username of the currently logged-in account.

With the --full option, prints all the account metadata in JSON format.
`;
