import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('members')
  .setDescription('List all server members with their Discord IDs')
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
  const lines = members
    .filter((m) => !m.user.bot)
    .sort((a, b) => a.user.username.localeCompare(b.user.username))
    .map((m) => `${m.user.username} — ${m.id}`);

  // Discord message limit is 2000 chars, split into chunks
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current.length + line.length + 1 > 1900) {
      chunks.push(current);
      current = '';
    }
    current += (current ? '\n' : '') + line;
  }
  if (current) chunks.push(current);

  if (chunks.length === 0) {
    await interaction.editReply({ content: 'No members found.' });
    return;
  }

  await interaction.editReply({ content: `**${lines.length} members:**\n\`\`\`\n${chunks[0]}\n\`\`\`` });

  for (let i = 1; i < chunks.length; i++) {
    await interaction.followUp({ content: `\`\`\`\n${chunks[i]}\n\`\`\``, ephemeral: true });
  }
}
