module.exports = {
    createDataGuild: async (client, guild) => {
        try {
            const { ensureGuildSettings } = require("./guildSettings.js");
            const { ensureGuildPremium } = require("./premium.js");
            const fallback = client.data.get(`guildData_${guild.id}`) || { id: guild.id };

            const fallbackSettings = ensureGuildSettings(fallback);
            ensureGuildPremium(fallback);
            client.data.set(`guildData_${guild.id}`, fallback);
            client.data.set(`guildSettings_${guild.id}`, fallbackSettings);

            const guildData = await client.guildData.findOneAndUpdate(
                { id: guild.id },
                { $setOnInsert: { id: guild.id } },
                { upsert: true, new: true },
            );
            const { _id, __v, ...data } = guildData.toObject();

            const settings = ensureGuildSettings(data);
            ensureGuildPremium(data);
            client.data.set(`guildSettings_${guild.id}`, settings);
            client.data.set(`guildData_${guild.id}`, data);
        } catch (error) {
            console.error("Error creating data:", error);
        }
    },

    createDataUser: async (client, user) => {
        if (user.bot || user.id === client.user.id) return;

        try {
            if (!client.data.has(`userData_${user.id}`)) {
                client.data.set(`userData_${user.id}`, {
                    id: user.id,
                    ban: {
                        status: false,
                        reason: null,
                    },
                });
            }

            const userData = await client.userData.findOneAndUpdate(
                { id: user.id },
                { $setOnInsert: { id: user.id } },
                { upsert: true, new: true },
            );
            const { _id, __v, ...data } = userData.toObject();

            client.data.set(`userData_${user.id}`, data);
        } catch (error) {
            console.error("Error creating data:", error);
        }
    },
};
