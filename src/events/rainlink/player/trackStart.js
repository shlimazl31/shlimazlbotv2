const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const {
    createNowPlayingComponents,
    refreshNowPlayingMessage,
} = require("../../../functions/createNowPlayingCard.js");
const { sendOrUpdatePlayerMessage } = require("../../../functions/miniPlayer.js");
const {
    COMMAND_PLAN_REQUIREMENTS,
    PLAN_TYPES,
    getPlanLabel,
    hasRequiredPlan,
} = require("../../../functions/premium.js");
const { t } = require("../../../functions/t.js");

const COMPONENT_COMMANDS = {
    loop: "loop",
    shuffle: "shuffle",
    voldown: "volume",
    volup: "volume",
    prev: "previous",
};

module.exports = async (client, player, track) => {
    if (!player) return;

    const nplaying = await sendOrUpdatePlayerMessage(client, player);
    if (!nplaying) return;

    const collector = nplaying.createMessageComponentCollector({ time: 300000 });

    const actionEmbed = (tone, title, description) =>
        createStatusEmbed(client, {
            tone,
            title,
            guildId: player.guildId,
            description,
            thumbnail: player.queue.current?.artworkUrl || track.artworkUrl || client.user.displayAvatarURL(),
        });

    const ensureComponentPlan = async (message, commandName) => {
        const requiredPlan = COMMAND_PLAN_REQUIREMENTS[commandName] || PLAN_TYPES.FREE;
        if (requiredPlan === PLAN_TYPES.FREE || hasRequiredPlan(client, player.guildId, message.user.id, requiredPlan)) {
            return true;
        }

        await message.reply({
            embeds: [
                actionEmbed(
                    "warning",
                    "Premium",
                    t(client, player.guildId, "permissions.planRequired", {
                        command: `/${commandName}`,
                        plan: getPlanLabel(requiredPlan),
                    }),
                ),
            ],
            flags: [MessageFlags.Ephemeral],
        });

        return false;
    };

    collector.on("collect", async (message) => {
        if (!player) return collector.stop();

        // Prevent user from using buttons if they are not in the same voice channel
        if (!message.member.voice.channel || player.voiceId !== message.member.voice.channelId) {
            return message.reply({
                embeds: [actionEmbed("warning", t(client, player.guildId, "playerActions.control"), t(client, player.guildId, "playerActions.sameVoice"))],
                flags: [MessageFlags.Ephemeral],
            });
        }

        // Prevent user from using buttons if they are not the requester
        if (message.user.id !== track.requester.id) {
            return message.reply({
                embeds: [actionEmbed("warning", t(client, player.guildId, "playerActions.permission"), t(client, player.guildId, "playerActions.requesterOnly"))],
                flags: [MessageFlags.Ephemeral],
            });
        }

        switch (message.customId) {
            case "pause":
                await message.deferUpdate();

                if (!player.paused) {
                    player.pause();
                } else {
                    player.resume();
                }

                await refreshNowPlayingMessage(client, player);
                break;
            case "prev":
                if (!(await ensureComponentPlan(message, COMPONENT_COMMANDS.prev))) return;

                if (!player.queue.previous.length) {
                    return message.reply({
                        embeds: [actionEmbed("info", t(client, player.guildId, "music.previous.title"), t(client, player.guildId, "playerActions.previousMissing"))],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                await message.deferUpdate();
                player.previous();
                break;
            case "skip":
                if (player.queue.isEmpty && !client.data.get("autoplay", player.guildId)) {
                    return message.reply({
                        embeds: [actionEmbed("warning", t(client, player.guildId, "music.skip.title"), t(client, player.guildId, "playerActions.skipEmpty"))],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                await message.deferUpdate();
                player.skip();
                break;
            case "loop":
                if (!(await ensureComponentPlan(message, COMPONENT_COMMANDS.loop))) return;

                switch (player.loop) {
                    case "none":
                        player.setLoop("song");
                        await refreshNowPlayingMessage(client, player);
                        return message.reply({
                            embeds: [actionEmbed("success", t(client, player.guildId, "music.loop.title"), t(client, player.guildId, "playerActions.loopSong"))],
                            flags: [MessageFlags.Ephemeral],
                        });
                        break;
                    case "song":
                        player.setLoop("queue");
                        await refreshNowPlayingMessage(client, player);
                        return message.reply({
                            embeds: [actionEmbed("success", t(client, player.guildId, "music.loop.title"), t(client, player.guildId, "playerActions.loopQueue"))],
                            flags: [MessageFlags.Ephemeral],
                        });
                        break;
                    case "queue":
                        player.setLoop("none");
                        await refreshNowPlayingMessage(client, player);
                        return message.reply({
                            embeds: [actionEmbed("info", t(client, player.guildId, "music.loop.title"), t(client, player.guildId, "playerActions.loopOff"))],
                            flags: [MessageFlags.Ephemeral],
                        });
                        break;
                }
            case "shuffle":
                if (!(await ensureComponentPlan(message, COMPONENT_COMMANDS.shuffle))) return;

                if (player.queue.isEmpty) {
                    return message.reply({
                        embeds: [actionEmbed("warning", t(client, player.guildId, "music.shuffle.title"), t(client, player.guildId, "playerActions.shuffleEmpty"))],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                player.queue.shuffle();
                await refreshNowPlayingMessage(client, player);

                return message.reply({
                    embeds: [actionEmbed("success", t(client, player.guildId, "music.shuffle.title"), t(client, player.guildId, "playerActions.shuffled"))],
                    flags: [MessageFlags.Ephemeral],
                });
            case "voldown":
                if (!(await ensureComponentPlan(message, COMPONENT_COMMANDS.voldown))) return;

                if (player.volume <= client.config.minVolume) {
                    return message.reply({
                        embeds: [actionEmbed("warning", t(client, player.guildId, "music.volume.title"), t(client, player.guildId, "playerActions.volumeMin", { volume: client.config.minVolume }))],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                const volumeDown = player.volume - 10;

                player.setVolume(volumeDown);
                await refreshNowPlayingMessage(client, player);

                return message.reply({
                    embeds: [actionEmbed("success", t(client, player.guildId, "music.volume.title"), t(client, player.guildId, "playerActions.volumeSet", { volume: volumeDown }))],
                    flags: [MessageFlags.Ephemeral],
                });
            case "volup":
                if (!(await ensureComponentPlan(message, COMPONENT_COMMANDS.volup))) return;

                if (player.volume >= client.config.maxVolume) {
                    return message.reply({
                        embeds: [actionEmbed("warning", t(client, player.guildId, "music.volume.title"), t(client, player.guildId, "playerActions.volumeMax", { volume: client.config.maxVolume }))],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                const volumeUp = player.volume + 10;

                player.setVolume(volumeUp);
                await refreshNowPlayingMessage(client, player);

                return message.reply({
                    embeds: [actionEmbed("success", t(client, player.guildId, "music.volume.title"), t(client, player.guildId, "playerActions.volumeSet", { volume: volumeUp }))],
                    flags: [MessageFlags.Ephemeral],
                });
            case "stop":
                await message.deferUpdate();
                player.stop();
                break;
        }
    });

    collector.on("end", async () => {
        if (player.message?.id !== nplaying.id) return;
        const disabledComponents = createNowPlayingComponents(client, player, true);

        await nplaying.edit({ components: disabledComponents }).catch(() => null);
    });
};
