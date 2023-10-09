"use strict";

const fs = require("fs"),
      path = require("path"),

      cross_spawn = require("cross-spawn"),
      fetch = require("node-fetch"),
      FormData = require("form-data"),
      shell_quote = require("shell-quote"),
      yaml = require("js-yaml"),
      nodeResolve = require("resolve"),

      semver = require("@flourish/semver"),

      log = require("./log"),
      validateConfig = require("./validate_config"),
      { extendItem } = require("./common") ;

const sdk_tokens_file = path.join(process.env.HOME || process.env.USERPROFILE, ".flourish_sdk");

const YAML_DUMP_OPTS = { flowLevel: 4 };
const SDK_VERSION = require("../package.json").version;
const SDK_MAJOR_VERSION = semver.parse(SDK_VERSION)[0];
const SDK_MAJOR_VERSION_COMPAT = 3; // Flourish templates built for SDK version 3 are compatible with the current version

function getSdkToken(server_opts) {
	return new Promise(function(resolve, reject) {
		fs.chmod(sdk_tokens_file, 0o600, function(error) {
			if (error) return reject(error);

			fs.readFile(sdk_tokens_file, "utf8", function(error, body) {
				if (error) return reject(error);
				resolve(JSON.parse(body)[server_opts.host]);
			});
		});
	});
}

function setSdkToken(server_opts, sdk_token) {
	return new Promise(function(resolve, reject) {
		fs.readFile(sdk_tokens_file, function(error, body) {
			let sdk_tokens;
			if (error && error.code === "ENOENT") {
				sdk_tokens = {};
			}
			else {
				if (error) log.die(`Failed to read ${sdk_tokens_file}`, error.message);

				try {
					sdk_tokens = JSON.parse(body);
				}
				catch (error) {
					log.die(`Failed to parse ${sdk_tokens_file}`, "Remove it and try again");
				}
			}

			sdk_tokens[server_opts.host] = sdk_token;
			fs.writeFile(sdk_tokens_file, JSON.stringify(sdk_tokens), { mode: 0o600 }, function(error) {
				if (error) log.die(`Failed to save ${sdk_tokens_file}`, error.message);
				resolve();
			});
		});
	});
}

function deleteSdkTokens() {
	return new Promise(function(resolve, reject) {
		fs.unlink(sdk_tokens_file, function(error) {
			if (error) log.die("Failed to delete " + sdk_tokens_file, error.message);
			resolve();
		});
	});
}

const AUTHENTICATED_REQUEST_METHODS = new Set([
	"template/assign-version-number", "template/publish", "template/delete", "template/list", "template/history",
	"user/whoami"
]);

async function request(server_opts, method, data) {
	let sdk_token;

	if (AUTHENTICATED_REQUEST_METHODS.has(method)) {
		try {
			sdk_token = await getSdkToken(server_opts);
		}
		catch (error) {
			log.problem(`Failed to read ${sdk_tokens_file}`, error.message);
		}
		if (!sdk_token) {
			log.die("You are not logged in. Try ‘flourish login’ or ‘flourish register’ first.");
		}
	}

	const protocol = server_opts.host.match(/^(localhost|127\.0\.0\.1|.*\.local)(:\d+)?$/) ? "http:" : "https:";
	const url = `${protocol}//${server_opts.host}/api/v1/${method}`;
	const options = { method: data ? "POST" : "GET" };

	if (data) {
		if (data instanceof FormData) {
			if (sdk_token) {
				data.append("sdk_token", sdk_token);
			}
			data.append("sdk_version", SDK_VERSION);
			options.headers = data.getHeaders();
			options.body = data;
		}
		else {
			options.body = JSON.stringify({ ...data, sdk_token, sdk_version: SDK_VERSION });
			options.headers = { "content-type": "application/json" };
		}
	}

	if (server_opts.user) {
		options.headers.authorization = Buffer.from(`${server_opts.user}:${server_opts.password}`).toString("base64");
	}

	let res;

	try {
		res = await fetch(url, options);
	}
	catch (e) {
		log.die(e);
	}

	let text;

	try {
		// We could use res.json() here, but we're interested in what the body
		// is when it's *not* json (load balancer issues etc.).
		text = await res.text();
	}
	catch (error) {
		log.die("Failed to get response from server", error);
	}

	let body;

	try {
		body = JSON.parse(text);
	}
	catch (error) {
		log.die("Failed to parse response body", res.status, error, text);
	}

	if (res.ok) {
		return body;
	}

	if (body.error) {
		log.die("Error from server", res.status, body.error.message);
	}

	log.die("Server error", res.status, JSON.stringify(body));
}

function runBuildCommand(template_dir, command, node_env) {
	const command_parts = shell_quote.parse(command),
	      prog = command_parts[0],
	      args = command_parts.slice(1);

	return new Promise(function(resolve, reject) {
		log.info("Running build command: " + command);
		try {
			const env = process.env;
			if (typeof node_env !== "undefined") env.NODE_ENV = node_env;

			cross_spawn.spawn(prog, args, { cwd: template_dir, stdio: "inherit", env })
				.on("error", function(error) {
					reject(new Error(`Failed to run build command ‘${command}’: ${error.message}`));
				})
				.on("exit", function(exit_code) {
					if (exit_code != 0) {
						reject(new Error(`Failed to run build command ‘${command}’`));
					}
					resolve();
				});
		}
		catch (error) {
			reject(new Error(`Failed to run build command ‘${command}’ in ${template_dir}: ${error.message}`));
		}
	});
}

function buildTemplate(template_dir, node_env, purpose) {
	return checkTemplateVersion(template_dir)
		.then(() => installNodeModules(template_dir, node_env))
		.then(() => buildRules(template_dir))
		.then((build_rules) => Promise.all([...build_rules].map((rule) => {
			// If we’re building the template in order to run it,
			// and there is a watch script defined, don’t build it
			// and rely on the watch script instead.
			if (purpose !== "run" || !("watch" in rule)) {
				return runBuildCommand(template_dir, rule.script, node_env);
			}
		})));
}


function readConfig(template_dir) {
	return Promise.all([
		readYaml(path.join(template_dir, "template.yml")),
		readJson(path.join(template_dir, "package.json"))
	]).then(([yaml, json]) => {
		if (json) {
			if (!("id" in yaml) && ("name" in json)) {
				yaml.id = json.name;
			}
			if (!("author" in yaml) && ("author" in json)) {
				yaml.author = json.author;
			}
			if (!("description" in yaml) && ("description" in json)) {
				yaml.description = json.description;
			}
			if (!("version" in yaml) && ("version" in json)) {
				yaml.version = json.version;
			}
		}
		return yaml;
	});
}

function readYaml(yaml_file) {
	return new Promise(function(resolve, reject) {
		fs.readFile(yaml_file, "utf8", function(error, text) {
			if (error) return reject(new Error(`Failed to read ${yaml_file}: ${error.message}`));
			try {
				return resolve(yaml.safeLoad(text));
			}
			catch (error) {
				return reject(new Error(`Failed to parse ${yaml_file}: ${error.message}`));
			}
		});
	});
}

function readJson(json_file) {
	return new Promise(function(resolve, reject) {
		fs.readFile(json_file, "utf8", function(error, text) {
			if (error && error.code === "ENOENT") return resolve(undefined);
			else if (error) return reject(new Error(`Failed to read ${json_file}: ${error.message}`));

			try {
				return resolve(JSON.parse(text));
			}
			catch (error) {
				return reject(new Error(`Failed to parse ${json_file}: ${error.message}`));
			}
		});
	});
}


function addShowCondition(setting) {
	if (typeof setting === "string") return;
	if (!["show_if", "hide_if"].some(d => d in setting)) return;
	if (!setting.show_condition) setting.show_condition = [];
	if (setting.show_if !== undefined) {
		setting.show_condition.push({ type: "show", condition: setting.show_if });
		delete setting.show_if;
	}
	else {
		setting.show_condition.push({ type: "hide", condition: setting.hide_if });
		delete setting.hide_if;
	}
}


function addShowConditions(config) {
	const settings = config.settings || [];
	for (const setting of settings) {
		addShowCondition(setting);
	}
	return config;
}


function qualifyNames(settings, namespace) {
	for (let i = 0; i < settings.length; i++) {
		const setting = settings[i];

		if (typeof setting !== "object") continue;

		if ("show_if" in setting) {
			const type = typeof setting.show_if;
			if (type === "string") {
				setting.show_if = namespace + "." + setting.show_if;
			}
			else if (type === "object") {
				const r = {};
				for (const k in setting.show_if) {
					r[namespace + "." + k] = setting.show_if[k];
				}
				setting.show_if = r;
			}
			// Else pass through unmodified: to support literal true/false values.
		}

		if ("hide_if" in setting) {
			const type = typeof setting.hide_if;
			if (typeof setting.hide_if === "string") {
				setting.hide_if = namespace + "." + setting.hide_if;
			}
			else if (type === "object") {
				const r = {};
				for (const k in setting.hide_if) {
					r[namespace + "." + k] = setting.hide_if[k];
				}
				setting.hide_if = r;
			}
			// Else pass through unmodified: to support literal true/false values.
		}
	}
}

async function resolveImports(config, template_dir) {
	const settings = config.settings;
	if (!settings) return config;

	for (let i = 0; i < settings.length; i++) {
		const setting = settings[i];
		if (typeof setting === "object" && "import" in setting) {
			const imported_resolved = nodeResolve.sync(path.join(setting.import, "settings.yml"), { basedir: template_dir });
			const imported_settings = await readYaml(imported_resolved);
			qualifyNames(imported_settings, setting.property);
			if ("overrides" in setting) {
				setting.overrides.forEach(function(override) {
					const use_tags = override.tag;
					let settings_to_target = [];
					if (use_tags) settings_to_target = Array.isArray(override.tag) ? override.tag : [override.tag];
					else settings_to_target = Array.isArray(override.property) ? override.property : [override.property];
					const method = override.method || "replace";
					for (let target of settings_to_target) {
						const settings_to_override = imported_settings.filter(function(setting) {
							if (use_tags) {
								if (!setting.tag) return false;
								const setting_tags = Array.isArray(setting.tag) ? setting.tag : [setting.tag];
								return setting_tags.includes(target);
							}
							return setting.property === target;
						});
						if (!settings_to_override.length) continue;
						for (let name in override) {
							for (const s of settings_to_override) {
								if (name === "property" || name === "tag" || name === "method") continue;
								if (method === "extend") {
									if (["show_if", "hide_if"].includes(name) && typeof override[name] === "boolean") {
										throw new Error(`Cannot extend a ${name} with Boolean value for property ${s.property}`);
									}
									let extendee = s[name];
									if (extendee === undefined) {
										if (name === "show_if" && s.hide_if !== undefined) {
											throw new Error(`Cannot extend a show_if when hide_if defined for property ${s.property}`);
										}
										else if (name === "hide_if" && s.show_if !== undefined) {
											throw new Error(`Cannot extend a hide_if when show_if defined for property ${s.property}`);
										}
										extendee = {};
									}
									s[name] = extendItem(extendee, override[name]);
								}
								else {
									s[name] = override[name];
									if (name === "show_if" && s.hide_if) delete s.hide_if;
									else if (name === "hide_if" && s.show_if) delete s.show_if;
								}
							}
						}
					}
				});
			}
			for (let s of imported_settings) {
				if (typeof s !== "object") continue;
				s.property = setting.property + "." + s.property;
				if (setting.show_condition) s.show_condition = setting.show_condition.slice();
				addShowCondition(s);
			}
			settings.splice.apply(settings, [i, 1].concat(imported_settings));
		}
	}

	return config;
}

// Sets a default binding data_type of string in templates with both typed and untyped bindings, and return a post-publish warning message.
function checkDataTypes(config) {
	const warnings = [];
	if (!config.data) return { config, warnings };

	const all_bindings = config.data.filter(binding => typeof binding !== "string"); // filter out title and description strings
	const any_bindings_are_typed = all_bindings.some(binding => binding.data_type);

	if (any_bindings_are_typed) {
		config.data.forEach(binding => {
			if (typeof binding === "string") return;
			if (!binding.data_type) {
				binding.data_type = "string";
				warnings.push(`Missing data_type for key ${binding.key} in dataset ${binding.dataset} - assuming "string"`);
			}
		});
	}
	return { config, warnings };
}

function readAndValidateConfig(template_dir) {
	return readConfig(template_dir)
		.then((config) => {
			validateConfig(config, template_dir);
			return config;
		})
		.then(config => addShowConditions(config))
		.then(config => resolveImports(config, template_dir))
		.then(config => checkDataTypes(config));
}

function changeVersionNumberInPackageJson(template_dir, change_function) {
	if (!fs.existsSync(path.join(template_dir, "package.json"))) {
		throw new Error("There is no version number in template.yml, and no package.json");
	}

	return readJson(path.join(template_dir, "package.json"))
	.then(json => {
		if (!json.version) {
			throw new Error("There is no version number in template.yml or package.json");
		}
		const v = semver.parse(json.version);
		change_function(v);
		json.version = semver.join(v);
		return writePackageJson(template_dir, json);
	});
}

function changeVersionNumber(template_dir, change_function) {
	return readYaml(path.join(template_dir, "template.yml"))
	.then(yaml => {
		if (!yaml.version) {
			return changeVersionNumberInPackageJson(template_dir, change_function);
		}

		const v = semver.parse(yaml.version);
		change_function(v);
		yaml.version = semver.join(v);
		return writeConfig(template_dir, yaml);
	});
}

function incrementPrereleaseTag(template_dir) {
	return changeVersionNumber(template_dir, v => {
		if (v.length == 3) {
			v[2] += 1;
			v.push("prerelease", 1);
			return;
		}
		if (typeof v[v.length - 1] === "number") {
			v[v.length - 1] += 1;
		}
		else v.push(1);
	});
}

function removePrereleaseTag(template_dir) {
	return changeVersionNumber(template_dir, v => {
		if (v.length == 3) {
			throw new Error("There is no prerelease tag to remove.");
		}
		v.splice(3);
	});
}

function incrementPatchVersion(template_dir) {
	return changeVersionNumber(template_dir, v => {
		v[2] += 1;
		v.splice(3);
	});
}

function installNodeModules(template_dir, node_env) {
	if (fs.existsSync(path.join(template_dir, "package.json"))
		&& !fs.existsSync(path.join(template_dir, "node_modules")))
	{
		if (fs.existsSync(path.join(template_dir, "package-lock.json"))) {
			return runBuildCommand(template_dir, "npm ci", node_env);
		}
		return runBuildCommand(template_dir, "npm install", node_env);
	}
	else {
		return Promise.resolve();
	}
}

function buildRules(template_dir) {
	return readConfig(template_dir)
		.then((config) => {
			const build_rules = [];
			for (let key in config.build) {
				build_rules.push(Object.assign({ key }, config.build[key]));
			}
			return build_rules;
		});
}

function writeConfig(template_dir, config) {
	return new Promise(function(resolve, reject) {
		const config_file = path.join(template_dir, "template.yml");
		fs.writeFile(config_file, yaml.safeDump(config, YAML_DUMP_OPTS), function(error) {
			if (error) return reject(new Error(`Failed to write ${config_file}: ${error.message}`));
			return resolve();
		});
	});
}

function writePackageJson(template_dir, json) {
	return new Promise(function(resolve, reject) {
		const package_json_file = path.join(template_dir, "package.json");
		fs.writeFile(package_json_file, JSON.stringify(json, null, 2) + "\n", function(error) {
			if (error) return reject(new Error(`Failed to write ${package_json_file}: ${error.message}`));
			return resolve();
		});
	});
}

function checkTemplateVersion(template_dir) {
	return readConfig(template_dir).then(config => {
		const template_sdk_version = config.sdk_version;
		if (!template_sdk_version) {
			throw new Error("Template does not specify an sdk_version");
		}
		if (template_sdk_version < SDK_MAJOR_VERSION_COMPAT) {
			throw new Error("This template was built for an older version of Flourish. Try running 'flourish upgrade'");
		}
		if (template_sdk_version > SDK_MAJOR_VERSION) {
			throw new Error("This template was built for an newer version of Flourish than you have. Try updating the SDK.");
		}
	});
}


// Files and directories in a template that are treated specially by Flourish
const TEMPLATE_SPECIAL_FILES = new Set([
	"index.html", "template.js", "template.yml", "thumbnail.png", "thumbnail.jpg", "README.md",
]);
const TEMPLATE_SPECIAL_DIRECTORIES = new Set([
	"static", "data",
]);
const TEMPLATE_SPECIAL = new Set([
	"index.html", "template.js", "template.yml", "thumbnail.png", "thumbnail.jpg", "README.md",
	"static", "data",
]);

module.exports = {
	checkTemplateVersion,

	getSdkToken, setSdkToken, deleteSdkTokens,
	request,
	runBuildCommand, buildTemplate,
	readConfig, readAndValidateConfig, writeConfig, buildRules,
	incrementPrereleaseTag, removePrereleaseTag, incrementPatchVersion,

	TEMPLATE_SPECIAL_FILES, TEMPLATE_SPECIAL_DIRECTORIES, TEMPLATE_SPECIAL, SDK_VERSION, SDK_MAJOR_VERSION
};
