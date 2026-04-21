const cron = require("node-cron");

module.exports = async (client) => {
    if (client.cacheSweeperStarted) return;

    const cacheTtlMs = Number(process.env.DATA_CACHE_TTL_MS || 5 * 60 * 1000);
    const sweepCron = process.env.DATA_CACHE_SWEEP_CRON || "0 */15 * * * *";
    client.cacheSweeperStarted = true;

    cron.schedule(sweepCron, async () => {
        try {
            const now = Date.now();
            let removed = 0;

            for (const [key, value] of client.data.entries()) {
                if (!key.startsWith("guildData_") && !key.startsWith("userData_")) continue;
                if (!value?.__cachedAt || now - value.__cachedAt < cacheTtlMs) continue;

                client.data.delete(key);
                removed += 1;

                if (key.startsWith("guildData_")) {
                    client.data.delete(key.replace("guildData_", "guildSettings_"));
                }
            }

            if (removed > 0 && process.env.DEBUG_CACHE_SWEEP === "true") {
                console.log(`[CACHE] ${removed} stale data item cleared`);
            }
        } catch (error) {
            console.error("Cache sweep error:", error);
        }
    });
};
