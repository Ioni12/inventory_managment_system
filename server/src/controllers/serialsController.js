const Product = require("../models/Product");

// POST /api/products/:productId/serials - add a new serial unit to a batch
async function addSerial(req, res) {
  try {
    const { serial, status } = req.body;
    if (!serial) {
      return res.status(400).json({ error: "serial is required" });
    }

    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    product.serials.push({ serial, status: status || "Ne magazine" });
    await product.save();

    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// PUT /api/products/:productId/serials/:serialId - edit one serial unit.
// If currentHolder changes, automatically closes out the old history entry
// and opens a new one — this is the "always log it" rule.
async function updateSerial(req, res) {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const unit = product.serials.id(req.params.serialId);
    if (!unit) return res.status(404).json({ error: "Serial not found" });

    const { serial, status, currentHolder } = req.body;

    const holderChanged =
      currentHolder !== undefined &&
      String(currentHolder || "") !== String(unit.currentHolder || "");

    if (holderChanged) {
      // Close out the currently-open history entry (the one with no returnedDate)
      const openEntry = unit.history.find((h) => !h.returnedDate);
      if (openEntry) {
        openEntry.returnedDate = new Date();
      }

      // If assigning to someone new (not clearing to null), open a new entry
      if (currentHolder) {
        unit.history.push({
          employee: currentHolder,
          assignedDate: new Date(),
        });
      }

      unit.currentHolder = currentHolder || null;
    }

    if (serial !== undefined) unit.serial = serial;
    if (status !== undefined) unit.status = status;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// DELETE /api/products/:productId/serials/:serialId - remove one unit from the batch
async function deleteSerial(req, res) {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const unit = product.serials.id(req.params.serialId);
    if (!unit) return res.status(404).json({ error: "Serial not found" });

    unit.deleteOne();
    await product.save();

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /api/products/assigned - flat list of all currently-assigned serials,
// joined with employee info, matching the "Ne Perdorim" sheet shape.
async function getAssignedSerials(req, res) {
  try {
    const products = await Product.find().populate("serials.currentHolder");

    const rows = [];
    products.forEach((product) => {
      product.serials.forEach((unit) => {
        if (!unit.currentHolder) return;
        const employee = unit.currentHolder;
        rows.push({
          productName: product.name,
          assetId: product.assetId,
          serial: unit.serial,
          status: unit.status,
          employeeId: employee._id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          company: employee.company,
          department: employee.department,
          email: employee.email,
          emails: employee.emails,
          phone: employee.phone,
          badgeQr: employee.badgeQr,
        });
      });
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { addSerial, updateSerial, deleteSerial, getAssignedSerials };
