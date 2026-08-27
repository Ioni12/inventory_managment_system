const express = require("express");
const multer = require("multer");
const crudFactory = require("./crudFactory");
const Product = require("../models/Product");
const {
  exportProducts,
  importProducts,
} = require("../controllers/productsController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Specific routes must come before the generic CRUD router below,
// otherwise '/export' and '/import' would be swallowed by '/:id'.
router.get("/export", exportProducts);
router.post("/import", upload.single("file"), importProducts);

router.use(
  "/",
  crudFactory(Product, {
    requiredFields: ["name", "category"],
    populate: "category supplier",
  }),
);

module.exports = router;
