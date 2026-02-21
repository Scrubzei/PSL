import { AttachmentBuilder, Client, Collection, ChannelType, GatewayIntentBits, REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

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
      const logoPath = join(__dirname, 'assets', 'logo.png');
      const logoAttachment = new AttachmentBuilder(logoPath, { name: 'logo.png' });
      const { createCanvas } = await import('canvas');
      const spacer = createCanvas(400, 1);
      const spacerAttachment = new AttachmentBuilder(spacer.toBuffer('image/png'), { name: 'spacer.png' });
      return {
        embeds: [{
          color: 0x4caf50,
          author: {
            name: '1v1 Leaderboards',
            icon_url: 'attachment://logo.png',
          },
          description: `<@${discordId}> signed up for **${tournamentName}**\n\n[View Tournament](${tournamentUrl})`,
          image: { url: 'attachment://spacer.png' },
        }],
        files: [logoAttachment, spacerAttachment],
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

const API_PORT = process.env.API_PORT || 3001;
app.listen(API_PORT, () => {
  console.log(`Botzei API server listening on port ${API_PORT}`);
});
