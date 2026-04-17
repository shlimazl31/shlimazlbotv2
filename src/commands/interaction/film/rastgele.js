const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    name: "filmrastgele",
    description: "Rastgele film öner",
    category: "film",
    options: [
        {
            name: "tur",
            description: "Film türü (opsiyonel)",
            type: 3,
            required: false,
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
            // Rastgele sayfa numarası (1-500 arası)
            const randomPage = Math.floor(Math.random() * 500) + 1;
            
            // API URL'ini oluştur
            let apiUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&language=tr-TR&sort_by=popularity.desc&page=${randomPage}`;
            
            // Eğer tür seçilmişse, URL'e ekle
            if (turId) {
                apiUrl += `&with_genres=${turId}`;
            }

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                embed.setDescription('Film bulunamadı!');
                return interaction.reply({ embeds: [embed] });
            }

            // Rastgele bir film seç
            const randomIndex = Math.floor(Math.random() * data.results.length);
            const film = data.results[randomIndex];

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
            console.error("Rastgele film hatası:", error);
            embed.setDescription(`Film önerilirken bir hata oluştu: ${error.message}`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
}; 