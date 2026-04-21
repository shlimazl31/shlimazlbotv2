const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { t } = require("../../../functions/t.js");

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
        const guildId = interaction.guildId;
        const embed = createStatusEmbed(client, {
            tone: "info",
            title: t(client, guildId, "music.remove.title"),
            guildId,
        });

        if (player.queue.isEmpty) {
            embed.setDescription(t(client, guildId, "music.remove.empty"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const position = interaction.options.getInteger("position");

        if (position > player.queue.size) {
            embed.setDescription(t(client, guildId, "music.remove.tooHigh"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.queue.remove(position - 1);
        embed.setDescription(t(client, guildId, "music.remove.done", { position }));

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
