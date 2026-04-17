const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "ticket",
    description: "Ticket sistemini ayarla",
    category: "dev",
    aliases: ["destek"],
    permissions: {
        bot: ["ManageChannels", "SendMessages", "EmbedLinks"],
        user: ["ManageGuild"]
    },
    settings: {
        voice: false,
        player: false,
        current: false
    },
    devOnly: true,
    run: async (client, message, args) => {
        try {
            // Sadece belirli sunucuda çalışsın
            if (message.guild.id !== "1341164136079294487") {
                return message.reply("Bu komut sadece destek sunucusunda kullanılabilir.");
            }

            const embed = new EmbedBuilder().setColor(client.config.embedColor);

            // Kanal belirtilmemişse
            if (!message.mentions.channels.size && !args[0]) {
                embed.setDescription("Lütfen bir kanal belirtin.\nÖrnek: `!ticket #kanal`");
                return message.reply({ embeds: [embed] });
            }

            // Kanalı bul
            const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
            if (!channel) {
                embed.setDescription("Geçerli bir kanal belirtin.");
                return message.reply({ embeds: [embed] });
            }

            const ticketEmbed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle("🎫 Destek Talebi")
                .setDescription("Destek almak için aşağıdaki butona tıklayın.")
                .setFooter({ text: `${message.guild.name} | Ticket Sistemi` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("create_ticket")
                    .setLabel("Ticket Oluştur")
                    .setEmoji("🎫")
                    .setStyle(ButtonStyle.Primary)
            );

            await channel.send({ embeds: [ticketEmbed], components: [row] });

            embed.setDescription("Ticket sistemi başarıyla kuruldu!");
            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Ticket komutu hatası:", error);
            return message.reply("Komut çalıştırılırken bir hata oluştu.");
        }
    }
}; 