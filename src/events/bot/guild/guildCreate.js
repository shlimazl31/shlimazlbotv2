const { createDataGuild } = require("../../../functions/createData.js");
const { EmbedBuilder } = require("discord.js");

module.exports = async (client, guild) => {
    await createDataGuild(client, guild);

    const channel = await client.channels.cache.get("1370432444569751632");
    if (!channel) return;

    // Tüm sunuculardaki toplam üye sayısını hesapla
    const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    const embed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle("Yeni Sunucuya Katıldım!")
        .setDescription(`**Sunucu Adı:** ${guild.name}\n**Sunucu ID:** ${guild.id}\n**Üye Sayısı:** ${guild.memberCount}\n**Toplam Üye Sayısı:** ${totalMembers}`)
        .setTimestamp();

    channel.send({ embeds: [embed] });
};

/**
 * Project: Lunox
 * Author: adh319
 * Company: EnourDev
 * This code is the property of EnourDev and may not be reproduced or
 * modified without permission. For more information, contact us at
 * https://discord.gg/xhTVzbS5NU
 */
