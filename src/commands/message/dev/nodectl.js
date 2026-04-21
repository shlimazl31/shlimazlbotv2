const { EmbedBuilder } = require("discord.js");
const { isNodeDrained, setNodeDrained } = require("../../../functions/lavalinkNodeControl.js");

module.exports = {
    name: "nodectl",
    aliases: ["nodes", "nodecontrol"],
    description: "Manage Lavalink nodes",
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
        const action = (args[0] || "list").toLowerCase();
        const embed = new EmbedBuilder().setColor(client.config.embedColor);

        if (["help", "yardım", "?"].includes(action)) {
            return message.reply({ embeds: [createHelpEmbed(client)] });
        }

        if (action === "list") {
            return message.reply({ embeds: [createListEmbed(client)] });
        }

        if (action === "players") {
            return message.reply({ embeds: [createPlayersEmbed(client, args[1])] });
        }

        if (action === "info") {
            const node = findNode(client, args[1]);
            if (!node) return message.reply({ embeds: [embed.setDescription("Node bulunamadı. `!nodectl list` ile node adlarini görebilirsin.")] });

            return message.reply({ embeds: [createNodeInfoEmbed(client, node)] });
        }

        if (action === "drain" || action === "undrain") {
            const node = findNode(client, args[1]);
            if (!node) return message.reply({ embeds: [embed.setDescription("Node bulunamadı. `!nodectl list` ile node adlarini görebilirsin.")] });

            setNodeDrained(node.options.name, action === "drain");
            const state = action === "drain" ? "drain moduna alındı" : "drain modundan çıkarıldı";
            return message.reply({ embeds: [embed.setTitle("Node Control").setDescription(`\`${node.options.name}\` ${state}.`)] });
        }

        if (action === "reconnect" || action === "connect" || action === "disconnect") {
            const node = findNode(client, args[1]);
            if (!node) return message.reply({ embeds: [embed.setDescription("Node bulunamadı. `!nodectl list` ile node adlarini görebilirsin.")] });

            runNodeAction(node, action);
            return message.reply({ embeds: [embed.setTitle("Node Control").setDescription(`\`${node.options.name}\` için \`${action}\` işlemi gonderildi.`)] });
        }

        if (action === "move") {
            embed
                .setTitle("Node Control")
                .setDescription([
                    "Canlı player tasima Rainlink tarafinda guvenli public API olarak görunmuyor.",
                    "Guvenli akis: `!nodectl drain <node>` kullan, yeni player'lar diger node'lara gitsin.",
                    "Gerekirse problemli node için `!nodectl reconnect <node>` uygula.",
                ].join("\n"));

            return message.reply({ embeds: [embed] });
        }

        return message.reply({ embeds: [createHelpEmbed(client)] });
    },
};

function createHelpEmbed(client) {
    return new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle("Node Control")
        .setDescription("Owner-only Lavalink node yönetimi.")
        .addFields({
            name: "Komutlar",
            value: [
                "`!nodectl list` - node özetini gösterir",
                "`!nodectl info <node>` - tek node detayını gösterir",
                "`!nodectl players [node]` - player dağılımını gösterir",
                "`!nodectl drain <node>` - yeni player seçiminden node'u kacindirir",
                "`!nodectl undrain <node>` - node'u tekrar seçilebilir yapar",
                "`!nodectl reconnect <node>` - node websocket bağlantısini yeniler",
                "`!nodectl connect <node>` - node'a tekrar baglanmayi dener",
                "`!nodectl disconnect <node>` - node bağlantısini kapatır",
            ].join("\n"),
            inline: false,
        });
}

function createListEmbed(client) {
    const nodes = collectionValues(client.rainlink.nodes);
    const players = collectionValues(client.rainlink.players);
    const embed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle("Node Control | List")
        .setDescription(nodes.length ? `Toplam \`${nodes.length}\` node izleniyor.` : "Node bulunamadı.");

    for (const node of nodes) {
        const nodePlayers = getNodePlayers(players, node.options.name);
        const playing = nodePlayers.filter((activePlayer) => activePlayer.playing && !activePlayer.paused).length;

        embed.addFields({
            name: `${node.options.name} ${isNodeDrained(node.options.name) ? "[DRAIN]" : ""}`,
            value: [
                `Durum: \`${getNodeStatus(node)}\``,
                `Hoşt: \`${node.options.host}:${node.options.port}\``,
                `Players: \`${nodePlayers.length}\` | Playing: \`${playing}\``,
                `Load: \`${formatPercent(node.stats?.cpu?.lavalinkLoad)}\` | Memory: \`${formatBytes(node.stats?.memory?.used)}\``,
            ].join("\n"),
            inline: false,
        });
    }

    return embed;
}

function createNodeInfoEmbed(client, node) {
    const players = getNodePlayers(collectionValues(client.rainlink.players), node.options.name);
    const stats = node.stats || {};

    return new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle(`Node Control | ${node.options.name}`)
        .addFields(
            { name: "Durum", value: `\`${getNodeStatus(node)}\``, inline: true },
            { name: "Drain", value: `\`${isNodeDrained(node.options.name) ? "Açık" : "Kapalı"}\``, inline: true },
            { name: "Hoşt", value: `\`${node.options.host}:${node.options.port}\``, inline: true },
            { name: "Players", value: `\`${players.length}\``, inline: true },
            { name: "Playing", value: `\`${players.filter((activePlayer) => activePlayer.playing && !activePlayer.paused).length}\``, inline: true },
            { name: "Uptime", value: `\`${formatDuration(stats.uptime)}\``, inline: true },
            { name: "CPU", value: `Load: \`${formatPercent(stats.cpu?.lavalinkLoad)}\`\nSystem: \`${formatPercent(stats.cpu?.systemLoad)}\``, inline: true },
            { name: "Memory", value: `Used: \`${formatBytes(stats.memory?.used)}\`\nFree: \`${formatBytes(stats.memory?.free)}\``, inline: true },
        );
}

function createPlayersEmbed(client, nodeName) {
    const players = collectionValues(client.rainlink.players);
    const filteredPlayers = nodeName ? players.filter((activePlayer) => namesEqual(activePlayer.node?.options?.name, nodeName)) : players;
    const embed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle("Node Control | Players")
        .setDescription(filteredPlayers.length ? `Toplam \`${filteredPlayers.length}\` player listeleniyor.` : "Aktif player bulunamadı.");

    for (const activePlayer of filteredPlayers.slice(0, 15)) {
        const guild = client.guilds.cache.get(activePlayer.guildId);

        embed.addFields({
            name: guild ? guild.name : activePlayer.guildId,
            value: [
                `Node: \`${activePlayer.node?.options?.name || "n/a"}\``,
                `Voice: ${activePlayer.voiceId ? `<#${activePlayer.voiceId}>` : "`n/a`"}`,
                `Track: \`${activePlayer.queue?.current?.title || "n/a"}\``,
            ].join("\n"),
            inline: false,
        });
    }

    if (filteredPlayers.length > 15) {
        embed.setFooter({ text: `Ilk 15 player gösteriliyor. Kalan: ${filteredPlayers.length - 15}` });
    }

    return embed;
}

function runNodeAction(node, action) {
    if (action === "reconnect") return node.reconnect(false);
    if (action === "connect") return node.connect();
    if (action === "disconnect") return node.disconnect();
    return undefined;
}

function findNode(client, name) {
    if (!name) return null;
    return collectionValues(client.rainlink.nodes).find((node) => namesEqual(node.options?.name, name));
}

function getNodePlayers(players, nodeName) {
    return players.filter((activePlayer) => namesEqual(activePlayer.node?.options?.name, nodeName));
}

function namesEqual(left, right) {
    return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

function getNodeStatus(node) {
    if (node.state === 0 || node.connected || node.online) return "Online";
    if (node.state === 1) return "Offline";
    return "Unknown";
}

function collectionValues(collection) {
    if (!collection) return [];
    if (typeof collection.all === "function") return collection.all();
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

function formatDuration(ms = 0) {
    if (!Number.isFinite(ms) || ms <= 0) return "n/a";
    const totalSeçonds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeçonds / 3600);
    const minutes = Math.floor((totalSeçonds % 3600) / 60);
    const seçonds = totalSeçonds % 60;

    return `${hours}s ${minutes}d ${seçonds}sn`;
}


