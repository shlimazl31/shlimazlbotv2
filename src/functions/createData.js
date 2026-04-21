const DATA_CACHE_TTL_MS = Number(process.env.DATA_CACHE_TTL_MS || 5 * 60 * 1000);

function isFreshCache(data) {
    return Boolean(data?.__cachedAt && Date.now() - data.__cachedAt < DATA_CACHE_TTL_MS);
}

function stripMongoMeta(document, fallback = {}) {
    const source = document?.toObject ? document.toObject() : document || fallback;
    const { _id, __v, ...data } = source;

    return { ...fallback, ...data, __cachedAt: Date.now() };
}

module.exports = {
    createDataGuild: async (client, guild) => {
        try {
            const { ensureGuildSettings } = require("./guildSettings.js");
            const { ensureGuildPremium } = require("./premium.js");
            const cacheKey = `guildData_${guild.id}`;
            const cached = client.data.get(cacheKey);

            if (isFreshCache(cached)) {
                cached.__cachedAt = Date.now();
                const cachedSettings = ensureGuildSettings(cached);
                ensureGuildPremium(cached);
                client.data.set(cacheKey, cached);
                client.data.set(`guildSettings_${guild.id}`, cachedSettings);
                return;
            }

            const fallback = cached || { id: guild.id, __cachedAt: Date.now() };

            const fallbackSettings = ensureGuildSettings(fallback);
            ensureGuildPremium(fallback);
            client.data.set(cacheKey, fallback);
            client.data.set(`guildSettings_${guild.id}`, fallbackSettings);

            const guildData = await client.guildData.findOneAndUpdate(
                { id: guild.id },
                { $setOnInsert: { id: guild.id } },
                { upsert: true, new: true, setDefaultsOnInsert: true },
            ).lean();
            const data = stripMongoMeta(guildData, { id: guild.id });

            const settings = ensureGuildSettings(data);
            ensureGuildPremium(data);
            client.data.set(`guildSettings_${guild.id}`, settings);
            client.data.set(cacheKey, data);
        } catch (error) {
            console.error("Error creating data:", error);
        }
    },

    createDataUser: async (client, user) => {
        if (user.bot || user.id === client.user.id) return;

        try {
            const cacheKey = `userData_${user.id}`;
            const cached = client.data.get(cacheKey);

            if (isFreshCache(cached)) {
                cached.__cachedAt = Date.now();
                client.data.set(cacheKey, cached);
                return;
            }

            if (!cached) {
                client.data.set(cacheKey, {
                    id: user.id,
                    __cachedAt: Date.now(),
                    ban: {
                        status: false,
                        reason: null,
                    },
                });
            }

            const userData = await client.userData.findOneAndUpdate(
                { id: user.id },
                { $setOnInsert: { id: user.id } },
                { upsert: true, new: true, setDefaultsOnInsert: true },
            ).lean();
            const data = stripMongoMeta(userData, { id: user.id });

            client.data.set(cacheKey, data);
        } catch (error) {
            console.error("Error creating data:", error);
        }
    },
};
