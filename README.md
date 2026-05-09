# Load Balancer

A production-quality Node.js + Express load balancer featuring **consistent hashing**, **health checks**, **weighted round-robin fallback**, **per-IP rate limiting**, and **in-memory metrics**.

## 1. Project Overview

This service accepts an incoming client IP and decides which backend node should serve it. The routing decision is sticky (same IP → same node) thanks to a consistent hashing ring. When the natural target is unhealthy, traffic is shed to a weighted round-robin pool, and per-IP rate limits keep abusive clients out. All counters are kept in memory and exposed through a small REST API.

## 2. How Consistent Hashing Works (Plain English)

Imagine a circle numbered `0..359`. Every backend node is "scattered" around that circle as 100 tiny markers (virtual nodes). To pick a node for an IP:

1. Convert the IP string into a number on the same circle.
2. Walk clockwise until you hit the first marker.
3. The owner of that marker is your node.

Because the math is deterministic, **the same IP always lands on the same node**. When you add or remove a node, only the keys in the affected arc move — most clients keep their existing node, which is great for caches and session stickiness.

## 3. Folder Structure

```
load-balancer/
├── src/
│   ├── config/nodes.config.js
│   ├── core/
│   │   ├── consistentHash.js
│   │   ├── healthCheck.js
│   │   ├── rateLimiter.js
│   │   └── weightedRouter.js
│   ├── middleware/requestLogger.js
│   ├── routes/balancer.routes.js
│   ├── services/
│   │   ├── loadBalancer.service.js
│   │   └── metrics.service.js
│   ├── utils/
│   │   ├── ipGenerator.js
│   │   └── nodeIdentifier.js
│   └── app.js
├── simulation/trafficSimulator.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 4. Setup & Run

```bash
git clone <your-repo-url> load-balancer
cd load-balancer
npm install
copy .env.example .env       # Windows  (use `cp` on macOS/Linux)
npm start                    # boots the API on PORT (default 3000)
npm run simulate -- 50       # standalone traffic simulation (50 requests)
```

## 5. API Endpoints

| Method | Path              | Description                                | Example body           |
|--------|-------------------|--------------------------------------------|------------------------|
| POST   | `/route`          | Route a single IP through the balancer     | `{ "ip": "1.2.3.4" }`  |
| GET    | `/health`         | Returns the per-node health map            | —                      |
| GET    | `/metrics`        | JSON metrics + ASCII dashboard             | —                      |
| POST   | `/simulate`       | Run N random requests through the balancer | `{ "count": 25 }`      |
| DELETE | `/metrics/reset`  | Reset all metric counters                  | —                      |

## 6. Bonus Features

- **Health Check** (`src/core/healthCheck.js`): A timer flips each node's status with a 10% chance of going DOWN per cycle (`HEALTH_CHECK_INTERVAL_MS`). Dead nodes are excluded from routing.
- **Weighted Routing** (`src/core/weightedRouter.js`): A weighted pool — `Node-B` appears twice (weight 2), `Node-A` and `Node-C` once each. Used as the fallback when consistent hashing lands on a dead node.
- **Rate Limiter** (`src/core/rateLimiter.js`): Fixed-window per-IP quota. Defaults: 5 requests / 60s. Returns `{ allowed: false }` once exceeded; window resets automatically.
- **Metrics** (`src/services/metrics.service.js`): Tracks `totalRequests`, `requestsPerNode`, `blockedRequests`, and `deadNodeHits`, plus a printable ASCII dashboard.

## 7. Example curl Commands

```bash
# Route a specific IP
curl -X POST http://localhost:3000/route ^
  -H "Content-Type: application/json" ^
  -d "{\"ip\":\"192.168.1.10\"}"

# Route with a random IP
curl -X POST http://localhost:3000/route -H "Content-Type: application/json" -d "{}"

# Health snapshot
curl http://localhost:3000/health

# Metrics snapshot (includes ASCII dashboard)
curl http://localhost:3000/metrics

# Simulate 25 requests
curl -X POST http://localhost:3000/simulate ^
  -H "Content-Type: application/json" ^
  -d "{\"count\":25}"

# Reset metrics
curl -X DELETE http://localhost:3000/metrics/reset
```
