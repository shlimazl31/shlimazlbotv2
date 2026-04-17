const { EmbedBuilder, MessageFlags } = require("discord.js");

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

        const embed = new EmbedBuilder().setColor(client.config.embedColor).setDescription(`Ses kanalından ayrılıyor...`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
