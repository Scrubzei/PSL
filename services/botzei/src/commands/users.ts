import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

interface SiteUser {
  username: string;
  discordId?: string;
  xboxGamertag?: string;
  plutoniumUsername?: string;
  plutoId?: string;
}

export const data = new SlashCommandBuilder()
  .setName('users')
  .setDescription('List all site users with their Discord accounts');

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await fetch(`${BACKEND_URL}/users`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const users = (await res.json() as SiteUser[])
      .filter(u => u.username)
      .sort((a, b) => a.username.localeCompare(b.username));

    if (users.length === 0) {
      await interaction.editReply({ content: 'No users found.' });
      return;
    }

    const lines = users.map(u => {
      const parts: string[] = [];
      parts.push(u.discordId ? `<@${u.discordId}>` : 'no Discord');
      if (u.xboxGamertag) parts.push(`GT: ${u.xboxGamertag}`);
      if (u.plutoniumUsername) parts.push(`Pluto: ${u.plutoniumUsername}`);
      if (u.plutoId) parts.push(`PID: ${u.plutoId}`);
      return `**${u.username}** — ${parts.join(' · ')}`;
    });

    // Discord embed description max is 4096 chars, split if needed
    const chunks: string[] = [];
    let current = '';
    for (const line of lines) {
      if ((current + '\n' + line).length > 4000) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? current + '\n' + line : line;
      }
    }
    if (current) chunks.push(current);

    const embeds = chunks.map((chunk, i) =>
      new EmbedBuilder()
        .setColor(0x22d3ee)
        .setTitle(i === 0 ? `Users (${users.length})` : null)
        .setDescription(chunk)
    );

    await interaction.editReply({ embeds: embeds.slice(0, 10) });
  } catch (error) {
    console.error('Error in /users:', error);
    await interaction.editReply({ content: 'Failed to fetch users.' });
  }
}
