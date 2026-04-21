const { EmbedBuilder } = require("discord.js");
const { getGuildThemeColor } = require("./guildSettings.js");
const { getBotVersion } = require("./getBotVersion.js");
const { t } = require("./t.js");

const TONES = {
    success: { prefix: "Tamam", accent: "Islem basarili", color: 0x2ecc71 },
    error: { prefix: "Hata", accent: "Mudahale gerekiyor", color: 0xe74c3c },
    warning: { prefix: "Uyari", accent: "Kontrol et", color: 0xf39c12 },
    info: { prefix: "Bilgi", accent: "Güncel durum", color: 0x4f7cff },
    media: { prefix: "Now Playing", accent: "Canli oturum", color: 0x5865f2 },
};

function createBaseEmbed(client, options = {}) {
    const embed = new EmbedBuilder().setColor(options.color || getGuildThemeColor(client, options.guildId, client.config.embedColor));

    if (options.author) embed.setAuthor(options.author);
    if (options.title) embed.setTitle(options.title);
    if (options.url) embed.setURL(options.url);
    if (options.description) embed.setDescription(options.description);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    if (options.fields?.length) embed.addFields(options.fields);
    if (options.footer) embed.setFooter(options.footer);
    if (options.timestamp !== false) embed.setTimestamp();

    return embed;
}

function createStatusEmbed(client, options = {}) {
    const tone = TONES[options.tone] || TONES.info;
    const title = options.title || tone.prefix;
    const description = options.description || "";
    const eyebrow = options.eyebrow || tone.accent;

    return createBaseEmbed(client, {
        color: options.color || getGuildThemeColor(client, options.guildId, tone.color),
        guildId: options.guildId,
        author: options.author || {
            name: `${title} | ${eyebrow}`,
            iconURL: client.user.displayAvatarURL(),
        },
        title: options.embedTitle,
        url: options.url,
        description,
        fields: options.fields,
        footer:
            options.footer || {
                text: `${t(client, options.guildId, "common.commandResponse", { bot: client.user.username })} | v${getBotVersion()}`,
                iconURL: client.user.displayAvatarURL(),
            },
        thumbnail: options.thumbnail,
        image: options.image,
        timestamp: options.timestamp,
    });
}

module.exports = {
    TONES,
    createBaseEmbed,
    createStatusEmbed,
};

