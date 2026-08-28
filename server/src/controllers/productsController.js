const ExcelJS = require("exceljs");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const { isValidAssetId, ensureUniqueAssetId } = require("../utils/assetId");

const STATUS_VALUES = [
  "Ne magazine",
  "Ne perdorim",
  "Ne riparim",
  "Jashte perdorimit",
];

const EXPORT_COLUMNS = [
  { header: "Asset ID", key: "assetId", width: 18 },
  { header: "Kategoria", key: "categoryName", width: 18 },
  { header: "Nr. Serial", key: "serial", width: 18 },
  { header: "Marka/modeli", key: "name", width: 25 },
  { header: "Branding", key: "branding", width: 15 },
  { header: "Stok", key: "stock", width: 10 },
  { header: "Njesia", key: "unit", width: 10 },
  { header: "Furnitori", key: "supplierName", width: 18 },
  { header: "Cmimi i blerjes", key: "purchasePrice", width: 15 },
  { header: "Cmimi i shitjes", key: "salePrice", width: 15 },
  { header: "Statusi", key: "status", width: 16 },
  { header: "Pershkrim (opsional)", key: "description", width: 30 },
];

const IMPORT_SHEET_NAME = "Asete gjendje";

// GET /api/products/export
async function exportProducts(req, res) {
  try {
    const products = await Product.find().populate("category supplier");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Asete gjendje");
    sheet.columns = EXPORT_COLUMNS;

    products.forEach((p) => {
      sheet.addRow({
        assetId: p.assetId || "",
        categoryName: p.category?.name || "",
        serial: p.serial,
        name: p.name,
        branding: p.branding,
        stock: p.stock,
        unit: p.unit,
        supplierName: p.supplier?.name || "",
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice,
        status: p.status,
        description: p.description,
      });
    });

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
  const headerRow = sheet.getRow(1).values; // 1-indexed, [0] is empty
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
  if (!category) {
    category = await Category.create({ name, trackingType: "quantity" });
  }
  return category._id;
}

async function resolveSupplier(name) {
  if (!name) return null;
  let supplier = await Supplier.findOne({ name: new RegExp(`^${name}$`, "i") });
  if (!supplier) {
    supplier = await Supplier.create({ name });
  }
  return supplier._id;
}

function resolveStatus(raw) {
  if (!raw) return undefined;
  const match = STATUS_VALUES.find(
    (v) => v.toLowerCase() === raw.toLowerCase(),
  );
  return match; // undefined if it doesn't match one of the 4 allowed values
}

// POST /api/products/import
async function importProducts(req, res) {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: 'No file uploaded (field name must be "file")' });
  }

  const results = { created: 0, updated: 0, skipped: [] };

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const sheet =
      workbook.getWorksheet(IMPORT_SHEET_NAME) || workbook.worksheets[0];

    const colIndex = buildColumnIndex(sheet);
    const get = cellGetter(colIndex);

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const name = get(row, "Marka/modeli") || get(row, "Name");
      const rawAssetId = get(row, "Asset ID") || get(row, "ID Aseti");

      if (!name) {
        results.skipped.push({ row: rowNum, reason: "Missing product name" });
        continue;
      }

      // If the row has an Asset ID, it must be a valid one (correct check
      // digit) — a garbled/typo'd ID is treated as an error, not silently
      // treated as blank (which would wrongly create a duplicate).
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

      // Build the update/create payload with ONLY fields the row actually
      // has a value for. This is deliberate: on update, a blank cell must
      // NOT wipe out existing data already stored on that product.
      const fields = {};
      fields.name = name;
      if (categoryId) fields.category = categoryId;
      if (supplierId) fields.supplier = supplierId;

      const serial = get(row, "Nr. Serial") || get(row, "Serial");
      if (serial) fields.serial = serial;

      const unit = get(row, "Njesia") || get(row, "Unit");
      if (unit) fields.unit = unit;

      const branding = get(row, "Branding");
      if (branding) fields.branding = branding;

      const description =
        get(row, "Pershkrim (opsional)") || get(row, "Description");
      if (description) fields.description = description;

      const purchasePriceRaw =
        get(row, "Cmimi i blerjes") || get(row, "Purchase Price");
      if (purchasePriceRaw !== undefined && purchasePriceRaw !== "") {
        fields.purchasePrice = Number(purchasePriceRaw) || 0;
      }

      const salePriceRaw =
        get(row, "Cmimi i shitjes") || get(row, "Sale Price");
      if (salePriceRaw !== undefined && salePriceRaw !== "") {
        fields.salePrice = Number(salePriceRaw) || 0;
      }

      const stockRaw = get(row, "Stok") || get(row, "Stock");
      if (stockRaw !== undefined && stockRaw !== "") {
        fields.stock = Number(stockRaw) || 0;
      }

      const statusRaw = get(row, "Statusi") || get(row, "Status");
      if (statusRaw) {
        const resolvedStatus = resolveStatus(statusRaw);
        if (!resolvedStatus) {
          results.skipped.push({
            row: rowNum,
            reason: `Invalid Statusi value "${statusRaw}" (must be one of: ${STATUS_VALUES.join(", ")})`,
          });
          continue;
        }
        fields.status = resolvedStatus;
      }

      if (rawAssetId) {
        // Filled Asset ID -> this row represents an existing item; update it.
        const existing = await Product.findOne({
          assetId: rawAssetId.toUpperCase(),
        });
        if (!existing) {
          results.skipped.push({
            row: rowNum,
            reason: `Asset ID "${rawAssetId}" not found — cannot update a non-existent item`,
          });
          continue;
        }
        if (!fields.category) fields.category = existing.category; // category is required
        await Product.findByIdAndUpdate(existing._id, fields);
        results.updated += 1;
      } else {
        // Blank Asset ID -> this row is new; generate an ID and create it.
        if (!fields.category) {
          results.skipped.push({
            row: rowNum,
            reason: "No category resolved for new item",
          });
          continue;
        }
        fields.assetId = await ensureUniqueAssetId(Product, "assetId");
        await Product.create(fields);
        results.created += 1;
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { exportProducts, importProducts };
