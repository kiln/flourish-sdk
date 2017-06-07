"use strict";

const fs = require("fs"),
      path = require("path");

const columns = require("../server/columns");

function validateBuildRule(build_rule_name, build_rule) {
	if (!("script" in build_rule)) {
		throw new Error(`template.yml: build rule “${build_rule_name}” has no “script”`);
	}
	if (!("script" in build_rule)) {
		throw new Error(`template.yml: build rule “${build_rule_name}” has no “script”`);
	}
	if (!("directory" in build_rule) && !("files" in build_rule)) {
		throw new Error(`template.yml: build rule “${build_rule_name}” has no “directory” or “files”`);
	}
	if ("directory" in build_rule && typeof build_rule.directory !== "string") {
		throw new Error(`template.yml: “build.${build_rule_name}.directory” must be a string`);
	}
	if ("files" in build_rule) {
		if (!Array.isArray(build_rule.files)) {
			throw new Error(`template.yml: “build.${build_rule_name}.files” must be an array`);
		}
		for (const filename in build_rule.files) {
			if (typeof filename !== "string") {
				throw new Error(`template.yml: the entries of “build.${build_rule_name}.files” must be strings`);
			}
		}
	}
}

function validateBuildRules(build_rules) {
	if (typeof build_rules !== "object" || Array.isArray(build_rules)) {
		throw new Error("template.yml “build” must be a mapping");
	}
	for (let build_rule_name in build_rules) {
		validateBuildRule(build_rule_name, build_rules[build_rule_name]);
	}
}

const VALID_SETTING_TYPES = new Set(["number", "string", "text", "boolean", "color"]);
function validateSetting(setting) {
	if (typeof setting !== "object" || Array.isArray(setting)) {
		throw new Error("template.yml: setting must be a mapping");
	}
	if (!("property" in setting)) {
		throw new Error("template.yml setting must specify a property:");
	}
	const property = setting.property;
	if (!("name" in setting)) {
		throw new Error(`template.yml setting “${property}” must specify a name:`);
	}
	if (!("type" in setting)) {
		throw new Error(`template.yml setting “${property}” must specify a type:`);
	}
	if (!VALID_SETTING_TYPES.has(setting.type)) {
		throw new Error(`template.yml setting “${property}” has invalid type “${setting.type}”`);
	}
}

function validateSettings(settings) {
	// Null settings are allowed, and are equivalent to an empty array
	if (settings == null) return;

	if (!Array.isArray(settings)) {
		throw new Error("template.yml: “settings” must be a sequence");
	}
	const setting_properties = new Set();
	for (let setting of settings) {
		if (typeof setting === "string") continue;
		validateSetting(setting);
		if (setting_properties.has(setting.property)) {
			throw new Error(`template.yml: there is more than one setting for property “${setting.property}”`);
		}
		setting_properties.add(setting.property);
	}
}

function validateColSpec(spec, parser, data_directory) {
	const double_colon_ix = spec.indexOf("::");
	if (double_colon_ix == -1) throw new Error("Invalid data binding: " + spec);
	const data_table_name = spec.substr(0, double_colon_ix);
	const csv_filename = path.join(data_directory, data_table_name + ".csv");
	if (!fs.existsSync(csv_filename)) {
		throw new Error(`template.yml: data binding refers to “${spec}”, but file does not exist: ${csv_filename}`);
	}

	const col_spec = spec.substr(double_colon_ix + 2);
	parser(col_spec);
}

const VALID_DATA_BINDING_TYPES = new Set(["column", "columns"]);
function validateDataBinding(binding, data_directory) {
	if (typeof binding !== "object" || Array.isArray(binding)) {
		throw new Error("template.yml: data binding must be a mapping");
	}
	if (!("name" in binding)) {
		throw new Error(`template.yml data binding must specify a name:`);
	}
	const binding_name = binding.name;
	if (!("dataset" in binding)) {
		throw new Error(`template.yml data binding “${binding_name}” must specify a dataset:`);
	}
	if (!("key" in binding)) {
		throw new Error(`template.yml data binding “${binding_name}” must specify a key:`);
	}
	if (!("type" in binding)) {
		throw new Error(`template.yml data binding “${binding_name}” must specify a type:`);
	}
	if (!VALID_DATA_BINDING_TYPES.has(binding.type)) {
		throw new Error(`template.yml data binding “${binding_name}” has invalid type “${binding.type}”`);
	}
	if (!(binding.type in binding)) {
		throw new Error(`template.yml data binding “${binding_name}” must specify a ${binding.type}:`);
	}
	if (binding.type == "column") {
		validateColSpec(binding.column, columns.parseColumn, data_directory);
	}
	else if (binding.type == "columns") {
		validateColSpec(binding.columns, columns.parseColumns, data_directory);
	}
}

function validateDataBindings(bindings, data_directory) {
	// Null bindings are allowed, and are equivalent to an empty array
	if (bindings == null) return;

	if (!Array.isArray(bindings)) {
		throw new Error("template.yml “data” must be a sequence");
	}
	const datasets = new Map();
	for (let binding of bindings) {
		if (typeof binding === "string") return;
		validateDataBinding(binding, data_directory);
		if (!datasets.has(binding.dataset)) {
			datasets.set(binding.dataset, new Set());
		}
		const dataset = datasets.get(binding.dataset);
		if (dataset.has(binding.key)) {
			throw new Error(`template.yml: there is more than one data binding with dataset “${binding.dataset}” and key “${binding.key}”`);
		}
		dataset.add(binding.key);
	}
}

function validateConfig(config, data_directory) {
	if (!("id" in config)) {
		// The empty string is permitted here. The publish command checks this explicitly.
		throw new Error("template.yml must specify an id:");
	}
	if (!("name" in config)) {
		throw new Error("template.yml must specify a name:");
	}
	if (!("author" in config)) {
		throw new Error("template.yml must specify an author:");
	}
	// We treat description: as non-mandatory for now
	if (!("sdk_version" in config)) {
		throw new Error("template.yml must specify an sdk_version:");
	}

	if ("build" in config) validateBuildRules(config.build);
	if ("settings" in config) validateSettings(config.settings);
	if ("data" in config) validateDataBindings(config.data, data_directory);
}

module.exports = validateConfig;
