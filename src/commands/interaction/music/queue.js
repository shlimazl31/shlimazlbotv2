const { MessageFlags } = require("discord.js");
const _ = require("lodash");
const { createPage } = require("../../../functions/createPage.js");
const { createBaseEmbed, createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { convertTime } = require("../../../functions/timeFormat.js");

module.exports = {
    name: "queue",
    description: "Sira listesini goster",
    category: "music",
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
        if (player.queue.isEmpty) {
            const emptyEmbed = createStatusEmbed(client, {
                tone: "info",
                title: "Kuyruk",
                description: "Kuyruk su anda bos. Yeni bir sarki eklemek icin `/play` kullanabilirsin.",
            });

            return interaction.reply({ embeds: [emptyEmbed], flags: [MessageFlags.Ephemeral] });
        }

        const currentTrack = player.queue.current;
        const embed = createBaseEmbed(client, {
            color: 0x5865f2,
            author: {
                name: "Kuyruk Gorunumu",
                iconURL: client.user.displayAvatarURL(),
            },
            thumbnail: currentTrack?.artworkUrl || interaction.guild.iconURL(),
            fields: [
                {
                    name: "Su Anda Calan",
                    value: currentTrack
                        ? `**${trim(currentTrack.title, 44)}**\n${trim(currentTrack.author, 28)}  |  \`${currentTrack.isStream ? "CANLI" : convertTime(currentTrack.duration)}\``
                        : "`Aktif sarki bulunamadi`",
                    inline: false,
                },
                {
                    name: "Kuyruk Ozet",
                    value: `\`${player.queue.size}\` sarki  |  Toplam sure \`${convertTime(player.queue.duration)}\`  |  Dongu \`${resolveLoopLabel(player.loop)}\``,
                    inline: false,
                },
            ],
            footer: {
                text: `Toplam sarki: ${player.queue.size} | Toplam sure: ${convertTime(player.queue.duration)}`,
                iconURL: client.user.displayAvatarURL(),
            },
        });

        const queueList = player.queue.map((track, index) => {
            const trackTitle = trim(track.title, 34);
            const trackAuthor = trim(track.author, 24);
            const trackDuration = track.isStream ? "CANLI" : convertTime(track.duration);

            return `**${index + 1}.** [${trackTitle}](${track.uri})\n${trackAuthor}  |  \`${trackDuration}\``;
        });

        const pages = _.chunk(queueList, 8).map((chunk) => chunk.join("\n\n"));

        return createPage(client, interaction, embed, pages);
    },
};

function trim(value, maxLength) {
    if (!value) return "Bilinmiyor";
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function resolveLoopLabel(loop) {
    if (loop === "song") return "Sarki";
    if (loop === "queue") return "Kuyruk";
    return "Kapali";
}
