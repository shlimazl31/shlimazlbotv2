const { PermissionsBitField, EmbedBuilder } = require("discord.js");
const { canSendNotice } = require("../../../functions/noticeCooldown.js");
const { t } = require("../../../functions/t.js");

const LEAVE_NOTICE_COOLDOWN_MS = 10 * 60 * 1000;

module.exports = async (client, oldState, newState) => {
    if (newState.channelId && newState.channel.type == 13 && newState.guild.members.me.voice.suppress) {
        if (
            newState.guild.members.me.permissions.has(PermissionsBitField.Flags.Speak) ||
            newState.channel.permissionsFor(newState.guild.members.me).has(PermissionsBitField.Flags.Speak)
        ) {
            newState.guild.members.me.voice.setSuppressed(false);
        }
    }

    const newStatePlayer = client.rainlink.players.get(newState.guildId);

    if (newStatePlayer && newState.channelId == null && newState.member?.user.id === client.user?.id) {
        newStatePlayer.state !== 2 ? newStatePlayer.destroy() : true;
    }

    const guildData = client.data.get(`guildData_${newState.guildId || oldState.guildId}`);

    if (guildData && guildData.reconnect.status) return;

    const oldStatePlayer = client.rainlink.players.get(oldState.guildId || newState.guildId);

    if (!oldStatePlayer) return;

    const isBotAlone =
        oldState.guild.members.me.voice?.channel && oldState.guild.members.me.voice.channel.members.filter((member) => !member.user.bot).size === 0;

    const isNotPlaying = !oldStatePlayer.playing && !oldStatePlayer.queue.current;

    if (oldStatePlayer.voiceId || oldState.guild.members.me.voice.channelId === oldState.channelId) {
        if (isBotAlone || isNotPlaying) {
            scheduleLeaveCheck(client, oldState.guild, oldStatePlayer);
        }
    }
};

function scheduleLeaveCheck(client, guild, player) {
    if (!client.voiceLeaveTimers) client.voiceLeaveTimers = new Map();

    const existingTimer = client.voiceLeaveTimers.get(guild.id);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
        client.voiceLeaveTimers.delete(guild.id);

        const activePlayer = client.rainlink.players.get(guild.id);
        const guildData = client.data.get(`guildData_${guild.id}`);
        if (!activePlayer || guildData?.reconnect?.status) return;

        const voiceChannel = guild.members.me.voice.channel;
        const stillBotAlone = voiceChannel?.members.filter((member) => !member.user.bot).size === 0;
        const stillNotPlaying = !activePlayer.playing && !activePlayer.queue.current;

        if (!stillBotAlone && !stillNotPlaying) return;

        if (activePlayer.message) await activePlayer.message.delete().catch(() => {});
        Promise.resolve(activePlayer.destroy()).catch(() => {});

        const leaveChannel = client.channels.cache.get(activePlayer.textId);
        if (!leaveChannel?.send) return;
        if (!canSendNotice(client, `${guild.id}:voice-leave`, LEAVE_NOTICE_COOLDOWN_MS)) return;

        const timeoutEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(t(client, guild.id, "playerEvents.leaveTimeout"));

        leaveChannel.send({ embeds: [timeoutEmbed] }).then((msg) => {
            if (!msg) return;

            setTimeout(() => {
                msg.delete().catch(() => {});
            }, 10000).unref?.();
        }).catch(() => {});
    }, client.config.leaveTimeout);

    timer.unref?.();
    client.voiceLeaveTimers.set(guild.id, timer);
}
