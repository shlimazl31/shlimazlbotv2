const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags } = require("discord.js");

module.exports = async (client, interaction) => {
    if (!interaction.isButton()) return;

    // Sadece belirli sunucuda çalışsın
    if (interaction.guildId !== "1341164136079294487") return;

    if (interaction.customId === "create_ticket") {
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
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
            .setTitle("🎫 Ticket Oluşturuldu")
            .setDescription(`Merhaba ${interaction.user}, destek talebiniz oluşturuldu. Lütfen sorununuzu detaylı bir şekilde anlatın.`)
            .setFooter({ text: `${interaction.guild.name} | Ticket Sistemi` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Ticket'ı Kapat")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });
        await interaction.reply({ content: `Ticket kanalınız oluşturuldu: ${ticketChannel}`, flags: [MessageFlags.Ephemeral] });
    }

    if (interaction.customId === "close_ticket") {
        const channel = interaction.channel;
        if (!channel.name.startsWith("ticket-")) return;

        const closeEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription("Bu ticket 5 saniye içinde kapatılacak...");

        await interaction.reply({ embeds: [closeEmbed] });

        setTimeout(async () => {
            await channel.delete();
        }, 5000);
    }
}; 