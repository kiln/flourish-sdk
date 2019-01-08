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
  ],
  /* Cyclic dependencies are allowed in ES6, and such imports occur
     in many d3 components, so suppress those rollup warnings. */
  onwarn: function (warning, warn) {
    if (warning.code === "CIRCULAR_DEPENDENCY") return;
    warn(warning);
  }
};
