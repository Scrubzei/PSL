const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_KEY = process.env.BOT_API_KEY;

interface FetchOptions extends RequestInit {
  authenticated?: boolean;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { authenticated = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (authenticated && API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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
};
