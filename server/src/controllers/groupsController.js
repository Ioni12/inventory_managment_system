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
// body: { fromStatus, fromHolder, toHolder, quantity }
// Assigns `quantity` units currently in `fromStatus`/`fromHolder` to `toHolder`.
// Status stays the same by default unless caller also wants to flip it —
// for a plain assignment, status is typically 'Ne magazine' -> 'Ne perdorim'.
async function assignUnits(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { fromStatus, fromHolder, toHolder, quantity } = req.body;
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
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/products/:productId/groups/return
// body: { fromHolder, quantity }
// Returns `quantity` units from a holder back to unassigned stock.
async function returnUnits(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { fromHolder, quantity } = req.body;
    if (!fromHolder)
      return res.status(400).json({ error: "fromHolder is required" });

    moveUnits(
      product,
      { status: "Ne perdorim", currentHolder: fromHolder },
      { status: "Ne magazine", currentHolder: null },
      Number(quantity),
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
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/products/:productId/groups/repair
// body: { fromStatus, fromHolder, quantity }
// Sends units to repair. currentHolder is left UNTOUCHED (rule #4) —
// a unit in repair is still conceptually with its holder (or unassigned).
async function sendToRepair(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { fromStatus, fromHolder, quantity } = req.body;

    moveUnits(
      product,
      {
        status: fromStatus || "Ne magazine",
        currentHolder: fromHolder || null,
      },
      { status: "Ne riparim", currentHolder: fromHolder || null }, // holder unchanged
      Number(quantity),
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
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/products/:productId/groups/return-from-repair
// body: { toStatus, holder, quantity }
// Returns units from repair back to a given status. holder unchanged throughout.
async function returnFromRepair(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { toStatus, holder, quantity } = req.body;

    moveUnits(
      product,
      { status: "Ne riparim", currentHolder: holder || null },
      { status: toStatus || "Ne magazine", currentHolder: holder || null }, // holder unchanged
      Number(quantity),
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
      },
    });

    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// POST /api/products/:productId/groups/decommission
// body: { fromStatus, fromHolder, quantity }
// Decommissions units: status -> Jashte perdorimit AND currentHolder -> null
// (rule #4 — NOT symmetric with repair; a decommissioned unit isn't
// coming back to anyone).
async function decommissionUnits(req, res) {
  try {
    const product = await loadProduct(req, res);
    if (!product) return;

    const { fromStatus, fromHolder, quantity } = req.body;

    moveUnits(
      product,
      {
        status: fromStatus || "Ne magazine",
        currentHolder: fromHolder || null,
      },
      { status: "Jashte perdorimit", currentHolder: null }, // holder cleared
      Number(quantity),
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

module.exports = {
  assignUnits,
  returnUnits,
  sendToRepair,
  returnFromRepair,
  decommissionUnits,
  deleteGroup,
};
