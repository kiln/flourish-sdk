"use strict";
// Polyfills for IE11 and Edge
// Add findIndex method to Array
// https://tc39.github.io/ecma262/#sec-array.prototype.findindex
if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, "findIndex", {
        value: function (predicate) {
            if (this == null) {
                throw new TypeError("this is null or not defined");
            }
            var o = Object(this);
            var len = o.length >>> 0;
            if (typeof predicate !== "function") {
                throw new TypeError("predicate must be a function");
            }
            var this_arg = arguments[1];
            var k = 0;
            while (k < len) {
                var k_value = o[k];
                if (predicate.call(this_arg, k_value, k, o)) {
                    return k;
                }
                k++;
            }
            return -1;
        },
        configurable: true,
        writable: true,
    });
}
