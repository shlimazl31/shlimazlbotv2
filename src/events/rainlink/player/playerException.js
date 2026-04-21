const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { t } = require("../../../functions/t.js");

module.exports = async (client, player, data) => {
    if (!player) return;

    const guild = await client.guilds.cache.get(player.guildId);
    if (guild) console.error(`[ERROR] Player got an exception from ${guild.name} (${guild.id})`, data);

    if (player.message) player.message.delete().catch(() => null);

    const channel = await client.channels.cache.get(player.textId);
    const descriptionKey = !player.queue.isEmpty ? "playerEvents.playbackErrorSkip" : "playerEvents.playbackErrorStop";
    const embed = createStatusEmbed(client, {
        tone: "error",
        title: "Player",
        guildId: player.guildId,
        description: t(client, player.guildId, descriptionKey),
    });

    if (channel) await channel.send({ embeds: [embed] });
    return player.skip();
};
