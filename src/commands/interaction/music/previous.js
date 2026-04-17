const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "previous",
    description: "Önceki şarkıyı çal",
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

        if (!player.queue.previous) {
            embed.setDescription(`Önceki şarkı bulunamadı.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.previous();

        embed.setDescription(`Önceki şarkı çalınıyor.`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
