const crypto = require("crypto");

const PLAN_VARIANT_ENV = {
    plus: "LEMONSQUEEZY_PLUS_VARIANT_ID",
    pro: "LEMONSQUEEZY_PRO_VARIANT_ID",
};

const PLAN_LABELS = {
    plus: "Plus",
    pro: "Pro",
};

function getPaymentConfig() {
    return {
        apiKey: process.env.LEMONSQUEEZY_API_KEY,
        storeId: process.env.LEMONSQUEEZY_STORE_ID,
        webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
        successUrl: process.env.LEMONSQUEEZY_SUCCESS_URL || "https://dashboard.yakupsemihbulut.com/dashboard",
    };
}

function getVariantId(plan) {
    const envName = PLAN_VARIANT_ENV[plan];
    return envName ? process.env[envName] : null;
}

function getPlanFromVariant(variantId) {
    const normalized = String(variantId || "");
    return Object.entries(PLAN_VARIANT_ENV).find(([, envName]) => process.env[envName] === normalized)?.[0] || null;
}

function assertCheckoutConfig(plan) {
    const config = getPaymentConfig();
    const missing = [];
    const variantId = getVariantId(plan);

    if (!config.apiKey) missing.push("LEMONSQUEEZY_API_KEY");
    if (!config.storeId) missing.push("LEMONSQUEEZY_STORE_ID");
    if (!variantId) missing.push(PLAN_VARIANT_ENV[plan] || "LEMONSQUEEZY_*_VARIANT_ID");

    return { ok: missing.length === 0, missing, config, variantId };
}

async function createPremiumCheckout({ userId, plan }) {
    if (!PLAN_VARIANT_ENV[plan]) {
        return { ok: false, status: 400, error: "Geçersiz premium planı." };
    }

    const { ok, missing, config, variantId } = assertCheckoutConfig(plan);
    if (!ok) {
        return {
            ok: false,
            status: 503,
            error: "Lemon Squeezy ödeme ayarları eksik.",
            missing,
        };
    }

    const label = PLAN_LABELS[plan];
    const body = {
        data: {
            type: "checkouts",
            attributes: {
                product_options: {
                    name: `ShlimazlBot ${label}`,
                    description: "Discord için dijital müzik botu ve yazılım hizmeti. Premium hesap bazlıdır ve botun bulunduğu sunucularda otomatik çalışır.",
                    enabled_variants: [Number(variantId)],
                    redirect_url: `${config.successUrl}?payment=success&plan=${encodeURIComponent(plan)}`,
                    receipt_button_text: "Open Dashboard",
                    receipt_link_url: config.successUrl,
                    receipt_thank_you_note: "Thank you for purchasing ShlimazlBot Premium. Open the dashboard to manage your premium account and bot settings.",
                },
                test_mode: process.env.LEMONSQUEEZY_TEST_MODE === "true",
                checkout_data: {
                    custom: {
                        premium_scope: "user",
                        discord_user_id: userId,
                        plan,
                        source: "dashboard",
                    },
                },
            },
            relationships: {
                store: {
                    data: {
                        type: "stores",
                        id: String(config.storeId),
                    },
                },
                variant: {
                    data: {
                        type: "variants",
                        id: String(variantId),
                    },
                },
            },
        },
    };

    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
        method: "POST",
        headers: {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        return {
            ok: false,
            status: response.status,
            error: payload?.errors?.[0]?.detail || payload?.message || "Lemon Squeezy checkout oluşturulamadı.",
        };
    }

    return {
        ok: true,
        checkoutId: payload.data?.id || null,
        url: payload.data?.attributes?.url || null,
    };
}

function verifyWebhookSignature(rawBody, signature) {
    const secret = getPaymentConfig().webhookSecret;
    if (!secret) return { ok: false, status: 503, error: "LEMONSQUEEZY_WEBHOOK_SECRET eksik." };
    if (!signature) return { ok: false, status: 401, error: "Webhook imzası eksik." };

    const expected = Buffer.from(crypto.createHmac("sha256", secret).update(rawBody || "").digest("hex"), "utf8");
    const actual = Buffer.from(String(signature), "utf8");

    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
        return { ok: false, status: 401, error: "Webhook imzası geçersiz." };
    }

    return { ok: true };
}

function normalizeWebhookPayload(payload = {}) {
    const meta = payload.meta || {};
    const data = payload.data || {};
    const attributes = data.attributes || {};
    const custom = meta.custom_data || {};
    const variantId = String(attributes.variant_id || data.relationships?.variant?.data?.id || custom.variant_id || "");
    const plan = custom.plan || getPlanFromVariant(variantId);

    return {
        eventName: meta.event_name || null,
        eventId: meta.webhook_id || payload.id || null,
        custom,
        premiumScope: "user",
        guildId: null,
        userId: custom.discord_user_id || custom.user_id || custom.userId || null,
        plan,
        provider: "lemonsqueezy",
        objectId: data.id || null,
        attributes,
        status: attributes.status || null,
        variantId,
        productId: attributes.product_id ? String(attributes.product_id) : null,
        customerId: attributes.customer_id ? String(attributes.customer_id) : null,
        orderId: attributes.order_id ? String(attributes.order_id) : null,
        subscriptionId: data.type === "subscriptions" ? String(data.id) : attributes.subscription_id ? String(attributes.subscription_id) : null,
    };
}

module.exports = {
    createPremiumCheckout,
    getPlanFromVariant,
    normalizeWebhookPayload,
    verifyWebhookSignature,
};
