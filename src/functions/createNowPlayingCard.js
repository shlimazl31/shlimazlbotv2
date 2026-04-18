const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { convertTime } = require("./timeFormat.js");
const { TONES, createBaseEmbed } = require("./createResponseEmbed.js");

const REFRESH_INTERVAL_MS = 10000;
const REFRESH_LIFETIME_MS = 120000;
const PROGRESS_SIZE = 16;

function createNowPlayingEmbed(client, player) {
    const track = player.queue.current;
    const nextTrack = player.queue[0];
    const position = getTrackPosition(player, track);
    const duration = track.isStream ? null : track.duration;
    const remaining = duration == null ? null : Math.max(duration - position, 0);
    const queueDuration = player.queue.duration ? convertTime(player.queue.duration) : "00:00";
    const requester = track.requester ? `${track.requester}` : "Bilinmiyor";
    const statusText = player.paused ? "Duraklatildi" : "Caliyor";
    const progressBar = track.isStream ? "`LIVE` " + "-".repeat(PROGRESS_SIZE) : createProgressBar(position, duration);
    const timingText = track.isStream ? "`CANLI YAYIN`" : `\`${convertTime(position)}\` / \`${convertTime(duration)}\` | Kalan: \`${convertTime(remaining)}\``;
    const metaLine = [`Istek: ${requester}`, `Ses: ${player.volume}%`, `Dongu: ${resolveLoopLabel(player.loop)}`].join("  |  ");
    const description = [
        `### ${trim(track.title, 52)}`,
        `**${trim(track.author, 40)}**`,
        progressBar,
        timingText,
        metaLine,
    ].join("\n");

    const embed = createBaseEmbed(client, {
        color: player.paused ? TONES.warning.color : TONES.media.color,
        author: {
            name: player.paused ? "Now Playing | Duraklatildi" : "Now Playing | Aktif",
            iconURL: client.user.displayAvatarURL(),
        },
        description,
        thumbnail: track.artworkUrl || resolveThumbnail(client, track, nextTrack),
        fields: [
            { name: "Durum", value: `\`${statusText}\``, inline: true },
            { name: "Kuyruk", value: `\`${player.queue.size}\` sarki`, inline: true },
            { name: "Sure", value: `\`${queueDuration}\``, inline: true },
            {
                name: "Siradaki",
                value: nextTrack ? `**${trim(nextTrack.title, 34)}** | \`${nextTrack.isStream ? "CANLI" : convertTime(nextTrack.duration)}\`` : "`Kuyruk bos`",
                inline: false,
            },
        ],
        footer: {
            text: player.paused ? "Oynatici duraklatildi | Kart kisa sure guncel kalir" : "Kontroller asagida | Kart kisa sure otomatik guncellenir",
            iconURL: client.user.displayAvatarURL(),
        },
    });

    if (track.uri) embed.setURL(track.uri);

    return embed;
}

function createNowPlayingComponents(client, player) {
    const emoji = client.emoji.player;

    const transportRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setEmoji(emoji.previous).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("pause").setEmoji(player.paused ? emoji.resume : emoji.pause).setStyle(player.paused ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("skip").setEmoji(emoji.skip).setStyle(ButtonStyle.Secondary),
    );

    const utilityRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("shuffle").setEmoji(emoji.shuffle).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("loop").setEmoji(emoji.loop).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("voldown").setEmoji(emoji.voldown).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("volup").setEmoji(emoji.volup).setStyle(ButtonStyle.Secondary),
    );

    const stopRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("stop").setEmoji(emoji.stop).setStyle(ButtonStyle.Danger),
    );

    return [transportRow, utilityRow, stopRow];
}

async function refreshNowPlayingMessage(client, player) {
    if (!player?.message || !player.queue.current) return;

    const embed = createNowPlayingEmbed(client, player);
    const components = createNowPlayingComponents(client, player);

    await player.message.edit({ embeds: [embed], components }).catch(() => null);
}

function startNowPlayingRefresh(client, player) {
    stopNowPlayingRefresh(client, player.guildId);

    const startedAt = Date.now();
    const key = getRefreshKey(player.guildId);
    const interval = setInterval(async () => {
        const activePlayer = client.rainlink.players.get(player.guildId);

        if (!activePlayer?.queue?.current || !activePlayer.message) {
            stopNowPlayingRefresh(client, player.guildId);
            return;
        }

        if (Date.now() - startedAt >= REFRESH_LIFETIME_MS) {
            stopNowPlayingRefresh(client, player.guildId);
            return;
        }

        await refreshNowPlayingMessage(client, activePlayer);
    }, REFRESH_INTERVAL_MS);

    client.data.set(key, interval);
}

function stopNowPlayingRefresh(client, guildId) {
    const key = getRefreshKey(guildId);
    const interval = client.data.get(key);

    if (interval) {
        clearInterval(interval);
        client.data.delete(key);
    }
}

function getTrackPosition(player, track) {
    if (track.isStream) return 0;

    return Math.min(typeof player.position === "number" ? player.position : 0, track.duration);
}

function createProgressBar(position, duration) {
    const safeDuration = Math.max(duration || 0, 1);
    const currentSlot = Math.min(PROGRESS_SIZE - 1, Math.floor((position / safeDuration) * PROGRESS_SIZE));
    const segments = Array.from({ length: PROGRESS_SIZE }, (_, index) => (index === currentSlot ? "O" : "-"));

    return `\`${segments.join("")}\``;
}

function resolveThumbnail(client, track, nextTrack) {
    if (typeof track.requester?.displayAvatarURL === "function") {
        return track.requester.displayAvatarURL();
    }

    return nextTrack?.artworkUrl || client.user.displayAvatarURL();
}

function trim(value, maxLength) {
    if (!value) return "Bilinmiyor";
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function resolveLoopLabel(loop) {
    if (loop === "song") return "Sarki";
    if (loop === "queue") return "Kuyruk";
    return "Kapali";
}

function getRefreshKey(guildId) {
    return `nowPlayingRefresh_${guildId}`;
}

module.exports = {
    createNowPlayingEmbed,
    createNowPlayingComponents,
    refreshNowPlayingMessage,
    startNowPlayingRefresh,
    stopNowPlayingRefresh,
};
