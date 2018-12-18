import nodeResolve from "rollup-plugin-node-resolve";
import { uglify } from "rollup-plugin-uglify";

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
