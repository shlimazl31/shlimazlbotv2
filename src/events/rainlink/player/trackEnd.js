const { clearNowPlayingState, stopNowPlayingRefresh } = require("../../../functions/createNowPlayingCard.js");
const { disablePlayerMessage } = require("../../../functions/miniPlayer.js");

module.exports = async (client, player) => {
    if (!player) return;

    const guild = client.guilds.cache.get(player.guildId);

    if (guild) console.debug(`[DEBUG] Track ended from ${guild.name} (${guild.id})`);
    stopNowPlayingRefresh(client, player.guildId);
    clearNowPlayingState(client, player.guildId);

    await disablePlayerMessage(client, player);
};
