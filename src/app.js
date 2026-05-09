// Express application bootstrap: wires middleware, routes, and starts the server.

require("dotenv").config();
const express = require("express");
const balancerRoutes = require("./routes/balancer.routes");
const requestLogger = require("./middleware/requestLogger");
const healthCheck = require("./core/healthCheck");

/**
 * Create and configure the Express application instance.
 * @returns {import('express').Express} Configured Express app.
 */
function createApp() {
  const app = express();
  app.use(express.json());
  app.use(requestLogger);
  app.use("/", balancerRoutes);

  app.use((err, _req, res, _next) => {
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  return app;
}

/**
 * Boot the server and start the health check loop.
 * @returns {void}
 */
function start() {
  const app = createApp();
  const port = process.env.PORT || 3000;

  healthCheck.startHealthChecks();

  app.listen(port, () => {
    console.log(`[LoadBalancer] Listening on port ${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { createApp };
