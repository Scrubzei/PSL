/**
 * Queue system configuration.
 *
 * All values can be overridden via environment variables. Defaults are provided
 * so local development works out of the box.
 *
 * In Docker, make sure QUEUE_STORAGE_FILE points to a path inside a mounted
 * volume so queue/match state survives container restarts.
 */

export const QUEUE_CONFIG = {
  /** Channel where match threads are created when the queue pops. */
  MATCH_THREAD_CHANNEL_ID:
    process.env.QUEUE_MATCH_CHANNEL_ID || '1490432952641916999',

  /** Role to ping when a dispute is created. Empty = no ping. */
  REF_ROLE_ID: process.env.REF_ROLE_ID || '',

  /** Channel dispute notifications are posted in. Empty = skip. */
  DISPUTE_CHANNEL_ID: process.env.DISPUTE_CHANNEL_ID || '',

  /** On-disk path for persisted queue state. */
  STORAGE_FILE: process.env.QUEUE_STORAGE_FILE || './data/queue-state.json',

  /** Players required to pop a queue. 2 for 1v1. */
  QUEUE_SIZE: 2,
} as const;
