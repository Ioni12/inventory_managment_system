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
  addSerial,
  removeSerial,
} = require("../controllers/groupsController");
const { ensureUniqueAssetId } = require("../utils/assetId");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/export", exportProducts);

router.post("/import", upload.single("file"), importProducts);

router.post("/:productId/groups/assign", assignUnits);

router.post("/:productId/groups/return", returnUnits);

router.post("/:productId/groups/repair", sendToRepair);

router.post("/:productId/groups/return-from-repair", returnFromRepair);

router.post("/:productId/groups/decommission", decommissionUnits);

router.delete("/:productId/groups/:groupId", deleteGroup);

router.post("/:productId/groups/:groupId/serials", addSerial);

router.delete("/:productId/groups/:groupId/serials/:serial", removeSerial);

router.use(
  "/",
  crudFactory(Product, {
    requiredFields: ["name", "category"],
    populate: "category supplier groups.currentHolder",
    beforeCreate: async (body) => ({
      ...body,
      assetId: await ensureUniqueAssetId(Product, "assetId"),
    }),
  }),
);

module.exports = router;
