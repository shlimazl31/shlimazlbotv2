const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "ping",
    description: "Botun gecikme süresini göster",
    category: "general",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        const embed = new EmbedBuilder().setColor(client.config.embedColor).setDescription(`🏓 Pong! \`${Math.round(client.ws.ping)}ms\`.`);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
