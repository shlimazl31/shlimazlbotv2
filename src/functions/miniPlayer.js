const { createNowPlayingEmbed, createNowPlayingComponents, startNowPlayingRefresh } = require("./createNowPlayingCard.js");
const { getGuildData, getGuildSettings, persistGuildData } = require("./guildSettings.js");

async function sendOrUpdatePlayerMessage(client, player) {
    const settings = getGuildSettings(client, player.guildId);

    if (!settings.miniPlayer.enabled) {
        const channel = client.channels.cache.get(player.textId);
        if (!channel) return null;

        const message = await channel.send({
            embeds: [createNowPlayingEmbed(client, player)],
            components: createNowPlayingComponents(client, player),
        });

        player.message = message;
        startNowPlayingRefresh(client, player);

        return message;
    }

    const channel = client.channels.cache.get(settings.miniPlayer.channelId || player.textId);
    if (!channel) return null;

    const payload = {
        embeds: [createNowPlayingEmbed(client, player)],
        components: createNowPlayingComponents(client, player),
    };
    const existingMessage = await fetchMiniPlayerMessage(channel, settings.miniPlayer.messageId);
    const message = existingMessage ? await existingMessage.edit(payload) : await channel.send(payload);

    player.message = message;
    await saveMiniPlayerMessage(client, player.guildId, channel.id, message.id);
    startNowPlayingRefresh(client, player);

    return message;
}

async function disablePlayerMessage(client, player) {
    if (!player?.message) return;

    const settings = getGuildSettings(client, player.guildId);
    if (settings.miniPlayer.enabled) {
        await player.message
            .edit({
                embeds: player.queue.current ? [createNowPlayingEmbed(client, player)] : undefined,
                components: player.queue.current ? createNowPlayingComponents(client, player, true) : [],
            })
            .catch(() => null);
        return;
    }

    await player.message.delete().catch(() => null);
}

async function saveMiniPlayerMessage(client, guildId, channelId, messageId) {
    const guildData = getGuildData(client, guildId) || { id: guildId };
    const settings = getGuildSettings(client, guildId);

    settings.miniPlayer.enabled = true;
    settings.miniPlayer.channelId = channelId;
    settings.miniPlayer.messageId = messageId;
    guildData.settings = settings;

    await persistGuildData(client, guildId, guildData);
}

async function fetchMiniPlayerMessage(channel, messageId) {
    if (!messageId) return null;

    try {
        return await channel.messages.fetch(messageId);
    } catch (error) {
        return null;
    }
}

module.exports = {
    disablePlayerMessage,
    sendOrUpdatePlayerMessage,
};
