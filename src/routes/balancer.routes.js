// Express route definitions for the load balancer API surface.

const express = require("express");
const loadBalancer = require("../services/loadBalancer.service");
const healthCheck = require("../core/healthCheck");
const metrics = require("../services/metrics.service");
const { generateRandomIP } = require("../utils/ipGenerator");

const router = express.Router();

/**
 * Route a single request through the load balancer.
 */
router.post("/route", (req, res) => {
  try {
    const ip = (req.body && req.body.ip) || generateRandomIP();
    const result = loadBalancer.route(ip);
    res.json({ ...result, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Inspect the current health status of all nodes.
 */
router.get("/health", (_req, res) => {
  try {
    res.json(healthCheck.getHealthMap());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Read aggregated metrics including an ASCII dashboard string.
 */
router.get("/metrics", (_req, res) => {
  try {
    res.json(metrics.getMetrics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Simulate N random requests through the balancer.
 */
router.post("/simulate", (req, res) => {
  try {
    const count = Number((req.body && req.body.count) || 10);
    const distribution = {};
    let blocked = 0;
    for (let i = 0; i < count; i++) {
      const ip = generateRandomIP();
      const r = loadBalancer.route(ip);
      if (r.status === "RATE_LIMITED") blocked += 1;
      else distribution[r.node] = (distribution[r.node] || 0) + 1;
    }
    res.json({ total: count, distribution, blocked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /dashboard — visual HTML metrics page
router.get("/dashboard", (req, res) => {
  const m = metrics.getMetrics();
  const h = healthCheck.getHealthMap();
  const total = m.totalRequests || 1; // avoid divide by zero

  const nodeRows = Object.entries(m.requestsPerNode).map(([node, count]) => {
    const pct   = Math.round((count / total) * 100);
    const bar   = "█".repeat(Math.floor(pct / 5)) || "░";
    const health = h[node] ? "🟢" : "🔴";
    return `
      <tr>
        <td>${health} ${node}</td>
        <td>${count}</td>
        <td>${pct}%</td>
        <td style="color:#4ade80">${bar}</td>
      </tr>`;
  }).join("");

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Load Balancer Dashboard</title>
      <meta http-equiv="refresh" content="5">
      <style>
        body { font-family: monospace; background: #0f172a;
               color: #e2e8f0; padding: 2rem; }
        h1   { color: #4ade80; }
        table{ border-collapse: collapse; width: 100%; margin-top: 1rem; }
        th   { background: #1e293b; padding: 0.75rem 1rem;
               text-align: left; color: #94a3b8; }
        td   { padding: 0.75rem 1rem; border-bottom: 1px solid #1e293b; }
        .stat{ background: #1e293b; padding: 1rem; border-radius: 8px;
               margin: 0.5rem; display: inline-block; min-width: 150px; }
        .stat h3 { margin: 0; color: #94a3b8; font-size: 0.8rem; }
        .stat p  { margin: 0.5rem 0 0; font-size: 1.5rem; color: #4ade80; }
      </style>
    </head>
    <body>
      <h1>⚡ Load Balancer Dashboard</h1>
      <p style="color:#64748b">Auto-refreshes every 5 seconds</p>

      <div>
        <div class="stat">
          <h3>TOTAL REQUESTS</h3>
          <p>${m.totalRequests}</p>
        </div>
        <div class="stat">
          <h3>BLOCKED</h3>
          <p>${m.blockedRequests}</p>
        </div>
        <div class="stat">
          <h3>DEAD NODE HITS</h3>
          <p>${m.deadNodeHits}</p>
        </div>
      </div>

      <table>
        <tr>
          <th>Node</th><th>Requests</th>
          <th>Share</th><th>Distribution</th>
        </tr>
        ${nodeRows}
      </table>
    </body>
    </html>
  `);
});

/**
 * Reset all in-memory metrics back to zero.
 */
router.delete("/metrics/reset", (_req, res) => {
  try {
    metrics.reset();
    res.json({ message: "Metrics reset" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
