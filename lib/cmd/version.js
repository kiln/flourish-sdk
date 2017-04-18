"use strict";

var path = require("path"),

    log = require("../log"),
    sdk = require("../sdk");

function version(args, server_opts) {
	sdk.getSDKVersion()
		.then((version_number) => console.log(version_number))
		.catch((error) => {
			if (args.debug) log.die("Failed to get SDK version number", error.message, error.stack);
			else log.die("Failed to get SDK version number", error.message);
		});
};

version.help = `
Prints the version number of the Flourish SDK.
`;

module.exports = version;
