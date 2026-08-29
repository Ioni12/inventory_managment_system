const express = require("express");
const multer = require("multer");
const crudFactory = require("./crudFactory");
const Product = require("../models/Product");
const {
  exportProducts,
  importProducts,
} = require("../controllers/productsController");
const {
  assignUnits,
  returnUnits,
  sendToRepair,
  returnFromRepair,
  decommissionUnits,
  deleteGroup,
} = require("../controllers/groupsController");
const { ensureUniqueAssetId } = require("../utils/assetId");
const { getNePerdorim } = require("../controllers/nePerdorimController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Specific routes must come before the generic CRUD router below,
// otherwise they'd be swallowed by the generic '/:id' pattern.
router.get("/export", exportProducts);
router.post("/import", upload.single("file"), importProducts);
router.get("/ne-perdorim", getNePerdorim);

router.post("/:productId/groups/assign", assignUnits);
router.post("/:productId/groups/return", returnUnits);
router.post("/:productId/groups/repair", sendToRepair);
router.post("/:productId/groups/return-from-repair", returnFromRepair);
router.post("/:productId/groups/decommission", decommissionUnits);
router.delete("/:productId/groups/:groupId", deleteGroup);

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
