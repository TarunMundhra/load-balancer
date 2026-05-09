// Static configuration for backend nodes and tunable load balancer constants.

const nodes = [
  { id: "Node-A", weight: 1, url: "http://localhost:3001" },
  { id: "Node-B", weight: 2, url: "http://localhost:3002" },
  { id: "Node-C", weight: 1, url: "http://localhost:3003" },
];

const HEALTH_CHECK_INTERVAL_MS = 10000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60000;
const VIRTUAL_NODES = 100;
const RING_SIZE = 360;
const HEALTH_DOWN_PROBABILITY = 0.1;

module.exports = {
  nodes,
  HEALTH_CHECK_INTERVAL_MS,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  VIRTUAL_NODES,
  RING_SIZE,
  HEALTH_DOWN_PROBABILITY,
};
