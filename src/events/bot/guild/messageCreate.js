const { EmbedBuilder } = require("discord.js");
const { createDataGuild, createDataUser } = require("../../../functions/createData.js");
const createSupportComponents = require("../../../functions/createSupportComponents.js");
const { permissions } = require("../../../functions/getPermission.js");
const { recordCommandUsage } = require("../../../functions/commandStats.js");
const { t } = require("../../../functions/t.js");

module.exports = async (client, message) => {
    if (message.author.bot || message.system || message.webhookId) return;

    if (!message.guild) {
        await recordDirectMessage(client, message);
        return;
    }

    await warmupData(client, message.guild, message.author);

    const userData = client.data.get(`userData_${message.author.id}`);
    const embed = new EmbedBuilder().setColor(client.config.embedColor);
    const components = createSupportComponents(client.config.supportServerUrl);

    const botPermissions = ["ViewChannel", "SendMessages", "EmbedLinks"];
    const botMissingPermissions = [];

    for (const perm of botPermissions) {
        if (!message.channel.permissionsFor(message.guild.members.me).has(perm)) botMissingPermissions.push(perm);
    }

    if (botMissingPermissions.length > 0) {
        const permissionEmbed = new EmbedBuilder()
            .setColor(client.config.embedColor)
            .setDescription(t(client, message.guildId, "permissions.botMissingBase", { permissions: botMissingPermissions.join(", ") }));

        const dmChannel = message.author.dmChannel == null ? await message.author.createDM() : message.author.dmChannel;
        return dmChannel.send({ embeds: [permissionEmbed], components });
    }

    const mention = new RegExp(`^<@!?${client.user.id}>( |)$`);

    if (message.content.match(mention)) {
        embed.setDescription(t(client, message.guildId, "permissions.mentionHelp"));
        message.reply({ embeds: [embed] });
    }

    let prefix = client.config.prefix;

    if (message.content.startsWith(prefix) && message.author.id !== client.config.owner) return;
    if (!message.content.startsWith(prefix) && client.config.owner === message.author.id) {
        prefix = "";
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(prefix)})\\s*`);

    if (!prefixRegex.test(message.content)) return;

    const [matchedPrefix] = message.content.match(prefixRegex);
    const args = message.content.slice(matchedPrefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    if (!cmd.length) return;

    let command = client.prefix.get(cmd);

    if (!command) command = client.prefix.get(client.aliases.get(cmd));
    if (!command) return;

    console.log(
        `[PREFIX] [${command.name}] | (${message.author.username})[${message.author.id}] | (${message.guild.name})[${message.guildId}]`,
    );
    recordCommandUsage(client, {
        type: "prefix",
        commandName: command.name,
        guildId: message.guildId,
        userId: message.author.id,
    });

    if (userData && userData.ban.status) {
        embed.setDescription(t(client, message.guildId, "permissions.banned", { reason: userData.ban.reason }));
        return message.reply({ embeds: [embed] });
    }

    const maintenance = client.data.get("maintenance");

    if (maintenance && !client.config.dev.includes(message.author.id)) {
        embed.setDescription(t(client, message.guildId, "permissions.maintenance"));
        return message.reply({ embeds: [embed] });
    }

    const player = client.rainlink.players.get(message.guildId);
    return permissions(client, message, command, embed, player, args);
};

async function recordDirectMessage(client, message) {
    try {
        await createDataUser(client, message.author);
        await client.adminLog.create({
            action: "dm.inbound",
            actor: message.author.id,
            targetType: "user",
            targetId: message.author.id,
            message: "Kullanıcı bota özel mesaj gönderdi.",
            metadata: {
                direction: "inbound",
                messageId: message.id,
                username: message.author.username,
                globalName: message.author.globalName || message.author.username,
                avatar: message.author.avatar || null,
                content: message.content || "",
                preview: (message.content || "").slice(0, 300),
                attachmentCount: message.attachments?.size || 0,
            },
        });
    } catch (error) {
        console.error("Admin inbox DM log error:", error);
    }
}

async function warmupData(client, guild, user) {
    const dataPromise = Promise.all([
        createDataGuild(client, guild),
        createDataUser(client, user),
    ]).catch((error) => console.error("Data warmup error:", error));

    await Promise.race([
        dataPromise,
        new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
}
