const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const Employee = require("../models/Employee");
const { isValidAssetId, ensureUniqueAssetId } = require("../utils/assetId");
const {
  findOrCreateGroup,
  pruneEmptyGroups,
  findGroupWithSerial,
} = require("../utils/productGroups");
const { buildNePerdorimRows } = require("./nePerdorimController");
const { applyStandardSheetStyle } = require("../utils/excelStyle");
const { logAction } = require("../utils/logAction");
const { STATUS_VALUES } = require("../models/Product");

const NE_PERDORIM_COLUMNS = [
  { header: "Nr.", key: "nr", width: 6 },
  { header: "Emer Mbiemer", key: "emerMbiemer", width: 22 },
  { header: "Kompani", key: "kompani", width: 14 },
  { header: "Departamenti", key: "departamenti", width: 16 },
  { header: "Asset ID", key: "assetId", width: 18 },
  { header: "Sasia", key: "sasia", width: 10 },
  { header: "Serial", key: "serial", width: 18 },
  { header: "Emails", key: "email", width: 34 },
  { header: "Nr. telefoni", key: "nrTelefoni", width: 15 },
  { header: "Badge + QR Code", key: "badgeQr", width: 18 },
];

const STATUS_COLORS = {
  "Ne magazine": "FFE5E7EB",
  "Ne perdorim": "FFD1FAE5",
  "Ne riparim": "FFFEF3C7",
  "Jashte perdorimit": "FFFEE2E2",
};

// One row per SERIAL within a group, plus (if any quantity in that group
// is anonymous) one extra row for the remaining count. A group with no
// serials exports exactly as before — a single row with its quantity.
const EXPORT_COLUMNS = [
  { header: "Asset ID", key: "assetId", width: 18 },
  { header: "Kategoria", key: "categoryName", width: 16 },
  { header: "Serial", key: "serial", width: 18 },
  { header: "Emri", key: "name", width: 22 },
  { header: "Branding", key: "branding", width: 14 },
  { header: "Sasia", key: "quantity", width: 10 },
  { header: "Njesia", key: "unit", width: 10 },
  { header: "Furnitori", key: "supplierName", width: 16 },
  { header: "Cmimi i blerjes", key: "purchasePrice", width: 14 },
  { header: "Statusi", key: "status", width: 16 },
  { header: "Pershkrim (opsional)", key: "description", width: 26 },
  { header: "Mbajtesi", key: "holderName", width: 20 },
];

const IMPORT_SHEET_NAME = "Asete gjendje";

// GET /api/products/export
async function exportProducts(req, res) {
  try {
    const products = await Product.find()
      .populate("category supplier")
      .populate("groups.currentHolder");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Asete gjendje");
    sheet.columns = EXPORT_COLUMNS;

    products.forEach((p) => {
      const batch = {
        assetId: p.assetId || "",
        categoryName: p.category?.name || "",
        name: p.name,
        branding: p.branding,
        unit: p.unit,
        supplierName: p.supplier?.name || "",
        purchasePrice: p.purchasePrice,
        description: p.description,
      };

      if (p.groups.length === 0) {
        sheet.addRow({
          ...batch,
          status: "",
          holderName: "",
          quantity: 0,
          serial: "",
        });
        return;
      }

      p.groups.forEach((g) => {
        const holder = g.currentHolder;
        const holderName = holder
          ? `${holder.firstName} ${holder.lastName}`
          : "";

        // One row per serialized unit in this group.
        (g.serials || []).forEach((serial) => {
          sheet.addRow({
            ...batch,
            status: g.status,
            holderName,
            quantity: 1,
            serial,
          });
        });

        // Remaining anonymous units in the group (or the whole quantity,
        // for a group with no serials at all) get a single collapsed row.
        const anonymousQty = g.quantity - (g.serials || []).length;
        if (anonymousQty > 0) {
          sheet.addRow({
            ...batch,
            status: g.status,
            holderName,
            quantity: anonymousQty,
            serial: "",
          });
        }
      });
    });

    const statusColIndex =
      EXPORT_COLUMNS.findIndex((c) => c.key === "status") + 1;

    applyStandardSheetStyle(sheet, {
      withBorders: true,
      statusColIndex,
      statusColors: STATUS_COLORS,
    });

    // --- Second sheet: "Ne Perdorim" (same derived query used by the
    // GET /api/products/ne-perdorim endpoint — implemented once, rendered
    // two ways, per spec). ---
    const nePerdorimRows = await buildNePerdorimRows();
    const npSheet = workbook.addWorksheet("Ne Perdorim");
    npSheet.columns = NE_PERDORIM_COLUMNS;
    nePerdorimRows.forEach((row) => npSheet.addRow(row));

    applyStandardSheetStyle(npSheet);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=products.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function buildColumnIndex(sheet) {
  const headerRow = sheet.getRow(1).values;
  const colIndex = {};
  headerRow.forEach((val, idx) => {
    if (!val) return;
    colIndex[String(val).trim().toLowerCase()] = idx;
  });
  return colIndex;
}

function cellGetter(colIndex) {
  return (row, label) => {
    const idx = colIndex[label.toLowerCase()];
    if (!idx) return undefined;
    const cell = row.getCell(idx).value;
    return cell === null || cell === undefined ? "" : String(cell).trim();
  };
}

async function resolveCategory(name) {
  if (!name) return null;
  let category = await Category.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (!category) category = await Category.create({ name });
  return category._id;
}

async function resolveSupplier(name) {
  if (!name) return null;
  let supplier = await Supplier.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (!supplier) supplier = await Supplier.create({ name });
  return supplier._id;
}

async function resolveHolder(fullName, email) {
  if (!fullName) return null;

  if (email) {
    const byEmail = await Employee.findOne({ email });
    if (byEmail) return byEmail._id;
  }

  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ") || "(unknown)";

  let employee = await Employee.findOne({
    firstName: new RegExp(`^${firstName}$`, "i"),
    lastName: new RegExp(`^${lastName}$`, "i"),
  });

  if (!employee) {
    employee = await Employee.create({
      firstName,
      lastName,
      email: email || undefined,
    });
  }

  return employee._id;
}

function resolveStatus(raw) {
  if (!raw) return undefined;
  return STATUS_VALUES.find((v) => v.toLowerCase() === raw.toLowerCase());
}

// POST /api/products/import
//
// Row semantics:
//   - Empty Asset ID  -> defines a NEW product. All row fields apply.
//   - Existing Asset ID -> merges into that product's matching group
//     ONLY. The product's own fields (name/category/branding/etc.) are
//     NEVER touched by a merge row, even if the row's columns differ
//     from the existing product — this import is additive-only against
//     existing items, never a field-level update path.
//   - A row with a Serial value represents exactly ONE physical unit
//     (Sasia must be 1 or blank; anything else is a row error, never
//     silently truncated).
//   - Serial handling per row, checked against the WHOLE product
//     (across all its groups, not just the matched one):
//       * not found anywhere on the product -> normal case, add the
//         unit + tag the serial into the matched group.
//       * found in the exact matched group already -> the row is
//         already satisfied (e.g. re-importing an unmodified export);
//         counted as a no-op, not an error, nothing is changed.
//       * found in a DIFFERENT group on the same product -> genuine
//         conflict (the row disagrees with where the system has that
//         serial); the row is skipped with an error.
//
// Logging: one 'import-summary' line for the whole run. Brand-new
// products still get a 'create' log with their defining fields. Rows
// that merge into an EXISTING product no longer produce a field diff
// (since fields are never touched), so instead each existing product
// touched by the run gets one 'update' log summarizing the quantity/
// serials added across all its merge rows this run.
async function importProducts(req, res) {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'No file uploaded (field name must be "file")' });
  }

  const results = { created: 0, updated: 0, noop: [], skipped: [] };
  const newBatchByKey = new Map(); // `${name}|${category}` -> assetId, for this run only
  const batchId = new mongoose.Types.ObjectId();

  // Accumulates merge activity per EXISTING product touched this run, so
  // we can emit one summary log line per product instead of per row.
  const mergeAccByProductId = new Map();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet =
      workbook.getWorksheet(IMPORT_SHEET_NAME) || workbook.worksheets[0];
    const colIndex = buildColumnIndex(sheet);
    const get = cellGetter(colIndex);

    const touchedNewProductIds = new Set();

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const name =
        get(row, "Emri") || get(row, "Marka/modeli") || get(row, "Name");
      const rawAssetId = get(row, "Asset ID");
      const serial = get(row, "Serial") || "";

      if (!name) {
        results.skipped.push({ row: rowNum, reason: "Missing product name" });
        continue;
      }

      if (rawAssetId && !isValidAssetId(rawAssetId)) {
        results.skipped.push({
          row: rowNum,
          reason: `Invalid Asset ID "${rawAssetId}" (failed check digit)`,
        });
        continue;
      }

      const categoryName = get(row, "Kategoria") || get(row, "Category");
      const supplierName = get(row, "Furnitori") || get(row, "Supplier");
      const categoryId = categoryName
        ? await resolveCategory(categoryName)
        : null;
      const supplierId = supplierName
        ? await resolveSupplier(supplierName)
        : null;

      const statusRaw = get(row, "Statusi") || get(row, "Status");
      let status = "Ne magazine";
      if (statusRaw) {
        const resolved = resolveStatus(statusRaw);
        if (!resolved) {
          results.skipped.push({
            row: rowNum,
            reason: `Invalid Statusi value "${statusRaw}" (must be one of: ${STATUS_VALUES.join(", ")})`,
          });
          continue;
        }
        status = resolved;
      }

      const holderName = get(row, "Mbajtesi") || get(row, "Emer Mbiemer");
      const holderEmail = get(row, "Email");
      const holderId = holderName
        ? await resolveHolder(holderName, holderEmail)
        : null;

      const quantityRaw = get(row, "Sasia") || get(row, "Quantity");

      let quantity;
      if (serial) {
        // A serial row is exactly one physical unit. Never silently
        // truncate a larger Sasia value — that's a row error.
        if (
          quantityRaw !== undefined &&
          quantityRaw !== "" &&
          Number(quantityRaw) !== 1
        ) {
          results.skipped.push({
            row: rowNum,
            reason: `Row has a Serial but Sasia is ${quantityRaw} (must be 1 or blank for a serialized row)`,
          });
          continue;
        }
        quantity = 1;
      } else {
        quantity =
          quantityRaw !== undefined && quantityRaw !== ""
            ? Number(quantityRaw)
            : 1;
        if (!quantity || quantity <= 0) {
          results.skipped.push({
            row: rowNum,
            reason: "Sasia must be a positive number",
          });
          continue;
        }
      }

      const batchFields = {};
      if (categoryId) batchFields.category = categoryId;
      if (supplierId) batchFields.supplier = supplierId;
      const branding = get(row, "Branding");
      if (branding) batchFields.branding = branding;
      const unit = get(row, "Njesia") || get(row, "Unit");
      if (unit) batchFields.unit = unit;
      const description =
        get(row, "Pershkrim (opsional)") || get(row, "Description");
      if (description) batchFields.description = description;
      const purchasePriceRaw =
        get(row, "Cmimi i blerjes") || get(row, "Purchase Price");
      if (purchasePriceRaw !== undefined && purchasePriceRaw !== "") {
        batchFields.purchasePrice = Number(purchasePriceRaw) || 0;
      }

      let product;
      let isNewProduct = false;
      let isMergeIntoExisting = false;

      if (rawAssetId) {
        product = await Product.findOne({ assetId: rawAssetId.toUpperCase() });
        if (!product) {
          results.skipped.push({
            row: rowNum,
            reason: `Asset ID "${rawAssetId}" not found — cannot update a non-existent item`,
          });
          continue;
        }
        // Reused Asset ID = merge only. The product's own fields are
        // NEVER touched here, regardless of what this row's columns say.
        isMergeIntoExisting = true;
      } else {
        const key = `${name.toLowerCase()}|${categoryId}`;
        const existingNewAssetId = newBatchByKey.get(key);

        if (existingNewAssetId) {
          // Additional row for a brand-new product being defined across
          // multiple rows within THIS SAME import run — not a merge into
          // a pre-existing product, so applying batchFields here is fine.
          product = await Product.findOne({ assetId: existingNewAssetId });
          Object.assign(product, batchFields);
        } else {
          if (!categoryId) {
            results.skipped.push({
              row: rowNum,
              reason: "No category resolved for new item",
            });
            continue;
          }
          const assetId = await ensureUniqueAssetId(Product, "assetId");
          product = new Product({
            name,
            category: categoryId,
            assetId,
            ...batchFields,
          });
          isNewProduct = true;
          newBatchByKey.set(key, assetId);
        }
      }

      // Resolve the destination group for this row.
      const group = findOrCreateGroup(product, status, holderId);

      // Serial-aware merge logic.
      if (serial) {
        const existingSerialGroup = findGroupWithSerial(product, serial);
        if (existingSerialGroup && existingSerialGroup === group) {
          // Already recorded exactly where this row says — no-op.
          results.noop.push({
            row: rowNum,
            reason: `Serial "${serial}" already recorded in this group — no change`,
          });
          continue;
        }
        if (existingSerialGroup && existingSerialGroup !== group) {
          // Row disagrees with where the system has this serial.
          results.skipped.push({
            row: rowNum,
            reason: `Serial "${serial}" already recorded in a different group of this product (status/holder mismatch)`,
          });
          continue;
        }
        group.quantity += quantity;
        group.serials.push(serial);
      } else {
        group.quantity += quantity;
      }
      pruneEmptyGroups(product);

      await product.save();

      if (isNewProduct) {
        if (!touchedNewProductIds.has(String(product._id))) {
          touchedNewProductIds.add(String(product._id));
          results.created += 1;
          await logAction({
            req,
            batchId,
            action: "create",
            entityType: "Product",
            entityId: product._id,
            entityLabel: `${product.name} (${product.assetId})`,
            changes: {
              name: product.name,
              assetId: product.assetId,
              category: String(product.category || ""),
              supplier: String(product.supplier || ""),
              branding: product.branding,
              unit: product.unit,
              description: product.description,
              purchasePrice: product.purchasePrice,
            },
          });
        }
      } else if (isMergeIntoExisting) {
        const pid = String(product._id);
        let acc = mergeAccByProductId.get(pid);
        if (!acc) {
          acc = {
            product,
            quantityAdded: 0,
            serialsAdded: [],
            groupsTouched: new Set(),
          };
          mergeAccByProductId.set(pid, acc);
          results.updated += 1;
        }
        acc.quantityAdded += quantity;
        if (serial) acc.serialsAdded.push(serial);
        acc.groupsTouched.add(`${status} / ${holderName || "unassigned"}`);
      }
    }

    // One 'update' log per existing product actually merged into this run.
    for (const acc of mergeAccByProductId.values()) {
      await logAction({
        req,
        batchId,
        action: "update",
        entityType: "Product",
        entityId: acc.product._id,
        entityLabel: `${acc.product.name} (${acc.product.assetId})`,
        changes: {
          importMerge: true,
          quantityAdded: acc.quantityAdded,
          serialsAdded: acc.serialsAdded,
          groupsTouched: Array.from(acc.groupsTouched),
        },
      });
    }

    await logAction({
      req,
      batchId,
      action: "import-summary",
      entityType: "Product",
      entityLabel: req.file.originalname || "products import",
      changes: {
        filename: req.file.originalname,
        created: results.created,
        updated: results.updated,
        noop: results.noop,
        skipped: results.skipped,
      },
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportProducts, importProducts };
