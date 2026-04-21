const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "leave",
    description: "Ses kanalından ayrıl",
    category: "music",
    permissions: {
        bot: [],
        user: ["ManageGuild"],
    },
    settings: {
        voice: true,
        player: true,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        player.destroy();

        const embed = createStatusEmbed(client, {
            tone: "info",
            title: t(client, interaction.guildId, "music.leave.title"),
            guildId: interaction.guildId,
            description: t(client, interaction.guildId, "music.leave.leaving"),
        });

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
