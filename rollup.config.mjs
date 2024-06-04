import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import commonjs from "@rollup/plugin-commonjs";

export default {
	input: "src/index.js",
	output: {
		format: "iife",
		name: "Flourish",
		file: "site/script.js",
		sourcemap: true,
		globals: {
			crypto: "crypto"
		}
	},

	// d3 relies on the node-resolve plugin
	plugins: [
		nodeResolve(),
		commonjs(),
		terser()
	],

	external: ["crypto"],

	onwarn: function (warning, warn) {
		if (warning.code !== "CIRCULAR_DEPENDENCY") warn(warning);
	}
};
