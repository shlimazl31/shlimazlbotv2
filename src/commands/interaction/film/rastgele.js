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
    name: "random-movie",
    description: "Recommend a random movie.",
    category: "film",
    options: [
        {
            name: "genre",
            description: "Movie genre (optional)",
            type: 3,
            required: false,
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

function getMovieLanguage() {
    return "en-US";
}
