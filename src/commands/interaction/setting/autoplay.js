const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "autoplay",
    description: "Otomatik oynatma modunu değiştir",
    category: "setting",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: true,
        player: true,
        current: true,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const track = player.queue.isEmpty ? player.queue.current : player.queue[player.queue.size - 1];

        if (!isYoutube(track)) {
            embed.setDescription(
                `${player.queue.isEmpty() ? "Mevcut şarkının platformu desteklenmiyor" : "Son sıradaki şarkının platformu desteklenmiyor"}. Otomatik oynatma modu sadece YouTube ile kullanılabilir.`,
            );

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const autoplay = client.data.get("autoplay", player.guildId);

        if (autoplay) {
            client.data.delete("autoplay", player.guildId);

            embed.setDescription(`Otomatik oynatma modu \`devre dışı\` bırakıldı`);
        } else {
            client.data.set("autoplay", player.guildId);

            embed.setDescription(`Otomatik oynatma modu \`etkinleştirildi\``);
        }

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};

function isYoutube(track) {
    return track?.source === "youtube";
}
