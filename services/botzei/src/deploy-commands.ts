import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

const commands: any[] = [];
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts') && !file.endsWith('.map'));

for (const file of commandFiles) {
  const command = await import(join(commandsPath, file));
  if ('data' in command) {
    commands.push(command.data.toJSON());
    console.log(`Prepared command: ${command.data.name}`);
  }
}

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID');
  process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Refreshing ${commands.length} slash commands...`);

    if (guildId) {
      // Guild commands (instant update - for development)
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log(`Successfully registered commands to guild ${guildId}`);
    } else {
      // Global commands (takes up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log('Successfully registered global commands');
    }
  } catch (error) {
    console.error('Error deploying commands:', error);
  }
})();
