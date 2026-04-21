const { EmbedBuilder, MessageFlags } = require("discord.js");
const fetch = require("node-fetch");
const { getGuildSettings } = require("../../../functions/guildSettings.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "filmara",
    description: "Film ara",
    category: "film",
    options: [
        {
            name: "query",
            description: "Film adi girin",
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
        const query = interaction.options.getString("query");

        try {
            const response = await fetch(
                `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=${getMovieLanguage(client, guildId)}`,
            );
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                embed.setDescription(t(client, guildId, "film.notFound"));
                return interaction.reply({ embeds: [embed] });
            }

            const film = data.results[0];
            embed
                .setTitle(film.title)
                .setDescription(film.overview || t(client, guildId, "film.noDescription"))
                .addFields(
                    { name: t(client, guildId, "film.releaseDate"), value: film.release_date || t(client, guildId, "film.notSpecified"), inline: true },
                    { name: t(client, guildId, "film.rating"), value: `${film.vote_average}/10`, inline: true },
                    { name: t(client, guildId, "film.voteCount"), value: film.vote_count.toString(), inline: true },
                )
                .setImage(film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null)
                .setFooter({ text: `ID: ${film.id}` });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Film search error:", error);
            embed.setDescription(t(client, guildId, "film.searchError", { error: error.message }));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }
    },
};

function getMovieLanguage(client, guildId) {
    return getGuildSettings(client, guildId).language === "en" ? "en-US" : "tr-TR";
}
