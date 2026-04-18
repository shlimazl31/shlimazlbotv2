const { readdirSync } = require("fs");
const createSupportComponents = require("../../../functions/createSupportComponents.js");
const { createBaseEmbed } = require("../../../functions/createResponseEmbed.js");

module.exports = {
    name: "help",
    description: "Komut listesini goster",
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
    run: async (client, interaction) => {
        const categories = readdirSync("./src/commands/interaction/");
        const quickStart = ["`/play` ile sarki baslat", "`/queue` ile sirayi gor", "`/help` ile kategorileri gez"];
        const embed = createBaseEmbed(client, {
            color: 0x5865f2,
            author: {
                name: `${client.user.username} | Komut Merkezi`,
                iconURL: client.user.displayAvatarURL(),
            },
            thumbnail: client.user.displayAvatarURL(),
            description: [
                `Hos geldin **${interaction.member}**.`,
                "Komutlari daha hizli bulman icin kategorileri tek kartta topladim.",
                "",
                "**Hizli Baslangic**",
                quickStart.join("  |  "),
            ].join("\n"),
            fields: [
                {
                    name: "Bot Ozet",
                    value: `\`${client.slash.size}\` slash komutu  |  \`${categories.length}\` kategori  |  Muzik odakli hizli akis`,
                    inline: false,
                },
            ],
            footer: {
                text: `Toplam komut: ${client.slash.size}`,
                iconURL: client.user.displayAvatarURL({ dynamic: true }),
            },
        });

        for (const category of categories) {
            const commands = client.slash.filter((command) => command.category === category);
            if (commands.size === 0) continue;

            const categoryNames = { general: "Genel", music: "Muzik", setting: "Ayarlar", film: "Film" };
            const title = categoryNames[category] || "Diger";
            const value = commands
                .map((command) => `\`/${command.name}\``)
                .join("  |  ");

            embed.addFields({ name: title, value });
        }

        const components = createSupportComponents(client.config.supportServerUrl, "Destek Sunucusu");

        return interaction.reply({ embeds: [embed], components });
    },
};
