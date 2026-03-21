import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import { api } from '../utils/api.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

export async function handleMatchfinderAccept(interaction: ButtonInteraction) {
  const matchId = interaction.customId.replace('mf_accept_', '');
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    const match = await api.acceptMatchfinderListing(matchId, discordId);

    // Update the original message to show it's been accepted
    const originalEmbed = interaction.message.embeds[0];
    const updatedEmbed = EmbedBuilder.from(originalEmbed)
      .setTitle(`${originalEmbed.title} — Accepted!`)
      .setColor(0x22C55E)
      .addFields({ name: 'Accepted by', value: interaction.user.username, inline: true });

    await interaction.message.edit({
      embeds: [updatedEmbed],
      components: [], // Remove buttons
    });

    const matchUrl = `${FRONTEND_URL}/challenges/${match.id}`;
    await interaction.editReply({
      content: `You accepted the match! [View match details](${matchUrl})`,
    });
  } catch (error: any) {
    const message = error.message || 'Failed to accept listing';
    // Parse backend error messages
    let userMessage = 'Something went wrong accepting this match.';
    if (message.includes('no longer available')) {
      userMessage = 'This listing is no longer available — someone else may have accepted it.';
    } else if (message.includes('cannot accept your own')) {
      userMessage = "You can't accept your own listing.";
    } else if (message.includes('account')) {
      userMessage = 'You need a linked account to accept matches. Sign up on the website first.';
    }
    await interaction.editReply({ content: userMessage });
  }
}

export async function handleMatchfinderCancel(interaction: ButtonInteraction) {
  const matchId = interaction.customId.replace('mf_cancel_', '');
  const discordId = interaction.user.id;

  await interaction.deferReply({ ephemeral: true });

  try {
    await api.cancelMatchfinderListing(matchId, discordId);

    // Update the original message
    const originalEmbed = interaction.message.embeds[0];
    const updatedEmbed = EmbedBuilder.from(originalEmbed)
      .setTitle(`${originalEmbed.title} — Cancelled`)
      .setColor(0x6B7280);

    await interaction.message.edit({
      embeds: [updatedEmbed],
      components: [],
    });

    await interaction.editReply({ content: 'Listing cancelled.' });
  } catch (error: any) {
    const message = error.message || 'Failed to cancel listing';
    let userMessage = 'Something went wrong cancelling this listing.';
    if (message.includes('Only the creator')) {
      userMessage = 'Only the person who created this listing can cancel it.';
    } else if (message.includes('no longer searchable')) {
      userMessage = 'This listing has already been accepted or cancelled.';
    }
    await interaction.editReply({ content: userMessage });
  }
}
