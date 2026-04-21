const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "clear",
    description: "Sirayi temizle",
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
        const embed = createStatusEmbed(client, {
            tone: "info",
            title: t(client, interaction.guildId, "music.clear.title"),
            guildId: interaction.guildId,
        });

        if (player.queue.isEmpty) {
            embed.setDescription(t(client, interaction.guildId, "music.clear.alreadyEmpty"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.queue.clear();
        embed.setDescription(t(client, interaction.guildId, "music.clear.done"));

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
