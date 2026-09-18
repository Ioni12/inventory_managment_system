const express = require("express");
const { logAction, diffFields } = require("../utils/logAction");
const { NotFoundError, ValidationError } = require("../utils/errors");

/**
 * Picks a human-readable label for a doc for log entries, without
 * requiring every crudFactory() call site to specify one. Tries the
 * fields that are actually meaningful across the models mounted
 * through this factory (Product, Employee, Supplier, Category).
 */
function defaultLabel(doc) {
  if (!doc) return "";
  if (doc.name && doc.assetId) return `${doc.name} (${doc.assetId})`; // Product
  if (doc.firstName || doc.lastName)
    return `${doc.firstName || ""} ${doc.lastName || ""}`.trim(); // Employee
  if (doc.name) return doc.name; // Supplier, Category
  return String(doc._id || "");
}

// Fields that only carry noise in a diff/create log (internal Mongoose
// bookkeeping), not stripped from the doc itself, just excluded when
// building the logged snapshot.
const NOISE_FIELDS = new Set(["__v", "createdAt", "updatedAt", "_id"]);

function plainSnapshot(doc) {
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const snapshot = {};
  for (const key of Object.keys(obj)) {
    if (NOISE_FIELDS.has(key)) continue;
    snapshot[key] = obj[key];
  }
  return snapshot;
}

/**
 * Builds a standard REST router (GET/POST/PUT/DELETE) for a Mongoose model.
 * @param {mongoose.Model} Model
 * @param {Object} opts
 * @param {string[]} opts.requiredFields - fields that must be present on create
 * @param {string} [opts.populate] - space-separated field(s) to populate on list/get
 * @param {(body: object) => Promise<object>} [opts.beforeCreate] - async hook to mutate/augment
 *   the request body before Model.create() is called (e.g. auto-assigning a generated field)
 * @param {(doc: object) => string} [opts.getLabel] - optional override for the
 *   human-readable label used in log entries; defaults to a smart guess
 *   (name+assetId / firstName+lastName / name) if omitted.
 */
function crudFactory(Model, opts = {}) {
  const router = express.Router();
  const {
    requiredFields = [],
    populate = "",
    beforeCreate,
    getLabel = defaultLabel,
  } = opts;
  const entityType = Model.modelName;

  // GET / - list all
  router.get("/", async (req, res, next) => {
    try {
      let query = Model.find();
      if (populate) query = query.populate(populate);
      const docs = await query.sort({ createdAt: -1 });
      res.json(docs);
    } catch (err) {
      next(err);
    }
  });

  // GET /:id - single
  router.get("/:id", async (req, res, next) => {
    try {
      let query = Model.findById(req.params.id);
      if (populate) query = query.populate(populate);
      const doc = await query;
      if (!doc) {
        throw new NotFoundError(`${entityType} not found`, "NOT_FOUND", {
          id: req.params.id,
        });
      }
      res.json(doc);
    } catch (err) {
      // An invalid ObjectId string throws a Mongoose CastError, not a
      // "not found" — distinguish so the frontend gets a clear 400
      // ("you gave me garbage") instead of a misleading 404.
      if (err.name === "CastError") {
        return next(
          new ValidationError("Invalid id", "INVALID_ID", {
            id: req.params.id,
          }),
        );
      }
      next(err);
    }
  });

  // POST / - create
  router.post("/", async (req, res, next) => {
    try {
      const missing = requiredFields.filter((f) => {
        const v = req.body[f];
        return v === undefined || v === null || v === "";
      });
      if (missing.length) {
        throw new ValidationError(
          `Missing required field(s): ${missing.join(", ")}`,
          "MISSING_FIELD",
          { fields: missing },
        );
      }
      const doc = await Model.create(
        beforeCreate ? await beforeCreate(req.body) : req.body,
      );

      await logAction({
        req,
        action: "create",
        entityType,
        entityId: doc._id,
        entityLabel: getLabel(doc),
        changes: plainSnapshot(doc),
      });

      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  });

  // PUT /:id - update
  router.put("/:id", async (req, res, next) => {
    try {
      const before = await Model.findById(req.params.id);
      if (!before) {
        throw new NotFoundError(`${entityType} not found`, "NOT_FOUND", {
          id: req.params.id,
        });
      }
      const beforeSnapshot = plainSnapshot(before);

      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!doc) {
        throw new NotFoundError(`${entityType} not found`, "NOT_FOUND", {
          id: req.params.id,
        });
      }

      const afterSnapshot = plainSnapshot(doc);
      const changes = diffFields(beforeSnapshot, afterSnapshot);
      if (Object.keys(changes).length > 0) {
        await logAction({
          req,
          action: "update",
          entityType,
          entityId: doc._id,
          entityLabel: getLabel(doc),
          changes,
        });
      }

      res.json(doc);
    } catch (err) {
      if (err.name === "CastError") {
        return next(
          new ValidationError("Invalid id", "INVALID_ID", {
            id: req.params.id,
          }),
        );
      }
      next(err);
    }
  });

  // DELETE /:id
  router.delete("/:id", async (req, res, next) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) {
        throw new NotFoundError(`${entityType} not found`, "NOT_FOUND", {
          id: req.params.id,
        });
      }

      await logAction({
        req,
        action: "delete",
        entityType,
        entityId: doc._id,
        entityLabel: getLabel(doc),
        changes: plainSnapshot(doc),
      });

      res.json({ success: true });
    } catch (err) {
      if (err.name === "CastError") {
        return next(
          new ValidationError("Invalid id", "INVALID_ID", {
            id: req.params.id,
          }),
        );
      }
      next(err);
    }
  });

  return router;
}

module.exports = crudFactory;
