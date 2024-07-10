"use strict";

var log = require("../log"),
    sdk = require("../sdk");

exports.command = async function logout(server_opts) {
	try {
		await sdk.request(server_opts, "user/logout", {}, { exit_on_failure: false });
	}
	catch (e) {
		log.warn("Failed to revoke SDK Token. Your token may not correspond to a valid active user session.");
	}

	// Delete token from local file
	try {
		await sdk.deleteSdkToken(server_opts.host);
		log.victory("Deleted SDK token.");
	}
	catch (e) {
		log.die(e);
	}
};

exports.help = `
flourish logout

Revokes the active user token and deletes it from the .flourish_sdk file from your HOME or USERPROFILE directory. You
will not be able to communicate with the server until you “flourish login”
`;
