const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "resume",
    description: "Duraklatılan şarkıyı devam ettir",
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
        const embed = createStatusEmbed(client, { tone: "success", title: t(client, guildId, "music.resume.title"), guildId });

        if (!player.paused) {
            embed.setDescription(t(client, guildId, "music.resume.alreadyPlaying"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.resume();
        await refreshNowPlayingMessage(client, player);

        embed.setDescription(t(client, guildId, "music.resume.done"));
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
