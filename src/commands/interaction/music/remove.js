const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "remove",
    description: "Sıradan bir şarkıyı kaldır",
    category: "music",
    options: [
        {
            name: "position",
            description: "Şarkının pozisyonunu girin",
            type: 4,
            min_value: 1,
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

        if (player.queue.isEmpty) {
            embed.setDescription(`Sıra boş.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const position = interaction.options.getInteger("position");

        if (position > player.queue.size) {
            embed.setDescription(`Girilen pozisyon sıradaki toplam şarkı sayısından büyük.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.queue.remove(position - 1);

        embed.setDescription(`\`${position}\` pozisyonundaki şarkı kaldırıldı`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
