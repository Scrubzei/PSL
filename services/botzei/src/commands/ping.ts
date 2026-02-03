import { SlashCommandBuilder, CommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check if the bot is alive');

export async function execute(interaction: CommandInteraction) {
  const latency =Date.now() - interaction.createdTimestamp;
  const apiLatency = Math.round(interaction.client.ws.ping);

  await interaction.reply({
    content: `Pong! Latency: ${latency}ms | API: ${apiLatency}ms`,
    ephemeral: true,
  });
}
