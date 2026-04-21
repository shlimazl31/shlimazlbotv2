const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "pause",
    description: "Mevcut şarkıyı duraklat",
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
        const guildId = interaction.guildId;
        const embed = createStatusEmbed(client, { tone: "info", title: t(client, guildId, "music.pause.title"), guildId });

        if (player.paused) {
            embed.setDescription(t(client, guildId, "music.pause.alreadyPaused"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.pause();
        await refreshNowPlayingMessage(client, player);

        embed.setDescription(t(client, guildId, "music.pause.done"));
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
