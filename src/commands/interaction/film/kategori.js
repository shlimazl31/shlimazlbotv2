const { EmbedBuilder, MessageFlags } = require("discord.js");
const fetch = require("node-fetch");
const { getGuildSettings } = require("../../../functions/guildSettings.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "filmkategori",
    description: "Kategoriye göre film ara",
    category: "film",
    options: [
        {
            name: "tur",
            description: "Film turu",
            type: 3,
            required: true,
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
            const response = await fetch(
                `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_genres=${genreId}&language=${getMovieLanguage(client, guildId)}&sort_by=popularity.desc`,
            );
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                embed.setDescription(t(client, guildId, "film.categoryEmpty"));
                return interaction.reply({ embeds: [embed] });
            }

            embed.setTitle(t(client, guildId, "film.categoryTitle"));
            data.results.slice(0, 5).forEach((film, index) => {
                const overview = film.overview ? `${film.overview.slice(0, 140)}${film.overview.length > 140 ? "..." : ""}` : t(client, guildId, "film.noShortDescription");

                embed.addFields({
                    name: `${index + 1}. ${film.title || film.original_title}`,
                    value: `${overview}\n${t(client, guildId, "film.rating")}: ${Number(film.vote_average || 0).toFixed(1)}/10`,
                });
            });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Movie category error:", error);
            embed.setDescription(t(client, guildId, "film.categoryError", { error: error.message }));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }
    },
};

function getMovieLanguage(client, guildId) {
    return getGuildSettings(client, guildId).language === "en" ? "en-US" : "tr-TR";
}
