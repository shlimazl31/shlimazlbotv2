const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const createSupportComponents = require("../../../functions/createSupportComponents.js");
const { createBaseEmbed, createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { getBotVersion } = require("../../../functions/getBotVersion.js");
const { t } = require("../../../functions/t.js");

const CATEGORY_CONFIG = [
    { key: "overview", style: ButtonStyle.Primary },
    { key: "music", style: ButtonStyle.Secondary },
    { key: "general", style: ButtonStyle.Secondary },
    { key: "setting", style: ButtonStyle.Secondary },
    { key: "film", style: ButtonStyle.Secondary },
];

module.exports = {
    name: "help",
    description: "Komut listesini göster",
    category: "general",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction) => {
        const groupedCommands = buildGroupedCommands(client, interaction.user.id);
        const components = [
            createHelpButtons(client, interaction.guildId, "overview"),
            ...createSupportComponents(client.config.supportServerUrl, t(client, interaction.guildId, "help.support")),
        ];

        await interaction.reply({
            embeds: [createHelpEmbed(client, interaction, groupedCommands, "overview")],
            components,
        });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({ time: 180000 });

        collector.on("collect", async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
                const deniedEmbed = createStatusEmbed(client, {
                    tone: "warning",
                    title: "Help",
                    guildId: interaction.guildId,
                    description: t(client, interaction.guildId, "help.denied"),
                });

                return buttonInteraction.reply({ embeds: [deniedEmbed], flags: [MessageFlags.Ephemeral] });
            }

            if (!buttonInteraction.customId.startsWith("help_")) {
                return buttonInteraction.deferUpdate();
            }

            const selectedCategory = buttonInteraction.customId.replace("help_", "");

            await buttonInteraction.update({
                embeds: [createHelpEmbed(client, interaction, groupedCommands, selectedCategory)],
                components: [
                    createHelpButtons(client, interaction.guildId, selectedCategory),
                    ...createSupportComponents(client.config.supportServerUrl, t(client, interaction.guildId, "help.support")),
                ],
            });
        });

        collector.on("end", async () => {
            await message
                .edit({
                    components: [
                        createHelpButtons(client, interaction.guildId, "overview", true),
                        ...createSupportComponents(client.config.supportServerUrl, t(client, interaction.guildId, "help.support")),
                    ],
                })
                .catch(() => null);
        });
    },
};

function buildGroupedCommands(client, userId) {
    const groupedCommands = {};

    for (const command of client.slash.values()) {
        if (command.name === "health") continue;
        if (command.devOnly && !client.config.dev.includes(userId)) continue;
        if (!groupedCommands[command.category]) groupedCommands[command.category] = [];
        groupedCommands[command.category].push(command);
    }

    for (const category of Object.keys(groupedCommands)) {
        groupedCommands[category].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groupedCommands;
}

function createHelpEmbed(client, interaction, groupedCommands, selectedCategory) {
    if (selectedCategory === "overview") {
        return createOverviewEmbed(client, interaction, groupedCommands);
    }

    return createCategoryEmbed(client, interaction, groupedCommands, selectedCategory);
}

function createOverviewEmbed(client, interaction, groupedCommands) {
    const categories = Object.keys(groupedCommands).filter((key) => groupedCommands[key]?.length);
    const embed = createBaseEmbed(client, {
        color: 0x5865f2,
        guildId: interaction.guildId,
        author: {
            name: `${client.user.username} | ${t(client, interaction.guildId, "help.title")}`,
            iconURL: client.user.displayAvatarURL(),
        },
        thumbnail: client.user.displayAvatarURL(),
        description: [
            t(client, interaction.guildId, "help.welcome", { member: `**${interaction.member}**` }),
            t(client, interaction.guildId, "help.intro"),
            "",
            `**${t(client, interaction.guildId, "help.quickStartTitle")}**`,
            t(client, interaction.guildId, "help.quickStart"),
        ].join("\n"),
        fields: [
            {
                name: t(client, interaction.guildId, "help.overviewName"),
                value: t(client, interaction.guildId, "help.overviewValue", {
                    commands: Object.values(groupedCommands).reduce((total, commands) => total + commands.length, 0),
                    categories: categories.length,
                }),
                inline: false,
            },
        ],
        footer: {
            text: `${t(client, interaction.guildId, "help.footer")} | v${getBotVersion()}`,
            iconURL: client.user.displayAvatarURL(),
        },
    });

    for (const category of categories) {
        const commands = groupedCommands[category];
        const title = getCategoryName(client, interaction.guildId, category);
        const preview = commands
            .slice(0, 6)
            .map((command) => `\`/${command.name}\``)
            .join("  |  ");
        const extra = commands.length > 6 ? `\n${t(client, interaction.guildId, "help.moreCommands", { count: commands.length - 6 })}` : "";

        embed.addFields({
            name: `${title} (${commands.length})`,
            value: `${preview || `\`${t(client, interaction.guildId, "help.empty")}\``}${extra}`,
            inline: false,
        });
    }

    return embed;
}

function createCategoryEmbed(client, interaction, groupedCommands, category) {
    const commands = groupedCommands[category] || [];
    const title = getCategoryName(client, interaction.guildId, category);
    const embed = createBaseEmbed(client, {
        color: 0x5865f2,
        guildId: interaction.guildId,
        author: {
            name: `${client.user.username} | ${t(client, interaction.guildId, "help.categoryCommands", { category: title })}`,
            iconURL: client.user.displayAvatarURL(),
        },
        thumbnail: client.user.displayAvatarURL(),
        description: t(client, interaction.guildId, "help.categoryDescription", { category: `**${title}**` }),
        footer: {
            text: `${t(client, interaction.guildId, "help.listed", { count: commands.length })} | v${getBotVersion()}`,
            iconURL: client.user.displayAvatarURL(),
        },
    });

    if (!commands.length) {
        embed.addFields({
            name: t(client, interaction.guildId, "help.emptyCategoryTitle"),
            value: t(client, interaction.guildId, "help.emptyCategory"),
            inline: false,
        });

        return embed;
    }

    const commandCards = commands.map((command) => {
        const options = Array.isArray(command.options) && command.options.length
            ? `\n${t(client, interaction.guildId, "help.usage")}: \`/${command.name} ${command.options.map((option) => option.required ? `<${option.name}>` : `[${option.name}]`).join(" ")}\``
            : "";

        return {
            name: `/${command.name}`,
            value: `${command.description || t(client, interaction.guildId, "help.noDescription")}${options}`,
            inline: false,
        };
    });

    embed.addFields(commandCards);
    return embed;
}

function createHelpButtons(client, guildId, selectedCategory, disabled = false) {
    const row = new ActionRowBuilder();

    for (const category of CATEGORY_CONFIG) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`help_${category.key}`)
                .setLabel(getCategoryName(client, guildId, category.key))
                .setStyle(selectedCategory === category.key ? ButtonStyle.Primary : category.style)
                .setDisabled(disabled || selectedCategory === category.key),
        );
    }

    return row;
}

function getCategoryName(client, guildId, category) {
    return t(client, guildId, `help.categories.${category}`) || t(client, guildId, "help.categories.other");
}

