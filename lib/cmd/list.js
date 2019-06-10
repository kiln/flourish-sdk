"use strict";

var semver = require("@flourish/semver");

var log = require("../log"),
    sdk = require("../sdk");

function byExternalIdAndVersion(a, b) {
	if (a.external_id < b.external_id) return -1;
	if (a.external_id > b.external_id) return +1;

	if (!a.version && !b.version) return 0;
	if (!a.version) return -1;
	if (!b.version) return +1;

	return semver.cmp(semver.parse(a.version), semver.parse(b.version));
}

function list(args, server_opts) {
	const username_template_id = args._[1];
	let username = args.as,
	    template_id;
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
	sdk.request(server_opts, "template/list", { username })
		.then((result) => {
			let templates = result.templates;

			templates = templates.filter(t => {
				return (!template_id || t.external_id == template_id);
			});
			templates.sort(byExternalIdAndVersion);

			if (args.full) {
				console.log(JSON.stringify(templates, null, 4));
			}
			else for (let t of templates) {
				if (t.version) {
					console.log(t.external_id + " " + t.version);
				}
				else {
					console.log(t.external_id);
				}
			}
		})
		.catch((error) => log.die("Failed to list templates", error.message, error.stack));
}

list.help = `
flourish list [template id]

List the ids and versions of your published templates.

If you specify a template id, it will list the versions of that template
that are available on the server.

With the --full option, prints all the template metadata in JSON format.

This command requires you to be logged in to an account.
`;

module.exports = list;
