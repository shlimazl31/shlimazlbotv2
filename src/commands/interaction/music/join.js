const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "join",
    description: "Ses kanalına katıl",
    category: "music",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: true,
        player: false,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        const embed = new EmbedBuilder().setColor(client.config.embedColor);

        if (player) {
            embed.setDescription(`Zaten bir ses kanalına katılmış durumda.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        } else {
            player = await client.rainlink.create({
                guildId: interaction.guildId,
                textId: interaction.channelId,
                voiceId: interaction.member.voice.channelId,
                shardId: interaction.guild.shardId,
                volume: client.config.defaultVolume,
                deaf: true,
            });

            embed.setDescription(`${interaction.member.voice.channel} kanalına katıldı.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }
    },
};
