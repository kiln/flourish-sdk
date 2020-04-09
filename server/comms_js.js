const BEFORE = `
window.addEventListener("message", function(event) {
`;

const CHECK_ORIGIN = `
	var a = document.createElement("a");
	a.href = event.origin;
	var origin_okay = (a.hostname == window.location.hostname)
		|| window.location.hostname === "localhost"
		|| (a.hostname.match(/\\.flourish\\.local$/) && window.location.hostname.match(/\\.flourish\\.local$/))
		|| (a.hostname.match(/\\.flourish\\.net$/) && window.location.hostname.match(/\\.flourish\\.net$/))
		|| (a.hostname.match(/\\.flourish\\.rocks$/) && window.location.hostname.match(/\\.flourish\\.rocks$/))
		|| (a.hostname.match(/\\.flourish\\.studio$/) && window.location.hostname.match(/\\.flourish\\.studio$/))
		|| (${"" /* Cope with previously-published stories, that are still on the old domain,
			     that have been republished (hence rerendered to use the new template URLs) */}
			(a.hostname == "public.flourish.studio" && window.location.hostname == "flo.uri.sh")
			|| (a.hostname == "public.flourish.rocks" && window.location.hostname == "staging-flo.uri.sh")
			|| (a.hostname == "public.dev.flourish.rocks" && window.location.hostname == "dev-flo.uri.sh")
		);

	if (!origin_okay) return;
`;

const AFTER = `
	var message = event.data;
	var port = event.ports[0];
	if (!port || typeof message !== "object" || message.sender !== "Flourish") return;
	var result = null;
	function assign(target, source) {
		for (var k in source) {
			if (source.hasOwnProperty(k)) target[k] = source[k];
		}
	}
	function deepAssign(target, source, is_destructive) {
		for (var k in source) {
			if (!source.hasOwnProperty(k)) continue;
			if (
				typeof target[k] === "object" && target[k] != null && !Array.isArray(target[k])
				&& typeof source[k] === "object" && source[k] != null && !Array.isArray(source[k])
			) {
				deepAssign(target[k], source[k], is_destructive);
			}
			else target[k] = source[k];
		}
		if (is_destructive) {
			for (var k in target) {
				if (target.hasOwnProperty(k) && !source.hasOwnProperty(k)) delete target[k];
			}
		}
	}
	try {
		var i, a;
		switch(message.method) {
			case "getState":
			result = window.template.state;
			if (message.argument) for (a = message.argument.split("."), i = 0; i < a.length; i++) {
				result = result[a[i]];
			}
			break;

			case "setState":
			deepAssign(window.template.state, message.argument);
			break;

			case "hasData":
			result = !!window.template.data;
			break;

			case "setData":
			assign(window.template.data, message.argument);
			break;

			case "getData":
			result = window.template.data;
			break;

			case "draw":
			window.template.draw();
			break;

			case "update":
			window.template.update();
			break;

			case "snapshot":
			result = window.snapshot(message.argument, port);
			break;

			case "setFixedHeight":
			if (window.Flourish) {
				window.Flourish.fixed_height = message.argument != null;
				window.Flourish.__container_height = message.argument;
				if (window.Flourish.checkHeight) window.Flourish.checkHeight();
			}
			break;

			case "sync":
			var spec = message.argument;
			if (spec.data) {
				assign(window.template.data, spec.data);
			}
			if (spec.state) {
				deepAssign(window.template.state, spec.state, spec.overwrite_state);
			}
			// only allow draw or update, not both
			if (spec.draw) {
				window.template.draw();
			}
			else if (spec.update) {
				window.template.update();
			}
			result = "success";
			break;
		}

		port.postMessage({result: result});
	}
	catch (e) {
		port.postMessage({error: e.message});
		throw e;
	}
}, false);
`;

const VALIDATE = `
if (template && template.draw && template.draw.length != 0) {
	console.warn("The draw() function should be declared with no parameters");
}
if (template && template.update && template.update.length != 0) {
	console.warn("The update() function should be declared with no parameters");
}
`;

module.exports = {
	withOriginCheck: BEFORE + CHECK_ORIGIN + AFTER,
	withoutOriginCheck: BEFORE + AFTER,
	validate: VALIDATE,
};
