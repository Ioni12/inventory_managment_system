const mongoose = require("mongoose");

const assetUnitSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    assetCode: { type: String, default: "" }, // e.g. IT-0001
    serial: { type: String, default: "" },
    iccid: { type: String, default: "" },
    imei: { type: String, default: "" },
    status: {
      type: String,
      enum: ["in_stock", "assigned", "in_repair", "decommissioned"],
      default: "in_stock",
    },
    condition: {
      type: String,
      enum: ["new", "good", "fair", "damaged"],
      default: "new",
    },
    holderType: {
      type: String,
      enum: ["employee", "none"],
      default: "none",
    },
    holder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },
    purchaseDate: { type: Date },
    warrantyUntil: { type: Date },
    accessories: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AssetUnit", assetUnitSchema, "asset_units");
