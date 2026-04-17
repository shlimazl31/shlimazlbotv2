const { PermissionsBitField, MessageFlags } = require("discord.js");

module.exports = {
    permissions: async (client, response, command, embed, player, args) => {
        if (command.permissions.bot) {
            if (!response.guild.members.me.permissions.has(command.permissions.bot || [])) {
                embed.setDescription(`Bot bu komutu çalıştırmak için \`${command.permissions.bot.join(", ")}\` izinlerine sahip değil.`);

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        if (command.permissions.user) {
            if (!response.member.permissions.has(command.permissions.user || [])) {
                embed.setDescription(`Bu komutu çalıştırmak için \`${command.permissions.user.join(", ")}\` izinlerine sahip değilsin.`);

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        if (command.settings.voice) {
            if (!response.member.voice.channel) {
                embed.setDescription(`Önce bir ses kanalına katılmalısın.`);

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (
                !response.guild.members.me.permissions.has(PermissionsBitField.Flags.Connect) ||
                !response.guild.members.me.permissionsIn(response.member.voice.channelId).has(PermissionsBitField.Flags.Connect)
            ) {
                embed.setDescription(`Bot, ses kanalınızda \`Bağlan\` iznine sahip değil.`);

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (
                !response.guild.members.me.permissions.has(PermissionsBitField.Flags.Speak) ||
                !response.guild.members.me.permissionsIn(response.member.voice.channelId).has(PermissionsBitField.Flags.Speak)
            ) {
                embed.setDescription(`Bot, ses kanalınızda \`Konuş\` iznine sahip değil.`);

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (response.member.voice.channel.type === 13) {
                if (
                    !response.guild.members.me.permissions.has(PermissionsBitField.Flags.RequestToSpeak) ||
                    !response.guild.members.me.permissionsIn(response.member.voice.channelId).has(PermissionsBitField.Flags.RequestToSpeak)
                ) {
                    embed.setDescription(`Bot, sahne kanalınızda \`Konuşma İsteği\` iznine sahip değil.`);

                    return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }

                if (
                    !response.guild.members.me.permissions.has(PermissionsBitField.Flags.PrioritySpeaker) ||
                    !response.guild.members.me.permissionsIn(response.member.voice.channelId).has(PermissionsBitField.Flags.PrioritySpeaker)
                ) {
                    embed.setDescription(`Bot, sahne kanalınızda \`Öncelikli Konuşmacı\` iznine sahip değil.`);

                    return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }
            }
        }

        if (command.settings.player) {
            if (!player) {
                embed.setDescription(`Bu sunucuda aktif bir oynatıcı yok.`);

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }

            if (player.voiceId !== response.member.voice.channelId) {
                embed.setDescription(`Bot ile aynı ses kanalında olmalısın.`);

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        if (command.settings.current) {
            if (!player.queue.current) {
                embed.setDescription(`Bu sunucuda şu anda çalan bir şarkı yok.`);

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        if (command.devOnly) {
            if (!client.config.dev.includes(response.member.id)) {
                embed.setDescription(`Bu komut sadece geliştiriciler için kullanılabilir.`);

                return response.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
        }

        try {
            await command.run(client, response, player, args);
        } catch (error) {
            console.error(error);
        }
    },
};
