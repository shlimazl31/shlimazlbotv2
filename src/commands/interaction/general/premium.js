const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const {
    getPlanLabel,
    getPlanPrice,
    getUserPremium,
} = require("../../../functions/premium.js");

const DASHBOARD_PREMIUM_URL = "https://dashboard.yakupsemihbulut.com/pricing";

module.exports = {
    name: "premium",
    description: "Premium durumunu görüntüle ve yönet",
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
    requiredPlan: "free",
    devOnly: false,
    run: async (client, interaction) => {
        const premium = getUserPremium(client, interaction.user.id);
        const plan = getPlanLabel(premium.plan);
        const price = getPlanPrice(premium.plan);
        const embed = createStatusEmbed(client, {
            tone: premium.active ? "success" : "info",
            title: "Premium",
            guildId: interaction.guildId,
            description: [
                `Mevcut planın: **${premium.active ? plan : "Free"}**`,
                premium.active ? `Durum: **Aktif**` : "Durum: **Premium aktif değil**",
                premium.active ? `Bitiş: **${formatPremiumEnd(premium)}**` : "Premium hesabına bağlı çalışır ve botun bulunduğu sunucularda otomatik aktif olur.",
                price ? `Plan fiyatı: **₺${price} / ay**` : null,
            ].filter(Boolean).join("\n"),
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(premium.active ? "Premium'u Yönet" : "Premium'a Geç")
                .setStyle(ButtonStyle.Link)
                .setURL(DASHBOARD_PREMIUM_URL),
        );

        return interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    },
};

function formatPremiumEnd(premium) {
    if (premium.isLifetime || !premium.expiresAt) return "Süresiz";

    return new Date(premium.expiresAt).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
