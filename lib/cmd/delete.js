"use strict";

var log = require("../log"),
    sdk = require("../sdk");

function _delete(args, server_opts) {
	let template_id = args._[1];

	if (!template_id) {
		log.die("Usage: flourish delete template_id");
	}
	if (args.as) {
		template_id = args.as + "/" + template_id;
	}

	sdk.request(server_opts, "template/delete", { id: template_id, force: !!args.force })
		.then(() => log.success("Deleted template " + template_id))
		.catch((error) => {
			if (args.debug) log.die("Failed to delete template", error.message, error.stack);
			else log.die("Failed to delete template", error.message);
		});
}

_delete.help = `
flourish delete [--force] template_id

Deletes the specified template from the server, assuming it has previously
been published using “flourish publish”.

If the template is in use by users other than you, it will not be possible
to delete it. If you have used it, you can pass the --force flag to delete
the template and associated visualisations.
`;

module.exports = _delete;
