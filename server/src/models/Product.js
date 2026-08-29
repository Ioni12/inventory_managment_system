const mongoose = require("mongoose");

const STATUS_VALUES = [
  "Ne magazine",
  "Ne perdorim",
  "Ne riparim",
  "Jashte perdorimit",
];

// One entry per past-or-current assignment of a specific serial to an employee.
const historyEntrySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    assignedDate: { type: Date, default: Date.now },
    returnedDate: { type: Date, default: null },
  },
  { _id: false },
);

// One entry per physical unit within a Product batch.
const serialSchema = new mongoose.Schema({
  serial: { type: String, required: true, trim: true },
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
  history: { type: [historyEntrySchema], default: [] },
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
    serials: { type: [serialSchema], default: [] },
  },
  { timestamps: true },
);

// stock is derived from how many serials exist in the batch — not stored
// separately, so it can never drift out of sync with the actual serial list.
productSchema.virtual("stock").get(function () {
  return this.serials.length;
});

// availableStock = units not currently assigned to anyone.
productSchema.virtual("availableStock").get(function () {
  return this.serials.filter((s) => !s.currentHolder).length;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema, "products");
module.exports.STATUS_VALUES = STATUS_VALUES;
