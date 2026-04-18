const { EmbedBuilder, InteractionType, MessageFlags } = require("discord.js");
const { createDataGuild, createDataUser } = require("../../../functions/createData.js");
const createSupportComponents = require("../../../functions/createSupportComponents.js");
const { permissions } = require("../../../functions/getPermission.js");

module.exports = async (client, interaction) => {
    if (!interaction.guild || interaction.user.bot) return;

    await createDataGuild(client, interaction.guild);
    await createDataUser(client, interaction.user);

    const userData = client.data.get(`userData_${interaction.user.id}`);
    const embed = new EmbedBuilder().setColor(client.config.embedColor);
    const components = createSupportComponents(client.config.supportServerUrl);

    if (interaction.isButton()) {
        require("../interaction/buttonInteraction")(client, interaction);
        return;
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
        const command = client.slash.get(interaction.commandName);
        if (!command) return;

        const logChannel = client.channels.cache.get("1373773051749072916");
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setTitle("Komut Kullanildi")
                .setDescription(`**Komut:** ${command.name}\n**Kullanici:** ${interaction.user.tag} (${interaction.user.id})\n**Sunucu:** ${interaction.guild.name} (${interaction.guildId})`)
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] });
        }

        console.log(
            `[Slash] [${command.name}] | (${interaction.user.username})[${interaction.user.id}] | ${interaction.guild.name} [${interaction.guildId}]`,
        );

        const botPermissions = ["ViewChannel", "SendMessages", "EmbedLinks", "ReadMessageHistory"];
        const botMissingPermissions = [];

        for (const perm of botPermissions) {
            if (!interaction.channel.permissionsFor(interaction.guild.members.me).has(perm)) botMissingPermissions.push(perm);
        }

        if (botMissingPermissions.length > 0) {
            embed.setDescription(
                `The bot doesn't have one of these permissions \`${botMissingPermissions.join(", ")}\`.\nPlease double check them in your server role & channel settings.`,
            );

            return interaction.reply({ embeds: [embed], components, flags: [MessageFlags.Ephemeral] });
        }

        if (userData && userData.ban.status) {
            embed.setDescription(`You have been banned from using the bot.\n\`\`\`${userData.ban.reason}\`\`\``);
            return interaction.reply({ embeds: [embed], components, flags: [MessageFlags.Ephemeral] });
        }

        const maintenance = client.data.get("maintenance");

        if (maintenance && !client.config.dev.includes(interaction.user.id)) {
            embed.setDescription("The bot is currently under maintenance. Please try again later.");
            return interaction.reply({ embeds: [embed], components, flags: [MessageFlags.Ephemeral] });
        }

        const player = client.rainlink.players.get(interaction.guildId);
        return permissions(client, interaction, command, embed, player);
    }
};
