const { EmbedBuilder } = require("discord.js");
const {
    FEATURE_LABELS,
    BILLING_TYPES,
    PLAN_FEATURES,
    SUBSCRIPTION_STATUS,
    formatPremiumUntil,
    getFeatureLabel,
    getPremiumFeatures,
    getUserPremium,
    normalizeFeature,
    normalizePlan,
    persistUserPremium,
} = require("../../../functions/premium.js");
const { getBotVersion } = require("../../../functions/getBotVersion.js");

module.exports = {
    name: "premium",
    aliases: ["prem", "premiumctl"],
    description: "Kullanıcı premium yönetimi",
    category: "dev",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    devOnly: true,
    run: async (client, message, player, args) => {
        const action = (args[0] || "help").toLowerCase();

        if (["help", "yardım", "yardim", "?"].includes(action)) {
            return message.reply({ embeds: [createHelpEmbed(client)] });
        }

        if (action === "features") {
            return message.reply({ embeds: [createFeaturesEmbed(client)] });
        }

        if (action === "status") {
            const userId = resolveUserId(args[1], message);
            const premium = await getUserPremiumData(client, userId);

            return message.reply({ embeds: [createStatusEmbed(client, userId, premium)] });
        }

        if (action === "list") {
            const docs = await client.userData.find({ "premium.active": true }).lean().limit(30);
            const activePremiums = docs
                .map((doc) => {
                    client.data.set(`userData_${doc.id}`, doc);
                    return { userId: doc.id, username: doc.dashboard?.globalName || doc.dashboard?.username || "Unknown user", premium: getUserPremium(client, doc.id) };
                })
                .filter((entry) => entry.premium.active);

            return message.reply({ embeds: [createListEmbed(client, activePremiums)] });
        }

        if (action === "grant") {
            const userId = resolveUserId(args[1], message);
            const plan = normalizePlan(args[2] || "plus");
            const expiresAt = parseExpiry(args[3]);
            const isLifetime = !expiresAt;
            const features = parseFeatures(args.slice(4).join(" "));
            const premium = await persistUserPremium(client, userId, {
                active: true,
                plan,
                planType: plan.toUpperCase(),
                status: SUBSCRIPTION_STATUS.ACTIVE,
                startedAt: new Date(),
                expiresAt,
                billingType: isLifetime ? BILLING_TYPES.LIFETIME : BILLING_TYPES.MONTHLY,
                isLifetime,
                features,
                grantedBy: message.author.id,
                grantedAt: new Date(),
                revokedBy: null,
                revokedAt: null,
            });

            return message.reply({ embeds: [createStatusEmbed(client, userId, premium, "Premium verildi.")] });
        }

        if (action === "revoke") {
            const userId = resolveUserId(args[1], message);
            const premium = await persistUserPremium(client, userId, {
                active: false,
                plan: "free",
                planType: "FREE",
                status: SUBSCRIPTION_STATUS.CANCELED,
                expiresAt: null,
                billingType: BILLING_TYPES.MONTHLY,
                isLifetime: false,
                features: [],
                revokedBy: message.author.id,
                revokedAt: new Date(),
            });

            return message.reply({ embeds: [createStatusEmbed(client, userId, premium, "Premium kaldırıldı.")] });
        }

        return message.reply({ embeds: [createHelpEmbed(client)] });
    },
};

function createHelpEmbed(client) {
    return baseEmbed(client, "Premium Control")
        .setDescription("Owner-only kullanıcı premium yönetimi. Premium artık hesaba bağlı çalışır.")
        .addFields(
            {
                name: "Komutlar",
                value: [
                    "`!premium status [userId|@user|me]` - premium durumunu gösterir",
                    "`!premium grant <userId|@user|me> [plus|pro|lifetime] [gün sayısı|lifetime] [feature,feature]` - kullanıcıya premium verir",
                    "`!premium revoke <userId|@user|me>` - premiumu kapatır",
                    "`!premium list` - aktif premium kullanıcıları listeler",
                    "`!premium features` - premium özellik anahtarlarını gösterir",
                ].join("\n"),
                inline: false,
            },
            {
                name: "Örnekler",
                value: [
                    "`!premium grant me plus 30`",
                    "`!premium grant @Shlimazl pro lifetime`",
                    "`!premium grant 106764157105233920 plus 365 mini,dynamic,rich`",
                ].join("\n"),
                inline: false,
            },
        );
}

function createFeaturesEmbed(client) {
    return baseEmbed(client, "Premium Özellikleri")
        .setDescription("Planlar ve özellik anahtarları.")
        .addFields(
            {
                name: "Planlar",
                value: Object.entries(PLAN_FEATURES)
                    .map(([plan, features]) => `\`${plan}\` - ${features.length ? features.map(getFeatureLabel).join(", ") : "Ücretsiz"}`)
                    .join("\n")
                    .slice(0, 1024),
                inline: false,
            },
            {
                name: "Özellik Anahtarları",
                value: Object.entries(FEATURE_LABELS)
                    .map(([key, label]) => `\`${key}\` - ${label}`)
                    .join("\n")
                    .slice(0, 1024),
                inline: false,
            },
        );
}

function createStatusEmbed(client, userId, premium, prefix = "Premium durumu.") {
    const user = client.users.cache.get(userId);
    const features = getPremiumFeatures(premium);

    return baseEmbed(client, `Premium | ${user ? user.username : userId}`)
        .setDescription(prefix)
        .addFields(
            { name: "Kullanıcı", value: user ? `${user.username}\n\`${userId}\`` : `\`${userId}\``, inline: false },
            { name: "Durum", value: premium.active ? "`Aktif`" : "`Kapalı`", inline: true },
            { name: "Plan", value: `\`${premium.plan}\``, inline: true },
            { name: "Bitiş", value: `\`${formatPremiumUntil(premium)}\``, inline: true },
            {
                name: "Özellikler",
                value: features.length ? features.map((feature) => `\`${feature}\` ${getFeatureLabel(feature)}`).join("\n").slice(0, 1024) : "`Yok`",
                inline: false,
            },
        );
}

function createListEmbed(client, activePremiums) {
    const embed = baseEmbed(client, "Premium | Aktif Kullanıcılar")
        .setDescription(activePremiums.length ? `Toplam \`${activePremiums.length}\` aktif premium kullanıcı.` : "Aktif premium kullanıcı yok.");

    for (const entry of activePremiums.slice(0, 20)) {
        const user = client.users.cache.get(entry.userId);
        embed.addFields({
            name: user?.username || entry.username || entry.userId,
            value: [`ID: \`${entry.userId}\``, `Plan: \`${entry.premium.plan}\``, `Bitiş: \`${formatPremiumUntil(entry.premium)}\``].join("\n"),
            inline: true,
        });
    }

    return embed;
}

function baseEmbed(client, title) {
    return new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setAuthor({ name: title, iconURL: client.user.displayAvatarURL() })
        .setFooter({ text: `Premium control | v${getBotVersion()}`, iconURL: client.user.displayAvatarURL() })
        .setTimestamp();
}

async function getUserPremiumData(client, userId) {
    const cached = client.data.get(`userData_${userId}`);
    if (cached) return getUserPremium(client, userId);

    const doc = await client.userData.findOne({ id: userId }).lean();
    if (doc) client.data.set(`userData_${userId}`, doc);

    return getUserPremium(client, userId);
}

function resolveUserId(value, message) {
    if (!value || ["me", "ben", "self"].includes(value.toLowerCase())) return message.author.id;
    return value.replace(/\D/g, "") || message.author.id;
}

function parseExpiry(value) {
    if (!value || ["lifetime", "forever", "kalici", "sonsuz"].includes(value.toLowerCase())) return null;

    const days = Number(value);
    if (!Number.isFinite(days) || days <= 0) return new Date(Date.now() + 30 * 86400000);

    return new Date(Date.now() + days * 86400000);
}

function parseFeatures(value) {
    if (!value) return [];

    return value
        .split(/[,\s]+/)
        .map(normalizeFeature)
        .filter(Boolean);
}



