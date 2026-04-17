const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "resume",
    description: "Duraklatılmış şarkıyı devam ettir",
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

        if (!player.paused) {
            embed.setDescription(`Şarkı duraklatılmamış.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.resume();

        embed.setDescription(`Mevcut şarkı devam ettirildi.`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
