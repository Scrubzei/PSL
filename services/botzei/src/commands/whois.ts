import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('whois')
  .setDescription('Look up a Discord user by their ID')
  .addStringOption(option =>
    option
      .setName('id')
      .setDescription('The Discord user ID')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const discordId = interaction.options.get('id', true).value as string;

  try {
    const user = await interaction.client.users.fetch(discordId);
    await interaction.reply({
      content: `\`${discordId}\` → **${user.username}**${user.globalName ? ` (${user.globalName})` : ''}`,
      ephemeral: true,
    });
  } catch {
    await interaction.reply({
      content: `Could not find a user with ID \`${discordId}\``,
      ephemeral: true,
    });
  }
}
