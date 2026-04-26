/**
 * Plutonium queue state persistence via the backend Postgres database.
 *
 * Separate state blob from the standard queue — stored in its own
 * key in the queue_state table.
 */

import { PlutoQueueState } from './types.js';

function getBackendUrl() { return process.env.BACKEND_URL || 'http://localhost:3000'; }
function getApiKey() { return process.env.BOT_API_KEY || ''; }

let state: PlutoQueueState = { queues: [], matches: [] };
let loaded = false;

export function getState(): PlutoQueueState {
  return state;
}

export async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    const res = await fetch(`${getBackendUrl()}/botzei/pluto-queue-state`, {
      headers: { 'x-api-key': getApiKey() },
    });
    if (res.ok) {
      const data = await res.json() as any;
      state = {
        queues: data.queues ?? [],
        matches: data.matches ?? [],
      };
      const qc = state.queues.length;
      const mc = state.matches.length;
      if (qc > 0 || mc > 0) {
        console.log(`[PlutoQueue] Loaded ${qc} queue(s) and ${mc} match(es) from database`);
      }
    }
  } catch (err) {
    console.error('[PlutoQueue] Failed to load state:', err);
  }
  loaded = true;
}

export function saveState(): void {
  fetch(`${getBackendUrl()}/botzei/pluto-queue-state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
    },
    body: JSON.stringify(state),
  }).catch((err) => {
    console.error('[PlutoQueue] Failed to save state:', err);
  });
}
