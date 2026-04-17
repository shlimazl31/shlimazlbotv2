const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    name: "filmdetay",
    description: "Film detaylarını göster",
    category: "film",
    options: [
        {
            name: "id",
            description: "Film ID'si girin",
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
        const filmId = interaction.options.getString("id");

        try {
            const response = await fetch(
                `https://api.themoviedb.org/3/movie/${filmId}?api_key=${process.env.TMDB_API_KEY}&language=tr-TR&append_to_response=credits,videos`
            );
            
            if (!response.ok) {
                throw new Error(`API yanıt vermedi: ${response.status}`);
            }

            const film = await response.json();

            if (!film.id) {
                embed.setDescription('Film bulunamadı! Lütfen geçerli bir Film ID\'si girin.');
                return interaction.reply({ embeds: [embed] });
            }

            // Oyuncuları al (ilk 5 oyuncu)
            const oyuncular = film.credits?.cast?.slice(0, 5).map(oyuncu => oyuncu.name).join(', ') || 'Belirtilmemiş';
            
            // Yönetmeni bul
            const yonetmen = film.credits?.crew?.find(person => person.job === 'Director')?.name || 'Belirtilmemiş';

            // Fragman linkini bul
            const fragman = film.videos?.results?.find(video => video.type === 'Trailer')?.key;
            const fragmanLink = fragman ? `https://www.youtube.com/watch?v=${fragman}` : 'Fragman bulunamadı';

            // Türleri al
            const turler = film.genres?.map(genre => genre.name).join(', ') || 'Belirtilmemiş';

            embed.setTitle(film.title)
                .setDescription(film.overview || 'Açıklama bulunamadı.')
                .addFields(
                    { name: 'Yayın Tarihi', value: film.release_date || 'Belirtilmemiş', inline: true },
                    { name: 'Puan', value: `⭐ ${film.vote_average?.toFixed(1) || '0'}/10`, inline: true },
                    { name: 'Oylama Sayısı', value: film.vote_count?.toString() || '0', inline: true },
                    { name: 'Süre', value: `${film.runtime || '0'} dakika`, inline: true },
                    { name: 'Türler', value: turler, inline: true },
                    { name: 'Yönetmen', value: yonetmen, inline: true },
                    { name: 'Oyuncular', value: oyuncular, inline: false },
                    { name: 'Fragman', value: fragmanLink, inline: false }
                )
                .setImage(film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null)
                .setFooter({ text: `ID: ${film.id}` });

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Film detay hatası:", error);
            embed.setDescription(`Film detayları alınırken bir hata oluştu: ${error.message}`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
}; 