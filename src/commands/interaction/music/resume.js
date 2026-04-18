const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");

module.exports = {
    name: "resume",
    description: "Duraklatilan sarkiyi devam ettir",
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
        const embed = createStatusEmbed(client, { tone: "success", title: "Devam Et" });

        if (!player.paused) {
            embed.setDescription("Sarki zaten oynuyor.");
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.resume();
        await refreshNowPlayingMessage(client, player);

        embed.setDescription("Sarki tekrar oynatilmaya basladi.");
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
