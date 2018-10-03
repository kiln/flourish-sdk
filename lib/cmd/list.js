"use strict";

var log = require("../log"),
    sdk = require("../sdk");

function byExternalId(a, b) {
	if (a.external_id < b.external_id) return -1;
	if (a.external_id > b.external_id) return +1;
	return 0;
}

function list(args, server_opts) {
	const username = args._[1];
	sdk.request(server_opts, "template/list", { username })
		.then((result) => {
			if (args.full) {
				console.log(JSON.stringify(result.templates, null, 4));
			}
			else for (let t of result.templates.sort(byExternalId)) {
				console.log(t.external_id);
			}
		})
		.catch((error) => log.die("Failed to list templates", error.message, error.stack));
}

list.help = `
flourish list

List the ids of your published templates.

With the --full option, prints all the template metadata in JSON format.

This command requires you to be logged in to an account.
`;

module.exports = list;
