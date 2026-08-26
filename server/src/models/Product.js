const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, default: "" },
    sku: { type: String, default: "" },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    unit: { type: String, default: "piece" },
    purchasePrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    description: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema, "products");
