import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import commonjs from "@rollup/plugin-commonjs";
// Note: this typescript plugin is used instead @rollup/plugin-typescript
// this is because it uses typescript's file resolution rather than rollup's
// and the SDK
import typescript from "rollup-plugin-typescript2";

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
		nodeResolve({ browser: true }),
		typescript({
			tsconfig: "./tsconfig.json",
			tsconfigOverride: {
				"compilerOptions": {
					moduleResolution: "bundler",
				},
				include: [
					"../common/",
					"."
				],
				exclude: [
					"./common",
					"../common/*/**/*.tests.ts",
				]
			}
		}),
		commonjs(),
		terser()
	],

	external: ["crypto"],

	onwarn: function (warning, warn) {
		if (warning.code !== "CIRCULAR_DEPENDENCY") warn(warning);
	}
};
