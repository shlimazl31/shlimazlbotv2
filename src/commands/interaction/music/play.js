const getBestLavalinkNode = require("../../../functions/getBestLavalinkNode.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { getEffectivePlan, getPlanLabel, getPlanLimits } = require("../../../functions/premium.js");
const { t } = require("../../../functions/t.js");

const PLAY_REPLY_DELETE_MS = 15000;

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
    requiredPlan: "free",
    devOnly: false,
    run: async (client, interaction, player) => {
        await interaction.deferReply();
        const embed = createStatusEmbed(client, {
            tone: "success",
            title: t(client, interaction.guildId, "play.title"),
            eyebrow: t(client, interaction.guildId, "play.eyebrow"),
            guildId: interaction.guildId,
        });

        if (player && player.voiceId !== interaction.member.voice.channelId) {
            embed.setDescription(t(client, interaction.guildId, "play.sameVoice"));
            return interaction.editReply({ embeds: [embed] });
        }

        const query = interaction.options.getString("query");
        const playableQuery = normalizeMusicQuery(query);

        try {
            const engine = detectSource(playableQuery);
            const nodeName = player ? player.node.options.name : await getBestLavalinkNode(client);

            const result = await searchTrack(client, playableQuery, {
                requester: interaction.member,
                ...(nodeName && { nodeName }),
                ...(engine && { engine }),
            }, query);

            return handleSearchResult(client, result, player, interaction, embed);
        } catch (error) {
            console.error("Arama hatası:", error);
            embed.setDescription(t(client, interaction.guildId, "play.searchError", { error: error.message }));
            return interaction.editReply({ embeds: [embed] });
        }
    },
};

async function searchTrack(client, query, options, originalQuery) {
    const result = await client.rainlink.search(query, options);

    if (!isEmptyResult(result)) return result;

    const spotifyFallbackQuery = await createSpotifySearchFallback(query);
    if (spotifyFallbackQuery) {
        const { engine, source, ...fallbackOptions } = options;
        const fallbackResult = await client.rainlink.search(spotifyFallbackQuery, fallbackOptions);
        if (!isEmptyResult(fallbackResult)) return fallbackResult;
    }

    if (query === originalQuery) return result;

    return client.rainlink.search(originalQuery, options);
}

function isEmptyResult(result) {
    return !result || result.type === "EMPTY" || result.type === "ERROR" || !result.tracks?.length;
}

function normalizeMusicQuery(query) {
    if (!query) return query;
    const trimmedQuery = query.trim();
    return normalizeSpotifyUrl(trimmedQuery) || trimmedQuery;
}

function normalizeSpotifyUrl(query) {
    let url;

    try {
        url = new URL(query);
    } catch {
        return null;
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "open.spotify.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const spotifyTypes = ["track", "album", "playlist", "artist", "episode", "show"];
    let typeIndex = spotifyTypes.includes(parts[0]) ? 0 : -1;

    if (typeIndex === -1 && parts[0]?.startsWith("intl-") && spotifyTypes.includes(parts[1])) {
        typeIndex = 1;
    }

    if (typeIndex === -1 || !parts[typeIndex + 1]) return null;

    return `https://open.spotify.com/${parts[typeIndex]}/${parts[typeIndex + 1]}`;
}

async function createSpotifySearchFallback(query) {
    if (!query?.includes("open.spotify.com")) return null;

    try {
        const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(query)}`, {
            headers: { "User-Agent": "ShlimazlBot/3.20" },
        });

        if (!response.ok) return null;

        const data = await response.json();
        const title = cleanSpotifyText(data.title);
        const author = cleanSpotifyText(data.author_name);
        const fallbackQuery = [title, author].filter(Boolean).join(" ");

        return fallbackQuery || null;
    } catch (error) {
        console.warn("Spotify fallback lookup failed:", error.message);
        return null;
    }
}

function cleanSpotifyText(value) {
    if (!value) return "";

    return String(value)
        .replace(/\s*[-|]\s*song and lyrics by\s*/i, " ")
        .replace(/\s*\|\s*Spotify\s*$/i, "")
        .replace(/\s*-\s*Spotify\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
}

function detectSource(query) {
    if (query.includes("spotify.com")) return "spotify";
    if (query.includes("music.apple.com")) return "applemusic";
    if (query.includes("deezer.com")) return "deezer";
    if (query.includes("music.yandex")) return "yandexmusic";
    return null;
}

async function handleSearchResult(client, result, player, interaction, embed) {
    if (result.type === "EMPTY" || result.type === "ERROR" || !result.tracks.length) {
        embed.setDescription(t(client, interaction.guildId, "play.noResult"));
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

    const plan = getEffectivePlan(client, interaction.guildId, interaction.user.id);
    const limits = getPlanLimits(plan);
    const remainingQueueSlots = Math.max(limits.queue - (player.queue?.size || 0), 0);

    if (remainingQueueSlots <= 0) {
        embed.setDescription(t(client, interaction.guildId, "play.queueLimitReached", { limit: limits.queue, plan: getPlanLabel(plan) }));
        return interaction.editReply({ embeds: [embed] });
    }

    if (result.type === "PLAYLIST") {
        const tracks = result.tracks.slice(0, Math.min(limits.playlistTracks, remainingQueueSlots));

        player.queue.add(tracks);
        embed.setThumbnail(tracks[0]?.artworkUrl || interaction.guild.iconURL());
        embed.setDescription(
            t(client, interaction.guildId, "play.playlistAdded", {
                name: `**${result.playlistName}**`,
                count: tracks.length,
            }),
        );
        if (tracks.length < result.tracks.length) {
            embed.addFields({
                name: t(client, interaction.guildId, "play.limitNoticeTitle"),
                value: t(client, interaction.guildId, "play.playlistLimitNotice", { limit: limits.playlistTracks, queueLimit: limits.queue, plan: getPlanLabel(plan) }),
                inline: false,
            });
        }
        console.log(`[PLAYLIST] ${result.playlistName} (${tracks.length} şarkı) sıraya eklendi.`);
    } else {
        player.queue.add(result.tracks[0]);
        embed.setThumbnail(result.tracks[0].artworkUrl || interaction.guild.iconURL());
        embed.setDescription(
            t(client, interaction.guildId, "play.trackAdded", {
                title: `**${result.tracks[0].title}**`,
                author: result.tracks[0].author || t(client, interaction.guildId, "common.unknown"),
                duration: result.tracks[0].isStream ? "CANLI" : millisToClock(result.tracks[0].duration),
            }),
        );
        console.log(`[TRACK] ${result.tracks[0].title} sıraya eklendi.`);
    }

    if (!player.playing) player.play();

    const reply = await interaction.editReply({ embeds: [embed] });
    scheduleReplyDelete(interaction, reply);
    return reply;
}

function millisToClock(value) {
    const totalSeconds = Math.floor(value / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function scheduleReplyDelete(interaction, reply) {
    setTimeout(async () => {
        if (reply?.deletable) {
            await reply.delete().catch(() => null);
            return;
        }

        await interaction.deleteReply().catch(() => null);
    }, PLAY_REPLY_DELETE_MS);
}
