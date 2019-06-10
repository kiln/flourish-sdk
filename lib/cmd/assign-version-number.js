"use strict";

const semver = require("@flourish/semver");

const log = require("../log"),
      sdk = require("../sdk");

function assign_version_number(args, server_opts) {
	let template_id_promise, template_version;
	if (args._.length == 2) {
		// Assume the supplied argument is a version number, and try to get the id from the current directory
		template_id_promise = sdk.readAndValidateConfig(".").then(config => config.id);
		template_version = args._[1];
	}
	else if (args._.length == 3) {
		template_id_promise = Promise.resolve(args._[1]);
		template_version = args._[2];
	}
	else log.die("Usage: flourish assign-version-number [template-id] version");

	try {
		semver.parse(template_version);
	}
	catch (e) {
		log.die("Invalid version number: " + template_version);
	}

	template_id_promise.then(template_id => {
		if (args.as) template_id = args.as + "/" + template_id;
		return sdk.request(server_opts, "template/assign-version-number", { id: template_id, version: template_version })
		.then(() => {
			log.success(`Assigned version number ${template_version} to template ${template_id}`);
		});
	})
	.catch((error) => {
		if (args.debug) log.die("Failed to assign version number", error.message, error.stack);
		else log.die("Failed to assign version number", error.message);
	});
}

assign_version_number.help = `
flourish assign-version-number [template-id] version

Assign a version number to a template that does not have one yet.
If template-id is omitted, uses the id of the template in the
current directory.
`;

module.exports = assign_version_number;
