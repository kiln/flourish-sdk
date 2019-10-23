"use strict";

var readline = require("readline"),

    read = require("read"),

    log = require("../log"),
    sdk = require("../sdk");

function register(args, server_opts) {
	const questions = [
		{ text: "Username: ", prop: "username" },
		{ text: "Name: ", prop: "display_name" },
		{ text: "Email: ", prop: "email" },
		{ text: "Organisation: ", prop: "organisation" },
	];

	function getPassword() {
		return new Promise(function(resolve, reject) {
			read({ prompt: "Password: ", silent: true }, function(error, pw_i) {
				if (error) return reject(error);

				read({ prompt: "Confirm password: ", silent: true }, function(error, pw_ii) {
					if (error) return reject(error);
					if (pw_i === pw_ii) return resolve(pw_i);

					log.warn("Passwords not the same! Try again.");
					read({ prompt: "Confirm password: ", silent: true }, function(error, pw_iii) {
						if (error) return reject(error);

						if (pw_i === pw_iii) return resolve(pw_i);
						reject(new Error("Passwords still don’t match. Exiting."));
					});
				});
			});
		});
	}

	function askQuestions() {
		return new Promise(function(resolve, reject) {
			let counter = 0,
			    answers = {};

			const input = readline.createInterface({ input: process.stdin, output: process.stdout });
			input.on("close", () => resolve(answers));
			input.setPrompt(questions[0].text);
			input.prompt();
			input.on("line", function (answer) {
				answers[questions[counter].prop] = answer;
				counter++;
				if (counter < questions.length) {
					input.setPrompt(questions[counter].text);
					input.prompt();
				}
				else {
					input.close();
				}
			});
			input.on("error", reject);
		});
	}

	function askAboutTerms() {
		return new Promise(function(resolve, reject) {
			let agreed = false;

			const input = readline.createInterface({ input: process.stdin, output: process.stdout });
			input.on("close", () => resolve(agreed));

			process.stdout.write("\nDo you agree to the Terms and Conditions at https://flourish.studio/terms?\nAnswer yes or no.\n");
			input.setPrompt("> ");
			input.prompt();
			input.on("line", function (answer) {
				if (answer === "yes") {
					agreed = true;
					input.close();
				}
				else if (answer === "no") {
					agreed = false;
					input.close();
				}
				else {
					process.stdout.write("You must answer yes or no\n");
					input.prompt();
				}
			});
			input.on("error", reject);
		});
	}

	function agreeTerms() {
		return askAboutTerms()
			.then((agreed) => {
				if (!agreed) return Promise.reject(new Error("You must agree to the Terms and Conditions"));
			});
	}

	function register(answers) {
		return sdk.request(server_opts, "user/register", answers)
			.then((response) => {
				const sdk_token = response.sdk_token || response.api_token;
				if (!sdk_token) {
					log.die("Unexpected response from server", JSON.stringify(response));
				}
				return sdk_token;
			});
	}

	askQuestions()
		.then((answers) => Promise.all([answers, getPassword()]))
		.then(([answers, password]) => Promise.all([answers, password, agreeTerms()]))
		.then(([answers, password, _]) => register(Object.assign(answers, { password })))
		.then((sdk_token) => sdk.setSdkToken(server_opts, sdk_token))

		.then(() => log.victory("Account registered successfully!"))
		.catch((error) => log.die(error.message));
}

register.help = `
flourish register

Prompt for information and register an account with Flourish.
You will automatically be logged in to your new account.

This account can be used on https://flourish.studio/ as well
as in the SDK.
`;

module.exports = register;
