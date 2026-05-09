// Per-IP fixed-window rate limiter backed by an in-memory Map.

const {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} = require("../config/nodes.config");

const buckets = new Map(); // ip -> { count, windowStart }

/**
 * Check whether an IP is allowed to make another request.
 * @param {string} ip - Client IP address.
 * @returns {{ allowed: boolean, remaining: number }} Decision plus remaining quota.
 */
function check(ip) {
  const now = Date.now();
  const entry = buckets.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

/**
 * Reset all rate-limit state (test/utility helper).
 * @returns {void}
 */
function reset() {
  buckets.clear();
}

module.exports = { check, reset };
