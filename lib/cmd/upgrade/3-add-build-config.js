"use strict";

var fs = require("fs"),

    sdk = require("../../sdk");

function addBuildRules(config) {
	config.build = {
		javascript: {
			script: "npm run build",
			directory: "src",
			files: ["package.json", "rollup.config.js"]
		}
	};
	return config;
}

function upgrade(template_dir) {
	return new Promise(function(resolve, reject) {
		fs.stat(template_dir, function(error, stat) {
			if (error) reject(new Error(`Could not access ${template_dir}: ${error.message}`));
			if (!stat.isDirectory()) reject(new Error(`Not a directory: ${template_dir}`));

			sdk.readConfig(template_dir)
				.then((config) => {
					if ("build" in config) return false;
					return sdk.writeConfig(template_dir, addBuildRules(config))
						.then(() => true);
				})
				.then(resolve, reject);
		});
	});
}

upgrade.title = "Add build rules to template.yml";
module.exports = upgrade;
