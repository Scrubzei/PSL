function getBackendUrl() { return process.env.BACKEND_URL || 'http://localhost:3000'; }
function getApiKey() { return process.env.BOT_API_KEY || ''; }

interface FetchOptions extends RequestInit {
  authenticated?: boolean;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { authenticated = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  const apiKey = getApiKey();
  if (authenticated && apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(`${getBackendUrl()}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error ${response.status}: ${error}`);
  }

  return response.json() as Promise<T>;
}

// Public endpoints (no auth needed)
export const api = {
  getLeaderboards: () => apiFetch<any[]>('/leaderboards'),

  getLeaderboardByGamePlatform: (game: string, platform: string) =>
    apiFetch<any>(`/leaderboards/by-game-platform?game=${game}&platform=${platform}`),

  getLeaderboardEntries: (leaderboardId: string, type: 'ranked' | 'xp' = 'ranked') =>
    apiFetch<any[]>(`/leaderboards/${leaderboardId}/entries?type=${type}`),

  getUserByDiscordId: (discordId: string) =>
    apiFetch<any>(`/users/by-discord/${discordId}`),

  getUserStatsByDiscordId: (discordId: string) =>
    apiFetch<any>(`/users/by-discord/${discordId}/stats`),

  // Protected endpoints (require API key)
  createMatch: (data: {
    challengerDiscordId: string;
    challengeeDiscordId: string;
    game: string;
    platform: string;
    type: 'XP' | 'RANKED';
    bestOf: number;
    selectedMaps: string[];
    message?: string;
  }) => apiFetch<any>('/matches/bot/create', {
    method: 'POST',
    body: JSON.stringify(data),
    authenticated: true,
  }),

  acceptMatch: (matchId: string, discordId: string) =>
    apiFetch<any>(`/matches/bot/${matchId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify({ discordId }),
      authenticated: true,
    }),

  declineMatch: (matchId: string, discordId: string) =>
    apiFetch<any>(`/matches/bot/${matchId}/decline`, {
      method: 'PATCH',
      body: JSON.stringify({ discordId }),
      authenticated: true,
    }),

  acceptMatchfinderListing: (matchId: string, discordId: string) =>
    apiFetch<any>(`/matches/bot/matchfinder/${matchId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify({ discordId }),
      authenticated: true,
    }),

  cancelMatchfinderListing: (matchId: string, discordId: string) =>
    apiFetch<any>(`/matches/bot/matchfinder/${matchId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ discordId }),
      authenticated: true,
    }),

  completeMatch: (data: {
    challengerDiscordId: string;
    challengeeDiscordId: string;
    winnerDiscordId: string;
    leaderboardId: string;
    map: string;
  }) => apiFetch<any>('/matches/bot/complete-match', {
    method: 'POST',
    body: JSON.stringify(data),
    authenticated: true,
  }),

  updateUserProfile: (discordId: string, data: { xboxGamertag?: string; ps3Username?: string; plutoniumUsername?: string; activisionId?: string }) =>
    apiFetch<any>(`/users/by-discord/${discordId}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  resolvePlutoId: async (plutoUsername: string): Promise<string | null> => {
    try {
      const res = await fetch(`https://forum.plutonium.pw/api/user/${encodeURIComponent(plutoUsername)}`);
      if (!res.ok) return null;
      const data = await res.json() as any;
      return data.uid?.toString() ?? null;
    } catch {
      return null;
    }
  },

  setPlutoId: (userId: string, plutoId: string) =>
    apiFetch<any>(`/users/${userId}/pluto-id`, {
      method: 'PATCH',
      body: JSON.stringify({ plutoId }),
    }),

  getAvailableServer: (queueId: string) =>
    apiFetch<any>(`/botzei/game-servers/${queueId}/available`, {
      authenticated: true,
    }),

  setServerAvailability: (serverId: string, available: boolean) =>
    apiFetch<any>(`/botzei/game-servers/${serverId}/available`, {
      method: 'PATCH',
      body: JSON.stringify({ available }),
      authenticated: true,
    }),

  getMapsByGame: (gameName: string) =>
    apiFetch<{ id: string; mapName: string }[]>(`/games/${encodeURIComponent(gameName)}/maps`),

  createUser: (data: { discordId: string; username: string; xboxGamertag?: string }) =>
    apiFetch<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
