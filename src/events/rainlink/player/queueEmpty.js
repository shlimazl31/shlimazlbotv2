const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { disablePlayerMessage } = require("../../../functions/miniPlayer.js");
const { canSendNotice } = require("../../../functions/noticeCooldown.js");
const { t } = require("../../../functions/t.js");

const LEAVE_NOTICE_COOLDOWN_MS = 10 * 60 * 1000;

module.exports = async (client, player) => {
    if (!player) return;

    await disablePlayerMessage(client, player);

    const isAutoplayEnabled = client.data.get("autoplay", player.guildId);

    if (isAutoplayEnabled) {
        const track = player.queue.previous[0];
        const getTrack = `https://music.youtube.com/watch?v=${track.identifier}&list=RD${track.identifier}`;
        const result = await client.rainlink.search(getTrack, { requester: track.requester });

        if (!result || !result.tracks || !result.tracks.length) {
            client.data.delete("autoplay", player.guildId);
            return player.destroy();
        }

        const randomTrack = result.tracks[Math.floor(Math.random() * result.tracks.length)];

        player.queue.add(randomTrack);
        if (!player.playing) player.play();
        return;
    }

    const guildData = client.data.get(`guildData_${player.guildId}`);
    if (guildData && guildData.reconnect.status) return;

    setTimeout(async () => {
        const updatedPlayer = client.rainlink.players.get(player.guildId);
        const updatedGuildData = client.data.get(`guildData_${player.guildId}`);

        if (updatedPlayer && !updatedPlayer.playing && updatedPlayer.queue.isEmpty && !updatedGuildData?.reconnect.status) {
            const timeoutEmbed = createStatusEmbed(client, {
                tone: "info",
                title: t(client, player.guildId, "music.leave.title"),
                guildId: player.guildId,
                description: t(client, player.guildId, "playerEvents.leaveTimeout"),
            });

            const textChannel = await client.channels.cache.get(updatedPlayer.textId);
            const canNotify = canSendNotice(client, `${player.guildId}:voice-leave`, LEAVE_NOTICE_COOLDOWN_MS);
            if (canNotify && textChannel) await textChannel.send({ embeds: [timeoutEmbed] });
            updatedPlayer.destroy();
        }
    }, client.config.leaveTimeout);
};
