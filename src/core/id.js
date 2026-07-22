/**
 * Deterministic ID generator for Flow Matrix entities.
 * Produces short, URL-safe, collision-resistant IDs without external deps.
 */

let counter = 0;

/**
 * Generate a unique ID with an optional prefix.
 * Format: prefix_timestamp_base36_counter
 * @param {string} [prefix='fm'] - Short prefix (e.g. 'obj', 'vip', 'fw')
 * @returns {string}
 */
export function generateId(prefix = 'fm') {
  counter++;
  const ts = Date.now().toString(36);
  const seq = counter.toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${ts}${rand}${seq}`;
}

/**
 * Reset counter (useful for testing).
 */
export function resetIdCounter() {
  counter = 0;
}
