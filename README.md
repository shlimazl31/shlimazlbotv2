# ShlimazlBot

Discord music botu ve web dashboard'u. Proje tarafında amaç basit: sunucuda müzik komutları çalışsın, ayarlar panelden yönetilsin, premium da kullanıcı hesabına/Patreon rolüne göre otomatik açılsın.

Bu repo bot, API, dashboard, public site ve bazı ops scriptlerini birlikte tutuyor.

## Neler var?

- Discord slash komutları
- Lavalink/Rainlink tabanlı müzik oynatma
- Queue, loop, shuffle, volume, seek, lyrics ve filtreler
- Dashboard üzerinden sunucu ayarları
- Müzik kanalı, DJ rolü, izinli roller ve kart görünümü ayarları
- Mini player, playlist, sleep timer ve 24/7 gibi premium özellikler
- Patreon rolüyle premium algılama
- Public site, legal pages ve cookie banner
- Cloudflared / network watchdog dosyaları `ops/` altında

## Kurulum

Node 18+ gerekiyor.

```bash
npm install
```

`.env` dosyasını oluştur:

```env
TOKEN=
CLIENT_ID=
CLIENT_SECRET=
MONGO_URI=

BASE_URL=http://localhost:3000
API_PORT=3000

PATREON_URL=https://www.patreon.com/cw/Shlimazlbot/membership
PATREON_DISCORD_GUILD_ID=
PATREON_PLUS_ROLE_ID=
PATREON_PRO_ROLE_ID=
```

Projede kullanılan tüm env değerleri sunucu kurulumuna göre değişebilir. `.env` dosyası git'e eklenmemeli.

## Çalıştırma

```bash
npm start
```

Dashboard ve public site Express API içinden servis edilir. Production'da genelde `systemd`, `pm2` veya benzeri bir process manager arkasında çalıştırmak daha mantıklı.

## Premium akışı

Şu an ödeme tarafı Patreon'a yönleniyor. Kullanıcı Patreon'da Plus/Pro seçer, Patreon Discord rolünü verir, bot da support server'daki rolü okuyup premium durumunu açar.

Gerekenler:

- Bot support Discord sunucusunda olmalı.
- Patreon'un verdiği Plus/Pro rol ID'leri `.env` içinde tanımlı olmalı.
- Discord member/role bilgisi bot tarafından okunabilir olmalı.

## Dashboard

Dashboard Discord OAuth ile giriş yapar. Kullanıcının yönetebildiği sunucular listelenir. Bot sunucuda yoksa davet akışı gösterilir, varsa ayarlar panelden düzenlenebilir.

Public dosyalar:

```text
src/api/public/
```

Ana API route'ları:

```text
src/api/routes/
```

## Ops notları

`ops/wifi-watchdog` içinde bağlantı koptuğunda network restart/reboot deneyen systemd timer dosyaları var. Bu dosyalar repo içindeki bot kodundan bağımsızdır; Linux sunucuda elle kurulmaları gerekir.

Cloudflare Tunnel tarafı ayrıca sunucuda `cloudflared` servisi olarak çalıştırılıyor. Eğer elektrik/internet gidip gelince site 530/1033 verirse önce `cloudflared tunnel info` ile connector kontrol edilmeli.

## Geliştirme notu

Bu proje kişisel/aktif kullanılan bir bot olduğu için bazı ayarlar doğrudan production ihtiyaçlarına göre şekillenmiş olabilir. Büyük değişikliklerden önce `.env`, Discord app ayarları, OAuth callback URL'leri ve Lavalink node bilgileri kontrol edilmeli.
