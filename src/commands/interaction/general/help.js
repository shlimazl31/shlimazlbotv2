const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { readdirSync } = require("fs");

module.exports = {
    name: "help",
    description: "Komut listesini göster",
    category: "general",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const categories = readdirSync("./src/commands/interaction/");

        const categoryPromises = categories.map(async (category) => {
            const commands = client.slash.filter((c) => c.category === category);

            if (commands.size === 0) return null;

            const slashCommandData = await Promise.all(
                commands.map(async (c) => {
                    return `\`${c.name}\``;
                }),
            );

            const categoryNames = { general: "Genel", music: "Müzik", setting: "Ayarlar", film: "Film" };
            const categoryName = categoryNames[category] || null;

            return embed.addFields({ name: `\`❯\`  ${toOppositeCase(categoryName)}`, value: `${slashCommandData.join(", ")}` });
        });

        const results = await Promise.all(categoryPromises);
        results.filter(result => result !== null);

        embed
            .setAuthor({ name: `${client.user.username} Yardım`, iconURL: client.user.displayAvatarURL() })
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription(
                `Merhaba **${interaction.member}**, ben **${client.user}**. Yüksek Kaliteli bir Discord Müzik Botuyum. Spotify, SoundCloud, Apple Music ve diğer platformları destekliyorum. Aşağıdaki komutları kullanarak neler yapabileceğimi öğrenebilirsin:`,
            )
            .setFooter({
                text: `© ${client.user.username} | Toplam Komut: ${client.slash.size}`,
                iconURL: client.user.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel("Destek Sunucusu").setURL(client.config.supportServerUrl).setStyle(ButtonStyle.Link),
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    },
};

function toOppositeCase(char) {
    if (!char) return "Diğer";
    return char.charAt(0).toUpperCase() + char.slice(1).toLowerCase();
}
