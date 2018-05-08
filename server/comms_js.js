module.exports = `
window.addEventListener("message", function(event) {
	var a = document.createElement("a");
	a.href = event.origin;
	var origin_okay = (a.hostname == window.location.hostname)
		|| window.location.hostname === "localhost"
		|| (a.hostname.match(/\\.flourish\\.local$/) && window.location.hostname.match(/\\.flourish\\.local$/))
		|| (a.hostname.match(/\\.flourish\\.rocks$/) && window.location.hostname.match(/\\.flourish\\.rocks$/))
		|| (a.hostname.match(/\\.flourish\\.studio$/) && window.location.hostname.match(/\\.flourish\\.studio$/));

	if (!origin_okay) return;
	var message = event.data;
	var port = event.ports[0];
	if (!port || typeof message !== "object" || message.sender !== "Flourish") return;
	var result = null;
	function assign(target, source) {
		for (var k in source) {
			target[k] = source[k];
		}
	}
	try {
		switch(message.method) {
			case "getState":
			result = (message.argument) ? window.template.state[message.argument] : window.template.state;
			break;

			case "setState":
			assign(window.template.state, message.argument);
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
				assign(window.template.state, spec.state);
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
