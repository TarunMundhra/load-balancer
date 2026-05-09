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
