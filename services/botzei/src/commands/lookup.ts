import {
  SlashCommandBuilder,
  CommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  EmbedBuilder,
} from 'discord.js';

interface SiteUser {
  id: string;
  username: string;
  discordId?: string;
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export const data = new SlashCommandBuilder()
  .setName('lookup')
  .setDescription('Look up a Discord account by site username');

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await fetch(`${BACKEND_URL}/users`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const users = (await res.json()) as SiteUser[];

    if (users.length === 0) {
      await interaction.editReply({ content: 'No users found on the site.' });
      return;
    }

    const sorted = users
      .filter(u => u.username)
      .sort((a, b) => a.username.localeCompare(b.username))
      .slice(0, 25);

    const select = new StringSelectMenuBuilder()
      .setCustomId(`lookup_select_${interaction.user.id}`)
      .setPlaceholder('Select a user')
      .addOptions(
        sorted.map(u => ({
          label: u.username.slice(0, 100),
          value: u.username,
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Lookup User')
      .setDescription('Select a user to look up their Discord account:');

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error in /lookup:', error);
    await interaction.editReply({ content: 'Failed to fetch users.' });
  }
}

export async function handleLookupSelect(interaction: StringSelectMenuInteraction) {
  const userId = interaction.customId.replace('lookup_select_', '');

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  const username = interaction.values[0];

  try {
    const res = await fetch(`${BACKEND_URL}/users/by-username/${encodeURIComponent(username)}`);

    if (!res.ok) {
      await interaction.editReply({ content: `No account found for **${username}**`, embeds: [], components: [] });
      return;
    }

    const user = (await res.json()) as { discordId?: string };

    if (!user || !user.discordId) {
      await interaction.editReply({ content: `**${username}** has no Discord linked`, embeds: [], components: [] });
      return;
    }

    const discordUser = await interaction.client.users.fetch(user.discordId);

    await interaction.editReply({
      content: `**${username}** → ${discordUser} (\`${discordUser.username}\` · \`${user.discordId}\`)`,
      embeds: [],
      components: [],
    });
  } catch (error) {
    console.error('Error in lookup select:', error);
    await interaction.editReply({ content: 'Failed to look up user.', embeds: [], components: [] });
  }
}
