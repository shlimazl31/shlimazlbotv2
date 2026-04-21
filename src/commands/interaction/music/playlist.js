const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { getEffectivePlan, getPlanLimits } = require("../../../functions/premium.js");

module.exports = {
    name: "playlist",
    description: "Kişisel çalma listelerini yönet",
    category: "music",
    options: [
        {
            name: "create",
            description: "Özel isimle yeni bir playlist oluştur",
            type: 1,
            options: [
                {
                    name: "name",
                    description: "Playlist adı",
                    type: 3,
                    required: true,
                    min_length: 2,
                    max_length: 40,
                },
            ],
        },
        {
            name: "save",
            description: "Mevcut kuyruğu yeni bir playlist olarak kaydet",
            type: 1,
            options: [
                {
                    name: "name",
                    description: "Playlist adı",
                    type: 3,
                    required: true,
                    min_length: 2,
                    max_length: 40,
                },
            ],
        },
        {
            name: "manage",
            description: "Playlist içine şarkı ekle, çıkar veya playlisti sil",
            type: 1,
            options: [
                {
                    name: "action",
                    description: "Yapılacak işlem",
                    type: 3,
                    required: true,
                    choices: [
                        { name: "add", value: "add" },
                        { name: "remove", value: "remove" },
                        { name: "delete", value: "delete" },
                    ],
                },
                {
                    name: "playlist",
                    description: "Playlist adı",
                    type: 3,
                    required: true,
                    min_length: 2,
                    max_length: 40,
                },
                {
                    name: "value",
                    description: "add için şarkı adı/URL, remove için şarkı numarası",
                    type: 3,
                    required: false,
                    max_length: 200,
                },
            ],
        },
        {
            name: "library",
            description: "Oluşturduğun playlistleri ve beğenilen şarkıları göster",
            type: 1,
        },
    ],
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    requiredPlan: "pro",
    devOnly: false,
    run: async (client, interaction, player) => {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "library") return showLibrary(client, interaction);
        if (subcommand === "create") return createPlaylist(client, interaction);
        if (subcommand === "save") return saveQueue(client, interaction, player);
        if (subcommand === "manage") return managePlaylist(client, interaction);

        return interaction.reply({
            embeds: [status(client, interaction, "warning", "Playlist", "Bilinmeyen playlist işlemi.")],
            flags: [MessageFlags.Ephemeral],
        });
    },
};

async function createPlaylist(client, interaction) {
    const name = normalizePlaylistName(interaction.options.getString("name"));
    const userData = getCachedUserData(client, interaction.user.id);
    const playlists = ensurePlaylists(userData);

    if (findPlaylist(playlists, name)) {
        return interaction.reply({
            embeds: [status(client, interaction, "warning", "Playlist", `**${name}** adında bir playlist zaten var.`)],
            flags: [MessageFlags.Ephemeral],
        });
    }

    playlists.push({ name, tracks: [], createdAt: new Date(), updatedAt: new Date() });
    await persistUserPlaylists(client, interaction.user.id, userData);

    return interaction.reply({
        embeds: [status(client, interaction, "success", "Playlist", `**${name}** playlisti oluşturuldu.`)],
        flags: [MessageFlags.Ephemeral],
    });
}

async function saveQueue(client, interaction, player) {
    const name = normalizePlaylistName(interaction.options.getString("name"));

    if (!player?.queue?.current) {
        return interaction.reply({
            embeds: [status(client, interaction, "warning", "Playlist", "Kaydedilecek aktif bir kuyruk yok.")],
            flags: [MessageFlags.Ephemeral],
        });
    }

    const userData = getCachedUserData(client, interaction.user.id);
    const playlists = ensurePlaylists(userData);

    if (findPlaylist(playlists, name)) {
        return interaction.reply({
            embeds: [status(client, interaction, "warning", "Playlist", `**${name}** adında bir playlist zaten var.`)],
            flags: [MessageFlags.Ephemeral],
        });
    }

    const plan = getEffectivePlan(client, interaction.guildId, interaction.user.id);
    const limits = getPlanLimits(plan);
    const queuedTracks = getQueuedTracks(player.queue);
    const tracks = [player.queue.current, ...queuedTracks]
        .filter(Boolean)
        .slice(0, limits.playlistTracks)
        .map(serializeTrack);

    playlists.push({ name, tracks, createdAt: new Date(), updatedAt: new Date() });
    await persistUserPlaylists(client, interaction.user.id, userData);

    return interaction.reply({
        embeds: [status(client, interaction, "success", "Playlist", `Mevcut kuyruktan **${tracks.length} şarkı** **${name}** playlistine kaydedildi.`)],
        flags: [MessageFlags.Ephemeral],
    });
}

async function managePlaylist(client, interaction) {
    const action = interaction.options.getString("action");
    const name = normalizePlaylistName(interaction.options.getString("playlist"));
    const value = interaction.options.getString("value");
    const userData = getCachedUserData(client, interaction.user.id);
    const playlists = ensurePlaylists(userData);
    const playlist = findPlaylist(playlists, name);

    if (!playlist && action !== "delete") {
        return interaction.reply({
            embeds: [status(client, interaction, "warning", "Playlist", `**${name}** playlisti bulunamadı.`)],
            flags: [MessageFlags.Ephemeral],
        });
    }

    if (action === "delete") {
        const index = playlists.findIndex((item) => sameName(item.name, name));
        if (index === -1) {
            return interaction.reply({
                embeds: [status(client, interaction, "warning", "Playlist", `**${name}** playlisti bulunamadı.`)],
                flags: [MessageFlags.Ephemeral],
            });
        }

        playlists.splice(index, 1);
        await persistUserPlaylists(client, interaction.user.id, userData);
        return interaction.reply({
            embeds: [status(client, interaction, "success", "Playlist", `**${name}** playlisti silindi.`)],
            flags: [MessageFlags.Ephemeral],
        });
    }

    if (action === "remove") {
        const position = Number(value);
        if (!Number.isInteger(position) || position < 1 || position > playlist.tracks.length) {
            return interaction.reply({
                embeds: [status(client, interaction, "warning", "Playlist", "Silmek için geçerli bir şarkı numarası girmelisin.")],
                flags: [MessageFlags.Ephemeral],
            });
        }

        const [removed] = playlist.tracks.splice(position - 1, 1);
        playlist.updatedAt = new Date();
        await persistUserPlaylists(client, interaction.user.id, userData);
        return interaction.reply({
            embeds: [status(client, interaction, "success", "Playlist", `**${removed?.title || "Şarkı"}** playlistten kaldırıldı.`)],
            flags: [MessageFlags.Ephemeral],
        });
    }

    if (action === "add") {
        if (!value) {
            return interaction.reply({
                embeds: [status(client, interaction, "warning", "Playlist", "Eklemek için şarkı adı veya URL girmelisin.")],
                flags: [MessageFlags.Ephemeral],
            });
        }

        const plan = getEffectivePlan(client, interaction.guildId, interaction.user.id);
        const limits = getPlanLimits(plan);
        if (playlist.tracks.length >= limits.playlistTracks) {
            return interaction.reply({
                embeds: [status(client, interaction, "warning", "Playlist", `Bu plan için playlist limiti **${limits.playlistTracks} şarkı**.`)],
                flags: [MessageFlags.Ephemeral],
            });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const result = await client.rainlink.search(value, { requester: interaction.member }).catch(() => null);
        const track = result?.tracks?.[0];

        if (!track) {
            return interaction.editReply({
                embeds: [status(client, interaction, "warning", "Playlist", "Şarkı bulunamadı.")],
            });
        }

        playlist.tracks.push(serializeTrack(track));
        playlist.updatedAt = new Date();
        await persistUserPlaylists(client, interaction.user.id, userData);
        return interaction.editReply({
            embeds: [status(client, interaction, "success", "Playlist", `**${track.title}** **${name}** playlistine eklendi.`)],
        });
    }

    return interaction.reply({
        embeds: [status(client, interaction, "warning", "Playlist", "Bilinmeyen playlist işlemi.")],
        flags: [MessageFlags.Ephemeral],
    });
}

async function showLibrary(client, interaction) {
    const userData = getCachedUserData(client, interaction.user.id);
    const playlists = ensurePlaylists(userData);
    const description = playlists.length
        ? playlists.map((playlist, index) => `**${index + 1}. ${playlist.name}** - ${playlist.tracks.length} şarkı`).join("\n")
        : "Henüz oluşturulmuş playlist yok.";

    const likedSongs = Array.isArray(userData.likedSongs) ? userData.likedSongs.length : 0;
    const embed = status(client, interaction, "info", "Playlist Kütüphanesi", [
        description,
        "",
        `Beğenilen şarkılar: **${likedSongs}**`,
    ].join("\n"));

    return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
}

function getCachedUserData(client, userId) {
    const userData = client.data.get(`userData_${userId}`) || { id: userId, ban: { status: false, reason: null } };
    userData.playlists = ensurePlaylists(userData);
    if (!Array.isArray(userData.likedSongs)) userData.likedSongs = [];
    client.data.set(`userData_${userId}`, userData);
    return userData;
}

function ensurePlaylists(userData) {
    if (!Array.isArray(userData.playlists)) userData.playlists = [];
    return userData.playlists;
}

async function persistUserPlaylists(client, userId, userData) {
    client.data.set(`userData_${userId}`, userData);
    await client.userData.findOneAndUpdate(
        { id: userId },
        { $set: { playlists: userData.playlists }, $setOnInsert: { id: userId, ban: { status: false, reason: null } } },
        { upsert: true, new: true },
    );
}

function findPlaylist(playlists, name) {
    return playlists.find((playlist) => sameName(playlist.name, name));
}

function sameName(left, right) {
    return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

function normalizePlaylistName(name) {
    return String(name || "").trim().replace(/\s+/g, " ").slice(0, 40);
}

function serializeTrack(track) {
    return {
        title: track.title || "Unknown",
        author: track.author || "Unknown",
        uri: track.uri || null,
        duration: Number(track.duration || 0),
        artworkUrl: track.artworkUrl || null,
        addedAt: new Date(),
    };
}

function getQueuedTracks(queue) {
    if (!queue) return [];
    if (Array.isArray(queue)) return queue;
    if (typeof queue.map === "function") return queue.map((track) => track);
    if (typeof queue.toArray === "function") return queue.toArray();
    if (typeof queue[Symbol.iterator] === "function") return Array.from(queue);
    if (Array.isArray(queue.tracks)) return queue.tracks;
    return [];
}

function status(client, interaction, tone, title, description) {
    return createStatusEmbed(client, {
        tone,
        title,
        guildId: interaction.guildId,
        description,
    });
}
