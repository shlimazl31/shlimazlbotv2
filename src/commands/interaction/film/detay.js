const { EmbedBuilder, MessageFlags } = require("discord.js");
const fetch = require("node-fetch");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "movie-details",
    description: "Show movie details.",
    category: "film",
    options: [
        {
            name: "id",
            description: "Enter a movie ID.",
            type: 3,
            required: true,
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
        const filmId = interaction.options.getString("id");

        try {
            const response = await fetch(
                `https://api.themoviedb.org/3/movie/${filmId}?api_key=${process.env.TMDB_API_KEY}&language=${getMovieLanguage(client, guildId)}&append_to_response=credits,videos`,
            );

            if (!response.ok) {
                embed.setDescription(t(client, guildId, "film.invalidId"));
                return interaction.reply({ embeds: [embed] });
            }

            const film = await response.json();
            const cast = film.credits?.cast?.slice(0, 5).map((actor) => actor.name).join(", ") || t(client, guildId, "film.notSpecified");
            const director = film.credits?.crew?.find((person) => person.job === "Director")?.name || t(client, guildId, "film.notSpecified");
            const trailer = film.videos?.results?.find((video) => video.type === "Trailer")?.key;
            const trailerLink = trailer ? `https://www.youtube.com/watch?v=${trailer}` : t(client, guildId, "film.trailerMissing");
            const genres = film.genres?.map((genre) => genre.name).join(", ") || t(client, guildId, "film.notSpecified");

            embed
                .setTitle(film.title || film.original_title || t(client, guildId, "film.notFound"))
                .setDescription(film.overview || t(client, guildId, "film.noDescription"))
                .addFields(
                    { name: t(client, guildId, "film.releaseDate"), value: film.release_date || t(client, guildId, "film.notSpecified"), inline: true },
                    { name: t(client, guildId, "film.rating"), value: `${Number(film.vote_average || 0).toFixed(1)}/10`, inline: true },
                    { name: t(client, guildId, "film.voteCount"), value: String(film.vote_count || 0), inline: true },
                    { name: t(client, guildId, "film.runtime"), value: t(client, guildId, "film.minutes", { minutes: film.runtime || 0 }), inline: true },
                    { name: t(client, guildId, "film.genres"), value: genres, inline: true },
                    { name: t(client, guildId, "film.director"), value: director, inline: true },
                    { name: t(client, guildId, "film.cast"), value: cast, inline: false },
                    { name: t(client, guildId, "film.trailer"), value: trailerLink, inline: false },
                )
                .setImage(film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null)
                .setFooter({ text: `ID: ${film.id}` });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Movie detail error:", error);
            embed.setDescription(t(client, guildId, "film.detailError", { error: error.message }));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }
    },
};

function getMovieLanguage() {
    return "en-US";
}

