// Simulated periodic health monitor that randomly toggles node availability.

const {
  nodes,
  HEALTH_CHECK_INTERVAL_MS,
  HEALTH_DOWN_PROBABILITY,
} = require("../config/nodes.config");

const healthMap = {};
nodes.forEach((n) => (healthMap[n.id] = true));

let timer = null;

/**
 * Run a single health-check pass, randomly marking nodes down/up.
 * @returns {void}
 */
function runCheckCycle() {
  nodes.forEach((n) => {
    healthMap[n.id] = Math.random() >= HEALTH_DOWN_PROBABILITY;
  });
}

/**
 * Start the recurring health-check interval. Idempotent.
 * @returns {void}
 */
function startHealthChecks() {
  if (timer) return;
  timer = setInterval(runCheckCycle, HEALTH_CHECK_INTERVAL_MS);
}

/**
 * Stop the health-check interval (used in tests/shutdown).
 * @returns {void}
 */
function stopHealthChecks() {
  if (timer) clearInterval(timer);
  timer = null;
}

/**
 * Whether a node is currently considered healthy.
 * @param {string} nodeId - Node identifier.
 * @returns {boolean} True if healthy.
 */
function isHealthy(nodeId) {
  return Boolean(healthMap[nodeId]);
}

/**
 * Snapshot of current health state.
 * @returns {Record<string, boolean>} Map of node id to health status.
 */
function getHealthMap() {
  return { ...healthMap };
}

module.exports = {
  startHealthChecks,
  stopHealthChecks,
  isHealthy,
  getHealthMap,
  runCheckCycle,
};
