const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const {
    createNowPlayingEmbed,
    createNowPlayingComponents,
    refreshNowPlayingMessage,
    startNowPlayingRefresh,
} = require("../../../functions/createNowPlayingCard.js");

module.exports = async (client, player, track) => {
    if (!player) return;

    const trackMsg = createNowPlayingEmbed(client, player);
    const components = createNowPlayingComponents(client, player);
    const nplaying = await client.channels.cache.get(player.textId).send({ embeds: [trackMsg], components });
    player.message = nplaying;
    startNowPlayingRefresh(client, player);

    const collector = nplaying.createMessageComponentCollector();

    const actionEmbed = (tone, title, description) =>
        createStatusEmbed(client, {
            tone,
            title,
            description,
            thumbnail: player.queue.current?.artworkUrl || track.artworkUrl || client.user.displayAvatarURL(),
        });

    collector.on("collect", async (message) => {
        if (!player) return collector.stop();

        // Prevent user from using buttons if they are not in the same voice channel
        if (!message.member.voice.channel || player.voiceId !== message.member.voice.channelId) {
            return message.reply({
                embeds: [actionEmbed("warning", "Kontrol", "Bot ile ayni ses kanalinda olmalisin.")],
                flags: [MessageFlags.Ephemeral],
            });
        }

        // Prevent user from using buttons if they are not the requester
        if (message.user.id !== track.requester.id) {
            return message.reply({
                embeds: [actionEmbed("warning", "Yetki", "Bu butonlari sadece sarkiyi isteyen kisi kullanabilir.")],
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
                if (!player.queue.previous.length) {
                    return message.reply({
                        embeds: [actionEmbed("info", "Onceki", "Onceki sarki bulunamadi.")],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                await message.deferUpdate();
                player.previous();
                break;
            case "skip":
                if (player.queue.isEmpty && !client.data.get("autoplay", player.guildId)) {
                    return message.reply({
                        embeds: [actionEmbed("warning", "Skip", "Kuyruk bos. Sarki gecilemiyor.")],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                await message.deferUpdate();
                player.skip();
                break;
            case "loop":
                switch (player.loop) {
                    case "none":
                        player.setLoop("song");
                        await refreshNowPlayingMessage(client, player);
                        return message.reply({
                            embeds: [actionEmbed("success", "Dongu", "Dongu modu `sarki` olarak ayarlandi.")],
                            flags: [MessageFlags.Ephemeral],
                        });
                        break;
                    case "song":
                        player.setLoop("queue");
                        await refreshNowPlayingMessage(client, player);
                        return message.reply({
                            embeds: [actionEmbed("success", "Dongu", "Dongu modu `kuyruk` olarak ayarlandi.")],
                            flags: [MessageFlags.Ephemeral],
                        });
                        break;
                    case "queue":
                        player.setLoop("none");
                        await refreshNowPlayingMessage(client, player);
                        return message.reply({
                            embeds: [actionEmbed("info", "Dongu", "Dongu modu `kapali` olarak ayarlandi.")],
                            flags: [MessageFlags.Ephemeral],
                        });
                        break;
                }
            case "shuffle":
                if (player.queue.isEmpty) {
                    return message.reply({
                        embeds: [actionEmbed("warning", "Karistir", "Kuyruk bos. Karistirma yapilamiyor.")],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                player.queue.shuffle();
                await refreshNowPlayingMessage(client, player);

                return message.reply({
                    embeds: [actionEmbed("success", "Karistir", "Kuyruk karistirildi.")],
                    flags: [MessageFlags.Ephemeral],
                });
            case "voldown":
                if (player.volume <= client.config.minVolume) {
                    return message.reply({
                        embeds: [actionEmbed("warning", "Ses", `Ses \`${client.config.minVolume}%\` altina inemez.`)],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                const volumeDown = player.volume - 10;

                player.setVolume(volumeDown);
                await refreshNowPlayingMessage(client, player);

                return message.reply({
                    embeds: [actionEmbed("success", "Ses", `Ses seviyesi \`${volumeDown}%\` olarak ayarlandi.`)],
                    flags: [MessageFlags.Ephemeral],
                });
            case "volup":
                if (player.volume >= client.config.maxVolume) {
                    return message.reply({
                        embeds: [actionEmbed("warning", "Ses", `Ses \`${client.config.maxVolume}%\` ustune cikamaz.`)],
                        flags: [MessageFlags.Ephemeral],
                    });
                }

                const volumeUp = player.volume + 10;

                player.setVolume(volumeUp);
                await refreshNowPlayingMessage(client, player);

                return message.reply({
                    embeds: [actionEmbed("success", "Ses", `Ses seviyesi \`${volumeUp}%\` olarak ayarlandi.`)],
                    flags: [MessageFlags.Ephemeral],
                });
            case "stop":
                await message.deferUpdate();
                player.stop();
                break;
        }
    });
};
