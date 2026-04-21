const mongoose = require("mongoose");

const createGuild = mongoose.Schema({
    id: { type: String, required: true, index: true },
    dj: {
        status: { type: Boolean, default: false },
        role: { type: String, default: null },
    },
    reconnect: {
        status: { type: Boolean, default: false },
        text: { type: String, default: null },
        voice: { type: String, default: null },
    },
    settings: {
        language: { type: String, default: "tr" },
        musicChannelId: { type: String, default: null },
        allowedRoleIds: { type: [String], default: [] },
        themeColor: { type: String, default: null },
        playerMode: { type: String, default: "compact" },
        dynamicArtworkColor: { type: Boolean, default: false },
        miniPlayer: {
            enabled: { type: Boolean, default: false },
            channelId: { type: String, default: null },
            messageId: { type: String, default: null },
        },
        playlist: {
            enabled: { type: Boolean, default: true },
            maxPlaylists: { type: Number, default: 10 },
        },
        sleepTimer: {
            enabled: { type: Boolean, default: true },
            maxMinutes: { type: Number, default: 240 },
        },
    },
    premium: {
        active: { type: Boolean, default: false },
        plan: { type: String, default: "free" },
        planType: { type: String, default: "FREE" },
        status: { type: String, default: "canceled" },
        startedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null },
        billingType: { type: String, default: "monthly" },
        isLifetime: { type: Boolean, default: false },
        features: { type: [String], default: [] },
        source: { type: String, default: null },
        grantedBy: { type: String, default: null },
        grantedAt: { type: Date, default: null },
        revokedBy: { type: String, default: null },
        revokedAt: { type: Date, default: null },
        trial: {
            claimedBy: { type: String, default: null },
            claimedAt: { type: Date, default: null },
            onboardingVersion: { type: String, default: null },
        },
        payment: {
            provider: { type: String, default: null },
            eventName: { type: String, default: null },
            eventId: { type: String, default: null },
            objectId: { type: String, default: null },
            status: { type: String, default: null },
            customerId: { type: String, default: null },
            orderId: { type: String, default: null },
            subscriptionId: { type: String, default: null },
            productId: { type: String, default: null },
            variantId: { type: String, default: null },
            updatedAt: { type: Date, default: null },
        },
    },
});

createGuild.index({ "premium.active": 1, "premium.expiresAt": 1 });

module.exports = mongoose.model("guild", createGuild);
