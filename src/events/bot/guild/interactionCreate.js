const { EmbedBuilder, InteractionType, MessageFlags } = require("discord.js");
const { createDataGuild, createDataUser } = require("../../../functions/createData.js");
const createSupportComponents = require("../../../functions/createSupportComponents.js");
const { permissions } = require("../../../functions/getPermission.js");
const { recordCommandUsage } = require("../../../functions/commandStats.js");
const { getEffectivePlan, getPlanLimits } = require("../../../functions/premium.js");
const { t } = require("../../../functions/t.js");

module.exports = async (client, interaction) => {
    if (!interaction.guild || interaction.user.bot) return;

    await warmupData(client, interaction.guild, interaction.user);

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
                .setTitle("Komut Kullanıldı")
                .setDescription(`**Komut:** ${command.name}\n**Kullanici:** ${interaction.user.tag} (${interaction.user.id})\n**Sunucu:** ${interaction.guild.name} (${interaction.guildId})`)
                .setTimestamp();

            logChannel.send({ embeds: [logEmbed] });
        }

        console.log(
            `[Slash] [${command.name}] | (${interaction.user.username})[${interaction.user.id}] | ${interaction.guild.name} [${interaction.guildId}]`,
        );
        recordCommandUsage(client, {
            type: "slash",
            commandName: command.name,
            guildId: interaction.guildId,
            userId: interaction.user.id,
        });

        const botPermissions = ["ViewChannel", "SendMessages", "EmbedLinks", "ReadMessageHistory"];
        const botMissingPermissions = [];

        for (const perm of botPermissions) {
            if (!interaction.channel.permissionsFor(interaction.guild.members.me).has(perm)) botMissingPermissions.push(perm);
        }

        if (botMissingPermissions.length > 0) {
            embed.setDescription(t(client, interaction.guildId, "permissions.botMissingBase", { permissions: botMissingPermissions.join(", ") }));

            return interaction.reply({ embeds: [embed], components, flags: [MessageFlags.Ephemeral] });
        }

        if (userData && userData.ban.status) {
            embed.setDescription(t(client, interaction.guildId, "permissions.banned", { reason: userData.ban.reason }));
            return interaction.reply({ embeds: [embed], components, flags: [MessageFlags.Ephemeral] });
        }

        const maintenance = client.data.get("maintenance");

        if (maintenance && !client.config.dev.includes(interaction.user.id)) {
            embed.setDescription(t(client, interaction.guildId, "permissions.maintenance"));
            return interaction.reply({ embeds: [embed], components, flags: [MessageFlags.Ephemeral] });
        }

        const cooldown = checkCommandCooldown(client, interaction, command);
        if (cooldown.blocked) {
            embed.setDescription(t(client, interaction.guildId, "permissions.cooldown", { seconds: cooldown.seconds }));
            return interaction.reply({ embeds: [embed], components, flags: [MessageFlags.Ephemeral] });
        }

        const player = client.rainlink.players.get(interaction.guildId);
        return permissions(client, interaction, command, embed, player);
    }
};

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

function checkCommandCooldown(client, interaction, command) {
    if (client.config.dev.includes(interaction.user.id)) return { blocked: false, seconds: 0 };

    const plan = getEffectivePlan(client, interaction.guildId, interaction.user.id);
    const cooldownMs = command.cooldownMs ?? getPlanLimits(plan).cooldownMs;
    if (!cooldownMs) return { blocked: false, seconds: 0 };

    if (!client.commandCooldowns) client.commandCooldowns = new Map();

    const key = `${interaction.user.id}:${command.name}`;
    const now = Date.now();
    const expiresAt = client.commandCooldowns.get(key) || 0;

    if (expiresAt > now) {
        return { blocked: true, seconds: Math.ceil((expiresAt - now) / 1000) };
    }

    client.commandCooldowns.set(key, now + cooldownMs);
    setTimeout(() => client.commandCooldowns?.delete(key), cooldownMs + 1000).unref?.();

    return { blocked: false, seconds: 0 };
}
