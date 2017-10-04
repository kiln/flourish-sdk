var nodeResolve = require("rollup-plugin-node-resolve"),
    uglify = require("rollup-plugin-uglify");

export default {
  input: "src/index.js",
  output: {
    format: "iife",
    name: "template",
    file: "template.js",
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    uglify(),
  ]
};
