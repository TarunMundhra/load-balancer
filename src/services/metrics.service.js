// In-memory metrics tracker with an ASCII dashboard renderer.

const { nodes } = require("../config/nodes.config");

let state = createInitialState();

/**
 * Build a fresh metrics state object.
 * @returns {{ totalRequests: number, requestsPerNode: Record<string, number>, blockedRequests: number, deadNodeHits: number }}
 *   Initial zeroed metrics.
 */
function createInitialState() {
  const requestsPerNode = {};
  nodes.forEach((n) => (requestsPerNode[n.id] = 0));
  return {
    totalRequests: 0,
    requestsPerNode,
    blockedRequests: 0,
    deadNodeHits: 0,
  };
}

/**
 * Record a successfully routed request.
 * @param {string} nodeId - Selected node identifier.
 * @returns {void}
 */
function record(nodeId) {
  state.totalRequests += 1;
  state.requestsPerNode[nodeId] = (state.requestsPerNode[nodeId] || 0) + 1;
}

/**
 * Record a rate-limited request.
 * @returns {void}
 */
function recordBlocked() {
  state.blockedRequests += 1;
}

/**
 * Record a dead-node hit on the consistent hash ring.
 * @returns {void}
 */
function recordDeadHit() {
  state.deadNodeHits += 1;
}

/**
 * Render an ASCII table of per-node request counts.
 * @returns {string} Multi-line dashboard string.
 */
function renderDashboard() {
  const lines = [];
  lines.push("+------------+----------+");
  lines.push("| Node       | Requests |");
  lines.push("+------------+----------+");
  for (const [id, count] of Object.entries(state.requestsPerNode)) {
    lines.push(`| ${id.padEnd(10)} | ${String(count).padStart(8)} |`);
  }
  lines.push("+------------+----------+");
  lines.push(`Total: ${state.totalRequests}  Blocked: ${state.blockedRequests}  DeadHits: ${state.deadNodeHits}`);
  return lines.join("\n");
}

/**
 * Get a snapshot of metrics including the ASCII dashboard.
 * @returns {object} Metrics state plus dashboard string.
 */
function getMetrics() {
  return { ...state, dashboard: renderDashboard() };
}

/**
 * Reset all metrics counters to zero.
 * @returns {void}
 */
function reset() {
  state = createInitialState();
}

module.exports = { record, recordBlocked, recordDeadHit, getMetrics, reset };
