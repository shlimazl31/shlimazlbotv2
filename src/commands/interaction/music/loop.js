const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "loop",
    description: "Döngü modunu değiştir",
    category: "music",
    options: [
        {
            name: "mode",
            description: "Döngü modunu ayarla",
            type: 3,
            required: true,
            choices: [
                { name: "kapalı", value: "none" },
                { name: "şarkı", value: "song" },
                { name: "sıra", value: "queue" },
            ],
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
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const mode = interaction.options.getString("mode");

        switch (mode) {
            case "none":
                embed.setDescription(`Döngü modu \`kapalı\` olarak ayarlandı.`);
                break;
            case "song":
                embed.setDescription(`Döngü modu \`şarkı\` olarak ayarlandı.`);
                break;
            case "queue":
                embed.setDescription(`Döngü modu \`sıra\` olarak ayarlandı.`);
                break;
        }

        player.setLoop(mode);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
