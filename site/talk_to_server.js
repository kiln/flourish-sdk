var _Flourish_talkToServer = (function () {
	'use strict';

	var error_element;

	function serverIsDown() {
		if (error_element) setTimeout(function() {
			error_element.classList.add("shown");
		}, 1000);
	}

	function serverIsUp() {
		if (error_element) error_element.classList.remove("shown");
	}

	var socket_url;
	var leaving_page = false;

	function socketOpened() {
		serverIsUp();
	}

	function socketClosed() {
		this.close();
		if (!leaving_page) {
			serverIsDown();
			setTimeout(reloadWhenServerComesBackUp, 250);
		}
	}

	function reloadWhenServerComesBackUp() {
		var s = connectSocket();
		s.addEventListener("open", function() {
			window.location.reload();
		});
	}

	function connectSocket() {
		var socket = new window.WebSocket(socket_url);
		socket.addEventListener("open", socketOpened);
		socket.addEventListener("close", socketClosed);
		return socket;
	}

	function talkToServer() {
		error_element = document.getElementById("error-server-down");
		socket_url = window.location.origin.replace(/^http(s?):\/\//, "ws$1://");
		window.addEventListener("beforeunload", function() {
			leaving_page = true;
		});
		connectSocket();
	}

	return talkToServer;

}());
