const TOKEN_KEY = "shlimazl_admin_token";
const sections = ["overview", "inbox", "logs", "premium", "messages", "guilds", "nodes"];
const state = {
    token: localStorage.getItem(TOKEN_KEY) || "",
    section: "overview",
    summary: null,
    premium: null,
    logs: null,
    guilds: null,
    nodes: null,
    inbox: null,
};

const qs = (selector, root = document) => root.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
}[match]));

function tokenHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token}`,
        "X-Admin-Token": state.token,
    };
}

async function api(path, options = {}) {
    const response = await fetch(path, {
        method: options.method || "GET",
        headers: tokenHeaders(),
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: "include",
    });
    const data = await response.json().catch(() => ({ error: "Geçersiz yanıt" }));

    if (!response.ok) return { error: data.error || "İstek başarısız.", status: response.status };
    return data;
}

async function login() {
    state.token = qs("#tokenInput").value.trim();

    if (!state.token) {
        qs("#loginMessage").textContent = "Token gerekli.";
        return;
    }

    localStorage.setItem(TOKEN_KEY, state.token);
    const test = await api("/api/bot/admin/summary");

    if (test.error) {
        qs("#loginMessage").textContent = test.error;
        return;
    }

    qs("#loginView").classList.add("hidden");
    qs("#appView").classList.remove("hidden");
    state.summary = test;
    await refreshAll(false);
}

function logout() {
    localStorage.removeItem(TOKEN_KEY);
    location.reload();
}

function copyTokenInfo() {
    navigator.clipboard?.writeText("Admin token aktif").catch(() => {});
    showToast("Token bilgisi panoya yazıldı.");
}

function show(section) {
    state.section = section;
    sections.forEach((name) => {
        qs(`#section-${name}`).classList.toggle("hidden", name !== section);
        qs(`#tab-${name}`).classList.toggle("active", name === section);
    });
}

async function refreshAll(fetchSummary = true) {
    if (fetchSummary) state.summary = await api("/api/bot/admin/summary");

    const [premium, logs, guilds, nodes, inbox] = await Promise.all([
        api("/api/bot/admin/premium"),
        api("/api/bot/admin/logs"),
        api("/api/bot/admin/guilds?limit=200"),
        api("/api/bot/admin/nodes"),
        api("/api/bot/admin/inbox"),
    ]);

    state.premium = premium;
    state.logs = logs;
    state.guilds = guilds;
    state.nodes = nodes;
    state.inbox = inbox;
    renderAll();
}

function renderAll() {
    renderOverview();
    renderInbox();
    renderLogs();
    renderPremium();
    renderMessages();
    renderGuilds();
    renderNodes();
}

function renderOverview() {
    const summary = state.summary || {};
    const premium = state.premium || {};
    const nodes = summary.nodes || {};
    const players = summary.players || {};
    const apiOnline = summary.status === "online";
    const nodeCount = nodes.total || 0;
    const nodeOnline = nodes.online || 0;
    const nodeBadge = nodeCount ? (nodeOnline === nodeCount ? "ok" : nodeOnline > 0 ? "warn" : "bad") : "warn";
    const gatewayPing = Number(summary.ping || 0);
    const gatewayBadge = gatewayPing <= 90 ? "ok" : gatewayPing <= 180 ? "warn" : "bad";

    qs("#section-overview").innerHTML = `
        <div class="section-header">
            <span class="eyebrow">Canlı özet</span>
            <h2>Bot Durumu</h2>
            <p>Owner istatistikleri sadece bu panelde.</p>
        </div>
        <div class="stats">
            ${stat("Versiyon", summary.version || "-")}
            ${stat("Sunucu", summary.guilds ?? "-")}
            ${stat("Player", `${players.playing || 0}/${players.total || 0}`)}
            ${stat("Node", `${nodeOnline}/${nodeCount}`)}
            ${stat("Premium kullanıcı", premium.counts?.userActive ?? summary.premium?.activeUsers ?? 0)}
        </div>
        <div class="split" style="margin-top:12px">
            <div class="soft">
                <h3>Komut trafiği</h3>
                <p>Toplam: <strong>${summary.commandStats?.total || 0}</strong> | Slash: ${summary.commandStats?.slash || 0} | Prefix: ${summary.commandStats?.prefix || 0}</p>
            </div>
            <div class="soft">
                <h3>Canlı Sistem</h3>
                <div class="triple">
                    <div class="soft stat"><span class="muted">Discord Gateway</span><strong><span class="badge ${gatewayBadge}">${summary.ping ?? "-"}ms</span></strong></div>
                    <div class="soft stat"><span class="muted">API Erişimi</span><strong><span class="badge ${apiOnline ? "ok" : "bad"}">${apiOnline ? "Online" : "Sorunlu"}</span></strong></div>
                    <div class="soft stat"><span class="muted">Node Durumu</span><strong><span class="badge ${nodeBadge}">${nodeOnline}/${nodeCount} online</span></strong></div>
                </div>
                <p class="muted" style="margin-top:12px">Uptime: ${formatDuration(summary.uptime || 0)}</p>
            </div>
        </div>`;
}

function renderInbox() {
    const conversations = state.inbox?.conversations || [];
    qs("#section-inbox").innerHTML = `
        <div class="section-header">
            <span class="eyebrow">Gelen Kutusu</span>
            <h2>Bot DM Kutusu</h2>
            <p>Kullanıcılar bota özel mesaj attığında burada konuşma olarak görünür. Direkt buradan cevap verebilirsin.</p>
        </div>
        <div class="inbox">${conversations.map(inboxCard).join("") || empty("Henüz gelen DM yok. Test için bota özel mesaj atabilirsin.")}</div>`;
}

function inboxCard(item) {
    const initials = (item.username || item.userId || "?").slice(0, 2).toUpperCase();
    const avatar = item.avatar ? `https://cdn.discordapp.com/avatars/${item.userId}/${item.avatar}.png?size=96` : null;

    return `
        <article class="soft inbox-card">
            <div>
                <div class="inbox-user">
                    <div class="avatar">${avatar ? `<img src="${esc(avatar)}" alt="">` : esc(initials)}</div>
                    <div><strong>${esc(item.username || "Unknown user")}</strong><br><small class="muted">${esc(item.userId)}</small></div>
                </div>
                <div class="row" style="margin-top:12px">
                    <span class="badge ${item.unread ? "warn" : "ok"}">${item.unread ? `${item.unread} gelen mesaj` : "Yanıtlandı"}</span>
                    <span class="muted">${formatDate(item.lastAt)}</span>
                </div>
            </div>
            <div>
                <div class="thread">${(item.messages || []).map(messageBubble).join("")}</div>
                <form class="reply-form" onsubmit="replyInbox(event,'${esc(item.userId)}')">
                    <textarea id="reply-${esc(item.userId)}" required placeholder="Bu kullanıcıya cevap yaz"></textarea>
                    <button class="btn green" type="submit">Cevabı Gönder</button>
                </form>
            </div>
        </article>`;
}

function messageBubble(item) {
    return `
        <div class="bubble ${item.direction === "inbound" ? "inbound" : "outbound"}">
            <strong>${item.direction === "inbound" ? "Kullanıcı" : "Bot"}</strong><br>
            ${esc(item.content || item.preview || "-")}<br>
            <small class="muted">${formatDate(item.createdAt)}</small>
        </div>`;
}

function renderLogs() {
    const logs = state.logs || {};
    const adminLogs = (logs.adminLogs || [])
        .filter((log) => !String(log.action || "").startsWith("command."))
        .slice(0, 80);
    const commands = logs.commands || [];

    qs("#section-logs").innerHTML = `
        <div class="section-header">
            <span class="eyebrow">Loglar</span>
            <h2>Admin ve Komut Logları</h2>
            <p>Admin panelindeki hassas işlemler kalıcı loglanır. Komutlar ayrı tutulur, mesaj/premium kayıtları karışmaz.</p>
        </div>
        <div class="stats" style="margin-bottom:14px">
            ${stat("Admin aksiyonu", adminLogs.length)}
            ${stat("Son komut", commands.length)}
            ${stat("Toplam komut", logs.commandStats?.total || 0)}
            ${stat("Slash", logs.commandStats?.slash || 0)}
            ${stat("Prefix", logs.commandStats?.prefix || 0)}
        </div>
        <div class="split">
            <div><h3>Admin aksiyonları</h3><div class="table compact">${adminLogs.map(logRow).join("") || empty("Admin log yok.")}</div></div>
            <div><h3>Son komutlar</h3><div class="table compact">${commands.map(commandRow).join("") || empty("Komut logu yok.")}</div></div>
        </div>`;
}

function renderPremium() {
    const users = state.premium?.users || [];
    qs("#section-premium").innerHTML = `
        <div class="section-header">
            <span class="eyebrow">Premium</span>
            <h2>Premium Yönetimi</h2>
            <p>Premium hesap bazlıdır. Kullanıcıya verdiğin premium, botun bulunduğu sunucularda otomatik çalışır.</p>
        </div>
        <div class="split">
            <form class="soft" onsubmit="grantPremium(event)">
                <h3>Premium ver</h3>
                <label>Kullanıcı ID<input id="grantUserId" required placeholder="106764157105233920"></label>
                <label>Plan<select id="grantPlan"><option value="plus">Plus</option><option value="pro">Pro</option><option value="trial">Trial</option></select></label>
                <label>Gün <input id="grantDays" type="number" min="1" max="3650" value="30"></label>
                <label>Not<input id="grantNote" placeholder="Sebep / ödeme notu"></label>
                <button class="btn green" type="submit">Premium Ver</button>
                <p id="grantMessage" class="message"></p>
            </form>
            <form class="soft" onsubmit="revokePremium(event)">
                <h3>Premium al</h3>
                <label>Kullanıcı ID<input id="revokeUserId" required placeholder="106764157105233920"></label>
                <label>Not<input id="revokeNote" placeholder="Sebep"></label>
                <button class="btn red" type="submit">Premiumu Kaldır</button>
                <p id="revokeMessage" class="message"></p>
            </form>
        </div>
        <h3 style="margin-top:18px">Premium kullanıcılar</h3>
        <div class="table">${users.map(premiumRow).join("") || empty("Premium kullanıcı yok.")}</div>`;
}

function renderMessages() {
    qs("#section-messages").innerHTML = `
        <div class="section-header">
            <span class="eyebrow">Bot mesajı</span>
            <h2>Mesaj Gönder</h2>
            <p>Bot üzerinden kullanıcıya özel mesaj veya kanala mesaj gönderebilirsin. Toplu DM yerine kanal duyurusu daha sağlıklı; kullanıcıları rahatsız etmez ve Discord tarafında risk çıkarmaz.</p>
        </div>
        <div class="split">
            <form class="soft" onsubmit="sendDm(event)">
                <h3>Kullanıcıya DM</h3>
                <label>Kullanıcı ID<input id="dmUserId" required placeholder="Kullanıcı ID"></label>
                <label>Mesaj<textarea id="dmMessage" required placeholder="Botun özelden göndereceği mesaj"></textarea></label>
                <button class="btn green" type="submit">DM Gönder</button>
                <p id="dmStatus" class="message"></p>
            </form>
            <form class="soft" onsubmit="sendChannel(event)">
                <h3>Kanala mesaj / duyuru</h3>
                <label>Kanal ID<input id="channelId" required placeholder="Kanal ID"></label>
                <label>Mesaj<textarea id="channelMessage" required placeholder="Botun kanala göndereceği mesaj"></textarea></label>
                <button class="btn green" type="submit">Kanala Gönder</button>
                <p id="channelStatus" class="message"></p>
            </form>
        </div>
        <div class="soft" style="margin-top:12px">
            <h3>Toplu mesaj notu</h3>
            <p>Botun eriştiği herkese otomatik DM göndermek spam gibi algılanabilir. Güvenli çözüm: duyuruyu seçtiğin kanala gönder veya ileride izinli kullanıcı listesi mantığı kurarız.</p>
        </div>`;
}

function renderGuilds() {
    const guilds = state.guilds?.guilds || [];
    const error = state.guilds?.error;
    const active = guilds.filter((guild) => guild.player?.active).length;
    const premium = guilds.filter((guild) => guild.premium?.active).length;
    const members = guilds.reduce((sum, guild) => sum + (Number(guild.memberCount) || 0), 0);
    const content = error
        ? empty(`Sunucu listesi alınamadı: ${error}`)
        : guilds.map(guildRow).join("") || empty("Sunucu yok.");

    qs("#section-guilds").innerHTML = `
        <div class="section-header">
            <span class="eyebrow">Sunucular</span>
            <h2>Botun Olduğu Sunucular</h2>
            <p>Botun aktif olarak bulunduğu tüm sunucular canlı cache üzerinden listelenir. DB kaydı olmasa bile burada görünür.</p>
        </div>
        <div class="stats" style="margin-bottom:14px">
            ${stat("Toplam", guilds.length)}
            ${stat("Aktif player", active)}
            ${stat("Premium", premium)}
            ${stat("Toplam üye", members)}
            ${stat("Limit", `${guilds.length}/200`)}
        </div>
        <div class="table">${content}</div>`;
}

function renderNodes() {
    const nodes = state.nodes?.nodes || [];
    qs("#section-nodes").innerHTML = `
        <div class="section-header">
            <span class="eyebrow">Altyapı</span>
            <h2>Node & Player</h2>
            <p>Lavalink node durumu ve aktif player dağılımı.</p>
        </div>
        <div class="triple">${nodes.map(nodeCard).join("") || empty("Node yok.")}</div>`;
}

function stat(label, value) {
    return `<div class="soft stat"><span class="muted">${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

function empty(text) {
    return `<div class="soft">${esc(text)}</div>`;
}

function logRow(log) {
    const meta = log.metadata || {};
    return `
        <div class="soft log-card">
            <div class="log-head">
                <span><span class="log-action">${esc(actionLabel(log.action))}</span><strong class="log-title"> ${esc(log.message || "-")}</strong></span>
                <span class="muted">${formatDate(log.createdAt)}</span>
            </div>
            <div class="log-meta">
                <span>${esc(log.targetType || "hedef")}: ${esc(log.targetId || "-")}</span>
                <span>actor: ${esc(log.actor || "-")}</span>
                ${meta.plan ? `<span>plan: ${esc(meta.plan)}</span>` : ""}
                ${meta.guildId ? `<span>sunucu: ${esc(meta.guildId)}</span>` : ""}
            </div>
            ${meta.preview ? `<div class="log-preview">"${esc(meta.preview)}"</div>` : ""}
        </div>`;
}

function commandRow(item) {
    return `
        <div class="soft log-card">
            <div class="log-head">
                <span><span class="badge">${esc(item.type)}</span><strong class="log-title"> ${esc(item.commandName)}</strong></span>
                <span class="muted">${formatDate(item.at)}</span>
            </div>
            <div class="log-meta"><span>sunucu: ${esc(item.guildId)}</span><span>kullanıcı: ${esc(item.userId || "-")}</span></div>
        </div>`;
}

function premiumRow(item) {
    const premium = item.premium || {};
    return `
        <div class="soft table-row">
            <span><strong>${esc(item.username || "Unknown")}</strong><br><small class="muted">${esc(item.id)}</small></span>
            <span class="badge ${premium.active ? "ok" : "warn"}">${esc(premium.plan || "free")}</span>
            <span>${premium.expiresAt ? formatDate(premium.expiresAt) : (premium.active ? "Süresiz" : "Yok")}</span>
            <span class="muted">${esc(item.payment?.provider || premium.source || "-")}</span>
        </div>`;
}

function guildRow(guild) {
    const initials = (guild.name || "?").slice(0, 2).toUpperCase();
    const player = guild.player || {};
    const playerText = player.active
        ? player.playing ? "Çalıyor" : player.paused ? "Duraklatıldı" : "Player aktif"
        : "Boş";

    return `
        <div class="soft guild-row">
            <div class="guild-main">
                <div class="guild-icon">${guild.iconUrl ? `<img src="${esc(guild.iconUrl)}" alt="">` : esc(initials)}</div>
                <span><strong class="guild-name">${esc(guild.name)}</strong><small class="muted">${esc(guild.id)}</small></span>
            </div>
            <span>${guild.memberCount || "-"} üye<br><small class="muted">Owner: ${esc(guild.ownerId || "-")}</small></span>
            <span><span class="badge ${player.active ? "ok" : "warn"}">${playerText}</span>${player.track ? `<br><small class="muted">${esc(player.track)}</small>` : ""}</span>
            <span><span class="badge ${guild.premium?.active ? "ok" : "warn"}">${guild.premium?.active ? esc(guild.premium.plan) : "Free"}</span><br><small class="muted">${esc(guild.language || "tr")} / ${esc(guild.playerMode || "compact")}</small></span>
        </div>`;
}

function nodeCard(node) {
    return `
        <div class="soft">
            <span class="badge ${node.status === "online" ? "ok" : "bad"}">${esc(node.status)}</span>
            <h3>${esc(node.name)}</h3>
            <p>${esc(node.host)}:${esc(node.port)} | Player: ${node.playing}/${node.players}</p>
        </div>`;
}

async function grantPremium(event) {
    event.preventDefault();
    const button = event.submitter;
    setButtonState(button, "İşleniyor...", "loading");
    const body = {
        userId: val("grantUserId"),
        plan: val("grantPlan"),
        days: Number(val("grantDays") || 30),
        note: val("grantNote"),
    };
    const result = await api("/api/bot/admin/premium/grant", { method: "POST", body });
    finishAction(button, "Premium Ver", result, result.ok ? "Premium verildi." : "Premium verilemedi.", () => setStatus("grantMessage", result, result.ok ? "Premium verildi." : null));
}

async function revokePremium(event) {
    event.preventDefault();
    const button = event.submitter;
    setButtonState(button, "Kaldırılıyor...", "loading");
    const body = { userId: val("revokeUserId"), note: val("revokeNote") };
    const result = await api("/api/bot/admin/premium/revoke", { method: "POST", body });
    finishAction(button, "Premiumu Kaldır", result, result.ok ? "Premium kaldırıldı." : "Premium kaldırılamadı.", () => setStatus("revokeMessage", result, result.ok ? "Premium kaldırıldı." : null));
}

async function sendDm(event) {
    event.preventDefault();
    const button = event.submitter;
    setButtonState(button, "Gönderiliyor...", "loading");
    const result = await api("/api/bot/admin/messages/dm", {
        method: "POST",
        body: { userId: val("dmUserId"), message: val("dmMessage") },
    });
    finishAction(button, "DM Gönder", result, result.ok ? "DM gönderildi." : "DM gönderilemedi.", () => setStatus("dmStatus", result, result.ok ? "DM gönderildi." : null));
}

async function replyInbox(event, userId) {
    event.preventDefault();
    const button = event.submitter;
    const input = qs(`#reply-${CSS.escape(userId)}`);
    setButtonState(button, "Yanıtlanıyor...", "loading");
    const result = await api(`/api/bot/admin/inbox/${userId}/reply`, {
        method: "POST",
        body: { message: input?.value || "" },
    });
    finishAction(button, "Cevabı Gönder", result, result.ok ? "Cevap gönderildi." : "Cevap gönderilemedi.", () => {
        if (result.ok && input) input.value = "";
    });
}

async function sendChannel(event) {
    event.preventDefault();
    const button = event.submitter;
    setButtonState(button, "Gönderiliyor...", "loading");
    const result = await api("/api/bot/admin/messages/channel", {
        method: "POST",
        body: { channelId: val("channelId"), message: val("channelMessage") },
    });
    finishAction(button, "Kanala Gönder", result, result.ok ? "Kanal mesajı gönderildi." : "Kanal mesajı gönderilemedi.", () => setStatus("channelStatus", result, result.ok ? "Kanal mesajı gönderildi." : null));
}

function setStatus(id, result, success) {
    const element = qs(`#${id}`);
    if (!element) return;
    element.textContent = result.error || success || "Tamam.";
    element.className = `message ${result.error ? "bad" : "ok"}`;
}

function setButtonState(button, text, type) {
    if (!button) return;
    button.classList.remove("loading", "success", "error");
    if (type) button.classList.add(type);
    button.textContent = text;
    button.disabled = type === "loading";
}

function finishAction(button, defaultText, result, toastText, after) {
    const ok = !result.error;
    if (after) after();

    setButtonState(button, ok ? "Başarılı" : "Hata", ok ? "success" : "error");
    showToast(result.error || toastText, ok);
    setTimeout(() => {
        setButtonState(button, defaultText, "");
        button?.classList.remove("loading", "success", "error");
        if (button) button.disabled = false;
    }, 1800);
    setTimeout(() => refreshAll(), 900);
}

function showToast(text, ok = true) {
    const toast = qs("#toast");
    if (!toast) return;
    toast.textContent = text;
    toast.className = `toast ${ok ? "ok" : "bad"} show`;
    setTimeout(() => toast.classList.remove("show"), 3200);
}

function actionLabel(action) {
    return {
        "premium.grant": "Premium verildi",
        "premium.revoke": "Premium kaldırıldı",
        "dm.inbound": "Gelen DM",
        "message.dm": "DM gönderildi",
        "message.channel": "Kanal mesajı",
        "command.slash": "Slash komut",
        "command.prefix": "Prefix komut",
    }[action] || action;
}

function val(id) {
    return qs(`#${id}`)?.value.trim() || "";
}

function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours ? `${hours} sa ${minutes} dk` : `${minutes} dk`;
}

(async () => {
    if (state.token) {
        qs("#tokenInput").value = state.token;
        await login();
    }
})();
