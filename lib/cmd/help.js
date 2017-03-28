"use strict";

var path = require("path"),

    log = require("../log");

function help(args, server_opts) {
	const topic = args._[args._[0] === "help" ? 1 : 0] || "help";

	if (topic.indexOf(path.sep) == -1
		&& !topic.startsWith("."))
	{
		try {
			const command = require("./" + topic);
			console.log(command.help);
		}
		catch(e) {
			log.die("No such help topic: " + topic);
		}
	}
};

help.help = `
Commands:
	flourish build [build rules...]
	flourish delete [template_directory]
	flourish help [topic]
	flourish list
	flourish login [email_address]
	flourish logout
	flourish new directory_name
	flourish publish [template_directory]
	flourish register
	flourish run [options] [template_directory]
	flourish upgrade [template_directory]
	flourish whoami

Type “flourish help [command]” for more on a particular command.
`;

module.exports = help;
