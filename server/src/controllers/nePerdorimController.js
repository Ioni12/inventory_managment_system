const Product = require("../models/Product");

/**
 * Builds the "Ne Perdorim" row set: one row per group where status is
 * 'Ne perdorim', across all Products, with the holder's Employee data
 * joined in. This is a QUERY over the existing schema — not a stored
 * collection. Used by both the JSON endpoint (frontend tab) and the
 * Excel export (second sheet of Products export, and the standalone
 * Ne Perdorim export) — implemented once, rendered multiple ways.
 *
 * Serial handling: a group with serialized units explodes into one row
 * per serial (sasia: 1, serial: <value>), plus one collapsed row for
 * any remaining anonymous quantity in that group (serial: ""). A group
 * with no serials produces exactly one row, unchanged from before.
 */
async function buildNePerdorimRows() {
  const products = await Product.find({
    "groups.status": "Ne perdorim",
  }).populate("groups.currentHolder");

  const rows = [];
  let counter = 1;

  products.forEach((product) => {
    product.groups
      .filter((g) => g.status === "Ne perdorim" && g.currentHolder)
      .forEach((g) => {
        const employee = g.currentHolder;
        // Single combined list: primary email + any additional emails,
        // comma-separated. Replaces the old separate ADC/Vodafone split.
        // NOTE: field is named `email` (singular) on the row object even
        // though it's a joined list — kept as `email` to match the
        // frontend's existing row-shape contract and avoid a churn cycle.
        const email = [employee.email, ...(employee.emails || [])]
          .filter(Boolean)
          .join(", ");

        const baseRow = {
          productId: product._id,
          groupId: g._id,
          holderId: employee._id,
          emerMbiemer: `${employee.firstName} ${employee.lastName}`,
          kompani: employee.company || "",
          departamenti: employee.department || "",
          assetId: product.assetId || "",
          email,
          nrTelefoni: employee.phone || "",
          badgeQr: employee.badgeQr || "",
        };

        (g.serials || []).forEach((serial) => {
          rows.push({
            ...baseRow,
            nr: counter++,
            sasia: 1,
            serial,
          });
        });

        const anonymousQty = g.quantity - (g.serials || []).length;
        if (anonymousQty > 0) {
          rows.push({
            ...baseRow,
            nr: counter++,
            sasia: anonymousQty,
            serial: "",
          });
        }
      });
  });

  return rows;
}

// GET /api/products/ne-perdorim
async function getNePerdorim(req, res) {
  try {
    const rows = await buildNePerdorimRows();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { buildNePerdorimRows, getNePerdorim };
