"use strict";

var log = require("../log"),
    sdk = require("../sdk");

module.exports = function(args, server_opts) {
	const template_dir = args._[1] || ".";

	sdk.readConfig(template_dir)
		.then((config) => {
			if (!config.id) log.die("The template’s template.yml doesn't have an id. Add one and try again.");

			log.success("Preparing template with id " + config.id + " for upload.");
			return config.id;
		})
		.then((template_id) =>
			sdk.request(server_opts, "template/delete", { id: template_id })
				.then(() => log.success("Deleted template " + template_id))
		)
		.catch((error) => log.die("Failed to delete template", error.message, error.stack));
};
