"use strict";

const pc = require("picocolors");

function victory(...lines) {
	for (let line of lines) console.log(pc.bold(pc.green("👻  " + line)));
}
function success(...lines) {
	for (let line of lines) console.log(pc.green("   " + line));
}
function info(...lines) {
	for (let line of lines) console.log(pc.yellow("   " + line));
}
function warn(...lines) {
	for (let line of lines) console.warn(pc.yellow("⚠️   " + line));
}
function warn_bold(...lines) {
	for (let line of lines) console.warn(pc.bold(pc.yellow("   " + line)));
}
function problem(...lines) {
	for (let line of lines) console.error(pc.red("😱  " + line));
}

function die(...lines) {
	problem(...lines);
	process.exit(1);
}

module.exports = {
	victory, success, info, warn, warn_bold, problem, die
};
