const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "skip",
    description: "Şarkıyı atla",
    category: "music",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: true,
        player: true,
        current: true,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        const guildId = interaction.guildId;
        const embed = createStatusEmbed(client, {
            tone: "warning",
            title: t(client, guildId, "music.skip.title"),
            guildId,
        });
        const guildData = client.data.get(`guildData_${guildId}`) || { dj: { status: false, role: null } };
        const hasDJRole = guildData?.dj?.status && interaction.member.roles.cache.has(guildData.dj.role);
        const isAdmin = interaction.member.permissions.has("ManageGuild");

        if (hasDJRole || isAdmin) {
            if (player.queue.isEmpty && !client.data.get("autoplay", player.guildId)) {
                embed.setDescription(t(client, guildId, "music.skip.empty"));
                return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            player.skip();
            embed.setDescription(t(client, guildId, "music.skip.done"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const voiceMembers = interaction.member.voice.channel.members.filter((member) => !member.user.bot);
        const requiredVotes = Math.ceil(voiceMembers.size / 2);

        if (player.voteskip) {
            embed.setDescription(t(client, guildId, "music.skip.voteActive"));
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.voteskip = {
            votes: new Set([interaction.user.id]),
            voters: new Set([interaction.user.id]),
            required: requiredVotes,
        };

        embed.setDescription(t(client, guildId, "music.skip.voteStarted", { votes: player.voteskip.votes.size, required: player.voteskip.required }));
        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });

        const voteMessage = await interaction.channel.send({ embeds: [embed] });
        await voteMessage.react("\u2705").catch(() => null);

        const filter = (reaction, user) =>
            reaction.emoji.name === "\u2705" &&
            !user.bot &&
            interaction.member.voice.channel.members.has(user.id) &&
            !player.voteskip.voters.has(user.id);

        const collector = voteMessage.createReactionCollector({
            filter,
            time: 15000,
            dispose: true,
        });

        collector.on("collect", async (_, user) => {
            if (!player.voteskip) return;

            player.voteskip.voters.add(user.id);
            player.voteskip.votes.add(user.id);

            const progressEmbed = createStatusEmbed(client, {
                tone: "warning",
                title: t(client, guildId, "music.skip.voteTitle"),
                guildId,
                description: t(client, guildId, "music.skip.voteProgress", { votes: player.voteskip.votes.size, required: player.voteskip.required }),
            });

            await voteMessage.edit({ embeds: [progressEmbed] }).catch(() => null);

            if (player.voteskip.votes.size >= player.voteskip.required) {
                player.skip();

                const successEmbed = createStatusEmbed(client, {
                    tone: "success",
                    title: t(client, guildId, "music.skip.voteTitle"),
                    guildId,
                    description: t(client, guildId, "music.skip.votePassed"),
                });

                delete player.voteskip;
                collector.stop("passed");
                await voteMessage.edit({ embeds: [successEmbed] }).catch(() => null);
                await refreshNowPlayingMessage(client, player);
            }
        });

        collector.on("end", async (_, reason) => {
            if (!player.voteskip) return;
            if (reason === "passed") return;

            const failEmbed = createStatusEmbed(client, {
                tone: "error",
                title: t(client, guildId, "music.skip.voteTitle"),
                guildId,
                description: t(client, guildId, "music.skip.voteFailed"),
            });

            delete player.voteskip;
            await voteMessage.edit({ embeds: [failEmbed] }).catch(() => null);
        });
    },
};
