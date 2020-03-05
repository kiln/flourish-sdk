const deepCopyObject = require("../utils/state").deepCopyObject;


function isPrimitive(entity) {
	if (entity === null) return true;
	return [ "string", "boolean", "number" ].includes(typeof entity);
}


function extendItem(extendee, extender) {
	const v = isPrimitive(extendee) ? [extendee] : extendee;
	const w = isPrimitive(extender) ? [extender] : extender;
	const CANNOT_MERGE_MESSAGE = `template.yml: cannot extend ${extendee} with ${extender}`;
	let output;

	if (Array.isArray(v)) {
		if (Array.isArray(w)) output = v.concat(w);
		else throw new Error(CANNOT_MERGE_MESSAGE);
	}
	else if (typeof v === "object") {
		// Order of Object.assign means parameters in extendee are favoured over parameters in extender
		if (typeof(w) === "object") output = Object.assign(deepCopyObject(w), deepCopyObject(v));
		else throw new Error(CANNOT_MERGE_MESSAGE);
	}
	else throw new Error(CANNOT_MERGE_MESSAGE);

	return output;
}


module.exports = { extendItem };
