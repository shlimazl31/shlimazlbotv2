const { MessageFlags } = require("discord.js");
const { createStatusEmbed } = require("../../../functions/createResponseEmbed.js");

module.exports = {
    name: "sleeptimer",
    description: "Belirli bir süre sonra müziği durdur",
    category: "music",
    options: [
        {
            name: "minutes",
            description: "Kaç dakika sonra müzik durdurulsun?",
            type: 4,
            required: true,
            min_value: 1,
            max_value: 1440,
        },
    ],
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: true,
        player: true,
        current: true,
    },
    requiredPlan: "pro",
    devOnly: false,
    run: async (client, interaction, player) => {
        const minutes = interaction.options.getInteger("minutes");
        const guildId = interaction.guildId;
        const existingTimer = client.sleepTimers?.get(guildId);

        if (!client.sleepTimers) client.sleepTimers = new Map();
        if (existingTimer) clearTimeout(existingTimer.timeout);

        const timeout = setTimeout(async () => {
            const activePlayer = client.rainlink?.players?.get(guildId);
            client.sleepTimers?.delete(guildId);

            if (!activePlayer) return;

            activePlayer.stop();
            const channel = client.channels.cache.get(activePlayer.textId);
            if (!channel) return;

            const embed = createStatusEmbed(client, {
                tone: "info",
                title: "Uyku Zamanlayıcı",
                guildId,
                description: "Uyku zamanlayıcı süresi dolduğu için müzik durduruldu.",
            });

            await channel.send({ embeds: [embed] }).catch(() => null);
        }, minutes * 60 * 1000);

        timeout.unref?.();
        client.sleepTimers.set(guildId, {
            timeout,
            userId: interaction.user.id,
            endsAt: Date.now() + minutes * 60 * 1000,
        });

        const embed = createStatusEmbed(client, {
            tone: "success",
            title: "Uyku Zamanlayıcı",
            guildId,
            description: `Müzik **${minutes} dakika** sonra otomatik durdurulacak.`,
        });

        return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
    },
};
