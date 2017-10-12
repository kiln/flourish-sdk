"use strict";

var fs = require("fs"),
    path = require("path"),

    yaml = require("js-yaml"),

    log = require("../../log"),
    sdk = require("../../sdk");


function loadFile(path_parts, options) {
	return new Promise(function(resolve, reject) {
		const file_path = path.join(...path_parts),
		      filename = path_parts[path_parts.length - 1];

		function fail(message, error) {
			log.problem(message, error.message);
			reject(error);
		}

		function succeed(result) {
			if (!options.silentSuccess) log.success(`Loaded ${filename}`);
			resolve(result);
		}

		fs.readFile(file_path, "utf8", function(error, loaded_text) {
			if (error && error.code === "ENOENT") return resolve(null);
			else if (error) return fail(`Failed to load ${file_path}`, error);

			if (!options.json) return succeed(loaded_text);

			try { succeed(JSON.parse(loaded_text)); }
			catch (error) {
				return fail(`Uh-oh! There's a problem with your ${filename} file.`, error);
			}
		});
	});
}

function deleteIfExists(file_path) {
	return new Promise(function(resolve, reject) {
		fs.unlink(file_path, function(error) {
			if (error && error.code !== "ENOENT") return reject(error);
			if (!error) log.success("Deleted " + file_path);
			resolve();
		});
	});
}

function upgrade(template_dir) {
	function loadSettings() {
		return loadFile([template_dir, "settings.js"], {})
			.then((contents) => {
				if (contents == null) {
					return Promise.reject(new Error("Template file settings.js does not exist"));
				}
				return eval(contents);
			})
			.then((settings) => {
				for (let s of settings) {
					if (typeof s === "object") delete s.validate;
				}
				return settings;
			});
	}

	function loadTemplateDataBindings() {
		return loadFile([template_dir, "data.json"], { json: true });
	}

	function loadMetadata() {
		return loadFile([template_dir, "metadata.json"], { json: true });
	}


	function generateTemplateYaml() {
		return Promise.all([
			loadMetadata(),
			loadSettings(),
			loadTemplateDataBindings(),
			sdk.getSDKMajorVersion(),
		])
		.then(([metadata, settings, data_bindings, sdk_version]) => {
			const o = {
				id: metadata.id,
				name: metadata.name,
				author: metadata.author,

				sdk_version,

				settings: settings
			};
			if (data_bindings) o.data = data_bindings;
			return yaml.safeDump(o);
		});
	}

	function deleteOldFiles() {
		return Promise.all(
			["settings.js", "metadata.json", "data.json"]
				.map((filename) => deleteIfExists(path.join(template_dir, filename)))
		);
	}

	return new Promise(function(resolve, reject) {
		fs.stat(template_dir, function(error, stat) {
			if (error) reject(new Error(`Could not access ${template_dir}: ${error.message}`));
			if (!stat.isDirectory()) reject(new Error(`Not a directory: ${template_dir}`));

			const template_yml_file = path.join(template_dir, "template.yml");
			if (fs.existsSync(template_yml_file)) {
				resolve(false);
				return;
			}


			generateTemplateYaml()
			.then((template_yml) => new Promise(function(resolve, reject) {
				fs.writeFile(template_yml_file, template_yml, function(error) {
					if (error) return reject(error);
					log.success("Wrote template.yml");
					resolve();
				});
			}))
			.then(deleteOldFiles)
			.then(() => resolve(true), reject);
		});
	});
}

upgrade.title = "Convert configuration files to YAML format";
module.exports = upgrade;
