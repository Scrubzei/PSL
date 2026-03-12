import { AttachmentBuilder, Client, Collection, ChannelType, GatewayIntentBits, REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { initGameServers, releaseGameServer } from './queue/queue-manager.js';
import { GAME_SERVERS } from './queue/game-servers.config.js';
import { registerTimeoutHandler } from './commands/setup-queue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

// API Key for authentication
const BOT_API_KEY = process.env.BOT_API_KEY;

// Extend Client to include commands collection
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// Load commands
const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts') && !file.endsWith('.map'));

for (const file of commandFiles) {
  const command = await import(join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`Loaded command: ${command.data.name}`);
  }
}

// Load events
const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts') && !file.endsWith('.map'));

for (const file of eventFiles) {
  const event = await import(join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args: any[]) => event.execute(...args));
  } else {
    client.on(event.name, (...args: any[]) => event.execute(...args));
  }
  console.log(`Loaded event: ${event.name}`);
}

// Login
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is not set in environment variables');
  process.exit(1);
}

client.login(token);

// Initialize queue system
initGameServers(GAME_SERVERS);
registerTimeoutHandler(client);

// ============================================
// HTTP API Server for backend communication
// ============================================

const app = express();
app.use(express.json());

// Auth middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  if (!BOT_API_KEY) {
    console.error('[Botzei] BOT_API_KEY not configured!');
    return res.status(401).json({ error: 'Unauthorized - API key not configured' });
  }
  if (apiKey !== BOT_API_KEY) {
    console.error('[Botzei] Invalid API key provided');
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }
  next();
};

// Health check
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', bot: client.isReady() ? 'connected' : 'disconnected' });
});

// Send DM endpoint
app.post('/api/dm', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { discordId, message, embed } = req.body;

    if (!discordId) {
      return res.status(400).json({ error: 'discordId is required' });
    }

    if (!message && !embed) {
      return res.status(400).json({ error: 'message or embed is required' });
    }

    const user = await client.users.fetch(discordId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const dmOptions: any = {};
    if (message) dmOptions.content = message;
    if (embed) dmOptions.embeds = [embed];

    await user.send(dmOptions);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending DM:', error);

    // Handle specific Discord errors
    if (error.code === 50007) {
      return res.status(400).json({ error: 'Cannot send DM to this user (DMs disabled)' });
    }

    res.status(500).json({ error: error.message || 'Failed to send DM' });
  }
});

// Tournament signup channel announcement
app.post('/api/dm/tournament-signup', authMiddleware, async (req: express.Request, res: express.Response) => {
  console.log('[Botzei] Received tournament signup request:', JSON.stringify(req.body));
  try {
    const { discordId, username, tournamentName, tournamentId } = req.body;

    if (!discordId) {
      return res.status(400).json({ error: 'discordId is required' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const tournamentUrl = `${frontendUrl}/tournaments/${tournamentId}`;

    // Find the signups and general channels across all guilds
    let signupChannel = null;
    let generalChannel = null;
    for (const guild of client.guilds.cache.values()) {
      if (!signupChannel) {
        const found = guild.channels.cache.find(
          (ch) => ch.name === '༝︱signups' && ch.type === ChannelType.GuildText
        );
        if (found) signupChannel = found;
      }
      if (!generalChannel) {
        const found = guild.channels.cache.find(
          (ch) => ch.name === '༝︱general' && ch.type === ChannelType.GuildText
        );
        if (found) generalChannel = found;
      }
    }

    if (!signupChannel || !signupChannel.isTextBased()) {
      return res.status(404).json({ error: 'signups channel not found' });
    }

    const buildMessage = async () => {
      const { createCanvas } = await import('canvas');
      const spacer = createCanvas(400, 1);
      const spacerAttachment = new AttachmentBuilder(spacer.toBuffer('image/png'), { name: 'spacer.png' });
      return {
        embeds: [{
          color: 0x4caf50,
          author: {
            name: '1v1 Leaderboards',
          },
          description: `<@${discordId}> signed up for **${tournamentName}**\n\n[View Tournament](${tournamentUrl})`,
          image: { url: 'attachment://spacer.png' },
        }],
        files: [spacerAttachment],
      };
    };

    await signupChannel.send(await buildMessage());

    if (generalChannel && generalChannel.isTextBased()) {
      try {
        await generalChannel.send(await buildMessage());
      } catch (err) {
        console.error('[Botzei] Failed to post signup in general:', err);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending tournament signup announcement:', error);
    res.status(500).json({ error: error.message || 'Failed to send announcement' });
  }
});

// Tournament match result announcement
app.post('/api/tournament-match-result', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { tournamentName, tournamentSlug, winnerUsername, loserUsername, round, matchNumber, isFinal } = req.body;

    if (!tournamentName || !winnerUsername || !loserUsername) {
      return res.status(400).json({ error: 'tournamentName, winnerUsername, and loserUsername are required' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const bracketUrl = `${frontendUrl}/tournaments/${tournamentSlug}/bracket`;

    // Find the general channel
    let generalCh = null;
    for (const guild of client.guilds.cache.values()) {
      if (!generalCh) {
        const found = guild.channels.cache.find(
          (ch) => ch.name === '༝︱general' && ch.type === ChannelType.GuildText
        );
        if (found) generalCh = found;
      }
    }

    if (!generalCh || !generalCh.isTextBased()) {
      return res.status(404).json({ error: 'general channel not found' });
    }

    const { createCanvas } = await import('canvas');
    const spacer = createCanvas(400, 1);
    const spacerAttachment = new AttachmentBuilder(spacer.toBuffer('image/png'), { name: 'spacer.png' });

    const description = isFinal
      ? `### 🏆 ${winnerUsername} wins!\n\nDefeated **${loserUsername}** in the Grand Finals\n\n**${tournamentName}**\n[View Bracket](${bracketUrl})`
      : `### ${winnerUsername} defeated ${loserUsername}\n\nMatch ${matchNumber} · Round ${round} · **${tournamentName}**\n\n[View Bracket](${bracketUrl})`;

    const color = isFinal ? 0xFFD700 : 0x4caf50;

    await generalCh.send({
      embeds: [{
        color,
        author: {
          name: '1v1 Leaderboards',
        },
        description,
        image: { url: 'attachment://spacer.png' },
      }],
      files: [spacerAttachment],
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending tournament match result:', error);
    res.status(500).json({ error: error.message || 'Failed to send match result' });
  }
});

// Send message to a specific channel
app.post('/api/channel-message', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { channelId, message, embed } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    if (!message && !embed) {
      return res.status(400).json({ error: 'message or embed is required' });
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      return res.status(404).json({ error: 'Channel not found or not a text channel' });
    }

    const sendOptions: any = {};
    if (message) sendOptions.content = message;
    if (embed) sendOptions.embeds = [embed];

    await channel.send(sendOptions);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending channel message:', error);
    res.status(500).json({ error: error.message || 'Failed to send channel message' });
  }
});

// Queue match result — called by game servers when a match ends
app.post('/api/queue/match-result', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { serverId } = req.body;

    if (!serverId) {
      return res.status(400).json({ error: 'serverId is required' });
    }

    const released = releaseGameServer(serverId);
    if (!released) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // TODO: Record match result, update leaderboard, etc.
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error handling queue match result:', error);
    res.status(500).json({ error: error.message || 'Failed to process match result' });
  }
});

// Pluto game result — posts match result to Discord
app.post('/api/pluto-game-result', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { winnerName, loserName, winnerScore, loserScore, mapName, winnerRecord } = req.body;

    if (!winnerName || !loserName || winnerScore === undefined || loserScore === undefined || !mapName) {
      return res.status(400).json({ error: 'winnerName, loserName, winnerScore, loserScore, and mapName are required' });
    }

    const channelId = '1465077201954410557';
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const isNuke = loserScore === 0 && winnerScore >= 50;
    const plutoLogoAttachment = new AttachmentBuilder(join(__dirname, 'assets', 'plutonium.png'), { name: 'plutonium.png' });
    const files: AttachmentBuilder[] = [plutoLogoAttachment];

    let description: string;
    if (isNuke) {
      const nukeAttachment = new AttachmentBuilder(join(__dirname, 'assets', 'nuke.gif'), { name: 'nuke.gif' });
      files.push(nukeAttachment);
      description = `**${winnerName} dropped a 50-0 on ${loserName}!**\nSeries: **${winnerName}** leads ${winnerRecord}\n[Join Server](https://discord.com/channels/${process.env.DISCORD_GUILD_ID}/1481499199173300284)`;
    } else {
      description = `**${winnerName}** beat **${loserName}** on ${mapName} (${winnerScore}-${loserScore})\nSeries: **${winnerName}** leads ${winnerRecord}\n[Join Server](https://discord.com/channels/${process.env.DISCORD_GUILD_ID}/1481499199173300284)`;
    }

    await channel.send({
      embeds: [{
        color: isNuke ? 0xFFD700 : 0xff4444,
        thumbnail: isNuke ? { url: 'attachment://nuke.gif' } : undefined,
        description,
        footer: { text: 'Plutonium · Black Ops 2', icon_url: 'attachment://plutonium.png' },
        timestamp: new Date().toISOString(),
      }],
      files,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error posting pluto game result:', error);
    res.status(500).json({ error: error.message || 'Failed to post game result' });
  }
});

const API_PORT = process.env.API_PORT || 3001;
app.listen(API_PORT, () => {
  console.log(`Botzei API server listening on port ${API_PORT}`);
});
