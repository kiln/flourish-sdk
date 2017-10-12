"use strict";

var cross_spawn = require("cross-spawn"),
    fs = require("fs"),
    ncp = require("ncp"),
    path = require("path"),

    log = require("../log");

function _new(args) {
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
			"Running ‘npm install’ on the new template");
		try {
			cross_spawn.spawn("npm", ["update"], { cwd: new_template_path, stdio: "inherit" })
				.on("error", function(error) {
					log.die("Failed to run ‘npm install’ on new template ${new_template_path}",
						error.message);
				})
				.on("exit", function(exit_code) {
					if (exit_code != 0) {
						log.die("Failed to run ‘npm install’ on new template ${new_template_path}");
					}
					log.victory(`Created new template ${new_template_path}`);
					log.success(`Now you can ‘flourish run ${new_template_path.replace(/(["'\\!${}\s])/g, "\\$1")}’`);
				});
		}
		catch (error) {
			log.die(`Failed to run ‘npm install’ in new template ${new_template_path}`,
				"Try running it by hand");
		}
	});
}

_new.help = `
flourish new directory_name

Creates a new skeleton Flourish template in the named directory,
and runs “npm install” to populate its node_modules directory.

The skeleton template has an example build configuration that uses
Less to compile stylesheets and Rollup to bundle JavaScript code.
You can run it in the SDK using “flourish run”.
`;

module.exports = _new;
