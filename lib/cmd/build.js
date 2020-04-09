"use strict";

var fs = require("fs"),

    log = require("../log"),
    sdk = require("../sdk");

function build(args) {
	const template_dir = ".";
	if (!fs.existsSync("template.yml")) {
		log.die("No template.yml file found in the current directory");
	}

	const keys = args._.slice(1);
	if (keys.length == 0) {
		sdk.buildTemplate(template_dir, args.env, "build")
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
				p = p.then(() => sdk.runBuildCommand(template_dir, script, args.env));
			}
			return p;
		})
		.then(() => log.victory("Done!"))
		.catch((error) => log.die("Failed to build template", error.message, error.stack));
}

build.help = `
flourish build [options] [build rules...]

Build the template in the current directory.

Build rules are specified in template.yml. By default “flourish build” runs
all build rules. If rules are named on the command line, just those rules are
run.

This is mainly useful for testing build rules. In the ordinary course of
development, your template will be built when “flourish run” is called and
rebuilt when source files change, according to the build rules in template.yml.

Options:
--env=development [default]
--env=production
	Set the NODE_ENV environment variable to the specified value before running
	the build script.
`;

module.exports = build;
