const os = require("os");
const mongoose = require("mongoose");
const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { getBotVersion } = require("../../../functions/getBotVersion.js");
const { getGuildSettings } = require("../../../functions/guildSettings.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "health",
    description: "Owner için bot sağlık ve durum kontrolleri",
    category: "general",
    options: [
        {
            name: "scope",
            description: "Kontrol edilecek alan",
            type: 3,
            required: true,
            choices: [
                { name: "Genel", value: "overview" },
                { name: "Lavalink", value: "lavalink" },
                { name: "Mongo", value: "mongo" },
                { name: "Bellek", value: "memory" },
                { name: "Shard", value: "shards" },
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
    devOnly: true,
    run: async (client, interaction) => {
        const scope = interaction.options.getString("scope");
        const embed = createHealthEmbed(client, interaction, scope);

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};

function createHealthEmbed(client, interaction, scope) {
    if (scope === "lavalink") return createLavalinkEmbed(client, interaction);
    if (scope === "mongo") return createMongoEmbed(client, interaction);
    if (scope === "memory") return createMemoryEmbed(client, interaction);
    if (scope === "shards") return createShardEmbed(client, interaction);

    return createOverviewEmbed(client, interaction);
}

function createOverviewEmbed(client, interaction) {
    const players = collectionValues(client.rainlink.players);
    const playing = players.filter((player) => player.playing && !player.paused).length;
    const settings = getGuildSettings(client, interaction.guildId);

    return createStatusEmbed(client, {
        tone: "info",
        title: "Health",
        guildId: interaction.guildId,
        description: t(client, interaction.guildId, "health.overviewDescription"),
        fields: [
            { name: "Uptime", value: `\`${formatDuration(process.uptime() * 1000)}\``, inline: true },
            { name: "Version", value: `\`v${getBotVersion()}\``, inline: true },
            { name: "Guild", value: `\`${client.guilds.cache.size}\``, inline: true },
            { name: "Ping", value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
            { name: "Players", value: t(client, interaction.guildId, "health.playersValue", { players: players.length, playing }), inline: true },
            { name: "Node.js", value: `\`${process.version}\``, inline: true },
            { name: "Platform", value: `\`${process.platform}\``, inline: true },
            { name: "Mini Player", value: settings.miniPlayer.enabled ? `<#${settings.miniPlayer.channelId}>` : t(client, interaction.guildId, "health.miniOff"), inline: true },
            { name: "Player Mode", value: `\`${settings.playerMode}\``, inline: true },
            { name: "Theme", value: settings.themeColor || t(client, interaction.guildId, "health.defaultTheme"), inline: true },
        ],
    });
}

function createLavalinkEmbed(client, interaction) {
    const nodes = collectionValues(client.rainlink.nodes);
    const players = collectionValues(client.rainlink.players);

    const fields = nodes.map((node) => {
        const nodePlayers = players.filter((player) => player.node?.options?.name === node.options.name);
        const playing = nodePlayers.filter((player) => player.playing && !player.paused).length;
        const stats = node.stats || {};

        return {
            name: node.options.name,
            value: [
                `Host: \`${node.options.host}:${node.options.port}\``,
                `Durum: \`${node.connected ? "Online" : "Offline"}\``,
                `Players: \`${nodePlayers.length}\` | Playing: \`${playing}\``,
                `CPU: \`${formatPercent(stats.cpu?.lavalinkLoad)}\` | Memory: \`${formatBytes(stats.memory?.used)}\``,
            ].join("\n"),
            inline: false,
        };
    });

    return createStatusEmbed(client, {
        tone: "media",
        title: "Lavalink",
        guildId: interaction.guildId,
        description: t(client, interaction.guildId, "health.lavalinkDescription", { count: nodes.length }),
        fields: fields.length ? fields : [{ name: "Node", value: t(client, interaction.guildId, "health.noNodes"), inline: false }],
    });
}

function createMongoEmbed(client, interaction) {
    const states = ["disconnected", "connected", "connecting", "disconnecting"];

    return createStatusEmbed(client, {
        tone: mongoose.connection.readyState === 1 ? "success" : "warning",
        title: "Mongo",
        guildId: interaction.guildId,
        description: t(client, interaction.guildId, "health.mongoDescription"),
        fields: [
            { name: "State", value: `\`${states[mongoose.connection.readyState] || "unknown"}\``, inline: true },
            { name: "Host", value: `\`${mongoose.connection.host || "n/a"}\``, inline: true },
            { name: "Database", value: `\`${mongoose.connection.name || "n/a"}\``, inline: true },
        ],
    });
}

function createMemoryEmbed(client, interaction) {
    const usage = process.memoryUsage();
    const total = os.totalmem();
    const free = os.freemem();

    return createStatusEmbed(client, {
        tone: "info",
        title: "Memory",
        guildId: interaction.guildId,
        description: t(client, interaction.guildId, "health.memoryDescription"),
        fields: [
            { name: "RSS", value: `\`${formatBytes(usage.rss)}\``, inline: true },
            { name: "Heap", value: `\`${formatBytes(usage.heapUsed)} / ${formatBytes(usage.heapTotal)}\``, inline: true },
            { name: "External", value: `\`${formatBytes(usage.external)}\``, inline: true },
            { name: "System Free", value: `\`${formatBytes(free)} / ${formatBytes(total)}\``, inline: false },
        ],
    });
}

function createShardEmbed(client, interaction) {
    return createStatusEmbed(client, {
        tone: "info",
        title: "Shards",
        guildId: interaction.guildId,
        description: t(client, interaction.guildId, "health.shardsDescription"),
        fields: [
            { name: "Shard IDs", value: `\`${client.options.shards?.join(", ") || "auto"}\``, inline: true },
            { name: "Shard Count", value: `\`${client.options.shardCount || 1}\``, inline: true },
            { name: "Cluster ID", value: `\`${client.cluster?.id ?? "n/a"}\``, inline: true },
        ],
    });
}

function formatBytes(value = 0) {
    if (!Number.isFinite(value)) return "n/a";
    const units = ["B", "KB", "MB", "GB"];
    let size = value;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
    }

    return `${size.toFixed(2)}${units[unit]}`;
}

function formatPercent(value) {
    if (!Number.isFinite(value)) return "n/a";
    return `${(value * 100).toFixed(2)}%`;
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${days}g ${hours}s ${minutes}d`;
}

function collectionValues(collection) {
    if (!collection) return [];
    if (typeof collection.values === "function") return Array.from(collection.values());
    if (collection.values && typeof collection.values[Symbol.iterator] === "function") return Array.from(collection.values);
    if (typeof collection[Symbol.iterator] === "function") return Array.from(collection);

    return [];
}
