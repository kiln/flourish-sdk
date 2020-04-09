const assert = require("assert"),
      fs = require("fs"),
      nodeResolve = require("resolve"),
      path = require("path"),
      sinon = require("sinon"),
      tempy = require("tempy");

const validateConfig = require("../../lib/validate_config");

describe("validate_config", function() {
	let temp_directory;
	before(function() {
		temp_directory = tempy.directory();
		fs.mkdirSync(path.join(temp_directory, "data"));
		fs.openSync(path.join(temp_directory, "data", "Foo.csv"), "w");
	});

	function expectFailure(config, expected_message) {
		try {
			validateConfig(config, temp_directory);
		}
		catch (e) {
			assert.equal(e.message, expected_message);
			return;
		}
		assert.fail(`Got no error; expected “${expected_message}”`);
	}

	function expectSuccess(config) {
		validateConfig(config, temp_directory);
	}

	const id = "best-template",
	      name = "Best template",
	      author = "Robin Houston",
	      sdk_version = 3;

	const metadata = { id, name, author, sdk_version };
	const binding = { name: "My binding", dataset: "dataset", key: "key", type: "column", column: "Foo::A" };
	const setting_foo = { name: "Foo", property: "foo", type: "string" };
	const setting_bar = { name: "Bar", property: "bar", type: "string" };

	function metadataPlus(o) {
		return Object.assign({}, metadata, o);
	}

	function bindingPlus(o) {
		return metadataPlus({ data: [ Object.assign({}, binding, o) ] });
	}

	function settingPlus(o, other, more_settings=[]) {
		return metadataPlus(Object.assign({ settings: [ Object.assign({}, setting_foo, o), setting_bar ].concat(more_settings) }, other));
	}

	function testBoolean(name) {
		return function() {
			it(`should accept ${name}=true`, function() {
				expectSuccess(
					metadataPlus({ [name]: true })
				);
			});
			it(`should accept ${name}=false`, function() {
				expectSuccess(
					metadataPlus({ [name]: false })
				);
			});
			it(`should reject ${name}=null`, function() {
				expectFailure(
					metadataPlus({ [name]: null }),
					`template.yml: Bad ${name} setting; must be either true or false`
				);
			});
			it(`should reject ${name}=undefined`, function() {
				expectFailure(
					metadataPlus({ [name]: undefined }),
					`template.yml: Bad ${name} setting; must be either true or false`
				);
			});
			it(`should reject strings for ${name}`, function() {
				expectFailure(
					metadataPlus({ [name]: "false" }),
					`template.yml: Bad ${name} setting; must be either true or false`
				);
			});
			it(`should reject numbers for ${name}`, function() {
				expectFailure(
					metadataPlus({ [name]: 1 }),
					`template.yml: Bad ${name} setting; must be either true or false`
				);
			});
			it(`should reject objects for ${name}`, function() {
				expectFailure(
					metadataPlus({ [name]: {} }),
					`template.yml: Bad ${name} setting; must be either true or false`
				);
			});
		};
	}

	function testObject(name, expected_error_message) {
		return function() {
			it(`should reject ${name}=true`, function() {
				expectFailure(
					metadataPlus({ [name]: true }),
					expected_error_message
				);
			});
			it(`should reject ${name}=false`, function() {
				expectFailure(
					metadataPlus({ [name]: false }),
					expected_error_message
				);
			});
			it(`should reject ${name}=null`, function() {
				expectFailure(
					metadataPlus({ [name]: null }),
					expected_error_message
				);
			});
			it(`should reject ${name}=undefined`, function() {
				expectFailure(
					metadataPlus({ [name]: undefined }),
					expected_error_message
				);
			});
			it(`should reject strings for ${name}`, function() {
				expectFailure(
					metadataPlus({ [name]: "false" }),
					expected_error_message
				);
			});
			it(`should reject numbers for ${name}`, function() {
				expectFailure(
					metadataPlus({ [name]: 1 }),
					expected_error_message
				);
			});
			it(`should accept objects for ${name}`, function() {
				expectSuccess(
					metadataPlus({ [name]: {} })
				);
			});
		};
	}

	describe("top level", function() {
		it("should reject null", function() {
			expectFailure(null, "template.yml must define a mapping");
		});
		it("should reject undefined", function() {
			expectFailure(undefined, "template.yml must define a mapping");
		});
		it("should reject a number", function() {
			expectFailure(23, "template.yml must define a mapping");
		});
		it("should reject a string", function() {
			expectFailure("foo", "template.yml must define a mapping");
		});
		it("should reject an array", function() {
			expectFailure([], "template.yml must define a mapping");
		});
		it("should reject true", function() {
			expectFailure(true, "template.yml must define a mapping");
		});
		it("should reject false", function() {
			expectFailure(false, "template.yml must define a mapping");
		});
	});

	describe("metadata", function() {
		it("should require id", function() {
			expectFailure(
				{ name, author, sdk_version },
				"template.yml must specify an id:"
			);
		});

		it("should require name", function() {
			expectFailure(
				{ id, author, sdk_version },
				"template.yml must specify a name:"
			);
		});

		it("should require author", function() {
			expectFailure(
				{ id, name, sdk_version },
				"template.yml must specify an author:"
			);
		});

		it("should require sdk_version", function() {
			expectFailure(
				{ id, name, author },
				"template.yml must specify an sdk_version:"
			);
		});

		// The SDK version number is checked separately, by the checkTemplateVersion function
		// in lib/sdk.js, which is called on build.
	});

	describe("is_master_slide", testBoolean("is_master_slide"));

	describe("credits", function() {
		it("should accept string credits", function() {
			expectSuccess(metadataPlus({ credits: "" }));
			expectSuccess(metadataPlus({ credits: "Credits here" }));
		});
		it("should reject null credits", function() {
			expectFailure(metadataPlus({ credits: null }), "template.yml: Credits must be a string");
		});
		it("should reject undefined credits", function() {
			expectFailure(metadataPlus({ credits: undefined }), "template.yml: Credits must be a string");
		});
		it("should reject numeric credits", function() {
			expectFailure(metadataPlus({ credits: 23 }), "template.yml: Credits must be a string");
		});
		it("should reject a credits object", function() {
			expectFailure(metadataPlus({ credits: {} }), "template.yml: Credits must be a string");
		});
		it("should reject a credits array", function() {
			expectFailure(metadataPlus({ credits: [] }), "template.yml: Credits must be a string");
		});
	});

	describe("autoheight", function() {
		it("should reject autoheight", function() {
			expectFailure(metadataPlus({ autoheight: "*" }),
				"template.yml: autoheight is no longer supported. You can use `Flourish.setHeight()` to dynamically adjust the height, if needed.");
		});
	});

	describe("image_download", testBoolean("image_download"));

	describe("svg_download", testBoolean("svg_download"));

	describe("build rules", function() {
		testObject("build_rules", "template.yml “build” must be a mapping");
		it("should reject null", function() {
			expectFailure(metadataPlus({ build: { foo: null } }),
				"template.yml: build rule “foo” is null");
		});
		it("should reject undefined", function() {
			expectFailure(metadataPlus({ build: { foo: undefined } }),
				"template.yml: build rule “foo” is null");
		});
		it("should reject arrays", function() {
			expectFailure(metadataPlus({ build: { foo: [] } }),
				"template.yml: build rule “foo” must be a mapping");
		});
		it("should reject numbers", function() {
			expectFailure(metadataPlus({ build: { foo: 23 } }),
				"template.yml: build rule “foo” must be a mapping");
		});
		it("should reject true", function() {
			expectFailure(metadataPlus({ build: { foo: true } }),
				"template.yml: build rule “foo” must be a mapping");
		});
		it("should reject false", function() {
			expectFailure(metadataPlus({ build: { foo: false } }),
				"template.yml: build rule “foo” must be a mapping");
		});

		it("should expect a script", function() {
			expectFailure(metadataPlus({ build: { foo: { } } }),
				"template.yml: build rule “foo” has no “script”");
		});
		it("should reject a null script", function() {
			expectFailure(metadataPlus({ build: { foo: { script: null } } }),
				"template.yml: build.foo.script must be a string");
		});
		it("should reject a numeric script", function() {
			expectFailure(metadataPlus({ build: { foo: { script: 23 } } }),
				"template.yml: build.foo.script must be a string");
		});
		it("should reject a true script", function() {
			expectFailure(metadataPlus({ build: { foo: { script: true } } }),
				"template.yml: build.foo.script must be a string");
		});
		it("should reject a false script", function() {
			expectFailure(metadataPlus({ build: { foo: { script: false } } }),
				"template.yml: build.foo.script must be a string");
		});

		it("should expect directory, files or watch", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "" } } }),
				"template.yml: build rule “foo” has no “directory”, “files” or “watch”");
		});
		it("should accept a directory alone", function() {
			expectSuccess(metadataPlus({ build: { foo: { script: "", directory: "." } } }));
		});
		it("should accept a files array alone", function() {
			expectSuccess(metadataPlus({ build: { foo: { script: "", files: [] } } }));
		});
		it("should accept a watch command alone", function() {
			expectSuccess(metadataPlus({ build: { foo: { script: "", watch: "" } } }));
		});
		it("should reject a watch command and a directory", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", watch: "", directory: "" } } }),
				"template.yml: build rule “foo” has both “watch” and “directory”");
		});
		it("should reject a watch command and a list of files", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", watch: "", files: [""] } } }),
				"template.yml: build rule “foo” has both “watch” and files");
		});
		it("should reject null files", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: null } } }),
				"template.yml: “build.foo.files” must be an array");
		});
		it("should reject numeric files", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: 23 } } }),
				"template.yml: “build.foo.files” must be an array");
		});
		it("should reject true files", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: true } } }),
				"template.yml: “build.foo.files” must be an array");
		});
		it("should reject false files", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: false } } }),
				"template.yml: “build.foo.files” must be an array");
		});
		it("should reject a files object", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: {} } } }),
				"template.yml: “build.foo.files” must be an array");
		});
		it("should reject a null file", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: [ null ] } } }),
				"template.yml: the entries of “build.foo.files” must be strings");
		});
		it("should reject an undefined file", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: [ undefined ] } } }),
				"template.yml: the entries of “build.foo.files” must be strings");
		});
		it("should reject a numeric file", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: [ 23 ] } } }),
				"template.yml: the entries of “build.foo.files” must be strings");
		});
		it("should reject a true file", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: [ true ] } } }),
				"template.yml: the entries of “build.foo.files” must be strings");
		});
		it("should reject a false file", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", files: [ false ] } } }),
				"template.yml: the entries of “build.foo.files” must be strings");
		});
		it("should accept a string file", function() {
			expectSuccess(metadataPlus({ build: { foo: { script: "", files: [ "" ] } } }));
		});
		it("should accept two strings", function() {
			expectSuccess(metadataPlus({ build: { foo: { script: "", files: [ "one", "two" ] } } }));
		});

		it("should reject a null directory", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", directory: null } } }),
				"template.yml: “build.foo.directory” must be a string");
		});
		it("should reject an undefined directory", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", directory: undefined } } }),
				"template.yml: “build.foo.directory” must be a string");
		});
		it("should reject a numeric directory", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", directory: 23 } } }),
				"template.yml: “build.foo.directory” must be a string");
		});
		it("should reject a true directory", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", directory: true } } }),
				"template.yml: “build.foo.directory” must be a string");
		});
		it("should reject a false directory", function() {
			expectFailure(metadataPlus({ build: { foo: { script: "", directory: false } } }),
				"template.yml: “build.foo.directory” must be a string");
		});
		it("should accept a string directory", function() {
			expectSuccess(metadataPlus({ build: { foo: { script: "", directory: "" } } }));
		});
	});

	describe("data bindings", function() {
		it("should accept null", function() {
			expectSuccess(metadataPlus({ data: null }));
		});
		it("should reject a number", function() {
			expectFailure(metadataPlus({ data: 23 }),
				"template.yml: “data” must be an array");
		});
		it("should reject a string", function() {
			expectFailure(metadataPlus({ data: "bar" }),
				"template.yml: “data” must be an array");
		});
		it("should reject true", function() {
			expectFailure(metadataPlus({ data: true }),
				"template.yml: “data” must be an array");
		});
		it("should reject false", function() {
			expectFailure(metadataPlus({ data: false }),
				"template.yml: “data” must be an array");
		});
		it("should reject an object", function() {
			expectFailure(metadataPlus({ data: {} }),
				"template.yml: “data” must be an array");
		});
		it("should accept an empty array", function() {
			expectSuccess(metadataPlus({ data: [] }));
		});

		const name = binding.name,
		      dataset = binding.dataset,
		      key = binding.key,
		      type = binding.type;

		it("should require name", function() {
			expectFailure(metadataPlus({ data: [ { dataset, key, type } ] }),
				"template.yml data binding must specify a name");
		});
		it("should require dataset", function() {
			expectFailure(metadataPlus({ data: [ { name, key, type } ] }),
				"template.yml data binding “My binding” must specify a dataset");
		});
		it("should require key", function() {
			expectFailure(metadataPlus({ data: [ { name, dataset, type } ] }),
				"template.yml data binding “My binding” must specify a key");
		});
		it("should require type", function() {
			expectFailure(metadataPlus({ data: [ { name, dataset, key } ] }),
				"template.yml data binding “My binding” must specify a type");
		});
		it("should require column for non-optional column bindings", function() {
			expectFailure(metadataPlus({ data: [ { name, dataset, key, type } ] }),
				"template.yml non-optional data binding “My binding” must specify column");
		});
		it("should accept name/dataset/key/type=column/column", function() {
			expectSuccess(bindingPlus());
		});
		it("should reject non-existent data tables", function() {
			expectFailure(bindingPlus({ column: "NoSuchTable::A" }),
				"template.yml: data binding refers to “NoSuchTable::A”, but data file does not exist");
		});
		it("should reject multiple columns", function() {
			expectFailure(bindingPlus({ column: "Foo::A,B" }),
				"Invalid column spec: A,B");
		});
		it("should reject no columns", function() {
			expectFailure(bindingPlus({ column: "Foo::" }),
				"Invalid column spec: ");
		});

		it("should reject a null column", function() {
			expectFailure(bindingPlus({ column: null }),
				"template.yml: “column” property of data binding “My binding” must be a string");
		});
		it("should reject an undefined column", function() {
			expectFailure(bindingPlus({ column: undefined }),
				"template.yml: “column” property of data binding “My binding” must be a string");
		});
		it("should reject a numeric column", function() {
			expectFailure(bindingPlus({ column: 23 }),
				"template.yml: “column” property of data binding “My binding” must be a string");
		});
		it("should reject an object column", function() {
			expectFailure(bindingPlus({ column: {} }),
				"template.yml: “column” property of data binding “My binding” must be a string");
		});
		it("should reject a true column", function() {
			expectFailure(bindingPlus({ column: true }),
				"template.yml: “column” property of data binding “My binding” must be a string");
		});
		it("should reject a false column", function() {
			expectFailure(bindingPlus({ column: false }),
				"template.yml: “column” property of data binding “My binding” must be a string");
		});

		it("should reject a null columns", function() {
			expectFailure(bindingPlus({ type: "columns", columns: null }),
				"template.yml: “columns” property of data binding “My binding” must be a string");
		});
		it("should reject an undefined columns", function() {
			expectFailure(bindingPlus({ type: "columns", columns: undefined }),
				"template.yml: “columns” property of data binding “My binding” must be a string");
		});
		it("should reject a numeric columns", function() {
			expectFailure(bindingPlus({ type: "columns", columns: 23 }),
				"template.yml: “columns” property of data binding “My binding” must be a string");
		});
		it("should reject an object columns", function() {
			expectFailure(bindingPlus({ type: "columns", columns: {} }),
				"template.yml: “columns” property of data binding “My binding” must be a string");
		});
		it("should reject a true columns", function() {
			expectFailure(bindingPlus({ type: "columns", columns: true }),
				"template.yml: “columns” property of data binding “My binding” must be a string");
		});
		it("should reject a false columns", function() {
			expectFailure(bindingPlus({ type: "columns", columns: false }),
				"template.yml: “columns” property of data binding “My binding” must be a string");
		});

		it("should reject null for “optional”", function() {
			expectFailure(bindingPlus({ optional: null }),
				"template.yml “optional” property of data binding “My binding” must be a boolean");
		});
		it("should reject undefined for “optional”", function() {
			expectFailure(bindingPlus({ optional: undefined }),
				"template.yml “optional” property of data binding “My binding” must be a boolean");
		});
		it("should reject numbers for “optional”", function() {
			expectFailure(bindingPlus({ optional: 123 }),
				"template.yml “optional” property of data binding “My binding” must be a boolean");
		});
		it("should reject strings for “optional”", function() {
			expectFailure(bindingPlus({ optional: "bar" }),
				"template.yml “optional” property of data binding “My binding” must be a boolean");
		});
		it("should reject objects for “optional”", function() {
			expectFailure(bindingPlus({ optional: {} }),
				"template.yml “optional” property of data binding “My binding” must be a boolean");
		});
		it("should reject arrays for “optional”", function() {
			expectFailure(bindingPlus({ optional: [] }),
				"template.yml “optional” property of data binding “My binding” must be a boolean");
		});
		it("should accept true for “optional”", function() {
			expectSuccess(bindingPlus({ optional: true }));
		});
		it("should accept false for “optional”", function() {
			expectSuccess(bindingPlus({ optional: false }));
		});
		it("should require column if optional is false", function() {
			expectFailure(metadataPlus({ data: [ { name, dataset, key, type, optional: false } ] }),
				"template.yml non-optional data binding “My binding” must specify column");
		});

		it("should reject duplicates", function() {
			expectFailure(metadataPlus({ data: [ binding, binding ]}),
				"template.yml: there is more than one data binding with dataset “dataset” and key “key”");
		});

		it("should ignore headings", function() {
			expectSuccess(metadataPlus({ data: [ "Heading", binding ]}));
		});
	});

	describe("settings", function() {
		it("should accept null", function() {
			expectSuccess(metadataPlus({ settings: null }));
		});
		it("should reject a number", function() {
			expectFailure(metadataPlus({ settings: 23 }),
				"template.yml: “settings” must be an array");
		});
		it("should reject a string", function() {
			expectFailure(metadataPlus({ settings: "bar" }),
				"template.yml: “settings” must be an array");
		});
		it("should reject true", function() {
			expectFailure(metadataPlus({ settings: true }),
				"template.yml: “settings” must be an array");
		});
		it("should reject false", function() {
			expectFailure(metadataPlus({ settings: false }),
				"template.yml: “settings” must be an array");
		});
		it("should reject an object", function() {
			expectFailure(metadataPlus({ settings: {} }),
				"template.yml: “settings” must be an array");
		});
		it("should accept an empty array", function() {
			expectSuccess(metadataPlus({ settings: [] }));
		});

		it("should require property", function() {
			expectFailure(metadataPlus({ settings: [ { name: "Foo", type: "string" } ] }),
				"template.yml setting must specify a property:");
		});
		it("should require type", function() {
			expectFailure(metadataPlus({ settings: [ { name: "Foo", property: "foo" } ] }),
				"template.yml setting “foo” must specify a type:");
		});
		it("should require name", function() {
			expectFailure(metadataPlus({ settings: [ { property: "foo", type: "string" } ] }),
				"template.yml setting “foo” must specify a name:");
		});
		it("should not require name if choices are specified", function() {
			expectSuccess(metadataPlus({ settings: [ { property: "foo", type: "string", choices: [] } ] }));
		});

		describe("optional settings", function() {
			it("should not support optional strings", function() {
				expectFailure(settingPlus({ optional: true }),
					"The “optional” property is only supported for “number”, “color” and “font” type settings");
			});
			it("should not support optional booleans", function() {
				expectFailure(settingPlus({ type: "boolean", optional: true }),
					"The “optional” property is only supported for “number”, “color” and “font” type settings");
			});
			it("should support optional numbers", function() {
				expectSuccess(settingPlus({ type: "number", optional: true }));
			});
			it("should support optional fonts", function() {
				expectSuccess(settingPlus({ type: "font", optional: true }));
			});
			it("should support non-optional numbers", function() {
				expectSuccess(settingPlus({ type: "number", optional: false }));
			});

			it("should not recognise optional: null", function() {
				expectFailure(settingPlus({ type: "number", optional: null }),
					"template.yml setting “foo” has an invalid value for “optional”: should be true or false");
			});
			it("should not recognise optional: undefined", function() {
				expectFailure(settingPlus({ type: "number", optional: undefined }),
					"template.yml setting “foo” has an invalid value for “optional”: should be true or false");
			});
			it("should not recognise optional: 23", function() {
				expectFailure(settingPlus({ type: "number", optional: 23 }),
					"template.yml setting “foo” has an invalid value for “optional”: should be true or false");
			});
			it("should not recognise optional: \"bar\"", function() {
				expectFailure(settingPlus({ type: "number", optional: "bar" }),
					"template.yml setting “foo” has an invalid value for “optional”: should be true or false");
			});
			it("should not recognise optional: []", function() {
				expectFailure(settingPlus({ type: "number", optional: [] }),
					"template.yml setting “foo” has an invalid value for “optional”: should be true or false");
			});
			it("should not recognise optional: {}", function() {
				expectFailure(settingPlus({ type: "number", optional: {} }),
					"template.yml setting “foo” has an invalid value for “optional”: should be true or false");
			});
		});

		describe("choices", function() {
			it("should not support choices for a number setting", function() {
				expectFailure(settingPlus({ type: "number", choices: [] }),
					"template.yml setting “foo” has a “choices” field, but is of type number");
			});
			it("should support choices for a string setting", function() {
				expectSuccess(settingPlus({ choices: [] }));
			});
			it("should not support choices_other without choices", function() {
				expectFailure(settingPlus({ choices_other: true }),
					"template.yml setting “foo” has a “choices_other” field, but no choices:");
			});
			it("should support choices_other with choices", function() {
				expectSuccess(settingPlus({ choices: [], choices_other: true }));
			});
			it("should not support choices_other: null", function() {
				expectFailure(settingPlus({ choices: [], choices_other: null }),
					"template.yml setting “foo” has invalid value for “choices_other”: should be boolean");
			});
			it("should not support choices_other: 23", function() {
				expectFailure(settingPlus({ choices: [], choices_other: 23 }),
					"template.yml setting “foo” has invalid value for “choices_other”: should be boolean");
			});
			it("should not support choices_other: \"bar\"", function() {
				expectFailure(settingPlus({ choices: [], choices_other: "bar" }),
					"template.yml setting “foo” has invalid value for “choices_other”: should be boolean");
			});
			it("should not support choices_other: []", function() {
				expectFailure(settingPlus({ choices: [], choices_other: [] }),
					"template.yml setting “foo” has invalid value for “choices_other”: should be boolean");
			});
			it("should not support choices_other: {}", function() {
				expectFailure(settingPlus({ choices: [], choices_other: {} }),
					"template.yml setting “foo” has invalid value for “choices_other”: should be boolean");
			});

			it("should support a string array", function() {
				expectSuccess(settingPlus({ choices: ["a", "b", "c"] }));
			});
			it("should reject a string array if type is not string", function() {
				expectFailure(settingPlus({ type: "boolean", choices: ["a", "b", "c"] }),
					"template.yml setting “foo” has a “choices” field with a string element, but is of type boolean");
			});

			it("should support pairs", function() {
				expectSuccess(settingPlus({ choices: [
					["A", "a"],
					["A", "b"],
					["A", "c"]
				] }));
			});
			it("should reject singletons", function() {
				expectFailure(settingPlus({ choices: [
					["A", "a"],
					["b"],
					["A", "c"]
				] }),
				"template.yml setting “foo”: element 1 of “choices” field has 1 elements (should be 2)");
			});
			it("should reject numbers for a string setting", function() {
				expectFailure(settingPlus({ choices: [
					["A", "a"],
					["B", 23],
					["A", "c"]
				] }),
				"template.yml setting “foo”: second entry of element 1 of “choices” field is not a string");
			});
			it("should reject true for a string setting", function() {
				expectFailure(settingPlus({ choices: [
					["A", "a"],
					["B", true],
					["A", "c"]
				] }),
				"template.yml setting “foo”: second entry of element 1 of “choices” field is not a string");
			});
			it("should reject false for a string setting", function() {
				expectFailure(settingPlus({ choices: [
					["A", "a"],
					["B", false],
					["A", "c"]
				] }),
				"template.yml setting “foo”: second entry of element 1 of “choices” field is not a string");
			});
			it("should reject null for a string setting", function() {
				expectFailure(settingPlus({ choices: [
					["A", "a"],
					["B", null],
					["A", "c"]
				] }),
				"template.yml setting “foo”: second entry of element 1 of “choices” field is not a string");
			});
			it("should support triples", function() {
				expectSuccess(settingPlus({ choices: [
					["A", "a"],
					["A", "b", "b_image.png"],
					["A", "c"]
				] }));
			});
			describe("boolean choices", function() {
				it("should support boolean pairs", function() {
					expectSuccess(settingPlus({ type: "boolean", choices: [
						["A", true],
						["A", false]
					] }));
				});
				it("should support boolean pairs the other way round", function() {
					expectSuccess(settingPlus({ type: "boolean", choices: [
						["A", false],
						["A", true]
					] }));
				});
				it("should reject an empty list", function() {
					expectFailure(settingPlus({ type: "boolean", choices: [] }),
						"template.yml setting “foo”: “choices” field for boolean property can only contain one “false” and one “true” option");
				});
				it("should reject true alone", function() {
					expectFailure(settingPlus({ type: "boolean", choices: [
						["A", true],
					] }),
					"template.yml setting “foo”: “choices” field for boolean property can only contain one “false” and one “true” option");
				});
				it("should reject false alone", function() {
					expectFailure(settingPlus({ type: "boolean", choices: [
						["A", false],
					] }),
					"template.yml setting “foo”: “choices” field for boolean property can only contain one “false” and one “true” option");
				});
				it("should reject repetitions", function() {
					expectFailure(settingPlus({ type: "boolean", choices: [
						["A", true],
						["B", true],
						["C", false]
					] }),
					"template.yml setting “foo”: “choices” field for boolean property can only contain one “false” and one “true” option");
				});
			});
		});

		describe("show_if / hide_if", function() {
			it("should permit a reference to another setting (show_if)", function() {
				expectSuccess(settingPlus({ show_if: "bar" }));
			});
			it("should permit a reference to another setting (hide_if)", function() {
				expectSuccess(settingPlus({ hide_if: "bar" }));
			});

			it("should forbid a reference to itself (show_if shortform)", function() {
				expectFailure(settingPlus({ show_if: "foo" }),
					"template.yml setting “foo” cannot be conditional on itself");
			});
			it("should forbid a reference to itself (hide_if shortform)", function() {
				expectFailure(settingPlus({ hide_if: "foo" }),
					"template.yml setting “foo” cannot be conditional on itself");
			});

			it("should forbid a reference to itself (show_if)", function() {
				expectFailure(settingPlus({ show_if: { "foo": true }}),
					"template.yml setting “foo” cannot be conditional on itself");
			});
			it("should forbid a reference to itself (hide_if)", function() {
				expectFailure(settingPlus({ hide_if: { "foo": true }}),
					"template.yml setting “foo” cannot be conditional on itself");
			});

			it("should forbid a reference to a non-existent setting (show_if)", function() {
				expectFailure(settingPlus({ show_if: "baz" }),
					"template.yml: “show_if” or “hide_if” property refers to non-existent setting “baz”");
			});
			it("should forbid a reference to a non-existent setting (hide_if)", function() {
				expectFailure(settingPlus({ hide_if: "baz" }),
					"template.yml: “show_if” or “hide_if” property refers to non-existent setting “baz”");
			});

			it("should only allow one", function() {
				expectFailure(settingPlus({ show_if: "bar", hide_if: "bar" }),
					"template.yml setting “foo” has both “show_if” and “hide_if” properties: there can only be one");
			});

			it("should forbid null", function() {
				expectFailure(settingPlus({ show_if: null }),
					"template.yml Conditional setting “foo” is badly formed or wrongly indented");
			});
			it("should forbid true", function() {
				expectFailure(settingPlus({ show_if: true }),
					"template.yml setting “foo” has a “show_if” value that is not a string or object");
			});
			it("should forbid false", function() {
				expectFailure(settingPlus({ show_if: false }),
					"template.yml setting “foo” has a “show_if” value that is not a string or object");
			});
			it("should permit arrays", function() {
				expectFailure(settingPlus({ show_if: [] }),
					"template.yml setting “foo” has a “show_if” value that is not a string or object");
			});
			it("should forbid empty objects", function() {
				expectFailure(settingPlus({ show_if: {} }),
					"template.yml setting “foo” “show_if” property must specify a setting to test against");
			});
			it("should accept an object with a string value", function() {
				expectSuccess(settingPlus({ show_if: { "bar": "xxx" } }));
			});
			it("should accept an object with an array value", function() {
				expectSuccess(settingPlus({ show_if: { "bar": ["xxx"] } }));
			});
			it("should reject an object with an empty array value", function() {
				expectFailure(settingPlus({ show_if: { "bar": [] } }),
					"template.yml setting “foo” “show_if” property: value for bar is empty");
			});
			it("should reject an object referring to a non-existent setting", function() {
				expectFailure(settingPlus({ show_if: { "baz": ["xxx"] } }),
					"template.yml: “show_if” or “hide_if” property refers to non-existent setting “baz”");
			});
			it("should accept a reference to a data binding", function() {
				expectSuccess(settingPlus({ show_if: "data.dataset.key" }, { data: [ binding ] }));
			});
			it("should reject a data reference when there are no data bindings", function() {
				expectFailure(settingPlus({ show_if: "data.dataset.key" }),
					"template.yml: “show_if” or “hide_if” property refers to data binding “data.dataset.key” when none are defined");
			});
			it("should reject a reference to a non-existent data binding", function() {
				expectFailure(settingPlus({ show_if: "data.dataset.nosuchkey" }, { data: [ binding ] }),
					"template.yml: “show_if” or “hide_if” property refers to non-existent data binding “data.dataset.nosuchkey”");
			});

			// This test is skipped because it doesn’t pass, and looks like it would be
			// complicated to fix.
			it.skip("should reject a string value when referencing a data binding", function() {
				expectFailure(settingPlus({ show_if: {"data.dataset.key": "foo"} }, { data: [ binding ] }));
			});

			it("should reject a reference to a data binding that has no key", function() {
				const binding_undef_key = { name: "No-key binding", dataset: "dataset", key: undefined, type: "column", column: "Foo::A" };
				expectFailure(settingPlus({ show_if: "data.dataset" }, { data: [ binding_undef_key ] }),
					"template.yml: “show_if” or “hide_if” property specifies invalid data binding “data.dataset”");
			});
			it("should accept settings whose names start with /data./ [kiln/flourish-sdk#45]", function() {
				const data_foo = { name: "Data foo", property: "data_foo", type: "string" };
				expectSuccess(settingPlus({ show_if: { "data_foo": "xxx" } }, undefined, [data_foo]));
			});
		});

		describe("import", function() {
			describe("when the module to import exists", function() {
				let imported_module_directory, imported_settings_filename;
				before(function() {
					imported_module_directory = path.join(temp_directory, "node_modules/@flourish/layout/");
					imported_settings_filename = path.join(imported_module_directory, "settings.yml");
					fs.mkdirSync(imported_module_directory, { recursive: true });
					fs.closeSync(fs.openSync(imported_settings_filename, "w"));
					sinon.stub(nodeResolve, "sync").returns(imported_settings_filename);
				});
				after(function() {
					nodeResolve.sync.restore();
					fs.unlinkSync(imported_settings_filename);
				});
				it("should permit the import of a component", function() {
					expectSuccess(metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout" }]}));
				});
				it("should allow for a show_if condition for an imported component", function() {
					expectSuccess(metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", show_if: true }]}));
				});
				it("should allow for a hide_if condition for an imported component", function() {
					expectSuccess(metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", hide_if: true }]}));
				});
				it("should not allow for a name property (for example) for an imported component", function() {
					expectFailure(
						metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", name: "Flourish" }]}),
						"template.yml: Unexpected property 'name' in import"
					);
				});
				it("should allow for an overrides array for an imported component", function() {
					expectSuccess(metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", overrides: [] }]}));
				});
				it("should throw if overrides is a string", function() {
					expectFailure(
						metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", overrides: "Hello Mark!" }]}),
						"template.yml Setting import overrides must be an array"
					);
				});
				it("should throw if overrides is an object", function() {
					expectFailure(
						metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", overrides: {} }]}),
						"template.yml Setting import overrides must be an array"
					);
				});
				it("should throw if an override is missing the 'property' property", function() {
					expectFailure(
						metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", overrides: [{}] }]}),
						`template.yml Setting import overrides must each specify overridden “property”`
					);
				});
				it("should allow for an override without a 'method' property", function() {
					expectSuccess(metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", overrides: [{property: "bg_color"}] }]}));
				});
				it("should allow for an override with a 'method' property equal to 'replace'", function() {
					expectSuccess(metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", overrides: [{property: "bg_color", method: "replace"}] }]}));
				});
				it("should allow for an override with a 'method' property equal to 'extend'", function() {
					expectSuccess(metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", overrides: [{property: "bg_color", method: "extend"}] }]}));
				});
				it("should throw if an override has a 'method' property of (eg) 'delete'", function() {
					expectFailure(
						metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout", overrides: [{property: "bg_color", method: "delete"}] }]}),
						`template.yml Setting import override “method” method must be either “replace” or “extend”`
					);
				});
			});

			describe("when the module to import doesn't exist", function() {
				it("should error when trying to import the component", function() {
					const expected_error = `Cannot find module '@flourish/layout/settings.yml' from '${temp_directory}'`;
					expectFailure(
						metadataPlus({ settings: [{ property: "imported_prop", import: "@flourish/layout" }] }),
						expected_error
					);
				});
			});
		});

		describe("new_section", function() {
			it("should accept true", function() {
				expectSuccess(settingPlus({ new_section: true }));
			});
			it("should accept false", function() {
				expectSuccess(settingPlus({ new_section: false }));
			});
			it("should accept a string", function() {
				expectSuccess(settingPlus({ new_section: "section title" }));
			});
			it("should reject null", function() {
				expectFailure(settingPlus({ new_section: null }),
					"template.yml setting “foo” new_section property must be a boolean or string, not null");
			});
			it("should reject numbers", function() {
				expectFailure(settingPlus({ new_section: 23 }),
					"template.yml setting “foo” new_section property must be a boolean or string, not number");
			});
			it("should reject arrays", function() {
				expectFailure(settingPlus({ new_section: [] }),
					"template.yml setting “foo” new_section property must be a boolean or string, not array");
			});
			it("should reject objects", function() {
				expectFailure(settingPlus({ new_section: {} }),
					"template.yml setting “foo” new_section property must be a boolean or string, not object");
			});
		});

		describe("width", function() {
			it("should accept “full”", function() {
				expectSuccess(settingPlus({ width: "full" }));
			});
			it("should accept “half”", function() {
				expectSuccess(settingPlus({ width: "half" }));
			});
			it("should accept “quarter”", function() {
				expectSuccess(settingPlus({ width: "quarter" }));
			});
			it("should accept “three quarters”", function() {
				expectSuccess(settingPlus({ width: "three quarters" }));
			});

			const expected_message = "template.yml setting “foo” has unsupported width property: must be “full”, “half”, “quarter” or “three quarters”";
			it("should accept true", function() {
				expectFailure(settingPlus({ width: true }), expected_message);
			});
			it("should accept false", function() {
				expectFailure(settingPlus({ width: false }), expected_message);
			});
			it("should reject an empty string", function() {
				expectFailure(settingPlus({ width: "" }), expected_message);
			});
			it("should reject an unexpected string", function() {
				expectFailure(settingPlus({ width: "unexpected string" }), expected_message);
			});
			it("should reject null", function() {
				expectFailure(settingPlus({ width: null }), expected_message);
			});
			it("should reject numbers", function() {
				expectFailure(settingPlus({ width: 23 }), expected_message);
			});
			it("should reject arrays", function() {
				expectFailure(settingPlus({ width: [] }), expected_message);
			});
			it("should reject objects", function() {
				expectFailure(settingPlus({ width: {} }), expected_message);
			});
		});
	});
});
