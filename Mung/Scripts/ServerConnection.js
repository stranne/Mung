/// <reference path="Mung.js" />


window.server = (function (parameters) {
	var server = $.connection.game;

	var newGamerInterval;

	// reply to server's ping
	server.ping = function () {
		server.pingServer();
	};

	// start a new game session
	server.startGame = function (startDirection) {
		clearInterval(newGamerInterval);
		Mung.newGame(startDirection);
	}

	// update remote player's paddle position
	server.updatePaddlePosition = function (paddleY) {
		Mung.updatePaddlePosition(paddleY);
	};

	// ball bounced on remote player's paddle
	server.remotePaddleBounce = function (ballX, bally, ballDirection, ballSpeed, delay) {
		Mung.remotePaddleBounce(ballX, bally, ballDirection, ballSpeed, delay);
	};

	server.newDrop = function (delay, startDirection) {
		Mung.newDrop(delay, startDirection);
	};

	// local player has scored a point
	server.score = function () {
		Mung.score();
	};

	// update scores
	server.updateScore = function (leftScore, rightScore) {
		Mung.updateScore(leftScore, rightScore);
	};

	server.gameOver = function (message) {
		Mung.gameOver(message);
	};


	// manual responses used to get information from server
	server.activeGamers = function (activeGames) {
		console.log("There are currently " + activeGames + " active games.");
	};

	server.clientPingValue = function (clientPing) {
		console.log("Your ping to server is " + clientPing + " ms.");
	};

	server.gamePingValues = function (clientPing, opponentPing) {
		console.log("Your ping to server is " + clientPing + " ms and your opponent's ping is " + opponentPing + " ms.");
	};

	window.get = {
		activeGamers: function () {
			server.activeGamesServer();
		},
		clientPingValue: function () {
			server.clientPingValueServer();
		},
		gamePingValues: function () {
			server.gamePingValuesServer();
		}
	};


	// initiate connection
	$.connection.hub.start(function () {
		// informs the server repeatedly that the client wants to play
		newGamerInterval = setInterval(newGamer, 10000);
		newGamer();
	});

	newGamer = function () {
		server.newGamerServer();
	};

	return server;
})();