const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

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
        const embed = new EmbedBuilder().setColor(client.config.embedColor);

        try {
            if (message.guild.id !== "1341164136079294487") {
                embed.setDescription("Bu komut sadece destek sunucusunda kullanilabilir.");
                return message.reply({ embeds: [embed] });
            }

            if (!message.mentions.channels.size && !args[0]) {
                embed.setDescription("Lutfen bir kanal belirtin.\nOrnek: `!ticket #kanal`");
                return message.reply({ embeds: [embed] });
            }

            const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
            if (!channel) {
                embed.setDescription("Gecerli bir kanal belirtin.");
                return message.reply({ embeds: [embed] });
            }

            const ticketEmbed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle("Destek Talebi")
                .setDescription("Destek almak icin asagidaki butona tiklayin.")
                .setFooter({ text: `${message.guild.name} | Ticket Sistemi` });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("create_ticket")
                    .setLabel("Ticket Olustur")
                    .setEmoji("🎫")
                    .setStyle(ButtonStyle.Primary)
            );

            await channel.send({ embeds: [ticketEmbed], components: [row] });

            embed.setDescription("Ticket sistemi basariyla kuruldu.");
            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Ticket komutu hatasi:", error);
            embed.setDescription("Komut calistirilirken bir hata olustu.");
            return message.reply({ embeds: [embed] });
        }
    }
};
