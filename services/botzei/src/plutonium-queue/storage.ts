/**
 * Plutonium queue state — reactive with RxJS.
 *
 * State lives in a BehaviorSubject. Mutations go through `update()`,
 * which emits to the subject. A debounced subscription auto-persists
 * to the backend Postgres database.
 */

import { BehaviorSubject, debounceTime, skip } from 'rxjs';
import { PlutoQueueState } from './types.js';

function getBackendUrl() { return process.env.BACKEND_URL || 'http://localhost:3000'; }
function getApiKey() { return process.env.BOT_API_KEY || ''; }

const state$ = new BehaviorSubject<PlutoQueueState>({ queues: [], servers: [] });

// Auto-persist on changes (skip initial value, debounce rapid mutations)
state$.pipe(skip(1), debounceTime(500)).subscribe((s) => {
  fetch(`${getBackendUrl()}/botzei/pluto-queue-state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
    },
    body: JSON.stringify(s),
  }).catch((err) => {
    console.error('[PlutoQueue] Failed to save state:', err);
  });
});

/** Current snapshot of the state. */
export function getState(): PlutoQueueState {
  return state$.getValue();
}

/** Mutate state and trigger auto-persist. */
export function update(fn: (state: PlutoQueueState) => void): void {
  const current = state$.getValue();
  fn(current);
  state$.next(current);
}

export async function ensureLoaded(retries = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${getBackendUrl()}/botzei/pluto-queue-state`, {
        headers: { 'x-api-key': getApiKey() },
      });
      if (res.ok) {
        const data = await res.json() as any;
        const loaded: PlutoQueueState = {
          queues: data.queues ?? [],
          servers: data.servers ?? [],
        };
        const qc = loaded.queues.length;
        const sc = loaded.servers.length;
        if (qc > 0 || sc > 0) {
          console.log(`[PlutoQueue] Loaded ${qc} queue(s) and ${sc} server(s) from database`);
        }
        // Set without triggering persist (it's already in the DB)
        (state$ as any)._value = loaded;
        return;
      }
    } catch {
      if (attempt < retries) {
        console.log(`[PlutoQueue] Backend not ready, retrying in ${delayMs / 1000}s (${attempt}/${retries})`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.error('[PlutoQueue] Failed to load state after all retries');
      }
    }
  }
}
