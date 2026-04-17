module.exports = async (client, player) => {
    if (!player) return;

    const guild = await client.guilds.cache.get(player.guildId);
    const guildData = client.data.get(`guildData_${guild.id}`);

    if (guildData.reconnect.status) {
        console.debug(`[DEBUG] Player reconnected to [${guild.name}] (${guild.id})`);
    } else {
        console.debug(`[DEBUG] Player created in [${guild.name}] (${guild.id})`);
    }
};
