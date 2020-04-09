"use strict";

const fs = require("fs"),
      path = require("path"),
      nodeResolve = require("resolve");

const columns = require("../server/columns");

function validateBuildRule(build_rule_name, build_rule) {
	if (build_rule == null) {
		throw new Error(`template.yml: build rule “${build_rule_name}” is null`);
	}
	if (typeof build_rule !== "object" || Array.isArray(build_rule)) {
		throw new Error(`template.yml: build rule “${build_rule_name}” must be a mapping`);
	}
	if (!("script" in build_rule)) {
		throw new Error(`template.yml: build rule “${build_rule_name}” has no “script”`);
	}
	if (typeof build_rule.script !== "string") {
		throw new Error(`template.yml: build.${build_rule_name}.script must be a string`);
	}
	if (!("directory" in build_rule) && !("files" in build_rule) && !("watch" in build_rule)) {
		throw new Error(`template.yml: build rule “${build_rule_name}” has no “directory”, “files” or “watch”`);
	}
	if ("directory" in build_rule && typeof build_rule.directory !== "string") {
		throw new Error(`template.yml: “build.${build_rule_name}.directory” must be a string`);
	}
	if ("files" in build_rule) {
		if (!Array.isArray(build_rule.files)) {
			throw new Error(`template.yml: “build.${build_rule_name}.files” must be an array`);
		}
		for (const filename of build_rule.files) {
			if (typeof filename !== "string") {
				throw new Error(`template.yml: the entries of “build.${build_rule_name}.files” must be strings`);
			}
		}
	}
	if ("watch" in build_rule) {
		if ("directory" in build_rule) {
			throw new Error(`template.yml: build rule “${build_rule_name}” has both “watch” and “directory”`);
		}
		if ("files" in build_rule) {
			throw new Error(`template.yml: build rule “${build_rule_name}” has both “watch” and files`);
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

function validateStringChoices(property, choices) {
	for (let i = 0; i < choices.length; i++) {
		const choice = choices[i];
		if (typeof choice === "string") continue;
		if (!Array.isArray(choice)) {
			throw new Error(`template.yml setting “${property}” has a “choices” field with an element that is neither a string nor an array`);
		}
		if (choice.length != 2 && choice.length != 3) {
			throw new Error(`template.yml setting “${property}”: element ${i} of “choices” field has ${choice.length} elements (should be 2)`);
		}
		if (typeof choice[0] !== "string") {
			throw new Error(`template.yml setting “${property}”: first entry of element ${i} of “choices” field is not a string`);
		}
		if (typeof choice[1] !== "string") {
			throw new Error(`template.yml setting “${property}”: second entry of element ${i} of “choices” field is not a string`);
		}
	}
}

function validateBooleanChoices(property, choices) {
	for (let i = 0; i < choices.length; i++) {
		const choice = choices[i];
		if (typeof choice === "string") {
			throw new Error(`template.yml setting “${property}” has a “choices” field with a string element, but is of type boolean`);
		}
		if (!Array.isArray(choice)) {
			throw new Error(`template.yml setting “${property}” has a “choices” field with an element that is neither a string nor an array`);
		}
		if (choice.length != 2 && choice.length != 3) {
			throw new Error(`template.yml setting “${property}”: element ${i} of “choices” field has ${choice.length} elements (should be 2)`);
		}
		if (typeof choice[0] !== "string") {
			throw new Error(`template.yml setting “${property}”: first entry of element ${i} of “choices” field is not a string`);
		}
		if (typeof choice[1] !== "boolean") {
			throw new Error(`template.yml setting “${property}”: second entry of element ${i} of boolean “choices” field is not a boolean`);
		}
	}
	if (choices.length !== 2) {
		throw new Error(`template.yml setting “${property}”: “choices” field for boolean property can only contain one “false” and one “true” option`);
	}
	if (choices[0][1] === choices[1][1]) {
		throw new Error(`template.yml setting “${property}”: “choices” field for boolean property can only contain one “false” and one “true” option`);
	}
}

function validateChoices(property, choices, choices_other, type) {
	if (!Array.isArray(choices)) {
		throw new Error(`template.yml setting “${property}” has a “choices” field that is not an array`);
	}
	if (typeof choices_other !== "undefined" && typeof choices_other !== "boolean") {
		throw new Error(`template.yml setting “${property}” has invalid value for “choices_other”: should be boolean`);
	}

	switch (type) {
		case "string":
			return validateStringChoices(property, choices);
		case "boolean":
			return validateBooleanChoices(property, choices);
		default:
			throw new Error(`template.yml setting “${property}” has a “choices” field, but is of type ${type}`);
	}
}

function validateConditional(conditional_settings, property, value, conditional) {
	if (value == null) {
		throw new Error(`template.yml Conditional setting “${property}” is badly formed or wrongly indented`);
	}
	if (typeof value == "string") {
		if (value == property) {
			throw new Error(`template.yml setting “${property}” cannot be conditional on itself`);
		}
		// Allow shorthand syntax for booleans
		conditional_settings.add(value);
		return;
	}
	if (typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`template.yml setting “${property}” has a “${conditional}” value that is not a string or object`);
	}
	if (Object.keys(value).length == 0) {
		throw new Error(`template.yml setting “${property}” “${conditional}” property must specify a setting to test against`);
	}
	for (let name in value) {
		if (name == property) {
			throw new Error(`template.yml setting “${property}” cannot be conditional on itself`);
		}
		if (typeof value[name] == "object" && !Array.isArray(value[name])) {
			throw new Error(`template.yml setting “${property}” “${conditional}” property: value for ${name} cannot be an object`);
		}
		if (value[name].length == 0) {
			throw new Error(`template.yml setting “${property}” “${conditional}” property: value for ${name} is empty`);
		}
		conditional_settings.add(name);
	}
}

function validateImport(template_directory, setting) {
	for (const k in setting) {
		if (k != "property" && k != "import" && k != "overrides" && k != "show_if" && k != "hide_if") {
			throw new Error(`template.yml: Unexpected property '${k}' in import`);
		}
		if (k == "overrides") {
			if (!Array.isArray(setting.overrides)) throw new Error(`template.yml Setting import overrides must be an array`);
			setting.overrides.forEach(function(override) {
				if (!("property" in override)) throw new Error(`template.yml Setting import overrides must each specify overridden “property”`);
				if (![undefined, "replace", "extend"].includes(override.method)) {
					throw new Error(`template.yml Setting import override “method” method must be either “replace” or “extend”`);
				}
			});
		}
	}

	const module_name = setting.import;

	const target_path = nodeResolve.sync(path.join(module_name, "settings.yml"), { basedir: template_directory });
	if (!fs.existsSync(target_path)) {
		throw new Error("template.yml: Imported settings not found at " + target_path);
	}
}

const VALID_SETTING_TYPES = new Set(["number", "string", "text", "code", "boolean", "color", "colors", "url", "font", "hidden"]);
function validateSetting(template_directory, conditional_settings, setting) {
	if (typeof setting !== "object" || Array.isArray(setting)) {
		throw new Error("template.yml: setting must be a mapping");
	}
	if (!("property" in setting)) {
		throw new Error("template.yml setting must specify a property:");
	}
	if ("import" in setting) {
		validateImport(template_directory, setting);
		return;
	}
	const property = setting.property;
	if (!("name" in setting) && !("choices" in setting)) {
		throw new Error(`template.yml setting “${property}” must specify a name:`);
	}
	if (!("type" in setting)) {
		throw new Error(`template.yml setting “${property}” must specify a type:`);
	}
	if (!VALID_SETTING_TYPES.has(setting.type)) {
		throw new Error(`template.yml setting “${property}” has invalid type “${setting.type}”`);
	}
	if ("optional" in setting) {
		if (setting.type !== "number" && setting.type !== "font" && setting.type !== "color") {
			throw new Error(`The “optional” property is only supported for “number”, “color” and “font” type settings`);
		}
		if (typeof setting.optional !== "boolean") {
			throw new Error(`template.yml setting “${property}” has an invalid value for “optional”: should be true or false`);
		}
	}
	if ("choices" in setting) validateChoices(property, setting.choices, setting.choices_other, setting.type);
	else if ("choices_other" in setting) {
		throw new Error(`template.yml setting “${property}” has a “choices_other” field, but no choices:`);
	}

	if ("show_if" in setting && "hide_if" in setting) {
		throw new Error(`template.yml setting “${property}” has both “show_if” and “hide_if” properties: there can only be one`);
	}
	if ("show_if" in setting) validateConditional(conditional_settings, property, setting.show_if, "show_if");
	else if ("hide_if" in setting) validateConditional(conditional_settings, property, setting.hide_if, "hide_if");

	if ("new_section" in setting && typeof setting.new_section !== "boolean" && typeof setting.new_section !== "string") {
		let type = typeof setting.new_section;
		if (setting.new_section == null) type = "null";
		else if (Array.isArray(setting.new_section)) type = "array";

		throw new Error(`template.yml setting “${property}” new_section property must be a boolean or string, not ${type}`);
	}

	if ("width" in setting && (typeof setting.width !== "string" || !/^(full|half|quarter|three quarters)$/.test(setting.width))) {
		throw new Error(`template.yml setting “${property}” has unsupported width property: must be “full”, “half”, “quarter” or “three quarters”`);
	}
	if ("size" in setting) {
		if (setting.type !== "code" && setting.type !== "text") throw new Error(`template.yml setting “${property}” has a “size” setting but is not of type “string” or “code”`);
		else if (setting.size !== "large") throw new Error(`template.yml setting “${property}” has unsupported size property: must be “large”`);
	}
}

function validateSettings(template_directory, settings, bindings) {
	// Null settings are allowed, and are equivalent to an empty array
	if (settings == null) return;

	if (!Array.isArray(settings)) {
		throw new Error("template.yml: “settings” must be an array");
	}
	const conditional_settings = new Set();
	const setting_properties = new Set();
	for (let setting of settings) {
		if (typeof setting === "string") continue;
		validateSetting(template_directory, conditional_settings, setting);
		if (setting_properties.has(setting.property)) {
			throw new Error(`template.yml: there is more than one setting for property “${setting.property}”`);
		}
		setting_properties.add(setting.property);
	}

	if (conditional_settings.size > 0) {
		conditional_settings.forEach(function(conditional_setting) {
			if (/^data\./.test(conditional_setting)) {
				if (!/^data\.\w+\.\w+$/.test(conditional_setting)) {
					throw new Error(`template.yml: “show_if” or “hide_if” property specifies invalid data binding “${conditional_setting}”`);
				}
				if (!bindings || !Array.isArray(bindings)) {
					throw new Error(`template.yml: “show_if” or “hide_if” property refers to data binding “${conditional_setting}” when none are defined`);
				}
				const conditional = conditional_setting.split(".");
				if (bindings.findIndex((binding) => (binding.dataset == conditional[1] && binding.key == conditional[2])) == -1) {
					throw new Error(`template.yml: “show_if” or “hide_if” property refers to non-existent data binding “${conditional_setting}”`);
				}
			}
			else if (!setting_properties.has(conditional_setting) && !setting_properties.has(conditional_setting.split(".")[0])) {
				throw new Error(`template.yml: “show_if” or “hide_if” property refers to non-existent setting “${conditional_setting}”`);
			}
		});
	}
}

function validateColSpec(spec, parser, data_table_names) {
	const double_colon_ix = spec.indexOf("::");
	if (double_colon_ix == -1) throw new Error("Invalid data binding: " + spec);
	const data_table_name = spec.substr(0, double_colon_ix);
	if (!data_table_names.has(data_table_name)) {
		throw new Error(`template.yml: data binding refers to “${spec}”, but data file does not exist`);
	}

	const col_spec = spec.substr(double_colon_ix + 2);
	parser(col_spec);
}

const VALID_DATA_BINDING_TYPES = new Set(["column", "columns"]);
function validateDataBinding(binding, data_table_names) {
	if (typeof binding !== "object" || Array.isArray(binding)) {
		throw new Error("template.yml: data binding must be a mapping");
	}
	if (!("name" in binding)) {
		throw new Error(`template.yml data binding must specify a name`);
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
	if (binding.type == "column") {
		if ("column" in binding) {
			if (typeof binding.column !== "string") {
				throw new Error(`template.yml: “column” property of data binding “${binding_name}” must be a string`);
			}
			validateColSpec(binding.column, columns.parseColumn, data_table_names);
		}
	}
	else if (binding.type == "columns") {
		if (typeof binding.columns !== "string") {
			throw new Error(`template.yml: “columns” property of data binding “${binding_name}” must be a string`);
		}
		validateColSpec(binding.columns, columns.parseColumns, data_table_names);
	}
}

function getDataTableNames(data_directory) {
	return new Set(
		fs.readdirSync(data_directory)
		.filter(filename => filename.endsWith(".csv"))
		.map(filename => filename.substr(0, filename.length - 4))
	);
}

function validateDataBindings(bindings, data_directory) {
	// Null bindings are allowed, and are equivalent to an empty array
	if (bindings == null) return;

	if (!Array.isArray(bindings)) {
		throw new Error("template.yml: “data” must be an array");
	}
	const data_table_names = getDataTableNames(data_directory);
	const datasets = new Map();
	for (let binding of bindings) {
		if (typeof binding === "string") continue;
		validateDataBinding(binding, data_table_names);
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

function validateCredits(credits) {
	if (typeof credits !== "string") throw new Error(`template.yml: Credits must be a string`);
}

function validateImageDownload(image_download) {
	if (typeof image_download !== "boolean") throw new Error(`template.yml: Bad image_download setting; must be either true or false`);
}

function validateSvgDownload(svg_download) {
	if (typeof svg_download !== "boolean") throw new Error(`template.yml: Bad svg_download setting; must be either true or false`);
}

function validateCategories(categories) {
	if (!Array.isArray(categories)) {
		throw new Error("template.yml: “categories” must be an array");
	}
	categories.forEach(function(category) {
		if (typeof category !== "string") {
			throw new Error(`template.yml: category ${category} is not a string`);
		}
	});
}

const ALLOWED_TOUR_ATTRIBUTES = new Set(["anchor", "text", "position", "direction", "trigger", "delay", "button_text"]);
function validateTour(tour) {
	tour.forEach(function(step) {
		for (let name in step) {
			if (!ALLOWED_TOUR_ATTRIBUTES.has(name)) {
				throw new Error(`template.yml: tour has unexpected attribute ${name}`);
			}
		}
	});
}

function validateConfig(config, template_directory) {
	if (config == null || typeof config !== "object" || Array.isArray(config)) {
		throw new Error("template.yml must define a mapping");
	}
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
	if ("credits" in config) validateCredits(config.credits);
	if ("is_master_slide" in config && typeof config.is_master_slide !== "boolean") {
		throw new Error("template.yml: Bad is_master_slide setting; must be either true or false");
	}
	if ("autoheight" in config) {
		throw new Error("template.yml: autoheight is no longer supported. You can use `Flourish.setHeight()` to dynamically adjust the height, if needed.");
	}
	if ("image_download" in config) validateImageDownload(config.image_download);
	if ("svg_download" in config) validateSvgDownload(config.svg_download);
	if ("build" in config) validateBuildRules(config.build);
	if ("data" in config) validateDataBindings(config.data, path.join(template_directory, "data"));
	if ("settings" in config) validateSettings(template_directory, config.settings, config.data);
	if ("categories" in config) validateCategories(config.categories);
	if ("tour" in config) validateTour(config.tour);

	if ("joinable_data" in config && typeof config.joinable_data !== "boolean") {
		throw new Error("template.yml: Bad joinable_data setting; must be either true or false");
	}
}

module.exports = validateConfig;
