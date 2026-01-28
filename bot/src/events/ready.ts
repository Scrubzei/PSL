import { Client, Events } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client) {
  console.log(`Bot is online! Logged in as ${client.user?.tag}`);
  console.log(`Serving ${client.guilds.cache.size} guild(s)`);

  // Set bot status
  client.user?.setPresence({
    activities: [{ name: '1v1 Leaderboards', type: 3 }], // 3 = Watching
    status: 'online',
  });
}
