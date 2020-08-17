"use strict";

const fs = require("fs"),
      path = require("path"),

      cross_spawn = require("cross-spawn"),
      mod_request = require("request"),
      shell_quote = require("shell-quote"),
      yaml = require("js-yaml"),
      nodeResolve = require("resolve"),

      semver = require("@flourish/semver"),

      log = require("./log"),
      validateConfig = require("./validate_config"),
      { extendItem } = require("./common") ;

const sdk_tokens_file = path.join(process.env.HOME || process.env.USERPROFILE, ".flourish_sdk");

const YAML_DUMP_OPTS = { flowLevel: 4 };

const package_json_filename = path.join(__dirname, "..", "package.json");
var sdk_version = null;
function getSDKVersion() {
	if (sdk_version) return Promise.resolve(sdk_version);
	return new Promise(function(resolve, reject) {
		fs.readFile(package_json_filename, "utf8", function(error, package_json) {
			if (error) return reject(error);
			const package_object = JSON.parse(package_json);
			resolve(sdk_version = package_object.version);
		});
	});
}

function getSDKMajorVersion() {
	return getSDKVersion()
		.then((sdk_version) => {
			const version_tuple = sdk_version.split(".").map((x) => parseInt(x));
			return version_tuple[0];
		});
}

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

const MULTIPART_REQUEST_METHODS = new Set([
	"template/publish",
]);

function request(server_opts, method, data) {
	let read_sdk_token_if_necessary;
	if (AUTHENTICATED_REQUEST_METHODS.has(method)) {
		read_sdk_token_if_necessary = getSdkToken(server_opts)
			.catch((error) => {
				log.problem(`Failed to read ${sdk_tokens_file}`, error.message);
			})
			.then((sdk_token) => {
				if (!sdk_token) {
					log.die("You are not logged in. Try ‘flourish login’ or ‘flourish register’ first.");
				}
				return sdk_token;
			});
	}
	else {
		read_sdk_token_if_necessary = Promise.resolve();
	}

	return Promise.all([read_sdk_token_if_necessary, getSDKVersion()])
		.then(([sdk_token, sdk_version]) => new Promise(function(resolve, reject) {
			let protocol = "https";
			if (server_opts.host.match(/^(localhost|127\.0\.0\.1|.*\.local)(:\d+)?$/)) {
				protocol = "http";
			}
			let url = protocol + "://" + server_opts.host + "/api/v1/" + method;
			let request_params = {
				method: "POST",
				uri: url,
			};

			Object.assign(data, { sdk_token, sdk_version });
			if (server_opts.user) {
				request_params.auth = {
					user: server_opts.user,
					pass: server_opts.password,
					sendImmediately: true,
				};
			}

			if (MULTIPART_REQUEST_METHODS.has(method)) {
				request_params.formData = data;
			}
			else {
				request_params.headers = { "Content-Type": "application/json" };
				request_params.body = JSON.stringify(data);
			}

			mod_request(request_params, function(error, res) {
				if (error) log.die(error);
				if (res.statusCode == 200) {
					let r;
					try { r = JSON.parse(res.body); }
					catch (error) {
						log.die("Failed to parse response from server", error, res.body);
					}
					return resolve(r);
				}

				// We got an error response. See if we can parse it to extract an error message
				try {
					let r = JSON.parse(res.body);
					if ("error" in r) log.die("Error from server", r.error);
				}
				catch (e) { }
				log.die("Server error", res.body);
			});
		}));
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
					const properties = Array.isArray(override.property) ? override.property : [override.property];
					const method = override.method || "replace";
					for (let property of properties) {
						const s = imported_settings.find(function(setting) { return setting.property === property; });
						if (!s) continue;
						for (let name in override) {
							if (name === "property" || name === "method") continue;
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

function readAndValidateConfig(template_dir) {
	return readConfig(template_dir)
		.then((config) => {
			validateConfig(config, template_dir);
			return config;
		})
		.then(config => addShowConditions(config))
		.then(config => resolveImports(config, template_dir));
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
	return Promise.all([
		readConfig(template_dir),
		getSDKMajorVersion(),
	]).then(([config, sdk_major_version]) => {
		const template_sdk_version = config.sdk_version;
		if (!template_sdk_version) {
			throw new Error("Template does not specify an sdk_version");
		}
		if (template_sdk_version < sdk_major_version) {
			throw new Error("This template was built for an older version of Flourish. Try running 'flourish upgrade'");
		}
		if (template_sdk_version > sdk_major_version) {
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
	checkTemplateVersion, getSDKVersion, getSDKMajorVersion,

	getSdkToken, setSdkToken, deleteSdkTokens,
	request,
	runBuildCommand, buildTemplate,
	readConfig, readAndValidateConfig, writeConfig, buildRules,
	incrementPrereleaseTag, removePrereleaseTag, incrementPatchVersion,

	TEMPLATE_SPECIAL_FILES, TEMPLATE_SPECIAL_DIRECTORIES, TEMPLATE_SPECIAL,
};
