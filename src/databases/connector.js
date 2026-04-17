const mongoose = require("mongoose");

module.exports = async (client) => {
    try {
        if (!client.config.mongoUri) {
            console.warn("[WARN] MONGO_URI is not configured; database connection skipped");
            return;
        }

        mongoose.set("strictQuery", false);
        await mongoose.connect(client.config.mongoUri);

        console.log("[INFO] Database events loaded");
    } catch (error) {
        console.error(error);
    }
};
