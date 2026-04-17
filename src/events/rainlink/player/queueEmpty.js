const { EmbedBuilder } = require("discord.js");

module.exports = async (client, player) => {
    if (!player) return;

    if (player.message) player.message.delete().catch((e) => {});

    const channel = await client.channels.cache.get(player.textId);
    const isAutoplayEnabled = client.data.get("autoplay", player.guildId);

    if (isAutoplayEnabled) {
        const track = player.queue.previous[0];
        const getTrack = `https://music.youtube.com/watch?v=${track.identifier}&list=RD${track.identifier}`;
        const result = await client.rainlink.search(getTrack, { requester: track.requester });

        if (!result || !result.tracks || !result.tracks.length) {
            client.data.delete("autoplay", player.guildId);

            return player.destroy();
        }

        const randomTrack = result.tracks[Math.floor(Math.random() * result.tracks.length)];

        player.queue.add(randomTrack);

        if (!player.playing) player.play();
    } else {
        const guildData = client.data.get(`guildData_${player.guildId}`);

        if (guildData && guildData.reconnect.status) return;

        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(`Sırada başka şarkı yok.`);

        if (channel) await channel.send({ embeds: [embed] });

        // Sıra boşaldıktan sonra 2 dakika bekle ve inaktiflik kontrolü yap
        setTimeout(async () => {
            const updatedPlayer = client.rainlink.players.get(player.guildId);
            const updatedGuildData = client.data.get(`guildData_${player.guildId}`);

            // Eğer oyuncu hala varsa, çalmıyorsa, sıra boşsa ve 24/7 modu aktif değilse ayrıl
            if (updatedPlayer && !updatedPlayer.playing && updatedPlayer.queue.isEmpty && !updatedGuildData?.reconnect.status) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setDescription(
                        `Kanalda kimse kalmadığı veya 2 dakikadır müzik çalmadığı için ayrılıyorum. 👋 Kesintisiz müzik keyfi istersen \`24/7\` komutunu kullanabilirsin! 👍`,
                    );

                const textChannel = await client.channels.cache.get(updatedPlayer.textId);
                if (textChannel) await textChannel.send({ embeds: [timeoutEmbed] });
                updatedPlayer.destroy();
            }
        }, client.config.leaveTimeout);
    }
};
