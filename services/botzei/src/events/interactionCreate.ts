import { Events, Interaction } from 'discord.js';
import { handleSelectMenu, handleButton } from '../commands/leaderboard.js';
import { handleMapSelect, handleBestOfSelect, handleNavButton, handleChallengeResponse } from '../commands/chall.js';
import { handleTournamentSelect } from '../commands/tournaments.js';
import { handleAnnounceSelect } from '../commands/announce.js';
import { handleBracketSelect, handleBracketRefresh } from '../commands/bracket.js';
import { handleScheduleSelect } from '../commands/schedule.js';
import { handleLookupSelect } from '../commands/lookup.js';
import { handleMatchTournamentSelect, handleMatchSelect } from '../commands/match.js';
import { handleQueueJoinButton, handleQueueJoinModal, handleQueuePlutoModal, handleQueueLeaveButton, handleQueueAcceptButton, handleQueueDeclineButton } from '../commands/setup-queue.js';
import { handlePugJoin, handlePugLeave, handlePugReady, handlePugMapPick, handlePugReport, handlePugConfirm, handlePugDispute, handlePugRematch } from '../commands/pug.js';
import { handleSidebetSetupSelect } from '../commands/sidebet-setup.js';
import { handleSidebetCreateButton, handleSidebetMatchSelect, handleSidebetPlayerPick, handleSidebetAmountModal, handleSidebetAccept, handleSidebetLock, handleSidebetCancel } from '../commands/sidebet.js';

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

    // Bracket selection
    if (interaction.customId.startsWith('bracket_select_')) {
      try {
        await handleBracketSelect(interaction);
      } catch (error) {
        console.error('Error handling bracket select:', error);
      }
      return;
    }

    // Match tournament selection
    if (interaction.customId.startsWith('match_tournament_')) {
      try {
        await handleMatchTournamentSelect(interaction);
      } catch (error) {
        console.error('Error handling match tournament select:', error);
      }
      return;
    }

    // Match detail selection
    if (interaction.customId.startsWith('match_select_')) {
      try {
        await handleMatchSelect(interaction);
      } catch (error) {
        console.error('Error handling match select:', error);
      }
      return;
    }

    // Lookup user selection
    if (interaction.customId.startsWith('lookup_select_')) {
      try {
        await handleLookupSelect(interaction);
      } catch (error) {
        console.error('Error handling lookup select:', error);
      }
      return;
    }

    // Schedule selection
    if (interaction.customId.startsWith('schedule_select_')) {
      try {
        await handleScheduleSelect(interaction);
      } catch (error) {
        console.error('Error handling schedule select:', error);
      }
      return;
    }

    // Sidebet setup tournament selection
    if (interaction.customId.startsWith('sidebet_setup_')) {
      try {
        await handleSidebetSetupSelect(interaction);
      } catch (error) {
        console.error('Error handling sidebet setup select:', error);
      }
      return;
    }

    // PUG map pick
    if (interaction.customId.startsWith('pug_map_')) {
      try {
        await handlePugMapPick(interaction);
      } catch (error) {
        console.error('Error handling pug map pick:', error);
      }
      return;
    }

    // Sidebet match selection
    if (interaction.customId.startsWith('sidebet_match_')) {
      try {
        await handleSidebetMatchSelect(interaction);
      } catch (error) {
        console.error('Error handling sidebet match select:', error);
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

    // PUG join button
    if (interaction.customId === 'pug_join') {
      try {
        await handlePugJoin(interaction);
      } catch (error) {
        console.error('Error handling pug join:', error);
      }
      return;
    }

    // PUG leave button
    if (interaction.customId === 'pug_leave') {
      try {
        await handlePugLeave(interaction);
      } catch (error) {
        console.error('Error handling pug leave:', error);
      }
      return;
    }

    // PUG ready button
    if (interaction.customId.startsWith('pug_ready_')) {
      try {
        await handlePugReady(interaction);
      } catch (error) {
        console.error('Error handling pug ready:', error);
      }
      return;
    }

    // PUG report buttons
    if (interaction.customId.startsWith('pug_rp1_') || interaction.customId.startsWith('pug_rp2_')) {
      try {
        await handlePugReport(interaction);
      } catch (error) {
        console.error('Error handling pug report:', error);
      }
      return;
    }

    // PUG confirm button
    if (interaction.customId.startsWith('pug_confirm_')) {
      try {
        await handlePugConfirm(interaction);
      } catch (error) {
        console.error('Error handling pug confirm:', error);
      }
      return;
    }

    // PUG dispute button
    if (interaction.customId.startsWith('pug_dispute_')) {
      try {
        await handlePugDispute(interaction);
      } catch (error) {
        console.error('Error handling pug dispute:', error);
      }
      return;
    }

    // PUG rematch button
    if (interaction.customId.startsWith('pug_rematch_')) {
      try {
        await handlePugRematch(interaction);
      } catch (error) {
        console.error('Error handling pug rematch:', error);
      }
      return;
    }

    // Queue join button
    if (interaction.customId === 'queue_join') {
      try {
        await handleQueueJoinButton(interaction);
      } catch (error) {
        console.error('Error handling queue join:', error);
      }
      return;
    }

    // Queue leave button
    if (interaction.customId === 'queue_leave') {
      try {
        await handleQueueLeaveButton(interaction);
      } catch (error) {
        console.error('Error handling queue leave:', error);
      }
      return;
    }

    // Queue accept button
    if (interaction.customId.startsWith('queue_accept_')) {
      try {
        await handleQueueAcceptButton(interaction);
      } catch (error) {
        console.error('Error handling queue accept:', error);
      }
      return;
    }

    // Queue decline button
    if (interaction.customId.startsWith('queue_decline_')) {
      try {
        await handleQueueDeclineButton(interaction);
      } catch (error) {
        console.error('Error handling queue decline:', error);
      }
      return;
    }

    // Bracket refresh button
    if (interaction.customId.startsWith('bracket_refresh_')) {
      try {
        await handleBracketRefresh(interaction);
      } catch (error) {
        console.error('Error handling bracket refresh:', error);
      }
      return;
    }

    // Sidebet create button (on the setup card)
    if (interaction.customId === 'sidebet_create') {
      try {
        await handleSidebetCreateButton(interaction);
      } catch (error) {
        console.error('Error handling sidebet create:', error);
      }
      return;
    }

    // Sidebet player pick buttons
    if (interaction.customId.startsWith('sb_pick_')) {
      try {
        await handleSidebetPlayerPick(interaction);
      } catch (error) {
        console.error('Error handling sidebet player pick:', error);
      }
      return;
    }

    // Sidebet accept button
    if (interaction.customId.startsWith('sidebet_accept_')) {
      try {
        await handleSidebetAccept(interaction);
      } catch (error) {
        console.error('Error handling sidebet accept:', error);
      }
      return;
    }

    // Sidebet lock button
    if (interaction.customId.startsWith('sidebet_lock_')) {
      try {
        await handleSidebetLock(interaction);
      } catch (error) {
        console.error('Error handling sidebet lock:', error);
      }
      return;
    }

    // Sidebet cancel button
    if (interaction.customId.startsWith('sidebet_cancel_')) {
      try {
        await handleSidebetCancel(interaction);
      } catch (error) {
        console.error('Error handling sidebet cancel:', error);
      }
      return;
    }

    return;
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'queue_join_modal') {
      try {
        await handleQueueJoinModal(interaction);
      } catch (error) {
        console.error('Error handling queue join modal:', error);
      }
      return;
    }

    if (interaction.customId === 'queue_pluto_modal') {
      try {
        await handleQueuePlutoModal(interaction);
      } catch (error) {
        console.error('Error handling queue pluto modal:', error);
      }
      return;
    }

    // Sidebet amount modal
    if (interaction.customId.startsWith('sidebet_amount_')) {
      try {
        await handleSidebetAmountModal(interaction);
      } catch (error) {
        console.error('Error handling sidebet amount modal:', error);
      }
      return;
    }

    return;
  }
}
