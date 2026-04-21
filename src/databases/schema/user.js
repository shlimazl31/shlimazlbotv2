const mongoose = require("mongoose");

const createUser = mongoose.Schema({
    id: { type: String, required: true },
    ban: {
        status: { type: Boolean, default: false },
        reason: { type: String, default: null },
    },
    dashboard: {
        firstLoginAt: { type: Date, default: null },
        lastLoginAt: { type: Date, default: null },
        loginCount: { type: Number, default: 0 },
        username: { type: String, default: null },
        globalName: { type: String, default: null },
        avatar: { type: String, default: null },
        guilds: {
            type: [
                {
                    id: { type: String, default: null },
                    name: { type: String, default: null },
                    icon: { type: String, default: null },
                    owner: { type: Boolean, default: false },
                    permissions: { type: String, default: "0" },
                    canManage: { type: Boolean, default: false },
                    lastSeenAt: { type: Date, default: null },
                },
            ],
            default: [],
        },
        trial: {
            claimed: { type: Boolean, default: false },
            guildId: { type: String, default: null },
            claimedAt: { type: Date, default: null },
            expiresAt: { type: Date, default: null },
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
        features: { type: Array, default: [] },
        source: { type: String, default: null },
        grantedBy: { type: String, default: null },
        grantedAt: { type: Date, default: null },
        revokedBy: { type: String, default: null },
        revokedAt: { type: Date, default: null },
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
    playlists: {
        type: [
            {
                name: { type: String, required: true },
                tracks: {
                    type: [
                        {
                            title: { type: String, default: "Unknown" },
                            author: { type: String, default: "Unknown" },
                            uri: { type: String, default: null },
                            duration: { type: Number, default: 0 },
                            artworkUrl: { type: String, default: null },
                            addedAt: { type: Date, default: Date.now },
                        },
                    ],
                    default: [],
                },
                createdAt: { type: Date, default: Date.now },
                updatedAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    },
    likedSongs: {
        type: [
            {
                title: { type: String, default: "Unknown" },
                author: { type: String, default: "Unknown" },
                uri: { type: String, default: null },
                duration: { type: Number, default: 0 },
                artworkUrl: { type: String, default: null },
                likedAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    },
});

module.exports = mongoose.model("user", createUser);
