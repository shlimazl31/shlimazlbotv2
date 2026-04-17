const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "filter",
    description: "Filtre ayarla",
    category: "music",
    options: [
        {
            name: "mode",
            description: "Bir filtre seçin",
            type: 3,
            required: true,
            choices: [
                { name: "8d", value: "eightD" },
                { name: "bas", value: "bass" },
                { name: "chipmunk", value: "chimpunk" },
                { name: "temizle", value: "clear" },
                { name: "earrape", value: "earrape" },
                { name: "elektronik", value: "electronic" },
                { name: "karaoke", value: "karaoke" },
                { name: "nightcore", value: "nightcore" },
                { name: "perde", value: "pitch" },
                { name: "yavaş", value: "slow" },
                { name: "yumuşak", value: "soft" },
                { name: "tremolo", value: "tremolo" },
                { name: "treblebass", value: "treblebass" },
                { name: "vaporwave", value: "vaporwave" },
                { name: "vibrato", value: "vibrato" },
                // Ek seçenekler için resmi RainlinkFilter dokümantasyonunu kontrol edin: https://docs-rainlinkjs.vercel.app/classes/RainlinkFilter.html#set
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
        const currentVolume = player.volume;

        player.filter.set(mode);

        if (mode === "clear") {
            embed.setDescription(`Filtre temizlendi.`);
        } else {
            embed.setDescription(`Filtre \`${mode}\` olarak ayarlandı.`);
        }

        player.setVolume(currentVolume);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
