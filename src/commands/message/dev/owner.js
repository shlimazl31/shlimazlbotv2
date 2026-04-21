const { EmbedBuilder } = require("discord.js");
const { getCommandStats } = require("../../../functions/commandStats.js");
const { getBotVersion } = require("../../../functions/getBotVersion.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "owner",
    aliases: ["admin", "devhelp", "ownerhelp"],
    description: "Owner komut panelini gösterir",
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
    run: async (client, message) => {
        const stats = getCommandStats(client);
        const players = collectionValues(client.rainlink.players);
        const playing = players.filter((activePlayer) => activePlayer.playing && !activePlayer.paused).length;
        const dashboardUrl = process.env.DASHBOARD_URL || "https://dashboard.yakupsemihbulut.com";
        const apiUrl = process.env.API_PUBLIC_URL || "https://api.yakupsemihbulut.com/api/bot";
        const embed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setAuthor({
                name: `${client.user.username} | Owner Panel`,
                iconURL: client.user.displayAvatarURL(),
            })
            .setDescription(t(client, message.guildId, "owner.description"))
            .addFields(
                {
                    name: "Genel Özet",
                    value: [
                        `Version: \`v${getBotVersion()}\``,
                        `Sunucu: \`${client.guilds.cache.size}\``,
                        `Player: \`${players.length}\` aktif | \`${playing}\` çalıyor`,
                        `Komut: \`${stats.total}\` runtime kullanım`,
                    ].join("\n"),
                    inline: false,
                },
                {
                    name: "Health",
                    value: [
                        t(client, message.guildId, "owner.healthGeneral"),
                        t(client, message.guildId, "owner.healthLavalink"),
                        t(client, message.guildId, "owner.healthMongo"),
                        t(client, message.guildId, "owner.healthMemory"),
                        t(client, message.guildId, "owner.healthShards"),
                    ].join("\n"),
                    inline: false,
                },
                {
                    name: t(client, message.guildId, "owner.devCommands"),
                    value: [
                        t(client, message.guildId, "owner.lavalink"),
                        t(client, message.guildId, "owner.nodeControl"),
                        t(client, message.guildId, "owner.premium"),
                        t(client, message.guildId, "owner.maintenance"),
                        t(client, message.guildId, "owner.ban"),
                        t(client, message.guildId, "owner.purge"),
                        t(client, message.guildId, "owner.ticket"),
                    ].join("\n"),
                    inline: false,
                },
                {
                    name: t(client, message.guildId, "owner.slashManagement"),
                    value: [
                        t(client, message.guildId, "owner.settings"),
                        t(client, message.guildId, "owner.help"),
                    ].join("\n"),
                    inline: false,
                },
                {
                    name: "Dashboard",
                    value: [
                        `Site: ${dashboardUrl}`,
                        `API: ${apiUrl}`,
                        "`DASHBOARD_ADMIN_TOKEN` olmadan admin endpointleri kapalı kalir.",
                    ].join("\n"),
                    inline: false,
                },
            )
            .setFooter({
                text: `Owner panel | v${getBotVersion()}`,
                iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    },
};

function collectionValues(collection) {
    if (!collection) return [];
    if (typeof collection.all === "function") return collection.all();
    if (typeof collection.values === "function") return Array.from(collection.values());
    if (collection.values && typeof collection.values[Symbol.iterator] === "function") return Array.from(collection.values);
    if (typeof collection[Symbol.iterator] === "function") return Array.from(collection);

    return [];
}


