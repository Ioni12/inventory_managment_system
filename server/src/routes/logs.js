const express = require("express");
const { getLogs } = require("../controllers/logsController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.get("/", requireAdmin, getLogs);

module.exports = router;
