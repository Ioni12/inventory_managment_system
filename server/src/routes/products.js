const express = require("express");
const multer = require("multer");
const crudFactory = require("./crudFactory");
const Product = require("../models/Product");
const {
  exportProducts,
  importProducts,
} = require("../controllers/productsController");
const {
  addSerial,
  updateSerial,
  deleteSerial,
  getAssignedSerials,
} = require("../controllers/serialsController");
const { ensureUniqueAssetId } = require("../utils/assetId");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Specific routes must come before the generic CRUD router below,
// otherwise they'd be swallowed by the generic '/:id' pattern.
router.get("/export", exportProducts);
router.post("/import", upload.single("file"), importProducts);
router.get("/assigned", getAssignedSerials);

router.post("/:productId/serials", addSerial);
router.put("/:productId/serials/:serialId", updateSerial);
router.delete("/:productId/serials/:serialId", deleteSerial);

router.use(
  "/",
  crudFactory(Product, {
    requiredFields: ["name", "category"],
    populate: "category supplier",
    // Every Product gets a generated assetId on creation, regardless of
    // whether the client sent one (client-supplied assetId is ignored here
    // on purpose — generation is the single source of truth for new items).
    beforeCreate: async (body) => ({
      ...body,
      assetId: await ensureUniqueAssetId(Product, "assetId"),
    }),
  }),
);

module.exports = router;
