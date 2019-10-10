const assert = require("assert"),
      fs = require("fs"),
      path = require("path"),
      tempy = require("tempy");

const { readConfig } = require("../../lib/sdk.js");


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
