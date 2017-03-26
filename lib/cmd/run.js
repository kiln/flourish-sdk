"use strict";

var fs = require("fs"),
    path = require("path"),

    log = require("../log"),
    sdk = require("../sdk"),

    server = require("../../server");

module.exports = function run(args) {
	const template_dir = args._[1] || ".";
	const port = +args.port;

	function runServer() {
		server(template_dir, port, args.open, args.debug);
	}

	fs.stat(template_dir, function(error, stat) {
		if (error) log.die(`Could not access ${template_dir}: ${error.message}`);
		if (!stat.isDirectory()) log.die(`Not a directory: ${template_dir}`);

		if (!fs.existsSync(path.join(template_dir, "template.yml"))) {
			log.die("No template.yml file found in template directory",
				"Was this template was created for an earlier version of Flourish?",
				"If so, you can run 'flourish upgrade' to upgrade it");
		}

		var template_js = path.join(template_dir, "template.js");

		if (!args.build) {
			sdk.checkTemplateVersion(template_dir)
				.then(() => runServer())
				.catch((error) => {
					log.die(error.message);
				});
		}
		else {
			sdk.buildTemplate(template_dir)
				.catch((error) => {
					log.die("Failed to build template", error.message);
				})
				.then(() => {
					log.success("Build script finished", "Running server");
					runServer();
				})
				.catch((error) => {
					log.die(error.message, error.stack);
				});
		}
	});
};
