const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");

module.exports = {
    name: "loop",
    description: "Dongu modunu degistir",
    category: "music",
    options: [
        {
            name: "mode",
            description: "Dongu modunu ayarla",
            type: 3,
            required: true,
            choices: [
                { name: "kapali", value: "none" },
                { name: "sarki", value: "song" },
                { name: "kuyruk", value: "queue" },
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
        const embed = createStatusEmbed(client, { tone: "info", title: "Dongu" });
        const mode = interaction.options.getString("mode");

        if (mode === "none") embed.setDescription("Dongu modu `kapali` olarak ayarlandi.");
        if (mode === "song") embed.setDescription("Dongu modu `sarki` olarak ayarlandi.");
        if (mode === "queue") embed.setDescription("Dongu modu `kuyruk` olarak ayarlandi.");

        player.setLoop(mode);
        await refreshNowPlayingMessage(client, player);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
