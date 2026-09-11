const Product = require("../models/Product");
const Employee = require("../models/Employee");
const { moveUnits } = require("../utils/productGroups");
const { logAction } = require("../utils/logAction");

async function loadProduct(req, res) {
  const product = await Product.findById(req.params.productId);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return product;
}

async function holderLabel(holderId) {
  if (!holderId) return null;
  const employee =
    await Employee.findById(holderId).select("firstName lastName");
  return employee ? `${employee.firstName} ${employee.lastName}` : null;
}

function productLabel(product) {
  return `${product.name} (${product.assetId})`;
}

// POST /api/products/:productId/groups/assign
// body: { fromStatus, fromHolder, toHolder, quantity, serials? }
// Assigns `quantity` units currently in `fromStatus`/`fromHolder` to `toHolder`.
// Status stays the same by default unless caller also wants to flip it —
// for a plain assignment, status is typically 'Ne magazine' -> 'Ne perdorim'.
// `serials` is optional — omitted/empty means a pure count-only move,
// same as before this feature existed.
async function assignUnits(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { fromStatus, fromHolder, toHolder, quantity, serials } = req.body;
    if (!toHolder)
      return res.status(400).json({ error: "toHolder is required" });

    moveUnits(
      product,
      {
        status: fromStatus || "Ne magazine",
        currentHolder: fromHolder || null,
      },
      { status: "Ne perdorim", currentHolder: toHolder },
      Number(quantity),
      serials || [],
    );

    await product.save();

    const toName = await holderLabel(toHolder);
    await logAction({
      req,
      action: "assign",
      entityType: "Group",
      entityId: product._id,
      entityLabel: `${productLabel(product)}${toName ? ` -> ${toName}` : ""}`,
      changes: {
        quantity: Number(quantity),
        fromStatus: fromStatus || "Ne magazine",
        toStatus: "Ne perdorim",
        toHolder: toName,
        ...(serials && serials.length ? { serials } : {}),
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/products/:productId/groups/return
// body: { fromHolder, quantity, serials? }
// Returns `quantity` units from a holder back to unassigned stock.
async function returnUnits(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { fromHolder, quantity, serials } = req.body;
    if (!fromHolder)
      return res.status(400).json({ error: "fromHolder is required" });

    moveUnits(
      product,
      { status: "Ne perdorim", currentHolder: fromHolder },
      { status: "Ne magazine", currentHolder: null },
      Number(quantity),
      serials || [],
    );

    await product.save();

    const fromName = await holderLabel(fromHolder);
    await logAction({
      req,
      action: "return",
      entityType: "Group",
      entityId: product._id,
      entityLabel: `${productLabel(product)}${fromName ? ` <- ${fromName}` : ""}`,
      changes: {
        quantity: Number(quantity),
        fromHolder: fromName,
        ...(serials && serials.length ? { serials } : {}),
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/products/:productId/groups/repair
// body: { fromStatus, fromHolder, quantity, serials? }
// Sends units to repair. currentHolder is left UNTOUCHED (rule #4) —
// a unit in repair is still conceptually with its holder (or unassigned).
async function sendToRepair(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { fromStatus, fromHolder, quantity, serials } = req.body;

    moveUnits(
      product,
      {
        status: fromStatus || "Ne magazine",
        currentHolder: fromHolder || null,
      },
      { status: "Ne riparim", currentHolder: fromHolder || null }, // holder unchanged
      Number(quantity),
      serials || [],
    );

    await product.save();

    const holderName = await holderLabel(fromHolder);
    await logAction({
      req,
      action: "repair",
      entityType: "Group",
      entityId: product._id,
      entityLabel: productLabel(product),
      changes: {
        quantity: Number(quantity),
        fromStatus: fromStatus || "Ne magazine",
        holder: holderName,
        ...(serials && serials.length ? { serials } : {}),
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/products/:productId/groups/return-from-repair
// body: { toStatus, holder, quantity, serials? }
// Returns units from repair back to a given status. holder unchanged throughout.
async function returnFromRepair(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { toStatus, holder, quantity, serials } = req.body;

    moveUnits(
      product,
      { status: "Ne riparim", currentHolder: holder || null },
      { status: toStatus || "Ne magazine", currentHolder: holder || null }, // holder unchanged
      Number(quantity),
      serials || [],
    );

    await product.save();

    const holderName = await holderLabel(holder);
    await logAction({
      req,
      action: "return-from-repair",
      entityType: "Group",
      entityId: product._id,
      entityLabel: productLabel(product),
      changes: {
        quantity: Number(quantity),
        toStatus: toStatus || "Ne magazine",
        holder: holderName,
        ...(serials && serials.length ? { serials } : {}),
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/products/:productId/groups/decommission
// body: { fromStatus, fromHolder, quantity, serials? }
// Decommissions units: status -> Jashte perdorimit AND currentHolder -> null
// (rule #4 — NOT symmetric with repair; a decommissioned unit isn't
// coming back to anyone).
async function decommissionUnits(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { fromStatus, fromHolder, quantity, serials } = req.body;

    moveUnits(
      product,
      {
        status: fromStatus || "Ne magazine",
        currentHolder: fromHolder || null,
      },
      { status: "Jashte perdorimit", currentHolder: null }, // holder cleared
      Number(quantity),
      serials || [],
    );

    await product.save();

    const holderName = await holderLabel(fromHolder);
    await logAction({
      req,
      action: "decommission",
      entityType: "Group",
      entityId: product._id,
      entityLabel: productLabel(product),
      changes: {
        quantity: Number(quantity),
        fromStatus: fromStatus || "Ne magazine",
        holderCleared: holderName || null,
        ...(serials && serials.length ? { serials } : {}),
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/products/:productId/groups/:groupId
// Deletes a single group bucket outright (not a quantity move).
async function deleteGroup(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const group = product.groups.id(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const snapshot = {
      status: group.status,
      quantity: group.quantity,
      holder: await holderLabel(group.currentHolder),
      serials: group.serials,
    };

    group.deleteOne();
    await product.save();

    await logAction({
      req,
      action: "delete-group",
      entityType: "Group",
      entityId: product._id,
      entityLabel: productLabel(product),
      changes: snapshot,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/products/:productId/groups/:groupId/serials
// body: { serial }
// Tags a single physical unit within an existing group bucket with a
// serial, WITHOUT moving any units between buckets. Uniqueness is
// enforced per-Product across all of that product's groups[].serials
// (case-sensitive exact match, first pass).
async function addSerial(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { serial } = req.body;
    if (!serial || !String(serial).trim()) {
      return res.status(400).json({ error: "serial is required" });
    }
    const value = String(serial).trim();

    const group = product.groups.id(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const alreadyUsed = product.groups.some((g) => g.serials.includes(value));
    if (alreadyUsed) {
      return res
        .status(400)
        .json({ error: `Serial "${value}" already exists on this product` });
    }

    if (group.serials.length >= group.quantity) {
      return res.status(400).json({
        error: `Cannot tag more serials than units in this group (${group.quantity})`,
      });
    }

    group.serials.push(value);
    await product.save();

    await logAction({
      req,
      action: "add-serial",
      entityType: "Group",
      entityId: product._id,
      entityLabel: `${productLabel(product)} — ${value}`,
      changes: {
        serial: value,
        status: group.status,
        holder: await holderLabel(group.currentHolder),
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/products/:productId/groups/:groupId/serials/:serial
// Untags a serial from a group without moving any units.
async function removeSerial(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const group = product.groups.id(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const { serial } = req.params;
    const idx = group.serials.indexOf(serial);
    if (idx === -1) {
      return res
        .status(404)
        .json({ error: `Serial "${serial}" not found in this group` });
    }

    group.serials.splice(idx, 1);
    await product.save();

    await logAction({
      req,
      action: "remove-serial",
      entityType: "Group",
      entityId: product._id,
      entityLabel: `${productLabel(product)} — ${serial}`,
      changes: {
        serial,
        status: group.status,
        holder: await holderLabel(group.currentHolder),
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = {
  assignUnits,
  returnUnits,
  sendToRepair,
  returnFromRepair,
  decommissionUnits,
  deleteGroup,
  addSerial,
  removeSerial,
};
