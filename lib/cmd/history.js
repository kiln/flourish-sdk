"use strict";

var semver = require("@flourish/semver");

var log = require("../log"),
    sdk = require("../sdk");

function byVersion(a, b) {
	return semver.cmp(semver.parse(a.version), semver.parse(b.version));
}

function history(args, server_opts) {
	const username_template_id = args._[1];
	if (!username_template_id) {
		log.die("Please specify a template id. E.g. flourish history my-template");
	}
	let username, template_id;
	if (username_template_id && username_template_id.match(/^@/)) {
		const mo = username_template_id.match(/^@([^/]+)\/(.+)/);
		if (mo) {
			username = mo[1];
			template_id = mo[2];
		}
		else {
			username = username_template_id.substr(1);
		}
	}
	else if (username_template_id) {
		template_id = username_template_id;
	}
	sdk.request(server_opts, "template/history", { username, id: template_id })
		.then((result) => {
			const template_versions = result.sort(byVersion);

			if (args.full) {
				console.log(JSON.stringify(template_versions, null, 4));
			}
			else for (let tv of template_versions) {
				console.log(`[${tv.created}] ${template_id} ${tv.version}`);
			}
		})
		.catch((error) => log.die("Failed to list template history", error.message, error.stack));
}

history.help = `
flourish history [template id]

List the version numbers of a published template.

These are the versions that are available to be used in the Live API.
This includes every non-prerelease version that was published, and
any prereleases that have not been superseded by a release.

With the --full option, prints all the template metadata in JSON format.

This command requires you to be logged in to an account.
`;

module.exports = history;
