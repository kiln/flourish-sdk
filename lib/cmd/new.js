"use strict";

var child_process = require("child_process"),
    fs = require("fs"),
    ncp = require("ncp"),
    path = require("path"),

    log = require("../log");

module.exports = function(args) {
	const new_template_path = args._[1];
	if (!new_template_path) {
		log.die("Please specify a directory name for the new template. E.g. flourish new my_template");
	}

	const skeleton_path = path.join(__dirname, "..", "..", "skeleton");

	if (fs.existsSync(new_template_path)) {
		log.die(`The path ‘${new_template_path}’ already exists`);
	}

	ncp.ncp(skeleton_path, new_template_path, { dereference: true }, function(error) {
		if (error) {
			log.problem(`Failed to create skeleton template in directory ${new_template_path}`);
			log.die(error);
		}

		log.success(`Created skeleton template in directory ${new_template_path}`,
			"Running ‘npm update’ on the new template");
		try {
			child_process.spawn("npm", ["update"], { cwd: new_template_path, stdio: "inherit" })
				.on("error", function(error) {
					log.die("Failed to run ‘npm update’ on new template ${new_template_path}",
						error.message);
				})
				.on("exit", function(exit_code) {
					if (exit_code != 0) {
						log.die("Failed to run ‘npm update’ on new template ${new_template_path}");
					}
					log.victory(`Created new template ${new_template_path}`);
					log.success(`Now you can ‘flourish run ${new_template_path.replace(/(["'\\!\${}\s])/g, "\\$1")}’`);
				});
		}
		catch(error) {
			log.die(`Failed to run ‘npm update’ in new template ${new_template_path}`,
				"Try running it by hand");
		}
	});
};
