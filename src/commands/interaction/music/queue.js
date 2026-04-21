const { MessageFlags } = require("discord.js");
const _ = require("lodash");
const { createPage } = require("../../../functions/createPage.js");
const { createBaseEmbed, createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { convertTime } = require("../../../functions/timeFormat.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "queue",
    description: "Sira listesini göster",
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
        const guildId = interaction.guildId;

        if (player.queue.isEmpty) {
            const emptyEmbed = createStatusEmbed(client, {
                tone: "info",
                title: t(client, guildId, "music.clear.title"),
                guildId,
                description: t(client, guildId, "music.queue.empty"),
            });

            return interaction.reply({ embeds: [emptyEmbed], flags: [MessageFlags.Ephemeral] });
        }

        const currentTrack = player.queue.current;
        const totalDuration = convertTime(player.queue.duration);
        const embed = createBaseEmbed(client, {
            color: 0x5865f2,
            guildId,
            author: {
                name: t(client, guildId, "music.queue.viewTitle"),
                iconURL: client.user.displayAvatarURL(),
            },
            thumbnail: currentTrack?.artworkUrl || interaction.guild.iconURL(),
            fields: [
                {
                    name: t(client, guildId, "music.queue.nowPlaying"),
                    value: currentTrack
                        ? `**${trim(client, guildId, currentTrack.title, 44)}**\n${trim(client, guildId, currentTrack.author, 28)} | \`${currentTrack.isStream ? t(client, guildId, "music.queue.live") : convertTime(currentTrack.duration)}\``
                        : `\`${t(client, guildId, "music.queue.noCurrent")}\``,
                    inline: false,
                },
                {
                    name: t(client, guildId, "music.queue.summary"),
                    value: t(client, guildId, "music.queue.summaryValue", {
                        count: player.queue.size,
                        duration: totalDuration,
                        loop: resolveLoopLabel(client, guildId, player.loop),
                    }),
                    inline: false,
                },
            ],
            footer: {
                text: t(client, guildId, "music.queue.footer", { count: player.queue.size, duration: totalDuration }),
                iconURL: client.user.displayAvatarURL(),
            },
        });

        const queueList = player.queue.map((track, index) => {
            const trackTitle = trim(client, guildId, track.title, 34);
            const trackAuthor = trim(client, guildId, track.author, 24);
            const trackDuration = track.isStream ? t(client, guildId, "music.queue.live") : convertTime(track.duration);

            return `**${index + 1}.** [${trackTitle}](${track.uri})\n${trackAuthor} | \`${trackDuration}\``;
        });

        const pages = _.chunk(queueList, 8).map((chunk) => chunk.join("\n\n"));

        return createPage(client, interaction, embed, pages);
    },
};

function trim(client, guildId, value, maxLength) {
    if (!value) return t(client, guildId, "music.queue.unknown");
    return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function resolveLoopLabel(client, guildId, loop) {
    if (loop === "song") return t(client, guildId, "music.queue.loopSong");
    if (loop === "queue") return t(client, guildId, "music.queue.loopQueue");
    return t(client, guildId, "music.queue.loopOff");
}

