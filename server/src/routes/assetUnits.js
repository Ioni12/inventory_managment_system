const express = require("express");
const AssetUnit = require("../models/AssetUnit");

const router = express.Router();

const POPULATE_FIELDS = "product holder location";

function flatten(doc) {
  const obj = doc.toObject();
  return {
    ...obj,
    productName: obj.product?.name || "",
    holderName: obj.holder
      ? `${obj.holder.firstName} ${obj.holder.lastName}`
      : "",
    locationName: obj.location?.name || "",
  };
}

// GET / - list all, populated and flattened
router.get("/", async (req, res) => {
  try {
    const docs = await AssetUnit.find()
      .populate("product")
      .populate("holder")
      .populate("location")
      .sort({ createdAt: -1 });
    res.json(docs.map(flatten));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  try {
    const doc = await AssetUnit.findById(req.params.id)
      .populate("product")
      .populate("holder")
      .populate("location");
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(flatten(doc));
  } catch (err) {
    res.status(400).json({ error: "Invalid id" });
  }
});

// POST / - create
router.post("/", async (req, res) => {
  try {
    if (!req.body.product) {
      return res.status(400).json({ error: "Missing required field: product" });
    }
    const doc = await AssetUnit.create(req.body);
    const populated = await doc.populate(POPULATE_FIELDS);
    res.status(201).json(flatten(populated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /:id - update
router.put("/:id", async (req, res) => {
  try {
    const doc = await AssetUnit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate(POPULATE_FIELDS);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(flatten(doc));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  try {
    const doc = await AssetUnit.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
