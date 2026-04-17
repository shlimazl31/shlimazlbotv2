module.exports = (cluster) => {
    const express = require("express");
    const router = express.Router();

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

    return router;
};
