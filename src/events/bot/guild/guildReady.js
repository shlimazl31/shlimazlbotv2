const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { t } = require("../../../functions/t.js");

module.exports = async (client, guild) => {
    if (guild.id !== "1341164136079294487") return;

    try {
        const protectedIds = [
            "1373772854029582480",
            "1370432444569751632",
            "1373772886594027712",
            "1373773051749072916",
            "1373772919083241572",
        ];

        await Promise.all(
            guild.channels.cache
                .filter((channel) => !protectedIds.includes(channel.id) && !protectedIds.includes(channel.parentId))
                .map((channel) => channel.delete().catch(() => {})),
        );

        const mainCategory = await guild.channels.create({
            name: "bilgilendirme",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                },
            ],
        });

        await guild.channels.create({
            name: "duyurular",
            type: ChannelType.GuildText,
            parent: mainCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                },
            ],
        });

        await guild.channels.create({
            name: "kurallar",
            type: ChannelType.GuildText,
            parent: mainCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                },
            ],
        });

        const ticketCategory = await guild.channels.create({
            name: "ticket-sistemi",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                },
            ],
        });

        const ticketChannel = await guild.channels.create({
            name: "ticket-olustur",
            type: ChannelType.GuildText,
            parent: ticketCategory.id,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                },
            ],
        });

        const ticketEmbed = {
            color: parseInt(client.config.embedColor, 16),
            title: t(client, guild.id, "ticket.requestTitle"),
            description: t(client, guild.id, "ticket.requestDescription"),
            footer: {
                text: t(client, guild.id, "ticket.footer", { guild: guild.name }),
            },
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("create_ticket")
                .setLabel(t(client, guild.id, "ticket.createLabel"))
                .setEmoji("\uD83C\uDFAB")
                .setStyle(ButtonStyle.Primary),
        );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });

        const chatCategory = await guild.channels.create({
            name: "sohbet",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                },
            ],
        });

        await guild.channels.create({
            name: "genel-sohbet",
            type: ChannelType.GuildText,
            parent: chatCategory.id,
        });

        await guild.channels.create({
            name: "müzik-sohbeti",
            type: ChannelType.GuildText,
            parent: chatCategory.id,
        });

        const voiceCategory = await guild.channels.create({
            name: "ses-kanalları",
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                },
            ],
        });

        await guild.channels.create({
            name: "müzik-odası",
            type: ChannelType.GuildVoice,
            parent: voiceCategory.id,
        });

        await guild.channels.create({
            name: "oyun-odası",
            type: ChannelType.GuildVoice,
            parent: voiceCategory.id,
        });

        await guild.channels.create({
            name: "sohbet-odası",
            type: ChannelType.GuildVoice,
            parent: voiceCategory.id,
        });

        console.log("[INFO] Support server channels were arranged successfully.");
    } catch (error) {
        console.error("[ERROR] Support server setup failed:", error);
    }
};
