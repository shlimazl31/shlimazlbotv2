const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "seek",
    description: "Mevcut şarkıda ilerle",
    category: "music",
    options: [
        {
            name: "time",
            description: "Saniye cinsinden süre girin",
            type: 4,
            min_value: 0,
            required: true,
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
        const time = interaction.options.getInteger("time");

        if (!player.queue.current.isSeekable) {
            embed.setDescription(`Mevcut şarkıda ilerleme yapılamaz.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        if (time * 1000 > player.queue.current.duration) {
            embed.setDescription(`Girilen süre şarkının toplam süresinden uzun.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.seek(time * 1000);

        embed.setDescription(`\`${time}s\` süresine ilerletildi`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
