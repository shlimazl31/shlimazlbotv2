const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");
const { t } = require("../../../functions/t.js");

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
                { name: "kapalı", value: "none" },
                { name: "şarkı", value: "song" },
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
        const guildId = interaction.guildId;
        const embed = createStatusEmbed(client, { tone: "info", title: t(client, guildId, "music.loop.title"), guildId });
        const mode = interaction.options.getString("mode");

        if (mode === "none") embed.setDescription(t(client, guildId, "music.loop.none"));
        if (mode === "song") embed.setDescription(t(client, guildId, "music.loop.song"));
        if (mode === "queue") embed.setDescription(t(client, guildId, "music.loop.queue"));

        player.setLoop(mode);
        await refreshNowPlayingMessage(client, player);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
