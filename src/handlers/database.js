module.exports = async (client) => {
    require("../databases/connector.js")(client);
    require("../databases/updater.js")(client);
};

// ... existing code ...
