const { once } = require("events");
const getBestLavalinkNode = require("../../../functions/getBestLavalinkNode.js");

module.exports = async (client, node) => {
    console.log(`[INFO] Node ${node.options.name} ready`);

    if (!client.isReady()) {
        await once(client, "clientReady");
    }

    if (client.data.get("reconnectBootstrapCompleted")) return;

    const configuredNodeOrder = client.config.rainlinkNodes.map((configuredNode) => configuredNode.name);
    const onlineNodes = client.rainlink.nodes
        .all()
        .filter((connectedNode) => connectedNode.online)
        .sort((leftNode, rightNode) => configuredNodeOrder.indexOf(leftNode.options.name) - configuredNodeOrder.indexOf(rightNode.options.name));

    const coordinatorNode = onlineNodes[0];

    if (!coordinatorNode || coordinatorNode.options.name !== node.options.name) return;

    client.data.set("reconnectBootstrapCompleted", true);

    const guildDatas = await client.guildData.find();
    const reconnects = guildDatas.filter((guildData) => guildData.reconnect.status);

    console.log(`[INFO] Auto reconnect found in ${reconnects.length} servers`);

    reconnects.forEach((guildData, index) => {
        setTimeout(async () => {
            try {
                const guild = await client.guilds.cache.get(guildData.id);
                const text = await client.channels.cache.get(guildData.reconnect.text);
                const voice = await client.channels.cache.get(guildData.reconnect.voice);

                if (!guildData.reconnect.status || !guild || !text || !voice) return;
                if (client.rainlink.players.get(guild.id)) return;

                const nodeName = await getBestLavalinkNode(client);

                await client.rainlink.create({
                    guildId: guild.id,
                    voiceId: voice.id,
                    textId: text.id,
                    shardId: guild.shardId,
                    volume: client.config.defaultVolume,
                    ...(nodeName && { nodeName }),
                    deaf: true,
                });
            } catch (error) {
                console.error(`[ERROR] Failed to restore 24/7 player for guild ${guildData.id}:`, error.message);
            }
        }, index * 5000);
    });
};
