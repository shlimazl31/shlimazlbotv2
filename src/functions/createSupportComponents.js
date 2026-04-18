const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function isValidHttpUrl(value) {
    if (!value || typeof value !== "string") return false;

    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (error) {
        return false;
    }
}

module.exports = (supportServerUrl, label = "Support Server") => {
    if (!isValidHttpUrl(supportServerUrl)) return [];

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(label).setURL(supportServerUrl).setStyle(ButtonStyle.Link),
    );

    return [row];
};
