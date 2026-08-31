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
} = require("../utils/productGroups");
const { buildNePerdorimRows } = require("./nePerdorimController");
const { applyStandardSheetStyle } = require("../utils/excelStyle");
const { logAction, diffFields } = require("../utils/logAction");

const NE_PERDORIM_COLUMNS = [
  { header: "Nr.", key: "nr", width: 6 },
  { header: "Emer Mbiemer", key: "emerMbiemer", width: 22 },
  { header: "Kompani", key: "kompani", width: 14 },
  { header: "Departamenti", key: "departamenti", width: 16 },
  { header: "Asset ID", key: "assetId", width: 18 },
  { header: "Sasia", key: "sasia", width: 10 },
  { header: "Emails", key: "email", width: 34 },
  { header: "Nr. telefoni", key: "nrTelefoni", width: 15 },
  { header: "Badge + QR Code", key: "badgeQr", width: 18 },
];

const STATUS_VALUES = [
  "Ne magazine",
  "Ne perdorim",
  "Ne riparim",
  "Jashte perdorimit",
];

const STATUS_COLORS = {
  "Ne magazine": "FFE5E7EB",
  "Ne perdorim": "FFD1FAE5",
  "Ne riparim": "FFFEF3C7",
  "Jashte perdorimit": "FFFEE2E2",
};

// One row per group (a status+holder bucket within a batch), not per unit.
const EXPORT_COLUMNS = [
  { header: "Asset ID", key: "assetId", width: 18 },
  { header: "Kategoria", key: "categoryName", width: 16 },
  { header: "Marka/modeli", key: "name", width: 22 },
  { header: "Branding", key: "branding", width: 14 },
  { header: "Njesia", key: "unit", width: 10 },
  { header: "Furnitori", key: "supplierName", width: 16 },
  { header: "Cmimi i blerjes", key: "purchasePrice", width: 14 },
  { header: "Pershkrim (opsional)", key: "description", width: 26 },
  { header: "Statusi", key: "status", width: 16 },
  { header: "Mbajtesi", key: "holderName", width: 20 },
  { header: "Sasia", key: "quantity", width: 10 },
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
        sheet.addRow({ ...batch, status: "", holderName: "", quantity: 0 });
        return;
      }

      p.groups.forEach((g) => {
        const holder = g.currentHolder;
        sheet.addRow({
          ...batch,
          status: g.status,
          holderName: holder ? `${holder.firstName} ${holder.lastName}` : "",
          quantity: g.quantity,
        });
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
// Rows are grouped by Asset ID into one Product; within that Product,
// rows are merged into groups keyed by (status, currentHolder) using the
// same findOrCreateGroup logic used at runtime (rule: import must use the
// same merge-safety as live requests).
//
// Logging: one 'import-summary' line for the whole run, plus one
// 'create'/'update' line per Product actually touched, each carrying a
// real before/after diff of its batch fields (not the group quantity
// changes, which are per-row-merged and not meaningfully diffable at
// the field level the same way). All lines share a batchId so the
// Logs tab can group them.
async function importProducts(req, res) {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'No file uploaded (field name must be "file")' });
  }

  const results = { created: 0, updated: 0, skipped: [] };
  const newBatchByKey = new Map(); // `${name}|${category}` -> assetId, for this run only
  const batchId = new mongoose.Types.ObjectId();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet =
      workbook.getWorksheet(IMPORT_SHEET_NAME) || workbook.worksheets[0];
    const colIndex = buildColumnIndex(sheet);
    const get = cellGetter(colIndex);

    const touchedProductIds = new Set();

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const name = get(row, "Marka/modeli") || get(row, "Name");
      const rawAssetId = get(row, "Asset ID");

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
      const quantity =
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
      let beforeSnapshot = null;

      if (rawAssetId) {
        product = await Product.findOne({ assetId: rawAssetId.toUpperCase() });
        if (!product) {
          results.skipped.push({
            row: rowNum,
            reason: `Asset ID "${rawAssetId}" not found — cannot update a non-existent item`,
          });
          continue;
        }
        beforeSnapshot = {
          category: String(product.category || ""),
          supplier: String(product.supplier || ""),
          branding: product.branding,
          unit: product.unit,
          description: product.description,
          purchasePrice: product.purchasePrice,
        };
        Object.assign(product, batchFields);
      } else {
        const key = `${name.toLowerCase()}|${categoryId}`;
        const existingNewAssetId = newBatchByKey.get(key);

        if (existingNewAssetId) {
          product = await Product.findOne({ assetId: existingNewAssetId });
          beforeSnapshot = {
            category: String(product.category || ""),
            supplier: String(product.supplier || ""),
            branding: product.branding,
            unit: product.unit,
            description: product.description,
            purchasePrice: product.purchasePrice,
          };
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

      // Merge this row's units into the matching group, same rule as live requests.
      const group = findOrCreateGroup(product, status, holderId);
      group.quantity += quantity;
      pruneEmptyGroups(product);

      const alreadyTouchedThisRun = touchedProductIds.has(
        String(product._id ?? ""),
      );
      await product.save();

      if (!alreadyTouchedThisRun) {
        touchedProductIds.add(String(product._id));
        if (isNewProduct) {
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
        } else {
          results.updated += 1;
          const afterSnapshot = {
            category: String(product.category || ""),
            supplier: String(product.supplier || ""),
            branding: product.branding,
            unit: product.unit,
            description: product.description,
            purchasePrice: product.purchasePrice,
          };
          const changes = diffFields(beforeSnapshot, afterSnapshot);
          if (Object.keys(changes).length > 0) {
            await logAction({
              req,
              batchId,
              action: "update",
              entityType: "Product",
              entityId: product._id,
              entityLabel: `${product.name} (${product.assetId})`,
              changes,
            });
          }
        }
      }
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
        skipped: results.skipped,
      },
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportProducts, importProducts };
