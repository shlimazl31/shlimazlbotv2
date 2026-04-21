const { EmbedBuilder, MessageFlags } = require("discord.js");
const fetch = require("node-fetch");
const { t } = require("../../../functions/t.js");

const MOVIE_GENRES = [
    { name: "Action", value: "28" },
    { name: "Adventure", value: "12" },
    { name: "Animation", value: "16" },
    { name: "Comedy", value: "35" },
    { name: "Crime", value: "80" },
    { name: "Documentary", value: "99" },
    { name: "Drama", value: "18" },
    { name: "Family", value: "10751" },
    { name: "Fantasy", value: "14" },
    { name: "History", value: "36" },
    { name: "Horror", value: "27" },
    { name: "Music", value: "10402" },
    { name: "Mystery", value: "9648" },
    { name: "Romance", value: "10749" },
    { name: "Science Fiction", value: "878" },
    { name: "TV Movie", value: "10770" },
    { name: "Thriller", value: "53" },
    { name: "War", value: "10752" },
    { name: "Western", value: "37" },
];

module.exports = {
    name: "movie-category",
    description: "Browse movies by category.",
    category: "film",
    options: [
        {
            name: "genre",
            description: "Movie genre",
            type: 3,
            required: true,
            choices: MOVIE_GENRES,
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
        const genreId = interaction.options.getString("genre");

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

function getMovieLanguage() {
    return "en-US";
}
