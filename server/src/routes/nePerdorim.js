const express = require("express");
const multer = require("multer");
const { getNePerdorim } = require("../controllers/nePerdorimController");
const {
  exportNePerdorim,
  importNePerdorim,
} = require("../controllers/nePerdorimImportExport");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", getNePerdorim);
router.get("/export", exportNePerdorim);
router.post("/import", upload.single("file"), importNePerdorim);

module.exports = router;
