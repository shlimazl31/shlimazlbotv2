const { WebhookClient } = require("discord.js");

module.exports = (client) => {
    const webhookUrl = process.env.ERROR_WEBHOOK_URL;
    const webhook = webhookUrl ? new WebhookClient({ url: webhookUrl }) : null;

    const sendWebhook = (content) => {
        if (!webhook) return Promise.resolve();
        return webhook.send({ content }).catch(() => {});
    };

    process.on("unhandledRejection", (reason, promise) => {
        console.log("0|shlimazl | [Anticrash] | [UnhandledRejection_Logs] | [start] : ===============");
        console.log("0|shlimazl | Unhandled Rejection at:", promise);
        console.log("0|shlimazl | } reason:", reason);
        console.log("0|shlimazl | [Anticrash] | [UnhandledRejection_Logs] | [end] : ===============");

        sendWebhook(`**Unhandled Rejection**\n\`\`\`js\n${reason.stack || reason}\`\`\``);
    });

    process.on("uncaughtException", (err) => {
        console.log("0|shlimazl | [Anticrash] | [UncaughtException_Logs] | [start] : ===============");
        console.log("0|shlimazl | Uncaught Exception:", err);
        console.log("0|shlimazl | [Anticrash] | [UncaughtException_Logs] | [end] : ===============");

        sendWebhook(`**Uncaught Exception**\n\`\`\`js\n${err.stack}\`\`\``);
    });

    process.on("uncaughtExceptionMonitor", (err) => {
        console.log("0|shlimazl | [Anticrash] | [UncaughtExceptionMonitor_Logs] | [start] : ===============");
        console.log("0|shlimazl | Uncaught Exception Monitor:", err);
        console.log("0|shlimazl | [Anticrash] | [UncaughtExceptionMonitor_Logs] | [end] : ===============");

        sendWebhook(`**Uncaught Exception Monitor**\n\`\`\`js\n${err.stack}\`\`\``);
    });

    process.on("warning", (warning) => {
        console.log("0|shlimazl | [Anticrash] | [Warning_Logs] | [start] : ===============");
        console.log("0|shlimazl | Warning:", warning);
        console.log("0|shlimazl | [Anticrash] | [Warning_Logs] | [end] : ===============");

        sendWebhook(`**Warning**\n\`\`\`js\n${warning.stack}\`\`\``);
    });

    console.log("[INFO] Anticrash events loaded");
};
