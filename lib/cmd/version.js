"use strict";

var sdk = require("../sdk");

exports.command = function version() {
	console.log(sdk.SDK_VERSION);
};

exports.help = `
Prints the version number of the Flourish SDK.
`;
