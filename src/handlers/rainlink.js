const { readdirSync } = require("fs");

module.exports = (client) => {
    try {
        readdirSync("./src/events/rainlink/").forEach((dir) => {
            const bots = readdirSync(`./src/events/rainlink/${dir}`).filter((file) => file.endsWith(".js"));

            for (const file of bots) {
                const event = require(`../events/rainlink/${dir}/${file}`);
                const eventName = file.split(".")[0];

                client.rainlink.on(eventName, event.bind(null, client));
            }
        });

        console.log("[INFO] Rainlink events loaded");
    } catch (error) {
        console.error(error);
    }
};

module.exports.init = () => {
    // ... existing code ...
};
