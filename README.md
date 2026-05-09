# Load Balancer

A Node.js + Express load balancer with **consistent hashing**, **health checks**, **weighted round-robin fallback**, **per-IP rate limiting**, **in-memory metrics**, and a **live HTML dashboard**.

This README is a hands-on guide focused on **how to test and play with the load balancer**.

---

## 1. What You Get

- A REST API on `http://localhost:3000`
- A live, auto-refreshing dashboard at `http://localhost:3000/dashboard`
- A standalone traffic simulator you can run from the terminal
- JSON endpoints for routing, health, metrics, and simulation

---

## 2. Quick Start

```bash
# 1. Install dependencies
npm install

# 2. (Optional) copy env file
copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux

# 3. Start the server
npm start
```

You should see:

```
[LoadBalancer] Listening on port 3000
[Ring] Total virtual slots: 300
[Ring] Nodes on ring: Node-A, Node-B, Node-C
```

Leave this terminal running.

---

## 3. Open the Live Dashboard

In your browser, open:

```
http://localhost:3000/dashboard
```

You will see a dark-themed dashboard with:

- **Total Requests**, **Blocked**, **Dead Node Hits** stat cards
- A per-node table with request count, share %, a green bar chart, and a 🟢 / 🔴 health indicator
- Auto-refresh every 5 seconds

The dashboard starts empty. Generate traffic with the methods below and watch the numbers climb in real time.

---

## 4. Generate Traffic

You have **three** ways to push traffic through the balancer.

### 4.1 Run the Standalone Simulator (Terminal)

In a **second terminal** (keep the server running in the first):

```bash
# Default: 10 requests
npm run simulate

# Custom count: 100 requests
npm run simulate -- 100

# Or call node directly
node simulation/trafficSimulator.js 250
```

The simulator prints each routing decision and a final ASCII dashboard, e.g.:

```
Incoming IP: 142.51.9.203 → Routed to: Node-B
Incoming IP: 88.4.221.17  → Routed to: Node-A
...
+------------+----------+
| Node       | Requests |
+------------+----------+
| Node-A     |       21 |
| Node-B     |       54 |
| Node-C     |       25 |
+------------+----------+
Total: 100  Blocked: 0  DeadHits: 3
```

Refresh the browser dashboard — the bars should match.

### 4.2 Hit `POST /simulate` Over HTTP

```bash
curl -X POST http://localhost:3000/simulate ^
  -H "Content-Type: application/json" ^
  -d "{\"count\":50}"
```

Returns a summary like:

```json
{
  "total": 50,
  "distribution": { "Node-A": 12, "Node-B": 27, "Node-C": 11 },
  "blocked": 0
}
```

### 4.3 Send Single Requests via `POST /route`

```bash
# Route a specific IP — note that the SAME IP always hits the SAME node
curl -X POST http://localhost:3000/route ^
  -H "Content-Type: application/json" ^
  -d "{\"ip\":\"10.0.0.42\"}"

# Run that command 5+ times back-to-back from the same IP and you will
# trigger the rate limiter (default: 5 requests / 60 seconds per IP)
```

A successful response:

```json
{ "node": "Node-B", "status": "OK", "ip": "10.0.0.42", "timestamp": "..." }
```

A rate-limited response:

```json
{ "node": null, "status": "RATE_LIMITED", "remaining": 0 }
```

---

## 5. Things to Try (Manual Tests)

### Test A — Sticky Routing (Consistent Hashing)

```bash
curl -X POST http://localhost:3000/route -H "Content-Type: application/json" -d "{\"ip\":\"1.2.3.4\"}"
curl -X POST http://localhost:3000/route -H "Content-Type: application/json" -d "{\"ip\":\"1.2.3.4\"}"
curl -X POST http://localhost:3000/route -H "Content-Type: application/json" -d "{\"ip\":\"1.2.3.4\"}"
```

The same IP should map to the **same node** every time (until that node goes unhealthy).

### Test B — Weighted Distribution

```bash
npm run simulate -- 500
```

Open `/dashboard`. `Node-B` (weight = 2) should receive roughly twice the dead-node fallback traffic of `Node-A` and `Node-C`. With consistent hashing dominating, all three usually look balanced — that is expected.

### Test C — Health Failures

The health checker flips each node with a 10% chance of going DOWN every 10 seconds. Watch the dashboard health dot turn 🔴, then run more traffic — you will see the **DEAD NODE HITS** counter rise and traffic skip the dead node.

```bash
curl http://localhost:3000/health
```

### Test D — Rate Limiting

```bash
for /L %i in (1,1,8) do curl -s -X POST http://localhost:3000/route -H "Content-Type: application/json" -d "{\"ip\":\"9.9.9.9\"}"
```

(Windows `cmd`. Use `for i in {1..8}; do ... ; done` on bash.)

After 5 hits the rest return `RATE_LIMITED`, and the dashboard's **BLOCKED** stat goes up.

### Test E — Reset Counters

```bash
curl -X DELETE http://localhost:3000/metrics/reset
```

The dashboard will zero out on its next refresh.

---

## 6. API Reference

| Method | Path             | Purpose                                 |
| ------ | ---------------- | --------------------------------------- |
| GET    | `/dashboard`     | Live HTML dashboard (auto-refreshes 5s) |
| POST   | `/route`         | Route one IP (random if `ip` omitted)   |
| GET    | `/health`        | Per-node health map JSON                |
| GET    | `/metrics`       | JSON metrics + ASCII `dashboard` field  |
| POST   | `/simulate`      | Run N synthetic requests in a loop      |
| DELETE | `/metrics/reset` | Zero all counters                       |

### Example curl Commands

```bash
curl http://localhost:3000/health
curl http://localhost:3000/metrics
curl -X POST http://localhost:3000/route -H "Content-Type: application/json" -d "{}"
curl -X POST http://localhost:3000/simulate -H "Content-Type: application/json" -d "{\"count\":25}"
curl -X DELETE http://localhost:3000/metrics/reset
```

---

## 7. How Consistent Hashing Works (Plain English)

Imagine a big circle numbered `0..RING_SIZE-1`. Every backend node is scattered around the circle as 100 tiny markers (virtual nodes). To pick a node for an IP:

1. Convert the IP string into a number on the same circle.
2. Walk clockwise until you hit the first marker.
3. The marker's owner gets the request.

Because the math is deterministic, **the same IP always lands on the same node**. Adding or removing a node only reshuffles the keys in the affected arc — most clients stay put. Great for caches and session affinity.

---

## 8. Folder Structure

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

---

## 9. NPM Scripts

| Script             | What it does                               |
| ------------------ | ------------------------------------------ |
| `npm start`        | Start the Express server on `PORT` (3000)  |
| `npm run dev`      | Start with `nodemon` for auto-reload       |
| `npm run simulate` | Run the standalone traffic simulator (CLI) |

---

## 10. Tweakable Knobs

All constants live in `src/config/nodes.config.js`:

- `nodes` — id, weight, url for each backend
- `HEALTH_CHECK_INTERVAL_MS` — how often health flips (default 10s)
- `RATE_LIMIT_MAX` — requests per window (default 5)
- `RATE_LIMIT_WINDOW_MS` — window size (default 60s)
- `VIRTUAL_NODES` — virtual slots per physical node (default 100)
- `RING_SIZE` — ring resolution (default 3600)
- `HEALTH_DOWN_PROBABILITY` — chance a node goes DOWN per cycle (default 0.1)

Change values, restart `npm start`, and re-run the tests above to see the effect.
