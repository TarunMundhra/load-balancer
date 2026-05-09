// Consistent hashing ring: maps IPs to nodes deterministically using virtual slots.

const { nodes, VIRTUAL_NODES, RING_SIZE } = require("../config/nodes.config");

const ring = new Map(); // position(number) -> nodeId(string)
let sortedPositions = [];

/**
 * Hash a string to a numeric position on the ring.
 * @param {string} key - Input string (IP or virtual node label).
 * @returns {number} Ring position in [0, RING_SIZE).
 */
function hash(key) {
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return sum % RING_SIZE;
}

/**
 * Rebuild the cached sorted ring positions array.
 * @returns {void}
 */
function rebuildSorted() {
  sortedPositions = Array.from(ring.keys()).sort((a, b) => a - b);
}

/**
 * Add a physical node to the ring with VIRTUAL_NODES virtual slots.
 * @param {string} nodeName - Node identifier.
 * @returns {void}
 */
function addNode(nodeName) {
  for (let i = 0; i < VIRTUAL_NODES; i++) {
    let pos = hash(`${nodeName}#${i}`);
    while (ring.has(pos)) pos = (pos + 1) % RING_SIZE;
    ring.set(pos, nodeName);
  }
  rebuildSorted();
  // Add at the bottom of your addNode() function
console.log(`[Ring] Total virtual slots: ${this.ring.length}`);
console.log(`[Ring] Nodes on ring: ${[...new Set(this.ring.map(s => s.node))]}`);
}

/**
 * Remove a physical node and all its virtual slots from the ring.
 * @param {string} nodeName - Node identifier to remove.
 * @returns {void}
 */
function removeNode(nodeName) {
  for (const [pos, owner] of ring.entries()) {
    if (owner === nodeName) ring.delete(pos);
  }
  rebuildSorted();
}

/**
 * Find the node responsible for a given IP by walking clockwise on the ring.
 * @param {string} ip - Client IP address.
 * @returns {string|null} Node id, or null if the ring is empty.
 */
function getNode(ip) {
  if (sortedPositions.length === 0) return null;
  const pos = hash(ip);
  for (const p of sortedPositions) {
    if (p >= pos) return ring.get(p);
  }
  return ring.get(sortedPositions[0]);
}

nodes.forEach((n) => addNode(n.id));

module.exports = { addNode, removeNode, getNode, hash };
