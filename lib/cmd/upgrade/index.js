"use strict";

const log = require("../../log");

const upgrades = [
	require("./1-convert-config-to-yaml"),
	require("./2-convert-index-html"),
	require("./3-add-build-config"),
	require("./4-remove-autoheight-config"),
];

function runUpgrade(upgrade, template_dir) {
	log.info("Running: " + upgrade.title);

	return upgrade(template_dir)
		.then((upgraded) => {
			if (upgraded) log.success("Upgrade successful");
			else log.info("Upgrade not needed");

			return upgraded;
		});
}

let upgrade_index = 0;
function runUpgrades(template_dir, num_run=0) {
	const upgrade = upgrades[upgrade_index];
	if (!upgrade) return Promise.resolve(num_run);

	return runUpgrade(upgrade, template_dir)
		.then((upgraded) => {
			upgrade_index += 1;
			if (upgraded) num_run += 1;
		})
		.then(() => runUpgrades(template_dir, num_run));
}

function upgrade(args) {
	const template_dir = args._[1] || ".";
	runUpgrades(template_dir)
		.then((num_upgrades) => {
			log.victory("Upgrades completed!");
			if (num_upgrades > 0) {
				log.warn_bold(`We ran ${num_upgrades} upgrade${num_upgrades == 1 ? "" : "s"} on your template`, "Please check it carefully!");
			}
		})
		.catch((error) => {
			if (args.debug) log.problem("Upgrade failed", error.message, error.stack);
			else log.problem("Upgrade failed", error.message);
		});
}

upgrade.help = `
flourish upgrade [template_directory]

Upgrade the template in template_directory, or in the current directory if no
template_directory is specified, to be compatible with the current version of
Flourish.

This is only needed when incompatible changes have been made to Flourish.
`;

module.exports = upgrade;
