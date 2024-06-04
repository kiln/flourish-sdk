"use strict";

var { read } = require("read");
var readline = require("readline"),
    log = require("../log"),
    sdk = require("../sdk");

exports.command = function login(args) {
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
		return read({ prompt: "Password: ", silent: true })
			.then((response) => {
				console.log();
				return response;
			});
	}

	function getToken() {
		if (args.token) {
			return Promise.resolve(args.token);
		}
		return read({ prompt: "SDK Token: ", silent: true })
			.then((response) => {
				console.log();
				return response;
			});
	}

	function login(email, password) {
		return sdk.request(args, "user/login", { email: email, password: password })
			.then((response) => {
				const sdk_token = response.sdk_token || response.api_token;
				if (!sdk_token) {
					log.die("Unexpected response from server", JSON.stringify(response));
				}

				sdk.setSdkToken(args, sdk_token)
					.then(() => log.victory("Logged in as " + email))
					.catch((error) => log.die("Failed to save SDK token", error.message));
			});
	}
	async function loginWithToken(sdk_token) {
		try {
			await sdk.setSdkToken(args, sdk_token);
			const user_info = await sdk.request(args, "user/whoami", {});
			return user_info;
		}
		catch (e) {
			log.die("Failed to save SDK token", e.message);
		}
	}
	if ("token" in args) {
		getToken().then((token) => {
			loginWithToken(token).then(user_info => {
				log.victory("Logged in as " + user_info.email);
			}).catch(error => log.die("Failed to save SDK token", error.message));
		});
		return;
	}

	getEmail()
		.then((email) => Promise.all([email, getPassword()]))
		.then(([email, password]) => login(email, password))
		.catch((error) => log.die("Unexpected error", error.message, error.stack));
};

exports.help = `
Usage: 
	flourish login [email]
	flourish login --token [token]

Log in to Flourish. You will be prompted for a password.

If you do not have a Flourish account, you can register using “flourish register”.

When you have logged in successfully, your access token will be recorded
in the file .flourish_sdk in your HOME or USERPROFILE directory. Subsequent
flourish commands will use this token to authenticate with the server.
`;
