const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "shuffle",
    description: "Sırayı karıştır",
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

        if (player.queue.isEmpty) {
            embed.setDescription(`Sıra boş. Karıştırma yapılamaz.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        if (player.queue.length <= 1) {
            embed.setDescription(`Sırada sadece bir şarkı var. Karıştırma yapılamaz.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.queue.shuffle();

        embed.setDescription(`Sıra karıştırıldı.`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
