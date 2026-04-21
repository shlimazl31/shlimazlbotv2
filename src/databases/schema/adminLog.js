const mongoose = require("mongoose");

const adminLogSchema = mongoose.Schema({
    action: { type: String, required: true, index: true },
    actor: { type: String, default: "admin-panel" },
    targetType: { type: String, default: null, index: true },
    targetId: { type: String, default: null, index: true },
    message: { type: String, default: null },
    metadata: { type: Object, default: () => ({}) },
    createdAt: { type: Date, default: Date.now, index: true },
});

adminLogSchema.index({ targetId: 1, createdAt: -1 });
adminLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("admin_log", adminLogSchema);
