const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");

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
        const embed = createStatusEmbed(client, { tone: "warning", title: "Stop" });
        const guildData = client.data.get(`guildData_${interaction.guildId}`) || { dj: { status: false, role: null } };

        if (guildData?.dj?.status) {
            const hasDJRole = interaction.member.roles.cache.has(guildData.dj.role);
            const isAdmin = interaction.member.permissions.has("ManageGuild");

            if (!hasDJRole && !isAdmin) {
                embed.setDescription("Bu komutu kullanmak icin DJ rolune veya yonetici yetkisine sahip olmalisin.");
                return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        player.stop();

        embed.setDescription("Muzik durduruldu. Oynatici ve kuyruk temizlendi.");
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
