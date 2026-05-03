import { AttachmentBuilder, Client, Collection, ChannelType, GatewayIntentBits, REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { initTimers } from './queue/handlers.js';
import { ensureLoaded as ensurePlutoLoaded, getState as getPlutoState } from './plutonium-queue/storage.js';
import { initPlutoTimers, startQueuePoller } from './plutonium-queue/handlers.js';
import { createQueue, setQueueMessageId, deleteQueue, updateQueue, findQueueById } from './queue/queue-service.js';
import { buildQueueEmbed, buildQueueButtons } from './queue/ui.js';
import { createQueue as createPlutoQueue, setQueueMessageId as setPlutoQueueMessageId, deleteQueue as deletePlutoQueue, findQueueById as findPlutoQueueById } from './plutonium-queue/queue-service.js';
import { buildQueueEmbed as buildPlutoQueueEmbed, buildQueueButtons as buildPlutoQueueButtons } from './plutonium-queue/ui.js';
import { loadState, ensureLoaded } from './queue/storage.js';
import { getGuildSettings, setGuildSettings, getAllGuildSettings, getGuildsWithChannel, ensureGuildSettingsLoaded } from './guild-settings.js';

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

// Load state from database, then resume timers
client.once('ready', async () => {
  await ensureLoaded();
  await ensurePlutoLoaded();
  await ensureGuildSettingsLoaded();
  await loadServerInfoTargets();
  initTimers(client);
  initPlutoTimers(client);
  startQueuePoller(client);
});

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

// Bot info
app.get('/api/guilds', authMiddleware, (_req: express.Request, res: express.Response) => {
  const guilds = client.guilds.cache.map((g) => ({
    id: g.id,
    name: g.name,
    icon: g.iconURL({ size: 64 }),
    memberCount: g.memberCount,
    ownerId: g.ownerId,
    joinedAt: g.joinedAt?.toISOString(),
  }));
  res.json({ guilds, botUser: client.user?.username, uptime: client.uptime });
});

// Guild settings
app.get('/api/guild/:guildId/settings', authMiddleware, (req: express.Request, res: express.Response) => {
  res.json(getGuildSettings(req.params.guildId));
});

app.patch('/api/guild/:guildId/settings', authMiddleware, (req: express.Request, res: express.Response) => {
  const updated = setGuildSettings(req.params.guildId, req.body);
  res.json(updated);
});

// List text channels in a guild
app.get('/api/guild/:guildId/channels', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const channels = guild.channels.cache
      .filter((c) => c.type === ChannelType.GuildText)
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(channels);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Server info embed updates
import { getTargets, buildServerInfoEmbed, buildJoinServerRow, loadServerInfoTargets } from './commands/setup-server-info.js';

app.post('/api/server-info', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { player1Name, player2Name, player1Score, player2Score, map, spectatorNames, server } = req.body;

    if (!server) {
      return res.status(400).json({ error: 'server name is required' });
    }

    const targets = getTargets(server);

    if (targets.length === 0) {
      return res.json({ updated: 0, message: `No server info embeds for "${server}"` });
    }

    const { embed, files, components } = buildServerInfoEmbed({
      server,
      player1Name,
      player2Name,
      player1Score: player1Score ?? 0,
      player2Score: player2Score ?? 0,
      map: map || 'Unknown',
      spectatorNames,
    });

    let updated = 0;
    for (const target of targets) {
      try {
        const channel = await client.channels.fetch(target.channelId);
        if (!channel || !('messages' in channel)) continue;
        const msg = await (channel as any).messages.fetch(target.messageId).catch(() => null);
        if (!msg) continue;
        await msg.edit({ embeds: [embed], files, components });
        updated++;
      } catch (err) {
        console.error(`[ServerInfo] Failed to update embed in ${target.channelId}:`, err);
      }
    }

    res.json({ updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update server info' });
  }
});

// Queue management (web panel)
app.get('/api/queues', authMiddleware, (_req: express.Request, res: express.Response) => {
  const state = loadState();
  const standardQueues = state.queues.map((q) => ({
    id: q.id,
    guildId: q.guildId,
    channelId: q.channelId,
    queueType: q.queueType || 'standard',
    matchThreadChannelId: q.matchThreadChannelId,
    resultChannelIds: q.resultChannelIds || [],
    leaderboardId: q.leaderboardId,
    title: q.title,
    game: q.game,
    platform: q.platform,
    maps: q.maps,
    playerCount: q.players.length,
    createdAt: q.createdAt,
  }));

  const plutoState = getPlutoState();
  const plutoQueues = plutoState.queues.map((q: any) => ({
    id: q.id,
    guildId: q.guildId,
    channelId: q.channelId,
    queueType: 'plutonium',
    leaderboardId: q.leaderboardId,
    title: q.title,
    game: q.game,
    platform: q.platform,
    maps: q.maps,
    playerCount: q.players.length,
    createdAt: q.createdAt,
  }));

  res.json([...standardQueues, ...plutoQueues]);
});

app.post('/api/queues', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { guildId, channelId, queueType, matchThreadChannelId, resultChannelIds, leaderboardId, title, game, platform, maps } = req.body;

    if (!guildId || !channelId || !leaderboardId || !title || !game || !platform || !maps?.length) {
      return res.status(400).json({ error: 'guildId, channelId, leaderboardId, title, game, platform, and maps are required' });
    }

    // Route to plutonium queue module
    if (queueType === 'plutonium') {
      const queue = createPlutoQueue({ guildId, channelId, leaderboardId, title, game, platform, maps });

      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased() || !('send' in channel)) {
        deletePlutoQueue(queue.id);
        return res.status(404).json({ error: 'Channel not found or not a text channel' });
      }

      const { embed, files } = buildPlutoQueueEmbed(queue);
      const message = await channel.send({
        embeds: [embed],
        components: buildPlutoQueueButtons(queue),
        files,
      });
      setPlutoQueueMessageId(queue.id, message.id);

      return res.json({ id: queue.id, messageId: message.id });
    }

    // Standard queue
    const queue = createQueue({
      guildId,
      channelId,
      leaderboardId,
      queueType: queueType || 'standard',
      matchThreadChannelId: matchThreadChannelId || undefined,
      resultChannelIds: resultChannelIds?.length ? resultChannelIds : undefined,
      title,
      game,
      platform,
      maps,
    });

    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      deleteQueue(queue.id);
      return res.status(404).json({ error: 'Channel not found or not a text channel' });
    }

    const { embed, files } = buildQueueEmbed(queue);
    const message = await channel.send({
      embeds: [embed],
      components: buildQueueButtons(queue),
      files,
    });
    setQueueMessageId(queue.id, message.id);

    res.json({ id: queue.id, messageId: message.id });
  } catch (err: any) {
    console.error('[Queue API] Failed to create queue:', err);
    res.status(500).json({ error: err.message || 'Failed to create queue' });
  }
});

app.patch('/api/queues/:queueId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const queue = findQueueById(req.params.queueId);
    if (!queue) return res.status(404).json({ error: 'Queue not found' });

    const updated = updateQueue(queue.id, req.body);
    if (!updated) return res.status(500).json({ error: 'Failed to update queue' });

    // Re-post the embed in the (possibly new) channel
    try {
      // Delete old message
      const oldChannel = await client.channels.fetch(queue.channelId).catch(() => null);
      if (oldChannel && 'messages' in oldChannel) {
        const oldMsg = await (oldChannel as any).messages.fetch(queue.messageId).catch(() => null);
        if (oldMsg) await oldMsg.delete().catch(() => {});
      }

      // Post new embed
      const newChannel = await client.channels.fetch(updated.channelId);
      if (newChannel && 'send' in newChannel) {
        const { embed, files } = buildQueueEmbed(updated);
        const newMsg = await newChannel.send({
          embeds: [embed],
          components: buildQueueButtons(updated),
          files,
        });
        setQueueMessageId(updated.id, newMsg.id);
      }
    } catch (err) {
      console.error('[Queue API] Failed to re-post queue embed:', err);
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update queue' });
  }
});

app.delete('/api/queues/:queueId', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const queueId = req.params.queueId;
    const queue = findQueueById(queueId);
    const plutoQueue = findPlutoQueueById(queueId);
    const target = queue || plutoQueue;
    if (!target) return res.status(404).json({ error: 'Queue not found' });

    // Try to delete the Discord message
    try {
      const channel = await client.channels.fetch(target.channelId);
      if (channel && 'messages' in channel) {
        const msg = await (channel as any).messages.fetch(target.messageId).catch(() => null);
        if (msg) await msg.delete().catch(() => {});
      }
    } catch {}

    if (queue) deleteQueue(queue.id);
    if (plutoQueue) deletePlutoQueue(plutoQueue.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete queue' });
  }
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

    const description = isFinal
      ? `### 🏆 ${winnerUsername} wins!\n\nDefeated **${loserUsername}** in the Grand Finals\n\n**${tournamentName}**\n[View Bracket](${bracketUrl})`
      : `### ${winnerUsername} defeated ${loserUsername}\n\nMatch ${matchNumber} · Round ${round} · **${tournamentName}**\n\n[View Bracket](${bracketUrl})`;

    const color = isFinal ? 0xFFD700 : 0x4caf50;

    // Collect all tournament channels from guild settings
    const targets = getGuildsWithChannel('tournamentChannelId');
    // Fallback: search for ༝︱general channel
    if (targets.length === 0) {
      for (const guild of client.guilds.cache.values()) {
        const found = guild.channels.cache.find(
          (ch) => ch.name === '༝︱general' && ch.type === ChannelType.GuildText
        );
        if (found) {
          targets.push({ guildId: guild.id, channelId: found.id });
          break;
        }
      }
    }

    for (const target of targets) {
      try {
        const ch = await client.channels.fetch(target.channelId);
        if (!ch || !ch.isTextBased() || !('send' in ch)) continue;

        const { createCanvas } = await import('canvas');
        const spacer = createCanvas(400, 1);
        const spacerAttachment = new AttachmentBuilder(spacer.toBuffer('image/png'), { name: 'spacer.png' });

        await ch.send({
          embeds: [{
            color,
            author: { name: '1v1 Leaderboards' },
            description,
            image: { url: 'attachment://spacer.png' },
          }],
          files: [spacerAttachment],
        });
      } catch (err) {
        console.error(`[Tournament] Failed to post to channel ${target.channelId}:`, err);
      }
    }

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

// Pluto game result — posts match result to Discord
app.post('/api/pluto-game-result', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { winnerName, loserName, winnerScore, loserScore, mapName, winnerRecord, platform, eloChanges } = req.body;
    const plat = (platform || 'plutonium').toLowerCase();

    if (!winnerName || !loserName || winnerScore === undefined || loserScore === undefined || !mapName) {
      return res.status(400).json({ error: 'winnerName, loserName, winnerScore, loserScore, and mapName are required' });
    }

    const isNuke = loserScore === 0 && winnerScore >= 50;

    // Collect all channels to post to from guild settings
    const targets = getGuildsWithChannel('gameFeedChannelId');
    // Fallback to hardcoded channel if no guilds configured
    if (targets.length === 0) {
      targets.push({ guildId: '', channelId: '1481570502521917562' });
    }

    const PLATFORM_COLORS: Record<string, number> = {
      plutonium: 0xff4444,
      iw4x: 0x4caf50,
    };
    const PLATFORM_LABELS: Record<string, string> = {
      plutonium: 'Plutonium · Black Ops 2',
      iw4x: 'IW4X · Modern Warfare 2',
    };

    const embedColor = PLATFORM_COLORS[plat] ?? 0xff4444;
    const footerText = PLATFORM_LABELS[plat] ?? plat;

    let description: string;
    let seriesText = '';
    if (winnerRecord) {
      const [w, l] = winnerRecord.split('-').map(Number);
      if (w > l) {
        seriesText = `Series: **${winnerName}** leads ${winnerRecord}`;
      } else if (l > w) {
        seriesText = `Series: **${loserName}** leads ${l}-${w}`;
      } else {
        seriesText = `Series: Tied ${winnerRecord}`;
      }
    }

    let eloText = '';
    if (eloChanges) {
      const wChange = eloChanges.winner?.change;
      const lChange = eloChanges.loser?.change;
      if (wChange != null && lChange != null) {
        eloText = `ELO: **${winnerName}** ${wChange >= 0 ? '+' : ''}${wChange} (${eloChanges.winner.after}) · **${loserName}** ${lChange >= 0 ? '+' : ''}${lChange} (${eloChanges.loser.after})`;
      }
    }

    const details = [seriesText, eloText].filter(Boolean).join('\n');
    const joinLink = `[Join Server](https://discord.com/channels/${process.env.DISCORD_GUILD_ID}/1481499199173300284)`;

    if (isNuke) {
      description = `**${winnerName} dropped a 50-0 on ${loserName}!** \`FF\`\n${details}\n${joinLink}`;
    } else {
      description = `**${winnerName}** beat **${loserName}** on ${mapName} (${winnerScore}-${loserScore}) \`FF\`\n${details}\n${joinLink}`;
    }

    for (const target of targets) {
      try {
        const channel = await client.channels.fetch(target.channelId);
        if (!channel || !channel.isTextBased() || !('send' in channel)) continue;

        const files: AttachmentBuilder[] = [];
        if (plat !== 'iw4x') {
          files.push(new AttachmentBuilder(join(__dirname, 'assets', 'plutonium.png'), { name: 'logo.png' }));
        }
        if (isNuke) {
          files.push(new AttachmentBuilder(join(__dirname, 'assets', 'nuke.gif'), { name: 'nuke.gif' }));
        }

        await channel.send({
          embeds: [{
            color: isNuke ? 0xFFD700 : embedColor,
            thumbnail: isNuke ? { url: 'attachment://nuke.gif' } : undefined,
            description,
            footer: { text: footerText, icon_url: plat !== 'iw4x' ? 'attachment://logo.png' : undefined },
            timestamp: new Date().toISOString(),
          }],
          files,
        });
      } catch (err) {
        console.error(`[GameFeed] Failed to post to channel ${target.channelId}:`, err);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error posting pluto game result:', error);
    res.status(500).json({ error: error.message || 'Failed to post game result' });
  }
});

// Matchfinder listing — posts to Discord with accept/cancel buttons
const MATCHFINDER_CHANNEL_ID = '1481711178559524895';

const PLATFORM_COLORS: Record<string, number> = {
  plutonium: 0xBF2120,
  iw4x: 0x7C3AED,
  xbox: 0x107C10,
  ps3: 0x003791,
  playstation: 0x003791,
};

app.post('/api/matchfinder-listing', authMiddleware, async (req: express.Request, res: express.Response) => {
  try {
    const { matchId, username, game, platform, bestOf, selectedMaps } = req.body;

    if (!matchId || !username || !game || !platform) {
      return res.status(400).json({ error: 'matchId, username, game, and platform are required' });
    }

    const channel = await client.channels.fetch(MATCHFINDER_CHANNEL_ID);
    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      return res.status(404).json({ error: 'Matchfinder channel not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const gameSlug = game.toLowerCase();
    const platformSlug = platform.toLowerCase();
    const color = PLATFORM_COLORS[platformSlug] || 0x2563EB;

    const mapsDisplay = (selectedMaps || []).join('  ·  ');

    const { createCanvas } = await import('canvas');
    const spacer = createCanvas(400, 1);
    const spacerAttachment = new AttachmentBuilder(spacer.toBuffer('image/png'), { name: 'spacer.png' });

    const embed = {
      title: `${username} is looking for a match`,
      description: [
        `**Game:** ${game}`,
        `**Platform:** ${platform}`,
        `**Best of:** ${bestOf}`,
        `**Maps:** ${mapsDisplay}`,
      ].join('\n'),
      color,
      image: { url: 'attachment://spacer.png' },
      footer: { text: 'Matchfinder' },
      timestamp: new Date().toISOString(),
    };

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');

    const row = new ActionRowBuilder<any>().addComponents(
      new ButtonBuilder()
        .setLabel('View on Website')
        .setStyle(ButtonStyle.Link)
        .setURL(`${frontendUrl}/matchfinder/${gameSlug}/${platformSlug}`),
    );

    await channel.send({ embeds: [embed], components: [row], files: [spacerAttachment] });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error posting matchfinder listing:', error);
    res.status(500).json({ error: error.message || 'Failed to post matchfinder listing' });
  }
});

const API_PORT = process.env.API_PORT || 3001;
app.listen(API_PORT, () => {
  console.log(`Botzei API server listening on port ${API_PORT}`);
});
