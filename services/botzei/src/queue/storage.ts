/**
 * Queue/match state persistence via the backend Postgres database.
 *
 * - State is loaded once on first access via HTTP
 * - In-memory cache is the single source of truth during process lifetime
 * - Every mutation calls saveState() which pushes to the backend async
 * - On startup, loadState() fetches the latest from Postgres
 */

import { QueueState } from './types.js';

function getBackendUrl() { return process.env.BACKEND_URL || 'http://localhost:3000'; }
function getApiKey() { return process.env.BOT_API_KEY || ''; }

let state: QueueState = { queues: [], matches: [] };
let loaded = false;
let loading: Promise<void> | null = null;

async function fetchState(): Promise<QueueState> {
  try {
    const response = await fetch(`${getBackendUrl()}/botzei/queue-state`, {
      headers: { 'x-api-key': getApiKey() },
    });
    if (!response.ok) {
      console.error(`[Queue] Failed to load state from backend: ${response.status}`);
      return { queues: [], matches: [] };
    }
    const data = await response.json() as any;
    return {
      queues: data.queues ?? [],
      matches: data.matches ?? [],
    };
  } catch (err) {
    console.error('[Queue] Failed to fetch state from backend:', err);
    return { queues: [], matches: [] };
  }
}

async function pushState(): Promise<void> {
  try {
    await fetch(`${getBackendUrl()}/botzei/queue-state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
      },
      body: JSON.stringify(state),
    });
  } catch (err) {
    console.error('[Queue] Failed to save state to backend:', err);
  }
}

export function loadState(): QueueState {
  if (!loaded && !loading) {
    // Kick off async load but return empty state synchronously
    // The state will be populated by the time any interaction happens
    loading = fetchState().then((s) => {
      state = s;
      loaded = true;
      loading = null;
      console.log(
        `[Queue] Loaded ${state.queues.length} queue(s) and ${state.matches.length} match(es) from database`,
      );
    });
  }
  return state;
}

/**
 * Ensure state is loaded. Call this during bot startup before
 * any interactions can come in.
 */
export async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  if (loading) {
    await loading;
    return;
  }
  state = await fetchState();
  loaded = true;
  console.log(
    `[Queue] Loaded ${state.queues.length} queue(s) and ${state.matches.length} match(es) from database`,
  );
}

export function saveState(): void {
  // Fire-and-forget push to backend
  pushState().catch(() => {});
}
