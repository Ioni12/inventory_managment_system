const express = require("express");
const multer = require("multer");
const crudFactory = require("./crudFactory");
const Supplier = require("../models/Supplier");
const {
  exportSuppliers,
  importSuppliers,
} = require("../controllers/suppliersImportExport");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Specific routes must come before the generic CRUD router below,
// otherwise they'd be swallowed by the generic '/:id' pattern.
router.get("/export", exportSuppliers);
router.post("/import", requireAdmin, upload.single("file"), importSuppliers);

router.use(
  "/",
  crudFactory(Supplier, {
    requiredFields: ["name"],
  }),
);

module.exports = router;
