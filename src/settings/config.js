const { VoicePlugin } = require("rainlink-voice");
require("dotenv").config();

module.exports = {
    // GENERAL DETAILS
    token: process.env.TOKEN,
    prefix: "!",
    owner: "106764157105233920", // Bot sahibinin Discord ID'si
    dev: ["106764157105233920"], // Discord ID'nizi buraya ekleyin
    embedColor: "732241",
    leaveTimeout: 120000,
    defaultVolume: 15,
    minVolume: 1,
    maxVolume: 100,
    mongoUri: process.env.MONGO_URI || "",
    geniusApiKey: process.env.GENIUS_API_KEY || "",
    supportServerUrl: process.env.SUPPORT_SERVER_URL || "",

    // RAINLINK DETAILS
    lavalinkSource: "youtube",
    rainlinkOptions: {
        resume: true,
        resumeTimeout: 5000,
        retryTimeout: 5000,
        retryCount: Infinity,
        defaultSearchEngine: "youtube",
        searchFallback: {
            enable: true,
            engine: "youtube",
        },
    },
    rainlinkPlugins: [new VoicePlugin()],
    rainlinkNodes: [
        {
            name: process.env.LAVALINK_NAME || "Shlimazlbot",
            host: process.env.LAVALINK_HOST || "127.0.0.1",
            port: Number(process.env.LAVALINK_PORT || 2333),
            auth: process.env.LAVALINK_AUTH || "",
            secure: process.env.LAVALINK_SECURE === "true",
            driver: "lavalink/v4",
        },
    ],
};

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
