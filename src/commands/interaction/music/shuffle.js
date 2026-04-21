const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");
const { t } = require("../../../functions/t.js");

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
        const guildId = interaction.guildId;
        const embed = createStatusEmbed(client, { tone: "success", title: t(client, guildId, "music.shuffle.title"), guildId });

        if (player.queue.isEmpty) {
            embed.setDescription(t(client, guildId, "music.shuffle.empty"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        if (player.queue.length <= 1) {
            embed.setDescription(t(client, guildId, "music.shuffle.onlyOne"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.queue.shuffle();
        await refreshNowPlayingMessage(client, player);

        embed.setDescription(t(client, guildId, "music.shuffle.done"));
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
