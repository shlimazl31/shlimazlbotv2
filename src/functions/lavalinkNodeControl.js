const drainedNodes = new Set();

function normalizeNodeName(name) {
    return String(name || "").trim().toLowerCase();
}

function setNodeDrained(name, drained) {
    const normalized = normalizeNodeName(name);
    if (!normalized) return;

    if (drained) drainedNodes.add(normalized);
    else drainedNodes.delete(normalized);
}

function isNodeDrained(name) {
    return drainedNodes.has(normalizeNodeName(name));
}

function getDrainedNodes() {
    return Array.from(drainedNodes);
}

async function resolveNode(nodes = []) {
    const onlineNodes = nodes.filter(isNodeOnline);
    const availableNodes = onlineNodes.filter((node) => !isNodeDrained(node.options?.name));
    const candidates = availableNodes.length ? availableNodes : onlineNodes;

    if (!candidates.length) return undefined;

    return candidates.sort(compareNodeLoad)[0];
}

function compareNodeLoad(left, right) {
    const leftPlayers = Number(left.stats?.players ?? 0);
    const rightPlayers = Number(right.stats?.players ?? 0);
    if (leftPlayers !== rightPlayers) return leftPlayers - rightPlayers;

    const leftCpu = Number(left.stats?.cpu?.lavalinkLoad ?? 0);
    const rightCpu = Number(right.stats?.cpu?.lavalinkLoad ?? 0);
    return leftCpu - rightCpu;
}

function isNodeOnline(node) {
    return Boolean(node && (node.state === 0 || node.connected || node.online));
}

module.exports = {
    getDrainedNodes,
    isNodeDrained,
    resolveNode,
    setNodeDrained,
};
