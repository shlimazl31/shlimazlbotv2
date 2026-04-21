const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");
const { t } = require("../../../functions/t.js");

module.exports = {
    name: "dj",
    description: "DJ modunu ve rolunu ayarla",
    category: "music",
    options: [
        {
            name: "action",
            description: "Yapilacak islem",
            type: 3,
            required: true,
            choices: [
                { name: "Ac/Kapat", value: "toggle" },
                { name: "Rol Ayarla", value: "setrole" },
                { name: "Rol Kaldir", value: "removerole" },
                { name: "Durum", value: "status" },
            ],
        },
        {
            name: "role",
            description: "DJ rolu",
            type: 8,
            required: false,
        },
    ],
    permissions: {
        bot: [],
        user: ["ManageGuild"],
    },
    settings: {
        voice: true,
        player: true,
        current: false,
    },
    devOnly: false,
    run: async (client, interaction) => {
        const guildId = interaction.guildId;
        const embed = createStatusEmbed(client, {
            tone: "info",
            title: t(client, guildId, "music.dj.title"),
            guildId,
        });
        const guildData = client.data.get(`guildData_${guildId}`) || { id: guildId };

        if (!guildData.dj) guildData.dj = { status: false, role: null };

        const action = interaction.options.getString("action");

        switch (action) {
            case "toggle":
                guildData.dj.status = !guildData.dj.status;
                embed.setDescription(t(client, guildId, guildData.dj.status ? "music.dj.enabled" : "music.dj.disabled"));
                break;
            case "setrole": {
                const role = interaction.options.getRole("role");
                if (!role) {
                    embed.setDescription(t(client, guildId, "music.dj.needRole"));
                    return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }

                guildData.dj.role = role.id;
                embed.setDescription(t(client, guildId, "music.dj.roleSet", { role }));
                break;
            }
            case "removerole":
                guildData.dj.role = null;
                embed.setDescription(t(client, guildId, "music.dj.roleRemoved"));
                break;
            case "status": {
                const status = guildData.dj.status ? t(client, guildId, "music.dj.active") : t(client, guildId, "music.dj.inactive");
                const roleName = guildData.dj.role ? `<@&${guildData.dj.role}>` : t(client, guildId, "music.dj.notConfigured");
                embed.setDescription(`**${t(client, guildId, "music.dj.statusTitle")}**\n\n${t(client, guildId, "music.dj.mode")}: \`${status}\`\n${t(client, guildId, "music.dj.role")}: ${roleName}`);
                break;
            }
        }

        client.data.set(`guildData_${guildId}`, guildData);
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
