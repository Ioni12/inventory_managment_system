const Log = require("../models/Log");
const Employee = require("../models/Employee");

/**
 * Writes a single Log entry. Never throws into the caller's flow —
 * a logging failure should not break the actual mutation it's
 * describing, so errors are swallowed (and printed) rather than
 * propagated.
 *
 * @param {object} opts
 * @param {object} opts.req - the Express request, used to resolve
 *   req.session.userId into performedBy/performedByName
 * @param {string} opts.action
 * @param {string} opts.entityType
 * @param {string|null} [opts.entityId]
 * @param {string} [opts.entityLabel]
 * @param {object} [opts.changes]
 * @param {string|null} [opts.batchId] - shared across all lines from one import run
 */
async function logAction({
  req,
  action,
  entityType,
  entityId = null,
  entityLabel = "",
  changes = {},
  batchId = null,
}) {
  try {
    const userId = req?.session?.userId;
    let performedByName = "";
    if (userId) {
      const employee =
        await Employee.findById(userId).select("firstName lastName");
      if (employee) {
        performedByName = `${employee.firstName} ${employee.lastName}`;
      }
    }

    await Log.create({
      batchId,
      action,
      entityType,
      entityId,
      entityLabel,
      performedBy: userId || null,
      performedByName,
      changes,
    });
  } catch (err) {
    // Logging must never break the operation it's describing.
    console.error("logAction failed:", err.message);
  }
}

/**
 * Diffs two plain objects (e.g. a Mongoose doc's pre-update snapshot vs.
 * the fields being applied) and returns only the fields that actually
 * changed, as { field: { from, to } }. Shallow — fine for the flat
 * entities (Product batch fields, Employee, Supplier, Category) this
 * is used against; does not recurse into nested objects/arrays like
 * Product.groups (group changes are logged separately by the group
 * action handlers, not via this diff).
 */
function diffFields(before, after) {
  const changes = {};
  for (const key of Object.keys(after)) {
    const beforeVal = before ? before[key] : undefined;
    const afterVal = after[key];
    const beforeStr = beforeVal === undefined ? undefined : String(beforeVal);
    const afterStr = afterVal === undefined ? undefined : String(afterVal);
    if (beforeStr !== afterStr) {
      changes[key] = { from: beforeVal ?? null, to: afterVal ?? null };
    }
  }
  return changes;
}

module.exports = { logAction, diffFields };
