module.exports = async (client) => {
    const nodes = client.rainlink?.nodes?.all?.() ?? [];
    const onlineNodes = nodes.filter((node) => node?.online);

    if (onlineNodes.length === 0) return null;

    try {
        const selectedNode = await client.rainlink.nodes.getLeastUsed(onlineNodes);

        if (selectedNode?.options?.name) {
            return selectedNode.options.name;
        }
    } catch (error) {
        console.warn("[WARN] Failed to resolve least used Lavalink node:", error.message);
    }

    return onlineNodes[0]?.options?.name ?? null;
};
