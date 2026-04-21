const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { convertTime } = require("./timeFormat.js");
const { TONES, createBaseEmbed } = require("./createResponseEmbed.js");
const { getGuildSettings, getGuildThemeColor } = require("./guildSettings.js");
const { createArtworkColor } = require("./artworkColor.js");
const { getBotVersion } = require("./getBotVersion.js");
const en = require("../languages/en.js");
const tr = require("../languages/tr.js");

const REFRESH_INTERVAL_MS = 10000;
const REFRESH_LIFETIME_MS = 120000;
const PROGRESS_SIZE = 16;
const RICH_PROGRESS_SIZE = 24;
const LANGUAGES = { en, tr };

function createNowPlayingEmbed(client, player, settingsOverride = null) {
    const settings = getNowPlayingSettings(client, player.guildId, settingsOverride);
    const isRich = settings.playerMode === "rich";
    const track = player.queue.current;
    const nextTrack = player.queue[0];
    const position = getTrackPosition(player, track);
    const duration = track.isStream ? null : track.duration;
    const remaining = duration == null ? null : Math.max(duration - position, 0);
    const queueDuration = player.queue.duration ? convertTime(player.queue.duration) : "00:00";
    const requester = track.requester ? `${track.requester}` : text(settings, "nowPlaying.unknown");
    const statusText = player.paused ? text(settings, "nowPlaying.pausedStatus") : text(settings, "nowPlaying.playing");
    const queueProgress = `1/${player.queue.size + 1}`;
    const modeLabel = resolveModeLabel(settings, settings.playerMode);
    const progressSize = isRich ? RICH_PROGRESS_SIZE : PROGRESS_SIZE;
    const progressBar = track.isStream ? "`LIVE` " + "-".repeat(progressSize) : createProgressBar(position, duration, progressSize);
    const timingText = track.isStream ? `\`${text(settings, "nowPlaying.live")}\`` : `\`${convertTime(position)}\` / \`${convertTime(duration)}\` | ${text(settings, "nowPlaying.remaining")}: \`${convertTime(remaining)}\``;
    const metaLine = [`${text(settings, "nowPlaying.request")}: ${requester}`, `${text(settings, "nowPlaying.volume")}: ${player.volume}%`, `${text(settings, "nowPlaying.loop")}: ${resolveLoopLabel(settings, player.loop)}`].join("  |  ");
    const description = createDescription(settings, track, progressBar, timingText, isRich);
    const fields = isRich
        ? createRichFields(settings, player, statusText, queueProgress, queueDuration)
        : createSimpleFields(settings, player, statusText, queueDuration, timingText, requester);

    const baseColor = getGuildThemeColor(client, player.guildId, player.paused ? TONES.warning.color : TONES.media.color);
    const cardColor = settings.dynamicArtworkColor && !settings.themeColor ? createArtworkColor(track, baseColor) : baseColor;
    const embed = createBaseEmbed(client, {
        color: cardColor,
        author: {
            name: player.paused ? text(settings, "nowPlaying.paused") : text(settings, "nowPlaying.active"),
            iconURL: client.user.displayAvatarURL(),
        },
        description,
        thumbnail: track.artworkUrl || resolveThumbnail(client, track, nextTrack),
        fields,
        footer: {
            text: player.paused
                ? `${text(settings, "nowPlaying.playerPaused")} | ${modeLabel} | v${getBotVersion()}`
                : `${text(settings, "nowPlaying.controlsBelow")} | ${modeLabel} | v${getBotVersion()}`,
            iconURL: client.user.displayAvatarURL(),
        },
    });

    if (track.uri) embed.setURL(track.uri);

    return embed;
}

function createDescription(settings, track, progressBar, timingText, isRich) {
    if (isRich) {
        return [
            `## ${trim(settings, track.title, 58)}`,
            `**${trim(settings, track.author, 48)}**`,
            "",
            progressBar,
            timingText,
        ].join("\n");
    }

    return [
        `### ${trim(settings, track.title, 52)}`,
        `**${trim(settings, track.author, 40)}**`,
    ].join("\n");
}

function createSimpleFields(settings, player, statusText, queueDuration, timingText, requester) {
    return [
        { name: text(settings, "nowPlaying.status"), value: `\`${statusText}\``, inline: true },
        { name: text(settings, "nowPlaying.queue"), value: `\`${text(settings, "nowPlaying.songCount", { count: player.queue.size })}\``, inline: true },
        { name: text(settings, "nowPlaying.duration"), value: `\`${queueDuration}\``, inline: true },
        { name: text(settings, "nowPlaying.time"), value: timingText, inline: false },
        { name: text(settings, "nowPlaying.request"), value: requester, inline: false },
    ];
}

function createRichFields(settings, player, statusText, queueProgress, queueDuration) {
    return [
        {
            name: text(settings, "nowPlaying.playback"),
            value: [
                `${text(settings, "nowPlaying.status")}: \`${statusText}\``,
                `${text(settings, "nowPlaying.request")}: ${player.queue.current.requester || text(settings, "nowPlaying.unknown")}`,
                `${text(settings, "nowPlaying.volume")}: \`${player.volume}%\``,
                `${text(settings, "nowPlaying.loop")}: \`${resolveLoopLabel(settings, player.loop)}\``,
            ].join("\n"),
            inline: true,
        },
        {
            name: text(settings, "nowPlaying.queue"),
            value: [
                `${text(settings, "nowPlaying.position")}: \`${queueProgress}\``,
                `${text(settings, "nowPlaying.waiting")}: \`${text(settings, "nowPlaying.songCount", { count: player.queue.size })}\``,
                `${text(settings, "nowPlaying.queueTime")}: \`${queueDuration}\``,
            ].join("\n"),
            inline: true,
        },
        {
            name: text(settings, "nowPlaying.session"),
            value: [
                `${text(settings, "nowPlaying.mode")}: \`${resolveModeLabel(settings, settings.playerMode)}\``,
                `${text(settings, "nowPlaying.theme")}: \`${settings.themeColor || text(settings, "nowPlaying.defaultTheme")}\``,
            ].join("\n"),
            inline: true,
        },
        {
            name: text(settings, "nowPlaying.upcoming"),
            value: createUpcomingPreview(settings, player),
            inline: false,
        },
    ];
}

function createUpcomingPreview(settings, player) {
    const queueSize = Math.min(player.queue?.size || 0, 3);
    const upcoming = Array.from({ length: queueSize }, (_, index) => player.queue[index]).filter(Boolean);

    if (!upcoming.length) return `\`${text(settings, "nowPlaying.noUpcoming")}\``;

    return upcoming
        .map((track, index) => {
            const duration = track.isStream ? text(settings, "nowPlaying.liveShort") : convertTime(track.duration);
            return `\`${index + 1}.\` **${trim(settings, track.title, 42)}** | \`${duration}\``;
        })
        .join("\n");
}

function createNowPlayingComponents(client, player, disabled = false) {
    const emoji = client.emoji.player;

    const transportRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setEmoji(emoji.previous).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("pause").setEmoji(player.paused ? emoji.resume : emoji.pause).setStyle(player.paused ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("skip").setEmoji(emoji.skip).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("stop").setEmoji(emoji.stop).setStyle(ButtonStyle.Danger).setDisabled(disabled),
    );

    const utilityRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("shuffle").setEmoji(emoji.shuffle).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("loop").setEmoji(emoji.loop).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("voldown").setEmoji(emoji.voldown).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId("volup").setEmoji(emoji.volup).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
    );

    return [transportRow, utilityRow];
}

async function refreshNowPlayingMessage(client, player) {
    if (!player?.message || !player.queue.current) return;

    const token = beginNowPlayingRender(client, player.guildId);
    const embed = createNowPlayingEmbed(client, player);
    const components = createNowPlayingComponents(client, player);

    await queueNowPlayingEdit(client, player, token, { embeds: [embed], components });
}

async function refreshNowPlayingMessageWithSettings(client, player, settings) {
    if (!player?.message || !player.queue.current) return;

    setNowPlayingSettings(client, player.guildId, settings);

    const token = beginNowPlayingRender(client, player.guildId);
    const embed = createNowPlayingEmbed(client, player, settings);
    const components = createNowPlayingComponents(client, player);

    await queueNowPlayingEdit(client, player, token, { embeds: [embed], components });
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

function clearNowPlayingState(client, guildId) {
    client.data.delete(getRefreshKey(guildId));
    client.data.delete(getRenderKey(guildId));
    client.data.delete(getEditQueueKey(guildId));
    client.data.delete(getSettingsKey(guildId));
}

function getTrackPosition(player, track) {
    if (track.isStream) return 0;

    return Math.min(typeof player.position === "number" ? player.position : 0, track.duration);
}

function createProgressBar(position, duration, size = PROGRESS_SIZE) {
    const safeDuration = Math.max(duration || 0, 1);
    const currentSlot = Math.min(size - 1, Math.floor((position / safeDuration) * size));
    const segments = Array.from({ length: size }, (_, index) => (index === currentSlot ? "O" : "-"));

    return `\`${segments.join("")}\``;
}

function resolveThumbnail(client, track, nextTrack) {
    if (typeof track.requester?.displayAvatarURL === "function") {
        return track.requester.displayAvatarURL();
    }

    return nextTrack?.artworkUrl || client.user.displayAvatarURL();
}

function trim(settings, value, maxLength) {
    if (!value) return text(settings, "nowPlaying.unknown");
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function resolveLoopLabel(settings, loop) {
    if (loop === "song") return text(settings, "nowPlaying.loopSong");
    if (loop === "queue") return text(settings, "nowPlaying.loopQueue");
    return text(settings, "nowPlaying.loopOff");
}

function resolveModeLabel(settings, mode) {
    return mode === "rich" ? text(settings, "nowPlaying.detailedCard") : text(settings, "nowPlaying.simpleCard");
}

function getRefreshKey(guildId) {
    return `nowPlayingRefresh_${guildId}`;
}

function getNowPlayingSettings(client, guildId, settingsOverride = null) {
    const snapshot = client.data.get(getSettingsKey(guildId));
    if (snapshot) return snapshot;

    if (settingsOverride) {
        const nextSettings = cloneSettings(settingsOverride);
        setNowPlayingSettings(client, guildId, nextSettings);
        return nextSettings;
    }

    const settings = cloneSettings(getGuildSettings(client, guildId));
    setNowPlayingSettings(client, guildId, settings);

    return settings;
}

function setNowPlayingSettings(client, guildId, settings) {
    client.data.set(getSettingsKey(guildId), cloneSettings(settings));
}

function cloneSettings(settings) {
    return JSON.parse(JSON.stringify(settings || {}));
}

function getSettingsKey(guildId) {
    return `nowPlayingSettings_${guildId}`;
}

function beginNowPlayingRender(client, guildId) {
    const key = getRenderKey(guildId);
    const token = (client.data.get(key) || 0) + 1;

    client.data.set(key, token);
    return token;
}

function isLatestNowPlayingRender(client, guildId, token) {
    return client.data.get(getRenderKey(guildId)) === token;
}

async function queueNowPlayingEdit(client, player, token, payload) {
    const key = getEditQueueKey(player.guildId);
    const previous = client.data.get(key) || Promise.resolve();
    const next = previous
        .catch(() => null)
        .then(async () => {
            if (!isLatestNowPlayingRender(client, player.guildId, token)) return;
            await player.message.edit(payload).catch(() => null);
        });

    client.data.set(key, next);
    await next;
}

function getRenderKey(guildId) {
    return `nowPlayingRender_${guildId}`;
}

function getEditQueueKey(guildId) {
    return `nowPlayingEditQueue_${guildId}`;
}

function text(settings, key, variables = {}) {
    const dictionary = LANGUAGES[settings.language] || LANGUAGES.tr;
    const fallback = LANGUAGES.tr;
    const template = get(dictionary, key) || get(fallback, key) || key;

    return interpolate(template, variables);
}

function get(source, path) {
    return path.split(".").reduce((value, part) => value?.[part], source);
}

function interpolate(template, variables) {
    if (typeof template !== "string") return template;

    return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
}

module.exports = {
    createNowPlayingEmbed,
    createNowPlayingComponents,
    refreshNowPlayingMessage,
    refreshNowPlayingMessageWithSettings,
    startNowPlayingRefresh,
    stopNowPlayingRefresh,
    clearNowPlayingState,
};
