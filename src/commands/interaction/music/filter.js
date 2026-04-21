const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { canUseFilter, getEffectivePlan, getFilterRequiredPlan, getPlanLabel } = require("../../../functions/premium.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "filter",
    description: "Filtre ayarla",
    category: "music",
    options: [
        {
            name: "mode",
            description: "Bir filtre seçin",
            type: 3,
            required: true,
            choices: [
                { name: "8d", value: "eightD" },
                { name: "bass", value: "bass" },
                { name: "chipmunk", value: "chimpunk" },
                { name: "clear", value: "clear" },
                { name: "earrape", value: "earrape" },
                { name: "electronic", value: "electronic" },
                { name: "karaoke", value: "karaoke" },
                { name: "nightcore", value: "nightcore" },
                { name: "pitch", value: "pitch" },
                { name: "slow", value: "slow" },
                { name: "soft", value: "soft" },
                { name: "tremolo", value: "tremolo" },
                { name: "treblebass", value: "treblebass" },
                { name: "vaporwave", value: "vaporwave" },
                { name: "vibrato", value: "vibrato" },
            ],
        },
    ],
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: true,
        player: true,
        current: true,
    },
    requiredPlan: "plus",
    devOnly: false,
    run: async (client, interaction, player) => {
        const guildId = interaction.guildId;
        const embed = createStatusEmbed(client, {
            tone: "info",
            title: t(client, guildId, "music.filter.title"),
            guildId,
        });
        const mode = interaction.options.getString("mode");
        const plan = getEffectivePlan(client, guildId, interaction.user.id);

        if (!canUseFilter(plan, mode)) {
            embed.setDescription(
                t(client, guildId, "permissions.filterPlanRequired", {
                    filter: mode,
                    plan: getPlanLabel(getFilterRequiredPlan(mode)),
                }),
            );
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const currentVolume = player.volume;
        player.filter.set(mode);
        player.setVolume(currentVolume);

        embed.setDescription(
            mode === "clear"
                ? t(client, guildId, "music.filter.cleared")
                : t(client, guildId, "music.filter.set", { mode }),
        );

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
