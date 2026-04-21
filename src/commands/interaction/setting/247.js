const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { PREMIUM_FEATURES } = require("../../../functions/premium.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "247",
    description: "Toggle 247 mode",
    category: "setting",
    permissions: {
        bot: [],
        user: ["ManageGuild"],
    },
    settings: {
        voice: true,
        player: true,
        current: false,
    },
    premium: PREMIUM_FEATURES.MODE_247,
    devOnly: false,
    run: async (client, interaction, player) => {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const guildId = interaction.guildId;
        const guildData = client.data.get(`guildData_${guildId}`);

        guildData.reconnect.status = !guildData.reconnect.status;
        guildData.reconnect.text = player.textId || interaction.channelId;
        guildData.reconnect.voice = player.voiceId || interaction.member.voice.channelId;

        const embed = createStatusEmbed(client, {
            tone: "info",
            title: t(client, guildId, "music.mode247.title"),
            guildId,
            description: t(client, guildId, guildData.reconnect.status ? "music.mode247.enabled" : "music.mode247.disabled"),
        });

        return interaction.editReply({ embeds: [embed] });
    },
};
