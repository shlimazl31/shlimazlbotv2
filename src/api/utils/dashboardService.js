const TRIAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ONBOARDING_VERSION = "trial-v1";
const PLAN_FEATURES = {
    trial: ["rich_player", "dynamic_artwork_color", "mini_player", "web_dashboard"],
    plus: ["rich_player", "dynamic_artwork_color", "mini_player", "web_dashboard"],
    pro: [
        "rich_player",
        "dynamic_artwork_color",
        "mini_player",
        "web_dashboard",
        "analytics",
        "saved_playlists",
        "advanced_queue",
        "audio_filters",
        "autoplay",
        "247_mode",
        "priority_node",
    ],
    lifetime: [
        "rich_player",
        "dynamic_artwork_color",
        "mini_player",
        "web_dashboard",
        "analytics",
        "saved_playlists",
        "advanced_queue",
        "audio_filters",
        "autoplay",
        "247_mode",
        "priority_node",
    ],
};

const DASHBOARD_FEATURES = [
    {
        key: "music_player",
        title: "Müzik Oynatıcı",
        tier: "Ücretsiz",
        description: "YouTube, SoundCloud ve arama tabanlı müzik oynatma komutları.",
    },
    {
        key: "queue_controls",
        title: "Kuyruk ve Kontroller",
        tier: "Ücretsiz",
        description: "Sırayı görüntüleme, atlama, duraklatma, devam ettirme ve ses kontrolü.",
    },
    {
        key: "server_settings",
        title: "Sunucu Ayarları",
        tier: "Ücretsiz",
        description: "Dil, tema rengi, müzik kanalı ve izinli rol ayarları.",
    },
    {
        key: "rich_player",
        title: "Detaylı Oynatma Kartı",
        tier: "Premium",
        description: "Daha zengin oynatma kartı, oturum özeti ve gelişmiş kuyruk bilgileri.",
    },
    {
        key: "dynamic_artwork_color",
        title: "Kapak Rengine Göre Tema",
        tier: "Premium",
        description: "Oynatma kartının rengini şarkı kapağına göre otomatik tonlar.",
    },
    {
        key: "mini_player",
        title: "Sabit Müzik Paneli",
        tier: "Premium",
        description: "Seçili kanalda tek, sabit ve güncellenen müzik kontrol paneli.",
    },
    {
        key: "audio_filters",
        title: "Ses Filtreleri",
        tier: "Premium",
        description: "Bassboost, nightcore ve benzeri efektlerle oynatmayı kişiselleştirir.",
    },
    {
        key: "247_mode",
        title: "24/7 Modu",
        tier: "Premium",
        description: "Botun ses kanalında kalmasını ve kesintisiz oturum tutmasını sağlar.",
    },
    {
        key: "web_dashboard",
        title: "Web Dashboard",
        tier: "Premium",
        description: "Sunucu ayarlarını ve premium durumunu web üzerinden yönetme.",
    },
];

async function saveDashboardLogin(cluster, user, guilds) {
    return cluster.eval(
        async (client, context) => {
            const now = new Date();
            const existing = await client.userData.findOne({ id: context.user.id }).lean();
            const firstLoginAt = existing?.dashboard?.firstLoginAt || now;

            await client.userData.findOneAndUpdate(
                { id: context.user.id },
                {
                    $set: {
                        id: context.user.id,
                        "dashboard.firstLoginAt": firstLoginAt,
                        "dashboard.lastLoginAt": now,
                        "dashboard.username": context.user.username,
                        "dashboard.globalName": context.user.globalName,
                        "dashboard.avatar": context.user.avatar,
                        "dashboard.guilds": context.guilds.map((guild) => ({
                            ...guild,
                            lastSeenAt: now,
                        })),
                    },
                    $inc: { "dashboard.loginCount": 1 },
                    $setOnInsert: { ban: { status: false, reason: null } },
                },
                { upsert: true, new: true },
            );

            client.data.set(`userData_${context.user.id}`, {
                ...(existing || { id: context.user.id }),
                dashboard: {
                    ...(existing?.dashboard || {}),
                    firstLoginAt,
                    lastLoginAt: now,
                    username: context.user.username,
                    globalName: context.user.globalName,
                    avatar: context.user.avatar,
                    guilds: context.guilds,
                },
            });
        },
        { user, guilds },
        10000,
    );
}

async function getDashboardProfile(cluster, userId) {
    return cluster.eval(
        async (client, context) => {
            const userDoc = await client.userData.findOne({ id: context.userId }).lean();
            const dashboard = userDoc?.dashboard || {};
            const guilds = (dashboard.guilds || [])
                .filter((guild) => guild.canManage)
                .map((guild) => ({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon,
                    owner: Boolean(guild.owner),
                    canManage: Boolean(guild.canManage),
                    botInGuild: client.guilds.cache.has(guild.id),
                    iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null,
                }));
            const isOwner = client.config.owner === context.userId || client.config.dev.includes(context.userId);
            const userPremium = normalizeUserPremium(userDoc?.premium || {});

            return {
                user: {
                    id: context.userId,
                    username: dashboard.username || "Unknown",
                    globalName: dashboard.globalName || dashboard.username || "Unknown",
                    avatar: dashboard.avatar ? `https://cdn.discordapp.com/avatars/${context.userId}/${dashboard.avatar}.png?size=128` : null,
                },
                isOwner,
                premium: userPremium,
                inviteUrl: `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=277025475648&scope=bot%20applications.commands`,
                trial: {
                    claimed: Boolean(dashboard.trial?.claimed),
                    guildId: dashboard.trial?.guildId || null,
                    claimedAt: dashboard.trial?.claimedAt || null,
                    expiresAt: dashboard.trial?.expiresAt || null,
                },
                features: context.features,
                guilds: guilds.sort((left, right) => Number(right.botInGuild) - Number(left.botInGuild) || left.name.localeCompare(right.name, "tr")),
            };

            function normalizeUserPremium(rawPremium = {}) {
                const expiresAt = rawPremium.expiresAt ? new Date(rawPremium.expiresAt) : null;
                const active = Boolean(rawPremium.active && (!expiresAt || expiresAt.getTime() > Date.now()));
                const plan = active ? rawPremium.plan || "plus" : rawPremium.plan || "free";

                return {
                    active,
                    plan,
                    expiresAt: expiresAt ? expiresAt.toISOString() : null,
                    features: active ? getPremiumFeatures(rawPremium, plan) : [],
                    source: rawPremium.source || null,
                    grantedAt: rawPremium.grantedAt || null,
                    revokedAt: rawPremium.revokedAt || null,
                    payment: rawPremium.payment || null,
                };
            }

            function getPremiumFeatures(premium = {}, plan = premium.plan) {
                const planFeatures = context.planFeatures[plan] || [];
                const extraFeatures = Array.isArray(premium.features) ? premium.features : [];
                const normalizedExtra = extraFeatures.includes("all") ? Object.values(context.planFeatures).flat() : extraFeatures;

                return Array.from(new Set([...planFeatures, ...normalizedExtra]));
            }
        },
        { userId, features: DASHBOARD_FEATURES, planFeatures: PLAN_FEATURES },
        10000,
    );
}

async function getDashboardGuild(cluster, userId, guildId) {
    return cluster.eval(
        async (client, context) => {
            const userDoc = await client.userData.findOne({ id: context.userId }).lean();
            const access = getDashboardGuildAccess(client, userDoc, context.guildId);
            if (!access.ok) return access;

            const guild = client.guilds.cache.get(context.guildId);
            let doc = await client.guildData.findOne({ id: context.guildId }).lean();
            const accountPremium = normalizePremium(userDoc?.premium || {});
            const premium = guild ? accountPremium : normalizePremium();

            return {
                ok: true,
                guild: {
                    id: context.guildId,
                    name: guild?.name || access.guild?.name || "Unknown guild",
                    icon: guild?.iconURL?.() || null,
                    botInGuild: Boolean(guild),
                    memberCount: guild?.memberCount || null,
                    settings: normalizeSettings(doc?.settings || {}),
                    dj: normalizeDj(doc?.dj || {}),
                    reconnect: normalizeReconnect(doc?.reconnect || {}),
                    channels: getManageableTextChannels(guild),
                    voiceChannels: getManageableVoiceChannels(guild),
                    roles: getManageableRoles(guild),
                    premium,
                    accountPremium,
                },
            };

            function getDashboardGuildAccess(client, userDoc, guildId) {
                const guild = (userDoc?.dashboard?.guilds || []).find((item) => item.id === guildId);
                if (!guild || !guild.canManage) return { ok: false, status: 403, error: "Bu sunucuyu yönetme yetkin yok." };
                if (!client.guilds.cache.has(guildId)) return { ok: false, status: 404, error: "Bot bu sunucuda değil.", guild };
                return { ok: true, guild };
            }

            async function restoreTrialPremiumIfNeeded(client, context, userDoc, guildDoc) {
                const trial = userDoc?.dashboard?.trial;
                const expiresAt = trial?.expiresAt ? new Date(trial.expiresAt) : null;

                if (!trial?.claimed || trial.guildId !== context.guildId) return null;
                if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return null;

                const now = new Date();
                const premium = {
                    active: true,
                    plan: "trial",
                    expiresAt,
                    features: [],
                    source: "dashboard_trial_repair",
                    grantedBy: context.userId,
                    grantedAt: guildDoc?.premium?.grantedAt || trial.claimedAt || now,
                    revokedBy: null,
                    revokedAt: null,
                    trial: {
                        claimedBy: context.userId,
                        claimedAt: trial.claimedAt || now,
                        onboardingVersion: context.onboardingVersion,
                    },
                };

                await client.guildData.findOneAndUpdate(
                    { id: context.guildId },
                    { $set: { premium }, $setOnInsert: { id: context.guildId } },
                    { upsert: true, new: true },
                );

                const guildData = client.data.get(`guildData_${context.guildId}`) || { id: context.guildId };
                guildData.premium = premium;
                client.data.set(`guildData_${context.guildId}`, guildData);

                return premium;
            }

            function normalizeSettings(settings = {}) {
                return {
                    language: settings.language || "tr",
                    playerMode: settings.playerMode || "compact",
                    themeColor: settings.themeColor || null,
                    dynamicArtworkColor: Boolean(settings.dynamicArtworkColor),
                    musicChannelId: settings.musicChannelId || null,
                    allowedRoleIds: Array.isArray(settings.allowedRoleIds) ? settings.allowedRoleIds : [],
                    miniPlayer: {
                        enabled: Boolean(settings.miniPlayer?.enabled),
                        channelId: settings.miniPlayer?.channelId || null,
                    },
                };
            }

            function normalizeDj(dj = {}) {
                return {
                    enabled: Boolean(dj.status),
                    roleId: dj.role || null,
                };
            }

            function normalizeReconnect(reconnect = {}) {
                return {
                    enabled: Boolean(reconnect.status),
                    textChannelId: reconnect.text || null,
                    voiceChannelId: reconnect.voice || null,
                };
            }

            function getManageableTextChannels(guild) {
                if (!guild) return [];

                return guild.channels.cache
                    .filter((channel) => channel && typeof channel.isTextBased === "function" && channel.isTextBased() && !channel.isThread?.())
                    .sort((left, right) => (left.rawPosition || 0) - (right.rawPosition || 0))
                    .map((channel) => ({
                        id: channel.id,
                        name: channel.name,
                        type: channel.type,
                        parentId: channel.parentId || null,
                    }))
                    .slice(0, 100);
            }

            function getManageableVoiceChannels(guild) {
                if (!guild) return [];

                return guild.channels.cache
                    .filter((channel) => channel && [2, 13].includes(channel.type))
                    .sort((left, right) => (left.rawPosition || 0) - (right.rawPosition || 0))
                    .map((channel) => ({
                        id: channel.id,
                        name: channel.name,
                        type: channel.type,
                        parentId: channel.parentId || null,
                    }))
                    .slice(0, 100);
            }

            function getManageableRoles(guild) {
                if (!guild) return [];

                return guild.roles.cache
                    .filter((role) => role && role.id !== guild.id && !role.managed)
                    .sort((left, right) => right.position - left.position)
                    .map((role) => ({
                        id: role.id,
                        name: role.name,
                        color: role.hexColor,
                    }))
                    .slice(0, 100);
            }

            function normalizePremium(rawPremium = {}) {
                const expiresAt = rawPremium.expiresAt ? new Date(rawPremium.expiresAt) : null;
                const active = Boolean(rawPremium.active && (!expiresAt || expiresAt.getTime() > Date.now()));
                return {
                    active,
                    plan: active ? rawPremium.plan || "plus" : "free",
                    expiresAt: expiresAt ? expiresAt.toISOString() : null,
                    features: active ? getPremiumFeatures(rawPremium) : [],
                    source: rawPremium.source || null,
                    trial: rawPremium.trial || null,
                };
            }

            function getPremiumFeatures(premium = {}) {
                if (!premium.active) return [];
                const planFeatures = context.planFeatures[premium.plan] || [];
                const extraFeatures = Array.isArray(premium.features) ? premium.features : [];
                const normalizedExtra = extraFeatures.includes("all") ? Object.values(context.planFeatures).flat() : extraFeatures;

                return Array.from(new Set([...planFeatures, ...normalizedExtra]));
            }
        },
        { userId, guildId, planFeatures: PLAN_FEATURES, onboardingVersion: ONBOARDING_VERSION },
        10000,
    );
}

async function updateDashboardGuildSettings(cluster, userId, guildId, patch) {
    return cluster.eval(
        async (client, context) => {
            const access = await getDashboardGuildAccess(client, context.userId, context.guildId);
            if (!access.ok) return access;

            const doc = await client.guildData.findOne({ id: context.guildId }).lean();
            const userDoc = await client.userData.findOne({ id: context.userId }).lean();
            const settings = normalizeSettings(doc?.settings || {});
            const dj = normalizeDj(doc?.dj || {});
            const reconnect = normalizeReconnect(doc?.reconnect || {});
            const premium = normalizePremium(userDoc?.premium || {});
            const features = getPremiumFeatures(premium, context.planFeatures);

            if (context.patch.playerMode === "rich" && !features.includes("rich_player")) {
                return { ok: false, status: 402, error: "Detaylı kart bu sunucuda premium gerektirir." };
            }

            if (context.patch.dynamicArtworkColor === true && !features.includes("dynamic_artwork_color")) {
                return { ok: false, status: 402, error: "Kapak rengine göre tema bu sunucuda premium gerektirir." };
            }

            if (context.patch.miniPlayerEnabled === true && !features.includes("mini_player")) {
                return { ok: false, status: 402, error: "Mini player bu hesapta premium gerektirir." };
            }

            if (context.patch.reconnectEnabled === true && !features.includes("247_mode")) {
                return { ok: false, status: 402, error: "24/7 modu bu hesapta premium gerektirir." };
            }

            if (Object.prototype.hasOwnProperty.call(context.patch, "musicChannelId")) {
                const channelId = context.patch.musicChannelId;

                if (channelId === null) {
                    settings.musicChannelId = null;
                } else {
                    const channel = client.guilds.cache.get(context.guildId)?.channels.cache.get(channelId);
                    if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased() || channel.isThread?.()) {
                        return { ok: false, status: 400, error: "Geçerli bir metin kanalı seçmelisin." };
                    }

                    settings.musicChannelId = channelId;
                }
            }

            if (Object.prototype.hasOwnProperty.call(context.patch, "djRoleId")) {
                const roleId = context.patch.djRoleId;

                if (roleId === null) {
                    dj.status = false;
                    dj.role = null;
                } else {
                    const guild = client.guilds.cache.get(context.guildId);
                    const role = guild?.roles.cache.get(roleId);
                    if (!role || role.id === guild.id || role.managed) {
                        return { ok: false, status: 400, error: "Geçerli bir DJ rolü seçmelisin." };
                    }

                    dj.status = true;
                    dj.role = roleId;
                }
            }

            if (Object.prototype.hasOwnProperty.call(context.patch, "allowedRoleIds")) {
                const guild = client.guilds.cache.get(context.guildId);
                const roleIds = Array.isArray(context.patch.allowedRoleIds) ? context.patch.allowedRoleIds : [];

                for (const roleId of roleIds) {
                    const role = guild?.roles.cache.get(roleId);
                    if (!role || role.id === guild.id || role.managed) {
                        return { ok: false, status: 400, error: "GeÃ§erli izinli roller seÃ§melisin." };
                    }
                }

                settings.allowedRoleIds = Array.from(new Set(roleIds)).slice(0, 10);
            }

            if (Object.prototype.hasOwnProperty.call(context.patch, "miniPlayerEnabled")) {
                settings.miniPlayer.enabled = Boolean(context.patch.miniPlayerEnabled);

                if (!settings.miniPlayer.enabled) {
                    settings.miniPlayer.channelId = null;
                    settings.miniPlayer.messageId = null;
                }
            }

            if (Object.prototype.hasOwnProperty.call(context.patch, "miniPlayerChannelId")) {
                const channelId = context.patch.miniPlayerChannelId;

                if (channelId === null) {
                    settings.miniPlayer.channelId = null;
                    settings.miniPlayer.messageId = null;
                } else {
                    const channel = client.guilds.cache.get(context.guildId)?.channels.cache.get(channelId);
                    if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased() || channel.isThread?.()) {
                        return { ok: false, status: 400, error: "Mini player iÃ§in geÃ§erli bir metin kanalÄ± seÃ§melisin." };
                    }

                    settings.miniPlayer.channelId = channelId;
                    settings.miniPlayer.messageId = null;
                }
            }

            if (settings.miniPlayer.enabled && !settings.miniPlayer.channelId) {
                return { ok: false, status: 400, error: "Mini player aÃ§Ä±kken bir metin kanalÄ± seÃ§melisin." };
            }

            if (Object.prototype.hasOwnProperty.call(context.patch, "reconnectEnabled")) {
                reconnect.status = Boolean(context.patch.reconnectEnabled);

                if (!reconnect.status) {
                    reconnect.text = null;
                    reconnect.voice = null;
                }
            }

            if (Object.prototype.hasOwnProperty.call(context.patch, "reconnectTextChannelId")) {
                const channelId = context.patch.reconnectTextChannelId;

                if (channelId === null) {
                    reconnect.text = null;
                } else {
                    const channel = client.guilds.cache.get(context.guildId)?.channels.cache.get(channelId);
                    if (!channel || typeof channel.isTextBased !== "function" || !channel.isTextBased() || channel.isThread?.()) {
                        return { ok: false, status: 400, error: "24/7 metin kanalÄ± iÃ§in geÃ§erli bir kanal seÃ§melisin." };
                    }

                    reconnect.text = channelId;
                }
            }

            if (Object.prototype.hasOwnProperty.call(context.patch, "reconnectVoiceChannelId")) {
                const channelId = context.patch.reconnectVoiceChannelId;

                if (channelId === null) {
                    reconnect.voice = null;
                } else {
                    const channel = client.guilds.cache.get(context.guildId)?.channels.cache.get(channelId);
                    if (!channel || ![2, 13].includes(channel.type)) {
                        return { ok: false, status: 400, error: "24/7 modu iÃ§in geÃ§erli bir ses kanalÄ± seÃ§melisin." };
                    }

                    reconnect.voice = channelId;
                }
            }

            if (reconnect.status && (!reconnect.text || !reconnect.voice)) {
                return { ok: false, status: 400, error: "24/7 modu aÃ§Ä±kken metin ve ses kanalÄ± seÃ§melisin." };
            }

            const settingsPatch = { ...context.patch };
            delete settingsPatch.musicChannelId;
            delete settingsPatch.djRoleId;
            delete settingsPatch.allowedRoleIds;
            delete settingsPatch.miniPlayerEnabled;
            delete settingsPatch.miniPlayerChannelId;
            delete settingsPatch.reconnectEnabled;
            delete settingsPatch.reconnectTextChannelId;
            delete settingsPatch.reconnectVoiceChannelId;
            Object.assign(settings, settingsPatch);
            await client.guildData.findOneAndUpdate(
                { id: context.guildId },
                { $set: { settings, dj, reconnect }, $setOnInsert: { id: context.guildId } },
                { upsert: true, new: true },
            );

            const guildData = client.data.get(`guildData_${context.guildId}`) || { id: context.guildId };
            guildData.settings = settings;
            guildData.dj = dj;
            guildData.reconnect = reconnect;
            client.data.set(`guildData_${context.guildId}`, guildData);
            client.data.set(`guildSettings_${context.guildId}`, settings);

            return { ok: true, settings, dj, reconnect };

            async function getDashboardGuildAccess(client, userId, guildId) {
                const userDoc = await client.userData.findOne({ id: userId }).lean();
                const guild = (userDoc?.dashboard?.guilds || []).find((item) => item.id === guildId);
                if (!guild || !guild.canManage) return { ok: false, status: 403, error: "Bu sunucuyu yönetme yetkin yok." };
                if (!client.guilds.cache.has(guildId)) return { ok: false, status: 404, error: "Bot bu sunucuda değil." };
                return { ok: true };
            }

            function normalizeSettings(settings = {}) {
                return {
                    language: settings.language || "tr",
                    musicChannelId: settings.musicChannelId || null,
                    allowedRoleIds: Array.isArray(settings.allowedRoleIds) ? settings.allowedRoleIds : [],
                    themeColor: settings.themeColor || null,
                    playerMode: settings.playerMode || "compact",
                    dynamicArtworkColor: Boolean(settings.dynamicArtworkColor),
                    miniPlayer: {
                        enabled: Boolean(settings.miniPlayer?.enabled),
                        channelId: settings.miniPlayer?.channelId || null,
                        messageId: settings.miniPlayer?.messageId || null,
                    },
                };
            }

            function normalizeDj(dj = {}) {
                return {
                    status: Boolean(dj.status),
                    role: dj.role || null,
                };
            }

            function normalizeReconnect(reconnect = {}) {
                return {
                    status: Boolean(reconnect.status),
                    text: reconnect.text || null,
                    voice: reconnect.voice || null,
                };
            }

            function normalizePremium(rawPremium = {}) {
                const expiresAt = rawPremium.expiresAt ? new Date(rawPremium.expiresAt) : null;
                const active = Boolean(rawPremium.active && (!expiresAt || expiresAt.getTime() > Date.now()));
                return {
                    active,
                    plan: active ? rawPremium.plan || "plus" : "free",
                    features: active && Array.isArray(rawPremium.features) ? rawPremium.features : [],
                };
            }

            function getPremiumFeatures(premium, planFeatures) {
                if (!premium.active) return [];
                const plan = planFeatures[premium.plan] || [];
                const extra = premium.features.includes("all") ? Object.values(planFeatures).flat() : premium.features;
                return Array.from(new Set([...plan, ...extra]));
            }
        },
        { userId, guildId, patch, planFeatures: PLAN_FEATURES },
        10000,
    );
}

function sanitizeSettingsPatch(body) {
    const patch = {};

    if (["tr", "en"].includes(body.language)) patch.language = body.language;
    if (["compact", "rich"].includes(body.playerMode)) patch.playerMode = body.playerMode;
    if (typeof body.dynamicArtworkColor === "boolean") patch.dynamicArtworkColor = body.dynamicArtworkColor;
    if (body.musicChannelId === null || body.musicChannelId === "") patch.musicChannelId = null;
    if (typeof body.musicChannelId === "string" && /^\d{15,25}$/.test(body.musicChannelId)) patch.musicChannelId = body.musicChannelId;
    if (body.djRoleId === null || body.djRoleId === "") patch.djRoleId = null;
    if (typeof body.djRoleId === "string" && /^\d{15,25}$/.test(body.djRoleId)) patch.djRoleId = body.djRoleId;
    if (body.themeColor === null || body.themeColor === "") patch.themeColor = null;
    if (typeof body.themeColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.themeColor)) patch.themeColor = body.themeColor.toUpperCase();
    if (Array.isArray(body.allowedRoleIds)) {
        patch.allowedRoleIds = body.allowedRoleIds
            .filter((roleId) => typeof roleId === "string" && /^\d{15,25}$/.test(roleId))
            .slice(0, 10);
    }
    if (typeof body.miniPlayerEnabled === "boolean") patch.miniPlayerEnabled = body.miniPlayerEnabled;
    if (body.miniPlayerChannelId === null || body.miniPlayerChannelId === "") patch.miniPlayerChannelId = null;
    if (typeof body.miniPlayerChannelId === "string" && /^\d{15,25}$/.test(body.miniPlayerChannelId)) patch.miniPlayerChannelId = body.miniPlayerChannelId;
    if (typeof body.reconnectEnabled === "boolean") patch.reconnectEnabled = body.reconnectEnabled;
    if (body.reconnectTextChannelId === null || body.reconnectTextChannelId === "") patch.reconnectTextChannelId = null;
    if (typeof body.reconnectTextChannelId === "string" && /^\d{15,25}$/.test(body.reconnectTextChannelId)) patch.reconnectTextChannelId = body.reconnectTextChannelId;
    if (body.reconnectVoiceChannelId === null || body.reconnectVoiceChannelId === "") patch.reconnectVoiceChannelId = null;
    if (typeof body.reconnectVoiceChannelId === "string" && /^\d{15,25}$/.test(body.reconnectVoiceChannelId)) patch.reconnectVoiceChannelId = body.reconnectVoiceChannelId;

    return patch;
}

async function claimDashboardTrial(cluster, userId, guildId) {
    return cluster.eval(
        async (client, context) => {
            const now = new Date();
            const expiresAt = new Date(Date.now() + context.trialTtlMs);
            const userDoc = await client.userData.findOne({ id: context.userId }).lean();
            const guildAccess = (userDoc?.dashboard?.guilds || []).find((guild) => guild.id === context.guildId);

            if (userDoc?.dashboard?.trial?.claimed) {
                return {
                    ok: false,
                    status: 409,
                    error: "Bu dashboard hesabı daha önce deneme hakkını kullanmış.",
                    trial: userDoc.dashboard.trial,
                };
            }

            if (!guildAccess || !guildAccess.canManage) {
                return { ok: false, status: 403, error: "Bu sunucu için deneme başlatma yetkin yok." };
            }

            if (!client.guilds.cache.has(context.guildId)) {
                return { ok: false, status: 404, error: "Deneme başlatmadan önce bot bu sunucuda olmalı." };
            }

            const guildDoc = await client.guildData.findOne({ id: context.guildId }).lean();
            const currentPremium = normalizePremium(guildDoc?.premium || {});

            if (currentPremium.active) {
                return { ok: false, status: 409, error: "Bu sunucuda zaten aktif premium var.", premium: currentPremium };
            }

            if (guildDoc?.premium?.trial?.claimedAt) {
                return { ok: false, status: 409, error: "Bu sunucu deneme hakkını daha önce kullanmış." };
            }

            const premium = {
                active: true,
                plan: "trial",
                expiresAt,
                features: [],
                source: "dashboard_trial",
                grantedBy: context.userId,
                grantedAt: now,
                revokedBy: null,
                revokedAt: null,
                trial: {
                    claimedBy: context.userId,
                    claimedAt: now,
                    onboardingVersion: context.onboardingVersion,
                },
            };

            await client.guildData.findOneAndUpdate(
                { id: context.guildId },
                { $set: { premium }, $setOnInsert: { id: context.guildId } },
                { upsert: true, new: true },
            );

            await client.userData.findOneAndUpdate(
                { id: context.userId },
                {
                    $set: {
                        "dashboard.trial": {
                            claimed: true,
                            guildId: context.guildId,
                            claimedAt: now,
                            expiresAt,
                        },
                    },
                },
                { upsert: true, new: true },
            );

            const guildData = client.data.get(`guildData_${context.guildId}`) || { id: context.guildId };
            guildData.premium = premium;
            client.data.set(`guildData_${context.guildId}`, guildData);

            return {
                ok: true,
                premium: {
                    ...premium,
                    expiresAt: expiresAt.toISOString(),
                    grantedAt: now.toISOString(),
                    trial: {
                        ...premium.trial,
                        claimedAt: now.toISOString(),
                    },
                },
            };

            function normalizePremium(rawPremium = {}) {
                const expiresAt = rawPremium.expiresAt ? new Date(rawPremium.expiresAt) : null;
                const active = Boolean(rawPremium.active && (!expiresAt || expiresAt.getTime() > Date.now()));
                return {
                    active,
                    plan: active ? rawPremium.plan || "plus" : "free",
                    expiresAt: expiresAt ? expiresAt.toISOString() : null,
                    source: rawPremium.source || null,
                };
            }
        },
        { userId, guildId, trialTtlMs: TRIAL_TTL_MS, onboardingVersion: ONBOARDING_VERSION },
        10000,
    );
}

async function preparePremiumCheckout(cluster, userId, guildId, plan) {
    return cluster.eval(
        async (client, context) => {
            if (!["plus", "pro"].includes(context.plan)) {
                return { ok: false, status: 400, error: "Geçersiz premium planı." };
            }

            return {
                ok: true,
                scope: "user",
                guild: null,
            };
        },
        { userId, guildId, plan },
        10000,
    );
}

async function claimDashboardAccountTrial(cluster, userId, guildId) {
    return cluster.eval(
        async (client, context) => {
            const now = new Date();
            const expiresAt = new Date(Date.now() + context.trialTtlMs);
            const userDoc = await client.userData.findOne({ id: context.userId }).lean();
            const guildAccess = (userDoc?.dashboard?.guilds || []).find((guild) => guild.id === context.guildId);
            const currentPremium = normalizePremium(userDoc?.premium || {});

            if (userDoc?.dashboard?.trial?.claimed) {
                return {
                    ok: false,
                    status: 409,
                    error: "Bu dashboard hesabı daha önce deneme hakkını kullanmış.",
                    trial: userDoc.dashboard.trial,
                };
            }

            if (currentPremium.active) {
                return { ok: false, status: 409, error: "Bu hesapta zaten aktif premium var.", premium: currentPremium };
            }

            if (!guildAccess || !guildAccess.canManage) {
                return { ok: false, status: 403, error: "Bu sunucu üzerinden deneme başlatma yetkin yok." };
            }

            if (!client.guilds.cache.has(context.guildId)) {
                return { ok: false, status: 404, error: "Deneme başlatmadan önce bot seçili sunucuda olmalı." };
            }

            const premium = {
                active: true,
                plan: "trial",
                expiresAt,
                features: [],
                source: "dashboard_account_trial",
                grantedBy: context.userId,
                grantedAt: now,
                revokedBy: null,
                revokedAt: null,
                trial: {
                    claimedBy: context.userId,
                    claimedAt: now,
                    onboardingVersion: context.onboardingVersion,
                    eligibilityGuildId: context.guildId,
                },
            };

            await client.userData.findOneAndUpdate(
                { id: context.userId },
                {
                    $set: {
                        premium,
                        "dashboard.trial": {
                            claimed: true,
                            guildId: context.guildId,
                            claimedAt: now,
                            expiresAt,
                        },
                    },
                    $setOnInsert: { id: context.userId, ban: { status: false, reason: null } },
                },
                { upsert: true, new: true },
            );

            const userData = client.data.get(`userData_${context.userId}`) || { id: context.userId };
            userData.premium = premium;
            userData.dashboard = {
                ...(userData.dashboard || {}),
                trial: {
                    claimed: true,
                    guildId: context.guildId,
                    claimedAt: now,
                    expiresAt,
                },
            };
            client.data.set(`userData_${context.userId}`, userData);

            return {
                ok: true,
                premium: {
                    ...premium,
                    expiresAt: expiresAt.toISOString(),
                    grantedAt: now.toISOString(),
                    trial: {
                        ...premium.trial,
                        claimedAt: now.toISOString(),
                    },
                },
            };

            function normalizePremium(rawPremium = {}) {
                const expiresAt = rawPremium.expiresAt ? new Date(rawPremium.expiresAt) : null;
                const active = Boolean(rawPremium.active && (!expiresAt || expiresAt.getTime() > Date.now()));
                return {
                    active,
                    plan: active ? rawPremium.plan || "plus" : "free",
                    expiresAt: expiresAt ? expiresAt.toISOString() : null,
                };
            }
        },
        { userId, guildId, trialTtlMs: TRIAL_TTL_MS, onboardingVersion: ONBOARDING_VERSION },
        10000,
    );
}

async function applyPaymentWebhook(cluster, normalizedEvent) {
    return cluster.eval(
        async (client, context) => {
            const event = context.event;

            if (!event.plan) {
                return { ok: false, status: 400, error: "Webhook içinde plan yok." };
            }

            if (!event.userId) {
                return { ok: false, status: 400, error: "Webhook içinde kullanıcı ID'si yok." };
            }

            const now = new Date();
            const active = isActiveEvent(event);
            const expiresAt = getPremiumExpiry(event);
            const premium = {
                active,
                plan: active ? event.plan : "free",
                expiresAt,
                features: [],
                source: event.provider,
                grantedBy: event.userId || "lemonsqueezy",
                grantedAt: now,
                revokedBy: active ? null : "lemonsqueezy",
                revokedAt: active ? null : now,
                trial: {
                    claimedBy: event.userId || null,
                    claimedAt: event.attributes?.trial_ends_at ? now : null,
                    onboardingVersion: context.onboardingVersion,
                },
                payment: {
                    provider: event.provider,
                    eventName: event.eventName,
                    eventId: event.eventId,
                    objectId: event.objectId,
                    status: event.status,
                    customerId: event.customerId,
                    orderId: event.orderId,
                    subscriptionId: event.subscriptionId,
                    productId: event.productId,
                    variantId: event.variantId,
                    scope: "user",
                    updatedAt: now,
                },
            };

            await client.userData.findOneAndUpdate(
                { id: event.userId },
                { $set: { premium }, $setOnInsert: { id: event.userId, ban: { status: false, reason: null } } },
                { upsert: true, new: true },
            );

            const userData = client.data.get(`userData_${event.userId}`) || { id: event.userId };
            userData.premium = premium;
            client.data.set(`userData_${event.userId}`, userData);

            return { ok: true, scope: "user", userId: event.userId, premium };

            function isActiveEvent(event) {
                if (event.eventName === "order_refunded" || event.eventName === "subscription_expired" || event.eventName === "subscription_paused") return false;
                if (event.eventName === "subscription_cancelled") return hasFutureDate(event.attributes?.ends_at);
                if (event.eventName === "subscription_payment_failed") return false;
                if (event.eventName === "order_created") return true;
                if (event.eventName === "subscription_created" || event.eventName === "subscription_updated" || event.eventName === "subscription_resumed" || event.eventName === "subscription_payment_success") {
                    return ["active", "on_trial"].includes(String(event.status || "").toLowerCase()) || hasFutureDate(event.attributes?.renews_at) || hasFutureDate(event.attributes?.trial_ends_at);
                }
                return false;
            }

            function getPremiumExpiry(event) {
                if (event.plan === "lifetime") return null;
                const value = event.attributes?.ends_at || event.attributes?.renews_at || event.attributes?.trial_ends_at;
                const date = value ? new Date(value) : null;
                if (date && !Number.isNaN(date.getTime())) return date;
                if (event.eventName === "order_created") return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return null;
            }

            function hasFutureDate(value) {
                const date = value ? new Date(value) : null;
                return Boolean(date && !Number.isNaN(date.getTime()) && date.getTime() > Date.now());
            }
        },
        { event: normalizedEvent, onboardingVersion: ONBOARDING_VERSION },
        10000,
    );
}

async function getAdminSummary(cluster, version) {
    return cluster.eval(async (client, context) => {
        const players = collectionValues(client.rainlink.players);
        const nodes = collectionValues(client.rainlink.nodes);
        const commandStats = client.data.get("commandStats") || {
            startedAt: Date.now(),
            total: 0,
            slash: 0,
            prefix: 0,
            byCommand: {},
            byGuild: {},
            recent: [],
        };
        const premiumDocs = await client.guildData.find({ "premium.active": true }).lean();
        const activePremiums = premiumDocs.filter((doc) => {
            const expiresAt = doc.premium?.expiresAt ? new Date(doc.premium.expiresAt) : null;
            return !expiresAt || expiresAt.getTime() > Date.now();
        });
        const userPremiumDocs = await client.userData.find({ "premium.active": true }).lean();
        const activeUserPremiums = userPremiumDocs.filter((doc) => {
            const expiresAt = doc.premium?.expiresAt ? new Date(doc.premium.expiresAt) : null;
            return !expiresAt || expiresAt.getTime() > Date.now();
        });
        const trialPremiums = activePremiums.filter((doc) => doc.premium?.plan === "trial");

        return {
            version: context.version,
            clusterId: client.cluster?.id ?? null,
            shardCount: client.options.shardCount || 1,
            uptime: Math.floor(client.uptime / 1000),
            ping: client.ws.ping,
            guilds: client.guilds.cache.size,
            usersCached: client.users.cache.size,
            players: {
                total: players.length,
                playing: players.filter((activePlayer) => activePlayer.playing && !activePlayer.paused).length,
                paused: players.filter((activePlayer) => activePlayer.paused).length,
            },
            nodes: {
                total: nodes.length,
                online: nodes.filter((node) => node.connected || node.online || node.state === 0).length,
            },
            premium: {
                activeGuilds: activePremiums.length,
                activeUsers: activeUserPremiums.length,
                activeTrials: trialPremiums.length,
            },
            commandStats,
        };

        function collectionValues(collection) {
            if (!collection) return [];
            if (typeof collection.all === "function") return collection.all();
            if (typeof collection.values === "function") return Array.from(collection.values());
            if (collection.values && typeof collection.values[Symbol.iterator] === "function") return Array.from(collection.values);
            if (typeof collection[Symbol.iterator] === "function") return Array.from(collection);
            return [];
        }
    }, { version }, 10000);
}

async function getAdminPremiumList(cluster) {
    return cluster.eval(async (client) => {
        const docs = await client.guildData.find({ "premium.active": true }).lean().limit(200);
        const userDocs = await client.userData.find({ "premium.active": true }).lean().limit(200);

        const items = docs.map((doc) => {
            const guild = client.guilds.cache.get(doc.id);
            const premium = normalizePremium(doc.premium || {});

            return {
                id: doc.id,
                name: guild?.name || "Unknown guild",
                memberCount: guild?.memberCount || null,
                premium,
                payment: doc.premium?.payment || null,
            };
        });
        const users = userDocs.map((doc) => {
            const user = client.users.cache.get(doc.id);
            const premium = normalizePremium(doc.premium || {});

            return {
                id: doc.id,
                username: doc.dashboard?.globalName || user?.globalName || doc.dashboard?.username || user?.username || "Unknown user",
                avatar: doc.dashboard?.avatar || user?.avatar || null,
                premium,
                payment: doc.premium?.payment || null,
            };
        });

        return {
            counts: {
                total: items.length,
                active: items.filter((item) => item.premium.active).length,
                userTotal: users.length,
                userActive: users.filter((item) => item.premium.active).length,
                trial: items.filter((item) => item.premium.active && item.premium.plan === "trial").length,
                plus: items.filter((item) => item.premium.active && item.premium.plan === "plus").length,
                pro: items.filter((item) => item.premium.active && item.premium.plan === "pro").length,
                lifetime: items.filter((item) => item.premium.active && item.premium.plan === "lifetime").length,
            },
            items,
            users,
        };

        function normalizePremium(rawPremium = {}) {
            const expiresAt = rawPremium.expiresAt ? new Date(rawPremium.expiresAt) : null;
            const active = Boolean(rawPremium.active && (!expiresAt || expiresAt.getTime() > Date.now()));

            return {
                active,
                plan: active ? rawPremium.plan || "plus" : rawPremium.plan || "free",
                expiresAt: expiresAt ? expiresAt.toISOString() : null,
                source: rawPremium.source || null,
                grantedBy: rawPremium.grantedBy || null,
                grantedAt: rawPremium.grantedAt || null,
                revokedBy: rawPremium.revokedBy || null,
                revokedAt: rawPremium.revokedAt || null,
            };
        }
    }, null, 10000);
}

async function getNodeSummary(cluster) {
    return cluster.eval((client) => {
        const players = collectionValues(client.rainlink.players);

        return collectionValues(client.rainlink.nodes).map((node) => {
            const nodePlayers = players.filter((activePlayer) => activePlayer.node?.options?.name === node.options.name);

            return {
                name: node.options.name,
                host: node.options.host,
                port: node.options.port,
                secure: Boolean(node.options.secure),
                status: node.connected || node.online || node.state === 0 ? "online" : "offline",
                players: nodePlayers.length,
                playing: nodePlayers.filter((activePlayer) => activePlayer.playing && !activePlayer.paused).length,
                stats: node.stats || null,
            };
        });

        function collectionValues(collection) {
            if (!collection) return [];
            if (typeof collection.all === "function") return collection.all();
            if (typeof collection.values === "function") return Array.from(collection.values());
            if (collection.values && typeof collection.values[Symbol.iterator] === "function") return Array.from(collection.values);
            if (typeof collection[Symbol.iterator] === "function") return Array.from(collection);
            return [];
        }
    }, null, 10000);
}

module.exports = {
    applyPaymentWebhook,
    claimDashboardTrial: claimDashboardAccountTrial,
    getAdminPremiumList,
    getAdminSummary,
    getDashboardGuild,
    getDashboardProfile,
    getNodeSummary,
    preparePremiumCheckout,
    sanitizeSettingsPatch,
    saveDashboardLogin,
    updateDashboardGuildSettings,
    TRIAL_TTL_MS,
    ONBOARDING_VERSION,
};
