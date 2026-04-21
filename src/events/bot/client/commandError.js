const { EmbedBuilder, WebhookClient } = require("discord.js");
const { t } = require("../../../functions/t.js");

module.exports = async (client, error, command, interaction) => {
    console.error(`[ERROR] Command error from ${command.name}`, error);

    const channel = client.channels.cache.get("1373773051749072916");
    if (!channel) return;

    const webhookUrl = process.env.ERROR_WEBHOOK_URL;
    const webhook = webhookUrl ? new WebhookClient({ url: webhookUrl }) : null;

    const commandEmbed = new EmbedBuilder()
        .setColor(client.config.embedColor)
        .setTitle("Command Log")
        .setDescription(`### Komut Bilgileri
**Komut:** \`${command.name}\`
**Kullanici:** ${interaction.user} (\`${interaction.user.id}\`)
**Sunucu:** ${interaction.guild.name} (\`${interaction.guild.id}\`)
**Kanal:** ${interaction.channel} (\`${interaction.channel.id}\`)
**Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
            text: `Command Logger - ${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR")}`,
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
        });

    const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("Error Notification")
        .setDescription(`### Hata Detaylari
**Hata Turu:** \`${error.name}\`
**Hata Mesaji:** \`${error.message}\`

### Stack Trace
\`\`\`js
${error.stack}
\`\`\`

### Komut Bilgileri
**Komut:** \`${command.name}\`
**Kullanici:** ${interaction.user} (\`${interaction.user.id}\`)
**Sunucu:** ${interaction.guild.name} (\`${interaction.guild.id}\`)
**Kanal:** ${interaction.channel} (\`${interaction.channel.id}\`)
**Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({
            text: `Bot Error Logger - ${new Date().toLocaleDateString("tr-TR")} ${new Date().toLocaleTimeString("tr-TR")}`,
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
        });

    await channel.send({ embeds: [commandEmbed] });
    if (webhook) {
        await webhook.send({ embeds: [errorEmbed] }).catch(() => {});
    }

    const userEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setDescription(t(client, interaction.guildId, "permissions.commandError"));

    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [userEmbed], ephemeral: true });
    } else {
        await interaction.reply({ embeds: [userEmbed], ephemeral: true });
    }
};
