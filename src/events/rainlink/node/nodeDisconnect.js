module.exports = (client, node, code, reason) => {
    console.warn(`[WARN] Node ${node.options.name} disconnected`, code, reason);
};
