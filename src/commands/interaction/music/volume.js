const { MessageFlags } = require("discord.js");
const { minVolume, maxVolume } = require("../../../settings/config.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");

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
        const embed = createStatusEmbed(client, { tone: "info", title: "Ses" });
        const value = interaction.options.getInteger("value");

        if (!value) {
            embed.setDescription(`Mevcut ses seviyesi \`${player.volume}%\`.`);
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.setVolume(value);
        await refreshNowPlayingMessage(client, player);

        embed.setDescription(`Ses seviyesi \`${value}%\` olarak ayarlandi.`);
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
