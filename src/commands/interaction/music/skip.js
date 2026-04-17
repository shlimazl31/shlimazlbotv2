const { EmbedBuilder, MessageFlags } = require("discord.js");

module.exports = {
    name: "skip",
    description: "Şarkıyı atla",
    category: "music",
    permissions: {
        bot: [],
        user: [],
    },
    settings: {
        voice: true,
        player: true,
        current: true,
    },
    devOnly: false,
    run: async (client, interaction, player) => {
        const embed = new EmbedBuilder().setColor(client.config.embedColor);
        const guildData = client.data.get(`guildData_${interaction.guildId}`) || { dj: { status: false, role: null } };

        // DJ kontrolü
        const hasDJRole = guildData?.dj?.status && interaction.member.roles.cache.has(guildData.dj.role);
        const isAdmin = interaction.member.permissions.has("ManageGuild");

        // Orijinal kontrol:
        if (hasDJRole || isAdmin) {
            if (player.queue.isEmpty && !client.data.get("autoplay", player.guildId)) {
                embed.setDescription(`Sıra boş. Atlama yapılamaz.`);
                return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
            }
            player.skip();
            embed.setDescription(`Şarkı atlandı.`);
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        // Voteskip mantığı
        const voiceChannelMembers = interaction.member.voice.channel.members.filter(member => !member.user.bot);
        const requiredVotes = Math.ceil(voiceChannelMembers.size / 2);

        // Aktif oylama varsa kontrol et
        if (player.voteskip) {
            embed.setDescription(`Bu şarkı için zaten bir atlama oylaması devam ediyor.`);
            return interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
        }

        // Yeni oylama başlat
        player.voteskip = {
            votes: new Set(),
            required: requiredVotes,
            voters: new Set()
        };

        player.voteskip.voters.add(interaction.user.id);
        player.voteskip.votes.add(interaction.user.id);

        embed.setDescription(`Şarkıyı atlamak için bir oylama başlatıldı. **${player.voteskip.votes.size}/${player.voteskip.required}** oy toplandı.`);
        const replyMessage = await interaction.reply({ embeds: [embed], withResponse: true });

        // Oylama için ayrı bir mesaj gönder ve buna tepki ekle
        const voteMessage = await interaction.channel.send({ embeds: [embed] });
        await voteMessage.react('✅').catch(console.error);

        // Tepki dinleyicisi oluştur
        const filter = (reaction, user) => reaction.emoji.name === '✅' && !user.bot && interaction.member.voice.channel.members.has(user.id) && !player.voteskip.voters.has(user.id);

        const collector = voteMessage.createReactionCollector({
            filter,
            time: 15000, // Oylama süresi (ms)
            dispose: true // Kullanıcı tepkisini kaldırırsa oyu geri almak için (isteğe bağlı)
        });

        collector.on('collect', (reaction, user) => {
            if (!player.voteskip) return; // Oylama zaten bitmişse

            player.voteskip.voters.add(user.id);
            player.voteskip.votes.add(user.id);

            // Oy sayısını güncelle ve mesajı düzenle
            const updatedEmbed = new EmbedBuilder()
                .setColor(client.config.embedColor)
                .setDescription(`Şarkıyı atlamak için bir oylama başlatıldı. **${player.voteskip.votes.size}/${player.voteskip.required}** oy toplandı.`);
            voteMessage.edit({ embeds: [updatedEmbed] }).catch(console.error);

            // Yeterli oy toplandıysa şarkıyı atla ve oylamayı bitir
            if (player.voteskip.votes.size >= player.voteskip.required) {
                clearTimeout(voteTimeout); // Zaman aşımı sayacını temizle
                player.skip();
                const successEmbed = new EmbedBuilder()
                    .setColor(client.config.embedColor)
                    .setDescription(`Atlama oylaması başarılı. Şarkı atlandı.`);
                voteMessage.edit({ embeds: [successEmbed] }).catch(console.error);
                delete player.voteskip;
                collector.stop(); // Dinleyiciyi durdur
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && player.voteskip) {
                // Süre doldu. Oy sayısını tekrar kontrol et.
                if (player.voteskip.votes.size >= player.voteskip.required) {
                     const successEmbed = new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setDescription(`Atlama oylaması başarılı. Şarkı atlandı.`);
                    voteMessage.edit({ embeds: [successEmbed] }).catch(console.error);
                    player.skip();
                } else {
                    const failEmbed = new EmbedBuilder()
                        .setColor(client.config.embedColor)
                        .setDescription(`Atlama oylaması başarısız oldu. Yeterli oy toplanamadı.`);
                    voteMessage.edit({ embeds: [failEmbed] }).catch(console.error);
                }
                delete player.voteskip;
            }
             // Başka bir nedenden (skip başarılı oldu vs.) bittiyse zaten ilgili işlemler yapılmıştır.
        });

        // 15 saniye sonra oylamayı sonlandıracak zaman aşımı (collector 'time' ile senkronize)
        // Bu timeout aynı zamanda collector 'end' eventi ile birlikte çalışacak.
        const voteTimeout = setTimeout(async () => {
             if (collector.gathering) collector.stop('time'); // Collector hala aktifse süre dolduğunu belirt
        }, 15000);
    },
};
