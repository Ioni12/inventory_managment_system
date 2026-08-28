const mongoose = require("mongoose");

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
    serial: { type: String, default: "" },
    branding: { type: String, default: "" },
    stock: { type: Number, default: 0 },
    unit: { type: String, default: "piece" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    purchasePrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Ne magazine", "Ne perdorim", "Ne riparim", "Jashte perdorimit"],
      default: "Ne magazine",
    },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema, "products");
