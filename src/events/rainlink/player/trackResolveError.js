const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { t } = require("../../../functions/t.js");

module.exports = async (client, player, track, message) => {
    if (!player) return;

    const guild = await client.guilds.cache.get(player.guildId);
    if (guild) console.error(`[ERROR] Song error from ${guild.name} (${guild.id})`, message);

    if (player.message) player.message.delete().catch(() => null);

    const channel = await client.channels.cache.get(player.textId);
    const descriptionKey = !player.queue.isEmpty ? "playerEvents.resolveErrorSkip" : "playerEvents.resolveErrorStop";
    const embed = createStatusEmbed(client, {
        tone: "error",
        title: "Player",
        guildId: player.guildId,
        description: t(client, player.guildId, descriptionKey),
    });

    if (channel) await channel.send({ embeds: [embed] });
    return player.skip();
};
