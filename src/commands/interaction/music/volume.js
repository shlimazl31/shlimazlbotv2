const { MessageFlags } = require("discord.js");
const { minVolume, maxVolume } = require("../../../settings/config.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "volume",
    description: "Ses seviyesini ayarla",
    category: "music",
    options: [
        {
            name: "value",
            description: "Ses seviyesi degerini girin",
            type: 4,
            min_value: minVolume,
            max_value: maxVolume,
            required: false,
        },
    ],
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
        const embed = createStatusEmbed(client, { tone: "info", title: t(client, guildId, "music.volume.title"), guildId });
        const value = interaction.options.getInteger("value");

        if (!value) {
            embed.setDescription(t(client, guildId, "music.volume.current", { volume: player.volume }));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.setVolume(value);
        await refreshNowPlayingMessage(client, player);

        embed.setDescription(t(client, guildId, "music.volume.set", { volume: value }));
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
