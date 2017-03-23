"use strict";

const colors = require("colors");

function victory(...lines) {
	for (let line of lines) console.log(colors.bold.green("👻  " + line));
}
function success(...lines) {
	for (let line of lines) console.log(colors.green("   " + line));
}
function info(...lines) {
	for (let line of lines) console.log(colors.yellow("   " + line));
}
function warn(...lines) {
	for (let line of lines) console.warn(colors.yellow("   " + line));
}
function warn_bold(...lines) {
	for (let line of lines) console.warn(colors.bold.yellow("   " + line));
}
function problem(...lines) {
	for (let line of lines) console.error(colors.red("😱  " + line));
}

function die(...lines) {
	problem(...lines);
	process.exit(1);
}

module.exports = {
	victory, success, info, warn, warn_bold, problem, die
};
