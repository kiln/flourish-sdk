"use strict";

var fs = require("fs"),
    path = require("path"),

    archiver = require("archiver"),
    tmp = require("tmp"),

    log = require("../log"),
    sdk = require("../sdk");

function zipUpTemplate(template_dir, config) {
	return new Promise(function(resolve, reject) {
		// Archiver closes the file descriptor when it has finished
		// writing to the file, so we need to tell tmp not to close
		// it on exit: the fd will have been reused by then, so it
		// will close the wrong fd and cause chaos. Hence the
		// detachDescriptor: true option. (See kiln/flourish-sdk#40.)
		tmp.file({ detachDescriptor: true }, function(error, zip_filename, zip_fd) {
			if (error) return reject(error);

			let zip = archiver.create("zip", {});
			zip.on("error", function(error) {
				log.die(error);
			});

			let output = fs.createWriteStream(null, { fd: zip_fd });
			output.on("close", function() {
				resolve(zip_filename);
			});

			zip.pipe(output);

			zip.append(JSON.stringify({
				name: config.name,
				version: config.version,
				description: config.description,
				author: config.author,
				image_download: config.image_download,
				svg_download: config.svg_download,
				credits: config.credits,
				is_master_slide: config.is_master_slide,
				sdk_version: config.sdk_version,
				categories: config.categories,
				joinable_data: config.joinable_data,
				tour: JSON.stringify(config.tour),
			}), { name: "metadata.json" });
			if (config.settings) zip.append(JSON.stringify(config.settings), { name: "settings.js" });
			if (config.data) zip.append(JSON.stringify(config.data), { name: "data.json" });

			if (fs.existsSync(path.join(template_dir, "GUIDE.md"))) {
				let file_path = path.join(template_dir, "GUIDE.md");
				zip.file(file_path, { name: "README.md" });
			}
			else if (fs.existsSync(path.join(template_dir, "README.md"))) {
				let file_path = path.join(template_dir, "README.md");
				zip.file(file_path, { name: "README.md" });
			}

			for (let filename of sdk.TEMPLATE_SPECIAL_FILES) {
				if (filename == "template.yml") continue;
				if (filename == "README.md") continue;
				let file_path = path.join(template_dir, filename);
				if (fs.existsSync(file_path)) {
					zip.file(file_path, { name: filename });
				}
			}
			for (let dirname of sdk.TEMPLATE_SPECIAL_DIRECTORIES) {
				let dir_path = path.join(template_dir, dirname);
				if (fs.existsSync(dir_path)) {
					zip.directory(dir_path, dirname);
				}
			}
			zip.finalize();
		});
	});
}

function uploadTemplate(server_opts, template_id, external_version, zip_filename) {
	return sdk.request(server_opts, "template/publish", {
		id: template_id,
		version: external_version,
		template: {
			value: fs.createReadStream(zip_filename),
			options: {
				filename: "template.zip",
				contentType: "application/zip",
			}
		}
	});
}

function publish(args, server_opts) {
	const template_dir = args._[1] || ".";

	(args.build ? sdk.buildTemplate(template_dir, "production", "publish") : Promise.resolve())
		.then(() => {
			if (args.patch) return sdk.incrementPatchVersion(template_dir);
			if (args.prerelease) return sdk.incrementPrereleaseTag(template_dir);
			if (args.release) return sdk.removePrereleaseTag(template_dir);
		})
		.then(() => sdk.readAndValidateConfig(template_dir))
		.then((config) => {
			if (!config.id) log.die("The template’s template.yml doesn’t have an id. Add one and try again.");

			if (config.id.indexOf("/") > -1) {
				return Promise.reject(new Error("Flourish no longer supports hard-coding a username in the id"));
			}
			const template_id = args.as ? args.as + "/" + config.id : config.id;
			let external_version = config.version;
			if (args["local-testing"]) {
				external_version = "99.9.9-local.testing";
			}

			if (!external_version) {
				return Promise.reject(new Error("Please add a version number to template.yml, e.g: version: 1.0.0"));
			}

			log.success("Preparing template with id " + template_id + " for upload.");

			return zipUpTemplate(template_dir, config)
				.then((zip_filename) => uploadTemplate(server_opts, template_id, external_version, zip_filename))
				.then(() => sdk.request(server_opts, "user/whoami", {}))
				.then((user_info) => {
					let protocol = "https";
					if (server_opts.host.match(/^(localhost|127\.0\.0\.1|.*\.local)(:\d+)?$/)) {
						protocol = "http";
					}

					let template_path;
					if (template_id.indexOf("/") > -1) {
						template_path = template_id;
					}
					else {
						template_path = user_info.username + "/" + template_id;
					}
					if (!external_version) {
						log.victory("Upload successful!",
							`Your template is available at ${protocol}://${server_opts.host}/@${template_path}`);
					}
					else {
						const dt = new Date();
						log.victory(`Uploaded version ${external_version} on ${dt.toDateString()} at ${dt.toTimeString()}`,
							`Your template is available at ${protocol}://${server_opts.host}/@${template_path}/${external_version}`);
					}
				});
		})
		.catch((error) => {
			if (args.debug) log.die("Failed to upload template", error.message, error.stack);
			else log.die("Failed to upload template", error.message);
		});
}

publish.help = `
flourish publish [--patch] [--prerelease] [--release] [directory_name]

Build and publish the template in the named directory, or in the current
directory if no directory is specified.

Before you publish a template, check that it has an “id” defined in template.yml
that you have not previously used. If you reuse an id from another template then
that template will be overwritten with this one.

You must be logged in to use this command. See “flourish login”.

Options:
--patch
	Increment the patch number before publishing. Useful for making a quick patch.
--prerelease
	Increment the prerelease tag before publishing. Useful for testing a template on the server.
--release
	Remove the prerelease tag before publishing.
`;

module.exports = publish;
