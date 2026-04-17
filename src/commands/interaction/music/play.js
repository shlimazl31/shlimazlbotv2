const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "play",
    description: "Bir şarkı çal",
    category: "music",
    options: [
        {
            name: "query",
            description: "Şarkı adı veya URL girin",
            type: 3,
            required: true,
        },
    ],
    permissions: {
        bot: ["Speak", "Connect"],
        user: ["Speak", "Connect"],
    },
    settings: {
        voice: true,
        player: false,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        await interaction.deferReply();
        const embed = new EmbedBuilder().setColor(client.config.embedColor);

        if (player && player.voiceId !== interaction.member.voice.channelId) {
            embed.setDescription(`Bot ile aynı ses kanalında olmalısın.`);
            return interaction.editReply({ embeds: [embed] });
        }

        const query = interaction.options.getString("query");

        try {
            const source = detectSource(query);

            const result = await client.rainlink.search(query, {
                requester: interaction.member,
                ...(source && { source })
            });

            return handleSearchResult(client, result, player, interaction, embed);

        } catch (error) {
            console.error("Arama hatası:", error);
            embed.setDescription(`Arama sırasında bir hata oluştu: ${error.message}`);
            return interaction.editReply({ embeds: [embed] });
        }
    },
};

function detectSource(query) {
    if (query.includes("spotify.com")) return "spotify";
    if (query.includes("music.apple.com")) return "applemusic";
    if (query.includes("deezer.com")) return "deezer";
    if (query.includes("music.yandex")) return "yandexmusic";
    return null;
}

async function handleSearchResult(client, result, player, interaction, embed) {
    if (result.type === "EMPTY" || result.type === "ERROR" || !result.tracks.length) {
        embed.setDescription(`Aramanız için sonuç bulunamadı.`);
        return interaction.editReply({ embeds: [embed] });
    }

    if (!player) {
        player = await client.rainlink.create({
            guildId: interaction.guildId,
            textId: interaction.channelId,
            voiceId: interaction.member.voice.channelId,
            shardId: interaction.guild.shardId,
            volume: client.config.defaultVolume,
            deaf: true,
        });
    }

    if (result.type === "PLAYLIST") {
        player.queue.add(result.tracks);
        embed.setDescription(`\`${result.playlistName}\` adlı çalma listesi, \`${result.tracks.length}\` şarkı ile sıraya eklendi.`);
        console.log(`[PLAYLIST] ${result.playlistName} (${result.tracks.length} şarkı) sıraya eklendi.`);
    } else {
        player.queue.add(result.tracks[0]);
        embed.setDescription(`\`${result.tracks[0].title}\` sıraya eklendi.`);
        console.log(`[TRACK] ${result.tracks[0].title} sıraya eklendi.`);
    }

    if (!player.playing) player.play();

    return interaction.editReply({ embeds: [embed] });
}
