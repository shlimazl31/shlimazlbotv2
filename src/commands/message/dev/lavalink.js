const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "lavalink",
    aliases: ["node"],
    description: "View lavalink status",
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
        const ms = (await import("pretty-ms")).default;
        const embed = new EmbedBuilder().setColor(client.config.embedColor);

        try {
            const nodes = client.rainlink.nodes.all();
            const players = client.rainlink.players.values;

            if (!nodes || nodes.length === 0) {
                embed.setDescription(`No lavalink nodes found.`);

                return message.reply({ embeds: [embed] });
            }

            const nodeInfo = nodes.map((node) => {
                const online = node.online ? "Online" : "Offline";
                const statsPlayers = players.filter((activePlayer) => activePlayer.node?.options?.name === node.options.name);
                const playing = statsPlayers.filter((activePlayer) => activePlayer.playing).length;
                const { uptime, memory, cpu } = node.stats;
                const formattedUptime = ms(uptime, { compact: true });

                const nodeInfo = {
                    name: node.options.name,
                    host: node.options.host,
                    port: node.options.port,
                    secure: node.options.secure,
                    driver: node.options.driver,
                };

                const memoryInfo = {
                    used: (memory.used / 1024 / 1024).toFixed(2),
                    free: (memory.free / 1024 / 1024).toFixed(2),
                    allocated: (memory.allocated / 1024 / 1024).toFixed(2),
                    reservable: (memory.reservable / 1024 / 1024).toFixed(2),
                };

                const cpuInfo = {
                    cores: cpu.cores,
                    systemLoad: (cpu.systemLoad * 100).toFixed(2),
                    lavalinkLoad: (cpu.lavalinkLoad * 100).toFixed(2),
                };

                return formatNodeInfo(nodeInfo, online, statsPlayers.length, playing, formattedUptime, memoryInfo, cpuInfo);
            });
            embed.setDescription(nodeInfo.join("\n"));

            return message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            embed.setDescription(`An error occurred while fetching the Lavalink node information.`);

            return message.reply({ embeds: [embed] });
        }
    },
};

function formatNodeInfo(nodeInfo, online, players, playing, formattedUptime, memoryInfo, cpuInfo) {
    return `\`\`\`yaml
- General Info
  - Name: ${nodeInfo.name}
  - Host: ${nodeInfo.host}
  - Port: ${nodeInfo.port}
  - Secure: ${nodeInfo.secure}
  - Driver: ${nodeInfo.driver}
  
- Status Info
  - Connection: ${online}
  - Players: ${players}
  - Playing: ${playing}
  - Uptime: ${formattedUptime}
  
- Memory Info
  - Used: ${memoryInfo.used}MB
  - Free: ${memoryInfo.free}MB
  - Allocated: ${memoryInfo.allocated}MB
  - Reservable: ${memoryInfo.reservable}MB
  
- CPU Info
  - Cores: ${cpuInfo.cores}
  - System Load: ${cpuInfo.systemLoad}%
  - Lavalink Load: ${cpuInfo.lavalinkLoad}%
\`\`\``;
}
