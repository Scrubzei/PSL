import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ActionRowBuilder,
} from 'discord.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';

function canManage(interaction: ChatInputCommandInteraction | StringSelectMenuInteraction): boolean {
  if (!interaction.guild || !interaction.member) return false;
  if (interaction.guild.ownerId === interaction.user.id) return true;
  const roles = (interaction.member.roles as any)?.cache;
  if (roles?.some?.((r: any) => r.name.toLowerCase() === 'dot')) return true;
  return false;
}

export const data = new SlashCommandBuilder()
  .setName('tourney-role')
  .setDescription('Assign a tournament role to all participants');

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can use this.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await fetch(`${BACKEND_URL}/tournaments?limit=25`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const tournaments = await res.json() as any[];

    const eligible = tournaments.filter((t: any) =>
      ['REGISTRATION', 'BRACKET_READY', 'IN_PROGRESS'].includes(t.status)
    );

    if (eligible.length === 0) {
      await interaction.editReply('No active tournaments found.');
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('tourney_role_select')
      .setPlaceholder('Select a tournament')
      .addOptions(
        eligible.map((t: any) => ({
          label: t.name,
          description: `${t.participantCount}/${t.maxParticipants} players · ${t.status}`,
          value: t.id,
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.editReply({ content: 'Choose a tournament:', components: [row] });
  } catch (error: any) {
    console.error('Error fetching tournaments:', error);
    await interaction.editReply('Failed to fetch tournaments.');
  }
}

export async function handleSelect(interaction: StringSelectMenuInteraction) {
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can use this.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();
  const tournamentId = interaction.values[0];
  const guild = interaction.guild!;

  try {
    const res = await fetch(`${BACKEND_URL}/tournaments/${tournamentId}`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const tournament: any = await res.json();

    if (!tournament.participants || tournament.participants.length === 0) {
      await interaction.editReply({ content: 'No participants in this tournament.', components: [] });
      return;
    }

    // Create role name from slug or tournament name
    const roleName = tournament.slug || tournament.name.toLowerCase().replace(/\s+/g, '-');

    // Check if role already exists
    let role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        color: 0x2563EB,
        reason: `Tournament role for ${tournament.name}`,
      });
    }

    // Assign role to participants
    let assigned = 0;
    let skipped = 0;
    const notLinked: string[] = [];

    for (const participant of tournament.participants) {
      const discordId = participant.user.discordId;
      if (!discordId) {
        notLinked.push(participant.user.username);
        continue;
      }

      try {
        const member = await guild.members.fetch(discordId);
        if (member.roles.cache.has(role.id)) {
          skipped++;
        } else {
          await member.roles.add(role);
          assigned++;
        }
      } catch {
        notLinked.push(participant.user.username);
      }
    }

    let summary = `**Role \`@${roleName}\` assigned.**\n`;
    summary += `Assigned: **${assigned}** · Already had it: **${skipped}**`;
    if (notLinked.length > 0) {
      summary += `\nCouldn't assign (not in server or no Discord linked): ${notLinked.join(', ')}`;
    }

    await interaction.editReply({ content: summary, components: [] });
  } catch (error: any) {
    console.error('Error assigning tournament role:', error);
    await interaction.editReply({ content: 'Failed to assign roles.', components: [] });
  }
}
