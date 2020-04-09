"use strict";

var fs = require("fs"),
    path = require("path"),

    log = require("../log"),
    sdk = require("../sdk"),

    server = require("../../server");

function run(args) {
	const template_dir = args._[1] || ".";
	const port = +args.port;

	function runServer() {
		server(template_dir, {
			port: port,
			listen: args.listen,
			open: args.open,
			debug: args.debug
		});
	}

	fs.stat(template_dir, function(error, stat) {
		if (error) log.die(`Could not access ${template_dir}: ${error.message}`);
		if (!stat.isDirectory()) log.die(`Not a directory: ${template_dir}`);

		if (!fs.existsSync(path.join(template_dir, "template.yml"))) {
			if (fs.existsSync(path.join(template_dir, "settings.js"))) {
				log.die("No template.yml file found in template directory",
					"Was this template was created for an earlier version of Flourish?",
					"If so, you can run ‘flourish upgrade’ to upgrade it");
			}
			else if (template_dir === ".") {
				log.die("The current directory doesn’t look like a Flourish template: no template.yml file found");
			}
			else {
				log.die(`The directory ${template_dir} doesn’t look like a Flourish template: no template.yml file found`);
			}
		}

		if (!args.build) {
			sdk.checkTemplateVersion(template_dir)
				.then(() => runServer())
				.catch((error) => {
					log.die(error.message);
				});
		}
		else {
			sdk.buildTemplate(template_dir, "development", "run")
				.catch((error) => {
					log.die("Failed to build template", error.message);
				})
				.then(() => {
					log.success("Build script finished", "Running server");
					runServer();
				})
				.catch((error) => {
					log.die(error.message, error.stack);
				});
		}
	});
}

run.help = `
flourish run [-o|--open] [--no-build] [--port=1685] [directory_name]

Builds the template and runs the SDK server. If directory_name is omitted it
uses the current directory.

While it’s running it watches the template directory for changes:
- if you edit any static template files (index.html, template.yml,
	data/*, static/*) the SDK will refresh the page in the browser;
- if you edit a file that is the source for a build rule defined
	in template.yml,the SDK will run that build rule and then refresh
	the page.

Options:
--open or -o
	Try to open the SDK in your web browser once the server is running.
	At present this only works on macOS.
--port=1685
	Listen on a particular port; defaults to 1685.
--listen=localhost
	Listen on a particular interface; defaults to localhost. Use 0.0.0.0 to
	listen on all IPv4 interfaces or ::0 to listen on all IPv6 interfaces.
--no-build
	Skip the build process
`;

module.exports = run;
