const { EmbedBuilder, MessageFlags } = require("discord.js");
const { createPage } = require("../../../functions/createPage.js");
const { convertTime } = require("../../../functions/timeFormat.js");
const _ = require("lodash");

module.exports = {
    name: "queue",
    description: "Sıra listesini göster",
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
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const formatString = (str, maxLength) => (str.length > maxLength ? str.substr(0, maxLength - 3) + "..." : str);

        if (player.queue.isEmpty) {
            embed.setDescription(`Sıra boş.`);

            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const queueList = player.queue.map((track, index) => {
            const trackUrl = track.uri;
            const trackTitles = formatString(track.title, 30).replace(/ - Topic$/, "") || "Bilinmeyen Başlık";
            const trackArtists = formatString(track.author, 25).replace(/ - Topic$/, "") || "Bilinmeyen Sanatçı";
            const trackDuration = track.isStream ? "CANLI" : convertTime(track.duration);

            return `\`${index + 1}.\` **[${trackTitles} - ${trackArtists}](${trackUrl})**  •  \`${trackDuration}\``;
        });

        embed
            .setAuthor({ name: "Sıra Listesi", iconURL: client.user.displayAvatarURL() })
            .setColor(client.config.embedColor)
            .setThumbnail(interaction.guild.iconURL())
            .setFooter({
                text: `Toplam Şarkı: ${player.queue.size}  •  Toplam Süre: ${convertTime(player.queue.duration)}`,
                iconURL: client.user.displayAvatarURL(),
            });

        const pages = _.chunk(queueList, 10).map((s) => s.join("\n"));

        return createPage(client, interaction, embed, pages);
    },
};
