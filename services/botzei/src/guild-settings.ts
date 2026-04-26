/**
 * Per-guild channel assignments. Persisted in Postgres via the server API.
 *
 * In-memory cache loaded on startup, pushed to DB on every change.
 */

function getBackendUrl() { return process.env.BACKEND_URL || 'http://localhost:3000'; }
function getApiKey() { return process.env.BOT_API_KEY || ''; }

export interface GuildChannels {
  gameFeedChannelId?: string;
  tournamentChannelId?: string;
  matchThreadChannelId?: string;
}

interface GuildSettingsMap {
  [guildId: string]: GuildChannels;
}

let settings: GuildSettingsMap = {};
let loaded = false;

async function pushGuild(guildId: string, channels: GuildChannels): Promise<void> {
  try {
    await fetch(`${getBackendUrl()}/botzei/guild-settings/${guildId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
      },
      body: JSON.stringify(channels),
    });
  } catch (err) {
    console.error('[GuildSettings] Failed to push to backend:', err);
  }
}

export async function ensureGuildSettingsLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const res = await fetch(`${getBackendUrl()}/botzei/guild-settings-all`, {
      headers: { 'x-api-key': getApiKey() },
    });
    if (res.ok) {
      settings = await res.json() as GuildSettingsMap;
    }
  } catch (err) {
    console.error('[GuildSettings] Failed to load from backend:', err);
  }
  loaded = true;
  const count = Object.keys(settings).length;
  if (count > 0) {
    console.log(`[GuildSettings] Loaded settings for ${count} guild(s)`);
  }
}

export function getGuildSettings(guildId: string): GuildChannels {
  return settings[guildId] || {};
}

export function setGuildSettings(guildId: string, channels: Partial<GuildChannels>): GuildChannels {
  if (!settings[guildId]) settings[guildId] = {};
  Object.assign(settings[guildId], channels);
  pushGuild(guildId, settings[guildId]).catch(() => {});
  return settings[guildId];
}

export function getGuildsWithChannel(
  channelType: keyof GuildChannels,
): { guildId: string; channelId: string }[] {
  const result: { guildId: string; channelId: string }[] = [];
  for (const [guildId, channels] of Object.entries(settings)) {
    const channelId = channels[channelType];
    if (channelId) {
      result.push({ guildId, channelId });
    }
  }
  return result;
}

export function getAllGuildSettings(): GuildSettingsMap {
  return { ...settings };
}
