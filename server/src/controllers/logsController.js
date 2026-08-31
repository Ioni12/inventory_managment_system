const Log = require("../models/Log");

// GET /api/logs?entityType=Product&action=update&page=1&limit=50
async function getLogs(req, res) {
  try {
    const { entityType, action, batchId } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(req.query.limit, 10) || 50),
    );

    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (batchId) filter.batchId = batchId;

    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Log.countDocuments(filter),
    ]);

    res.json({
      logs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getLogs };
