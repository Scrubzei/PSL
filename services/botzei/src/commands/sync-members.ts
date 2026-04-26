import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { api } from '../utils/api.js';

export const data = new SlashCommandBuilder()
  .setName('sync-members')
  .setDescription('Create website accounts for all server members')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: 'Must be run in a server.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const members = await interaction.guild.members.fetch();
  const humans = members.filter((m) => !m.user.bot);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const [, member] of humans) {
    const discordId = member.id;
    const username = member.nickname || member.user.displayName;

    try {
      const existing = await api.getUserByDiscordId(discordId);
      if (existing) {
        skipped++;
        continue;
      }
    } catch {
      // Not found — create below
    }

    try {
      await api.createUser({ discordId, username });
      created++;
    } catch {
      failed++;
    }
  }

  await interaction.editReply({
    content: `**Sync complete**\n• Created: ${created}\n• Already existed: ${skipped}\n• Failed: ${failed}\n• Total members: ${humans.size}`,
  });
}
