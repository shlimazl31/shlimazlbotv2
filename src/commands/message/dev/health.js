const os = require("os");
const mongoose = require("mongoose");
const { EmbedBuilder } = require("discord.js");
const { getBotVersion } = require("../../../functions/getBotVersion.js");
const { getGuildSettings } = require("../../../functions/guildSettings.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "health",
    aliases: ["status", "bothealth"],
    description: "Owner health durumunu gösterir",
    category: "dev",
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
    run: async (client, message, player, args) => {
        const scope = (args[0] || "overview").toLowerCase();
        const embed = createHealthEmbed(client, message, scope);

        return message.reply({ embeds: [embed] });
    },
};

function createHealthEmbed(client, message, scope) {
    if (scope === "lavalink" || scope === "node") return createLavalinkEmbed(client, message);
    if (scope === "mongo" || scope === "db") return createMongoEmbed(client, message);
    if (scope === "memory" || scope === "mem") return createMemoryEmbed(client, message);
    if (scope === "shards" || scope === "shard") return createShardEmbed(client, message);

    return createOverviewEmbed(client, message);
}

function createOverviewEmbed(client, message) {
    const players = collectionValues(client.rainlink.players);
    const playing = players.filter((activePlayer) => activePlayer.playing && !activePlayer.paused).length;
    const settings = getGuildSettings(client, message.guildId);

    return baseEmbed(client, "Health | Overview")
        .setDescription(t(client, message.guildId, "health.overviewDescription"))
        .addFields(
            { name: "Version", value: `\`v${getBotVersion()}\``, inline: true },
            { name: "Uptime", value: `\`${formatDuration(process.uptime() * 1000)}\``, inline: true },
            { name: "Ping", value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
            { name: "Guild", value: `\`${client.guilds.cache.size}\``, inline: true },
            { name: "Players", value: t(client, message.guildId, "health.playersValue", { players: players.length, playing }), inline: true },
            { name: "Mini Player", value: settings.miniPlayer.enabled ? `<#${settings.miniPlayer.channelId}>` : t(client, message.guildId, "health.miniOff"), inline: true },
        );
}

function createLavalinkEmbed(client, message) {
    const nodes = collectionValues(client.rainlink.nodes);
    const players = collectionValues(client.rainlink.players);
    const embed = baseEmbed(client, "Health | Lavalink").setDescription(t(client, message.guildId, "health.lavalinkDescription", { count: nodes.length }));

    for (const node of nodes) {
        const nodePlayers = players.filter((activePlayer) => activePlayer.node?.options?.name === node.options.name);
        const playing = nodePlayers.filter((activePlayer) => activePlayer.playing && !activePlayer.paused).length;
        const stats = node.stats || {};

        embed.addFields({
            name: node.options.name,
            value: [
                `Host: \`${node.options.host}:${node.options.port}\``,
                `Durum: \`${node.connected || node.online ? "Online" : "Offline"}\``,
                `Players: \`${nodePlayers.length}\` | Playing: \`${playing}\``,
                `CPU: \`${formatPercent(stats.cpu?.lavalinkLoad)}\` | Memory: \`${formatBytes(stats.memory?.used)}\``,
            ].join("\n"),
            inline: false,
        });
    }

    if (!nodes.length) embed.addFields({ name: "Node", value: t(client, message.guildId, "health.noNodes"), inline: false });
    return embed;
}

function createMongoEmbed(client, message) {
    const states = ["disconnected", "connected", "connecting", "disconnecting"];

    return baseEmbed(client, "Health | Mongo")
        .setDescription(t(client, message.guildId, "health.mongoDescription"))
        .addFields(
        { name: "State", value: `\`${states[mongoose.connection.readyState] || "unknown"}\``, inline: true },
        { name: "Host", value: `\`${mongoose.connection.host || "n/a"}\``, inline: true },
        { name: "Database", value: `\`${mongoose.connection.name || "n/a"}\``, inline: true },
    );
}

function createMemoryEmbed(client, message) {
    const usage = process.memoryUsage();
    const total = os.totalmem();
    const free = os.freemem();

    return baseEmbed(client, "Health | Memory")
        .setDescription(t(client, message.guildId, "health.memoryDescription"))
        .addFields(
        { name: "RSS", value: `\`${formatBytes(usage.rss)}\``, inline: true },
        { name: "Heap", value: `\`${formatBytes(usage.heapUsed)} / ${formatBytes(usage.heapTotal)}\``, inline: true },
        { name: "External", value: `\`${formatBytes(usage.external)}\``, inline: true },
        { name: "System Free", value: `\`${formatBytes(free)} / ${formatBytes(total)}\``, inline: false },
    );
}

function createShardEmbed(client, message) {
    return baseEmbed(client, "Health | Shards")
        .setDescription(t(client, message.guildId, "health.shardsDescription"))
        .addFields(
        { name: "Shard IDs", value: `\`${client.options.shards?.join(", ") || "auto"}\``, inline: true },
        { name: "Shard Count", value: `\`${client.options.shardCount || 1}\``, inline: true },
        { name: "Cluster ID", value: `\`${client.cluster?.id ?? "n/a"}\``, inline: true },
    );
}

function baseEmbed(client, title) {
    return new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setAuthor({ name: title, iconURL: client.user.displayAvatarURL() })
        .setFooter({ text: `Owner health | v${getBotVersion()}`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
}

function collectionValues(collection) {
    if (!collection) return [];
    if (typeof collection.values === "function") return Array.from(collection.values());
    if (collection.values && typeof collection.values[Symbol.iterator] === "function") return Array.from(collection.values);
    if (typeof collection[Symbol.iterator] === "function") return Array.from(collection);

    return [];
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

