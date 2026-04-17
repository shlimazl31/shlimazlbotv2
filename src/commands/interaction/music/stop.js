const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "stop",
    description: "Müziği durdur",
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
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const guildData = client.data.get(`guildData_${interaction.guildId}`) || { dj: { status: false, role: null } };

        // DJ kontrolü
        if (guildData?.dj?.status) {
            const hasDJRole = interaction.member.roles.cache.has(guildData.dj.role);
            const isAdmin = interaction.member.permissions.has("ManageGuild");
            
            if (!hasDJRole && !isAdmin) {
                embed.setDescription(`Bu komutu kullanmak için DJ rolüne sahip olmalısınız.`);
                return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        player.stop();

        embed.setDescription(`Müzik durduruldu ve sıra temizlendi.`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
