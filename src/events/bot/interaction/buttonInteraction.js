const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags } = require("discord.js");

function createTicketChannelName(user) {
    const slug = user.username
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);

    return `ticket-${slug || "user"}-${user.id.slice(-6)}`;
}

module.exports = async (client, interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.guildId !== "1341164136079294487") return;

    if (interaction.customId === "create_ticket") {
        const ticketChannel = await interaction.guild.channels.create({
            name: createTicketChannelName(interaction.user),
            type: ChannelType.GuildText,
            parent: interaction.channel.parent,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: client.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });

        const ticketEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setTitle("Ticket Olusturuldu")
            .setDescription(`Merhaba ${interaction.user}, destek talebiniz olusturuldu. Lutfen sorununuzu detayli bir sekilde anlatin.`)
            .setFooter({ text: `${interaction.guild.name} | Ticket Sistemi` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Ticket'i Kapat")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });

        const successEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(`Ticket kanaliniz olusturuldu: ${ticketChannel}`);

        await interaction.reply({ embeds: [successEmbed], flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "close_ticket") {
        const channel = interaction.channel;
        if (!channel.name.startsWith("ticket-")) return;

        const closeEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription("Bu ticket 5 saniye icinde kapatilacak...");

        await interaction.reply({ embeds: [closeEmbed] });

        setTimeout(async () => {
            await channel.delete();
        }, 5000);
    }
};
