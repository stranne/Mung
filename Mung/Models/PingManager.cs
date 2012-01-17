using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using SignalR.Hubs;
using Mung.Hubs;

namespace Mung.Models
{
	public class PingManager
	{
		private static Dictionary<string, double> Ping = new Dictionary<string, double>();
		private static Dictionary<string, DateTime> PingStartTime = new Dictionary<string, DateTime>();

		public void NewGamer(string ClientId)
		{
			// ping client
			dynamic clients = Hub.GetClients<GameConnection>();
			PingStartTime.Add(ClientId, DateTime.Now);
			clients[ClientId].ping();
		}

		public void PingResponse(string ClientId)
		{
			// handle ping response
			var endTime = DateTime.Now;
			var startTime = PingStartTime[ClientId];

			var pingTime = (endTime - startTime).TotalMilliseconds / 2;

			Ping.Remove(ClientId);
			Ping.Add(ClientId, pingTime);
			PingStartTime.Remove(ClientId);
		}

		public bool BeenPinged(string ClientId)
		{
			return Ping.ContainsKey(ClientId) || PingStartTime.ContainsKey(ClientId);
		}

		public double GetGamerPing(string ClientId)
		{
			return Ping.ContainsKey(ClientId) ? Ping[ClientId] : 0;
		}

		public double GetTotalGamePing(string ClientId1, string ClientId2)
		{
			// only return the total if there are a ping value for both clients
			if (Ping.ContainsKey(ClientId1) && Ping.ContainsKey(ClientId2))
				return Ping[ClientId1] + Ping[ClientId2];
			else
				return 0;
		}

		public double CalculatePingDifferense(string ClientId1, string ClientId2)
		{
			// only calculate the differense if there are a ping value for both clients
			if (Ping.ContainsKey(ClientId1) && Ping.ContainsKey(ClientId2))
			{
				var ping1 = Ping[ClientId1];
				var ping2 = Ping[ClientId2];

				return ping2 - ping1;
			}
			else
			{
				return 0;
			}
		}
	}
}