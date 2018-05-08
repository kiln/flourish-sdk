"use strict";

var fs = require("fs"),
    sdk = require("../../sdk");

function upgrade(template_dir) {
	return new Promise(function(resolve, reject) {
		fs.stat(template_dir, function(error, stat) {
			if (error) return reject(new Error(`Could not access ${template_dir}: ${error.message}`));
			if (!stat.isDirectory()) return reject(new Error(`Not a directory: ${template_dir}`));

			sdk.readConfig(template_dir)
				.then((config) => {
					if (config.sdk_version == 3) return false;
					delete config.autoheight;
					config.sdk_version = 3;
					return sdk.writeConfig(template_dir, config)
						.then(() => true);
				})
				.then(resolve, reject);
		});
	});
}

upgrade.title = "Remove autoheight config from template.yml";
module.exports = upgrade;
