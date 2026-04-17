const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: "dj",
    description: "DJ modunu ve rolünü ayarla",
    category: "music",
    options: [
        {
            name: "action",
            description: "Yapılacak işlem",
            type: 3,
            required: true,
            choices: [
                { name: "Aç/Kapat", value: "toggle" },
                { name: "Rol Ayarla", value: "setrole" },
                { name: "Rol Kaldır", value: "removerole" },
                { name: "Durum", value: "status" }
            ]
        },
        {
            name: "role",
            description: "DJ rolü",
            type: 8,
            required: false
        }
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
    run: async (client, interaction, player) => {
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        
        // Eski verileri kontrol et ve güncelle
        let guildData = client.data.get(`guildData_${interaction.guildId}`);
        if (!guildData) {
            guildData = {};
        }
        if (!guildData.dj) {
            guildData.dj = { status: false, role: null };
        }
        
        const action = interaction.options.getString("action");

        switch (action) {
            case "toggle":
                guildData.dj.status = !guildData.dj.status;
                embed.setDescription(`DJ modu \`${guildData.dj.status ? "etkinleştirildi" : "devre dışı bırakıldı"}\`.`);
                break;

            case "setrole":
                const role = interaction.options.getRole("role");
                if (!role) {
                    embed.setDescription("Lütfen bir rol belirtin.");
                    return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
                }
                guildData.dj.role = role.id;
                embed.setDescription(`${role} rolü DJ rolü olarak ayarlandı.`);
                break;

            case "removerole":
                guildData.dj.role = null;
                embed.setDescription("DJ rolü kaldırıldı.");
                break;

            case "status":
                const status = guildData.dj.status ? "Aktif" : "Devre Dışı";
                const roleName = guildData.dj.role ? `<@&${guildData.dj.role}>` : "Ayarlanmamış";
                embed.setDescription(`**DJ Sistemi Durumu**\n\nMod: \`${status}\`\nRol: ${roleName}`);
                break;
        }

        client.data.set(`guildData_${interaction.guildId}`, guildData);
        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
}; 