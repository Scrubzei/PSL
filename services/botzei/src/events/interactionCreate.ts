import { Events, Interaction } from 'discord.js';
import { handleSelectMenu, handleButton } from '../commands/leaderboard.js';
import { handleMapSelect, handleBestOfSelect, handleNavButton, handleChallengeResponse } from '../commands/chall.js';
import { handleTournamentSelect } from '../commands/tournaments.js';
import { handleAnnounceSelect, handleAnnounceButton } from '../commands/announce.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction: Interaction) {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const client = interaction.client;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);

      const errorMessage = {
        content: 'There was an error executing this command.',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
    return;
  }

  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    // Leaderboard menus
    if (interaction.customId === 'leaderboard_game' || interaction.customId === 'leaderboard_platform') {
      try {
        await handleSelectMenu(interaction);
      } catch (error) {
        console.error('Error handling select menu:', error);
      }
      return;
    }

    // Challenge best of selection
    if (interaction.customId.startsWith('chall_bestof_')) {
      try {
        await handleBestOfSelect(interaction);
      } catch (error) {
        console.error('Error handling best of select:', error);
      }
      return;
    }

    // Challenge map selection
    if (interaction.customId.startsWith('chall_map_')) {
      try {
        await handleMapSelect(interaction);
      } catch (error) {
        console.error('Error handling map select:', error);
      }
      return;
    }

    // Announce tournament selection
    if (interaction.customId.startsWith('announce_select_')) {
      try {
        await handleAnnounceSelect(interaction);
      } catch (error) {
        console.error('Error handling announce select:', error);
      }
      return;
    }

    // Tournament selection
    if (interaction.customId.startsWith('tournament_select_')) {
      try {
        await handleTournamentSelect(interaction);
      } catch (error) {
        console.error('Error handling tournament select:', error);
      }
      return;
    }

    return;
  }

  // Handle button interactions
  if (interaction.isButton()) {
    // Leaderboard buttons
    if (interaction.customId.startsWith('lb_')) {
      try {
        await handleButton(interaction);
      } catch (error) {
        console.error('Error handling button:', error);
      }
      return;
    }

    // Challenge navigation buttons
    if (interaction.customId.startsWith('chall_prev_') ||
        interaction.customId.startsWith('chall_next_') ||
        interaction.customId.startsWith('chall_confirm_')) {
      try {
        await handleNavButton(interaction);
      } catch (error) {
        console.error('Error handling nav button:', error);
      }
      return;
    }

    // Announce signup button
    if (interaction.customId.startsWith('announce_signup_')) {
      try {
        await handleAnnounceButton(interaction);
      } catch (error) {
        console.error('Error handling announce button:', error);
      }
      return;
    }

    // Challenge accept/decline buttons
    if (interaction.customId.startsWith('chall_accept_') ||
        interaction.customId.startsWith('chall_decline_')) {
      try {
        await handleChallengeResponse(interaction);
      } catch (error) {
        console.error('Error handling challenge response:', error);
      }
      return;
    }

    return;
  }
}
