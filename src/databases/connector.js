const mongoose = require("mongoose");

let listenersRegistered = false;

module.exports = async (client) => {
    try {
        if (!client.config.mongoUri) {
            console.warn("[WARN] MONGO_URI is not configured; database connection skipped");
            return;
        }

        mongoose.set("strictQuery", false);
        registerConnectionListeners();
        await mongoose.connect(client.config.mongoUri, {
            maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
            minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 0),
            serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 15000),
            connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 15000),
            socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
            heartbeatFrequencyMS: Number(process.env.MONGO_HEARTBEAT_FREQUENCY_MS || 10000),
        });

        console.log("[INFO] Database events loaded");
    } catch (error) {
        console.error(error);
    }
};

function registerConnectionListeners() {
    if (listenersRegistered) return;
    listenersRegistered = true;

    mongoose.connection.on("disconnected", () => {
        console.warn("[WARN] MongoDB disconnected");
    });
    mongoose.connection.on("reconnected", () => {
        console.log("[INFO] MongoDB reconnected");
    });
    mongoose.connection.on("error", (error) => {
        console.error("[ERROR] MongoDB connection error:", error.message);
    });
}
