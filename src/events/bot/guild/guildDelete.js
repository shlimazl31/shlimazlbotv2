const { EmbedBuilder } = require("discord.js");

module.exports = async (client, guild) => {
    const channel = await client.channels.cache.get("1373772886594027712");
    if (!channel) return;

    // Tüm sunuculardaki toplam üye sayısını hesapla
    const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    const embed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle("Sunucudan Ayrıldım!")
        .setDescription(`**Sunucu Adı:** ${guild.name}\n**Sunucu ID:** ${guild.id}\n**Üye Sayısı:** ${guild.memberCount}\n**Toplam Üye Sayısı:** ${totalMembers}`)
        .setTimestamp();

    channel.send({ embeds: [embed] });
}; 