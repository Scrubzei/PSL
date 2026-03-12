import {
  SlashCommandBuilder,
  CommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
  EmbedBuilder,
  Client,
} from 'discord.js';
import {
  addToQueue,
  removeFromQueue,
  isInQueue,
  acceptMatch,
  declineMatch,
  getPendingMatch,
  getQueueSize,
  setTimeoutHandler,
  type PendingMatch,
} from '../queue/queue-manager.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const PLUTO_API = 'https://forum.plutonium.pw/api/user';

interface SiteUser {
  id: string;
  username: string;
  discordId: string;
  plutoId?: string;
  plutoniumUsername?: string;
}

// --- Slash Command ---

export const data = new SlashCommandBuilder()
  .setName('setup-queue')
  .setDescription('Post the queue join button (server owner only)');

export async function execute(interaction: CommandInteraction) {
  const guild = interaction.guild;
  if (!guild || interaction.user.id !== guild.ownerId) {
    await interaction.reply({ content: 'Only the server owner can use this command.', ephemeral: true });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x22d3ee)
    .setTitle('Queue')
    .setDescription('Press the button below to join the queue.');

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('queue_join')
      .setLabel('Join Queue')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('queue_leave')
      .setLabel('Leave Queue')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

// --- Register Timeout Handler ---

export function registerTimeoutHandler(client: Client): void {
  setTimeoutHandler(async (match, dodgers, confirmers) => {
    // Edit channel message
    try {
      if (match.channelId && match.messageId) {
        const channel = await client.channels.fetch(match.channelId);
        if (channel?.isTextBased() && 'messages' in channel) {
          const msg = await channel.messages.fetch(match.messageId);
          const names = dodgers.map(d => `<@${d.discordId}>`).join(' and ');
          const embed = new EmbedBuilder()
            .setColor(0x72767d)
            .setTitle('Match Cancelled')
            .setDescription(
              `${names} failed to accept in time.\n\n` +
              (confirmers.length > 0
                ? `<@${confirmers[0].discordId}> has been re-queued.`
                : 'Both players have been removed.'),
            );
          await msg.edit({ embeds: [embed], components: [] });
        }
      }
    } catch (err) {
      console.error('[Queue] Error editing channel message on timeout:', err);
    }

    // Edit DMs
    for (const dodger of dodgers) {
      try {
        const user = await client.users.fetch(dodger.discordId);
        const dmChannel = user.dmChannel || await user.createDM();
        const msgId = match.player1.discordId === dodger.discordId ? match.dm1MessageId : match.dm2MessageId;
        if (msgId) {
          const msg = await dmChannel.messages.fetch(msgId);
          const embed = new EmbedBuilder()
            .setColor(0x72767d)
            .setTitle('Match Timed Out')
            .setDescription('You did not accept in time. You have a **5 minute** cooldown before you can queue again.');
          await msg.edit({ embeds: [embed], components: [] });
        }
      } catch (err) {
        console.error(`[Queue] Error editing dodger DM for ${dodger.discordId}:`, err);
      }
    }

    for (const confirmer of confirmers) {
      try {
        const user = await client.users.fetch(confirmer.discordId);
        const dmChannel = user.dmChannel || await user.createDM();
        const msgId = match.player1.discordId === confirmer.discordId ? match.dm1MessageId : match.dm2MessageId;
        if (msgId) {
          const msg = await dmChannel.messages.fetch(msgId);
          const embed = new EmbedBuilder()
            .setColor(0x22d3ee)
            .setTitle('Opponent Timed Out')
            .setDescription("Your opponent didn't accept in time. You've been placed at the **front** of the queue.");
          await msg.edit({ embeds: [embed], components: [] });
        }
      } catch (err) {
        console.error(`[Queue] Error editing confirmer DM for ${confirmer.discordId}:`, err);
      }
    }
  });
}

// --- Join Queue Button ---

export async function handleQueueJoinButton(interaction: ButtonInteraction) {
  const discordId = interaction.user.id;

  try {
    const res = await fetch(`${BACKEND_URL}/users/by-discord/${discordId}`);
    const user: SiteUser | null = res.ok ? (await res.json() as SiteUser) : null;

    if (user?.id && user.plutoId) {
      // Has account + plutoId — try to join queue
      await joinQueue(interaction, user);
      return;
    }

    if (user?.id && !user.plutoId) {
      // Has account but no plutoId — ask for pluto username
      const modal = new ModalBuilder()
        .setCustomId('queue_pluto_modal')
        .setTitle('Link Plutonium Account');

      const plutoInput = new TextInputBuilder()
        .setCustomId('queue_pluto_username')
        .setLabel('Plutonium Username')
        .setPlaceholder('Your Plutonium forum username')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(plutoInput));
      await interaction.showModal(modal);
      return;
    }

    // No account — ask for site username + pluto username
    const modal = new ModalBuilder()
      .setCustomId('queue_join_modal')
      .setTitle('Join Queue');

    const usernameInput = new TextInputBuilder()
      .setCustomId('queue_username')
      .setLabel('Username')
      .setPlaceholder('Pick a username for your account')
      .setValue(sanitizeUsername(interaction.user.username))
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(15)
      .setRequired(true);

    const plutoInput = new TextInputBuilder()
      .setCustomId('queue_pluto_username')
      .setLabel('Plutonium Username')
      .setPlaceholder('Your Plutonium forum username')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(plutoInput),
    );
    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error in queue join button:', error);
    await interaction.reply({ content: 'Something went wrong. Try again later.', ephemeral: true });
  }
}

// --- Leave Queue Button ---

export async function handleQueueLeaveButton(interaction: ButtonInteraction) {
  const discordId = interaction.user.id;

  if (!isInQueue(discordId)) {
    await interaction.reply({ content: "You're not in the queue.", ephemeral: true });
    return;
  }

  removeFromQueue(discordId);
  await interaction.reply({ content: 'You left the queue.', ephemeral: true });
}

// --- Accept Button ---

export async function handleQueueAcceptButton(interaction: ButtonInteraction) {
  const matchId = interaction.customId.replace('queue_accept_', '');
  const discordId = interaction.user.id;

  // Grab match data BEFORE accepting (since accept may delete it)
  const matchData = getPendingMatch(matchId);

  const result = acceptMatch(matchId, discordId);

  if ('error' in result) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  if (!result.bothAccepted) {
    // Only this player accepted so far — update their DM
    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('Accepted!')
      .setDescription('Waiting for your opponent to accept...');
    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  // Both accepted — send connect info
  const server = result.server;
  const confirmedMatch = result.match;
  const connectString = `connect ${server.ip}:${server.port}`;

  // Update the accepting player's DM
  const embed = new EmbedBuilder()
    .setColor(0x4caf50)
    .setTitle('Match Confirmed!')
    .setDescription(
      `Your match is ready!\n\n` +
      `**Server:** ${server.name}\n` +
      `**Connect:** \`${connectString}\`\n\n` +
      `Paste the connect command into your Plutonium console. Good luck!`,
    );
  await interaction.update({ embeds: [embed], components: [] });

  // Edit the other player's DM
  const otherPlayer = confirmedMatch.player1.discordId === discordId
    ? confirmedMatch.player2
    : confirmedMatch.player1;
  const otherMsgId = confirmedMatch.player1.discordId === discordId
    ? confirmedMatch.dm2MessageId
    : confirmedMatch.dm1MessageId;

  if (otherMsgId) {
    try {
      const otherUser = await interaction.client.users.fetch(otherPlayer.discordId);
      const dmChannel = otherUser.dmChannel || await otherUser.createDM();
      const otherMsg = await dmChannel.messages.fetch(otherMsgId);
      const otherEmbed = new EmbedBuilder()
        .setColor(0x4caf50)
        .setTitle('Match Confirmed!')
        .setDescription(
          `Your match is ready!\n\n` +
          `**Server:** ${server.name}\n` +
          `**Connect:** \`${connectString}\`\n\n` +
          `Paste the connect command into your Plutonium console. Good luck!`,
        );
      await otherMsg.edit({ embeds: [otherEmbed], components: [] });
    } catch (err) {
      console.error(`[Queue] Error editing other player's DM on confirm:`, err);
    }
  }

  // Edit channel message
  const data = matchData || confirmedMatch;
  if (data.channelId && data.messageId) {
    try {
      const channel = await interaction.client.channels.fetch(data.channelId);
      if (channel?.isTextBased() && 'messages' in channel) {
        const channelMsg = await channel.messages.fetch(data.messageId);
        const channelEmbed = new EmbedBuilder()
          .setColor(0x4caf50)
          .setTitle('Match Started!')
          .setDescription(
            `<@${confirmedMatch.player1.discordId}> vs <@${confirmedMatch.player2.discordId}>\n\n` +
            `Server: **${server.name}**`,
          )
          .setFooter({ text: 'Both players confirmed' });
        await channelMsg.edit({ embeds: [channelEmbed], components: [] });
      }
    } catch (err) {
      console.error('[Queue] Error editing channel message on confirm:', err);
    }
  }
}

// --- Decline Button ---

export async function handleQueueDeclineButton(interaction: ButtonInteraction) {
  const matchId = interaction.customId.replace('queue_decline_', '');
  const discordId = interaction.user.id;

  // Grab match data BEFORE declining (since decline deletes it)
  const matchData = getPendingMatch(matchId);

  const result = declineMatch(matchId, discordId);

  if ('error' in result) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  // Update decliner's DM
  const embed = new EmbedBuilder()
    .setColor(0x72767d)
    .setTitle('Match Declined')
    .setDescription('You declined the match. You have a **5 minute** cooldown before you can queue again.');
  await interaction.update({ embeds: [embed], components: [] });

  // Edit the other player's DM
  if (matchData && result.confirmer) {
    const otherDiscordId = result.confirmer.discordId;
    const otherMsgId = matchData.player1.discordId === otherDiscordId
      ? matchData.dm1MessageId
      : matchData.dm2MessageId;

    if (otherMsgId) {
      try {
        const otherUser = await interaction.client.users.fetch(otherDiscordId);
        const dmChannel = otherUser.dmChannel || await otherUser.createDM();
        const otherMsg = await dmChannel.messages.fetch(otherMsgId);
        const otherEmbed = new EmbedBuilder()
          .setColor(0x22d3ee)
          .setTitle('Opponent Declined')
          .setDescription("Your opponent declined the match. You've been placed at the **front** of the queue.");
        await otherMsg.edit({ embeds: [otherEmbed], components: [] });
      } catch (err) {
        console.error(`[Queue] Error editing other player's DM on decline:`, err);
      }
    }

    // Edit channel message
    try {
      if (matchData.channelId && matchData.messageId) {
        const channel = await interaction.client.channels.fetch(matchData.channelId);
        if (channel?.isTextBased() && 'messages' in channel) {
          const channelMsg = await channel.messages.fetch(matchData.messageId);
          const channelEmbed = new EmbedBuilder()
            .setColor(0x72767d)
            .setTitle('Match Cancelled')
            .setDescription(
              `<@${discordId}> declined.\n` +
              `<@${result.confirmer.discordId}> has been re-queued.`,
            );
          await channelMsg.edit({ embeds: [channelEmbed], components: [] });
        }
      }
    } catch (err) {
      console.error('[Queue] Error editing channel message on decline:', err);
    }
  }
}

// --- Modal Handlers ---

export async function handleQueueJoinModal(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const discordId = interaction.user.id;
  const username = interaction.fields.getTextInputValue('queue_username').trim();
  const plutoUsername = interaction.fields.getTextInputValue('queue_pluto_username').trim();

  try {
    // Create account
    const createRes = await fetch(`${BACKEND_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, username }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({ message: '' })) as { message?: string };
      await interaction.editReply({ content: `Failed to create account: ${err.message || createRes.statusText}` });
      return;
    }

    const user = await createRes.json() as SiteUser;

    // Resolve and link plutoId
    const result = await resolveAndLinkPlutoId(user.id, plutoUsername);
    if (!result.success) {
      await interaction.editReply({ content: `Account created as **${user.username}**, but ${result.error}` });
      return;
    }

    // Now join the queue
    const channelId = interaction.channelId;
    if (!channelId) {
      await interaction.editReply({ content: `Account created as **${user.username}** (Pluto: **${plutoUsername}**). Use the Join Queue button to queue up!` });
      return;
    }

    const queueResult = addToQueue(
      { discordId, username: user.username, plutoId: result.plutoId!, joinedAt: Date.now() },
      channelId,
    );

    if ('error' in queueResult) {
      await interaction.editReply({ content: `Account created as **${user.username}** (Pluto: **${plutoUsername}**). ${queueResult.error}` });
      return;
    }

    if (queueResult.matched) {
      await interaction.editReply({ content: `Account created as **${user.username}** — match found! Check below and your DMs.` });
      await sendMatchFoundNotifications(interaction, queueResult.match);
    } else {
      await interaction.editReply({
        content: `Account created as **${user.username}** (Pluto: **${plutoUsername}**) — you joined the queue! (${queueResult.position} in queue)`,
      });
    }
  } catch (error) {
    console.error('Error in queue join modal:', error);
    await interaction.editReply({ content: 'Something went wrong. Try again later.' });
  }
}

export async function handleQueuePlutoModal(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const discordId = interaction.user.id;
  const plutoUsername = interaction.fields.getTextInputValue('queue_pluto_username').trim();

  try {
    // Get user
    const res = await fetch(`${BACKEND_URL}/users/by-discord/${discordId}`);
    if (!res.ok) {
      await interaction.editReply({ content: 'Could not find your account.' });
      return;
    }
    const user = await res.json() as SiteUser;

    // Resolve and link plutoId
    const result = await resolveAndLinkPlutoId(user.id, plutoUsername);
    if (!result.success) {
      await interaction.editReply({ content: result.error! });
      return;
    }

    // Now join the queue
    const channelId = interaction.channelId;
    if (!channelId) {
      await interaction.editReply({ content: `Plutonium account linked (**${plutoUsername}**). Use the Join Queue button to queue up!` });
      return;
    }

    const queueResult = addToQueue(
      { discordId, username: user.username, plutoId: result.plutoId!, joinedAt: Date.now() },
      channelId,
    );

    if ('error' in queueResult) {
      await interaction.editReply({ content: `Plutonium account linked (**${plutoUsername}**). ${queueResult.error}` });
      return;
    }

    if (queueResult.matched) {
      await interaction.editReply({ content: `Plutonium linked (**${plutoUsername}**) — match found! Check below and your DMs.` });
      await sendMatchFoundNotifications(interaction, queueResult.match);
    } else {
      await interaction.editReply({
        content: `Plutonium account linked (**${plutoUsername}**) — you joined the queue as **${user.username}**! (${queueResult.position} in queue)`,
      });
    }
  } catch (error) {
    console.error('Error in queue pluto modal:', error);
    await interaction.editReply({ content: 'Something went wrong. Try again later.' });
  }
}

// --- Helpers ---

async function joinQueue(interaction: ButtonInteraction, user: SiteUser) {
  const channelId = interaction.channelId;

  const result = addToQueue(
    { discordId: user.discordId, username: user.username, plutoId: user.plutoId!, joinedAt: Date.now() },
    channelId,
  );

  if ('error' in result) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  if (result.matched) {
    await interaction.reply({ content: 'Match found! Check below and your DMs.', ephemeral: true });
    await sendMatchFoundNotifications(interaction, result.match);
  } else {
    const size = getQueueSize();
    await interaction.reply({
      content: `You joined the queue as **${user.username}**. Waiting for an opponent... (${size} in queue)`,
      ephemeral: true,
    });
  }
}

async function sendMatchFoundNotifications(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  match: PendingMatch,
) {
  const { player1, player2 } = match;

  // Send channel message
  const channelEmbed = new EmbedBuilder()
    .setColor(0xFFA500)
    .setTitle('Match Found!')
    .setDescription(
      `<@${player1.discordId}> vs <@${player2.discordId}>\n\n` +
      `Both players must accept within **2:30**.\nCheck your DMs!`,
    )
    .setFooter({ text: 'Waiting for confirmations...' });

  try {
    const channel = interaction.channel;
    if (channel?.isTextBased() && 'send' in channel) {
      const channelMsg = await channel.send({
        content: `<@${player1.discordId}> <@${player2.discordId}>`,
        embeds: [channelEmbed],
      });
      match.messageId = channelMsg.id;
    }
  } catch (err) {
    console.error('[Queue] Error sending channel notification:', err);
  }

  // Send DMs to both players
  const buttons = (matchId: string) =>
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`queue_accept_${matchId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`queue_decline_${matchId}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger),
    );

  // DM Player 1
  try {
    const user1 = await interaction.client.users.fetch(player1.discordId);
    const dm1Embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('Match Found!')
      .setDescription(
        `You've been matched against **${player2.username}**!\n\n` +
        `You have **2 minutes 30 seconds** to accept.`,
      );
    const dm1 = await user1.send({ embeds: [dm1Embed], components: [buttons(match.id)] });
    match.dm1MessageId = dm1.id;
  } catch (err) {
    console.error(`[Queue] Error sending DM to player1 ${player1.discordId}:`, err);
  }

  // DM Player 2
  try {
    const user2 = await interaction.client.users.fetch(player2.discordId);
    const dm2Embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('Match Found!')
      .setDescription(
        `You've been matched against **${player1.username}**!\n\n` +
        `You have **2 minutes 30 seconds** to accept.`,
      );
    const dm2 = await user2.send({ embeds: [dm2Embed], components: [buttons(match.id)] });
    match.dm2MessageId = dm2.id;
  } catch (err) {
    console.error(`[Queue] Error sending DM to player2 ${player2.discordId}:`, err);
  }
}

async function resolveAndLinkPlutoId(userId: string, plutoUsername: string): Promise<{ success: boolean; error?: string; plutoId?: string }> {
  // Fetch from Plutonium API
  const plutoRes = await fetch(`${PLUTO_API}/${encodeURIComponent(plutoUsername)}`);
  if (!plutoRes.ok) {
    return { success: false, error: `Plutonium username **${plutoUsername}** was not found.` };
  }

  const plutoData = await plutoRes.json() as { uid?: number };
  if (!plutoData.uid) {
    return { success: false, error: `Plutonium username **${plutoUsername}** was not found.` };
  }

  const plutoId = plutoData.uid.toString();

  // Link plutoId
  const patchRes = await fetch(`${BACKEND_URL}/users/${userId}/pluto-id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plutoId }),
  });

  if (!patchRes.ok) {
    if (patchRes.status === 409) {
      return { success: false, error: `This Plutonium account is already linked to another user. Contact an admin if someone is using your account without permission.` };
    }
    return { success: false, error: 'Failed to link Plutonium account.' };
  }

  return { success: true, plutoId };
}

function sanitizeUsername(discord: string): string {
  let name = discord.replace(/[^a-zA-Z0-9_ ]/g, '_').replace(/[_ ]{2,}/g, '_');
  name = name.replace(/^_+|_+$/g, '');
  if (name.length > 15) name = name.slice(0, 15);
  if (name.length < 2) name = name.padEnd(2, '_');
  return name;
}
