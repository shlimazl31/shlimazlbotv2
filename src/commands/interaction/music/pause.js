const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");

module.exports = {
    name: "pause",
    description: "Mevcut sarkiyi duraklat",
    category: "music",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: true,
        player: true,
        current: true,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        const embed = createStatusEmbed(client, { tone: "info", title: "Duraklat" });

        if (player.paused) {
            embed.setDescription("Sarki zaten duraklatilmis durumda.");
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.pause();
        await refreshNowPlayingMessage(client, player);

        embed.setDescription("Mevcut sarki duraklatildi.");
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
