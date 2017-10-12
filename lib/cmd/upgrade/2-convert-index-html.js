"use strict";

var fs = require("fs"),
    path = require("path");

function convert(html) {
	return html.replace(/[ \t]*(?:\{\{\{\s*(\w+)\s*\}\}\}|\{\{\s*(\w+)\s*\}\})[ \t]*(?:\r\n|\n)?/g, function(s, triple_name, double_name) {
		switch (triple_name || double_name) {
			case "title": return "";
			case "script": return "";
			case "static": return ".";
			default:
				throw new Error("Unrecognised mustache tag: " + s);
		}
	});
}

function upgrade(template_dir) {
	return new Promise(function(resolve, reject) {
		fs.stat(template_dir, function(error, stat) {
			if (error) reject(new Error(`Could not access ${template_dir}: ${error.message}`));
			if (!stat.isDirectory()) reject(new Error(`Not a directory: ${template_dir}`));

			const index_html_file = path.join(template_dir, "index.html");
			if (!fs.existsSync(index_html_file)) {
				resolve(false);
				return;
			}

			fs.readFile(index_html_file, "utf8", function(error, contents) {
				if (error) return reject(error);

				var new_contents = convert(contents);
				fs.writeFile(index_html_file, new_contents, function(error) {
					if (error) return reject(error);
					resolve(true);
				});
			});
		});
	});
}

upgrade.title = "Convert index.html to mustache-free format";
module.exports = upgrade;
