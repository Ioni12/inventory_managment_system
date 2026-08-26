const express = require("express");

/**
 * Builds a standard REST router (GET/POST/PUT/DELETE) for a Mongoose model.
 * @param {mongoose.Model} Model
 * @param {Object} opts
 * @param {string[]} opts.requiredFields - fields that must be present on create
 * @param {string} [opts.populate] - space-separated field(s) to populate on list/get
 */
function crudFactory(Model, opts = {}) {
  const router = express.Router();
  const { requiredFields = [], populate = "" } = opts;

  // GET / - list all
  router.get("/", async (req, res) => {
    try {
      let query = Model.find();
      if (populate) query = query.populate(populate);
      const docs = await query.sort({ createdAt: -1 });
      res.json(docs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /:id - single
  router.get("/:id", async (req, res) => {
    try {
      let query = Model.findById(req.params.id);
      if (populate) query = query.populate(populate);
      const doc = await query;
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json(doc);
    } catch (err) {
      res.status(400).json({ error: "Invalid id" });
    }
  });

  // POST / - create
  router.post("/", async (req, res) => {
    try {
      const missing = requiredFields.filter((f) => {
        const v = req.body[f];
        return v === undefined || v === null || v === "";
      });
      if (missing.length) {
        return res
          .status(400)
          .json({ error: `Missing required field(s): ${missing.join(", ")}` });
      }
      const doc = await Model.create(req.body);
      res.status(201).json(doc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /:id - update
  router.put("/:id", async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json(doc);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /:id
  router.delete("/:id", async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}

module.exports = crudFactory;
