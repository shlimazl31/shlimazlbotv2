const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { find } = require("llyrics");
const gsearch = require("google-search-url");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "lyric",
    description: "Mevcut şarkının sözlerini göster",
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
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const track = player.queue.current;
        const trackTitle = formatText(track.title);
        const trackArtist = formatText(track.author);
        const loadingEmbed = new EmbedBuilder().setColor(client.config.embedColor).setDescription(t(client, guildId, "music.lyric.loading"));
        await interaction.reply({ embeds: [loadingEmbed] });
        const lyricText = await lyricFind(client, trackTitle, trackArtist);

        if (!lyricText) {
            embed.setDescription(t(client, guildId, "music.lyric.notFound"));
            return interaction.editReply({ embeds: [embed] });
        }

        embed
            .setAuthor({
                name: t(client, guildId, "music.lyric.author", { bot: client.user.username }),
                iconURL: client.user.displayAvatarURL(),
            })
            .setThumbnail(track.artworkUrl)
            .setDescription(lyricText.substring(0, 4096));

        if (lyricText.length <= 4096) {
            return interaction.editReply({ embeds: [embed] });
        }

        const lyricUrl = gsearch.craft({ query: `${trackTitle} ${trackArtist} lyrics` }).url;
        const lyricButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setURL(lyricUrl.replace("http:", "https:"))
                .setLabel(t(client, guildId, "music.lyric.fullButton"))
                .setStyle(ButtonStyle.Link),
        );

        return interaction.editReply({ embeds: [embed], components: [lyricButton] });
    },
};

async function lyricFind(client, title, author) {
    const response = await find({
        song: title,
        artist: author,
        geniusApiKey: client.config.geniusApiKey,
        engine: "youtube",
        forceSearch: true,
    });

    return response.lyrics;
}

function formatText(text) {
    return text
        .replace(/\(.*?\)/gi, "")
        .replace(/\s/g, "-")
        .replace(/['",]/g, "")
        .replace(/ - Topic$/, "")
        .toLowerCase();
}

