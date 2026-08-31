const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    // Groups all log lines from a single import run together. Null for
    // live/interactive actions (a single manual edit, a group action).
    batchId: { type: mongoose.Schema.Types.ObjectId, default: null },

    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "delete",
        "assign",
        "return",
        "repair",
        "return-from-repair",
        "decommission",
        "delete-group",
        "import-summary", // one per import run, alongside the per-item lines
      ],
    },

    entityType: {
      type: String,
      required: true,
      enum: ["Product", "Employee", "Supplier", "Category", "Group"],
    },

    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },

    // Human-readable snapshot — survives the entity being renamed or
    // deleted later, so old log lines still read sensibly.
    entityLabel: { type: String, default: "" },

    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    performedByName: { type: String, default: "" },

    // For 'update': { fieldName: { from, to } } for each field that
    // actually changed. For 'create': the full created object (minus
    // internal fields). For 'delete': a snapshot of what was deleted.
    // For group actions: { quantity, fromStatus, toStatus, holderBefore, holderAfter }.
    // For 'import-summary': { filename, created, updated, skipped }.
    changes: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

logSchema.index({ createdAt: -1 });
logSchema.index({ entityType: 1, createdAt: -1 });
logSchema.index({ batchId: 1 });

module.exports = mongoose.model("Log", logSchema, "logs");
