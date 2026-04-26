import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getBackendUrl() { return process.env.BACKEND_URL || 'http://localhost:3000'; }
function getApiKey() { return process.env.BOT_API_KEY || ''; }

export const data = new SlashCommandBuilder()
  .setName('setup-server-info')
  .setDescription('Post a live server info embed in this channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addStringOption((o) =>
    o.setName('server').setDescription('Server name (used to route updates)').setRequired(true),
  );

// In-memory cache, loaded from DB on startup
interface ServerInfoTarget {
  id?: number;
  serverName: string;
  channelId: string;
  messageId: string;
}

let targets: ServerInfoTarget[] = [];

export function getTargets(serverName?: string): ServerInfoTarget[] {
  if (serverName) {
    return targets.filter((t) => t.serverName.toLowerCase() === serverName.toLowerCase());
  }
  return targets;
}

export async function loadServerInfoTargets(): Promise<void> {
  try {
    const res = await fetch(`${getBackendUrl()}/botzei/server-info-targets`, {
      headers: { 'x-api-key': getApiKey() },
    });
    if (res.ok) {
      targets = await res.json() as ServerInfoTarget[];
      if (targets.length > 0) {
        console.log(`[ServerInfo] Loaded ${targets.length} target(s) from database`);
      }
    }
  } catch (err) {
    console.error('[ServerInfo] Failed to load targets:', err);
  }
}

async function saveTarget(target: ServerInfoTarget): Promise<void> {
  try {
    const res = await fetch(`${getBackendUrl()}/botzei/server-info-targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': getApiKey() },
      body: JSON.stringify({ serverName: target.serverName, channelId: target.channelId, messageId: target.messageId }),
    });
    if (res.ok) {
      const saved = await res.json() as any;
      target.id = saved.id;
    }
  } catch (err) {
    console.error('[ServerInfo] Failed to save target:', err);
  }
}

// ---------------------------------------------------------------------------
// Embeds
// ---------------------------------------------------------------------------

function buildIdleEmbed(serverName?: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(serverName ? `${serverName}` : 'Server Status')
    .setColor(0x2b2d31)
    .setDescription('Waiting for players...')
    .setFooter({ text: '1v1 Leaderboards' })
    .setTimestamp();
}

function getMapAttachment(mapName: string): AttachmentBuilder | null {
  const slug = mapName.toLowerCase().replace(/\s+/g, '-');
  const bannerPath = join(__dirname, '..', 'assets', 'maps', `${slug}-banner.webp`);
  if (existsSync(bannerPath)) {
    return new AttachmentBuilder(bannerPath, { name: 'map.webp' });
  }
  const extensions = ['webp', 'png', 'jpg'];
  for (const ext of extensions) {
    const path = join(__dirname, '..', 'assets', 'maps', `${slug}.${ext}`);
    if (existsSync(path)) {
      return new AttachmentBuilder(path, { name: 'map.webp' });
    }
  }
  return null;
}

export function buildServerInfoEmbed(data: {
  server?: string;
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  map: string;
  spectatorNames?: string[];
}): { embed: EmbedBuilder; files: AttachmentBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const p1 = data.player1Name;
  const p2 = data.player2Name;
  const s1 = data.player1Score;
  const s2 = data.player2Score;

  const files: AttachmentBuilder[] = [];
  const mapAttachment = getMapAttachment(data.map);

  const embed = new EmbedBuilder()
    .setTitle(data.server || `${p1} vs ${p2}`)
    .setColor(0xff4444)
    .addFields(
      { name: p1, value: `**${s1}**`, inline: true },
      { name: '\u200b', value: '**—**', inline: true },
      { name: p2, value: `**${s2}**`, inline: true },
    )
    .setFooter({ text: `${data.map} · 1v1 Leaderboards` })
    .setTimestamp();

  if (mapAttachment) {
    files.push(mapAttachment);
    embed.setImage('attachment://map.webp');
  }

  if (data.spectatorNames?.length) {
    embed.addFields({
      name: `Spectators (${data.spectatorNames.length})`,
      value: data.spectatorNames.join(', '),
    });
  }

  return { embed, files, components: [buildJoinServerRow()] };
}

export function buildJoinServerRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('server:join')
      .setLabel('Join Server')
      .setStyle(ButtonStyle.Success),
  );
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const serverName = interaction.options.getString('server', true).trim();
  const channel = interaction.channel;
  if (!channel || !('send' in channel)) {
    await interaction.reply({ content: 'Must be run in a text channel.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const msg = await channel.send({
    embeds: [buildIdleEmbed(serverName)],
    components: [buildJoinServerRow()],
  });

  const target: ServerInfoTarget = {
    serverName,
    channelId: channel.id,
    messageId: msg.id,
  };

  targets.push(target);
  await saveTarget(target);

  await interaction.editReply({ content: `Server info embed for **${serverName}** posted.` });
}
