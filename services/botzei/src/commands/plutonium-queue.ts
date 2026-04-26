/**
 * /plutonium-queue
 *
 * Same as /setup-queue but creates a Plutonium-type queue.
 * When the queue pops, instead of creating a match thread with
 * ready-up/map-selection/reporting, it just sends a connect message
 * to both players in the channel.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { api } from '../utils/api.js';
import {
  createQueue,
  deleteQueue,
  setQueueMessageId,
} from '../plutonium-queue/queue-service.js';
import { buildQueueEmbed, buildQueueButtons } from '../plutonium-queue/ui.js';

interface PendingSetup {
  leaderboardId: string;
  game: string;
  platform: string;
  title: string;
  channelId: string;
  guildId: string;
}

const pendingSetups = new Map<string, PendingSetup>();

export const data = new SlashCommandBuilder()
  .setName('plutonium-queue')
  .setDescription('Set up a Plutonium 1v1 queue (auto-connect on pop)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addStringOption((o) =>
    o
      .setName('leaderboard')
      .setDescription('Leaderboard (game + platform)')
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addStringOption((o) =>
    o
      .setName('title')
      .setDescription('Queue title')
      .setRequired(true),
  );

export async function autocomplete(
  interaction: import('discord.js').AutocompleteInteraction,
): Promise<void> {
  try {
    const leaderboards = await api.getLeaderboards();
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = leaderboards
      .map((lb: any) => ({
        name: `${lb.game?.name ?? '?'} — ${lb.platform?.name ?? '?'}`,
        value: lb.id,
      }))
      .filter((c: any) => c.name.toLowerCase().includes(focused))
      .slice(0, 25);
    await interaction.respond(choices);
  } catch {
    await interaction.respond([]);
  }
}

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const leaderboardId = interaction.options.getString('leaderboard', true).trim();
  const title = interaction.options.getString('title', true).trim();

  const channel = interaction.channel;
  if (!channel || !('send' in channel) || !interaction.guildId) {
    await interaction.reply({
      content: 'This command must be run in a server text channel.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  let leaderboard: any;
  try {
    const all = await api.getLeaderboards();
    leaderboard = all.find((lb: any) => lb.id === leaderboardId);
    if (!leaderboard) {
      await interaction.editReply({ content: 'Leaderboard not found.' });
      return;
    }
  } catch (err: any) {
    await interaction.editReply({ content: `Failed to fetch leaderboards: ${err.message}` });
    return;
  }

  const game = leaderboard.game?.name ?? 'Unknown';
  const platform = leaderboard.platform?.name ?? 'Unknown';

  let maps: { id: string; mapName: string }[];
  try {
    maps = await api.getMapsByGame(game);
  } catch (err: any) {
    await interaction.editReply({ content: `Failed to fetch maps: ${err.message}` });
    return;
  }

  if (maps.length === 0) {
    await interaction.editReply({ content: `No maps found for ${game}.` });
    return;
  }

  pendingSetups.set(interaction.user.id, {
    leaderboardId, game, platform, title,
    channelId: channel.id, guildId: interaction.guildId,
  });

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('pluto_queue_setup_maps')
      .setPlaceholder('Select maps for this queue')
      .setMinValues(1)
      .setMaxValues(maps.length)
      .addOptions(maps.map((m) => ({ label: m.mapName, value: m.mapName }))),
  );

  await interaction.editReply({
    content: `**${title}** — ${game} · ${platform}\n\nSelect maps:`,
    components: [selectRow],
  });
}

export async function handleMapSelect(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const pending = pendingSetups.get(interaction.user.id);
  if (!pending) {
    await interaction.reply({ content: 'No pending setup. Run /plutonium-queue again.', ephemeral: true });
    return;
  }

  const selectedMaps = interaction.values;
  if (selectedMaps.length === 0) {
    await interaction.reply({ content: 'No maps selected.', ephemeral: true });
    return;
  }

  pendingSetups.delete(interaction.user.id);
  await interaction.deferUpdate();

  const queue = createQueue({
    guildId: pending.guildId,
    channelId: pending.channelId,
    leaderboardId: pending.leaderboardId,
    title: pending.title,
    game: pending.game,
    platform: pending.platform,
    maps: selectedMaps,
  });

  try {
    const channel = await interaction.client.channels.fetch(pending.channelId);
    if (!channel || !('send' in channel)) {
      deleteQueue(queue.id);
      await interaction.editReply({ content: 'Failed to access the channel.', components: [] });
      return;
    }

    const { embed, files } = buildQueueEmbed(queue);
    const message = await channel.send({
      embeds: [embed],
      components: buildQueueButtons(queue),
      files,
    });
    setQueueMessageId(queue.id, message.id);

    await interaction.editReply({
      content: `Plutonium queue **${pending.title}** posted with maps: ${selectedMaps.join(', ')}`,
      components: [],
    });
  } catch (err: any) {
    console.error('[PlutoQueue] Failed to post queue message:', err);
    deleteQueue(queue.id);
    await interaction.editReply({
      content: `Failed to post queue: ${err.message || 'Unknown error'}`,
      components: [],
    });
  }
}
