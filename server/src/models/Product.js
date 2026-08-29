const mongoose = require("mongoose");

const STATUS_VALUES = [
  "Ne magazine",
  "Ne perdorim",
  "Ne riparim",
  "Jashte perdorimit",
];

// One entry per distinct (status, currentHolder) combination in the batch.
// Two units sharing both values live in the same group, represented by quantity.
const groupSchema = new mongoose.Schema({
  quantity: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: STATUS_VALUES,
    default: "Ne magazine",
  },
  currentHolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    assetId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    branding: { type: String, default: "" },
    unit: { type: String, default: "piece" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    purchasePrice: { type: Number, default: 0 },
    description: { type: String, default: "" },
    groups: { type: [groupSchema], default: [] },
  },
  { timestamps: true },
);

// stock = total units on the books across ALL groups, including
// decommissioned ones (they still count until the group is deleted).
productSchema.virtual("stock").get(function () {
  return this.groups.reduce((sum, g) => sum + g.quantity, 0);
});

// availableStock = units sitting in stock, unassigned, usable.
productSchema.virtual("availableStock").get(function () {
  return this.groups
    .filter((g) => g.status === "Ne magazine")
    .reduce((sum, g) => sum + g.quantity, 0);
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema, "products");
module.exports.STATUS_VALUES = STATUS_VALUES;
