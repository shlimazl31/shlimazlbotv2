const en = require("../languages/en.js");
const tr = require("../languages/tr.js");
const { getGuildSettings } = require("./guildSettings.js");

const LANGUAGES = { en, tr };

function t(client, guildId, key, variables = {}) {
    const language = getGuildSettings(client, guildId).language || "tr";
    const dictionary = LANGUAGES[language] || LANGUAGES.tr;
    const fallback = LANGUAGES.tr;
    const template = get(dictionary, key) || get(fallback, key) || key;

    return interpolate(template, variables);
}

function get(source, path) {
    return path.split(".").reduce((value, part) => value?.[part], source);
}

function interpolate(template, variables) {
    if (typeof template !== "string") return template;

    return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
}

module.exports = {
    t,
};
