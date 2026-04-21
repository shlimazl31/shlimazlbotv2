module.exports = (cluster) => {
    const express = require("express");
    const { getBotVersion } = require("../../functions/getBotVersion.js");
    const {
        createOAuthState,
        clearDashboardSession,
        exchangeDiscordCode,
        fetchDiscord,
        getDiscordRedirectUri,
        normalizeDiscordGuild,
        requireAdminToken,
        requireDashboardSession,
        requireOwnerSession,
        setDashboardSession,
        verifyOAuthState,
    } = require("../utils/dashboardSession.js");
    const {
        createPremiumCheckout,
        normalizeWebhookPayload,
        verifyWebhookSignature,
    } = require("../utils/lemonSqueezy.js");
    const {
        applyPaymentWebhook,
        claimDashboardTrial,
        getAdminPremiumList,
        getAdminSummary,
        getDashboardGuild,
        getDashboardProfile,
        getNodeSummary,
        preparePremiumCheckout,
        sanitizeSettingsPatch,
        saveDashboardLogin,
        updateDashboardGuildSettings,
    } = require("../utils/dashboardService.js");
    const router = express.Router();

    router.get("/", async (req, res) => {
        return res.json({
            name: "ShlimazlBot API",
            version: getBotVersion(),
            endpoints: {
                status: "/api/bot/status",
                auth: "/api/bot/auth/discord",
                me: "/api/bot/auth/me",
                dashboardGuilds: "/api/bot/dashboard/guilds",
                trial: "/api/bot/dashboard/premium/trial",
                checkout: "/api/bot/dashboard/payments/checkout",
                paymentWebhook: "/api/bot/payments/lemonsqueezy/webhook",
                premium: "/api/bot/premium/:guildId",
                adminSummary: "/api/bot/admin/summary",
                dashboardAdminPremium: "/api/bot/dashboard/admin/premium",
                adminGuilds: "/api/bot/admin/guilds",
                adminNodes: "/api/bot/admin/nodes",
            },
        });
    });

    router.get("/status", async (req, res) => {
        try {
            const clientData = await cluster.eval((client) => ({
                status: client.ws.status,
                uptime: client.uptime,
                guilds: client.guilds.cache.size,
                ping: client.ws.ping,
            }));

            if (!clientData) {
                return res.status(500).json({ error: "Client not available" });
            }

            const status = {
                status: clientData.status === 0 ? "online" : "offline",
                uptime: Math.floor(clientData.uptime / 1000),
                guilds: clientData.guilds,
                ping: clientData.ping,
            };

            return res.json(status);
        } catch (error) {
            console.error("API Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/public-stats", async (req, res) => {
        try {
            const stats = await cluster.eval((client) => {
                const guilds = client.guilds.cache;
                const players = collectionValues(client.rainlink.players);
                const nodes = collectionValues(client.rainlink.nodes);
                const reachableUsers = guilds.reduce((total, guild) => total + (guild.memberCount || 0), 0);

                return {
                    status: client.ws.status === 0 ? "online" : "reconnecting",
                    guilds: guilds.size,
                    reachableUsers,
                    activePlayers: players.length,
                    nodes: nodes.length,
                    uptime: Math.floor((client.uptime || 0) / 1000),
                };

                function collectionValues(collection) {
                    if (!collection) return [];
                    if (typeof collection.values === "function") return Array.from(collection.values());
                    if (collection instanceof Map) return Array.from(collection.values());
                    if (Array.isArray(collection)) return collection;
                    return Object.values(collection);
                }
            }, {}, 10000);

            return res.json(stats);
        } catch (error) {
            console.error("API Public Stats Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/auth/discord", async (req, res) => {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return res.status(503).json({
                error: "Discord OAuth is not configured",
                required: ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET"],
            });
        }

        const state = createOAuthState(res, req);
        const query = new URLSearchParams({
            client_id: clientId,
            redirect_uri: getDiscordRedirectUri(req),
            response_type: "code",
            scope: "identify guilds",
            state,
        });

        return res.redirect(`https://discord.com/oauth2/authorize?${query.toString()}`);
    });

    router.get("/auth/callback", async (req, res) => {
        try {
            if (!verifyOAuthState(req, res)) return res.redirect("/dashboard?auth_error=state");

            const token = await exchangeDiscordCode(req.query.code, getDiscordRedirectUri(req));
            const [user, guilds] = await Promise.all([
                fetchDiscord("/users/@me", token.access_token),
                fetchDiscord("/users/@me/guilds", token.access_token),
            ]);
            const normalizedGuilds = Array.isArray(guilds) ? guilds.map(normalizeDiscordGuild) : [];

            await saveDashboardLogin(
                cluster,
                {
                    id: user.id,
                    username: user.username,
                    globalName: user.global_name || user.username,
                    avatar: user.avatar,
                },
                normalizedGuilds,
            );

            setDashboardSession(res, req, user);
            return res.redirect("/dashboard?login=success");
        } catch (error) {
            console.error("Discord OAuth callback error:", error);
            return res.redirect("/dashboard?auth_error=oauth");
        }
    });

    router.post("/auth/logout", (req, res) => {
        clearDashboardSession(res, req);
        return res.json({ ok: true });
    });

    router.get("/auth/me", requireDashboardSession, async (req, res) => {
        try {
            return res.json(await getDashboardProfile(cluster, req.session.userId));
        } catch (error) {
            console.error("Dashboard profile error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/dashboard/guilds", requireDashboardSession, async (req, res) => {
        try {
            const profile = await getDashboardProfile(cluster, req.session.userId);
            return res.json({ guilds: profile.guilds });
        } catch (error) {
            console.error("Dashboard guild list error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/dashboard/guilds/:guildId", requireDashboardSession, async (req, res) => {
        try {
            const result = await getDashboardGuild(cluster, req.session.userId, req.params.guildId);
            if (!result.ok) return res.status(result.status || 400).json({ error: result.error, guild: result.guild || null });
            return res.json(result.guild);
        } catch (error) {
            console.error("Dashboard guild detail error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.patch("/dashboard/guilds/:guildId/settings", requireDashboardSession, async (req, res) => {
        try {
            const patch = sanitizeSettingsPatch(req.body || {});
            const result = await updateDashboardGuildSettings(cluster, req.session.userId, req.params.guildId, patch);
            if (!result.ok) return res.status(result.status || 400).json({ error: result.error });
            return res.json({ settings: result.settings });
        } catch (error) {
            console.error("Dashboard settings error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.post("/dashboard/payments/checkout", requireDashboardSession, async (req, res) => {
        try {
            const plan = String(req.body?.plan || "").toLowerCase();
            const context = await preparePremiumCheckout(cluster, req.session.userId, null, plan);
            if (!context.ok) return res.status(context.status || 400).json({ error: context.error });

            const checkout = await createPremiumCheckout({
                userId: req.session.userId,
                plan,
            });
            if (!checkout.ok) return res.status(checkout.status || 400).json(checkout);

            return res.json(checkout);
        } catch (error) {
            console.error("Premium checkout error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.post("/payments/lemonsqueezy/webhook", async (req, res) => {
        try {
            const signature = req.headers["x-signature"];
            const verify = verifyWebhookSignature(req.rawBody || JSON.stringify(req.body || {}), signature);
            if (!verify.ok) return res.status(verify.status || 401).json({ error: verify.error });

            const event = normalizeWebhookPayload(req.body || {});
            const result = await applyPaymentWebhook(cluster, event);
            if (!result.ok) return res.status(result.status || 400).json({ error: result.error });

            return res.json({ ok: true });
        } catch (error) {
            console.error("Lemon Squeezy webhook error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.post("/dashboard/premium/trial", requireDashboardSession, async (req, res) => {
        try {
            const guildId = String(req.body?.guildId || "");
            const checklist = req.body?.checklist || {};

            if (!guildId) return res.status(400).json({ error: "Sunucu ID'si gerekli." });
            if (!req.body?.acceptedTerms || !checklist.selectedGuild || !checklist.confirmManagedServer || !checklist.understandOneTime) {
                return res.status(400).json({
                    error: "Deneme başlangıç adımları tamamlanmadı.",
                    required: ["acceptedTerms", "selectedGuild", "confirmManagedServer", "understandOneTime"],
                });
            }

            const result = await claimDashboardTrial(cluster, req.session.userId, guildId);
            if (!result.ok) return res.status(result.status || 400).json(result);
            return res.json(result);
        } catch (error) {
            console.error("Dashboard trial error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/dashboard/admin/summary", requireDashboardSession, requireOwnerSession(cluster), async (req, res) => {
        try {
            return res.json(await getAdminSummary(cluster, getBotVersion()));
        } catch (error) {
            console.error("Dashboard owner summary error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/dashboard/admin/nodes", requireDashboardSession, requireOwnerSession(cluster), async (req, res) => {
        try {
            return res.json({ nodes: await getNodeSummary(cluster) });
        } catch (error) {
            console.error("Dashboard owner nodes error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/dashboard/admin/premium", requireDashboardSession, requireOwnerSession(cluster), async (req, res) => {
        try {
            return res.json(await getAdminPremiumList(cluster));
        } catch (error) {
            console.error("Dashboard owner premium list error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/premium/:guildId", async (req, res) => {
        try {
            const premium = await cluster.eval(
                async (client, context) => {
                    const doc = await client.guildData.findOne({ id: context.guildId }).lean();
                    const rawPremium = doc?.premium || {};
                    const expiresAt = rawPremium.expiresAt ? new Date(rawPremium.expiresAt) : null;
                    const active = Boolean(rawPremium.active && (!expiresAt || expiresAt.getTime() > Date.now()));

                    return {
                        guildId: context.guildId,
                        active,
                        plan: active ? rawPremium.plan || "plus" : "free",
                        expiresAt: expiresAt ? expiresAt.toISOString() : null,
                        features: active && Array.isArray(rawPremium.features) ? rawPremium.features : [],
                    };
                },
                { guildId: req.params.guildId },
                10000,
            );

            return res.json(premium);
        } catch (error) {
            console.error("API Premium Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/admin/summary", requireAdminToken, async (req, res) => {
        try {
            const summary = await cluster.eval(async (client, context) => {
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
            }, { version: getBotVersion() }, 10000);

            return res.json(summary);
        } catch (error) {
            console.error("API Admin Summary Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/admin/guilds", requireAdminToken, async (req, res) => {
        try {
            const limit = Math.min(Number(req.query.limit || 50), 200);
            const premiumOnly = req.query.premium === "true";
            const guilds = await cluster.eval(
                async (client, context) => {
                    const docs = await client.guildData.find({}).lean().limit(context.limit);
                    const players = collectionValues(client.rainlink.players);

                    return docs
                        .map((doc) => {
                            const guild = client.guilds.cache.get(doc.id);
                            const player = players.find((activePlayer) => activePlayer.guildId === doc.id);
                            const premium = normalizePremium(doc.premium);

                            return {
                                id: doc.id,
                                name: guild?.name || "Unknown guild",
                                memberCount: guild?.memberCount || null,
                                language: doc.settings?.language || "tr",
                                playerMode: doc.settings?.playerMode || "compact",
                                musicChannelId: doc.settings?.musicChannelId || null,
                                miniPlayerEnabled: Boolean(doc.settings?.miniPlayer?.enabled),
                                premium,
                                player: player
                                    ? {
                                        active: true,
                                        playing: Boolean(player.playing && !player.paused),
                                        paused: Boolean(player.paused),
                                        node: player.node?.options?.name || null,
                                        track: player.queue?.current?.title || null,
                                    }
                                    : { active: false },
                            };
                        })
                        .filter((guild) => !context.premiumOnly || guild.premium.active);

                    function collectionValues(collection) {
                        if (!collection) return [];
                        if (typeof collection.all === "function") return collection.all();
                        if (typeof collection.values === "function") return Array.from(collection.values());
                        if (collection.values && typeof collection.values[Symbol.iterator] === "function") return Array.from(collection.values);
                        if (typeof collection[Symbol.iterator] === "function") return Array.from(collection);
                        return [];
                    }

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
                { limit, premiumOnly },
                10000,
            );

            return res.json({ guilds });
        } catch (error) {
            console.error("API Admin Guilds Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/admin/nodes", requireAdminToken, async (req, res) => {
        try {
            const nodes = await cluster.eval((client) => {
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

            return res.json({ nodes });
        } catch (error) {
            console.error("API Admin Nodes Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/admin/premium", requireAdminToken, async (req, res) => {
        try {
            return res.json(await getAdminPremiumList(cluster));
        } catch (error) {
            console.error("API Admin Premium Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/admin/logs", requireAdminToken, async (req, res) => {
        try {
            const limit = Math.min(Number(req.query.limit || 80), 250);
            const payload = await cluster.eval(
                async (client, context) => {
                    const commandStats = client.data.get("commandStats") || {
                        startedAt: Date.now(),
                        total: 0,
                        slash: 0,
                        prefix: 0,
                        byCommand: {},
                        byGuild: {},
                        recent: [],
                    };
                    const adminLogs = await client.adminLog.find({}).sort({ createdAt: -1 }).limit(context.limit).lean();

                    return {
                        commandStats,
                        commands: commandStats.recent || [],
                        adminLogs: adminLogs.map((log) => ({
                            id: String(log._id),
                            action: log.action,
                            actor: log.actor,
                            targetType: log.targetType,
                            targetId: log.targetId,
                            message: log.message,
                            metadata: log.metadata || {},
                            createdAt: log.createdAt,
                        })),
                    };
                },
                { limit },
                10000,
            );

            return res.json(payload);
        } catch (error) {
            console.error("API Admin Logs Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.get("/admin/inbox", requireAdminToken, async (req, res) => {
        try {
            const limit = Math.min(Number(req.query.limit || 200), 500);
            const inbox = await cluster.eval(
                async (client, context) => {
                    const logs = await client.adminLog.find({
                        action: { $in: ["dm.inbound", "message.dm"] },
                        targetType: "user",
                    }).sort({ createdAt: -1 }).limit(context.limit).lean();
                    const conversations = new Map();

                    for (const log of logs) {
                        const userId = log.targetId || log.actor;
                        if (!userId) continue;
                        if (!conversations.has(userId)) {
                            conversations.set(userId, {
                                userId,
                                username: log.metadata?.globalName || log.metadata?.username || "Unknown user",
                                avatar: log.metadata?.avatar || null,
                                lastAt: log.createdAt,
                                unread: 0,
                                messages: [],
                            });
                        }

                        const conversation = conversations.get(userId);
                        if (log.action === "dm.inbound") conversation.unread += 1;
                        conversation.username = conversation.username === "Unknown user"
                            ? log.metadata?.globalName || log.metadata?.username || conversation.username
                            : conversation.username;
                        conversation.avatar = conversation.avatar || log.metadata?.avatar || null;
                        conversation.messages.push({
                            id: String(log._id),
                            direction: log.action === "dm.inbound" ? "inbound" : "outbound",
                            content: log.metadata?.content || log.metadata?.preview || "",
                            preview: log.metadata?.preview || "",
                            messageId: log.metadata?.messageId || null,
                            createdAt: log.createdAt,
                        });
                    }

                    return Array.from(conversations.values()).map((conversation) => ({
                        ...conversation,
                        messages: conversation.messages
                            .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
                            .slice(-20),
                    })).sort((left, right) => new Date(right.lastAt) - new Date(left.lastAt));
                },
                { limit },
                10000,
            );

            return res.json({ conversations: inbox });
        } catch (error) {
            console.error("API Admin Inbox Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.post("/admin/premium/grant", requireAdminToken, async (req, res) => {
        try {
            const userId = String(req.body?.userId || "").trim();
            const plan = String(req.body?.plan || "plus").toLowerCase();
            const days = Number(req.body?.days || 30);
            const note = String(req.body?.note || "").trim().slice(0, 400);

            if (!/^\d{16,22}$/.test(userId)) return res.status(400).json({ error: "Geçerli bir kullanıcı ID'si gerekli." });
            if (!["trial", "plus", "pro", "lifetime"].includes(plan)) return res.status(400).json({ error: "Plan trial, plus, pro veya lifetime olmalı." });
            if (plan !== "lifetime" && (!Number.isFinite(days) || days < 1 || days > 3650)) return res.status(400).json({ error: "Gün değeri 1-3650 arasında olmalı." });

            const result = await cluster.eval(
                async (client, context) => {
                    const now = new Date();
                    const expiresAt = context.plan === "lifetime" ? null : new Date(now.getTime() + context.days * 24 * 60 * 60 * 1000);
                    const planType = context.plan === "trial" ? "plus" : context.plan === "lifetime" ? "pro" : context.plan;
                    const fetchedUser = await client.users.fetch(context.userId).catch(() => null);
                    const premium = {
                        active: true,
                        plan: planType,
                        planType: planType.toUpperCase(),
                        status: "active",
                        startedAt: now,
                        expiresAt,
                        billingType: context.plan === "lifetime" ? "lifetime" : "monthly",
                        isLifetime: context.plan === "lifetime",
                        features: [],
                        source: "admin_panel",
                        grantedBy: context.actor,
                        grantedAt: now,
                        revokedBy: null,
                        revokedAt: null,
                        payment: {
                            provider: "admin-panel",
                            eventName: "manual_grant",
                            eventId: null,
                            objectId: null,
                            status: "manual",
                            customerId: null,
                            orderId: null,
                            subscriptionId: null,
                            productId: null,
                            variantId: null,
                            updatedAt: now,
                        },
                    };

                    const userDoc = await client.userData.findOneAndUpdate(
                        { id: context.userId },
                        {
                            $set: {
                                id: context.userId,
                                premium,
                                "dashboard.username": fetchedUser?.username || null,
                                "dashboard.globalName": fetchedUser?.globalName || fetchedUser?.username || null,
                                "dashboard.avatar": fetchedUser?.avatar || null,
                            },
                            $setOnInsert: { ban: { status: false, reason: null } },
                        },
                        { upsert: true, new: true },
                    );

                    const cached = client.data.get(`userData_${context.userId}`) || { id: context.userId };
                    cached.premium = premium;
                    cached.dashboard = {
                        ...(cached.dashboard || {}),
                        username: fetchedUser?.username || cached.dashboard?.username || null,
                        globalName: fetchedUser?.globalName || fetchedUser?.username || cached.dashboard?.globalName || null,
                        avatar: fetchedUser?.avatar || cached.dashboard?.avatar || null,
                    };
                    client.data.set(`userData_${context.userId}`, cached);

                    return {
                        ok: true,
                        userId: context.userId,
                        username: fetchedUser?.globalName || fetchedUser?.username || userDoc.dashboard?.globalName || "Unknown user",
                        premium: {
                            ...premium,
                            expiresAt: expiresAt ? expiresAt.toISOString() : null,
                            grantedAt: now.toISOString(),
                        },
                    };
                },
                { userId, plan, days, note, actor: req.adminActor || "admin-panel" },
                10000,
            );

            await recordAdminAction(cluster, {
                action: "premium.grant",
                actor: "admin-panel",
                targetType: "user",
                targetId: userId,
                message: `${plan} planı verildi${plan === "lifetime" ? "" : ` (${days} gün)`}.`,
                metadata: { plan, days: plan === "lifetime" ? null : days, note },
            });

            return res.json(result);
        } catch (error) {
            console.error("API Admin Premium Grant Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.post("/admin/premium/revoke", requireAdminToken, async (req, res) => {
        try {
            const userId = String(req.body?.userId || "").trim();
            const note = String(req.body?.note || "").trim().slice(0, 400);

            if (!/^\d{16,22}$/.test(userId)) return res.status(400).json({ error: "Geçerli bir kullanıcı ID'si gerekli." });

            const result = await cluster.eval(
                async (client, context) => {
                    const now = new Date();
                    const premium = {
                        active: false,
                        plan: "free",
                        planType: "FREE",
                        status: "canceled",
                        startedAt: null,
                        expiresAt: null,
                        billingType: "monthly",
                        isLifetime: false,
                        features: [],
                        source: "admin_panel",
                        grantedBy: null,
                        grantedAt: null,
                        revokedBy: context.actor,
                        revokedAt: now,
                        payment: {
                            provider: "admin-panel",
                            eventName: "manual_revoke",
                            eventId: null,
                            objectId: null,
                            status: "revoked",
                            customerId: null,
                            orderId: null,
                            subscriptionId: null,
                            productId: null,
                            variantId: null,
                            updatedAt: now,
                        },
                    };

                    await client.userData.findOneAndUpdate(
                        { id: context.userId },
                        { $set: { id: context.userId, premium }, $setOnInsert: { ban: { status: false, reason: null } } },
                        { upsert: true, new: true },
                    );

                    const cached = client.data.get(`userData_${context.userId}`) || { id: context.userId };
                    cached.premium = premium;
                    client.data.set(`userData_${context.userId}`, cached);

                    return { ok: true, userId: context.userId, premium: { ...premium, revokedAt: now.toISOString() } };
                },
                { userId, note, actor: req.adminActor || "admin-panel" },
                10000,
            );

            await recordAdminAction(cluster, {
                action: "premium.revoke",
                actor: "admin-panel",
                targetType: "user",
                targetId: userId,
                message: "Premium erişimi kaldırıldı.",
                metadata: { note },
            });

            return res.json(result);
        } catch (error) {
            console.error("API Admin Premium Revoke Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    router.post("/admin/messages/dm", requireAdminToken, async (req, res) => {
        try {
            const userId = String(req.body?.userId || "").trim();
            const message = String(req.body?.message || "").trim();

            if (!/^\d{16,22}$/.test(userId)) return res.status(400).json({ error: "Geçerli bir kullanıcı ID'si gerekli." });
            if (!message || message.length > 1900) return res.status(400).json({ error: "Mesaj 1-1900 karakter arasında olmalı." });

            const result = await cluster.eval(
                async (client, context) => {
                    const user = await client.users.fetch(context.userId);
                    const sent = await user.send(context.message);
                    return {
                        ok: true,
                        userId: context.userId,
                        username: user.globalName || user.username,
                        messageId: sent.id,
                    };
                },
                { userId, message },
                10000,
            );

            await recordAdminAction(cluster, {
                action: "message.dm",
                actor: "admin-panel",
                targetType: "user",
                targetId: userId,
                message: "Bot üzerinden özel mesaj gönderildi.",
                metadata: {
                    direction: "outbound",
                    username: result.username,
                    content: message,
                    preview: message.slice(0, 300),
                    messageId: result.messageId,
                },
            });

            return res.json(result);
        } catch (error) {
            console.error("API Admin DM Error:", error);
            return res.status(500).json({ error: error.message || "Internal Server Error" });
        }
    });

    router.post("/admin/inbox/:userId/reply", requireAdminToken, async (req, res) => {
        try {
            const userId = String(req.params.userId || "").trim();
            const message = String(req.body?.message || "").trim();

            if (!/^\d{16,22}$/.test(userId)) return res.status(400).json({ error: "Geçerli bir kullanıcı ID'si gerekli." });
            if (!message || message.length > 1900) return res.status(400).json({ error: "Mesaj 1-1900 karakter arasında olmalı." });

            const result = await cluster.eval(
                async (client, context) => {
                    const user = await client.users.fetch(context.userId);
                    const sent = await user.send(context.message);
                    return {
                        ok: true,
                        userId: context.userId,
                        username: user.globalName || user.username,
                        avatar: user.avatar || null,
                        messageId: sent.id,
                    };
                },
                { userId, message },
                10000,
            );

            await recordAdminAction(cluster, {
                action: "message.dm",
                actor: "admin-panel",
                targetType: "user",
                targetId: userId,
                message: "Admin gelen kutusundan özel mesaj yanıtı gönderildi.",
                metadata: {
                    direction: "outbound",
                    username: result.username,
                    avatar: result.avatar,
                    content: message,
                    preview: message.slice(0, 300),
                    messageId: result.messageId,
                },
            });

            return res.json(result);
        } catch (error) {
            console.error("API Admin Inbox Reply Error:", error);
            return res.status(500).json({ error: error.message || "Internal Server Error" });
        }
    });

    router.post("/admin/messages/channel", requireAdminToken, async (req, res) => {
        try {
            const channelId = String(req.body?.channelId || "").trim();
            const message = String(req.body?.message || "").trim();

            if (!/^\d{16,22}$/.test(channelId)) return res.status(400).json({ error: "Geçerli bir kanal ID'si gerekli." });
            if (!message || message.length > 1900) return res.status(400).json({ error: "Mesaj 1-1900 karakter arasında olmalı." });

            const result = await cluster.eval(
                async (client, context) => {
                    const channel = await client.channels.fetch(context.channelId);
                    if (!channel?.isTextBased?.()) return { ok: false, error: "Bu kanal metin mesajı desteklemiyor." };
                    const sent = await channel.send(context.message);
                    return {
                        ok: true,
                        channelId: context.channelId,
                        guildId: channel.guildId || null,
                        messageId: sent.id,
                    };
                },
                { channelId, message },
                10000,
            );

            if (!result.ok) return res.status(400).json(result);

            await recordAdminAction(cluster, {
                action: "message.channel",
                actor: "admin-panel",
                targetType: "channel",
                targetId: channelId,
                message: "Bot üzerinden kanala mesaj gönderildi.",
                metadata: { preview: message.slice(0, 140), guildId: result.guildId, messageId: result.messageId },
            });

            return res.json(result);
        } catch (error) {
            console.error("API Admin Channel Message Error:", error);
            return res.status(500).json({ error: error.message || "Internal Server Error" });
        }
    });

    return router;
};

async function recordAdminAction(cluster, data) {
    try {
        await cluster.eval(
            async (client, context) => {
                const log = {
                    action: context.action,
                    actor: context.actor || "admin-panel",
                    targetType: context.targetType || null,
                    targetId: context.targetId || null,
                    message: context.message || null,
                    metadata: context.metadata || {},
                    createdAt: new Date(),
                };
                const memoryLogs = client.data.get("adminPanelLogs") || [];
                memoryLogs.unshift({ ...log, createdAt: log.createdAt.toISOString() });
                client.data.set("adminPanelLogs", memoryLogs.slice(0, 250));
                await client.adminLog.create(log);
            },
            data,
            10000,
        );
    } catch (error) {
        console.error("Admin action log error:", error);
    }
}

function requireAdminToken(req, res, next) {
    const expectedToken = process.env.DASHBOARD_ADMIN_TOKEN;

    if (!expectedToken) {
        return res.status(503).json({
            error: "Admin API token is not configured",
            hint: "Set DASHBOARD_ADMIN_TOKEN in .env before opening admin dashboard endpoints.",
        });
    }

    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const providedToken = req.headers["x-admin-token"] || bearerToken || req.query.token;

    if (providedToken !== expectedToken) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    return next();
}
