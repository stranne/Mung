/// <reference path="jquery-1.7-vsdoc.js" />
/// <reference path="ServerConnection.js" />
/// <reference path="soundmanager2.js" />


window.Mung = new (function ($) {
	// on ready
	$(function () {
		layout.init();
		controller.init();
		sound.init();
		gameEngine.init();

		// draw starting message
		layout.drawText("Waiting for opponent", "Get a friend to load the site to get started");

		// set settings to make the apperance unversal betwwen browsers
		settingFixes();

		// server is automatically initiated.
		// server listener functions are located in 'ServerConnection.js'
	});

	// on resize
	$(window).bind('resize', function () {
		// update layout on browser window resize
		layout.calculateSize(true);

		// redraw text message if any
		if (layout.mainMessage !== undefined)
			layout.drawText(layout.mainMessage, layout.subMessage);
	});

	settingFixes = function () {
		// fix for chrome to avoid text cursor when dragging
		document.onselectstart = function () {
			return false;
		}
	}

	controller = {
		init: function () {
			// initiate controller

			// disable controller as default
			controller.disableController();

			// initiate mouse controller
			$('#foreground').mousedown(function (event) {
				if (!controller.actionLocked) {
					controller.startMouseY = event.pageY;
					controller.startPaddleRightY = layout.paddleRightY;
					controller.mouseInAction = true;
					controller.actionLocked = true;
				}
			});
			$('#foreground').mouseup(function (event) {
				if (controller.mouseInAction) {
					controller.mouseInAction = false;
					controller.actionLocked = false;
				}
			});
			$('#foreground').mousemove(function (event) {
				if (controller.mouseInAction)
					controller.calculateMousePosition(event.pageY);
			});

			// initiate touch controller
			$('#foreground').bind('touchmove',function(e){
				e.preventDefault();
				// try originalEvent first in order to support safari browser
				if (!controller.actionLocked) {
					var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
					var paddleY = controller.validatePaddlePosition(touch.pageY);
					controller.updatePosition(paddleY);
				}
			});

			// initiate keyboard controller
			controller.keyMovementProcent = 0.01;
			$(document).keydown(function (event) {
				if (!controller.actionLocked) {
					controller.actionLocked = true;
					controller.keyInAction = true;

					// map key to paddle movement direction
					switch (event.keyCode) {
						// up
						case 38: case 87: case 104: case 33:
							controller.keyDirection = -1;
							break;
						case 40: case 83: case 98: case 34:
							controller.keyDirection = 1;
							break;
						default:
							// don't move in any direction if other then specified keys
							controller.actionLocked = false;
							controller.keyInAction = false;
							return;
					}
					clearInterval(controller.keyInterval);
					controller.keyInterval = setInterval(controller.keyUpdate, 10);
				}
			});
			$(document).keyup(function (event) {
				controller.abortKeyController();
			});
			$(window).blur(function() {
				// stop movement of paddle if window loses focus
				controller.abortKeyController();
			});
		},
		abortKeyController: function () {
			if (controller.keyInAction) {
				clearInterval(controller.keyInterval);
				controller.keyInterval = null;
				controller.keyInAction = false;
				controller.actionLocked = false;
			}
		},
		disableController: function () {
			clearInterval(controller.keyInterval);
			controller.keyInterval = null;
			controller.actionLocked = true;
			controller.mouseInAction = false;
			controller.keyInAction = false;
		},
		enableController: function () {
			controller.mouseInAction = false;
			controller.keyInAction = false;
			controller.actionLocked = false;
		},
		calculateMousePosition: function (mouseY) {
			// calculate difference
			var diffY = mouseY - controller.startMouseY;

			// move players paddle if possible
			var paddleY = controller.startPaddleRightY + diffY;
			
			paddleY = controller.validatePaddlePosition(paddleY);

			// set paddle to new y position
			controller.updatePosition(paddleY);
		},
		keyUpdate: function () {
			var paddleY = layout.paddleRightY + controller.keyMovementProcent * layout.innerHeight * controller.keyDirection;
			paddleY = controller.validatePaddlePosition(paddleY);
			controller.updatePosition(paddleY);
		},
		validatePaddlePosition: function (paddleY) {
			// check so position is a valid paddle position, get closest valid position if not
			if (paddleY < layout.paddleMinY) {
				paddleY = layout.paddleMinY;
				controller.abortKeyController();
			}
			else if (paddleY > layout.paddleMaxY) {
				paddleY = layout.paddleMaxY;
				controller.abortKeyController();
			}
			return paddleY;
		},
		updatePosition: function (paddleY) {
			// update new paddle position
			gameEngine.updatePaddleRight((paddleY - layout.frameHeight) / layout.innerHeight);
		}
	}

	sound = {
		init: function () {
			// set up and preload sound effects

			soundManager.url = '/SWF/';
			soundManager.onready(function () {
				soundManager.createSound({
					id: 'countdown',
					url: '/Sound/countdown.mp3',
					autoLoad: true
				});
				soundManager.createSound({
					id: 'fail',
					url: '/Sound/fail.mp3',
					autoLoad: true
				});
				soundManager.createSound({
					id: 'paddle',
					url: '/Sound/paddle.mp3',
					autoLoad: true,
				});
				soundManager.createSound({
					id: 'score',
					url: '/Sound/score.mp3',
					autoLoad: true
				});
				soundManager.createSound({
					id: 'wall',
					url: '/Sound/wall.mp3',
					autoLoad: true
				});
			});
		},
		play: function (sound) {
			// play a specific sound effect
			soundManager.play(sound);
		}
	}

	layout = {
		init: function () {
			// set default score values
			gameEngine.leftScore = "0";
			gameEngine.rightScore = "0";

			// initiate layout
			layout.calculateSize();
		},

		drawBackground: function () {
			// draw background
			// contains background, frames, goals, line and scores

			// prepare canvas
			var canvas = document.getElementById("background");
			canvas.height = layout.height;
			canvas.width = layout.width;

			var context = canvas.getContext("2d");

			context.clearRect(0, 0, canvas.width, canvas.height);

			// draw background layout to canvas

			// background
			context.fillStyle = "#000";
			context.fillRect(0, 0, layout.width, layout.height);

			// frames
			context.fillStyle = "#999";
			context.fillRect(layout.frameX, layout.frameTopY, layout.frameWidth, layout.frameHeight);
			context.fillRect(layout.frameX, layout.frameBottomY, layout.frameWidth, layout.frameHeight);

			// goals
			context.fillStyle = "#500";
			context.fillRect(layout.goalLeftX, layout.goalY, layout.goalWidth, layout.goalHeight);
			context.fillRect(layout.goalRightX, layout.goalY, layout.goalWidth, layout.goalHeight);

			// middle line
			context.fillStyle = "#333";
			context.fillRect(layout.middleLineX, layout.middleLineY, layout.middleLineWidth, layout.middleLineHeight);

			// score numbers
			context.fillStyle = "#333";
			context.font = "Bold " + layout.scoreFontSize + "px Verdana";
			context.textBaseline = "top";
			context.textAlign = "right";
			context.fillText(gameEngine.leftScore, layout.scoreLeftX, layout.scoreY);
			context.textAlign = "left";
			context.fillText(gameEngine.rightScore, layout.scoreRightX, layout.scoreY);
		},

		drawForeground: function () {
			// draw foreground
			// contains paddles and ball

			var canvas = document.getElementById("foreground");
			canvas.height = layout.height;
			canvas.width = layout.width;

			var context = canvas.getContext("2d");

			context.clearRect(0, 0, canvas.width, canvas.height);

			// paddles
			context.fillStyle = "#999";
			context.fillRect(layout.paddleLeftX, layout.paddleLeftY, layout.paddleWidth, layout.paddleHeight);
			context.fillRect(layout.paddleRightX, layout.paddleRightY, layout.paddleWidth, layout.paddleHeight);

			// ball
			context.arc(layout.ballX, layout.ballY, layout.ballRadius, 0, Math.PI * 2, false);
			context.fill();
		},

		drawText: function (mainMessage, subMessage) {
			var canvas = document.getElementById("foreground");
			var context = canvas.getContext("2d");

			// clear canvas
			context.clearRect(0, 0, canvas.width, canvas.height);

			// draw main message
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillStyle = "#999";
			context.font = "Bold " + layout.mainTextFontSize + "px Verdana";
			context.fillText(mainMessage, layout.mainTextX, layout.mainTextY);

			// draw sub message if any
			if (subMessage !== undefined) {
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.fillStyle = "#999";
				context.font = "Bold " + layout.subTextFontSize + "px Verdana";
				context.fillText(subMessage, layout.subTextX, layout.subTextY);
			}

			// save these messages so that they can be redrawn if resizing
			layout.mainMessage = mainMessage;
			layout.subMessage = subMessage;
		},

		drawCountdown: function () {
			var canvas = document.getElementById("foreground");
			var context = canvas.getContext("2d");

			// clear canvas
			context.clearRect(0, 0, canvas.width, canvas.height);

			// draw text
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillStyle = "#999";
			context.font = "Bold " + layout.mainTextFontSize * layout.countdownSize * 5 + "px Verdana";
			context.fillText(layout.countdownNumber, layout.mainTextX, layout.mainTextY);

			// play countdown sound
			if (layout.countdownSize === 1)
				sound.play("countdown");

			// update size
			layout.countdownSize -= 0.0666666667;
			if (layout.countdownSize <= 0) {
				layout.countdownSize = 1.0;

				// update number

				if (layout.countdownNumber === "GO") {
					// stop interval and restore foreground
					clearInterval(gameEngine.countdownInterval);
					layout.drawForeground();
					return;
				}

				layout.countdownNumber--;

				if (layout.countdownNumber <= 0) {
					// set text "GO" as last text to be displayed
					layout.countdownNumber = "GO";
				}
			}
		},

		calculateSize: function (resizing) {
			// calculate size of elements depending on the size and proportions of the browser window

			// store previous values, if any, for adjusting paddles Y-coordinate and ball's position if resizing
			var previousInnerHeight = layout.innerHeight;
			var previousInnerWidth = layout.innerWidth;
			var previousFrameHeight = layout.frameHeight;
			var previousGoalWidth = layout.goalWidth;

			// get size of browser window
			layout.height = $(window).height();
			layout.width = $(window).width();

			// static properties
			layout.innerHeightProportions = 9;
			layout.innerWidthProportions = 16;
			layout.minimalFrameHeightPercent = 0.05;
			layout.minimalGoalWidthPercent = 0.1;
			layout.middleLineWidthPercent = 0.007;
			layout.paddleWidthPercent = 0.013;
			layout.paddleHeightPercent = 0.10;
			layout.ballRadiusPercent = 0.02;
			layout.scoreMarginTopPercent = 0.0;
			layout.scoreMarginHorizontalPercent = 0.013;
			layout.scoreFontSizePercent = 0.12;

			// calculate inner dimension (where the ball can move around)
			layout.innerHeight = layout.height - layout.height * layout.minimalFrameHeightPercent * 2;
			layout.innerWidth = layout.width - layout.width * layout.minimalGoalWidthPercent * 2;

			// adjust proportions of inner dimension to specification
			layout.heightProportions = layout.innerHeight / layout.innerHeightProportions;
			layout.widthProportions = layout.innerWidth / layout.innerWidthProportions;

			if (layout.heightProportions > layout.widthProportions) {
				// set height depending on width
				layout.innerHeight = layout.innerHeight * (layout.widthProportions / layout.heightProportions);
			}
			else if (layout.heightProportions < layout.widthProportions) {
				// set width depending on height
				layout.innerWidth = layout.innerWidth * (layout.heightProportions / layout.widthProportions);
			}

			// calculate graphical element's properties

			// common calculations
			var frameHeight = (layout.height - layout.innerHeight) / 2;
			var frameWidth = (layout.width - layout.innerWidth) / 2;

			// frames
			layout.frameX = 0;
			layout.frameTopY = 0;
			layout.frameBottomY = layout.innerHeight + frameHeight;
			layout.frameHeight = frameHeight;
			layout.frameWidth = layout.width;

			// goals
			layout.goalLeftX = 0;
			layout.goalRightX = layout.width - frameWidth;
			layout.goalY = frameHeight;
			layout.goalHeight = layout.height - frameHeight * 2;
			layout.goalWidth = frameWidth;

			// paddles
			layout.paddleLeftX = layout.goalWidth;
			layout.paddleRightX = layout.goalRightX - (layout.innerWidth * layout.paddleWidthPercent);
			if (layout.paddleLeftY !== undefined) {
				// adjust y-coordinate for paddles if resizing and if paddles are already drawn
				layout.paddleLeftY = ((layout.paddleLeftY - previousFrameHeight) / previousInnerHeight) * layout.innerHeight + layout.frameHeight;
				layout.paddleRightY = ((layout.paddleRightY - previousFrameHeight) / previousInnerHeight) * layout.innerHeight + layout.frameHeight;
			}
			layout.paddleHeight = layout.innerHeight * layout.paddleHeightPercent;
			layout.paddleWidth = layout.innerWidth * layout.paddleWidthPercent;
			layout.paddleMaxY = layout.frameBottomY - layout.paddleHeight;
			layout.paddleMinY = layout.frameHeight;

			// middle line
			layout.middleLineX = (layout.width - layout.innerWidth * layout.middleLineWidthPercent) / 2;
			layout.middleLineY = layout.frameHeight;
			layout.middleLineHeight = layout.goalHeight;
			layout.middleLineWidth = layout.innerWidth * layout.middleLineWidthPercent;

			// ball
			layout.ballX = layout.width / 2;
			layout.ballY = layout.height / 2;
			layout.ballRadius = layout.innerHeight * layout.ballRadiusPercent;

			// score
			layout.scoreLeftX = (layout.width / 2) - layout.width * layout.scoreMarginHorizontalPercent;
			layout.scoreRightX = (layout.width / 2) + layout.width * layout.scoreMarginHorizontalPercent;
			layout.scoreY = layout.frameHeight + layout.width * layout.scoreMarginTopPercent;
			layout.scoreFontSize = layout.scoreFontSizePercent * layout.innerHeight;

			// text message
			layout.mainTextX = layout.width / 2;
			layout.mainTextY = layout.height / 2;
			layout.mainTextFontSize = layout.scoreFontSizePercent * layout.innerHeight;
			layout.subTextX = layout.width / 2;
			layout.subTextY = (layout.innerHeight / 8) * 5 + layout.frameHeight;
			layout.subTextFontSize = layout.scoreFontSizePercent * layout.innerHeight * 0.5;

			// update layout with new position data
			layout.drawBackground();
			if (resizing !== true) {
				// don't draw foreground if resizing
				layout.drawForeground();
			}
			else {
				// resize foreground if resizing
				var canvas = document.getElementById("foreground");
				canvas.height = layout.height;
				canvas.width = layout.width;
			}
		}
	}

	var gameEngine = {
		init: function () {
			gameEngine.serverWaitTimeOutTime = 2000;
			gameEngine.serverGameOverTimeOutTime = 10000;
		},
		newGame: function (startDirection) {
			// set default starting values
			gameEngine.ballX = 0.5;
			gameEngine.ballY = 0.5;
			gameEngine.ballDirection = startDirection;
			gameEngine.ballSpeed = 0.010;

			gameEngine.rightScore = 0;
			gameEngine.leftScore = 0;

			// set game's update frequency in ms
			gameEngine.moveFrequency = 15;

			// prepare for a new drop
			gameEngine.newDrop();
		},
		newDrop: function () {
			// place the puck in the middle, and paddles, and start the game
			gameEngine.ballX = 0.5;
			gameEngine.ballY = 0.5;
			gameEngine.ballSpeed = 0.010;

			layout.ballX = gameEngine.ballX;
			layout.ballY = gameEngine.ballY;

			gameEngine.paddleLeftY = 0.5 - layout.paddleHeightPercent / 2;
			layout.paddleLeftY = gameEngine.paddleLeftY * layout.innerHeight + layout.frameHeight;
			gameEngine.paddleRightY = 0.5 - layout.paddleHeightPercent / 2;
			layout.paddleRightY = gameEngine.paddleRightY * layout.innerHeight + layout.frameHeight;

			// start countdown
			gameEngine.displayCountdown();

			// start game after countdown
			setTimeout(gameEngine.startGame, 3000);
		},
		startGame: function () {
			// make sure previous interval is clear before starting the new one
			clearInterval(gameEngine.interval);
			if (gameEngine.permanentStop !== true) {
				// remove any text message to be redrawn if resizing
				layout.mainMessage = undefined;
				layout.subMessage = undefined;

				gameEngine.interval = setInterval(gameEngine.move, gameEngine.moveFrequency);
				controller.enableController();
			}
		},
		stopGame: function (controllerEnabled) {
			clearInterval(gameEngine.interval);
			if (controllerEnabled !== true)
				controller.disableController();
		},
		displayCountdown: function () {
			controller.disableController();
			layout.countdownSize = 1.0;
			layout.countdownNumber = 3;
			var countdownFrequency = 50;
			if (gameEngine.permanentStop !== true) {
				// remove any text message to be redrawn if resizing
				layout.mainMessage = undefined;
				layout.subMessage = undefined;
				clearInterval(gameEngine.countdownInterval);
				gameEngine.countdownInterval = setInterval(function () { layout.drawCountdown() }, countdownFrequency);
			}
		},
		updatePaddleLeft: function (paddleY) {
			// update remote player's paddle y-position
			gameEngine.paddleLeftY = paddleY;
			layout.paddleLeftY = paddleY * layout.innerHeight + layout.frameHeight;
		},
		updatePaddleRight: function (paddleY) {
			// update local player's paddle y-position
			gameEngine.paddleRightY = paddleY;
			layout.paddleRightY = paddleY * layout.innerHeight + layout.frameHeight;

			// update screen
			layout.drawForeground();

			// send updated position of local paddle to opponent
			server.updatePaddlePositionServer(paddleY);
		},
		move: function () {
			// set ball's next position
			gameEngine.ballX += Math.cos(gameEngine.ballDirection) * gameEngine.ballSpeed;
			gameEngine.ballY += Math.sin(gameEngine.ballDirection) * gameEngine.ballSpeed;

			var ballRadiusY = layout.ballRadiusPercent;
			var ballRadiusX = layout.ballRadiusPercent * layout.innerHeight / layout.innerWidth;

			// check for bounce in y-axel
			if (gameEngine.ballY < ballRadiusY) {
				// top bounce
				gameEngine.ballY = Math.abs(gameEngine.ballY - layout.ballRadiusPercent) + layout.ballRadiusPercent;
				gameEngine.ballDirection *= -1;

				sound.play("wall");
			}
			else if (gameEngine.ballY > 1 - ballRadiusY) {
				// bottom bounce
				gameEngine.ballY -= gameEngine.ballY + layout.ballRadiusPercent - 1;
				gameEngine.ballDirection *= -1;

				sound.play("wall");
			}

			// check for bounce in x-axel
			if (gameEngine.ballX - ballRadiusX <= 0.013) {
				var paddleHit = 1 - 2 * ((gameEngine.ballY * layout.innerHeight + layout.frameHeight) - layout.paddleLeftY + ballRadiusY * layout.innerHeight) / ((layout.paddleHeightPercent + ballRadiusY * 2) * layout.innerHeight);
				if (paddleHit >= -1 && paddleHit <= 1) {
					// hit left paddle, opponent's paddle
					gameEngine.ballX -= 2 * (0.013 - gameEngine.ballX);
					gameEngine.ballDirection = paddleHit * (Math.PI / 3);

					gameEngine.startServerTimeOut();
				}
				else if (gameEngine.ballX - ballRadiusX <= 0) {
					// right player score

					// stop game and wait for instruction from server of what to do next
					gameEngine.stopGame(true);

					gameEngine.startServerTimeOut();
				}
			}
			else if (gameEngine.ballX + ballRadiusX >= 0.987) {
				var paddleHit = 1 - 2 * ((gameEngine.ballY * layout.innerHeight + layout.frameHeight) - layout.paddleRightY + ballRadiusY * layout.innerHeight) / ((layout.paddleHeightPercent + ballRadiusY * 2) * layout.innerHeight);
				if (paddleHit >= -1 && paddleHit <= 1) {
					// hit right paddle, user's paddle
					gameEngine.ballX += 2 * (gameEngine.ballX - 0.987);
					gameEngine.ballDirection = Math.PI + paddleHit * (Math.PI / 3);

					// increase speed
					gameEngine.ballSpeed += 0.0001;

					sound.play("paddle");

					// inform remote and server of the bounce
					server.remotePaddleBounceServer(gameEngine.ballX, gameEngine.ballY, gameEngine.ballDirection, gameEngine.ballSpeed);
				}
				else if (gameEngine.ballX + ballRadiusX >= 1) {
					// left player score

					sound.play("fail");

					// update score
					gameEngine.leftScore += 1;
					layout.drawBackground();

					// paus the game and wait for instructions from server
					gameEngine.stopGame();

					// inform server of score
					server.scoreServer();
				}
			}

			// update screen localy
			gameEngine.updateBallPositionLayout();
		},
		updateBallPositionLayout: function () {
			// update position of ball and draw it
			layout.ballX = gameEngine.ballX * layout.innerWidth + layout.goalWidth;
			layout.ballY = gameEngine.ballY * layout.innerHeight + layout.frameHeight;
			layout.drawForeground();
		},
		startServerTimeOut: function () {
			gameEngine.stopServerTimeOut();

			gameEngine.serverWaitTimeOut = setTimeout(gameEngine.serverWait, gameEngine.serverWaitTimeOutTime);

			gameEngine.serverGameOverTimeOut = setTimeout(gameEngine.serverGameOver, gameEngine.serverGameOverTimeOutTime);
		},
		stopServerTimeOut: function () {
			clearTimeout(gameEngine.serverWaitTimeOut);
			clearTimeout(gameEngine.serverGameOverTimeOut);
		},
		serverWait: function () {
			gameEngine.stopGame();
			layout.drawText("Waiting", "Waiting for server to respond");
		},
		serverGameOver: function () {
			gameEngine.permanentStop = true;
			gameEngine.stopGame();
			layout.drawText("Game over", "Lost connection to opponent");
			server.abortGameServer();
		},
		fastTrackBallMovement: function (ballX, ballY, ballDirection, ballSpeed, duration) {
			// this function fast track the path a ball will take during a specified duration
			// and set the ball to those resulting properties

			sound.play("paddle");

			var steps = Math.floor(duration / gameEngine.moveFrequency),
				ballRadiusY = layout.ballRadiusPercent,
				x = ballX,
				y = ballY,
				d = ballDirection;

			for (var i = 0; i < steps; i++) {
				x += Math.cos(d) * ballSpeed;
				y += Math.sin(d) * ballSpeed;

				// check for bounce in y-axel
				if (y < ballRadiusY) {
					// top bounce
					y = Math.abs(y - layout.ballRadiusPercent) + layout.ballRadiusPercent;
					d *= -1;
				}
				else if (gameEngine.ballY > 1 - ballRadiusY) {
					// bottom bounce
					y -= y + layout.ballRadiusPercent - 1;
					d *= -1;
				}
			}

			// set values
			gameEngine.ballX = x;
			gameEngine.ballY = y;
			gameEngine.ballDirection = d;
			gameEngine.ballSpeed = ballSpeed;

			// make sure the game is on
			gameEngine.startGame()
		}
	}

	var Mung = {
		updatePaddlePosition: function (paddleY) {
			// update left, remote user's, paddle position
			gameEngine.updatePaddleLeft(paddleY);
		},
		remotePaddleBounce: function (ballX, ballY, ballDirection, ballSpeed, delay) {
			// check if latency is to large for playable play
			if ((delay / gameEngine.moveFrequency) * ballSpeed > 0.7) {
				// to much latency
				Mung.gameOver("To high latency to opponent");
				server.gameOver("To high latency to opponent");
			}
			else {
				gameEngine.fastTrackBallMovement(ballX, ballY, ballDirection, ballSpeed, delay);
				gameEngine.stopServerTimeOut();
			}
		},
		score: function () {
			// add score to local player
			gameEngine.rightScore++;
			// display new scores and play sound
			layout.drawBackground();
			sound.play("score");
			// stop game and await a message from server to do a new drop
			gameEngine.stopGame();
		},
		newGame: function (startDirection) {
			// start new game session
			gameEngine.newGame(startDirection);
		},
		newDrop: function (delay, startDirection) {
			// do a new drop
			gameEngine.stopServerTimeOut();
			gameEngine.ballDirection = startDirection;
			setTimeout(gameEngine.newDrop, delay);
		},
		gameOver: function (message) {
			// stop game and display reason to player
			gameEngine.permanentStop = true;
			gameEngine.stopServerTimeOut();
			gameEngine.stopGame();
			layout.drawText("Game over", message);
		},
	};

	return Mung;
})(jQuery);