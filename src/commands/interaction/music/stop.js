const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "stop",
    description: "Muzigi durdur",
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
        const embed = createStatusEmbed(client, { tone: "warning", title: t(client, guildId, "music.stop.title"), guildId });
        const guildData = client.data.get(`guildData_${interaction.guildId}`) || { dj: { status: false, role: null } };

        if (guildData?.dj?.status) {
            const hasDJRole = interaction.member.roles.cache.has(guildData.dj.role);
            const isAdmin = interaction.member.permissions.has("ManageGuild");

            if (!hasDJRole && !isAdmin) {
                embed.setDescription(t(client, guildId, "music.stop.noDj"));
                return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        player.stop();

        embed.setDescription(t(client, guildId, "music.stop.done"));
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
