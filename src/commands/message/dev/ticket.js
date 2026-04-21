const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "ticket",
    description: "Ticket sistemini ayarla",
    category: "dev",
    aliases: ["destek"],
    permissions: {
        bot: ["ManageChannels", "SendMessages", "EmbedLinks"],
        user: ["ManageGuild"],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    devOnly: true,
    run: async (client, message, args) => {
        const guildId = message.guildId;
        const embed = new EmbedBuilder().setColor(client.config.embedColor);

        try {
            if (message.guild.id !== "1341164136079294487") {
                embed.setDescription(t(client, guildId, "ticket.supportOnly"));
                return message.reply({ embeds: [embed] });
            }

            if (!message.mentions.channels.size && !args[0]) {
                embed.setDescription(t(client, guildId, "ticket.needChannel"));
                return message.reply({ embeds: [embed] });
            }

            const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
            if (!channel) {
                embed.setDescription(t(client, guildId, "ticket.invalidChannel"));
                return message.reply({ embeds: [embed] });
            }

            const ticketEmbed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle(t(client, guildId, "ticket.requestTitle"))
                .setDescription(t(client, guildId, "ticket.requestDescription"))
                .setFooter({ text: t(client, guildId, "ticket.footer", { guild: message.guild.name }) });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("create_ticket")
                    .setLabel(t(client, guildId, "ticket.createLabel"))
                    .setEmoji("\uD83C\uDFAB")
                    .setStyle(ButtonStyle.Primary),
            );

            await channel.send({ embeds: [ticketEmbed], components: [row] });

            embed.setDescription(t(client, guildId, "ticket.setupDone"));
            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Ticket command error:", error);
            embed.setDescription(t(client, guildId, "permissions.commandError"));
            return message.reply({ embeds: [embed] });
        }
    },
};
