"use strict";

var fs = require("fs"),
    path = require("path"),

    log = require("../log"),
    sdk = require("../sdk");

module.exports = function build(args) {
	const template_dir = ".";
	if (!fs.existsSync("template.yml")) {
		log.die("No template.yml file found in the current directory");
	}

	const keys = args._.slice(1);
	if (keys.length == 0) {
		sdk.buildTemplate(template_dir)
			.then(() => log.victory("Template built!"))
			.catch((error) => log.die("Failed to build template", error.message));
		return;
	}

	sdk.buildRules(template_dir)
		.then((rules) => {
			const script_by_key = new Map();
			for (const rule of rules) script_by_key.set(rule.key, rule.script);

			const scripts_to_run = [];
			for (const key of keys) {
				if (!script_by_key.has(key)) {
					log.die("No such build rule: " + key);
				}
				scripts_to_run.push(script_by_key.get(key));
			}

			let p = Promise.resolve();
			for (let script of scripts_to_run) {
				p = p.then(() => sdk.runBuildCommand(template_dir, script));
			}
			return p;
		})
		.then(() => log.victory("Done!"))
		.catch((error) => log.die("Failed to build template", error.message, error.stack));
};
