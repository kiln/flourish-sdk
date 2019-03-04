"use strict";

var readline = require("readline"),

    read = require("read"),

    log = require("../log"),
    sdk = require("../sdk");

function login(args, server_opts) {
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
			read({ prompt: "Password: ", silent: true }, function(error, password) {
				if (error) return reject(error);
				resolve(password);
			});
		});
	}

	function login(email, password) {
		return sdk.request(server_opts, "user/login", { email: email, password: password })
			.then((response) => {
				const sdk_token = response.sdk_token || response.api_token;
				if (!sdk_token) {
					log.die("Unexpected response from server", JSON.stringify(response));
				}

				sdk.setSdkToken(server_opts, sdk_token)
					.then(() => log.victory("Logged in as " + email))
					.catch((error) => log.die("Failed to save SDK token", error.message));
			});
	}

	getEmail()
		.then((email) => Promise.all([email, getPassword()]))
		.then(([email, password]) => login(email, password))
		.catch((error) => log.die("Unexpected error", error.message, error.stack));
}

login.help = `
flourish login [email_address]

Log in to Flourish. You will be prompted for a password.

If you do not have a Flourish account, you can register using “flourish register”.

When you have logged in successfully, your access token will be recorded
in the file .flourish_sdk in your HOME or USERPROFILE directory. Subsequent
flourish commands will use this token to authenticate with the server.
`;

module.exports = login;
