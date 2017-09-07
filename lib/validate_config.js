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

function validateChoices(property, choices) {
	if (!Array.isArray(choices)) {
		throw new Error(`template.yml setting “${property}” has a “choices” field that is not an array`)
	}
	for (var i = 0; i < choices.length; i++) {
		if (typeof choices[i] === "string") continue;
		if (!Array.isArray(choices[i])) {
			throw new Error(`template.yml setting “${property}” has a “choices” field with an element that is neither a string nor an array`);
		}
		if (choices[i].length != 2) {
			throw new Error(`template.yml setting “${property}”: element ${i} of “choices” field has ${choices[i].length} elements (should be 2)`);
		}
		if (typeof choices[i][0] !== "string") {
			throw new Error(`template.yml setting “${property}”: first entry of element ${i} of “choices” field is not a string`);
		}
		if (typeof choices[i][1] !== "string") {
			throw new Error(`template.yml setting “${property}”: second entry of element ${i} of “choices” field is not a string`);
		}
	}
}

const VALID_SETTING_TYPES = new Set(["number", "string", "text", "boolean", "color", "url"]);
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
	if ("optional" in setting) {
		if (setting.type !== "number") {
			throw new Error(`The “optional” property is only supported for “number” type settings`);
		}
		if (typeof setting.optional !== "boolean") {
			throw new Error(`template.yml setting “${property}” has an invalid value for “optional”: should be true or false`);
		}
	}
	if (setting.type == "string") {
		if ("choices" in setting) validateChoices(property, setting.choices);
		if ("choices_other" in setting) {
			if ("choices" in setting) {
				if (typeof setting.choices_other !== "boolean") {
					throw new Error(`template.yml setting “${property}” has invalid value for “choices_other”: should be boolean`);
				}
			}
			else throw new Error(`template.yml setting “${property}” has a “choices_other” field, but no choices:`);
		}
	}
	else {
		if ("choices" in setting) {
			throw new Error(`template.yml setting “${property}” has a “choices” field, but is of type ${setting.type}`);
		}
		if ("choices_other" in setting) {
			throw new Error(`template.yml setting “${property}” has a “choices_other” field, but is of type ${setting.type}`);
		}
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
		throw new Error(`template.yml data binding “${binding_name}” must specify a dataset`);
	}
	if (!("key" in binding)) {
		throw new Error(`template.yml data binding “${binding_name}” must specify a key`);
	}
	if (!("type" in binding)) {
		throw new Error(`template.yml data binding “${binding_name}” must specify a type`);
	}
	if (!VALID_DATA_BINDING_TYPES.has(binding.type)) {
		throw new Error(`template.yml data binding “${binding_name}” has invalid type “${binding.type}”`);
	}
	if ("optional" in binding) {
		if (binding.type !== "column") {
			throw new Error(`template.yml “optional” property is only allows for “column” bindings`);
		}
		if (typeof binding.optional !== "boolean") {
			throw new Error(`template.yml “optional” property of data binding “${binding_name}” must be a boolean`);
		}
	}
	if (!(binding.type in binding) && !binding.optional) {
		throw new Error(`template.yml non-optional data binding “${binding_name}” must specify ${binding.type}`);
	}
	if (binding.type == "column" && binding.column) {
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
		if (typeof binding === "string") continue;
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

function validateBreakpointVal(value, name) {
	if (name && !value) {
		throw new Error(`template.yml: Autoheight breakpoint “${name}” is missing a height value`);
	}
	if (/^\d*$/.test(value)) {
		throw new Error(`template.yml: Missing css units for height “${value}”. Hint: you may want to add “px”`);
	}
	if (value !== '*' && value !== "auto" && !/^(0|\d+([a-z]+|%))$/.test(value) && !/^\d+x\d+$/.test(value)) {
		throw new Error(`template.yml: Bad autoheight value “${value}”; must be a valid css height or an aspect ratio in format “4x3”`);
	}
}

function validateAutoheight(autoheight) {
	// Autoheight should be either a string which is a valid css height or aspect ratio, or a JSON
	// object where keys are breakpoints and values are valid css height or aspect ratio.
	if (Array.isArray(autoheight)) {
		throw new Error(`template.yml: autoheight is an array; must be an object or a string`);
	}
	else if (typeof autoheight == "string" || typeof autoheight == "number") {
		validateBreakpointVal(autoheight);
	}
	else if (typeof autoheight == "object" && autoheight != null) {
		for (let name in autoheight) {
			let value = autoheight[name];
			if (name !== '∞' && name !== '*' && !/^\d+$/.test(name)) {
				throw new Error(`template.yml: Invalid autoheight breakpoint “${name}”; must be an integer or “∞”`);
			}
			validateBreakpointVal(value, name);
		}
	}
	else throw new Error(`template.yml: Bad autoheight setting; must be a valid css height or an aspect ratio in format “4x3”`);
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
	if ("autoheight" in config) validateAutoheight(config.autoheight);
	if ("build" in config) validateBuildRules(config.build);
	if ("settings" in config) validateSettings(config.settings);
	if ("data" in config) validateDataBindings(config.data, data_directory);
}

module.exports = validateConfig;
