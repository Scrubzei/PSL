import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
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

// Tournament signup DM
app.post('/api/dm/tournament-signup', authMiddleware, async (req: express.Request, res: express.Response) => {
  console.log('[Botzei] Received tournament signup DM request:', JSON.stringify(req.body));
  try {
    const { discordId, username, tournamentName, tournamentId, spotsLeft, maxParticipants, startDate, roundDeadlines } = req.body;

    if (!discordId) {
      return res.status(400).json({ error: 'discordId is required' });
    }

    const user = await client.users.fetch(discordId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    const fields: { name: string; value: string; inline?: boolean }[] = [
      {
        name: 'Spots Filled',
        value: `${maxParticipants - spotsLeft}/${maxParticipants}`,
        inline: true,
      },
      {
        name: 'Spots Remaining',
        value: `${spotsLeft}`,
        inline: true,
      },
    ];

    // Add start date
    if (startDate) {
      const d = new Date(startDate);
      fields.push({
        name: 'Tournament Starts',
        value: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      });
    }

    // Add round schedule
    if (roundDeadlines && roundDeadlines.length > 0) {
      const scheduleLines = roundDeadlines.map((r: { name: string; deadline: string | null }) => {
        if (r.deadline) {
          const d = new Date(r.deadline);
          return `**${r.name}** — ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return `**${r.name}** — TBD`;
      });
      fields.push({
        name: '📅 Schedule',
        value: scheduleLines.join('\n'),
      });
    }

    // Add info about refs and no-shows
    fields.push({
      name: '📋 How It Works',
      value: 'Once the tournament starts, refs will help you schedule your matches. Each player picks a map and both agree on a third — if they can\'t agree, the website will randomly select it. If a time is agreed upon and a player fails to show, they may be disqualified.',
    });

    const embed = {
      color: 0x4caf50,
      title: '🎮 Tournament Registration Confirmed!',
      description: `You've successfully signed up for **${tournamentName}**!`,
      fields,
      footer: {
        text: '1v1 Leaderboards',
      },
      timestamp: new Date().toISOString(),
    };

    await user.send({
      content: `Hey ${username}! 👋`,
      embeds: [embed],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 5,
              label: 'View Tournament',
              url: `${frontendUrl}/tournaments/${tournamentId}`,
            },
          ],
        },
      ],
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error sending tournament signup DM:', error);

    if (error.code === 50007) {
      return res.status(400).json({ error: 'Cannot send DM to this user (DMs disabled)' });
    }

    res.status(500).json({ error: error.message || 'Failed to send DM' });
  }
});

const API_PORT = process.env.API_PORT || 3001;
app.listen(API_PORT, () => {
  console.log(`Botzei API server listening on port ${API_PORT}`);
});
