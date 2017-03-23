"use strict";

// Modules
var child_process = require("child_process"),
    crypto = require("crypto"),
    fs = require("fs"),
    http = require("http"),
    path = require("path"),
    ws = require("ws"),
    yaml = require("js-yaml"),

    colors = require("colors"),
    d3_dsv = require("d3-dsv"),
    express = require("express"),
    mustache = require("mustache"),

    columns = require("./columns"),
    comms_js = require("./comms_js"),
    data_utils = require("./data"),
    index_html = require("./index_html"),
    json = require("./json"),

    log = require("../lib/log"),
    sdk = require("../lib/sdk");

// Generate a static prefix randomly
//
// Use a different prefix for /preview, to catch the situation where the template
//   developer mistakenly prepends a / to the static prefix.
const static_prefix = crypto.randomBytes(15).toString("base64").replace(/[+\/]/g, (c) => ({ "/": "_", "+": "-" })[c]),
      preview_static_prefix = crypto.randomBytes(15).toString("base64").replace(/[+\/]/g, (c) => ({ "/": "_", "+": "-" })[c]);

function loadFile(path_parts, options) {
	return new Promise(function(resolve, reject) {
		const file_path = path.join(...path_parts),
		      filename = path_parts[path_parts.length - 1];

		function fail(message, error) {
			if ("default" in options) {
				log.warn(message, `Proceeding without ${filename}...`);
				if (typeof options.default === "function") {
					return resolve(options.default());
				}
				return resolve(options.default);
			}
			log.problem(message, error.message);
			reject(error);
		}

		function succeed(result) {
			if (!options.silentSuccess) log.success(`Loaded ${filename}`);
			resolve(result);
		}

		fs.readFile(file_path, "utf8", function(error, loaded_text) {
			if (error) return fail(`Failed to load ${file_path}`, error);
			switch (options.type) {
			case "json":
				try { return succeed(JSON.parse(loaded_text)); }
				catch(error) {
					return fail(`Uh-oh! There's a problem with your ${filename} file.`, error);
				}

			case "yaml":
				try { return succeed(yaml.safeLoad(loaded_text)); }
				catch(error) {
					return fail(`Uh-oh! There's a problem with your ${filename} file.`, error);
				}

			default:
				return succeed(loaded_text);
			}
		});
	});
}

function loadSDKTemplateText() {
	return loadFile([__dirname, "views", "index.html"], { silentSuccess: true });
}

function loadTemplateText(template_dir) {
	return loadFile([template_dir, "index.html"], {
		default: () => loadFile([__dirname, "views", "default_template_index.html"], {
			silentSuccess: true
		})
	});
}

function loadJavaScript(template_dir) {
	return loadFile([template_dir, "template.js"], {});
}

function loadSettings(template_dir) {
	return loadFile([template_dir, "template.yml"], { type: "yaml" });
}

function listDataTables(template_dir) {
	return new Promise(function(resolve, reject) {
		fs.readdir(path.join(template_dir, "data"), function(error, filenames) {
			if (error) {
				if (error.code === "ENOENT") return resolve([]);
				return reject(error);
			}

			const data_files = [];
			for (let filename of filenames) {
				if (!filename.endsWith(".csv")) continue;

				var name = filename.substr(0, filename.length - 4);
				data_files.push(name);
			}
			resolve(data_files);
		});
	});
}

function getData(template_dir, data_tables) {
	return Promise.all(data_tables.map((data_table) => getDataTable(template_dir, data_table)))
		.then((data_array) => {
			const data_by_name = {};
			for (var i = 0; i < data_tables.length; i++) {
				data_by_name[data_tables[i]] = data_array[i];
			}
			return data_by_name;
		});
}

function getDataTable(template_dir, data_table) {
	return new Promise(function(resolve, reject) {
		fs.readFile(path.join(template_dir, "data", data_table + ".csv"), "utf8", function(error, csv_text) {
			if (error) return reject(error);
			resolve(d3_dsv.csvParseRows(csv_text));
		});
	});
}

function parseDataBindings(data_bindings, data_tables) {
	if (!data_bindings) return {1: {}};

	// Use the names as ids
	const name_by_id = {};
	for (let name of data_tables) name_by_id[name] = name;

	// Collect parsed bindings by dataset
	const data_bindings_by_dataset = {};
	for (let binding of data_bindings) {
		let dataset = binding.dataset;
		if (!dataset) continue;

		if (!data_bindings_by_dataset[dataset]) data_bindings_by_dataset[dataset] = {};
		data_bindings_by_dataset[dataset][binding.key] = columns.parseDataBinding(binding, name_by_id);
	}
	return { 1: data_bindings_by_dataset };
}

function loadTemplate(template_dir, sdk_template_text, build_failed) {
	return Promise.all([
		listDataTables(template_dir),
		loadSettings(template_dir),
	])
	.then(([data_tables, settings]) => {
		const data_bindings = parseDataBindings(settings.data, data_tables);
		return Promise.all([
			settings, data_bindings, data_tables,
			previewInitJs(template_dir, data_bindings["1"], data_tables),
			loadTemplateText(template_dir),
			loadJavaScript(template_dir)
		]);
	})
	.then(([
		settings, data_bindings, data_tables,
		preview_init_js, template_text, template_js
	]) => {
		const page_params = {
			// Always use ID of 1 for SDK
			visualisation: "new Flourish.Visualisation('1', 0," + json.safeStringify({
				data_bindings: data_bindings,
				data_tables: data_tables,
			}) + ")",
			settings: json.safeStringify(settings.settings || []),
			data_bindings: json.safeStringify(settings.data || []),
			template_name: settings.name || "Untitled template",
			template_author: settings.author || "",
			build_failed: build_failed && build_failed.size > 0
		};

		const script = "<script>window.Flourish = " + json.safeStringify({ static_prefix, environment: "sdk" }) + ";</script>" +
			"<script src=\"/template.js\"></script>" +
			"<script src=\"/comms.js\"></script>";

		const preview_script = "<script>window.Flourish = " + json.safeStringify({ static_prefix: preview_static_prefix, environment: "sdk" }) + ";</script>" +
			"<script src=\"/template.js\"></script>" +
			"<script src=\"/comms.js\"></script>" +
			"<script src=\"/talk_to_server.js\"></script><script>_Flourish_talkToServer();</script>" +
			"<script>" + preview_init_js + "</script>";

		return Promise.all([
			mustache.render(sdk_template_text, page_params),
			index_html.render(template_text, {
				title: "Flourish SDK template preview",
				static: static_prefix,
				script: script
			}),
			index_html.render(template_text, {
				title: "Flourish SDK template preview",
				static: preview_static_prefix,
				script: preview_script,
			}),
			template_js,
			sdk.buildRules(template_dir),
		]);
	})
	.then(([sdk_rendered, template_rendered, preview_rendered, template_js, build_rules]) => ({
		sdk_rendered, template_rendered, preview_rendered, template_js, build_rules
	}));
}

function previewInitJs(template_dir, data_bindings, data_tables) {
	return getData(template_dir, data_tables).then((data) => {
		const prepared_data = {};
		for (let dataset in data_bindings) {
			prepared_data[dataset] = data_utils.extractData(data_bindings[dataset], data);
		}

		const column_names = {};
		for (let dataset in prepared_data) {
			column_names[dataset] = prepared_data[dataset].column_names;
		}

		return `
		var _Flourish_data_column_names = ${json.safeStringify(column_names)},
		    _Flourish_data = ${json.safeStringify(prepared_data)};
		for (var _Flourish_dataset in _Flourish_data) {
		    window.template.data[_Flourish_dataset] = _Flourish_data[_Flourish_dataset];
		    window.template.data[_Flourish_dataset].column_names = _Flourish_data_column_names[_Flourish_dataset];
		}
		window.template.draw();
		`;
	});
}

function tryToOpen(url) {
	// If it’s available and works, use /usr/bin/open to open
	// the URL. If not just prompt the user to open it.
	try {
		child_process.spawn("/usr/bin/open", [url])
			.on("exit", function(exit_code) {
				if (exit_code != 0) {
					log.success("Now open " + url + " in your web browser!");
				}
				else {
					log.success("Opened browser window to " + url);
				}
			})
			.on("error", function() {
				log.success("Now open " + url + " in your web browser!");
			});
	}
	catch(error) {
		log.success("Now open " + url + " in your web browser!");
	}
}

function isPrefix(a, b) {
	if (a.length > b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}


module.exports = function(template_dir, port, open_browser) {
	let app = express(),
	    reloadPreview,

	    template;

	// Editor and settings/bindings
	app.get("/", function (req, res) {
		log.success("Loading main page in browser");
		res.header("Content-Type", "text/html; charset=utf-8")
			.send(template.sdk_rendered);
	});

	app.get("/template.js", function (req, res) {
		res.header("Content-Type", "application/javascript").send(template.template_js);
	});

	app.get("/template.js.map", function (req, res) {
		res.sendFile(path.resolve(template_dir, "template.js.map"));
	});

	app.get("/comms.js", function (req, res) {
		res.header("Content-Type", "application/javascript").send(comms_js);
	});

	app.get("/thumbnail", function (req, res) {
		const jpg_path = path.resolve(template_dir, "thumbnail.jpg"),
		      png_path = path.resolve(template_dir, "thumbnail.png");
		if (fs.existsSync(jpg_path)) {
			return res.header("Content-Type", "image/jpeg").sendFile(jpg_path);
		}
		if (fs.existsSync(png_path)) {
			return res.header("Content-Type", "image/jpeg").sendFile(png_path);
		}
		return res.status(404).send("thumbnail not found");
	});

	app.get("/template/1/embed/", function(req, res) {
		res.header("Content-Type", "text/html; charset=utf-8")
			.send(template.template_rendered);
	});

	// API for accessing data tables
	app.get("/api/data_table/:id/csv", function(req, res) {
		res.status(200).header("Content-Type", "text/csv")
			.sendFile(path.resolve(template_dir, "data", req.params.id + ".csv"));
	});

	// Preview not in an iframe
	app.get("/preview", function(req, res) {
		res.header("Content-Type", "text/html; charset=utf-8")
			.send(template.preview_rendered);
	});
	app.use(`/${preview_static_prefix}/`, express.static(path.join(template_dir, "static")));

	// Static files
	app.use("/", express.static(path.join(__dirname, "..", "site")));
	app.use(`/template/1/embed/${static_prefix}/`, express.static(path.join(template_dir, "static")));


	function startServer(sdk_template_text, template_) {
		template = template_;

		// Run the server
		const server = app.listen(port, "localhost", function() {
			const url = "http://localhost:" + port + "/";
			log.info(`Running server at ${url}`);

			// Set up the WebSocket server and the reloadPreview() function
			const sockets = new Set();
			const websocket_server = new ws.Server({ server });
			websocket_server.on("connection", function(socket) {
				sockets.add(socket);
				socket.on("close", function() { sockets.delete(socket); });
			});
			reloadPreview = function() {
				for (let socket of sockets) socket.close();
			};

			watchForChanges(sdk_template_text);
			if (open_browser) tryToOpen(url);
		})
		.on("error", function(error) {
			if (error.code === "EADDRINUSE") {
				log.die("Another process is already listening on port " + port,
					"Perhaps you’re already running flourish in another terminal?",
					"You can use the --port option to listen on a different port");
			}
			log.die("Failed to start server", error.message);
		});
	}

	let build_failed = new Set(),
	    rebuilding = new Set();
	function watchForChanges(sdk_template_text) {
		// Watch for file changes. If something changes, tell the page to reload itself
		// If the source code has changed, rebuild it.

		function reloadTemplate() {
			loadTemplate(template_dir, sdk_template_text, build_failed)
				.then((template_) => {
					template = template_;
					log.info("Template reloaded. Trying to reload preview.");
					reloadPreview();
				})
				.catch((error) => {
					log.problem("Failed to reload template", error.message);
				});
		}

		fs.watch(template_dir, { recursive: true }, function(event_type, filename) {
			const path_parts = filename.split("/");

			let should_reload = false;
			if (sdk.TEMPLATE_SPECIAL.has(path_parts[0])) {
				if (rebuilding.size > 0) return log.warn(`Rebuild in progress, ignoring change to ${filename}`);
				log.info("Detected change to file: " + filename);
				should_reload = true;
			}

			const build_commands = new Map();
			if (template.build_rules) {
				for (const build_rule of template.build_rules) {
					if ((build_rule.directory && isPrefix(build_rule.directory.split("/"), path_parts))
					    || (build_rule.files && build_rule.files.indexOf(filename) != -1))
					{
						build_commands.set(build_rule.key, build_rule.script);
					}
				}
			}

			if (build_commands.size > 0) {
				const build_commands_to_run = [];
				for (const [key, command] of build_commands) {
					if (rebuilding.has(key)) continue;
					rebuilding.add(key);
					log.info("Detected change to file: " + filename, "Running build for " + key);
					build_commands_to_run.push(
						sdk.runBuildCommand(template_dir, command)
							.then(() => {
								rebuilding.delete(key);
								build_failed.delete(key);
							}, (error) => {
								rebuilding.delete(key);
								build_failed.add(key);
								throw error;
							})
					);
				}

				Promise.all(build_commands_to_run)
					.then(() => {
						if (rebuilding.size == 0) {
							log.success("Build process complete.");
							reloadTemplate();
						}
					})
					.catch((error) => {
						if (build_failed.size > 0 && rebuilding.size == 0) {
							reloadTemplate(); // To pass the build_failed flags
						}
					});
			}
			else if (should_reload) {
				log.info("Reloading...");
				reloadTemplate();
			}
		});
	}

	loadSDKTemplateText()
		.then((sdk_template_text) => {
			return Promise.all([
				sdk_template_text, loadTemplate(template_dir, sdk_template_text)
			]);
		})
		.then(([sdk_template_text, template]) => {
			startServer(sdk_template_text, template);
		})
		.catch((error) => {
			log.problem("Failed to start server", error.message, error.stack);
		});
};
