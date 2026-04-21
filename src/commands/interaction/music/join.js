const { MessageFlags } = require("discord.js");
const getBestLavalinkNode = require("../../../functions/getBestLavalinkNode.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "join",
    description: "Ses kanalına katıl",
    category: "music",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: true,
        player: false,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        const guildId = interaction.guildId;
        const embed = createStatusEmbed(client, {
            tone: "info",
            title: t(client, guildId, "music.join.title"),
            guildId,
        });

        if (player) {
            embed.setDescription(t(client, guildId, "music.join.alreadyJoined"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const nodeName = await getBestLavalinkNode(client);

        await client.rainlink.create({
            guildId,
            textId: interaction.channelId,
            voiceId: interaction.member.voice.channelId,
            shardId: interaction.guild.shardId,
            volume: client.config.defaultVolume,
            ...(nodeName && { nodeName }),
            deaf: true,
        });

        embed.setDescription(t(client, guildId, "music.join.joined", { channel: interaction.member.voice.channel }));
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
