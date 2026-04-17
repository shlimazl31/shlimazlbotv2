const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    name: "filmkategori",
    description: "Kategoriye göre film ara",
    category: "film",
    options: [
        {
            name: "tur",
            description: "Film türü",
            type: 3,
            required: true,
            choices: [
                { name: 'Aksiyon', value: '28' },
                { name: 'Macera', value: '12' },
                { name: 'Animasyon', value: '16' },
                { name: 'Komedi', value: '35' },
                { name: 'Suç', value: '80' },
                { name: 'Belgesel', value: '99' },
                { name: 'Dram', value: '18' },
                { name: 'Aile', value: '10751' },
                { name: 'Fantastik', value: '14' },
                { name: 'Tarih', value: '36' },
                { name: 'Korku', value: '27' },
                { name: 'Müzik', value: '10402' },
                { name: 'Gizem', value: '9648' },
                { name: 'Romantik', value: '10749' },
                { name: 'Bilim Kurgu', value: '878' },
                { name: 'TV Film', value: '10770' },
                { name: 'Gerilim', value: '53' },
                { name: 'Savaş', value: '10752' },
                { name: 'Western', value: '37' }
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
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const turId = interaction.options.getString("tur");

        try {
            const response = await fetch(
                `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_genres=${turId}&language=tr-TR&sort_by=popularity.desc`
            );
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                embed.setDescription('Bu kategoride film bulunamadı!');
                return interaction.reply({ embeds: [embed] });
            }

            const filmler = data.results.slice(0, 5);
            embed.setTitle('Kategori Filmleri');

            filmler.forEach((film, index) => {
                embed.addFields({
                    name: `${index + 1}. ${film.title}`,
                    value: `${film.overview ? film.overview.slice(0, 100) + '...' : 'Açıklama yok'}\n⭐ ${film.vote_average}/10`
                });
            });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Kategori arama hatası:", error);
            embed.setDescription(`Filmler aranırken bir hata oluştu: ${error.message}`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
}; 