const { VoicePlugin } = require("rainlink-voice");
require("dotenv").config();

function parseBoolean(value) {
    if (typeof value === "string") value = value.trim().toLowerCase();

    switch (value) {
        case "true":
            return true;
        case "false":
            return false;
        default:
            return false;
    }
}

function createLegacyNode() {
    return {
        name: process.env.LAVALINK_NAME || "Shlimazlbot",
        host: process.env.LAVALINK_HOST || "127.0.0.1",
        port: Number(process.env.LAVALINK_PORT || 2333),
        auth: process.env.LAVALINK_AUTH || "",
        secure: parseBoolean(process.env.LAVALINK_SECURE),
        driver: "lavalink/v4",
    };
}

function createIndexedNodes() {
    const nodes = [];

    for (let index = 1; index <= 10; index += 1) {
        const host = process.env[`LAVALINK_${index}_HOST`];
        if (!host) continue;

        nodes.push({
            name: process.env[`LAVALINK_${index}_NAME`] || `Shlimazlbot-${index}`,
            host,
            port: Number(process.env[`LAVALINK_${index}_PORT`] || 2333),
            auth: process.env[`LAVALINK_${index}_AUTH`] || "",
            secure: parseBoolean(process.env[`LAVALINK_${index}_SECURE`]),
            driver: process.env[`LAVALINK_${index}_DRIVER`] || "lavalink/v4",
        });
    }

    return nodes;
}

function createJsonNodes() {
    if (!process.env.LAVALINK_NODES) return [];

    try {
        const parsedNodes = JSON.parse(process.env.LAVALINK_NODES);
        if (!Array.isArray(parsedNodes)) return [];

        return parsedNodes
            .filter((node) => node && node.host)
            .map((node, index) => ({
                name: node.name || `Shlimazlbot-${index + 1}`,
                host: node.host,
                port: Number(node.port || 2333),
                auth: node.auth || "",
                secure: typeof node.secure === "boolean" ? node.secure : parseBoolean(node.secure),
                driver: node.driver || "lavalink/v4",
            }));
    } catch (error) {
        console.error("[WARN] LAVALINK_NODES could not be parsed as JSON:", error.message);
        return [];
    }
}

function resolveLavalinkNodes() {
    const jsonNodes = createJsonNodes();
    if (jsonNodes.length > 0) return jsonNodes;

    const indexedNodes = createIndexedNodes();
    if (indexedNodes.length > 0) return indexedNodes;

    return [createLegacyNode()];
}

function parseNumber(value, fallback) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

module.exports = {
    token: process.env.TOKEN,
    prefix: process.env.PREFIX || "!",
    owner: "106764157105233920",
    dev: ["106764157105233920"],
    embedColor: process.env.EMBED_COLOR || "732241",
    leaveTimeout: parseNumber(process.env.LEAVE_TIMEOUT, 120000),
    defaultVolume: parseNumber(process.env.DEFAULT_VOLUME, 15),
    minVolume: parseNumber(process.env.MIN_VOLUME, 1),
    maxVolume: parseNumber(process.env.MAX_VOLUME, 100),
    mongoUri: process.env.MONGO_URI || "",
    geniusApiKey: process.env.GENIUS_API_KEY || "",
    supportServerUrl: process.env.SUPPORT_SERVER_URL || "https://discord.gg/WPNHxA7PFq",

    lavalinkSource: process.env.LAVALINK_SOURCE || "youtube",
    rainlinkOptions: {
        resume: true,
        resumeTimeout: 5000,
        retryTimeout: 5000,
        retryCount: Infinity,
        defaultSearchEngine: process.env.DEFAULT_SEARCH_ENGINE || "youtube",
        searchFallback: {
            enable: true,
            engine: process.env.DEFAULT_SEARCH_ENGINE || "youtube",
        },
    },
    rainlinkPlugins: [new VoicePlugin()],
    rainlinkNodes: resolveLavalinkNodes(),
};
