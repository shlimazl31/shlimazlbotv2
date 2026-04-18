const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");

module.exports = {
    name: "shuffle",
    description: "Sirayi karistir",
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
        const embed = createStatusEmbed(client, { tone: "success", title: "Karistir" });

        if (player.queue.isEmpty) {
            embed.setDescription("Kuyruk bos. Karistirma yapilamaz.");
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        if (player.queue.length <= 1) {
            embed.setDescription("Kuyrukta sadece bir sarki var. Karistirmaya gerek yok.");
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.queue.shuffle();
        await refreshNowPlayingMessage(client, player);

        embed.setDescription("Kuyruk sirasi karistirildi.");
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
