const DEFAULT_GUILD_SETTINGS = {
    language: "tr",
    musicChannelId: null,
    allowedRoleIds: [],
    themeColor: null,
    playerMode: "compact",
    dynamicArtworkColor: false,
    miniPlayer: {
        enabled: false,
        channelId: null,
        messageId: null,
    },
    playlist: {
        enabled: false,
        maxPlaylists: 10,
    },
    sleepTimer: {
        enabled: false,
        maxMinutes: 240,
    },
};

function getGuildData(client, guildId) {
    return client.data.get(`guildData_${guildId}`);
}

function ensureGuildSettings(guildData = {}) {
    const settings = guildData.settings || {};
    const miniPlayer = settings.miniPlayer || {};
    const playlist = settings.playlist || {};
    const sleepTimer = settings.sleepTimer || {};

    guildData.settings = {
        ...DEFAULT_GUILD_SETTINGS,
        ...settings,
        allowedRoleIds: Array.isArray(settings.allowedRoleIds) ? settings.allowedRoleIds : [],
        miniPlayer: {
            ...DEFAULT_GUILD_SETTINGS.miniPlayer,
            ...miniPlayer,
        },
        playlist: {
            ...DEFAULT_GUILD_SETTINGS.playlist,
            ...playlist,
            maxPlaylists: clampNumber(playlist.maxPlaylists, 1, 50, DEFAULT_GUILD_SETTINGS.playlist.maxPlaylists),
        },
        sleepTimer: {
            ...DEFAULT_GUILD_SETTINGS.sleepTimer,
            ...sleepTimer,
            maxMinutes: clampNumber(sleepTimer.maxMinutes, 1, 1440, DEFAULT_GUILD_SETTINGS.sleepTimer.maxMinutes),
        },
    };

    return guildData.settings;
}

function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(Math.max(Math.trunc(number), min), max);
}

function getGuildSettings(client, guildId) {
    const cachedSettings = client.data.get(`guildSettings_${guildId}`);
    if (cachedSettings) return cachedSettings;

    const guildData = getGuildData(client, guildId);
    if (!guildData) return DEFAULT_GUILD_SETTINGS;

    const settings = ensureGuildSettings(guildData);
    client.data.set(`guildSettings_${guildId}`, settings);

    return settings;
}

function getGuildThemeColor(client, guildId, fallback) {
    const settings = getGuildSettings(client, guildId);
    return settings.themeColor || fallback || client.config.embedColor;
}

function normalizeHexColor(value) {
    if (!value || typeof value !== "string") return null;

    const trimmed = value.trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(trimmed)) return null;

    return `#${trimmed.toUpperCase()}`;
}

async function persistGuildData(client, guildId, guildData) {
    const settings = ensureGuildSettings(guildData);
    const { __cachedAt, ...persistedGuildData } = guildData;

    client.data.set(`guildData_${guildId}`, guildData);
    client.data.set(`guildSettings_${guildId}`, settings);
    await client.guildData.findOneAndUpdate({ id: guildId }, { $set: persistedGuildData }, { upsert: true, new: true });
}

function isMusicCommand(command) {
    return command?.category === "music";
}

function canBypassMusicGuards(client, member) {
    if (!member) return false;
    if (client.config.dev.includes(member.id)) return true;
    if (member.permissions?.has("ManageGuild")) return true;

    const guildData = getGuildData(client, member.guild.id);
    const djRoleId = guildData?.dj?.status ? guildData?.dj?.role : null;

    return Boolean(djRoleId && member.roles.cache.has(djRoleId));
}

module.exports = {
    DEFAULT_GUILD_SETTINGS,
    canBypassMusicGuards,
    ensureGuildSettings,
    getGuildData,
    getGuildSettings,
    getGuildThemeColor,
    isMusicCommand,
    normalizeHexColor,
    persistGuildData,
};
