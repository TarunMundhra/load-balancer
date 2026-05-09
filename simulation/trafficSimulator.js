// Standalone CLI traffic simulator that drives the load balancer with random IPs.
//
// ──────────────────────────────────────────────────────────────────────────
//  CONSISTENT HASHING — WHY THE SAME IP HITS THE SAME NODE
// ──────────────────────────────────────────────────────────────────────────
//  Every physical node is represented by many "virtual nodes" placed at
//  deterministic positions on a circular ring (0..RING_SIZE-1). To route an
//  IP, we hash it to a ring position and walk clockwise until we hit the
//  first virtual slot — its owning physical node receives the request.
//
//  Because both the IP and the virtual slots are hashed deterministically,
//  the same IP always lands on the same node, even when nodes are added or
//  removed. Adding/removing a node only reshuffles the keys that fall in
//  the affected arc, not all keys. This gives us sticky routing with
//  minimal disruption — ideal for caches and session affinity.
// ──────────────────────────────────────────────────────────────────────────

const { generateRandomIP } = require("../src/utils/ipGenerator");
const loadBalancer = require("../src/services/loadBalancer.service");
const metrics = require("../src/services/metrics.service");

/**
 * Simulate N requests through the load balancer.
 * @param {number} count - Number of synthetic requests to send.
 * @returns {void}
 */
function simulateTraffic(count) {
  console.log(`\n[Simulator] Sending ${count} requests...\n`);
  for (let i = 0; i < count; i++) {
    const ip = generateRandomIP();
    const result = loadBalancer.route(ip);
    if (result.status === "RATE_LIMITED") {
      console.log(`Blocked (rate limit): ${ip}`);
    }
  }
  console.log("\n[Simulator] Final metrics:\n");
  const m = metrics.getMetrics();
  console.log(m.dashboard);
}

const arg = parseInt(process.argv[2], 10);
const count = Number.isFinite(arg) && arg > 0 ? arg : 10;
simulateTraffic(count);
