const PLAN_TYPES = {
    FREE: "free",
    PLUS: "plus",
    PRO: "pro",
};

const SUBSCRIPTION_STATUS = {
    ACTIVE: "active",
    EXPIRED: "expired",
    CANCELED: "canceled",
};

const BILLING_TYPES = {
    MONTHLY: "monthly",
    LIFETIME: "lifetime",
};

const PREMIUM_FEATURES = {
    RICH_PLAYER: "rich_player",
    DYNAMIC_ARTWORK_COLOR: "dynamic_artwork_color",
    MINI_PLAYER: "mini_player",
    WEB_DASHBOARD: "web_dashboard",
    ANALYTICS: "analytics",
    SAVED_PLAYLISTS: "saved_playlists",
    ADVANCED_QUEUE: "advanced_queue",
    AUDIO_FILTERS: "audio_filters",
    AUTOPLAY: "autoplay",
    MODE_247: "247_mode",
    PRIORITY_NODE: "priority_node",
    PRO_BADGE: "pro_badge",
    DASHBOARD_ADVANCED_CONTROLS: "dashboard_advanced_controls",
};

const FEATURE_LABELS = {
    [PREMIUM_FEATURES.RICH_PLAYER]: "Detaylı Oynatma Kartı",
    [PREMIUM_FEATURES.DYNAMIC_ARTWORK_COLOR]: "Kapak Rengine Göre Tema",
    [PREMIUM_FEATURES.MINI_PLAYER]: "Sabit Müzik Paneli",
    [PREMIUM_FEATURES.WEB_DASHBOARD]: "Web Dashboard",
    [PREMIUM_FEATURES.ANALYTICS]: "Sunucu Analitikleri",
    [PREMIUM_FEATURES.SAVED_PLAYLISTS]: "Kayıtlı Çalma Listeleri",
    [PREMIUM_FEATURES.ADVANCED_QUEUE]: "Gelişmiş Kuyruk",
    [PREMIUM_FEATURES.AUDIO_FILTERS]: "Ses Filtreleri",
    [PREMIUM_FEATURES.AUTOPLAY]: "Otomatik Oynatma",
    [PREMIUM_FEATURES.MODE_247]: "24/7 Modu",
    [PREMIUM_FEATURES.PRIORITY_NODE]: "Öncelikli Node",
    [PREMIUM_FEATURES.PRO_BADGE]: "Premium Rozeti",
    [PREMIUM_FEATURES.DASHBOARD_ADVANCED_CONTROLS]: "Gelişmiş Dashboard Kontrolleri",
};

const BASIC_FILTERS = ["bass", "nightcore", "slow", "soft", "vaporwave"];
const PRO_FILTERS = ["eightD", "chimpunk", "earrape", "electronic", "karaoke", "pitch", "tremolo", "treblebass", "vibrato"];

const PLAN_CONFIG = {
    [PLAN_TYPES.FREE]: {
        name: "Free",
        price: Number(process.env.PREMIUM_FREE_PRICE || 0),
        rank: 0,
        limits: {
            queue: Number(process.env.PREMIUM_FREE_QUEUE_LIMIT || 50),
            playlistTracks: Number(process.env.PREMIUM_FREE_PLAYLIST_LIMIT || 25),
            songsPerRequest: Number(process.env.PREMIUM_FREE_SONG_LIMIT || 1),
            cooldownMs: Number(process.env.PREMIUM_FREE_COOLDOWN_MS || 5000),
        },
        filters: [],
        features: [],
    },
    [PLAN_TYPES.PLUS]: {
        name: "Plus",
        price: Number(process.env.PREMIUM_PLUS_PRICE || 59),
        rank: 1,
        limits: {
            queue: Number(process.env.PREMIUM_PLUS_QUEUE_LIMIT || 150),
            playlistTracks: Number(process.env.PREMIUM_PLUS_PLAYLIST_LIMIT || 100),
            songsPerRequest: Number(process.env.PREMIUM_PLUS_SONG_LIMIT || 5),
            cooldownMs: Number(process.env.PREMIUM_PLUS_COOLDOWN_MS || 2500),
        },
        filters: BASIC_FILTERS,
        features: [
            PREMIUM_FEATURES.RICH_PLAYER,
            PREMIUM_FEATURES.DYNAMIC_ARTWORK_COLOR,
            PREMIUM_FEATURES.MINI_PLAYER,
            PREMIUM_FEATURES.WEB_DASHBOARD,
            PREMIUM_FEATURES.AUDIO_FILTERS,
            PREMIUM_FEATURES.AUTOPLAY,
        ],
    },
    [PLAN_TYPES.PRO]: {
        name: "Pro",
        price: Number(process.env.PREMIUM_PRO_PRICE || 99),
        rank: 2,
        limits: {
            queue: Number(process.env.PREMIUM_PRO_QUEUE_LIMIT || 500),
            playlistTracks: Number(process.env.PREMIUM_PRO_PLAYLIST_LIMIT || 300),
            songsPerRequest: Number(process.env.PREMIUM_PRO_SONG_LIMIT || 20),
            cooldownMs: Number(process.env.PREMIUM_PRO_COOLDOWN_MS || 1000),
        },
        filters: [...BASIC_FILTERS, ...PRO_FILTERS],
        features: Object.values(PREMIUM_FEATURES),
    },
};

const COMMAND_PLAN_REQUIREMENTS = {
    play: PLAN_TYPES.FREE,
    pause: PLAN_TYPES.FREE,
    resume: PLAN_TYPES.FREE,
    skip: PLAN_TYPES.FREE,
    stop: PLAN_TYPES.FREE,
    queue: PLAN_TYPES.FREE,
    nowplaying: PLAN_TYPES.FREE,
    volume: PLAN_TYPES.PLUS,
    loop: PLAN_TYPES.PLUS,
    shuffle: PLAN_TYPES.PLUS,
    autoplay: PLAN_TYPES.PLUS,
    seek: PLAN_TYPES.PLUS,
    filter: PLAN_TYPES.PLUS,
    filters: PLAN_TYPES.PLUS,
    dj: PLAN_TYPES.PRO,
    "247": PLAN_TYPES.PRO,
    clear: PLAN_TYPES.PRO,
    remove: PLAN_TYPES.PRO,
    previous: PLAN_TYPES.PRO,
};

const PLAN_FEATURES = {
    free: PLAN_CONFIG.free.features,
    trial: PLAN_CONFIG.plus.features,
    plus: PLAN_CONFIG.plus.features,
    pro: PLAN_CONFIG.pro.features,
    lifetime: PLAN_CONFIG.pro.features,
};

const DEFAULT_PREMIUM = {
    active: false,
    plan: PLAN_TYPES.FREE,
    planType: PLAN_TYPES.FREE.toUpperCase(),
    status: SUBSCRIPTION_STATUS.CANCELED,
    startedAt: null,
    expiresAt: null,
    billingType: BILLING_TYPES.MONTHLY,
    isLifetime: false,
    features: [],
    source: null,
    grantedBy: null,
    grantedAt: null,
    revokedBy: null,
    revokedAt: null,
    trial: {
        claimedBy: null,
        claimedAt: null,
        onboardingVersion: null,
    },
};

function normalizePlan(plan = PLAN_TYPES.PLUS) {
    const normalized = String(plan || PLAN_TYPES.PLUS).toLowerCase();
    if (normalized === "trial") return PLAN_TYPES.PLUS;
    if (normalized === "lifetime") return PLAN_TYPES.PRO;
    return PLAN_CONFIG[normalized] ? normalized : PLAN_TYPES.PLUS;
}

function normalizeStatus(status, active) {
    const normalized = String(status || "").toLowerCase();
    if (Object.values(SUBSCRIPTION_STATUS).includes(normalized)) return normalized;
    return active ? SUBSCRIPTION_STATUS.ACTIVE : SUBSCRIPTION_STATUS.CANCELED;
}

function normalizeBillingType(billingType, isLifetime) {
    const normalized = String(billingType || "").toLowerCase();
    if (Object.values(BILLING_TYPES).includes(normalized)) return normalized;
    return isLifetime ? BILLING_TYPES.LIFETIME : BILLING_TYPES.MONTHLY;
}

function normalizeFeature(feature) {
    const normalized = String(feature || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/-/g, "_");

    const aliases = {
        all: "all",
        rich: PREMIUM_FEATURES.RICH_PLAYER,
        detailed: PREMIUM_FEATURES.RICH_PLAYER,
        dynamic: PREMIUM_FEATURES.DYNAMIC_ARTWORK_COLOR,
        color: PREMIUM_FEATURES.DYNAMIC_ARTWORK_COLOR,
        mini: PREMIUM_FEATURES.MINI_PLAYER,
        miniplayer: PREMIUM_FEATURES.MINI_PLAYER,
        dashboard: PREMIUM_FEATURES.WEB_DASHBOARD,
        stats: PREMIUM_FEATURES.ANALYTICS,
        filter: PREMIUM_FEATURES.AUDIO_FILTERS,
        filters: PREMIUM_FEATURES.AUDIO_FILTERS,
        autoplay: PREMIUM_FEATURES.AUTOPLAY,
        "247": PREMIUM_FEATURES.MODE_247,
        node: PREMIUM_FEATURES.PRIORITY_NODE,
        badge: PREMIUM_FEATURES.PRO_BADGE,
        pro_badge: PREMIUM_FEATURES.PRO_BADGE,
        dashboard_controls: PREMIUM_FEATURES.DASHBOARD_ADVANCED_CONTROLS,
    };

    return aliases[normalized] || normalized;
}

function ensureGuildPremium(guildData = {}) {
    const premium = {
        ...DEFAULT_PREMIUM,
        ...(guildData.premium || {}),
    };
    const expiresAt = premium.expiresAt ? new Date(premium.expiresAt) : null;
    const isExpired = Boolean(expiresAt && expiresAt.getTime() <= Date.now());
    const isLifetime = Boolean(
        premium.isLifetime ||
        String(premium.plan || "").toLowerCase() === "lifetime" ||
        String(premium.billingType || "").toLowerCase() === BILLING_TYPES.LIFETIME,
    );

    premium.plan = isExpired && !isLifetime ? PLAN_TYPES.FREE : normalizePlan(premium.planType || premium.plan);
    premium.planType = premium.plan.toUpperCase();
    premium.expiresAt = expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null;
    premium.active = isLifetime ? Boolean(premium.active) : Boolean(premium.active && !isExpired);
    premium.status = premium.active ? SUBSCRIPTION_STATUS.ACTIVE : normalizeStatus(premium.status, false);
    if (isExpired && !isLifetime) premium.status = SUBSCRIPTION_STATUS.EXPIRED;
    premium.startedAt = premium.startedAt ? new Date(premium.startedAt) : premium.grantedAt || null;
    premium.billingType = normalizeBillingType(premium.billingType, isLifetime);
    premium.isLifetime = isLifetime || premium.billingType === BILLING_TYPES.LIFETIME;
    premium.features = Array.isArray(premium.features) ? premium.features.map(normalizeFeature).filter(Boolean) : [];
    premium.trial = {
        ...DEFAULT_PREMIUM.trial,
        ...(premium.trial || {}),
    };

    if (!premium.active) {
        premium.plan = PLAN_TYPES.FREE;
        premium.planType = PLAN_TYPES.FREE.toUpperCase();
        premium.features = [];
    }

    guildData.premium = premium;
    return premium;
}

function getGuildPremium(client, guildId) {
    const guildData = client.data.get(`guildData_${guildId}`) || { id: guildId };
    const premium = ensureGuildPremium(guildData);

    client.data.set(`guildData_${guildId}`, guildData);
    return premium;
}

function getUserPremium(client, userId) {
    if (!userId) return ensurePremiumObject();

    const userData = client.data.get(`userData_${userId}`) || { id: userId };
    const premium = ensurePremiumObject(userData.premium || {});

    userData.premium = premium;
    client.data.set(`userData_${userId}`, userData);
    return premium;
}

function getPremiumFeatures(premium) {
    const ensuredPremium = ensurePremiumObject(premium);
    if (!ensuredPremium.active) return [];

    const planFeatures = PLAN_CONFIG[ensuredPremium.plan]?.features || [];
    const extraFeatures = ensuredPremium.features.includes("all") ? Object.values(PREMIUM_FEATURES) : ensuredPremium.features;

    return Array.from(new Set([...planFeatures, ...extraFeatures]));
}

function getUserPlan(client, userId) {
    return getUserPremium(client, userId).plan || PLAN_TYPES.FREE;
}

function getGuildPlan(client, guildId) {
    return getGuildPremium(client, guildId).plan || PLAN_TYPES.FREE;
}

function getPlanRank(plan) {
    return PLAN_CONFIG[normalizePlan(plan)]?.rank ?? 0;
}

function getEffectivePlan(client, guildId, userId) {
    const userPlan = userId ? getUserPlan(client, userId) : PLAN_TYPES.FREE;
    const guildPlan = guildId ? getGuildPlan(client, guildId) : PLAN_TYPES.FREE;

    return getPlanRank(userPlan) >= getPlanRank(guildPlan) ? userPlan : guildPlan;
}

function hasRequiredPlan(client, guildId, userId, requiredPlan = PLAN_TYPES.FREE) {
    return getPlanRank(getEffectivePlan(client, guildId, userId)) >= getPlanRank(requiredPlan);
}

function getPlanLimits(plan = PLAN_TYPES.FREE) {
    return PLAN_CONFIG[normalizePlan(plan)]?.limits || PLAN_CONFIG.free.limits;
}

function getCommandRequiredPlan(command) {
    const explicitPlan = command?.requiredPlan || command?.premiumPlan;
    if (explicitPlan) return normalizePlan(explicitPlan);

    return COMMAND_PLAN_REQUIREMENTS[String(command?.name || "").toLowerCase()] || PLAN_TYPES.FREE;
}

function attachCommandPlan(command) {
    if (!command || !command.name) return command;
    command.requiredPlan = getCommandRequiredPlan(command);
    return command;
}

function getPlanLabel(plan) {
    return PLAN_CONFIG[normalizePlan(plan)]?.name || PLAN_CONFIG.free.name;
}

function getPlanPrice(plan) {
    return PLAN_CONFIG[normalizePlan(plan)]?.price || 0;
}

function canUseFilter(plan, mode) {
    if (mode === "clear") return true;
    return PLAN_CONFIG[normalizePlan(plan)]?.filters.includes(mode) || false;
}

function getFilterRequiredPlan(mode) {
    if (mode === "clear") return PLAN_TYPES.FREE;
    if (BASIC_FILTERS.includes(mode)) return PLAN_TYPES.PLUS;
    return PLAN_TYPES.PRO;
}

function hasPremiumFeature(client, guildId, feature, userId) {
    const normalizedFeature = normalizeFeature(feature);

    if (userId) {
        const userPremium = getUserPremium(client, userId);
        if (getPremiumFeatures(userPremium).includes(normalizedFeature)) return true;
    }

    const legacyGuildPremium = getGuildPremium(client, guildId);
    return getPremiumFeatures(legacyGuildPremium).includes(normalizedFeature);
}

function isGuildPremium(client, guildId) {
    return getGuildPremium(client, guildId).active;
}

function isUserPremium(client, userId) {
    return getUserPremium(client, userId).active;
}

async function persistPremium(client, guildId, premiumPatch) {
    const guildData = client.data.get(`guildData_${guildId}`) || { id: guildId };
    const currentPremium = ensureGuildPremium(guildData);

    guildData.premium = ensurePremiumObject({
        ...currentPremium,
        ...premiumPatch,
    });

    client.data.set(`guildData_${guildId}`, guildData);
    await client.guildData.findOneAndUpdate(
        { id: guildId },
        { $set: { premium: guildData.premium }, $setOnInsert: { id: guildId } },
        { upsert: true, new: true },
    );

    return guildData.premium;
}

async function persistUserPremium(client, userId, premiumPatch) {
    const userData = client.data.get(`userData_${userId}`) || { id: userId };
    const currentPremium = ensurePremiumObject(userData.premium || {});

    userData.premium = ensurePremiumObject({
        ...currentPremium,
        ...premiumPatch,
    });

    client.data.set(`userData_${userId}`, userData);
    await client.userData.findOneAndUpdate(
        { id: userId },
        { $set: { premium: userData.premium }, $setOnInsert: { id: userId, ban: { status: false, reason: null } } },
        { upsert: true, new: true },
    );

    return userData.premium;
}

function ensurePremiumObject(premium = {}) {
    const guildData = { premium };
    return ensureGuildPremium(guildData);
}

function formatPremiumUntil(premium) {
    const ensuredPremium = ensurePremiumObject(premium);
    if (!ensuredPremium.active) return "pasif";
    if (ensuredPremium.isLifetime || !ensuredPremium.expiresAt) return "süresiz";

    return ensuredPremium.expiresAt.toISOString().slice(0, 10);
}

function getFeatureLabel(feature) {
    return FEATURE_LABELS[normalizeFeature(feature)] || feature;
}

module.exports = {
    BASIC_FILTERS,
    BILLING_TYPES,
    COMMAND_PLAN_REQUIREMENTS,
    FEATURE_LABELS,
    PLAN_CONFIG,
    PLAN_FEATURES,
    PLAN_TYPES,
    PREMIUM_FEATURES,
    PRO_FILTERS,
    SUBSCRIPTION_STATUS,
    attachCommandPlan,
    canUseFilter,
    ensureGuildPremium,
    formatPremiumUntil,
    getCommandRequiredPlan,
    getEffectivePlan,
    getFeatureLabel,
    getFilterRequiredPlan,
    getGuildPlan,
    getGuildPremium,
    getPlanLabel,
    getPlanLimits,
    getPlanPrice,
    getPremiumFeatures,
    getUserPlan,
    getUserPremium,
    hasPremiumFeature,
    hasRequiredPlan,
    isGuildPremium,
    isUserPremium,
    normalizeFeature,
    normalizePlan,
    persistPremium,
    persistUserPremium,
};
