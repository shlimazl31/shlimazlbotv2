function canSendNotice(client, key, cooldownMs) {
    if (!client.noticeCooldowns) client.noticeCooldowns = new Map();

    const now = Date.now();
    const lastSentAt = client.noticeCooldowns.get(key) || 0;

    if (now - lastSentAt < cooldownMs) return false;

    client.noticeCooldowns.set(key, now);
    return true;
}

module.exports = {
    canSendNotice,
};
