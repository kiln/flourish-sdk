/* * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * *
 * * * * * * GENERATED FILE - DO NOT EDIT * * * * * */
 
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function isObject(x) {
	return !Array.isArray(x) && typeof x === "object" && x != null;
}

/* Example: { a: { b: { c: 2, d: 3 } } } ↦
   {
    "a": { b: { c: 2, d: 3 }  },
    "a.b": { c: 2, d: 3 },
    "a.b.c": 2,
    "a.b.d": 3
  }
 */
function flatten(o, keys, result) {
	if (!keys) keys = [];
	if (!result) result = {};

	for (var k in o) {
		keys.push(k);
		if (typeof o[k] === "object") {
			flatten(o[k], keys, result);
		}
		result[keys.join(".")] = o[k];
		keys.pop();
	}

	return result;
}

// { "a.b.c": 2, "a.b.d":3 } → { a: { b: { c: 2, d: 3 } } }
function unflatten(o) {
	var r = {};
	for (var k in o) {
		var t = r;
		for (var i = k.indexOf("."), p = 0; i >= 0; i = k.indexOf(".", p = i+1)) {
			var s = k.substring(p, i);
			if (!(s in t)) t[s] = {};
			t = t[s];
		}
		t[k.substring(p)] = o[k]; // Assign the actual value to the appropriate nested object
	}
	return r;
}

function merge(dest, source) {
	for (var prop in source) {
		if (isObject(dest[prop]) && isObject(source[prop])) {
			merge(dest[prop], source[prop]);
		}
		else {
			dest[prop] = source[prop];
		}
	}
	return dest;
}

function deepCopyObject(obj) {
	if (obj == null) return obj;
	var copy = {};
	for (var k in obj) {
		if (Array.isArray(obj[k])) {
			copy[k] = obj[k].slice();
		}
		else if (isObject(obj[k])) {
			copy[k] = deepCopyObject(obj[k]);
		}
		else {
			copy[k] = obj[k];
		}
	}
	return copy;
}

// Simple deep equality test for JSON-definable objects
// The idea is that two objects test equal if they would
// JSON.stringify to the same thing, modulo key ordering.
//
// An edge case implied by the above:
//   { a: 1, b: undefined } counts as equal to { a: 1 }
//
// This is used to compare the slide state to the preview
// state, to see if the state has been changed by user interaction.
function deepEqual(a, b) {
	if (typeof a !== typeof b) return false;

	switch (typeof a) {
		case "string":
		case "boolean":
			return a === b;

		case "number":
			if (isNaN(a) && isNaN(b)) return true;
			return a === b;


		case "object":
			if (a === null) return (b === null);
			if (Array.isArray(a)) {
				if (!Array.isArray(b)) return false;
				if (a.length != b.length) return false;
				for (var i = 0; i < a.length; i++) {
					if (!deepEqual(a[i], b[i])) return false;
				}
				return true;
			}

			if (b === null) return false;
			var k;
			for (k in a) {
				if (!deepEqual(a[k], b[k])) return false;
			}
			for (k in b) {
				if (!(k in a) && typeof b[k] !== "undefined") return false;
			}
			return true;

		case "undefined":
			return typeof b === "undefined";
	}
}

function getStateChanges(state1, state2) {
	var diff = {};
	for (var name in state2) {
		if (!state1.hasOwnProperty(name) || !deepEqual(state1[name], state2[name])) {
			if (isObject(state1[name]) && isObject(state2[name])) {
				diff[name] = getStateChanges(state1[name], state2[name]);
			}
			else {
				diff[name] = state2[name];
			}
		}
	}
	return diff;
}

exports.deepCopyObject = deepCopyObject;
exports.deepEqual = deepEqual;
exports.flatten = flatten;
exports.getStateChanges = getStateChanges;
exports.isObject = isObject;
exports.merge = merge;
exports.unflatten = unflatten;
