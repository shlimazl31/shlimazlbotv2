const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { refreshNowPlayingMessage } = require("../../../functions/createNowPlayingCard.js");

module.exports = {
    name: "skip",
    description: "Sarkiyi atla",
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
        const embed = createStatusEmbed(client, { tone: "warning", title: "Skip" });
        const guildData = client.data.get(`guildData_${interaction.guildId}`) || { dj: { status: false, role: null } };
        const hasDJRole = guildData?.dj?.status && interaction.member.roles.cache.has(guildData.dj.role);
        const isAdmin = interaction.member.permissions.has("ManageGuild");

        if (hasDJRole || isAdmin) {
            if (player.queue.isEmpty && !client.data.get("autoplay", player.guildId)) {
                embed.setDescription("Kuyruk bos. Atlama yapilamiyor.");
                return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            player.skip();
            embed.setDescription("Sarki atlandi.");
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        const voiceMembers = interaction.member.voice.channel.members.filter((member) => !member.user.bot);
        const requiredVotes = Math.ceil(voiceMembers.size / 2);

        if (player.voteskip) {
            embed.setDescription("Bu sarki icin zaten bir atlama oylamasi aktif.");
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        player.voteskip = {
            votes: new Set([interaction.user.id]),
            voters: new Set([interaction.user.id]),
            required: requiredVotes,
        };

        embed.setDescription(`Atlama oylamasi basladi. **${player.voteskip.votes.size}/${player.voteskip.required}** oy toplandi.`);
        await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });

        const voteMessage = await interaction.channel.send({ embeds: [embed] });
        await voteMessage.react("✅").catch(() => null);

        const filter = (reaction, user) =>
            reaction.emoji.name === "✅" &&
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
                title: "Skip Oylamasi",
                description: `Atlama oylamasi suruyor. **${player.voteskip.votes.size}/${player.voteskip.required}** oy toplandi.`,
            });

            await voteMessage.edit({ embeds: [progressEmbed] }).catch(() => null);

            if (player.voteskip.votes.size >= player.voteskip.required) {
                player.skip();

                const successEmbed = createStatusEmbed(client, {
                    tone: "success",
                    title: "Skip Oylamasi",
                    description: "Yeterli oy toplandi. Sarki atlandi.",
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
                title: "Skip Oylamasi",
                description: "Oylama bitti ama yeterli oy toplanamadi.",
            });

            delete player.voteskip;
            await voteMessage.edit({ embeds: [failEmbed] }).catch(() => null);
        });
    },
};
