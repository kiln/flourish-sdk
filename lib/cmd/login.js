"use strict";

var fs = require("fs"),
    path = require("path"),
    readline = require("readline"),

    getpass = require("getpass"),

    log = require("../log"),
    sdk = require("../sdk");

module.exports = function(args, server_opts) {
	function getEmail() {
		return new Promise(function(resolve, reject) {
			// If an email address was given on the command-line, use that
			if (args._[1]) return resolve(args._[1]);

			// Otherwise prompt for email address
			const input = readline.createInterface({ input: process.stdin, output: process.stdout });
			input.setPrompt("Email: ");
			input.prompt();
			input.on("line", function (email) {
				input.close();
				resolve(email);
			});
			input.on("error", reject);
		});
	}

	function getPassword() {
		return new Promise(function(resolve, reject) {
			getpass.getPass({}, function(error, password) {
				if (error) return reject(error);
				resolve(password);
			});
		});
	}

	function login(email, password) {
		return sdk.request(server_opts, "user/login", { email: email, password: password })
			.then((response) => {
				if (!("api_token" in response)) {
					log.die("Unexpected response from server", response);
				}

				var api_token = response.api_token;
				sdk.setApiToken(server_opts, api_token)
					.then(() => log.victory("Logged in as " + email))
					.catch((error) => log.die("Failed to save API token", error.message));
			});
	}

	getEmail()
		.then((email) => Promise.all([email, getPassword()]))
		.then(([email, password]) => login(email, password))
		.catch((error) => log.die("Unexpected error", error.message, error.stack));
};
