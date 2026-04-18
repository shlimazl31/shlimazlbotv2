const getBestLavalinkNode = require("../../../functions/getBestLavalinkNode.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");

module.exports = {
    name: "play",
    description: "Bir sarki cal",
    category: "music",
    options: [
        {
            name: "query",
            description: "Sarki adi veya URL girin",
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
        const embed = createStatusEmbed(client, {
            tone: "success",
            title: "Play",
            eyebrow: "Muzik baslatiliyor",
        });

        if (player && player.voiceId !== interaction.member.voice.channelId) {
            embed.setDescription("Bot ile ayni ses kanalinda olmalisin.");
            return interaction.editReply({ embeds: [embed] });
        }

        const query = interaction.options.getString("query");

        try {
            const source = detectSource(query);
            const nodeName = player ? player.node.options.name : await getBestLavalinkNode(client);

            const result = await client.rainlink.search(query, {
                requester: interaction.member,
                ...(nodeName && { nodeName }),
                ...(source && { source }),
            });

            return handleSearchResult(client, result, player, interaction, embed);
        } catch (error) {
            console.error("Arama hatasi:", error);
            embed.setDescription(`Arama sirasinda bir hata olustu: ${error.message}`);
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
        embed.setDescription("Aramaniz icin sonuc bulunamadi.");
        return interaction.editReply({ embeds: [embed] });
    }

    if (!player) {
        const nodeName = await getBestLavalinkNode(client);

        player = await client.rainlink.create({
            guildId: interaction.guildId,
            textId: interaction.channelId,
            voiceId: interaction.member.voice.channelId,
            shardId: interaction.guild.shardId,
            volume: client.config.defaultVolume,
            ...(nodeName && { nodeName }),
            deaf: true,
        });
    }

    if (result.type === "PLAYLIST") {
        player.queue.add(result.tracks);
        embed.setThumbnail(result.tracks[0]?.artworkUrl || interaction.guild.iconURL());
        embed.setDescription([
            `**${result.playlistName}** kuyruga eklendi.`,
            `Toplam \`${result.tracks.length}\` sarki simdi hazir.`,
            "Oynatma karti ilk sarkida otomatik yenilenecek.",
        ].join("\n"));
        console.log(`[PLAYLIST] ${result.playlistName} (${result.tracks.length} sarki) siraya eklendi.`);
    } else {
        player.queue.add(result.tracks[0]);
        embed.setThumbnail(result.tracks[0].artworkUrl || interaction.guild.iconURL());
        embed.setDescription([
            `**${result.tracks[0].title}** kuyruga eklendi.`,
            `${result.tracks[0].author || "Bilinmiyor"}  |  \`${result.tracks[0].isStream ? "CANLI" : millisToClock(result.tracks[0].duration)}\``,
            "Oynatma karti baslayinca otomatik acilacak.",
        ].join("\n"));
        console.log(`[TRACK] ${result.tracks[0].title} siraya eklendi.`);
    }

    if (!player.playing) player.play();

    return interaction.editReply({ embeds: [embed] });
}

function millisToClock(value) {
    const totalSeconds = Math.floor(value / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}
