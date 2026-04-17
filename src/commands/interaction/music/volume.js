const { EmbedBuilder, MessageFlags } = require("discord.js");
const { minVolume, maxVolume } = require("../../../settings/config.js");

module.exports = {
    name: "volume",
    description: "Ses seviyesini ayarla",
    category: "music",
    options: [
        {
            name: "value",
            description: "Ses seviyesi değerini girin",
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
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const value = interaction.options.getInteger("value");

        if (!value) {
            embed.setDescription(`Mevcut ses seviyesi: \`${player.volume}%\``);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.setVolume(value);

        embed.setDescription(`Ses seviyesi \`${value}%\` olarak ayarlandı`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
