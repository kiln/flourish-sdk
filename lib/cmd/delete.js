"use strict";

var log = require("../log"),
    sdk = require("../sdk");

function _delete(args, server_opts) {
	let template_id = args._[1],
	    template_version = args._[2];

	if (!template_id) {
		log.die("Usage: flourish delete template_id version");
	}
	if (args.as) {
		template_id = args.as + "/" + template_id;
	}

	sdk.request(server_opts, "template/delete", { id: template_id, version: template_version, force: !!args.force })
		.then(() => {
			if (template_version) {
				log.success(`Deleted template ${template_id} version ${template_version}`);
			}
			else {
				log.success("Deleted template " + template_id);
			}
		})
		.catch((error) => {
			if (args.debug) log.die("Failed to delete template", error.message, error.stack);
			else log.die("Failed to delete template", error.message);
		});
}

_delete.help = `
flourish delete [--force] template_id version

Deletes the specified template from the server, assuming it has previously
been published using “flourish publish”.

If you do not specify a version, Flourish will treat it as a legacy
unversioned template. If you have ever published the template with a
version number, you must specify which version to delete. Use
“flourish list template_id” to see which versions are on the system.

If the template is in use by users other than you, it will not be possible
to delete it. If you have used it, you can pass the --force flag to delete
the template and associated visualisations.
`;

module.exports = _delete;
