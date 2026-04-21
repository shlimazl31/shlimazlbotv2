const { version } = require("../../package.json");

function getBotVersion() {
    return version;
}

module.exports = {
    getBotVersion,
};
