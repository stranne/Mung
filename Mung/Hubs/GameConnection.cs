using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using SignalR.Hubs;
using Mung.Models;

namespace Mung.Hubs
{
	[HubName("game")]
	public class GameConnection : Hub, IDisconnect
	{
		private static Dictionary<string, string> ActiveGamer = new Dictionary<string, string>();
		private static PingManager PingManager = new PingManager();
		private static string AlonePlayer = null;
		private static DateTime AlonePlayerRegister = new DateTime();
		private static Object newGamerLock = new Object();

		public void NewGamerServer()
		{
			lock (newGamerLock)
			{
				if (ActiveGamer.ContainsKey(Context.ClientId))
				{
					// current gamer wants to start a new game

					// end the previous game if it can be found
					AbortGameServer();

					// continue with the gamers registration for the new game
				}

				if (AlonePlayer == Context.ClientId)
				{
					// the player is already registred

					// update registration time
					if (AlonePlayer == Context.ClientId)
					{
						AlonePlayerRegister = DateTime.Now;
					}

					return;
				}

				// new gamer wants to join a game

				// start ping rutine if not already pinged
				if (!PingManager.BeenPinged(Context.ClientId))
					PingManager.NewGamer(Context.ClientId);

				// check if gamer should join or wait for another player
				// if there has gone more than 20 seconds sinze alone player register that
				// player is not waiting for a game any more
				if (AlonePlayer != null && (DateTime.Now - AlonePlayerRegister).TotalSeconds < 15)
				{
					// remove if any of the players where already registred on an earlier game session
					ActiveGamer.Remove(AlonePlayer);
					ActiveGamer.Remove(Context.ClientId);

					// pair players for a new game
					ActiveGamer.Add(AlonePlayer, Context.ClientId);
					ActiveGamer.Add(Context.ClientId, AlonePlayer);

					// clear waiting queue
					AlonePlayer = null;

					// notify player that a new game is starting
					Opponent().startGame(0);
					Player().startGame(Math.PI);
				}
				else
				{
					// add player to waiting queue
					AlonePlayer = Context.ClientId;
					AlonePlayerRegister = DateTime.Now;
				}
			}
		}

		public void UpdatePaddlePositionServer(float paddleY)
		{
			if (CheckConnection(true))
			{
				// fordward the message to the opponent
				Opponent().updatePaddlePosition(paddleY);
			}
		}

		public void RemotePaddleBounceServer(float ballX, float ballY, float ballDirection, float ballSpeed)
		{
			if (CheckConnection(true))
			{
				// calculate latency between players
				var latency = PingManager.GetTotalGamePing(Context.ClientId, ActiveGamer[Context.ClientId]);

				// fordward the message to the opponent
				Opponent().remotePaddleBounce(1 - ballX, ballY, Math.PI - ballDirection, ballSpeed, latency);
			}
		}

		public void ScoreServer()
		{
			if (CheckConnection(true))
			{
				// inform opponent  about new score
				var opponent = this.Opponent();
				opponent.score();

				// calculate latency between players
				var latency = PingManager.CalculatePingDifferense(Context.ClientId, ActiveGamer[Context.ClientId]);
				var latencyOpponent = (latency < 0 ? latency : 0);
				var latencyPlayer = (latency > 0 ? latency : 0);

				// fordward the message to the opponent
				opponent.newDrop(latencyOpponent, 0);
				Player().newDrop(latencyPlayer, Math.PI);
			}
		}

		public void GameOverServer(string message)
		{
			if (CheckConnection(true))
			{
				Opponent().gameOver(message);
			}
		}

		public void AbortGameServer()
		{
			lock (ActiveGamer)
			{
				if (CheckConnection(false))
				{
					Opponent().gameOver("Lost connection to opponent");
					ActiveGamer.Remove(ActiveGamer[Context.ClientId]);
					ActiveGamer.Remove(Context.ClientId);
				}
			}
		}

		public void PingServer()
		{
			PingManager.PingResponse(Context.ClientId);
		}

		private bool CheckConnection(bool informClient)
		{
			var connection = ActiveGamer.ContainsKey(Context.ClientId) && ActiveGamer.ContainsValue(Context.ClientId);
			if (!connection && informClient)
				Caller.gameOver("Server couldn't find your game session");
			return connection;
		}

		private dynamic Opponent()
		{
			return Clients[ActiveGamer[Context.ClientId]];
		}

		private dynamic Player()
		{
			return Clients[Context.ClientId];
		}

		public void ActiveGamesServer()
		{
			Caller.activeGamers(ActiveGamer.Count / 2);
		}

		public void ClientPingValueServer()
		{
			Caller.clientPingValue(PingManager.GetGamerPing(Context.ClientId));
		}

		public void GamePingValuesServer()
		{
			if (CheckConnection(false)) {
				Caller.gamePingValues(PingManager.GetGamerPing(Context.ClientId), PingManager.GetGamerPing(ActiveGamer[Context.ClientId]));
			}
		}

		public void Disconnect()
		{
			var ClientId = Context.ClientId;
			// remove player from waiting queue if waiting
			if (AlonePlayer == ClientId)
				AlonePlayer = null;

			// check if client is playing a game
			lock (ActiveGamer)
			{
				var Opponent = ActiveGamer[ClientId];
				if (Opponent != null)
				{
					// abort game
					Clients[Opponent].gameOver("Opponent disconnect");
					ActiveGamer.Remove(ClientId);
					ActiveGamer.Remove(Opponent);
				}
			}
		}
	}
}