"use strict";

var log = require("../log"),
    sdk = require("../sdk");

function version(args) {
	sdk.getSDKVersion()
		.then((version_number) => console.log(version_number))
		.catch((error) => {
			if (args.debug) log.die("Failed to get SDK version number", error.message, error.stack);
			else log.die("Failed to get SDK version number", error.message);
		});
}

version.help = `
Prints the version number of the Flourish SDK.
`;

module.exports = version;
