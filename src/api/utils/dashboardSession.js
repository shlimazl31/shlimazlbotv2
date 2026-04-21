const crypto = require("crypto");

const SESSION_COOKIE = "shlimazl_session";
const STATE_COOKIE = "shlimazl_oauth_state";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;
const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;

function requireDashboardSession(req, res, next) {
    const session = verifySession(readCookie(req, SESSION_COOKIE));

    if (!session?.userId) {
        return res.status(401).json({ error: "Login required", loginUrl: "/api/bot/auth/discord" });
    }

    req.session = session;
    return next();
}

function requireOwnerSession(cluster) {
    return async (req, res, next) => {
        try {
            const owner = await cluster.eval(
                (client, context) => client.config.owner === context.userId || client.config.dev.includes(context.userId),
                { userId: req.session.userId },
                10000,
            );

            if (!owner) return res.status(403).json({ error: "Owner access required" });
            return next();
        } catch (error) {
            console.error("Owner session check error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    };
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

    if (providedToken !== expectedToken) return res.status(401).json({ error: "Unauthorized" });
    return next();
}

function createOAuthState(res, req) {
    const state = crypto.randomBytes(24).toString("hex");
    setCookie(res, req, STATE_COOKIE, signSession({ state, exp: Date.now() + STATE_TTL_MS }), STATE_TTL_MS);
    return state;
}

function verifyOAuthState(req, res) {
    const stateSession = verifySession(readCookie(req, STATE_COOKIE));
    clearCookie(res, req, STATE_COOKIE);

    return Boolean(stateSession?.state && stateSession.state === req.query.state);
}

function setDashboardSession(res, req, user) {
    setCookie(
        res,
        req,
        SESSION_COOKIE,
        signSession({
            userId: user.id,
            username: user.username,
            globalName: user.global_name || user.globalName || user.username,
            avatar: user.avatar,
            exp: Date.now() + SESSION_TTL_MS,
        }),
        SESSION_TTL_MS,
    );
}

function clearDashboardSession(res, req) {
    clearCookie(res, req, SESSION_COOKIE);
}

async function exchangeDiscordCode(code, redirectUri) {
    if (!code) throw new Error("Missing Discord OAuth code");

    const body = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
    });
    const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.error_description || payload.error || "Discord token exchange failed");
    return payload;
}

async function fetchDiscord(path, accessToken) {
    const response = await fetch(`https://discord.com/api/v10${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await response.json();

    if (!response.ok) throw new Error(payload.message || "Discord API request failed");
    return payload;
}

function normalizeDiscordGuild(guild) {
    return {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        owner: Boolean(guild.owner),
        permissions: String(guild.permissions || "0"),
        canManage: canManageDiscordGuild(guild),
    };
}

function getDiscordRedirectUri(req) {
    return process.env.DISCORD_REDIRECT_URI || `${getDashboardBaseUrl(req)}/api/bot/auth/callback`;
}

function getDashboardBaseUrl(req) {
    return process.env.DASHBOARD_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function canManageDiscordGuild(guild) {
    if (guild.owner) return true;

    try {
        const permissions = BigInt(guild.permissions || "0");
        return Boolean((permissions & ADMINISTRATOR) === ADMINISTRATOR || (permissions & MANAGE_GUILD) === MANAGE_GUILD);
    } catch (error) {
        return false;
    }
}

function signSession(payload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");

    return `${encodedPayload}.${signature}`;
}

function verifySession(value) {
    if (!value || !value.includes(".")) return null;

    const [encodedPayload, signature] = value.split(".");
    const expectedSignature = crypto.createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");

    if (signature.length !== expectedSignature.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (payload.exp && payload.exp <= Date.now()) return null;

    return payload;
}

function getSessionSecret() {
    return process.env.DASHBOARD_SESSION_SECRET || process.env.DASHBOARD_ADMIN_TOKEN || "local-dashboard-session-secret";
}

function readCookie(req, name) {
    const cookies = String(req.headers.cookie || "").split(";").map((cookie) => cookie.trim()).filter(Boolean);
    const cookie = cookies.find((item) => item.startsWith(`${name}=`));

    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function setCookie(res, req, name, value, maxAgeMs) {
    const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
    const parts = [
        `${name}=${encodeURIComponent(value)}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
    ];

    if (secure) parts.push("Secure");
    res.append("Set-Cookie", parts.join("; "));
}

function clearCookie(res, req, name) {
    const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
    const parts = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];

    if (secure) parts.push("Secure");
    res.append("Set-Cookie", parts.join("; "));
}

module.exports = {
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
};
