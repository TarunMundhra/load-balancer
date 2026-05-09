// Orchestrator that combines rate limiting, consistent hashing, health, and metrics.

const rateLimiter = require("../core/rateLimiter");
const consistentHash = require("../core/consistentHash");
const healthCheck = require("../core/healthCheck");
const weightedRouter = require("../core/weightedRouter");
const metrics = require("./metrics.service");
const { identifyNode } = require("../utils/nodeIdentifier");

/**
 * Route a single client IP to a backend node.
 * @param {string} ip - Client IP address.
 * @returns {{ node: string|null, status: string, ip?: string, remaining?: number }}
 *   Routing decision describing the chosen node and outcome.
 */
function route(ip) {
  const limit = rateLimiter.check(ip);
  if (!limit.allowed) {
    console.log(`RATE LIMITED: ${ip}`);
    metrics.recordBlocked();
    return { node: null, status: "RATE_LIMITED", remaining: limit.remaining };
  }

  const candidate = consistentHash.getNode(ip);
  let selected = candidate;

  if (!candidate || !healthCheck.isHealthy(candidate)) {
    metrics.recordDeadHit();
    selected = weightedRouter.getNextWeightedNode();
  }

  if (!selected) {
    return { node: null, status: "NO_HEALTHY_NODE", ip };
  }

  identifyNode(ip, selected);
  metrics.record(selected);
  return { node: selected, status: "OK", ip };
}

module.exports = { route };
