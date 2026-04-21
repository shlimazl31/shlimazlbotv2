const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "ping",
    description: "Botun gecikme süresini göster",
    category: "general",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction) => {
        const embed = createStatusEmbed(client, {
            tone: "info",
            title: "Ping",
            guildId: interaction.guildId,
            description: t(client, interaction.guildId, "ping.description", { ping: Math.round(client.ws.ping) }),
        });

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};

