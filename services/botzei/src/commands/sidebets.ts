import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { getGuildSetup, getSidebetsForGuild } from '../sidebets/sidebet-manager.js';

const STATUS_EMOJI: Record<string, string> = {
  OPEN: '🔵',
  ACCEPTED: '🟡',
  LOCKED: '🟢',
  CANCELLED: '⚫',
};

export const data = new SlashCommandBuilder()
  .setName('sidebets')
  .setDescription('View all sidebets for the current tournament');

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const setup = getGuildSetup(guildId);
  if (!setup) {
    await interaction.reply({ content: 'No tournament set up for sidebets. Run `/sidebet-setup` first.', ephemeral: true });
    return;
  }

  const bets = getSidebetsForGuild(guildId);
  const activeBets = bets.filter(b => b.status !== 'CANCELLED');

  if (activeBets.length === 0) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22D3EE)
          .setTitle(`${setup.tournamentName} — Sidebets`)
          .setDescription('No sidebets yet. Use `/sidebet` to create one!'),
      ],
    });
    return;
  }

  const lines = activeBets.slice(0, 20).map(bet => {
    const otherPlayerName = bet.pickedPlayerId === bet.player1Id ? bet.player2Name : bet.player1Name;
    let line = `${STATUS_EMOJI[bet.status]} **#${bet.id}** — ${bet.player1Name} vs ${bet.player2Name}\n`;
    line += `  <@${bet.creatorDiscordId}> **$${bet.amount}** on **${bet.pickedPlayerName}**`;

    if (bet.acceptorDiscordId) {
      line += `\n  <@${bet.acceptorDiscordId}> **$${bet.amount}** on **${bet.acceptorPickedPlayerName}**`;
    } else {
      line += ` — *waiting for taker on ${otherPlayerName}*`;
    }

    if (bet.status === 'LOCKED') {
      line += ' 🔒';
    }

    return line;
  });

  const openCount = activeBets.filter(b => b.status === 'OPEN').length;
  const acceptedCount = activeBets.filter(b => b.status === 'ACCEPTED').length;
  const lockedCount = activeBets.filter(b => b.status === 'LOCKED').length;

  const footer = `${STATUS_EMOJI.OPEN} ${openCount} Open  ${STATUS_EMOJI.ACCEPTED} ${acceptedCount} Accepted  ${STATUS_EMOJI.LOCKED} ${lockedCount} Locked`;

  const embed = new EmbedBuilder()
    .setColor(0x22D3EE)
    .setTitle(`${setup.tournamentName} — Sidebets`)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: footer });

  if (activeBets.length > 20) {
    embed.setFooter({ text: `${footer}  •  Showing 20 of ${activeBets.length}` });
  }

  await interaction.reply({ embeds: [embed] });
}
