const { PermissionsBitField, MessageFlags } = require("discord.js");
const { canBypassMusicGuards, getGuildSettings, isMusicCommand } = require("./guildSettings.js");
const { getCommandRequiredPlan, getFeatureLabel, getPlanLabel, hasPremiumFeature, hasRequiredPlan, PLAN_TYPES } = require("./premium.js");
const { t } = require("./t.js");

module.exports = {
    permissions: async (client, response, command, embed, player, args) => {
        const guildId = response.guildId;
        const translate = (key, variables) => t(client, guildId, key, variables);

        if (command.permissions.bot) {
            if (!response.guild.members.me.permissions.has(command.permissions.bot || [])) {
                embed.setDescription(translate("permissions.botMissing", { permissions: command.permissions.bot.join(", ") }));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        if (command.permissions.user) {
            if (!response.member.permissions.has(command.permissions.user || [])) {
                embed.setDescription(translate("permissions.userMissing", { permissions: command.permissions.user.join(", ") }));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        if (isMusicCommand(command) && !canBypassMusicGuards(client, response.member)) {
            const guildSettings = getGuildSettings(client, response.guildId);

            if (guildSettings.musicChannelId && response.channelId !== guildSettings.musicChannelId) {
                embed.setDescription(translate("permissions.musicChannelOnly", { channel: `<#${guildSettings.musicChannelId}>` }));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (guildSettings.allowedRoleIds.length > 0) {
                const hasAllowedRole = guildSettings.allowedRoleIds.some((roleId) => response.member.roles.cache.has(roleId));

                if (!hasAllowedRole) {
                    const roles = guildSettings.allowedRoleIds.map((roleId) => `<@&${roleId}>`).join(", ");
                    embed.setDescription(translate("permissions.allowedRolesOnly", { roles }));

                    return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }
            }
        }

        if (command.settings.voice) {
            if (!response.member.voice.channel) {
                embed.setDescription(translate("permissions.needVoice"));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (
                !response.guild.members.me.permissions.has(PermissionsBitField.Flags.Connect) ||
                !response.guild.members.me.permissionsIn(response.member.voice.channelId).has(PermissionsBitField.Flags.Connect)
            ) {
                embed.setDescription(translate("permissions.botNoConnect"));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (
                !response.guild.members.me.permissions.has(PermissionsBitField.Flags.Speak) ||
                !response.guild.members.me.permissionsIn(response.member.voice.channelId).has(PermissionsBitField.Flags.Speak)
            ) {
                embed.setDescription(translate("permissions.botNoSpeak"));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (response.member.voice.channel.type === 13) {
                if (
                    !response.guild.members.me.permissions.has(PermissionsBitField.Flags.RequestToSpeak) ||
                    !response.guild.members.me.permissionsIn(response.member.voice.channelId).has(PermissionsBitField.Flags.RequestToSpeak)
                ) {
                    embed.setDescription(translate("permissions.botNoStageRequest"));

                    return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }

                if (
                    !response.guild.members.me.permissions.has(PermissionsBitField.Flags.PrioritySpeaker) ||
                    !response.guild.members.me.permissionsIn(response.member.voice.channelId).has(PermissionsBitField.Flags.PrioritySpeaker)
                ) {
                    embed.setDescription(translate("permissions.botNoPriority"));

                    return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }
            }
        }

        if (command.settings.player) {
            if (!player) {
                embed.setDescription(translate("permissions.noPlayer"));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (player.voiceId !== response.member.voice.channelId) {
                embed.setDescription(translate("permissions.sameVoice"));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        if (command.settings.current) {
            if (!player.queue.current) {
                embed.setDescription(translate("permissions.noCurrent"));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        if (command.devOnly) {
            if (!client.config.dev.includes(response.member.id)) {
                embed.setDescription(translate("permissions.devOnly"));

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        const requiredPlan = getCommandRequiredPlan(command);

        if (requiredPlan !== PLAN_TYPES.FREE && !hasRequiredPlan(client, guildId, response.member.id, requiredPlan)) {
            embed.setDescription(
                translate("permissions.planRequired", {
                    command: `/${command.name}`,
                    plan: getPlanLabel(requiredPlan),
                }),
            );

            return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        if (command.premium && !hasPremiumFeature(client, guildId, command.premium, response.member.id)) {
            embed.setDescription(translate("permissions.premiumRequired", { feature: getFeatureLabel(command.premium) }));

            return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        try {
            await command.run(client, response, player, args);
        } catch (error) {
            console.error(error);

            embed.setDescription(translate("permissions.commandError"));

            if (response.deferred) {
                return response.editReply({ embeds: [embed], components: [] }).catch(() => null);
            }

            if (response.replied) {
                return response.followUp({ embeds: [embed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
            }

            if (typeof response.reply === "function") {
                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] }).catch(() => null);
            }
        }
    },
};
