const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { PREMIUM_FEATURES } = require("../../../functions/premium.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "autoplay",
    description: "Otomatik oynatma modunu degistir",
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
    premium: PREMIUM_FEATURES.AUTOPLAY,
    devOnly: false,
    run: async (client, interaction, player) => {
        const guildId = interaction.guildId;
        const embed = createStatusEmbed(client, {
            tone: "info",
            title: t(client, guildId, "music.autoplay.title"),
            guildId,
        });
        const track = player.queue.isEmpty ? player.queue.current : player.queue[player.queue.size - 1];

        if (!isYoutube(track)) {
            const target = player.queue.isEmpty
                ? t(client, guildId, "music.autoplay.currentTrack")
                : t(client, guildId, "music.autoplay.lastTrack");

            embed.setDescription(t(client, guildId, "music.autoplay.unsupported", { target }));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const autoplay = client.data.get("autoplay", player.guildId);

        if (autoplay) {
            client.data.delete("autoplay", player.guildId);
            embed.setDescription(t(client, guildId, "music.autoplay.disabled"));
        } else {
            client.data.set("autoplay", player.guildId);
            embed.setDescription(t(client, guildId, "music.autoplay.enabled"));
        }

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};

function isYoutube(track) {
    return track?.source === "youtube" || track?.sourceName === "youtube";
}
