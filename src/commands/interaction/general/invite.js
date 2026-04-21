const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");

module.exports = {
    name: "invite",
    description: "ShlimazlBot'u sunucuna davet et",
    category: "general",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    requiredPlan: "free",
    devOnly: false,
    run: async (client, interaction) => {
        const inviteUrl = createInviteUrl(client.user.id);
        const embed = createStatusEmbed(client, {
            tone: "info",
            title: "Davet",
            guildId: interaction.guildId,
            description: [
                "ShlimazlBot'u sunucuna eklemek için aşağıdaki butonu kullanabilirsin.",
                "",
                "Bot daveti `bot` ve `applications.commands` yetkileriyle hazırlanır.",
            ].join("\n"),
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("Botu Davet Et")
                .setStyle(ButtonStyle.Link)
                .setURL(inviteUrl),
        );

        return interaction.reply({ embeds: [embed], components: [row], flags: [MessageFlags.Ephemeral] });
    },
};

function createInviteUrl(clientId) {
    const params = new URLSearchParams({
        client_id: clientId,
        permissions: "36700160",
        scope: "bot applications.commands",
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
