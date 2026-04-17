const { EmbedBuilder, MessageFlags } = require("discord.js");

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
        const embed = new EmbedBuilder().setColor(client.config.embedColor);

        if (player.paused) {
            embed.setDescription(`Zaten duraklatılmış.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.pause();

        embed.setDescription(`Mevcut şarkı duraklatıldı.`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
