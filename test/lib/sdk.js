const assert = require("assert"),
      fs = require("fs"),
      path = require("path"),
      tempy = require("tempy");

const { readConfig, readAndValidateConfig } = require("../../lib/sdk.js");


describe("readConfig", () => {
	before(function() {
		this.temporary_directories_created = [];
		this.tryReadConfig = function(template_yaml_string, package_json_string) {
			const d = tempy.directory();
			this.temporary_directories_created.push(d);
			fs.writeFileSync(path.join(d, "template.yml"), template_yaml_string);
			fs.writeFileSync(path.join(d, "package.json"), package_json_string);
			return readConfig(d);
		};
	});

	after(function() {
		this.temporary_directories_created.forEach(function (d) {
			fs.unlinkSync(path.join(d, "template.yml"));
			fs.unlinkSync(path.join(d, "package.json"));
			fs.rmdirSync(d);
		});
	});

	describe("fallbacks from package.json", function() {
		["author", "description", "version"].forEach(function (param_to_check) {
			it(`should use the template.yml value for “${param_to_check}” if it's present in both`, async function() {
				const config = await this.tryReadConfig(
					`${param_to_check}: "sample value"`,
					`{"${param_to_check}": "value that should be ignored"}`
				);
				assert.equal(config[param_to_check], "sample value");
			});
			it(`should use the package.json value for “${param_to_check}” if it's not in template.yml`, async function() {
				const config = await this.tryReadConfig(
					`{}`,
					`{"${param_to_check}": "value that should be used"}`
				);
				assert.equal(config[param_to_check], "value that should be used");
			});
		});

		// The "id" value is a bit different: it falls back to "name" in package.json, not "id"
		it(`should use the template.yml value for “id” even if “name” is present in package.json`, async function() {
			const config = await this.tryReadConfig(
				`id: "sample value"`,
				`{"name": "value that should be ignored"}`
			);
			assert.equal(config.id, "sample value");
		});
		it(`should use the package.json value for “name” if “id" is not in template.yml`, async function() {
			const config = await this.tryReadConfig(
				`{}`,
				`{"name": "value that should be used"}`
			);
			assert.equal(config.id, "value that should be used");
		});
	});
});

describe("readAndValidateConfig", () => {
	before(function() {
		this.temporary_directories_created = [];
		this.tryReadConfig = function(template_yaml_string, package_json_string) {
			const d = tempy.directory();
			this.temporary_directories_created.push(d);
			fs.writeFileSync(path.join(d, "template.yml"), template_yaml_string);
			fs.writeFileSync(path.join(d, "package.json"), package_json_string);
			return readAndValidateConfig(d);
		};
	});

	after(function() {
		this.temporary_directories_created.forEach(function (d) {
			fs.unlinkSync(path.join(d, "template.yml"));
			fs.unlinkSync(path.join(d, "package.json"));
			fs.rmdirSync(d);
		});
	});

	it(`should reject a config with no id`, async function() {
		await assert.rejects(this.tryReadConfig(
			`name: the name\nauthor: Mr Brock\nsdk_version: 3`,
			`{}`
		));
	});

	it(`should reject a config with no name`, async function() {
		await assert.rejects(this.tryReadConfig(
			`id: "sample value"\nauthor: Mr Brock\nsdk_version: 3`,
			`{}`
		));
	});

	it(`should reject a config with no author`, async function() {
		await assert.rejects(this.tryReadConfig(
			`id: "sample value"\nname: the name\nsdk_version: 3`,
			`{}`
		));
	});

	it(`should reject a config with no sdk_version`, async function() {
		await assert.rejects(this.tryReadConfig(
			`id: "sample value"\nname: the name\nauthor: Mr Brock`,
			`{}`
		));
	});

	it(`should accept a config with the wrong sdk_version`, async function() {
		await this.tryReadConfig(
			`id: "sample value"\nname: the name\nauthor: Mr Brock\nsdk_version: 1`,
			`{}`
		);
	});

	it(`should accept a config with author specified in package.json`, async function() {
		await this.tryReadConfig(
			`id: "sample value"\nname: the name\nsdk_version: 3`,
			`{"author": "Mr Brock"}`
		);
	});

	it(`should accept a config with author and id specified in package.json`, async function() {
		await this.tryReadConfig(
			`name: the name\nsdk_version: 3`,
			`{"author": "Mr Brock", "name": "sample value"}`
		);
	});

	it(`should accept a config with no settings or data`, async function() {
		await this.tryReadConfig(
			`id: "sample value"\nname: the name\nauthor: Mr Brock\nsdk_version: 3`,
			`{}`
		);
	});
});
