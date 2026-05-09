// Weighted round-robin fallback router that skips unhealthy nodes.

const { nodes } = require("../config/nodes.config");
const healthCheck = require("./healthCheck");

const pool = [];
nodes.forEach((n) => {
  for (let i = 0; i < n.weight; i++) pool.push(n.id);
});

let cursor = 0;

/**
 * Get the next healthy node from the weighted pool.
 * @returns {string|null} Node id, or null if all are unhealthy.
 */
function getNextWeightedNode() {
  if (pool.length === 0) return null;

  for (let attempts = 0; attempts < pool.length; attempts++) {
    const candidate = pool[cursor % pool.length];
    cursor = (cursor + 1) % pool.length;
    if (healthCheck.isHealthy(candidate)) return candidate;
  }
  return null;
}

/**
 * Read-only access to the weighted pool (debug/testing).
 * @returns {string[]} Copy of the pool array.
 */
function getPool() {
  return [...pool];
}

module.exports = { getNextWeightedNode, getPool };
