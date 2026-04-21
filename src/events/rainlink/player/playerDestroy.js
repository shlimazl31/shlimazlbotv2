const getBestLavalinkNode = require("../../../functions/getBestLavalinkNode.js");
const { clearNowPlayingState, stopNowPlayingRefresh } = require("../../../functions/createNowPlayingCard.js");
const { disablePlayerMessage } = require("../../../functions/miniPlayer.js");

module.exports = async (client, player) => {
    if (!player) return;

    const guild = await client.guilds.cache.get(player.guildId);
    if (!guild) return;

    console.debug(`[DEBUG] Player destroyed from [${guild.name}] (${guild.id})`);
    stopNowPlayingRefresh(client, guild.id);
    clearNowPlayingState(client, guild.id);

    await disablePlayerMessage(client, player);

    const guildData = client.data.get(`guildData_${guild.id}`);

    if (guildData && guildData.reconnect.status) {
        const voice = await client.channels.cache.get(guildData.reconnect.voice);
        const text = await client.channels.cache.get(guildData.reconnect.text);

        if (!voice || !text) {
            guildData.reconnect = { status: false, text: null, voice: null };

            await client.guildData.findOneAndUpdate({ id: guild.id }, { $set: { reconnect: guildData.reconnect } }, { upsert: true, new: true });
            client.data.set(`guildData_${guild.id}`, guildData);

            return;
        }

        const nodeName = await getBestLavalinkNode(client);

        return await client.rainlink.create({
            guildId: guild.id,
            voiceId: voice.id,
            textId: text.id,
            shardId: guild.shardId,
            volume: client.config.defaultVolume,
            ...(nodeName && { nodeName }),
            deaf: true,
        });
    }
};
