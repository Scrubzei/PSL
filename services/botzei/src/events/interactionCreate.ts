import { Events, Interaction } from 'discord.js';
import { handleSelectMenu, handleButton } from '../commands/leaderboard.js';
import { handleMapSelect, handleBestOfSelect, handleNavButton, handleChallengeResponse } from '../commands/chall.js';
import { handleTournamentSelect } from '../commands/tournaments.js';
import { handleAnnounceSelect } from '../commands/announce.js';
import { handleBracketSelect, handleBracketRefresh } from '../commands/bracket.js';
import { handleScheduleSelect } from '../commands/schedule.js';
import { handleLookupSelect } from '../commands/lookup.js';
import { handleMatchTournamentSelect, handleMatchSelect } from '../commands/match.js';
import { handlePugJoin, handlePugLeave, handlePugReady, handlePugMapPick, handlePugReport, handlePugConfirm, handlePugDispute, handlePugRematch } from '../commands/pug.js';
import { handleSidebetSetupSelect } from '../commands/sidebet-setup.js';
import { handleSelect as handleTourneyRoleSelect } from '../commands/tourney-role.js';
import { handleSelect as handleTourneyThreadsSelect } from '../commands/tourney-threads.js';
import { handleSidebetCreateButton, handleSidebetMatchSelect, handleSidebetPlayerPick, handleSidebetAmountModal, handleSidebetAccept, handleSidebetLock, handleSidebetCancel } from '../commands/sidebet.js';
import { handleMatchfinderAccept, handleMatchfinderCancel } from '../commands/matchfinder.js';
import { handleMapSelect as handleQueueSetupMapSelect } from '../commands/setup-queue.js';
import { handleMapSelect as handlePlutoQueueMapSelect } from '../commands/plutonium-queue.js';
import {
  handleQueueJoin,
  handleQueueLeave,
  handleReadyUp,
  handleMatchMapPick,
  handleMatchResult,
  handleDisputeResolve,
  handleGamertagModal,
} from '../queue/handlers.js';
import {
  handleQueueJoin as handlePlutoJoin,
  handleQueueLeave as handlePlutoLeave,
  handleReadyUp as handlePlutoReady,
  handleGamertagModal as handlePlutoGamertagModal,
} from '../plutonium-queue/handlers.js';

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

  // Handle autocomplete
  if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (command?.autocomplete) {
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(`Error in autocomplete for ${interaction.commandName}:`, error);
      }
    }
    return;
  }

  // Handle select menu interactions
  if (interaction.isStringSelectMenu()) {
    // Queue setup map selection
    if (interaction.customId === 'queue_setup_maps') {
      try {
        await handleQueueSetupMapSelect(interaction);
      } catch (error) {
        console.error('Error handling queue setup map select:', error);
      }
      return;
    }

    if (interaction.customId === 'pluto_queue_setup_maps') {
      try {
        await handlePlutoQueueMapSelect(interaction);
      } catch (error) {
        console.error('Error handling plutonium queue map select:', error);
      }
      return;
    }

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

    // Tourney role selection
    if (interaction.customId === 'tourney_role_select') {
      try {
        await handleTourneyRoleSelect(interaction);
      } catch (error) {
        console.error('Error handling tourney role select:', error);
      }
      return;
    }

    // Tourney threads selection
    if (interaction.customId === 'tourney_threads_select') {
      try {
        await handleTourneyThreadsSelect(interaction);
      } catch (error) {
        console.error('Error handling tourney threads select:', error);
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

    // Matchfinder accept/cancel buttons
    if (interaction.customId.startsWith('mf_accept_')) {
      try {
        await handleMatchfinderAccept(interaction);
      } catch (error) {
        console.error('Error handling matchfinder accept:', error);
      }
      return;
    }

    if (interaction.customId.startsWith('mf_cancel_')) {
      try {
        await handleMatchfinderCancel(interaction);
      } catch (error) {
        console.error('Error handling matchfinder cancel:', error);
      }
      return;
    }

    // Plutonium queue system (pq: prefix)
    if (interaction.customId.startsWith('pq:join:')) {
      try { await handlePlutoJoin(interaction); } catch (e) { console.error('Error handling pluto join:', e); }
      return;
    }
    if (interaction.customId.startsWith('pq:leave:')) {
      try { await handlePlutoLeave(interaction); } catch (e) { console.error('Error handling pluto leave:', e); }
      return;
    }
    if (interaction.customId.startsWith('pq:ready:')) {
      try { await handlePlutoReady(interaction); } catch (e) { console.error('Error handling pluto ready:', e); }
      return;
    }

    // Standard queue system
    if (interaction.customId.startsWith('queue:join:')) {
      try {
        await handleQueueJoin(interaction);
      } catch (error) {
        console.error('Error handling queue join:', error);
      }
      return;
    }

    if (interaction.customId.startsWith('queue:leave:')) {
      try {
        await handleQueueLeave(interaction);
      } catch (error) {
        console.error('Error handling queue leave:', error);
      }
      return;
    }

    if (interaction.customId.startsWith('match:ready:')) {
      try {
        await handleReadyUp(interaction);
      } catch (error) {
        console.error('Error handling match ready:', error);
      }
      return;
    }

    if (interaction.customId.startsWith('match:map:')) {
      try {
        await handleMatchMapPick(interaction);
      } catch (error) {
        console.error('Error handling match map pick:', error);
      }
      return;
    }

    if (interaction.customId.startsWith('match:result:')) {
      try {
        await handleMatchResult(interaction);
      } catch (error) {
        console.error('Error handling match result:', error);
      }
      return;
    }

    if (interaction.customId.startsWith('match:concede:') ||
        interaction.customId.startsWith('match:ref:')) {
      try {
        await handleDisputeResolve(interaction);
      } catch (error) {
        console.error('Error handling dispute resolve:', error);
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
    // Queue gamertag modal
    if (interaction.customId === 'queue:gamertag_modal') {
      try {
        await handleGamertagModal(interaction);
      } catch (error) {
        console.error('Error handling gamertag modal:', error);
      }
      return;
    }

    if (interaction.customId === 'pq:gamertag_modal') {
      try {
        await handlePlutoGamertagModal(interaction);
      } catch (error) {
        console.error('Error handling pluto gamertag modal:', error);
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
