const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = async (client, guild) => {
    // Sadece destek sunucusu için çalışsın
    if (guild.id !== "1341164136079294487") return;

    try {
        // Korunacak kanal ve kategori ID'leri
        const protectedIds = [
            "1373772854029582480", // Kategori
            "1370432444569751632", // Kanal
            "1373772886594027712", // Kanal
            "1373773051749072916", // Kanal
            "1373772919083241572"  // Kanal
        ];

        // Tüm mevcut kanalları sil (korunacak kanallar hariç)
        await Promise.all(
            guild.channels.cache
                .filter(channel => !protectedIds.includes(channel.id) && !protectedIds.includes(channel.parentId))
                .map(channel => channel.delete().catch(() => {}))
        );

        // Ana kategori oluştur
        const mainCategory = await guild.channels.create({
            name: "📢・Bilgilendirme",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        // Bilgilendirme kanalları
        await guild.channels.create({
            name: "📢・duyurular",
            type: ChannelType.GuildText,
            parent: mainCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        await guild.channels.create({
            name: "📢・kurallar",
            type: ChannelType.GuildText,
            parent: mainCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        // Ticket kategorisi
        const ticketCategory = await guild.channels.create({
            name: "🎫・Ticket Sistemi",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        // Ticket kanalı
        const ticketChannel = await guild.channels.create({
            name: "🎫・ticket-oluştur",
            type: ChannelType.GuildText,
            parent: ticketCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        // Ticket mesajını gönder
        const ticketEmbed = {
            color: parseInt(client.config.embedColor, 16),
            title: "🎫 Destek Talebi",
            description: "Destek almak için aşağıdaki butona tıklayın.",
            footer: {
                text: `${guild.name} | Ticket Sistemi`
            }
        };

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("create_ticket")
                    .setLabel("Ticket Oluştur")
                    .setEmoji("🎫")
                    .setStyle(ButtonStyle.Primary)
            );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });

        // Genel sohbet kategorisi
        const chatCategory = await guild.channels.create({
            name: "💬・Sohbet",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        // Sohbet kanalları
        await guild.channels.create({
            name: "💬・genel-sohbet",
            type: ChannelType.GuildText,
            parent: chatCategory.id
        });

        await guild.channels.create({
            name: "🎵・müzik-sohbeti",
            type: ChannelType.GuildText,
            parent: chatCategory.id
        });

        // Ses kanalları kategorisi
        const voiceCategory = await guild.channels.create({
            name: "🔊・Ses Kanalları",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
                }
            ]
        });

        // Ses kanalları
        await guild.channels.create({
            name: "🎵・Müzik Odası",
            type: ChannelType.GuildVoice,
            parent: voiceCategory.id
        });

        await guild.channels.create({
            name: "🎮・Oyun Odası",
            type: ChannelType.GuildVoice,
            parent: voiceCategory.id
        });

        await guild.channels.create({
            name: "💬・Sohbet Odası",
            type: ChannelType.GuildVoice,
            parent: voiceCategory.id
        });

        console.log("[INFO] Destek sunucusu kanalları başarıyla düzenlendi!");
    } catch (error) {
        console.error("[ERROR] Destek sunucusu düzenlenirken hata oluştu:", error);
    }
}; 