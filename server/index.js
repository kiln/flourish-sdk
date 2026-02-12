"use strict";

// Modules
const crypto = require("crypto"),
      fs = require("fs"),
      path = require("path"),

      cross_spawn = require("cross-spawn"),
      chokidar = require("chokidar"),
      d3_dsv = require("d3-dsv"),
      express = require("express"),
      shell_quote = require("shell-quote"),
      ws = require("ws"),
      yaml = require("js-yaml"),

      columns = require("../common/utils/columns"),
      comms_js = require("./comms_js"),
      data_utils = require("../common/utils/data"),
      index_html = require("./index_html").default,
      json = require("../common/utils/json"),

      log = require("../lib/log"),
      sdk = require("../lib/sdk");

const { allowInsecurePrototypeAccess } = require("@handlebars/allow-prototype-access");
const handlebars = allowInsecurePrototypeAccess(require("handlebars"));

const { defaultTreeAdapter: TA } = require("parse5");

// Generate a static prefix randomly
//
// Use a different prefix for /preview, to catch the situation where the template
//   developer mistakenly prepends a / to the static prefix.
const static_prefix = crypto.randomBytes(15).toString("base64").replace(/[+/]/g, (c) => ({ "/": "_", "+": "-" })[c]),
      preview_static_prefix = crypto.randomBytes(15).toString("base64").replace(/[+/]/g, (c) => ({ "/": "_", "+": "-" })[c]);

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
			if (!options.silentSuccess) { log.success(`Loaded ${filename}`); }
			resolve(result);
		}

		fs.readFile(file_path, "utf8", function(error, loaded_text) {
			if (error) { return fail(`Failed to load ${file_path}`, error); }
			switch (options.type) {
				case "json":
					try { return succeed(JSON.parse(loaded_text)); }
					catch (error) {
						return fail(`Uh-oh! There's a problem with your ${filename} file.`, error);
					}

				case "yaml":
					try { return succeed(yaml.load(loaded_text)); }
					catch (error) {
						return fail(`Uh-oh! There's a problem with your ${filename} file.`, error);
					}

				default:
					return succeed(loaded_text);
			}
		});
	});
}

function loadSDKTemplate() {
	return loadFile([__dirname, "views", "index.html"], { silentSuccess: true })
		.then((template_text) => handlebars.compile(template_text));
}

function loadTemplateText(template_dir) {
	return loadFile([template_dir, "index.html"], {
		default: () => loadFile([__dirname, "views", "default_template_index.html"], {
			silentSuccess: true,
		}),
	});
}

function loadJavaScript(template_dir) {
	return loadFile([template_dir, "template.js"], {});
}

function loadSettings(template_dir) {
	return sdk.readAndValidateConfig(template_dir).then(({ config }) => config);
}

function listDataTables(template_dir) {
	return new Promise(function(resolve, reject) {
		fs.readdir(path.join(template_dir, "data"), function(error, filenames) {
			if (error) {
				if (error.code === "ENOENT") { return resolve([]); }
				return reject(error);
			}

			const data_files = [];
			for (let filename of filenames) {
				if (!filename.endsWith(".csv")) { continue; }

				var name = filename.substr(0, filename.length - 4);
				data_files.push(name);
			}
			resolve(data_files);
		});
	});
}

function getData(template_dir, data_tables) {
	return Promise.all(data_tables.map((data_table_id) => getDataTable(template_dir, data_table_id)))
		.then((data_and_timestamps) => {
			const data_by_name = {};
			const column_types_by_name = {};
			const timestamps_by_name = {};
			for (var i = 0; i < data_tables.length; i++) {
				data_by_name[data_tables[i]] = data_and_timestamps[i].data;
				timestamps_by_name[data_tables[i]] = data_and_timestamps[i].timestamps;
			}
			for (const data_table in data_by_name) {
				const data = data_by_name[data_table];
				column_types_by_name[data_table] = data_utils.getColumnTypesForData(data);
			}
			return { data: data_by_name, column_types_by_name, timestamps_by_name };
		});
}

function getDataTable(template_dir, data_table) {
	return new Promise(function(resolve, reject) {
		const filename = path.join(template_dir, "data", data_table + ".csv");
		const { mtime: last_updated } = fs.statSync(filename);
		const timestamps = {
			last_updated: new Date(last_updated),
		};
		fs.readFile(filename, "utf8", function(error, csv_text) {
			if (error) { return reject(error); }
			if (csv_text.charAt(0) === "\uFEFF") { csv_text = csv_text.substr(1); }
			resolve({
				data: d3_dsv.csvParseRows(csv_text),
				timestamps,
			});
		});
	});
}

function parseDataBindings(data_bindings, data_tables) {
	if (!data_bindings) {
		return {
			data_bindings: { 1: {} },
			template_data_bindings: { 1: {} },
		};
	}

	// Use the names as ids
	const name_by_id = {};
	for (let name of data_tables) { name_by_id[name] = name; }

	// Collect parsed bindings by dataset
	const data_bindings_by_dataset = {};
	const template_data_bindings_by_dataset = {};
	for (let binding of data_bindings) {
		let dataset = binding.dataset;
		if (!dataset) { continue; }

		if (!data_bindings_by_dataset[dataset]) { data_bindings_by_dataset[dataset] = {}; }
		if (!template_data_bindings_by_dataset[dataset]) { template_data_bindings_by_dataset[dataset] = {}; }
		template_data_bindings_by_dataset[dataset][binding.key] = binding;
		data_bindings_by_dataset[dataset][binding.key] = columns.parseDataBinding(binding, name_by_id);
	}
	return {
		data_bindings: { 1: data_bindings_by_dataset },
		template_data_bindings: { 1: template_data_bindings_by_dataset },
	};
}

function documentFragment(elements) {
	const fragment = TA.createDocumentFragment();
	for (const element of elements) {
		TA.appendChild(fragment, element);
	}
	return fragment;
}

function scriptElementInline(code) {
	const element = TA.createElement("script", "http://www.w3.org/1999/xhtml", []);
	TA.insertText(element, code);
	return element;
}

function scriptElementExternal(url) {
	return TA.createElement("script", "http://www.w3.org/1999/xhtml", [{ name: "src", value: url }]);
}

function loadTemplate(template_dir, sdk_template, build_failed, options) {
	return Promise.all([
		listDataTables(template_dir),
		loadSettings(template_dir),
	])
	.then(([data_tables, settings]) => {
		const { data_bindings, template_data_bindings } = parseDataBindings(settings.data, data_tables);
		return Promise.all([
			settings, data_bindings, data_tables,
			previewInitJs(template_dir, template_data_bindings["1"], data_bindings["1"], data_tables),
			loadTemplateText(template_dir),
			loadJavaScript(template_dir),
			getPublicUrlPrefix(options),
		]);
	})
	.then(([
		settings, data_bindings, data_tables,
		preview_init_js, template_text, template_js, public_url_prefix,
	]) => {
		const page_params = {
			// Always use ID of 1 for SDK
			visualisation: { id: 1, can_edit: true },
			visualisation_js: "new Flourish.Visualisation('1', 0," + json.safeStringify({
				data_bindings: data_bindings,
				data_tables: data_tables,
				template_store_key: settings.name.toLowerCase().replace(" ", "") + "@" + settings.version,
			}) + ")",
			settings: json.safeStringify(settings.settings || []),
			data_bindings: json.safeStringify(settings.data || []),
			template_name: settings.name || "Untitled template",
			template_version: settings.version,
			template_author: settings.author || "",
			build_failed: build_failed && build_failed.size > 0,
			public_url_prefix,
		};

		const script = documentFragment([
			scriptElementInline("window.Flourish = " + json.safeStringify({
				static_prefix, environment: "sdk", is_read_only: false,
			}) + ";"),
			scriptElementExternal("/template.js"),
			scriptElementExternal("/comms.js"),
			scriptElementExternal("/embedded.js"),
		]);

		const preview_script = documentFragment([
			scriptElementInline("window.Flourish = " + json.safeStringify({
				static_prefix: preview_static_prefix, environment: "preview", is_read_only: true,
			}) + ";"),
			scriptElementExternal("/template.js"),
			scriptElementExternal("/comms.js"),
			scriptElementExternal("/embedded.js"),
			scriptElementExternal("/talk_to_server.js"),
			scriptElementInline("_Flourish_talkToServer();"),
			scriptElementInline(preview_init_js),
		]);

		return Promise.all([
			sdk_template(page_params),
			index_html.render(template_text, {
				title: "Flourish SDK template preview",
				static: static_prefix,
				parsed_script: script,
			}),
			index_html.render(template_text, {
				title: "Flourish SDK template preview",
				static: preview_static_prefix,
				parsed_script: preview_script,
			}),
			template_js,
			sdk.buildRules(template_dir),
		]);
	})
	.then(([sdk_rendered, template_rendered, preview_rendered, template_js, build_rules]) => ({
		sdk_rendered, template_rendered, preview_rendered, template_js, build_rules,
	}));
}

function previewInitJs(template_dir, template_data_bindings, data_bindings, data_table_names) {
	return getData(template_dir, data_table_names).then(({ data, column_types_by_name, timestamps_by_name }) => {
		const prepared_data = {};
		for (let dataset in data_bindings) {
			prepared_data[dataset] = data_utils.extractData(
				data_bindings[dataset], data, column_types_by_name,
				template_data_bindings[dataset],
				{ per_data_table: timestamps_by_name },
			);
		}

		const column_names = {};
		const metadata = {};
		const timestamps = {};
		for (let dataset in prepared_data) {
			column_names[dataset] = prepared_data[dataset].column_names;
			metadata[dataset] = prepared_data[dataset].metadata;
			timestamps[dataset] = prepared_data[dataset].timestamps;
		}

		return `
		var _Flourish_data_column_names = ${json.safeStringify(column_names)},
		    _Flourish_data_metadata = ${json.safeStringify(metadata)},
		    _Flourish_data_timestamps = ${json.javaScriptStringify(timestamps)},
		    _Flourish_data = ${json.javaScriptStringify(prepared_data)};
		for (var _Flourish_dataset in _Flourish_data) {
			window.template.data[_Flourish_dataset] = _Flourish_data[_Flourish_dataset];
			window.template.data[_Flourish_dataset].column_names = _Flourish_data_column_names[_Flourish_dataset];
			window.template.data[_Flourish_dataset].metadata = _Flourish_data_metadata[_Flourish_dataset];
			window.template.data[_Flourish_dataset].timestamps = _Flourish_data_timestamps[_Flourish_dataset];
		}
		window.template.draw();
		`;
	});
}

function tryToOpen(url) {
	// If it’s available and works, use /usr/bin/open to open
	// the URL. If not just prompt the user to open it.
	try {
		cross_spawn.spawn("/usr/bin/open", [url])
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
	catch (error) {
		log.success("Now open " + url + " in your web browser!");
	}
}

function isPrefix(a, b) {
	if (a.length > b.length) { return false; }
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) { return false; }
	}
	return true;
}

function splitPath(p) {
	return p.split(path.sep).filter(c => c != "");
}

function getPublicUrlPrefix(options) {
	return sdk.request(options, "config.json")
		.then((config) => {
			return config.PUBLIC_BUCKET_PREFIX;
		});
}

module.exports = function(template_dir, options) {
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
		res.header("Content-Type", "application/javascript").send(comms_js.withoutOriginCheck + comms_js.validate);
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
		const filename = path.resolve(template_dir, "data", req.params.id + ".csv");
		const { mtime: last_updated } = fs.statSync(filename);
		res.status(200).header("Content-Type", "text/csv")
			.header("Last-Modified", new Date(last_updated).toUTCString()) // Send last modified time
			.sendFile(filename);
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

	function startServer(sdk_template, template_) {
		template = template_;

		// Run the server
		const listen_hostname = options.listen || "localhost";
		const server = app.listen(options.port, listen_hostname, function() {
			const url = "http://" + listen_hostname + ":" + options.port + "/";
			log.info(`Running server at ${url}`);

			// Set up the WebSocket server and the reloadPreview() function
			const sockets = new Set();
			const websocket_server = new ws.Server({ server });
			websocket_server.on("connection", function(socket) {
				sockets.add(socket);
				socket.on("close", function() { sockets.delete(socket); });
			});
			reloadPreview = function() {
				for (let socket of sockets) { socket.close(); }
			};

			watchForChanges(sdk_template);
			if (options.open) { tryToOpen(url); }
		})
		.on("error", function(error) {
			if (error.code === "EADDRINUSE") {
				log.die("Another process is already listening on port " + options.port,
					"Perhaps you’re already running flourish in another terminal?",
					"You can use the --port option to listen on a different port");
			}
			log.die("Failed to start server", error.message);
		});
	}

	let build_failed = new Set(),
	    rebuilding = new Set();
	function watchForChanges(sdk_template) {
		// Watch for file changes. If something changes, tell the page to reload itself
		// If the source code has changed, rebuild it.

		let reload_timer = null;
		function reloadTemplate() {
			if (rebuilding.size > 0) {
				log.info("Not reloading template while rebuild is in progress.");
				return;
			}
			if (reload_timer) {
				clearTimeout(reload_timer);
				reload_timer = null;
			}
			reload_timer = setTimeout(_reloadTemplate, 50);
		}
		function _reloadTemplate() {
			reload_timer = null;
			log.info("Reloading...");
			loadTemplate(template_dir, sdk_template, build_failed, options)
				.then((template_) => {
					template = template_;
					log.info("Template reloaded. Trying to reload preview.");
					reloadPreview();
				})
				.catch((error) => {
					log.problem("Failed to reload template", error.message);
				});
		}

		// Run any custom watchers
		if (template.build_rules) {
			for (const build_rule of template.build_rules) {
				if ("watch" in build_rule) {
					const command_parts = shell_quote.parse(build_rule.watch),
					      prog = command_parts[0],
					      args = command_parts.slice(1);

					const env = process.env;
					env.NODE_ENV = "development";

					log.info(`Running watcher command: ${build_rule.watch}`);
					cross_spawn.spawn(prog, args, { cwd: template_dir, stdio: "inherit", env });
				}
			}
		}

		const chokidar_opts = { ignoreInitial: true, disableGlobbing: true, cwd: template_dir };
		chokidar.watch(".", chokidar_opts).on("all", function(event_type, filename) {
			const path_parts = filename.split(path.sep);

			let should_reload = false;
			if (sdk.TEMPLATE_SPECIAL.has(path_parts[0])) {
				if (rebuilding.size > 0) { return log.warn(`Rebuild in progress, ignoring change to ${filename}`); }
				log.info("Detected change to file: " + filename);
				should_reload = true;
			}

			const build_commands = new Map();
			if (template.build_rules) {
				for (const build_rule of template.build_rules) {
					if ((build_rule.directory && isPrefix(splitPath(build_rule.directory), path_parts))
						|| (build_rule.files && build_rule.files.indexOf(filename) != -1))
					{
						build_commands.set(build_rule.key, build_rule.script);
					}
				}
			}

			if (build_commands.size > 0) {
				const build_commands_to_run = [];
				for (const [key, command] of build_commands) {
					if (rebuilding.has(key)) { continue; }
					rebuilding.add(key);
					if (reload_timer) {
						clearTimeout(reload_timer);
						reload_timer = null;
					}
					log.info("Detected change to file: " + filename, "Running build for " + key);
					build_commands_to_run.push(
						sdk.runBuildCommand(template_dir, command, "development")
							.then(() => {
								rebuilding.delete(key);
								build_failed.delete(key);
							}, (error) => {
								rebuilding.delete(key);
								build_failed.add(key);
								throw error;
							}),
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
			else if (should_reload) { reloadTemplate(); }
		});
	}

	loadSDKTemplate()
		.then((sdk_template) => {
			return Promise.all([
				sdk_template, loadTemplate(template_dir, sdk_template, undefined, options),
			]);
		})
		.then(([sdk_template, template]) => {
			startServer(sdk_template, template);
		})
		.catch((error) => {
			if (options.debug) { log.problem("Failed to start server", error.message, error.stack); }
			else { log.problem("Failed to start server", error.message); }
		});
};
