const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    name: "filmara",
    description: "Film ara",
    category: "film",
    options: [
        {
            name: "query",
            description: "Film adı girin",
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
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const query = interaction.options.getString("query");

        try {
            const response = await fetch(
                `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=tr-TR`
            );
            
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                embed.setDescription('Film bulunamadı!');
                return interaction.reply({ embeds: [embed] });
            }

            const film = data.results[0];
            embed.setTitle(film.title)
                .setDescription(film.overview || 'Açıklama bulunamadı.')
                .addFields(
                    { name: 'Yayın Tarihi', value: film.release_date || 'Belirtilmemiş', inline: true },
                    { name: 'Puan', value: `⭐ ${film.vote_average}/10`, inline: true },
                    { name: 'Oylama Sayısı', value: film.vote_count.toString(), inline: true }
                )
                .setImage(`https://image.tmdb.org/t/p/w500${film.poster_path}`)
                .setFooter({ text: `ID: ${film.id}` });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Film arama hatası:", error);
            embed.setDescription(`Film aranırken bir hata oluştu: ${error.message}`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
}; 