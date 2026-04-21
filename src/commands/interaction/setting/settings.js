const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    MessageFlags,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
} = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessageWithSettings } = require("../../../functions/createNowPlayingCard.js");
const { ensureGuildSettings, persistGuildData } = require("../../../functions/guildSettings.js");
const { PREMIUM_FEATURES, getFeatureLabel, hasPremiumFeature } = require("../../../functions/premium.js");
const en = require("../../../languages/en.js");
const tr = require("../../../languages/tr.js");

const PANEL_TIMEOUT_MS = 180000;
const LANGUAGES = { en, tr };

module.exports = {
    name: "settings",
    description: "Sunucu müzik ve görünüm ayar panelini aç",
    category: "setting",
    options: [],
    permissions: {
        bot: [],
        user: ["ManageGuild"],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction) => {
        const guildData = client.data.get(`guildData_${interaction.guildId}`) || { id: interaction.guildId };
        const settings = ensureGuildSettings(guildData);
        const normalized = normalizePremiumSettings(client, interaction.guildId, interaction.user.id, settings);

        if (normalized.changed) await persistGuildData(client, interaction.guildId, guildData);

        const panel = createSettingsPanel(
            client,
            interaction,
            settings,
            normalized.changed ? text(settings, "settings.panel.premiumSettingsReset") : text(settings, "settings.panel.ready"),
        );

        await interaction.reply({
            embeds: [panel.embed],
            components: panel.components,
            flags: [MessageFlags.Ephemeral],
        });
        const reply = await interaction.fetchReply();

        const collector = reply.createMessageComponentCollector({ time: PANEL_TIMEOUT_MS });

        collector.on("collect", async (component) => {
            if (component.user.id !== interaction.user.id) {
                return component.reply({
                    embeds: [
                        createStatusEmbed(client, {
                            tone: "warning",
                            title: "Settings",
                            guildId: interaction.guildId,
                            description: text(settings, "settings.panel.denied"),
                        }),
                    ],
                    flags: [MessageFlags.Ephemeral],
                });
            }

            const result = applyPanelAction(client, component, settings, interaction);

            if (!result.ok) {
                return component.reply({
                    embeds: [
                        createStatusEmbed(client, {
                            tone: "warning",
                            title: "Settings",
                            guildId: interaction.guildId,
                            description: result.message,
                        }),
                    ],
                    flags: [MessageFlags.Ephemeral],
                });
            }

            await persistGuildData(client, interaction.guildId, guildData);
            await refreshActivePlayerCard(client, interaction.guildId, settings);

            const nextPanel = createSettingsPanel(client, interaction, settings, result.message);
            return component.update({ embeds: [nextPanel.embed], components: nextPanel.components });
        });

        collector.on("end", async () => {
            const expiredPanel = createSettingsPanel(client, interaction, settings, text(settings, "settings.panel.expired"));
            await interaction.editReply({
                embeds: [expiredPanel.embed],
                components: createSettingsComponents(client, interaction.guildId, settings, true),
            }).catch(() => null);
        });
    },
};

function applyPanelAction(client, component, settings, interaction) {
    const guildId = interaction.guildId;

    switch (component.customId) {
        case "settings_lang_tr":
            settings.language = "tr";
            return { ok: true, message: text(settings, "settings.panel.languageTr") };
        case "settings_lang_en":
            settings.language = "en";
            return { ok: true, message: text(settings, "settings.panel.languageEn") };
        case "settings_mode_compact":
            settings.playerMode = "compact";
            return { ok: true, message: text(settings, "settings.panel.compact") };
        case "settings_mode_rich":
            if (!canUsePremium(client, guildId, component.user.id, PREMIUM_FEATURES.RICH_PLAYER)) {
                return premiumRequired(client, settings, PREMIUM_FEATURES.RICH_PLAYER, component.user.id);
            }

            settings.playerMode = "rich";
            return { ok: true, message: text(settings, "settings.panel.rich") };
        case "settings_dynamic_toggle":
            if (!settings.dynamicArtworkColor && !canUsePremium(client, guildId, component.user.id, PREMIUM_FEATURES.DYNAMIC_ARTWORK_COLOR)) {
                return premiumRequired(client, settings, PREMIUM_FEATURES.DYNAMIC_ARTWORK_COLOR, component.user.id);
            }

            settings.dynamicArtworkColor = !settings.dynamicArtworkColor;
            return {
                ok: true,
                message: text(settings, "settings.panel.dynamicToggle", {
                    state: text(settings, settings.dynamicArtworkColor ? "settings.panel.dynamicOnState" : "settings.panel.dynamicOffState"),
                }),
            };
        case "settings_music_channel_select":
            settings.musicChannelId = component.values[0];
            return { ok: true, message: text(settings, "settings.panel.musicChannelSet", { channel: `<#${component.values[0]}>` }) };
        case "settings_allowed_role_select":
            if (!settings.allowedRoleIds.includes(component.values[0])) settings.allowedRoleIds.push(component.values[0]);
            return { ok: true, message: text(settings, "settings.panel.roleAdded", { role: `<@&${component.values[0]}>` }) };
        case "settings_theme_select":
            settings.themeColor = component.values[0] === "default" ? null : component.values[0];
            return {
                ok: true,
                message: settings.themeColor
                    ? text(settings, "settings.panel.themeSet", { color: settings.themeColor })
                    : text(settings, "settings.panel.themeReset"),
            };
        case "settings_music_clear":
            settings.musicChannelId = null;
            return { ok: true, message: text(settings, "settings.panel.musicChannelClear") };
        case "settings_roles_clear":
            settings.allowedRoleIds = [];
            return { ok: true, message: text(settings, "settings.panel.rolesCleared") };
        case "settings_mini_setup_current":
            if (!canUsePremium(client, guildId, component.user.id, PREMIUM_FEATURES.MINI_PLAYER)) {
                return premiumRequired(client, settings, PREMIUM_FEATURES.MINI_PLAYER, component.user.id);
            }

            settings.miniPlayer.enabled = true;
            settings.miniPlayer.channelId = interaction.channelId;
            settings.miniPlayer.messageId = null;
            return { ok: true, message: text(settings, "settings.panel.fixedPanelSet", { channel: `${interaction.channel}` }) };
        case "settings_mini_disable":
            settings.miniPlayer.enabled = false;
            settings.miniPlayer.channelId = null;
            settings.miniPlayer.messageId = null;
            return { ok: true, message: text(settings, "settings.panel.fixedPanelDisabled") };
        default:
            return { ok: false, message: text(settings, "settings.panel.unknown") };
    }
}

function createSettingsPanel(client, interaction, settings, message) {
    const guildId = interaction.guildId;
    const embed = createStatusEmbed(client, {
        tone: "info",
        title: text(settings, "settings.panel.title"),
        guildId,
        description: [
            message,
            "",
            text(settings, "settings.panel.intro"),
        ].join("\n"),
        fields: [
            { name: text(settings, "settings.fields.language"), value: `\`${settings.language === "en" ? "English" : "Türkçe"}\``, inline: true },
            { name: text(settings, "settings.fields.playerMode"), value: `\`${formatPlayerMode(settings)}\``, inline: true },
            {
                name: text(settings, "settings.fields.dynamicColor"),
                value: settings.dynamicArtworkColor ? `\`${text(settings, "common.enabled")}\`` : `\`${text(settings, "common.disabled")}\``,
                inline: true,
            },
            {
                name: text(settings, "settings.fields.musicChannel"),
                value: settings.musicChannelId ? `<#${settings.musicChannelId}>` : `\`${text(settings, "settings.panel.unrestricted")}\``,
                inline: true,
            },
            {
                name: text(settings, "settings.fields.theme"),
                value: settings.themeColor ? `\`${settings.themeColor}\`` : `\`${text(settings, "common.default")}\``,
                inline: true,
            },
            {
                name: text(settings, "settings.panel.fixedMusicPanel"),
                value: settings.miniPlayer.enabled ? `<#${settings.miniPlayer.channelId}>` : `\`${text(settings, "common.disabled")}\``,
                inline: true,
            },
            {
                name: text(settings, "settings.fields.allowedRoles"),
                value: settings.allowedRoleIds.length ? settings.allowedRoleIds.map((roleId) => `<@&${roleId}>`).join(", ") : `\`${text(settings, "settings.panel.everyone")}\``,
                inline: false,
            },
        ],
    });

    return {
        embed,
        components: createSettingsComponents(client, guildId, settings),
    };
}

function canUsePremium(client, guildId, userId, feature) {
    return hasPremiumFeature(client, guildId, feature, userId);
}

function premiumRequired(client, settings, feature, userId) {
    const key = isDeveloper(client, userId) ? "settings.panel.premiumRequiredOwner" : "settings.panel.premiumRequired";

    return {
        ok: false,
        message: text(settings, key, { feature: getFeatureLabel(feature) }),
    };
}

function isDeveloper(client, userId) {
    return Array.isArray(client.config?.dev) && client.config.dev.includes(userId);
}

function normalizePremiumSettings(client, guildId, userId, settings) {
    let changed = false;

    if (settings.playerMode === "rich" && !hasPremiumFeature(client, guildId, PREMIUM_FEATURES.RICH_PLAYER, userId)) {
        settings.playerMode = "compact";
        changed = true;
    }

    if (settings.dynamicArtworkColor && !hasPremiumFeature(client, guildId, PREMIUM_FEATURES.DYNAMIC_ARTWORK_COLOR, userId)) {
        settings.dynamicArtworkColor = false;
        changed = true;
    }

    if (settings.miniPlayer.enabled && !hasPremiumFeature(client, guildId, PREMIUM_FEATURES.MINI_PLAYER, userId)) {
        settings.miniPlayer.enabled = false;
        settings.miniPlayer.channelId = null;
        settings.miniPlayer.messageId = null;
        changed = true;
    }

    return { changed };
}

function createSettingsComponents(client, guildId, settings, disabled = false) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("settings_lang_tr").setLabel(text(settings, "settings.panel.labels.turkish")).setStyle(settings.language === "tr" ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId("settings_lang_en").setLabel(text(settings, "settings.panel.labels.english")).setStyle(settings.language === "en" ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId("settings_mode_compact").setLabel(text(settings, "settings.panel.labels.compact")).setStyle(settings.playerMode === "compact" ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId("settings_mode_rich").setLabel(text(settings, "settings.panel.labels.rich")).setStyle(settings.playerMode === "rich" ? ButtonStyle.Primary : ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId("settings_dynamic_toggle").setLabel(text(settings, settings.dynamicArtworkColor ? "settings.panel.labels.artworkOn" : "settings.panel.labels.artworkOff")).setStyle(settings.dynamicArtworkColor ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(disabled),
        ),
        new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId("settings_music_channel_select")
                .setPlaceholder(text(settings, "settings.panel.placeholders.musicChannel"))
                .setChannelTypes(ChannelType.GuildText)
                .setMinValues(1)
                .setMaxValues(1)
                .setDisabled(disabled),
        ),
        new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
                .setCustomId("settings_allowed_role_select")
                .setPlaceholder(text(settings, "settings.panel.placeholders.allowedRole"))
                .setMinValues(1)
                .setMaxValues(1)
                .setDisabled(disabled),
        ),
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("settings_theme_select")
                .setPlaceholder(text(settings, "settings.panel.placeholders.theme"))
                .addOptions(createThemeOptions(settings))
                .setMinValues(1)
                .setMaxValues(1)
                .setDisabled(disabled),
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("settings_music_clear").setLabel(text(settings, "settings.panel.labels.clearChannel")).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId("settings_roles_clear").setLabel(text(settings, "settings.panel.labels.clearRoles")).setStyle(ButtonStyle.Secondary).setDisabled(disabled),
            new ButtonBuilder().setCustomId("settings_mini_setup_current").setLabel(text(settings, "settings.panel.labels.setupPanel")).setStyle(ButtonStyle.Success).setDisabled(disabled),
            new ButtonBuilder().setCustomId("settings_mini_disable").setLabel(text(settings, "settings.panel.labels.disablePanel")).setStyle(ButtonStyle.Danger).setDisabled(disabled),
        ),
    ];
}

function createThemeOptions(settings) {
    return [
        { label: text(settings, "settings.panel.themes.default"), value: "default", description: text(settings, "settings.panel.themes.defaultDescription") },
        { label: "Neon Blue", value: "#4F7CFF", description: text(settings, "settings.panel.themes.blueDescription") },
        { label: "Lime Green", value: "#2ECC71", description: text(settings, "settings.panel.themes.greenDescription") },
        { label: "Amber", value: "#F39C12", description: text(settings, "settings.panel.themes.amberDescription") },
        { label: "Rose", value: "#FF4D8D", description: text(settings, "settings.panel.themes.roseDescription") },
        { label: "Purple Night", value: "#8E5CFF", description: text(settings, "settings.panel.themes.purpleDescription") },
    ];
}

function text(settings, key, variables = {}) {
    const dictionary = LANGUAGES[settings.language] || LANGUAGES.tr;
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

async function refreshActivePlayerCard(client, guildId, settings) {
    const player = client.rainlink?.players?.get(guildId);
    if (!player?.queue?.current || !player.message) return;

    await refreshNowPlayingMessageWithSettings(client, player, settings);
}

function formatPlayerMode(settings) {
    return settings.playerMode === "rich"
        ? text(settings, "settings.panel.labels.rich")
        : text(settings, "settings.panel.labels.compact");
}


