const MAX_RECENT_COMMANDS = 25;
const COMMAND_DB_LOGS_ENABLED = String(process.env.COMMAND_DB_LOGS || "").trim().toLowerCase() === "true";

function createEmptyStats() {
    return {
        startedAt: Date.now(),
        total: 0,
        slash: 0,
        prefix: 0,
        byCommand: {},
        byGuild: {},
        recent: [],
    };
}

function recordCommandUsage(client, data = {}) {
    const stats = client.data.get("commandStats") || createEmptyStats();
    const commandName = data.commandName || "unknown";
    const guildId = data.guildId || "dm";
    const type = data.type === "prefix" ? "prefix" : "slash";

    stats.total += 1;
    stats[type] += 1;
    stats.byCommand[commandName] = (stats.byCommand[commandName] || 0) + 1;
    stats.byGuild[guildId] = (stats.byGuild[guildId] || 0) + 1;
    stats.recent.unshift({
        at: new Date().toISOString(),
        type,
        commandName,
        guildId,
        userId: data.userId || null,
    });
    stats.recent = stats.recent.slice(0, MAX_RECENT_COMMANDS);

    client.data.set("commandStats", stats);
    if (COMMAND_DB_LOGS_ENABLED && client.adminLog?.create) {
        client.adminLog.create({
            action: `command.${type}`,
            actor: data.userId || null,
            targetType: "guild",
            targetId: guildId,
            message: `${commandName} komutu kullanıldı.`,
            metadata: {
                commandName,
                type,
                userId: data.userId || null,
                guildId,
            },
        }).catch(() => {});
    }
    return stats;
}

function getCommandStats(client) {
    return client.data.get("commandStats") || createEmptyStats();
}

module.exports = {
    getCommandStats,
    recordCommandUsage,
};
