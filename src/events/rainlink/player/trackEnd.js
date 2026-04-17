module.exports = async (client, player) => {
    if (!player) return;

    const guild = await client.guilds.cache.get(player.guildId);

    console.debug(`[DEBUG] Track ended from ${guild.name} (${guild.id})`);

    if (player.message) player.message.delete().catch((e) => {});
};
