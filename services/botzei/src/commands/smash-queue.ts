import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { loadState, saveState } from '../queue/storage.js';

export const data = new SlashCommandBuilder()
  .setName('smash-queue')
  .setDescription('Wipe all queue and match state')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const state = loadState();
  const queueCount = state.queues.length;
  const matchCount = state.matches.length;

  state.queues = [];
  state.matches = [];
  saveState();

  await interaction.reply({
    content: `Wiped **${queueCount}** queue(s) and **${matchCount}** match(es). Clean slate.`,
    ephemeral: true,
  });
}
