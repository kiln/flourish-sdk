#!/usr/bin/env node

"use strict";

const minimist = require("minimist"),

      log = require("../lib/log");

const OPTS = {
	boolean: [
		"help", "build", "open", "debug", "full", "force",

		// Options for 'publish'
		"prerelease", "patch", "release", "local-testing"
	],
	string: [
		"host", "listen", "port", "user", "password",

		"env",

		// Only relevant for admin users
		"as",
	],

	default: {
		/* Options for 'register', 'login', 'publish': */
		host: "app.flourish.studio",
		// --user and --password can also be used for basic auth credentials

		/* Options for 'run' */
		port: "1685",
		build: true,
		open: false,

		env: "development"
	},

	alias: {
		open: "o",
		help: "h",
		version: "v",
	},

	unknown: function(unknown_option) {
		if (unknown_option.startsWith("-")) {
			log.die("Unknown option: " + unknown_option);
		}
	}
};

// Unhandled rejections indicate an error in the app
// and should be promoted to exceptions.
process.on("unhandledRejection", function(reason, p) {
	console.error("unhandled rejection", reason, p);
	throw reason;
});

const COMMANDS = [
	"help",
	"version",
	"new",
	"build",
	"run",
	"register",
	"login",
	"logout",
	"whoami",
	"assign-version-number",
	"publish",
	"delete",
	"upgrade",
	"list",
	"history"
];

function main() {
	const args = minimist(process.argv.slice(2), OPTS);

	if (args._[0] === "is" && args._[1] === "the") {
		return log.victory("Word!");
	}

	// minimist unhelpfully treats numeric strings as numbers;
	// which means we have to turn them back into strings.
	args._ = args._.map(String);

	let [command] = args._;
	if (args.version) command = "version";
	else if (args.help) command = "help";

	if (!command) {
		return log.die("No command specified. Type ‘flourish help’ for help.");
	}

	if (!COMMANDS.includes(command)) {
		return log.die(`Unknown command '${command}'. Type 'flourish help' for help.`);
	}

	require("../lib/cmd/" + command).command(args);
}

main();
