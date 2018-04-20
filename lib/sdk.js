"use strict";

const fs = require("fs"),
      path = require("path"),

      cross_spawn = require("cross-spawn"),
      mod_request = require("request"),
      shell_quote = require("shell-quote"),
      yaml = require("js-yaml"),

      log = require("./log"),
      validateConfig = require("./validate_config");

const api_tokens_file = path.join(process.env.HOME || process.env.USERPROFILE, ".flourish_sdk");


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

function getApiToken(server_opts) {
	return new Promise(function(resolve, reject) {
		fs.chmod(api_tokens_file, 0o600, function(error) {
			if (error) return reject(error);

			fs.readFile(api_tokens_file, "utf8", function(error, body) {
				if (error) return reject(error);
				resolve(JSON.parse(body)[server_opts.host]);
			});
		});
	});
}

function setApiToken(server_opts, api_token) {
	return new Promise(function(resolve, reject) {
		fs.readFile(api_tokens_file, function(error, body) {
			let api_tokens;
			if (error && error.code === "ENOENT") {
				api_tokens = {};
			}
			else {
				if (error) log.die(`Failed to read ${api_tokens_file}`, error.message);

				try {
					api_tokens = JSON.parse(body);
				}
				catch (error) {
					log.die(`Failed to parse ${api_tokens_file}`, "Remove it and try again");
				}
			}

			api_tokens[server_opts.host] = api_token;
			fs.writeFile(api_tokens_file, JSON.stringify(api_tokens), { mode: 0o600 }, function(error) {
				if (error) log.die(`Failed to save ${api_tokens_file}`, error.message);
				resolve();
			});
		});
	});
}

function deleteApiTokens() {
	return new Promise(function(resolve, reject) {
		fs.unlink(api_tokens_file, function(error) {
			if (error) log.die("Failed to delete " + api_tokens_file, error.message);
			resolve();
		});
	});
}

const AUTHENTICATED_REQUEST_METHODS = new Set([
	"template/publish", "template/delete", "template/list",
	"user/whoami"
]);

const MULTIPART_REQUEST_METHODS = new Set([
	"template/publish",
]);

function request(server_opts, method, data) {
	let read_api_token_if_necessary;
	if (AUTHENTICATED_REQUEST_METHODS.has(method)) {
		read_api_token_if_necessary = getApiToken(server_opts)
			.catch((error) => {
				log.problem(`Failed to read ${api_tokens_file}`, error.message);
			})
			.then((api_token) => {
				if (!api_token) {
					log.die("You are not logged in. Try ‘flourish login’ or ‘flourish register’ first.");
				}
				return api_token;
			});
	}
	else {
		read_api_token_if_necessary = Promise.resolve();
	}

	return Promise.all([read_api_token_if_necessary, getSDKVersion()])
		.then(([api_token, sdk_version]) => new Promise(function(resolve, reject) {
			let protocol = "https";
			if (server_opts.host.match(/^(localhost|127\.0\.0\.1|.*\.local)(:\d+)?$/)) {
				protocol = "http";
			}
			let url = protocol + "://" + server_opts.host + "/api/v1/" + method;
			let request_params = {
				method: "POST",
				uri: url,
			};

			Object.assign(data, { api_token, sdk_version });
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

function runBuildCommand(template_dir, command) {
	const command_parts = shell_quote.parse(command),
	      prog = command_parts[0],
	      args = command_parts.slice(1);

	return new Promise(function(resolve, reject) {
		log.info("Running build command: " + command);
		try {
			cross_spawn.spawn(prog, args, { cwd: template_dir, stdio: "inherit" })
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

function buildTemplate(template_dir) {
	return checkTemplateVersion(template_dir)
		.then(() => installNodeModules(template_dir))
		.then(() => buildRules(template_dir))
		.then((build_rules) => Promise.all([...build_rules].map((rule) => runBuildCommand(template_dir, rule.script))));
}


function readConfig(template_dir) {
	return new Promise(function(resolve, reject) {
		const config_file = path.join(template_dir, "template.yml");
		fs.readFile(config_file, "utf8", function(error, text) {
			if (error) return reject(new Error(`Failed to read ${config_file}: ${error.message}`));
			try {
				return resolve(yaml.safeLoad(text));
			}
			catch (error) {
				return reject(new Error(`Failed to parse ${config_file}: ${error.message}`));
			}
		});
	});
}

function readAndValidateConfig(template_dir) {
	return readConfig(template_dir)
		.then((config) => {
			validateConfig(config, path.join(template_dir, "data"));
			return config;
		});
}

function installNodeModules(template_dir) {
	if (fs.existsSync(path.join(template_dir, "package.json"))
		&& !fs.existsSync(path.join(template_dir, "node_modules")))
	{
		return runBuildCommand(template_dir, "npm install");
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
		fs.writeFile(config_file, yaml.safeDump(config), function(error) {
			if (error) return reject(new Error(`Failed to write ${config_file}: ${error.message}`));
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

	getApiToken, setApiToken, deleteApiTokens,
	request,
	runBuildCommand, buildTemplate,
	readConfig, readAndValidateConfig, writeConfig, buildRules,

	TEMPLATE_SPECIAL_FILES, TEMPLATE_SPECIAL_DIRECTORIES, TEMPLATE_SPECIAL,
};
