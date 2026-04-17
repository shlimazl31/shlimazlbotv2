const { ActivityType } = require("discord.js");
const emojiConfig = require("../../../settings/emoji.js");
const axios = require("axios");

const updateApiStatus = async (client, servers, members) => {
    try {
        await axios.post("https://api.benbotdegilim.online/api/bot/status", {
            ip: "173.212.247.209",
            servers: servers,
            members: members,
            status: "online"
        });
    } catch (error) {
        // Hata mesajını sadece debug modunda göster
        if (process.env.DEBUG) {
            console.error("[DEBUG] API status update failed:", error.message);
        }
    }
};

module.exports = async (client) => {
    await emojiConfig(client);

    const guildData = await client.guildData.find();

    guildData.forEach(async (x) => {
        const { _id, __v, ...data } = x.toObject();

        client.data.set(`guildData_${x.id}`, data);
    });

    const userData = await client.userData.find();

    userData.forEach(async (x) => {
        const { _id, __v, ...data } = x.toObject();

        client.data.set(`userData_${x.id}`, data);
    });

    setInterval(async () => {
        const promises = [
            client.cluster.broadcastEval("this.guilds.cache.size"),
            client.cluster.broadcastEval((c) => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
        ];

        const results = await Promise.all(promises);

        const servers = results[0].reduce((acc, guildCount) => acc + guildCount, 0);
        const members = results[1].reduce((acc, memberCount) => acc + memberCount, 0);

        // API durumunu güncelle
        await updateApiStatus(client, servers, members);

        const status = [
            { type: ActivityType.Playing, name: "/play" },
            { type: ActivityType.Listening, name: `${members} Users` },
            { type: ActivityType.Playing, name: "benbotdegilim.online" },
        ];

        const index = Math.floor(Math.random() * status.length);
        const presenceOptions = { activities: [{ type: status[index].type, name: status[index].name }], status: "online" };

        client.user.setPresence(presenceOptions);
    }, 5000);

    console.log(`[INFO] ${client.user.username} is ready with ${await client.guilds.cache.size} server`);
};