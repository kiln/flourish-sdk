var nodeResolve = require("rollup-plugin-node-resolve"),
    uglify = require("rollup-plugin-uglify"),
    path = require("path");

var conf = {
  entry: "src/index.js",
  format: "iife",
  moduleName: "Flourish",
  dest: "site/script.js",
  sourceMap: true,

  // d3 relies on the node-resolve plugin
  plugins: [
    nodeResolve({ jsnext: true, module: true, main: false }),
    uglify()
  ]
};

export default conf;
