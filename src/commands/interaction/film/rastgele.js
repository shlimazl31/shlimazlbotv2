const { EmbedBuilder, MessageFlags } = require("discord.js");
const fetch = require("node-fetch");
const { getGuildSettings } = require("../../../functions/guildSettings.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "filmrastgele",
    description: "Rastgele film oner",
    category: "film",
    options: [
        {
            name: "tur",
            description: "Film turu (opsiyonel)",
            type: 3,
            required: false,
            choices: [
                { name: "Aksiyon", value: "28" },
                { name: "Macera", value: "12" },
                { name: "Animasyon", value: "16" },
                { name: "Komedi", value: "35" },
                { name: "Suc", value: "80" },
                { name: "Belgesel", value: "99" },
                { name: "Dram", value: "18" },
                { name: "Aile", value: "10751" },
                { name: "Fantastik", value: "14" },
                { name: "Tarih", value: "36" },
                { name: "Korku", value: "27" },
                { name: "Müzik", value: "10402" },
                { name: "Gizem", value: "9648" },
                { name: "Romantik", value: "10749" },
                { name: "Bilim Kurgu", value: "878" },
                { name: "TV Film", value: "10770" },
                { name: "Gerilim", value: "53" },
                { name: "Savas", value: "10752" },
                { name: "Western", value: "37" },
            ],
        },
    ],
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
    run: async (client, interaction) => {
        const guildId = interaction.guildId;
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const genreId = interaction.options.getString("tur");

        try {
            const randomPage = Math.floor(Math.random() * 500) + 1;
            const genreQuery = genreId ? `&with_genres=${genreId}` : "";
            const response = await fetch(
                `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&language=${getMovieLanguage(client, guildId)}&sort_by=popularity.desc&page=${randomPage}${genreQuery}`,
            );
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                embed.setDescription(t(client, guildId, "film.notFound"));
                return interaction.reply({ embeds: [embed] });
            }

            const film = data.results[Math.floor(Math.random() * data.results.length)];

            embed
                .setTitle(film.title || film.original_title)
                .setDescription(film.overview || t(client, guildId, "film.noDescription"))
                .addFields(
                    { name: t(client, guildId, "film.releaseDate"), value: film.release_date || t(client, guildId, "film.notSpecified"), inline: true },
                    { name: t(client, guildId, "film.rating"), value: `${Number(film.vote_average || 0).toFixed(1)}/10`, inline: true },
                    { name: t(client, guildId, "film.voteCount"), value: String(film.vote_count || 0), inline: true },
                )
                .setImage(film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null)
                .setFooter({ text: `ID: ${film.id}` });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Random movie error:", error);
            embed.setDescription(t(client, guildId, "film.randomError", { error: error.message }));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }
    },
};

function getMovieLanguage(client, guildId) {
    return getGuildSettings(client, guildId).language === "en" ? "en-US" : "tr-TR";
}
