"use strict";

var log = require("../log"),
    sdk = require("../sdk");

function logout() {
	sdk.deleteApiTokens()
		.then(() => log.victory("Deleted all API tokens"))
		.catch((error) => log.die(error));
}

logout.help = `
flourish logout

Deletes the .flourish_sdk file from your HOME or USERPROFILE directory. You
will not be able to communicate with the server until you “flourish login”
`;

module.exports = logout;
