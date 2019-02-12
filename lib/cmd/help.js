"use strict";

var path = require("path"),

    log = require("../log");

function help(args) {
	const topic = args._[args._[0] === "help" ? 1 : 0] || "help";

	if (topic.indexOf(path.sep) == -1
		&& !topic.startsWith("."))
	{
		try {
			const command = require("./" + topic);
			console.log(command.help);
		}
		catch (e) {
			log.die("No such help topic: " + topic);
		}
	}
}

help.help = `
Commands:
	flourish assign-version-number [template id] version
	flourish build [build rules...]
	flourish delete [--force] template_id
	flourish [-h|--help|help] [topic]
	flourish history [--full] template_id
	flourish list [--full] [template id]
	flourish login [email_address]
	flourish logout
	flourish new directory_name
	flourish publish [template_directory]
	flourish register
	flourish run [-o|--open] [--no-build] [--port=1685] [template_directory]
	flourish upgrade [template_directory]
	flourish [-v|--version|version]
	flourish whoami [--full]

Type “flourish help [command]” for more on a particular command.

To get started, use “flourish new” to create a new template and
“flourish run” to run it.
`;

module.exports = help;
