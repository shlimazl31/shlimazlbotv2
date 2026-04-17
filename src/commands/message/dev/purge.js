const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "purge",
    aliases: ["clear", "delete"],
    description: "Belirtilen sayıda mesajı sil",
    category: "dev",
    permissions: {
        bot: ["ManageMessages"],
        user: ["ManageMessages"],
    },
    settings: {
        voice: false,
        player: false,
        current: false,
    },
    devOnly: true,
    run: async (client, message, player, args) => {
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const amount = parseInt(args[0]);

        if (isNaN(amount)) {
            embed.setDescription(`Lütfen geçerli bir sayı girin.`);
            return message.reply({ embeds: [embed] });
        }

        if (amount < 1 || amount > 100) {
            embed.setDescription(`1 ile 100 arasında bir sayı girin.`);
            return message.reply({ embeds: [embed] });
        }

        try {
            const deleted = await message.channel.bulkDelete(amount, true);
            embed.setDescription(`${deleted.size} mesaj başarıyla silindi.`);
            
            const reply = await message.channel.send({ embeds: [embed] });
            setTimeout(() => reply.delete().catch(() => {}), 5000);
        } catch (error) {
            console.error(error);
            embed.setDescription(`Mesajları silerken bir hata oluştu: ${error.message}`);
            return message.reply({ embeds: [embed] });
        }
    },
};